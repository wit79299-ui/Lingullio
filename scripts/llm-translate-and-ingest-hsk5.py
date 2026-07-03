#!/usr/bin/env python3
"""
Lingullio — LLM-powered translation fixes + HSK5 ingestion
1) Fix ~571 passthrough EN vocab translations (HSK2+HSK3)
2) Fix ~31 empty/stub grammar EN explanations (HSK2-4)
3) Ingest 600 HSK5 vocab + generate FR translations via LLM

Real column names verified from Supabase:
  vocabulary_translations: id, vocabulary_id, locale, meaning, example_sentence,
      example_pinyin, example_translation, usage_notes
  grammar_point_translations: id, grammar_point_id, locale, title,
      explanation_html, examples, common_errors
  character_translations: id, character_id, locale, meaning, mnemonic
  vocabulary_items: id, simplified, traditional, pinyin, hsk_level(='2'),
      word_type, theme, frequency_rank, audio_url, status
  grammar_points: id, pattern, hsk_level, sort_order, difficulty, status
"""
import os, sys, json, time, re, subprocess
from urllib.parse import quote

# ─── Config ───────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

LLM_KEY = os.environ.get("OPENAI_API_KEY")
LLM_URL = os.environ.get("OPENAI_BASE_URL", "https://www.genspark.ai/api/llm_proxy/v1")
LLM_MODEL = "gpt-5-mini"

HSK5_FILE = "/home/user/uploaded_files/lingullio_hsk5_vocab_partial.json.txt"

# ─── Helpers using curl (urllib has issues with PostgREST URL encoding) ──

def sb_curl_get(path):
    """GET from Supabase via curl to avoid URL encoding issues."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    result = subprocess.run(
        ["curl", "-s", url,
         "-H", f"apikey: {SUPABASE_KEY}",
         "-H", f"Authorization: Bearer {SUPABASE_KEY}"],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode != 0:
        raise Exception(f"curl GET failed: {result.stderr}")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        raise Exception(f"Invalid JSON from GET {path[:100]}: {result.stdout[:300]}")

def sb_get_all(table, params=""):
    """Paginated GET."""
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        sep = "&" if params else ""
        path = f"{table}?{params}{sep}limit={limit}&offset={offset}"
        rows = sb_curl_get(path)
        if isinstance(rows, dict) and "message" in rows:
            raise Exception(f"API error: {rows}")
        all_rows.extend(rows)
        if len(rows) < limit:
            break
        offset += limit
    return all_rows

def sb_curl_post(table, body, upsert_cols=None, ignore=False):
    """POST/upsert via curl."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if upsert_cols:
        url += f"?on_conflict={upsert_cols}"
    
    prefer = "return=minimal"
    if upsert_cols:
        prefer = "resolution=merge-duplicates,return=minimal"
    elif ignore:
        prefer = "resolution=ignore-duplicates,return=minimal"
    
    data = json.dumps(body)
    result = subprocess.run(
        ["curl", "-s", "-w", "\n%{http_code}", "-X", "POST", url,
         "-H", f"apikey: {SUPABASE_KEY}",
         "-H", f"Authorization: Bearer {SUPABASE_KEY}",
         "-H", "Content-Type: application/json",
         "-H", f"Prefer: {prefer}",
         "-d", data],
        capture_output=True, text=True, timeout=60
    )
    lines = result.stdout.strip().split("\n")
    status = int(lines[-1]) if lines else 0
    if status >= 400:
        body_text = "\n".join(lines[:-1])
        print(f"  POST {table} error {status}: {body_text[:300]}")
    return status

