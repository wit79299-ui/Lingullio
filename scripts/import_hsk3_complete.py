#!/usr/bin/env python3
"""
HSK3 Import — Completion Script
================================
Runs only the remaining steps:
1. Fix lesson content (PATCH to update content_html without overwriting title)
2. Import remaining exercises (if any)
3. Import mock exam #2
4. Link junction tables (lesson_vocabulary_items, lesson_grammar_points, lesson_characters)

Optimized: batch operations, minimal API calls, PATCH for partial updates.
"""

import json, os, sys, uuid, time, requests
from typing import Any, Optional

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
DATA_DIR = "/home/user/uploaded_files"
COURSE_ID = "a0000000-0000-0000-0000-000000000003"
LEVEL = "3"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MAP = {}
STATS = {}
ERRORS = []

def api_get_all(table, params=""):
    all_items = []
    offset = 0
    batch = 1000
    while True:
        h = {**HEADERS, "Range": f"{offset}-{offset+batch-1}"}
        url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
        r = requests.get(url, headers=h)
        if r.status_code >= 400:
            print(f"  !! GET {table} → {r.status_code}: {r.text[:200]}")
            break
        items = r.json()
        all_items.extend(items)
        if len(items) < batch:
            break
        offset += batch
    return all_items

def api_patch(table, data, params=""):
    """PATCH for partial updates — doesn't require NOT NULL fields."""
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    h = {**HEADERS, "Prefer": "return=representation"}
    r = requests.patch(url, json=data, headers=h)
    if r.status_code >= 400:
        msg = f"PATCH {table}{params} → {r.status_code}: {r.text[:300]}"
        ERRORS.append(msg)
        return None
    try:
        return r.json()
    except:
        return None

