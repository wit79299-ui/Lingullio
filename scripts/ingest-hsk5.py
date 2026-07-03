#!/usr/bin/env python3
"""
Lingullio — HSK5 vocabulary ingestion (600 words)
Corrected column names & constraints:
  - lessons: NO xp_reward column
  - vocabulary_items.status: must be 'published' (not 'active')
  - characters.status: must be 'published'  
  - characters.pinyin: NOT NULL
  - vocabulary_translations FK: vocabulary_id (not vocabulary_item_id)
"""
import os, sys, json, time, re, subprocess

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

LLM_KEY = os.environ.get("OPENAI_API_KEY")
LLM_URL = os.environ.get("OPENAI_BASE_URL", "https://www.genspark.ai/api/llm_proxy/v1")
LLM_MODEL = "gpt-5-mini"

HSK5_FILE = "/home/user/uploaded_files/lingullio_hsk5_vocab_partial.json.txt"

# ── curl helpers ──

def sb_get(path):
    r = subprocess.run(["curl","-s",f"{SUPABASE_URL}/rest/v1/{path}",
        "-H",f"apikey: {SUPABASE_KEY}","-H",f"Authorization: Bearer {SUPABASE_KEY}"],
        capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout)

def sb_get_all(table, params=""):
    rows = []
    offset = 0
    while True:
        sep = "&" if params else ""
        chunk = sb_get(f"{table}?{params}{sep}limit=1000&offset={offset}")
        if isinstance(chunk, dict):
            raise Exception(f"Error: {chunk}")
        rows.extend(chunk)
        if len(chunk) < 1000:
            break
        offset += 1000
    return rows

def sb_post(table, body, upsert_cols=None, ignore=False):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if upsert_cols:
        url += f"?on_conflict={upsert_cols}"
    prefer = "return=minimal"
    if upsert_cols:
        prefer = "resolution=merge-duplicates,return=minimal"
    elif ignore:
        prefer = "resolution=ignore-duplicates,return=minimal"
    r = subprocess.run(["curl","-s","-w","\n%{http_code}","-X","POST",url,
        "-H",f"apikey: {SUPABASE_KEY}","-H",f"Authorization: Bearer {SUPABASE_KEY}",
        "-H","Content-Type: application/json","-H",f"Prefer: {prefer}",
        "-d",json.dumps(body)],
        capture_output=True, text=True, timeout=60)
    lines = r.stdout.strip().split("\n")
    code = int(lines[-1]) if lines else 0
    if code >= 400:
        print(f"    POST {table} {code}: {chr(10).join(lines[:-1])[:200]}")
    return code

def sb_patch(table, params, body):
    r = subprocess.run(["curl","-s","-w","\n%{http_code}","-X","PATCH",
        f"{SUPABASE_URL}/rest/v1/{table}?{params}",
        "-H",f"apikey: {SUPABASE_KEY}","-H",f"Authorization: Bearer {SUPABASE_KEY}",
        "-H","Content-Type: application/json","-H","Prefer: return=minimal",
        "-d",json.dumps(body)],
        capture_output=True, text=True, timeout=60)
    lines = r.stdout.strip().split("\n")
    return int(lines[-1]) if lines else 0

def llm_call(messages, max_tokens=2000, temperature=0.3):
    body = json.dumps({"model":LLM_MODEL,"messages":messages,"max_tokens":max_tokens,"temperature":temperature})
    for attempt in range(3):
        r = subprocess.run(["curl","-s","-X","POST",f"{LLM_URL}/chat/completions",
            "-H",f"Authorization: Bearer {LLM_KEY}","-H","Content-Type: application/json",
            "-d",body], capture_output=True, text=True, timeout=120)
        try:
            data = json.loads(r.stdout)
            if "choices" in data:
                return data["choices"][0]["message"]["content"].strip()
            if "rate" in str(data).lower():
                time.sleep(5*(attempt+1))
                continue
        except:
            if attempt < 2:
                time.sleep(3)
    return None

