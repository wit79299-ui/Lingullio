#!/usr/bin/env python3
"""
Generate i18n UI translation files for all 18 missing locales.
Uses OpenAI-compatible API to translate from French source.
"""
import json
import os
import sys
import time
import yaml
from pathlib import Path

# Load LLM config
config_path = Path.home() / '.genspark_llm.yaml'
with open(config_path) as f:
    raw = f.read()
    # Resolve env vars
    token = os.environ.get('GENSPARK_TOKEN', '')
    raw = raw.replace('${GENSPARK_TOKEN}', token)
    config = yaml.safe_load(raw)

API_KEY = config['openai']['api_key']
BASE_URL = config['openai']['base_url']

import urllib.request
import urllib.error

MESSAGES_DIR = Path('/home/user/webapp/src/messages')

# All locales that need translation
MISSING_LOCALES = {
    'es': 'Spanish (Spain)',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'th': 'Thai',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh-Hans': 'Simplified Chinese',
    'zh-Hant': 'Traditional Chinese',
    'hi': 'Hindi',
    'ar': 'Arabic',
    'ru': 'Russian',
    'tr': 'Turkish',
    'pl': 'Polish',
    'ro': 'Romanian',
    'uk': 'Ukrainian',
    'pt': 'Portuguese (Brazil)',
    'de': 'German',
    'it': 'Italian',
}

def call_llm(messages: list, max_retries=3) -> str:
    """Call the OpenAI-compatible API."""
    payload = json.dumps({
        'model': 'gpt-5-mini',
        'messages': messages,
        'temperature': 0.3,
        'max_tokens': 16000,
    }).encode('utf-8')
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {API_KEY}',
    }
    
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                f'{BASE_URL}/chat/completions',
                data=payload,
                headers=headers,
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                result = json.loads(resp.read().decode('utf-8'))
                return result['choices'][0]['message']['content']
        except Exception as e:
            print(f"  Attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(5 * (attempt + 1))
            else:
                raise

def translate_json_section(section_name: str, section_data: dict, target_lang: str, target_name: str) -> dict:
    """Translate a section of the JSON file."""
    prompt = f"""Translate the following JSON values from French to {target_name} ({target_lang}).

IMPORTANT RULES:
1. Only translate the VALUES, never the keys
2. Keep all placeholder patterns like {{name}}, {{count}}, {{date}}, {{score}}, {{level}}, {{current}}, {{total}}, {{minutes}}, {{points}}, {{number}}, {{rank}} exactly as they are
3. Return ONLY valid JSON, no markdown code fences, no comments
4. Keep the exact same structure and keys
5. Make translations natural and idiomatic for {target_name} speakers
6. This is an EdTech app for Chinese language exam preparation (HSK)

JSON to translate:
{json.dumps(section_data, ensure_ascii=False, indent=2)}"""

    result = call_llm([
        {'role': 'system', 'content': f'You are a professional translator. Translate UI strings to {target_name}. Return only valid JSON.'},
        {'role': 'user', 'content': prompt}
    ])
    
    # Clean response
    result = result.strip()
    if result.startswith('```'):
        result = result.split('\n', 1)[1] if '\n' in result else result[3:]
        if result.endswith('```'):
            result = result[:-3]
        result = result.strip()
    
    return json.loads(result)


def translate_locale(fr_data: dict, locale: str, lang_name: str):
    """Translate the entire fr.json to a target locale, section by section."""
    output_path = MESSAGES_DIR / f'{locale}.json'
    
    if output_path.exists():
        print(f"  {locale}.json already exists, skipping")
        return True
    
    print(f"\n{'='*50}")
    print(f"Translating to {lang_name} ({locale})")
    print(f"{'='*50}")
    
    translated = {}
    sections = list(fr_data.keys())
    
    for i, section in enumerate(sections):
        print(f"  [{i+1}/{len(sections)}] Translating '{section}'...")
        try:
            translated[section] = translate_json_section(
                section, fr_data[section], locale, lang_name
            )
            # Small delay to avoid rate limits
            time.sleep(1)
        except Exception as e:
            print(f"  ERROR translating '{section}': {e}")
            # Fallback: use French values
            translated[section] = fr_data[section]
    
    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(translated, f, ensure_ascii=False, indent=2)
    
    print(f"  ✅ Wrote {output_path}")
    return True


def main():
    # Load French source
    with open(MESSAGES_DIR / 'fr.json', encoding='utf-8') as f:
        fr_data = json.load(f)
    
    print(f"Source: fr.json ({len(fr_data)} sections)")
    print(f"Locales to translate: {len(MISSING_LOCALES)}")
    
    success = 0
    errors = 0
    
    for locale, lang_name in MISSING_LOCALES.items():
        try:
            if translate_locale(fr_data, locale, lang_name):
                success += 1
        except Exception as e:
            print(f"  FAILED for {locale}: {e}")
            errors += 1
    
    print(f"\n{'='*50}")
    print(f"Done! {success} translated, {errors} errors")
    print(f"{'='*50}")


if __name__ == '__main__':
    main()