def sb_curl_patch(table, params, body):
    """PATCH via curl."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    data = json.dumps(body)
    result = subprocess.run(
        ["curl", "-s", "-w", "\n%{http_code}", "-X", "PATCH", url,
         "-H", f"apikey: {SUPABASE_KEY}",
         "-H", f"Authorization: Bearer {SUPABASE_KEY}",
         "-H", "Content-Type: application/json",
         "-H", "Prefer: return=minimal",
         "-d", data],
        capture_output=True, text=True, timeout=60
    )
    lines = result.stdout.strip().split("\n")
    status = int(lines[-1]) if lines else 0
    return status

def llm_call(messages, max_tokens=2000, temperature=0.3):
    """Call the LLM API via curl."""
    body = json.dumps({
        "model": LLM_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    })
    for attempt in range(3):
        result = subprocess.run(
            ["curl", "-s", "-X", "POST", f"{LLM_URL}/chat/completions",
             "-H", f"Authorization: Bearer {LLM_KEY}",
             "-H", "Content-Type: application/json",
             "-d", body],
            capture_output=True, text=True, timeout=120
        )
        try:
            data = json.loads(result.stdout)
            if "choices" in data:
                return data["choices"][0]["message"]["content"].strip()
            elif "error" in data:
                err = data["error"]
                if "rate" in str(err).lower() or "429" in str(err):
                    wait = 5 * (attempt + 1)
                    print(f"    Rate limited, waiting {wait}s...")
                    time.sleep(wait)
                    continue
                print(f"    LLM error: {err}")
                return None
        except json.JSONDecodeError:
            if attempt < 2:
                time.sleep(3)
                continue
            return None
    return None

def batch_translate_fr_to_en(items):
    """Translate batch of vocab FR→EN. items: [{simplified, pinyin, meaning}]. Returns [en_meaning]."""
    if not items:
        return []
    
    lines = [f'{i+1}. {it["simplified"]} ({it["pinyin"]}) — FR: {it["meaning"]}' for i, it in enumerate(items)]
    prompt = f"""You are a professional Chinese-English translator for HSK exam vocabulary.
Translate each word's meaning from French to English. Be accurate and concise.

{chr(10).join(lines)}

Reply with ONLY a JSON array of English strings, same order, no numbering.
Example: ["hello", "goodbye"]"""

    result = llm_call([{"role": "user", "content": prompt}], max_tokens=4000)
    if not result:
        return [None] * len(items)
    try:
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            trans = json.loads(match.group())
            while len(trans) < len(items):
                trans.append(None)
            return trans[:len(items)]
    except json.JSONDecodeError:
        pass
    return [None] * len(items)

def batch_translate_en_to_fr(items):
    """Translate batch of vocab EN→FR. items: [{simplified, pinyin, meaning}]. Returns [fr_meaning]."""
    if not items:
        return []
    
    lines = [f'{i+1}. {it["simplified"]} ({it["pinyin"]}) — EN: {it["meaning"]}' for i, it in enumerate(items)]
    prompt = f"""You are a professional Chinese-French translator for HSK exam vocabulary.
Translate each word's meaning from English to French for French-speaking students.

{chr(10).join(lines)}