def batch_en_to_fr(items):
    """items: [{simplified, pinyin, meaning(EN)}] → [fr_meaning]"""
    if not items:
        return []
    lines = [f'{i+1}. {it["simplified"]} ({it["pinyin"]}) — EN: {it["meaning"]}' for i, it in enumerate(items)]
    prompt = f"""You are a professional Chinese-French translator for HSK exam vocabulary.
Translate each word's meaning from English to French for French-speaking students. Be accurate and concise.

{chr(10).join(lines)}

Reply with ONLY a JSON array of French strings, same order. Example: ["bonjour", "au revoir"]"""
    result = llm_call([{"role":"user","content":prompt}], max_tokens=4000)
    if not result:
        return [None]*len(items)
    try:
        m = re.search(r'\[.*\]', result, re.DOTALL)
        if m:
            t = json.loads(m.group())
            while len(t) < len(items): t.append(None)
            return t[:len(items)]
    except: pass
    return [None]*len(items)

# ──────────────────────────────────────────────────────────────
def main():
    with open(HSK5_FILE) as f:
        words = json.loads(f.read())
    print(f"Loaded {len(words)} HSK5 words")

    WORDS_PER_LESSON = 12
    LESSONS_PER_MODULE = 5
    WORDS_PER_MODULE = 60
    num_modules = (len(words) + WORDS_PER_MODULE - 1) // WORDS_PER_MODULE
    total_lessons = (len(words) + WORDS_PER_LESSON - 1) // WORDS_PER_LESSON
    course_id = "a0000000-0000-0000-0000-000000000005"

    # ── Step 1: Course + Modules ──
    print(f"\n1. Course structure: {num_modules} modules, {total_lessons} lessons")
    sb_patch("courses", f"id=eq.{course_id}", {"status": "published"})

    modules = [{"id": f"b0000000-0005-0000-0000-{m+1:012d}",
                "course_id": course_id, "sort_order": m+1, "status": "published"}
               for m in range(num_modules)]
    sb_post("modules", modules, upsert_cols="id")

    mod_trans = []
    for m in range(num_modules):
        s = m * WORDS_PER_MODULE
        themes = ", ".join(list(set(w.get("theme","general") for w in words[s:s+WORDS_PER_MODULE]))[:3])
        mid = f"b0000000-0005-0000-0000-{m+1:012d}"
        for li, loc in enumerate(["fr","en"]):
            mod_trans.append({"id": f"b0000000-0005-{m+1:04d}-{li+1:04d}-000000000000",
                "module_id": mid, "locale": loc,
                "title": f"Module {m+1} — {themes}",
                "description": f"HSK5 vocabulary module {m+1}" if loc=="en" else f"Module vocabulaire HSK5 {m+1}"})
    sb_post("module_translations", mod_trans, upsert_cols="id")
    print(f"   Modules ✅")

    # ── Step 2: Lessons (NO xp_reward!) ──
    lessons = []
    lesson_trans = []
    for l in range(total_lessons):
        mid = f"b0000000-0005-0000-0000-{l // LESSONS_PER_MODULE + 1:012d}"
        lid = f"c0000000-0005-0000-0000-{l+1:012d}"
        lessons.append({"id": lid, "module_id": mid, "lesson_type": "vocabulary",
            "sort_order": (l % LESSONS_PER_MODULE)+1,
            "estimated_duration_minutes": 20, "status": "published"})
        s = l * WORDS_PER_LESSON
        sample = ", ".join(w["simplified"] for w in words[s:s+4])
        for li, loc in enumerate(["fr","en"]):
            lesson_trans.append({"id": f"c0000000-0005-{l+1:04d}-{li+1:04d}-000000000000",
                "lesson_id": lid, "locale": loc,
                "title": f"{'Leçon' if loc=='fr' else 'Lesson'} {l+1} — {sample}...",
                "description": ""})
    
    for i in range(0, len(lessons), 200):
        sb_post("lessons", lessons[i:i+200], upsert_cols="id")
    for i in range(0, len(lesson_trans), 200):
        sb_post("lesson_translations", lesson_trans[i:i+200], upsert_cols="id")
    print(f"   Lessons ✅")

    # ── Step 3: Vocabulary items (status='published') ──
    print("\n2. Vocabulary items...")
    vocab_items = []
    for idx, w in enumerate(words):
        vocab_items.append({"id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "simplified": w["simplified"],
            "traditional": w.get("traditional"),
            "pinyin": w["pinyin"],
            "hsk_level": "5",
            "word_type": w.get("word_type", "word"),
            "theme": w.get("theme"),
            "frequency_rank": w.get("frequency_rank", idx+1),
            "status": "published"})
    
    for i in range(0, len(vocab_items), 200):
        st = sb_post("vocabulary_items", vocab_items[i:i+200], upsert_cols="id")
        print(f"   Batch {i//200+1}: {st}")

    # ── Step 4: EN translations from file ──
    print("\n3. EN translations from file...")
    en_trans = []
    for idx, w in enumerate(words):
        en = w.get("translations",{}).get("en",{})
        en_trans.append({"id": f"d1000005-0000-{idx+1:04d}-0002-000000000000",
            "vocabulary_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "locale": "en",
            "meaning": en.get("meaning",""),
            "example_sentence": en.get("example_sentence",""),
            "example_pinyin": en.get("example_pinyin",""),
            "example_translation": en.get("example_translation",""),
            "usage_notes": en.get("usage_notes") or ""})
    
    for i in range(0, len(en_trans), 200):
        sb_post("vocabulary_translations", en_trans[i:i+200], upsert_cols="id")
    print(f"   {len(en_trans)} EN translations ✅")

    # ── Step 5: FR translations via LLM ──
    print("\n4. Generating FR translations via LLM...")
    BATCH = 30
    fr_trans = []
    total_ok = 0
    
    for i in range(0, len(words), BATCH):
        bw = words[i:i+BATCH]
        items = [{"simplified":w["simplified"],"pinyin":w["pinyin"],
                  "meaning":w.get("translations",{}).get("en",{}).get("meaning","")} for w in bw]
        
        print(f"   Batch {i//BATCH+1}/{(len(words)-1)//BATCH+1}...", end=" ", flush=True)
        fr_meanings = batch_en_to_fr(items)
        
        ok = 0
        for j, (w, fr_m) in enumerate(zip(bw, fr_meanings)):
            idx = i + j
            en = w.get("translations",{}).get("en",{})
            fr_trans.append({"id": f"d1000005-0000-{idx+1:04d}-0001-000000000000",
                "vocabulary_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
                "locale": "fr",
                "meaning": fr_m or en.get("meaning",""),
                "example_sentence": en.get("example_sentence",""),
                "example_pinyin": en.get("example_pinyin",""),
                "example_translation": "",
                "usage_notes": ""})
            if fr_m:
                ok += 1
                total_ok += 1
        print(f"{ok}/{len(bw)}")
        time.sleep(0.5)
    
    for i in range(0, len(fr_trans), 200):
        sb_post("vocabulary_translations", fr_trans[i:i+200], upsert_cols="id")
    print(f"   {total_ok}/{len(words)} FR generated ✅")

    # ── Step 6: Lesson-vocab junctions ──
    print("\n5. Lesson-vocab junctions...")
    junctions = []
    for idx in range(len(words)):
        lid = f"c0000000-0005-0000-0000-{idx // WORDS_PER_LESSON + 1:012d}"
        junctions.append({"id": f"d1000005-{idx+1:04d}-0000-0000-000000000000",
            "lesson_id": lid,
            "vocabulary_item_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "sort_order": (idx % WORDS_PER_LESSON)+1})
    for i in range(0, len(junctions), 200):
        sb_post("lesson_vocabulary_items", junctions[i:i+200], upsert_cols="id")
    print(f"   {len(junctions)} junctions ✅")

    # ── Step 7: Characters ──
    print("\n6. Characters...")
    existing = sb_get_all("characters", "select=id,character")
    existing_map = {c["character"]: c["id"] for c in existing}
    
    all_chars = set()
    for w in words:
        for ch in w["simplified"]:
            if '\u4e00' <= ch <= '\u9fff':
                all_chars.add(ch)
    
    new_chars = sorted(ch for ch in all_chars if ch not in existing_map)
    print(f"   Existing: {len(existing_map)}, HSK5 unique: {len(all_chars)}, New: {len(new_chars)}")
    
    new_map = {}
    if new_chars:
        # We need pinyin for characters - extract from words
        char_pinyin = {}
        for w in words:
            for ch in w["simplified"]:
                if ch not in char_pinyin and '\u4e00' <= ch <= '\u9fff':
                    # Use first char of pinyin if single-char word
                    if len(w["simplified"]) == 1:
                        char_pinyin[ch] = w["pinyin"]
                    elif ch not in char_pinyin:
                        char_pinyin[ch] = ""  # Will need to be filled
        
        char_recs = []
        char_trans = []
        for ci, ch in enumerate(new_chars):
            cid = f"f0000005-0000-0000-0000-{ci+1:012d}"
            new_map[ch] = cid
            py = char_pinyin.get(ch, "")
            if not py:
                py = "unknown"  # NOT NULL constraint
            char_recs.append({"id": cid, "character": ch, "pinyin": py,
                "hsk_level": "5", "status": "published"})
            for li, loc in enumerate(["fr","en"]):
                char_trans.append({"id": f"f0000005-0000-{ci+1:04d}-{li+1:04d}-000000000000",
                    "character_id": cid, "locale": loc, "meaning": "", "mnemonic": ""})
        
        for i in range(0, len(char_recs), 200):
            sb_post("characters", char_recs[i:i+200], ignore=True)
        for i in range(0, len(char_trans), 200):
            sb_post("character_translations", char_trans[i:i+200], upsert_cols="id")
        print(f"   {len(new_chars)} new characters ✅")

    # ── Step 8: Lesson-character junctions ──
    print("\n7. Lesson-character junctions...")
    merged = {**existing_map, **new_map}
    lc = []
    seen = set()
    sc = 0
    for idx, w in enumerate(words):
        li = idx // WORDS_PER_LESSON
        lid = f"c0000000-0005-0000-0000-{li+1:012d}"
        for ch in w["simplified"]:
            if '\u4e00' <= ch <= '\u9fff' and ch in merged:
                key = (lid, merged[ch])
                if key not in seen:
                    seen.add(key)
                    sc += 1
                    lc.append({"id": f"f0000005-{li+1:04d}-{sc:04d}-0000-000000000000",
                        "lesson_id": lid, "character_id": merged[ch], "sort_order": sc})
    
    for i in range(0, len(lc), 200):
        sb_post("lesson_characters", lc[i:i+200], upsert_cols="id")
    print(f"   {len(lc)} junctions ✅")

    # ── Summary ──
    print(f"\n{'='*50}")
    print(f"HSK5 INGESTION COMPLETE")
    print(f"  Vocab: {len(words)}")
    print(f"  Modules: {num_modules}, Lessons: {total_lessons}")
    print(f"  EN trans: {len(en_trans)}")
    print(f"  FR trans: {total_ok}/{len(words)} LLM-generated")
    print(f"  New chars: {len(new_chars)}")
    print(f"  Lesson-vocab: {len(junctions)}, Lesson-char: {len(lc)}")
    print(f"{'='*50}")

if __name__ == "__main__":
    if not LLM_KEY:
        print("ERROR: OPENAI_API_KEY not set"); sys.exit(1)
    main()
