#!/usr/bin/env python3
"""
Fix HSK5 remaining issues:
1. Insert 50 lessons (lesson_type='standard', no xp_reward)
2. Insert lesson_translations
3. Insert new characters (with radical/stroke_count defaults)
4. Insert character_translations
5. Insert lesson_vocabulary_items junctions
6. Insert lesson_characters junctions
"""
import os, sys, json, subprocess

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
HSK5_FILE = "/home/user/uploaded_files/lingullio_hsk5_vocab_partial.json.txt"

def sb_get(path):
    r = subprocess.run(["curl","-s",f"{SUPABASE_URL}/rest/v1/{path}",
        "-H",f"apikey: {SUPABASE_KEY}","-H",f"Authorization: Bearer {SUPABASE_KEY}"],
        capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout)

def sb_get_all(table, params=""):
    rows, offset = [], 0
    while True:
        sep = "&" if params else ""
        chunk = sb_get(f"{table}?{params}{sep}limit=1000&offset={offset}")
        if isinstance(chunk, dict): raise Exception(str(chunk))
        rows.extend(chunk)
        if len(chunk) < 1000: break
        offset += 1000
    return rows

def sb_post(table, body, upsert_cols=None, ignore=False):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if upsert_cols: url += f"?on_conflict={upsert_cols}"
    prefer = "return=minimal"
    if upsert_cols: prefer = "resolution=merge-duplicates,return=minimal"
    elif ignore: prefer = "resolution=ignore-duplicates,return=minimal"
    r = subprocess.run(["curl","-s","-w","\n%{http_code}","-X","POST",url,
        "-H",f"apikey: {SUPABASE_KEY}","-H",f"Authorization: Bearer {SUPABASE_KEY}",
        "-H","Content-Type: application/json","-H",f"Prefer: {prefer}",
        "-d",json.dumps(body)], capture_output=True, text=True, timeout=60)
    lines = r.stdout.strip().split("\n")
    code = int(lines[-1]) if lines else 0
    if code >= 400:
        print(f"  ERR {table} {code}: {chr(10).join(lines[:-1])[:200]}")
    return code