Reply with ONLY a JSON array of French strings, same order, no numbering.
Example: ["bonjour", "au revoir"]"""

    result = llm_call([{"role": "user", "content": prompt}], max_tokens=4000)
    if not result:
        return [None] * len(items)
    try:
        match = re.search(r'\[.*\]', result, re.DOTALL)
        if match:
            trans = json.loads(match.group())
            while len(trans) < len(items):
                trans.append(None)
            return trans[:len(items)]
    except json.JSONDecodeError:
        pass
    return [None] * len(items)

# =====================================================================
# PART 1: Fix passthrough EN vocab translations
# =====================================================================
def fix_passthrough_vocab():
    print("=" * 60)
    print("PART 1: Fixing passthrough EN vocab translations")
    print("=" * 60)
    
    for level in ["2", "3"]:
        print(f"\n--- HSK{level} ---")
        
        # Get vocab items for this level
        vocab = sb_get_all("vocabulary_items", f"hsk_level=eq.{level}&select=id,simplified,pinyin")
        print(f"  Total vocab: {len(vocab)}")
        if not vocab:
            continue
        
        vocab_ids = set(v["id"] for v in vocab)
        vocab_map = {v["id"]: v for v in vocab}
        
        # Fetch translations by querying in chunks of 20 IDs
        fr_trans = {}
        en_trans = {}
        vid_list = sorted(vocab_ids)
        
        CHUNK = 20
        for locale in ["fr", "en"]:
            for ci in range(0, len(vid_list), CHUNK):
                chunk = vid_list[ci:ci+CHUNK]
                ids_str = ",".join(chunk)
                rows = sb_curl_get(
                    f"vocabulary_translations?locale=eq.{locale}&vocabulary_id=in.({ids_str})&select=id,vocabulary_id,meaning")
                if isinstance(rows, dict):
                    print(f"  Error fetching chunk: {rows}")
                    continue
                for t in rows:
                    if locale == "fr":
                        fr_trans[t["vocabulary_id"]] = t
                    else:
                        en_trans[t["vocabulary_id"]] = t
        
        print(f"  FR translations: {len(fr_trans)}, EN translations: {len(en_trans)}")
        
        # Find passthroughs (EN meaning == FR meaning)
        passthroughs = []
        for vid in vocab_ids:
            if vid in fr_trans and vid in en_trans:
                fr_m = (fr_trans[vid].get("meaning") or "").strip()
                en_m = (en_trans[vid].get("meaning") or "").strip()
                if fr_m and en_m and fr_m == en_m:
                    passthroughs.append({
                        "vocab_id": vid,
                        "en_trans_id": en_trans[vid]["id"],
                        "simplified": vocab_map[vid]["simplified"],
                        "pinyin": vocab_map[vid]["pinyin"],
                        "meaning": fr_m,
                    })
        
        print(f"  Passthroughs: {len(passthroughs)}")
        if not passthroughs:
            continue
        
        # Process in batches of 30
        BATCH = 30
        fixed = 0
        errors = 0
        
        for i in range(0, len(passthroughs), BATCH):
            batch = passthroughs[i:i+BATCH]
            print(f"  Batch {i//BATCH+1}/{(len(passthroughs)-1)//BATCH+1} ({len(batch)} items)...", end=" ")
            
            translations = batch_translate_fr_to_en(batch)
            
            batch_fixed = 0
            for item, en_meaning in zip(batch, translations):
                if en_meaning and en_meaning != item["meaning"]:
                    status = sb_curl_patch("vocabulary_translations",
                        f"id=eq.{item['en_trans_id']}", {"meaning": en_meaning})
                    if status in (200, 204):
                        batch_fixed += 1
                        fixed += 1
                    else:
                        errors += 1
                elif not en_meaning:
                    errors += 1
            
            print(f"{batch_fixed} fixed")
            time.sleep(0.5)
        
        print(f"  ✅ HSK{level}: {fixed} fixed, {errors} errors out of {len(passthroughs)}")

# =====================================================================
# PART 2: Fix empty grammar EN explanations
# =====================================================================
def fix_grammar_explanations():
    print("\n" + "=" * 60)
    print("PART 2: Fixing empty/stub grammar EN explanations")
    print("=" * 60)
    
    for level in ["2", "3", "4"]:
        print(f"\n--- HSK{level} ---")
        
        grammars = sb_get_all("grammar_points", f"hsk_level=eq.{level}&select=id,pattern,hsk_level")
        print(f"  Grammar points: {len(grammars)}")
        if not grammars:
            continue
        
        grammar_map = {g["id"]: g for g in grammars}
        gid_list = list(grammar_map.keys())
        gids_str = ",".join(gid_list)
        
        fr_trans = {}
        en_trans = {}
        for locale in ["fr", "en"]:
            rows = sb_curl_get(
                f"grammar_point_translations?locale=eq.{locale}&grammar_point_id=in.({gids_str})&select=id,grammar_point_id,title,explanation_html,examples,common_errors")
            if isinstance(rows, dict):
                print(f"  Error: {rows}")
                continue
            for t in rows:
                if locale == "fr":
                    fr_trans[t["grammar_point_id"]] = t
                else:
                    en_trans[t["grammar_point_id"]] = t
        
        # Find stubs
        stubs = []
        for gid, g in grammar_map.items():
            if gid in en_trans:
                en = en_trans[gid]
                expl = (en.get("explanation_html") or "").strip()
                is_stub = (not expl or len(expl) < 50 or
                    (expl.startswith("<p>") and "pattern" in expl.lower() and len(expl) < 100))
                if is_stub:
                    fr = fr_trans.get(gid, {})
                    stubs.append({
                        "grammar_id": gid,
                        "en_trans_id": en["id"],
                        "pattern": g.get("pattern", ""),
                        "fr_title": fr.get("title", ""),
                        "fr_explanation_html": fr.get("explanation_html", ""),
                        "fr_examples": fr.get("examples", ""),
                        "fr_common_errors": fr.get("common_errors", ""),
                        "en_title": en.get("title", ""),
                    })
        
        print(f"  Stubs: {len(stubs)}")
        if not stubs:
            continue
        
        fixed = 0
        errors = 0
        
        for item in stubs:
            print(f"  Generating: {item['pattern']}...", end=" ")
            
            fr_expl = item["fr_explanation_html"] or "No French explanation available"
            fr_examples = item["fr_examples"] or ""
            
            prompt = f"""You are writing an English grammar explanation for an HSK {level} Chinese language learning platform.

Grammar pattern: {item['pattern']}
French title: {item['fr_title']}
French explanation: {fr_expl}
French examples: {fr_examples}
French common errors: {item['fr_common_errors'] or 'None'}

