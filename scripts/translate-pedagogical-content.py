#!/usr/bin/env python3
"""
Translate pedagogical content in Supabase to additional locales.
Uses OpenAI-compatible LLM API to translate vocabulary meanings, examples, 
grammar explanations, and character mnemonics.

PREREQUISITES:
- Working LLM API (genspark proxy must return 200, not 403)
- .env.local with SUPABASE_SERVICE_ROLE_KEY
- pip install pyyaml

USAGE:
  python scripts/translate-pedagogical-content.py [locale1] [locale2] ...
  python scripts/translate-pedagogical-content.py tr es de  # translate to Turkish, Spanish, German
  python scripts/translate-pedagogical-content.py all        # translate to all 18 missing locales
  
NOTE: Each locale takes ~20-30 minutes (300 vocab + 40 grammar + 248 characters).
"""

import json
import os
import sys
import time
import yaml
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

# ─── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = 'https://gmpjkoajhhwvxwsdohll.supabase.co'
ENV_PATH = Path('/home/user/webapp/.env.local')
LLM_CONFIG_PATH = Path.home() / '.genspark_llm.yaml'

ALL_LOCALES = {
    'es': 'Spanish', 'vi': 'Vietnamese', 'id': 'Indonesian', 'th': 'Thai',
    'ja': 'Japanese', 'ko': 'Korean', 'zh-Hans': 'Simplified Chinese',
    'zh-Hant': 'Traditional Chinese', 'hi': 'Hindi', 'ar': 'Arabic',
    'ru': 'Russian', 'tr': 'Turkish', 'pl': 'Polish', 'ro': 'Romanian',
    'uk': 'Ukrainian', 'pt': 'Portuguese', 'de': 'German', 'it': 'Italian',
}

# ─── Load keys ───────────────────────────────────────────────────────────────

def load_supabase_key():
    with open(ENV_PATH) as f:
        for line in f:
            if line.startswith('SUPABASE_SERVICE_ROLE_KEY='):
                return line.split('=', 1)[1].strip()
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found in .env.local")

def load_llm_config():
    with open(LLM_CONFIG_PATH) as f:
        raw = f.read()
        token = os.environ.get('GENSPARK_TOKEN', '')
        raw = raw.replace('${GENSPARK_TOKEN}', token)
        return yaml.safe_load(raw)['openai']

SUPA_KEY = load_supabase_key()
LLM = load_llm_config()

# ─── Supabase helpers ────────────────────────────────────────────────────────

def supa_get(table, params=''):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = Request(url, headers={
        'apikey': SUPA_KEY,
        'Authorization': f'Bearer {SUPA_KEY}',
    })
    resp = urlopen(req)
    return json.loads(resp.read())

def supa_post(table, data):
    """Insert rows, ignore conflicts."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = Request(url, 
        data=json.dumps(data).encode('utf-8'),
        headers={
            'apikey': SUPA_KEY,
            'Authorization': f'Bearer {SUPA_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates',
        },
        method='POST'
    )
    try:
        resp = urlopen(req)
        return resp.status
    except HTTPError as e:
        print(f"  POST error {e.code}: {e.read().decode()[:200]}")
        return e.code

# ─── LLM helper ──────────────────────────────────────────────────────────────

def call_llm(prompt, system="You are a professional translator.", max_retries=3):
    payload = json.dumps({
        'model': 'gpt-5-mini',
        'messages': [
            {'role': 'system', 'content': system},
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.3,
        'max_tokens': 8000,
    }).encode('utf-8')
    
    for attempt in range(max_retries):
        try:
            req = Request(
                f"{LLM['base_url']}/chat/completions",
                data=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f"Bearer {LLM['api_key']}",
                },
                method='POST'
            )
            with urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read())
                return result['choices'][0]['message']['content']
        except Exception as e:
            print(f"    LLM attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(5 * (attempt + 1))
    raise RuntimeError("LLM API failed after retries")

def parse_json_response(text):
    text = text.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)

# ─── Translate vocabulary ────────────────────────────────────────────────────

def translate_vocabulary(locale, lang_name):
    print(f"\n  📚 Translating vocabulary to {lang_name}...")
    
    # Get English translations (source)
    en_trans = supa_get('vocabulary_translations', 'select=vocabulary_item_id,meaning,example_sentence,example_pinyin,example_translation&locale=eq.en&limit=500')
    
    # Check existing translations for this locale
    existing = supa_get('vocabulary_translations', f'select=vocabulary_item_id&locale=eq.{locale}&limit=1')
    if existing:
        print(f"    {lang_name} vocab translations already exist ({len(existing)} found). Skipping.")
        return
    
    # Batch translate (20 items at a time)
    batch_size = 20
    total_inserted = 0
    
    for i in range(0, len(en_trans), batch_size):
        batch = en_trans[i:i+batch_size]
        items_for_llm = [
            {"id": t['vocabulary_item_id'], "meaning": t['meaning'], 
             "example": t.get('example_sentence',''), "translation": t.get('example_translation','')}
            for t in batch
        ]
        
        prompt = f"""Translate these Chinese vocabulary items from English to {lang_name}.
Return a JSON array with the same structure. Only translate 'meaning' and 'translation' fields.
Keep 'id' and 'example' (Chinese sentence) unchanged.