def api_post(table, data, headers_extra=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    h = {**HEADERS, **(headers_extra or {})}
    r = requests.post(url, json=data, headers=h)
    if r.status_code >= 400:
        msg = f"POST {table} → {r.status_code}: {r.text[:300]}"
        ERRORS.append(msg)
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
        msg = f"UPSERT {table} → {r.status_code}: {r.text[:300]}"
        ERRORS.append(msg)
        return None
    try:
        return r.json()
    except:
        return None

def load_json(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)

def gen_uuid():
    return str(uuid.uuid4())

def extract_id(res):
    if isinstance(res, list) and len(res) > 0:
        return res[0].get('id')
    if isinstance(res, dict):
        return res.get('id')
    return None

# ---------------------------------------------------------------------------
# REBUILD MAP from existing data
# ---------------------------------------------------------------------------
def rebuild_map():
    """Rebuild the temp_id → UUID map from existing DB state + data files."""
    print("=== REBUILDING MAP ===")
    
    # 1. Modules
    modules_data = load_json("lingullio_hsk3_modules.json.txt")
    existing_modules = api_get_all("modules", f"?course_id=eq.{COURSE_ID}&select=id,sort_order&order=sort_order")
    mod_by_sort = {m['sort_order']: m['id'] for m in existing_modules}
    for mod in modules_data:
        sort = mod['sort_order']
        if sort in mod_by_sort:
            MAP[mod['_temp_id']] = mod_by_sort[sort]
    print(f"  Modules: {len([k for k in MAP if k.startswith('mod_')])} mapped")
    
    # 2. Lessons
    lessons_data = load_json("lingullio_hsk3_lessons.json.txt")
    module_ids = list(mod_by_sort.values())
    existing_lessons = []
    for mid in module_ids:
        res = api_get_all("lessons", f"?module_id=eq.{mid}&select=id,sort_order,module_id")
        existing_lessons.extend(res)
    les_by_key = {(l['module_id'], l['sort_order']): l['id'] for l in existing_lessons}
    for les in lessons_data:
        parent = les['_parent_module']
        module_id = MAP.get(parent)
        if module_id:
            key = (module_id, les['sort_order'])
            if key in les_by_key:
                MAP[les['_temp_id']] = les_by_key[key]
    print(f"  Lessons: {len([k for k in MAP if k.startswith('les_')])} mapped")
    
    # 3. Vocabulary
    vocab_data = load_json("lingullio_hsk3_vocab.json.txt")
    existing_vocab = api_get_all("vocabulary_items", f"?level=eq.{LEVEL}&select=id,simplified")
    vocab_by_simplified = {v['simplified']: v['id'] for v in existing_vocab}
    for item in vocab_data:
        if item['simplified'] in vocab_by_simplified:
            MAP[item['_temp_id']] = vocab_by_simplified[item['simplified']]
    print(f"  Vocabulary: {len([k for k in MAP if k.startswith('vocab_')])} mapped")
    
    # 4. Characters
    chars_data = load_json("lingullio_hsk3_characters.json.txt")
    existing_chars = api_get_all("characters", f"?level=eq.{LEVEL}&select=id,character")
    char_by_char = {c['character']: c['id'] for c in existing_chars}
    for item in chars_data:
        if item['character'] in char_by_char:
            MAP[item['_temp_id']] = char_by_char[item['character']]
    print(f"  Characters: {len([k for k in MAP if k.startswith('char_')])} mapped")
    
    # 5. Grammar
    grammar_data = load_json("lingullio_hsk3_grammar.json.txt")
    existing_grammar = api_get_all("grammar_points", f"?level=eq.{LEVEL}&select=id,pattern")
    gram_by_pattern = {g['pattern']: g['id'] for g in existing_grammar}
    for item in grammar_data:
        if item['pattern'] in gram_by_pattern:
            MAP[item['_temp_id']] = gram_by_pattern[item['pattern']]
    print(f"  Grammar: {len([k for k in MAP if k.startswith('gram_')])} mapped")
    
    # 6. Exercises — map by lesson_id + sort_order
    exercises_data = load_json("lingullio_hsk3_exercises.json.txt")
    # Get all level=3 exercises
    existing_exercises = api_get_all("exercises", f"?level=eq.{LEVEL}&select=id,lesson_id,sort_order")
    ex_by_key = {(e['lesson_id'], e['sort_order']): e['id'] for e in existing_exercises}
    for item in exercises_data:
        lesson_id = MAP.get(item['_lesson_ref'])
        if lesson_id:
            key = (lesson_id, item.get('sort_order', 0))
            if key in ex_by_key:
                MAP[item['_temp_id']] = ex_by_key[key]
    print(f"  Exercises: {len([k for k in MAP if k.startswith('ex')])} mapped")
    
    print(f"  Total MAP entries: {len(MAP)}")

# ---------------------------------------------------------------------------
# STEP 1: Fix lesson content (PATCH existing translations)
# ---------------------------------------------------------------------------
def fix_lesson_content():
    print("\n=== STEP 1: FIX LESSON CONTENT ===")
    data = load_json("lingullio_hsk3_lesson_content.json.txt")
    
    updated = 0
    missing = 0
    for item in data:
        lesson_ref = item['_lesson_ref']
        lesson_id = MAP.get(lesson_ref)
        if not lesson_id:
            missing += 1
            continue
        
        for locale, tr in item.get('translations', {}).items():
            content_html = tr.get('content_html')
            if content_html:
                # Use PATCH to update only content_html on existing row
                res = api_patch("lesson_translations", 
                    {"content_html": content_html},
                    params=f"?lesson_id=eq.{lesson_id}&locale=eq.{locale}")
                if res:
                    updated += 1
    
    STATS['lesson_content'] = f"{updated} updated, {missing} missing refs"
    print(f"  {STATS['lesson_content']}")

# ---------------------------------------------------------------------------
# STEP 2: Import remaining exercises
# ---------------------------------------------------------------------------
def import_remaining_exercises():
    print("\n=== STEP 2: REMAINING EXERCISES ===")
    data = load_json("lingullio_hsk3_exercises.json.txt")
    
    created = 0
    already_exists = 0
    skipped = 0
    options_created = 0
    
    for idx, item in enumerate(data):
        temp_id = item['_temp_id']
        lesson_ref = item['_lesson_ref']
        lesson_id = MAP.get(lesson_ref)
        if not lesson_id:
            skipped += 1
            continue
        
        # Already mapped?
        if temp_id in MAP:
            already_exists += 1
            exercise_id = MAP[temp_id]
        else:
            # Need to create
            eid = gen_uuid()
            sort_order = item.get('sort_order', idx + 1)
            row = {
                "id": eid,
                "lesson_id": lesson_id,
                "exercise_type": item['exercise_type'],
                "difficulty": item.get('difficulty'),
                "points": item.get('points', 10),
                "estimated_duration_seconds": item.get('estimated_duration_seconds'),
                "skill_tags": item.get('skill_tags', []),
                "level": LEVEL,
                "sort_order": sort_order,
                "status": "published",
            }
            res = api_post("exercises", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or eid
            exercise_id = MAP[temp_id]
            if rid:
                created += 1
        
        # Ensure exercise translations exist
        for locale, tr in item.get('translations', {}).items():
            upsert("exercise_translations", {
                "exercise_id": exercise_id,
                "locale": locale,
                "prompt": tr.get('prompt', ''),
                "instruction": tr.get('instruction'),
                "explanation": tr.get('explanation'),
                "hint": tr.get('hint'),
            }, on_conflict="exercise_id,locale")
        
        # Ensure options exist
        for opt in item.get('options', []):
            opt_sort = opt.get('sort_order', 0)
            
            # Check existing
            ex_opts = api_get_all("exercise_options", 
                f"?exercise_id=eq.{exercise_id}&sort_order=eq.{opt_sort}&select=id")
            
            if ex_opts:
                opt_id = ex_opts[0]['id']
            else:
                opt_id = gen_uuid()
                res = api_post("exercise_options", {
                    "id": opt_id,
                    "exercise_id": exercise_id,
                    "sort_order": opt_sort,
                    "is_correct": opt.get('is_correct', False),
                })
                rid = extract_id(res)
                if rid:
                    opt_id = rid
                    options_created += 1
            
            for locale, otr in opt.get('translations', {}).items():
                upsert("exercise_option_translations", {
                    "option_id": opt_id,
                    "locale": locale,
                    "content": otr.get('content', ''),
                    "error_explanation": otr.get('error_explanation'),
                }, on_conflict="option_id,locale")
        
        if (idx + 1) % 50 == 0:
            print(f"  ... processed {idx+1}/{len(data)}")
    
    STATS['exercises'] = f"{created} new, {already_exists} already existed, {skipped} skipped, {options_created} options"
    print(f"  {STATS['exercises']}")

# ---------------------------------------------------------------------------
# STEP 3: Mock Exam #2
# ---------------------------------------------------------------------------
def import_mock_exam_2():
    print("\n=== STEP 3: MOCK EXAM #2 ===")
    data = load_json("lingullio_hsk3_mock_exams.json.txt")
    
    # Check existing
    existing = api_get_all("mock_exams", f"?course_id=eq.{COURSE_ID}&select=id,sort_order")
    existing_sorts = {e['sort_order']: e['id'] for e in existing}
    
    exams_created = 0
    sections_created = 0
    questions_created = 0
    exercises_created = 0
    
    for exam_idx, exam in enumerate(data.get('exams', [])):
        temp_id = exam['_temp_id']
        sort_order = exam_idx + 1
        
        if sort_order in existing_sorts:
            MAP[temp_id] = existing_sorts[sort_order]
            print(f"  Exam sort={sort_order} already exists")
            continue
        
        # Create exam
        eid = gen_uuid()
        row = {
            "id": eid,
            "course_id": COURSE_ID,
            "sort_order": sort_order,
            "total_duration_minutes": exam.get('duration_minutes', 85),
            "total_points": exam.get('total_points', 100),
            "status": "published",
        }
        res = api_post("mock_exams", row)
        rid = extract_id(res)
        MAP[temp_id] = rid or eid
        exam_id = MAP[temp_id]
        if rid:
            exams_created += 1
        
        # Translations
        upsert("mock_exam_translations", {
            "mock_exam_id": exam_id,
            "locale": "en",
            "title": exam.get('title', f'HSK3 Mock Exam {sort_order}'),
        }, on_conflict="mock_exam_id,locale")
        
        upsert("mock_exam_translations", {
            "mock_exam_id": exam_id,
            "locale": "fr",
            "title": (exam.get('title', '') or '').replace('Mock Exam', 'Examen Blanc') or f'Examen Blanc HSK3 {sort_order}',
        }, on_conflict="mock_exam_id,locale")
        
        # Group items by section
        sections_map = {}
        for item in exam.get('items', []):
            sec = item.get('section', 'general')
            if sec not in sections_map:
                sections_map[sec] = []
            sections_map[sec].append(item)
        
        section_duration = int(exam.get('duration_minutes', 85) / max(len(sections_map), 1))
        
        for sec_idx, (sec_name, items) in enumerate(sections_map.items(), 1):
            section_id = gen_uuid()
            sec_row = {
                "id": section_id,
                "mock_exam_id": exam_id,
                "section_type": sec_name,
                "sort_order": sec_idx,
                "total_points": round(sum(i.get('points', 1.43) for i in items), 2),
                "duration_minutes": section_duration,
            }
            res = api_post("mock_exam_sections", sec_row)
            rid = extract_id(res)
            if rid:
                section_id = rid
                sections_created += 1
            
            for q_item in items:
                q_sort = q_item['sort_order']
                
                # Create exercise for this question
                ex_id = gen_uuid()
                ex_type = q_item.get('item_type', 'mcq')
                type_map = {
                    'dialogue_mcq': 'listening_comprehension',
                    'monologue_mcq': 'listening_comprehension',
                    'passage_mcq': 'reading_comprehension',
                    'cloze_mcq': 'fill_blank',
                    'sentence_composition': 'reorder',
                    'mcq': 'mcq',
                }
                exercise_type = type_map.get(ex_type, 'mcq')
                
                ex_row = {
                    "id": ex_id,
                    "exercise_type": exercise_type,
                    "difficulty": 2,
                    "points": round(q_item.get('points', 1.43), 2),
                    "level": LEVEL,
                    "sort_order": q_sort,
                    "status": "published",
                    "skill_tags": [sec_name],
                }
                res = api_post("exercises", ex_row)
                rid = extract_id(res)
                actual_ex_id = rid or ex_id
                if rid:
                    exercises_created += 1
                
                # Exercise translation
                prompt_zh = q_item.get('prompt_zh', '')
                if prompt_zh:
                    upsert("exercise_translations", {
                        "exercise_id": actual_ex_id,
                        "locale": "zh",
                        "prompt": prompt_zh,
                    }, on_conflict="exercise_id,locale")
                    upsert("exercise_translations", {
                        "exercise_id": actual_ex_id,
                        "locale": "en",
                        "prompt": prompt_zh,
                        "instruction": f"Mock exam {sec_name} question",
                    }, on_conflict="exercise_id,locale")
                
                # Create question linking section → exercise
                qid = gen_uuid()
                q_row = {
                    "id": qid,
                    "section_id": section_id,
                    "exercise_id": actual_ex_id,
                    "sort_order": q_sort,
                    "points": round(q_item.get('points', 1.43), 2),
                }
                res = api_post("mock_exam_questions", q_row)
                if extract_id(res):
                    questions_created += 1
            
            print(f"  Section {sec_name}: {len(items)} questions created")
    
    STATS['mock_exams'] = f"{exams_created} exams, {sections_created} sections, {questions_created} questions, {exercises_created} exercises"
    print(f"  {STATS['mock_exams']}")

# ---------------------------------------------------------------------------
# STEP 4: Junction links
# ---------------------------------------------------------------------------
def link_lesson_content():
    print("\n=== STEP 4: JUNCTION LINKS ===")
    data = load_json("lingullio_hsk3_lessons.json.txt")
    
    vocab_links = 0
    grammar_links = 0
    char_links = 0
    missing = {'vocab': 0, 'grammar': 0, 'char': 0}
    
    for les_idx, les in enumerate(data):
        lesson_id = MAP.get(les['_temp_id'])
        if not lesson_id:
            continue
        
        # Vocabulary refs
        for v_idx, vref in enumerate(les.get('vocabulary_refs', []), 1):
            vid = MAP.get(vref)
            if vid:
                upsert("lesson_vocabulary_items", {
                    "lesson_id": lesson_id,
                    "vocabulary_item_id": vid,
                    "sort_order": v_idx,
                }, on_conflict="lesson_id,vocabulary_item_id")
                vocab_links += 1
            else:
                missing['vocab'] += 1
        
        # Grammar refs
        for g_idx, gref in enumerate(les.get('grammar_refs', []), 1):
            gid = MAP.get(gref)
            if gid:
                upsert("lesson_grammar_points", {
                    "lesson_id": lesson_id,
                    "grammar_point_id": gid,
                    "sort_order": g_idx,
                }, on_conflict="lesson_id,grammar_point_id")
                grammar_links += 1
            else:
                missing['grammar'] += 1
        
        # Character refs
        for c_idx, cref in enumerate(les.get('character_refs', []), 1):
            cid = MAP.get(cref)
            if cid:
                upsert("lesson_characters", {
                    "lesson_id": lesson_id,
                    "character_id": cid,
                    "sort_order": c_idx,
                }, on_conflict="lesson_id,character_id")
                char_links += 1
            else:
                missing['char'] += 1
        
        if (les_idx + 1) % 20 == 0:
            print(f"  ... processed {les_idx+1}/{len(data)} lessons")
    
    STATS['links'] = f"vocab={vocab_links} grammar={grammar_links} chars={char_links} | missing: v={missing['vocab']} g={missing['grammar']} c={missing['char']}"
    print(f"  {STATS['links']}")

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("HSK3 IMPORT — COMPLETION")
    print("=" * 60)
    
    t0 = time.time()
    
    # First rebuild the MAP from existing DB data
    rebuild_map()
    
    # Step 1: Fix lesson content (PATCH)
    fix_lesson_content()
    
    # Step 2: Import remaining exercises
    import_remaining_exercises()
    
    # Step 3: Mock Exam #2
    import_mock_exam_2()
    
    # Step 4: Junction links
    link_lesson_content()
    
    elapsed = time.time() - t0
    
    print("\n" + "=" * 60)
    print("COMPLETION DONE")
    print("=" * 60)
    print(f"Duration: {elapsed:.1f}s")
    print(f"MAP entries: {len(MAP)}")
    for k, v in STATS.items():
        print(f"  {k}: {v}")
    
    if ERRORS:
        print(f"\n⚠️  {len(ERRORS)} errors:")
        for e in ERRORS[:20]:
            print(f"  - {e}")
    else:
        print("\n✅ No errors!")

if __name__ == "__main__":
    main()