Write a comprehensive English explanation in HTML format. Include:
1. Clear explanation of when/how to use this pattern
2. 2-3 example sentences (Chinese + pinyin + English translation)
3. Common mistakes to avoid
4. HSK {level} exam tips

Use <p>, <ul>, <li>, <strong>, <em> tags. Start directly with HTML."""

            result = llm_call([{"role": "user", "content": prompt}], max_tokens=2000, temperature=0.3)
            
            if result:
                update = {"explanation_html": result}
                
                # Translate title if needed
                en_title = item["en_title"]
                if not en_title or en_title == item["fr_title"]:
                    tr = llm_call([{"role": "user", "content":
                        f"Translate this Chinese grammar title from French to English. Reply with ONLY the translation.\n{item['fr_title']}"}],
                        max_tokens=100, temperature=0)
                    if tr:
                        update["title"] = tr.strip().strip('"').strip("'")
                
                # Translate examples
                if item["fr_examples"]:
                    ex = llm_call([{"role": "user", "content":
                        f"Translate these grammar examples from French to English. Keep Chinese/pinyin unchanged. Reply with ONLY the translated HTML.\n{item['fr_examples']}"}],
                        max_tokens=2000, temperature=0.2)
                    if ex:
                        update["examples"] = ex.strip()
                
                # Translate common_errors
                if item["fr_common_errors"]:
                    ce = llm_call([{"role": "user", "content":
                        f"Translate these grammar common errors from French to English. Keep Chinese/pinyin unchanged. Reply with ONLY the translated HTML.\n{item['fr_common_errors']}"}],
                        max_tokens=1000, temperature=0.2)
                    if ce:
                        update["common_errors"] = ce.strip()
                
                status = sb_curl_patch("grammar_point_translations",
                    f"id=eq.{item['en_trans_id']}", update)
                if status in (200, 204):
                    fixed += 1
                    print("✅")
                else:
                    errors += 1
                    print("❌")
            else:
                errors += 1
                print("❌ (no LLM response)")
            
            time.sleep(0.5)
        
        print(f"  ✅ HSK{level}: {fixed} fixed, {errors} errors out of {len(stubs)}")

# =====================================================================
# PART 3: Ingest HSK5 vocabulary + generate FR via LLM
# =====================================================================
def ingest_hsk5():
    print("\n" + "=" * 60)
    print("PART 3: Ingesting HSK5 vocabulary (600 words)")
    print("=" * 60)
    
    with open(HSK5_FILE, "r") as f:
        words = json.loads(f.read())
    print(f"  Loaded {len(words)} words")
    
    # ─── Step 1: Course structure ───
    print("\n  Step 1: Course/Module/Lesson structure...")
    course_id = "a0000000-0000-0000-0000-000000000005"
    sb_curl_patch("courses", f"id=eq.{course_id}", {"status": "published"})
    
    WORDS_PER_LESSON = 12
    LESSONS_PER_MODULE = 5
    WORDS_PER_MODULE = WORDS_PER_LESSON * LESSONS_PER_MODULE  # 60
    num_modules = (len(words) + WORDS_PER_MODULE - 1) // WORDS_PER_MODULE
    total_lessons = (len(words) + WORDS_PER_LESSON - 1) // WORDS_PER_LESSON
    
    # Modules
    modules = []
    for m in range(num_modules):
        modules.append({
            "id": f"b0000000-0005-0000-0000-{m+1:012d}",
            "course_id": course_id,
            "sort_order": m + 1,
            "status": "published",
        })
    print(f"    {num_modules} modules, {total_lessons} lessons")
    sb_curl_post("modules", modules, upsert_cols="id")
    
    # Module translations
    mod_trans = []
    for m in range(num_modules):
        s = m * WORDS_PER_MODULE
        e = min(s + WORDS_PER_MODULE, len(words))
        themes = list(set(w.get("theme", "general") for w in words[s:e]))[:3]
        theme_str = ", ".join(themes)
        mid = f"b0000000-0005-0000-0000-{m+1:012d}"
        for li, locale in enumerate(["fr", "en"]):
            mod_trans.append({
                "id": f"b0000000-0005-{m+1:04d}-{li+1:04d}-000000000000",
                "module_id": mid,
                "locale": locale,
                "title": f"Module {m+1} — {theme_str}",
                "description": f"HSK5 vocabulary module {m+1}" if locale == "en" else f"Module vocabulaire HSK5 {m+1}",
            })
    sb_curl_post("module_translations", mod_trans, upsert_cols="id")
    
    # Lessons
    lessons = []
    lesson_trans = []
    for l in range(total_lessons):
        mod_idx = l // LESSONS_PER_MODULE
        mid = f"b0000000-0005-0000-0000-{mod_idx+1:012d}"
        lid = f"c0000000-0005-0000-0000-{l+1:012d}"
        lessons.append({
            "id": lid,
            "module_id": mid,
            "lesson_type": "vocabulary",
            "sort_order": (l % LESSONS_PER_MODULE) + 1,
            "estimated_duration_minutes": 20,
            "xp_reward": 15,
            "status": "published",
        })
        s = l * WORDS_PER_LESSON
        e = min(s + WORDS_PER_LESSON, len(words))
        sample = ", ".join(w["simplified"] for w in words[s:e][:4])
        for li, locale in enumerate(["fr", "en"]):
            lesson_trans.append({
                "id": f"c0000000-0005-{l+1:04d}-{li+1:04d}-000000000000",
                "lesson_id": lid,
                "locale": locale,
                "title": f"{'Leçon' if locale=='fr' else 'Lesson'} {l+1} — {sample}...",
                "description": "",
            })
    
    for i in range(0, len(lessons), 200):
        sb_curl_post("lessons", lessons[i:i+200], upsert_cols="id")
    for i in range(0, len(lesson_trans), 200):
        sb_curl_post("lesson_translations", lesson_trans[i:i+200], upsert_cols="id")
    print(f"    Lessons + translations created")
    
    # ─── Step 2: Vocabulary items ───
    print("\n  Step 2: Vocabulary items...")
    vocab_items = []
    for idx, w in enumerate(words):
        vocab_items.append({
            "id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "simplified": w["simplified"],
            "traditional": w.get("traditional"),
            "pinyin": w["pinyin"],
            "hsk_level": "5",
            "word_type": w.get("word_type", "unknown"),
            "theme": w.get("theme", "general"),
            "frequency_rank": w.get("frequency_rank", idx + 1),
            "status": "active",
        })
    
    for i in range(0, len(vocab_items), 200):
        st = sb_curl_post("vocabulary_items", vocab_items[i:i+200], upsert_cols="id")
        print(f"    Batch {i//200+1}: HTTP {st}")
    
    # ─── Step 3: EN translations (from file) ───
    print("\n  Step 3: EN translations from file...")
    en_trans = []
    for idx, w in enumerate(words):
        en = w.get("translations", {}).get("en", {})
        en_trans.append({
            "id": f"d1000005-0000-{idx+1:04d}-0002-000000000000",
            "vocabulary_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "locale": "en",
            "meaning": en.get("meaning", ""),
            "example_sentence": en.get("example_sentence", ""),
            "example_pinyin": en.get("example_pinyin", ""),
            "example_translation": en.get("example_translation", ""),
            "usage_notes": en.get("usage_notes") or "",
        })
    
    for i in range(0, len(en_trans), 200):
        sb_curl_post("vocabulary_translations", en_trans[i:i+200], upsert_cols="id")
    print(f"    {len(en_trans)} EN translations inserted")
    
    # ─── Step 4: FR translations via LLM ───
    print("\n  Step 4: Generating FR translations via LLM...")
    BATCH_SIZE = 30
    fr_trans = []
    total_ok = 0
    
    for i in range(0, len(words), BATCH_SIZE):
        batch_words = words[i:i+BATCH_SIZE]
        batch_items = [{
            "simplified": w["simplified"],
            "pinyin": w["pinyin"],
            "meaning": w.get("translations", {}).get("en", {}).get("meaning", ""),
        } for w in batch_words]
        
        print(f"    Batch {i//BATCH_SIZE+1}/{(len(words)-1)//BATCH_SIZE+1}...", end=" ")
        fr_meanings = batch_translate_en_to_fr(batch_items)
        
        batch_ok = 0
        for j, (w, fr_m) in enumerate(zip(batch_words, fr_meanings)):
            idx = i + j
            en = w.get("translations", {}).get("en", {})
            fr_trans.append({
                "id": f"d1000005-0000-{idx+1:04d}-0001-000000000000",
                "vocabulary_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
                "locale": "fr",
                "meaning": fr_m or en.get("meaning", ""),  # fallback
                "example_sentence": en.get("example_sentence", ""),
                "example_pinyin": en.get("example_pinyin", ""),
                "example_translation": "",
                "usage_notes": "",
            })
            if fr_m:
                batch_ok += 1
                total_ok += 1
        
        print(f"{batch_ok}/{len(batch_words)} OK")
        time.sleep(0.5)
    
    for i in range(0, len(fr_trans), 200):
        sb_curl_post("vocabulary_translations", fr_trans[i:i+200], upsert_cols="id")
    print(f"    {total_ok}/{len(words)} FR translations generated")
    
    # ─── Step 5: Lesson-vocab junctions ───
    print("\n  Step 5: Lesson-vocab junctions...")
    junctions = []
    for idx in range(len(words)):
        lesson_idx = idx // WORDS_PER_LESSON
        junctions.append({
            "id": f"d1000005-{idx+1:04d}-0000-0000-000000000000",
            "lesson_id": f"c0000000-0005-0000-0000-{lesson_idx+1:012d}",
            "vocabulary_item_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "sort_order": (idx % WORDS_PER_LESSON) + 1,
        })
    
    for i in range(0, len(junctions), 200):
        sb_curl_post("lesson_vocabulary_items", junctions[i:i+200], upsert_cols="id")
    print(f"    {len(junctions)} junctions created")
    
    # ─── Step 6: Characters ───
    print("\n  Step 6: Characters...")
    existing = sb_get_all("characters", "select=id,character")
    existing_map = {c["character"]: c["id"] for c in existing}
    print(f"    Existing: {len(existing_map)}")
    
    all_chars = set()
    for w in words:
        for ch in w["simplified"]:
            if '\u4e00' <= ch <= '\u9fff':
                all_chars.add(ch)
    
    new_chars = sorted(ch for ch in all_chars if ch not in existing_map)
    print(f"    Unique HSK5: {len(all_chars)}, New: {len(new_chars)}")
    
    new_map = {}
    if new_chars:
        char_recs = []
        char_trans = []
        for ci, ch in enumerate(new_chars):
            cid = f"f0000005-0000-0000-0000-{ci+1:012d}"
            new_map[ch] = cid
            char_recs.append({
                "id": cid,
                "character": ch,
                "hsk_level": "5",
                "status": "active",
            })
            for li, locale in enumerate(["fr", "en"]):
                char_trans.append({
                    "id": f"f0000005-0000-{ci+1:04d}-{li+1:04d}-000000000000",
                    "character_id": cid,
                    "locale": locale,
                    "meaning": "",
                    "mnemonic": "",
                })
        
        for i in range(0, len(char_recs), 200):
            sb_curl_post("characters", char_recs[i:i+200], ignore=True)
        for i in range(0, len(char_trans), 200):
            sb_curl_post("character_translations", char_trans[i:i+200], upsert_cols="id")
        print(f"    {len(new_chars)} new characters inserted")
    
    # ─── Step 7: Lesson-character junctions ───
    print("\n  Step 7: Lesson-character junctions...")
    merged = {**existing_map, **new_map}
    
    lc = []
    seen = set()
    sort_counter = 0
    for idx, w in enumerate(words):
        lesson_idx = idx // WORDS_PER_LESSON
        lid = f"c0000000-0005-0000-0000-{lesson_idx+1:012d}"
        for ch in w["simplified"]:
            if '\u4e00' <= ch <= '\u9fff' and ch in merged:
                key = (lid, merged[ch])
                if key not in seen:
                    seen.add(key)
                    sort_counter += 1
                    lc.append({
                        "id": f"f0000005-{lesson_idx+1:04d}-{sort_counter:04d}-0000-000000000000",
                        "lesson_id": lid,
                        "character_id": merged[ch],
                        "sort_order": sort_counter,
                    })
    
    for i in range(0, len(lc), 200):
        sb_curl_post("lesson_characters", lc[i:i+200], upsert_cols="id")
    print(f"    {len(lc)} lesson-character junctions created")
    
    print(f"\n  ✅ HSK5 complete: {len(words)} vocab, {num_modules} modules, {total_lessons} lessons")
    print(f"     EN: {len(en_trans)}, FR: {total_ok}/{len(words)}")
    print(f"     New chars: {len(new_chars)}, Junctions: {len(junctions)} vocab + {len(lc)} chars")

# =====================================================================
if __name__ == "__main__":
    if not LLM_KEY:
        print("ERROR: OPENAI_API_KEY not set")
        sys.exit(1)
    
    print(f"LLM: {LLM_URL} / {LLM_MODEL}")
    print()
    
    fix_passthrough_vocab()
    fix_grammar_explanations()
    ingest_hsk5()
    
    print("\n" + "=" * 60)
    print("ALL DONE!")
    print("=" * 60)