{json.dumps(items_for_llm, ensure_ascii=False)}"""
        
        try:
            result = call_llm(prompt)
            translated = parse_json_response(result)
            
            # Build rows for Supabase
            rows = []
            for j, t in enumerate(translated):
                src = batch[j] if j < len(batch) else batch[-1]
                rows.append({
                    'vocabulary_item_id': t.get('id', src['vocabulary_item_id']),
                    'locale': locale,
                    'meaning': t.get('meaning', src['meaning']),
                    'example_sentence': src.get('example_sentence'),
                    'example_pinyin': src.get('example_pinyin'),
                    'example_translation': t.get('translation', src.get('example_translation')),
                })
            
            status = supa_post('vocabulary_translations', rows)
            total_inserted += len(rows)
            print(f"    Batch {i//batch_size + 1}/{(len(en_trans) + batch_size - 1)//batch_size}: {len(rows)} rows (status={status})")
            time.sleep(1)
        except Exception as e:
            print(f"    ERROR batch {i//batch_size + 1}: {e}")
    
    print(f"    ✅ Inserted {total_inserted} vocabulary translations for {lang_name}")

# ─── Translate grammar ───────────────────────────────────────────────────────

def translate_grammar(locale, lang_name):
    print(f"\n  📝 Translating grammar to {lang_name}...")
    
    en_trans = supa_get('grammar_point_translations', 'select=grammar_point_id,title,explanation_html&locale=eq.en&limit=100')
    
    existing = supa_get('grammar_point_translations', f'select=grammar_point_id&locale=eq.{locale}&limit=1')
    if existing:
        print(f"    {lang_name} grammar translations already exist. Skipping.")
        return
    
    # Translate one at a time (HTML content is complex)
    total_inserted = 0
    for g in en_trans:
        prompt = f"""Translate this Chinese grammar explanation from English to {lang_name}.
Keep all HTML tags, CSS classes, Chinese characters, and pinyin unchanged.
Only translate the English explanatory text and the English example translations.
Return JSON with 'title' and 'explanation_html' fields.

Title: {g['title']}
HTML: {g['explanation_html'][:3000]}"""
        
        try:
            result = call_llm(prompt)
            translated = parse_json_response(result)
            
            row = {
                'grammar_point_id': g['grammar_point_id'],
                'locale': locale,
                'title': translated.get('title', g['title']),
                'explanation_html': translated.get('explanation_html', g['explanation_html']),
            }
            
            status = supa_post('grammar_point_translations', [row])
            total_inserted += 1
            time.sleep(0.5)
        except Exception as e:
            print(f"    ERROR grammar {g['grammar_point_id']}: {e}")
    
    print(f"    ✅ Inserted {total_inserted} grammar translations for {lang_name}")

# ─── Translate characters ────────────────────────────────────────────────────

def translate_characters(locale, lang_name):
    print(f"\n  🀄 Translating characters to {lang_name}...")
    
    en_trans = supa_get('character_translations', 'select=character_id,meaning,mnemonic&locale=eq.en&limit=500')
    
    existing = supa_get('character_translations', f'select=character_id&locale=eq.{locale}&limit=1')
    if existing:
        print(f"    {lang_name} character translations already exist. Skipping.")
        return
    
    batch_size = 30
    total_inserted = 0
    
    for i in range(0, len(en_trans), batch_size):
        batch = en_trans[i:i+batch_size]
        items = [{"id": c['character_id'], "meaning": c['meaning'], "mnemonic": c.get('mnemonic','')} for c in batch]
        
        prompt = f"""Translate these Chinese character meanings and mnemonics from English to {lang_name}.
Return a JSON array. Only translate 'meaning' and 'mnemonic'. Keep 'id' unchanged.

{json.dumps(items, ensure_ascii=False)}"""
        
        try:
            result = call_llm(prompt)
            translated = parse_json_response(result)
            
            rows = []
            for j, t in enumerate(translated):
                src = batch[j] if j < len(batch) else batch[-1]
                rows.append({
                    'character_id': t.get('id', src['character_id']),
                    'locale': locale,
                    'meaning': t.get('meaning', src['meaning']),
                    'mnemonic': t.get('mnemonic', src.get('mnemonic')),
                })
            
            status = supa_post('character_translations', rows)
            total_inserted += len(rows)
            print(f"    Batch {i//batch_size + 1}: {len(rows)} rows")
            time.sleep(1)
        except Exception as e:
            print(f"    ERROR batch {i//batch_size + 1}: {e}")
    
    print(f"    ✅ Inserted {total_inserted} character translations for {lang_name}")

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    
    if not args:
        print("Usage: python translate-pedagogical-content.py [locale1] [locale2] ... | all")
        print(f"Available locales: {', '.join(ALL_LOCALES.keys())}")
        return
    
    if args[0] == 'all':
        locales = list(ALL_LOCALES.items())
    else:
        locales = [(loc, ALL_LOCALES[loc]) for loc in args if loc in ALL_LOCALES]
    
    print(f"Translating pedagogical content for: {[l[0] for l in locales]}")
    
    for locale, lang_name in locales:
        print(f"\n{'='*60}")
        print(f"🌍 {lang_name} ({locale})")
        print(f"{'='*60}")
        
        translate_vocabulary(locale, lang_name)
        translate_grammar(locale, lang_name)
        translate_characters(locale, lang_name)
    
    print(f"\n{'='*60}")
    print("✅ Done!")
    print("='*60")

if __name__ == '__main__':
    main()
