#!/usr/bin/env python3
"""
Lingullio HSK4 Content Import Script
=====================================
Imports HSK4 content via Supabase REST API.

Data files (no exercises/mock_exams in this batch):
- 37 modules
- 210 lessons (with vocabulary_refs, grammar_refs)
- 1000 vocabulary items
- 441 characters
- 40 grammar points

Existing state: 4 modules, 17 lessons, 72 vocab, 2 chars, 15 grammar, 100 exercises, 1 mock exam.

Steps:
1. Modules (37) — upsert by sort_order
2. Lessons (210) — resolve _parent_module
3. Vocabulary (1000) — upsert by simplified + level
4. Characters (441) — upsert by character + level
5. Grammar (40) — upsert by pattern + level
6. Junction links (lesson_vocabulary_items, lesson_grammar_points)
"""

import json, os, uuid, time, requests

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
DATA_DIR = "/home/user/uploaded_files"
COURSE_ID = "a0000000-0000-0000-0000-000000000004"  # HSK-4
LEVEL = "4"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MAP = {}
STATS = {}
ERRORS = []

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def api_get_all(table, params=""):
    all_items = []
    offset = 0
    while True:
        h = {**HEADERS, "Range": f"{offset}-{offset+999}"}
        r = requests.get(f"{SUPABASE_URL}/rest/v1/{table}{params}", headers=h)
        if r.status_code >= 400:
            print(f"  !! GET {table} → {r.status_code}: {r.text[:200]}")
            break
        items = r.json()
        all_items.extend(items)
        if len(items) < 1000:
            break
        offset += 1000
    return all_items