def main():
    with open(HSK5_FILE) as f:
        words = json.loads(f.read())
    print(f"Loaded {len(words)} words")
    
    WPL = 12  # words per lesson
    LPM = 5   # lessons per module
    total_lessons = (len(words) + WPL - 1) // WPL

    # ── 1. Lessons (lesson_type='standard') ──
    print(f"\n1. Inserting {total_lessons} lessons...")
    lessons = []
    lesson_trans = []
    for l in range(total_lessons):
        mid = f"b0000000-0005-0000-0000-{l // LPM + 1:012d}"
        lid = f"c0000000-0005-0000-0000-{l+1:012d}"
        lessons.append({
            "id": lid,
            "module_id": mid,
            "lesson_type": "standard",
            "sort_order": (l % LPM) + 1,
            "estimated_duration_minutes": 20,
            "status": "published",
        })
        s = l * WPL
        sample = ", ".join(w["simplified"] for w in words[s:s+4])
        for li, loc in enumerate(["fr","en"]):
            lesson_trans.append({
                "id": f"c0000000-0005-{l+1:04d}-{li+1:04d}-000000000000",
                "lesson_id": lid,
                "locale": loc,
                "title": f"{'Leçon' if loc=='fr' else 'Lesson'} {l+1} — {sample}...",
                "description": "",
            })
    
    for i in range(0, len(lessons), 50):
        st = sb_post("lessons", lessons[i:i+50], upsert_cols="id")
        print(f"  Lessons batch {i//50+1}: {st}")
    
    for i in range(0, len(lesson_trans), 100):
        st = sb_post("lesson_translations", lesson_trans[i:i+100], upsert_cols="id")
        print(f"  Lesson trans batch {i//100+1}: {st}")

    # ── 2. Characters (with radical + stroke_count) ──
    print(f"\n2. Characters...")
    existing = sb_get_all("characters", "select=id,character")
    existing_map = {c["character"]: c["id"] for c in existing}
    
    all_chars = set()
    word_char_pinyin = {}
    for w in words:
        for ch in w["simplified"]:
            if '\u4e00' <= ch <= '\u9fff':
                all_chars.add(ch)
                if ch not in word_char_pinyin and len(w["simplified"]) == 1:
                    word_char_pinyin[ch] = w["pinyin"]
    
    new_chars = sorted(ch for ch in all_chars if ch not in existing_map)
    print(f"  New: {len(new_chars)} (existing: {len(existing_map)})")
    
    new_map = {}
    if new_chars:
        char_recs = []
        char_trans = []
        for ci, ch in enumerate(new_chars):
            cid = f"f0000005-0000-0000-0000-{ci+1:012d}"
            new_map[ch] = cid
            py = word_char_pinyin.get(ch, "unknown")
            char_recs.append({
                "id": cid,
                "character": ch,
                "pinyin": py,
                "radical": "⿱",  # Placeholder - will need enrichment
                "stroke_count": 8,  # Placeholder default
                "hsk_level": "5",
                "status": "published",
            })
            for li, loc in enumerate(["fr","en"]):
                char_trans.append({
                    "id": f"f0000005-0000-{ci+1:04d}-{li+1:04d}-000000000000",
                    "character_id": cid,
                    "locale": loc,
                    "meaning": "",
                    "mnemonic": "",
                })
        
        for i in range(0, len(char_recs), 100):
            st = sb_post("characters", char_recs[i:i+100], ignore=True)
            print(f"  Chars batch {i//100+1}: {st}")
        
        for i in range(0, len(char_trans), 200):
            st = sb_post("character_translations", char_trans[i:i+200], upsert_cols="id")
            print(f"  Char trans batch {i//200+1}: {st}")

    # ── 3. Lesson-vocab junctions ──
    print(f"\n3. Lesson-vocab junctions...")
    junctions = []
    for idx in range(len(words)):
        lid = f"c0000000-0005-0000-0000-{idx // WPL + 1:012d}"
        junctions.append({
            "id": f"d1000005-{idx+1:04d}-0000-0000-000000000000",
            "lesson_id": lid,
            "vocabulary_item_id": f"d1000005-0000-0000-0000-{idx+1:012d}",
            "sort_order": (idx % WPL) + 1,
        })
    for i in range(0, len(junctions), 200):
        st = sb_post("lesson_vocabulary_items", junctions[i:i+200], upsert_cols="id")
        print(f"  LV batch {i//200+1}: {st}")

    # ── 4. Lesson-character junctions ──
    print(f"\n4. Lesson-character junctions...")
    merged = {**existing_map, **new_map}
    lc = []
    seen = set()
    sc = 0
    for idx, w in enumerate(words):
        li = idx // WPL
        lid = f"c0000000-0005-0000-0000-{li+1:012d}"
        for ch in w["simplified"]:
            if '\u4e00' <= ch <= '\u9fff' and ch in merged:
                key = (lid, merged[ch])
                if key not in seen:
                    seen.add(key)
                    sc += 1
                    lc.append({
                        "id": f"f0000005-{li+1:04d}-{sc:04d}-0000-000000000000",
                        "lesson_id": lid,
                        "character_id": merged[ch],
                        "sort_order": sc,
                    })
    
    for i in range(0, len(lc), 200):
        st = sb_post("lesson_characters", lc[i:i+200], upsert_cols="id")
        print(f"  LC batch {i//200+1}: {st}")

    print(f"\n{'='*50}")
    print(f"FIX COMPLETE")
    print(f"  Lessons: {total_lessons}")
    print(f"  New characters: {len(new_chars)}")
    print(f"  Lesson-vocab junctions: {len(junctions)}")
    print(f"  Lesson-character junctions: {len(lc)}")
    print(f"{'='*50}")

if __name__ == "__main__":
    main()