def api_post(table, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", json=data, headers=HEADERS)
    if r.status_code >= 400:
        ERRORS.append(f"POST {table} → {r.status_code}: {r.text[:200]}")
        return None
    try:
        return r.json()
    except:
        return None

def upsert(table, data, on_conflict=""):
    h = {**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    r = requests.post(url, json=data, headers=h)
    if r.status_code >= 400:
        ERRORS.append(f"UPSERT {table} → {r.status_code}: {r.text[:200]}")
        return None
    try:
        return r.json()
    except:
        return None

def batch_upsert(table, items, on_conflict="", batch_size=50):
    """Upsert items in batches for better performance."""
    results = []
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        res = upsert(table, batch, on_conflict)
        if res:
            results.extend(res if isinstance(res, list) else [res])
        time.sleep(0.15)
    return results

def extract_id(res):
    if isinstance(res, list) and len(res) > 0:
        return res[0].get('id')
    if isinstance(res, dict):
        return res.get('id')
    return None

def load_json(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)

def gen_uuid():
    return str(uuid.uuid4())

# ---------------------------------------------------------------------------
# 1. MODULES (37)
# ---------------------------------------------------------------------------
def import_modules():
    print("\n=== 1. MODULES ===")
    data = load_json("lingullio_hsk4_modules.json.txt")
    
    existing = api_get_all("modules", f"?course_id=eq.{COURSE_ID}&select=id,sort_order")
    existing_by_sort = {m['sort_order']: m['id'] for m in existing}
    print(f"  Existing: {len(existing_by_sort)} modules")
    
    created = 0
    for mod in data:
        temp_id = mod['_temp_id']
        sort = mod['sort_order']
        
        if sort in existing_by_sort:
            MAP[temp_id] = existing_by_sort[sort]
        else:
            mod_id = gen_uuid()
            row = {
                "id": mod_id,
                "course_id": COURSE_ID,
                "sort_order": sort,
                "status": "published",
                "estimated_duration_minutes": mod.get('estimated_duration_min'),
            }
            res = api_post("modules", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or mod_id
            if rid:
                created += 1
        
        # Upsert translations
        mid = MAP[temp_id]
        for locale, tr in mod.get('translations', {}).items():
            objectives = tr.get('objectives')
            obj_json = json.dumps(objectives) if objectives else None
            upsert("module_translations", {
                "module_id": mid,
                "locale": locale,
                "title": tr['title'],
                "description": tr.get('description'),
                "objectives": obj_json,
            }, on_conflict="module_id,locale")
    
    STATS['modules'] = f"{created} created, {len(existing_by_sort)} existing → {len(data)} total"
    print(f"  {STATS['modules']}")

# ---------------------------------------------------------------------------
# 2. LESSONS (210)
# ---------------------------------------------------------------------------
def import_lessons():
    print("\n=== 2. LESSONS ===")
    data = load_json("lingullio_hsk4_lessons.json.txt")
    
    # Get existing lessons
    module_ids = [MAP[k] for k in MAP if k.startswith('mod_')]
    existing_lessons = []
    for mid in module_ids:
        res = api_get_all("lessons", f"?module_id=eq.{mid}&select=id,sort_order,module_id")
        existing_lessons.extend(res)
    existing_by_key = {(l['module_id'], l['sort_order']): l['id'] for l in existing_lessons}
    print(f"  Existing: {len(existing_by_key)} lessons")
    
    created = 0
    skipped = 0
    for les in data:
        temp_id = les['_temp_id']
        parent = les['_parent_module']
        module_id = MAP.get(parent)
        if not module_id:
            print(f"  !! Parent {parent} not mapped for {temp_id}")
            skipped += 1
            continue
        
        sort = les['sort_order']
        key = (module_id, sort)
        
        if key in existing_by_key:
            MAP[temp_id] = existing_by_key[key]
        else:
            les_id = gen_uuid()
            row = {
                "id": les_id,
                "module_id": module_id,
                "sort_order": sort,
                "lesson_type": les['lesson_type'],
                "status": "published",
                "estimated_duration_minutes": les.get('estimated_duration_min'),
            }
            res = api_post("lessons", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or les_id
            if rid:
                created += 1
        
        # Upsert translations
        lid = MAP[temp_id]
        for locale, tr in les.get('translations', {}).items():
            upsert("lesson_translations", {
                "lesson_id": lid,
                "locale": locale,
                "title": tr['title'],
                "description": tr.get('description'),
                "content_html": tr.get('content_html'),
            }, on_conflict="lesson_id,locale")
        
        if (created + skipped) % 30 == 0 and created > 0:
            print(f"  ... {created} created so far ({len(data) - created - len(existing_by_key)} remaining)")
    
    STATS['lessons'] = f"{created} created, {len(existing_by_key)} existing, {skipped} skipped"
    print(f"  {STATS['lessons']}")

# ---------------------------------------------------------------------------
# 3. VOCABULARY (1000)
# ---------------------------------------------------------------------------
def import_vocabulary():
    print("\n=== 3. VOCABULARY ===")
    data = load_json("lingullio_hsk4_vocab.json.txt")
    
    existing = api_get_all("vocabulary_items", f"?level=eq.{LEVEL}&select=id,simplified")
    existing_by_simplified = {v['simplified']: v['id'] for v in existing}
    print(f"  Existing: {len(existing_by_simplified)} vocab items")
    
    # Batch approach: prepare all inserts, then batch translations
    created = 0
    translation_batch = []
    
    for idx, item in enumerate(data):
        temp_id = item['_temp_id']
        simplified = item['simplified']
        
        if simplified in existing_by_simplified:
            MAP[temp_id] = existing_by_simplified[simplified]
        else:
            vocab_id = gen_uuid()
            row = {
                "id": vocab_id,
                "simplified": simplified,
                "traditional": item.get('traditional'),
                "pinyin": item['pinyin'],
                "level": LEVEL,
                "word_type": item.get('word_type'),
                "theme": item.get('theme'),
                "frequency_rank": item.get('frequency_rank'),
                "radical": item.get('radical'),
                "stroke_count": item.get('stroke_count'),
                "status": "published",
            }
            res = api_post("vocabulary_items", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or vocab_id
            if rid:
                created += 1
        
        # Queue translation
        vid = MAP.get(temp_id)
        if vid:
            for locale, tr in item.get('translations', {}).items():
                translation_batch.append({
                    "vocabulary_item_id": vid,
                    "locale": locale,
                    "meaning": tr['meaning'],
                    "example_sentence": tr.get('example_sentence'),
                    "example_pinyin": tr.get('example_pinyin'),
                    "example_translation": tr.get('example_translation'),
                })
        
        if (idx + 1) % 100 == 0:
            print(f"  ... items: {idx+1}/{len(data)}, created: {created}")
    
    # Batch upsert translations
    print(f"  Upserting {len(translation_batch)} translations in batches...")
    batch_upsert("vocabulary_translations", translation_batch, on_conflict="vocabulary_item_id,locale")
    
    STATS['vocabulary'] = f"{created} created, {len(existing_by_simplified)} existing"
    print(f"  {STATS['vocabulary']}")

# ---------------------------------------------------------------------------
# 4. CHARACTERS (441)
# ---------------------------------------------------------------------------
def import_characters():
    print("\n=== 4. CHARACTERS ===")
    data = load_json("lingullio_hsk4_characters.json.txt")
    
    existing = api_get_all("characters", f"?level=eq.{LEVEL}&select=id,character")
    existing_by_char = {c['character']: c['id'] for c in existing}
    print(f"  Existing: {len(existing_by_char)} characters")
    
    created = 0
    translation_batch = []
    
    for idx, item in enumerate(data):
        temp_id = item['_temp_id']
        char = item['character']
        
        if char in existing_by_char:
            MAP[temp_id] = existing_by_char[char]
        else:
            char_id = gen_uuid()
            row = {
                "id": char_id,
                "character": char,
                "pinyin": item['pinyin'],
                "radical": item.get('radical'),
                "stroke_count": item.get('stroke_count'),
                "level": LEVEL,
                "frequency_rank": item.get('frequency_rank'),
                "decomposition": item.get('decomposition'),
                "status": "published",
            }
            res = api_post("characters", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or char_id
            if rid:
                created += 1
        
        cid = MAP.get(temp_id)
        if cid:
            for locale, tr in item.get('translations', {}).items():
                translation_batch.append({
                    "character_id": cid,
                    "locale": locale,
                    "meaning": tr['meaning'],
                    "mnemonic": tr.get('mnemonic'),
                })
        
        if (idx + 1) % 100 == 0:
            print(f"  ... items: {idx+1}/{len(data)}, created: {created}")
    
    print(f"  Upserting {len(translation_batch)} translations in batches...")
    batch_upsert("character_translations", translation_batch, on_conflict="character_id,locale")
    
    STATS['characters'] = f"{created} created, {len(existing_by_char)} existing"
    print(f"  {STATS['characters']}")

# ---------------------------------------------------------------------------
# 5. GRAMMAR (40)
# ---------------------------------------------------------------------------
def import_grammar():
    print("\n=== 5. GRAMMAR ===")
    data = load_json("lingullio_hsk4_grammar.json.txt")
    
    existing = api_get_all("grammar_points", f"?level=eq.{LEVEL}&select=id,pattern")
    existing_by_pattern = {g['pattern']: g['id'] for g in existing}
    print(f"  Existing: {len(existing_by_pattern)} grammar points")
    
    created = 0
    for item in data:
        temp_id = item['_temp_id']
        pattern = item['pattern']
        
        if pattern in existing_by_pattern:
            MAP[temp_id] = existing_by_pattern[pattern]
        else:
            gid = gen_uuid()
            row = {
                "id": gid,
                "pattern": pattern,
                "level": LEVEL,
                "sort_order": item.get('sort_order', 0),
                "difficulty": item.get('difficulty'),
                "status": "published",
            }
            res = api_post("grammar_points", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or gid
            if rid:
                created += 1
        
        gid = MAP.get(temp_id)
        if gid:
            for locale, tr in item.get('translations', {}).items():
                upsert("grammar_point_translations", {
                    "grammar_point_id": gid,
                    "locale": locale,
                    "title": tr['title'],
                    "explanation_html": tr.get('explanation_html', ''),
                }, on_conflict="grammar_point_id,locale")
    
    STATS['grammar'] = f"{created} created, {len(existing_by_pattern)} existing"
    print(f"  {STATS['grammar']}")

# ---------------------------------------------------------------------------
# 6. JUNCTION LINKS
# ---------------------------------------------------------------------------
def link_lesson_content():
    print("\n=== 6. JUNCTION LINKS ===")
    data = load_json("lingullio_hsk4_lessons.json.txt")
    
    vocab_links = 0
    grammar_links = 0
    missing = {'vocab': 0, 'grammar': 0}
    
    # Prepare batches for better performance
    vocab_batch = []
    grammar_batch = []
    
    for les in data:
        lesson_id = MAP.get(les['_temp_id'])
        if not lesson_id:
            continue
        
        for v_idx, vref in enumerate(les.get('vocabulary_refs', []), 1):
            vid = MAP.get(vref)
            if vid:
                vocab_batch.append({
                    "lesson_id": lesson_id,
                    "vocabulary_item_id": vid,
                    "sort_order": v_idx,
                })
            else:
                missing['vocab'] += 1
        
        for g_idx, gref in enumerate(les.get('grammar_refs', []), 1):
            gid = MAP.get(gref)
            if gid:
                grammar_batch.append({
                    "lesson_id": lesson_id,
                    "grammar_point_id": gid,
                    "sort_order": g_idx,
                })
            else:
                missing['grammar'] += 1
    
    print(f"  Vocab links to upsert: {len(vocab_batch)}")
    if vocab_batch:
        batch_upsert("lesson_vocabulary_items", vocab_batch, on_conflict="lesson_id,vocabulary_item_id")
        vocab_links = len(vocab_batch)
    
    print(f"  Grammar links to upsert: {len(grammar_batch)}")
    if grammar_batch:
        batch_upsert("lesson_grammar_points", grammar_batch, on_conflict="lesson_id,grammar_point_id")
        grammar_links = len(grammar_batch)
    
    STATS['links'] = f"vocab={vocab_links} grammar={grammar_links} | missing: v={missing['vocab']} g={missing['grammar']}"
    print(f"  {STATS['links']}")

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("LINGULLIO HSK4 IMPORT")
    print("=" * 60)
    print(f"Course: {COURSE_ID}")
    print(f"Level: {LEVEL}")
    
    t0 = time.time()
    
    import_modules()
    import_lessons()
    import_vocabulary()
    import_characters()
    import_grammar()
    link_lesson_content()
    
    elapsed = time.time() - t0
    
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"Duration: {elapsed:.1f}s")
    print(f"MAP entries: {len(MAP)}")
    for k, v in STATS.items():
        print(f"  {k}: {v}")
    
    if ERRORS:
        print(f"\n⚠️  {len(ERRORS)} errors:")
        # Group errors by type
        error_types = {}
        for e in ERRORS:
            key = e.split(" → ")[0] if " → " in e else e[:50]
            error_types[key] = error_types.get(key, 0) + 1
        for etype, count in sorted(error_types.items(), key=lambda x: -x[1])[:15]:
            print(f"  [{count}x] {etype}")
    else:
        print("\n✅ No errors!")

if __name__ == "__main__":
    main()
