#!/usr/bin/env python3
"""
Lingullio HSK3 Full Content Import Script (v2 — corrected)
==========================================================
Imports all HSK3 content via Supabase REST API (PostgREST).

Corrections from v1:
- Junction tables: lesson_vocabulary_items, lesson_grammar_points, lesson_characters
- mock_exam_questions: uses exercise_id (not prompt_zh/item_type)
- mock_exams: no passing_score column
- Pagination: Range header for large datasets
- Module translations: includes objectives

Order:
1. Modules (16)        — 7 existing, 9 new
2. Lessons (103)       — 61 existing, ~42 new
3. Lesson content (81) — update content_html
4. Vocabulary (500)    — 500 existing (all mapped)
5. Characters (284)    — 284 existing (all mapped)
6. Grammar (33)        — 11 existing, 22 new
7. Exercises (217)     — 80 existing, ~137 new (with options)
8. Mock Exams (2)      — 1 existing, 1 new (with sections; questions → exercises)
9. Junction links      — lesson_vocabulary_items, lesson_grammar_points, lesson_characters
"""

import json, os, sys, uuid, time, requests
from typing import Any, Optional

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
DATA_DIR = "/home/user/uploaded_files"

COURSE_ID = "a0000000-0000-0000-0000-000000000003"  # HSK-3
LEVEL = "3"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

MAP = {}   # temp_id → real UUID
STATS = {}
ERRORS = []

# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------
def api(method, table, data=None, params="", headers_extra=None):
    """Call Supabase REST API. Returns parsed JSON or None on error."""
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    h = {**HEADERS, **(headers_extra or {})}
    r = getattr(requests, method)(url, json=data, headers=h)
    if r.status_code >= 400:
        msg = f"{method.upper()} {table}{params} → {r.status_code}: {r.text[:300]}"
        print(f"  !! {msg}")
        ERRORS.append(msg)
        return None
    try:
        return r.json()
    except:
        return None

def api_get_all(table, params=""):
    """GET with pagination to handle >1000 rows."""
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

def upsert(table, data, on_conflict=""):
    """POST with upsert semantics."""
    h = {**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if on_conflict:
        url += f"?on_conflict={on_conflict}"
    r = requests.post(url, json=data, headers=h)
    if r.status_code >= 400:
        msg = f"UPSERT {table} → {r.status_code}: {r.text[:300]}"
        print(f"  !! {msg}")
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
    """Extract id from PostgREST response (list or dict)."""
    if isinstance(res, list) and len(res) > 0:
        return res[0].get('id')
    if isinstance(res, dict):
        return res.get('id')
    return None

# ---------------------------------------------------------------------------
# 1. MODULES (16 total — 7 existing, 9 new)
# ---------------------------------------------------------------------------
def import_modules():
    print("\n=== 1. MODULES ===")
    data = load_json("lingullio_hsk3_modules.json.txt")
    
    existing = api_get_all("modules", f"?course_id=eq.{COURSE_ID}&select=id,sort_order")
    existing_by_sort = {m['sort_order']: m['id'] for m in existing}
    
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
            res = api("post", "modules", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or mod_id
            if rid:
                created += 1
        
        # Upsert translations for ALL modules (existing + new)
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
    
    STATS['modules'] = f"{created} created, {len(existing_by_sort)} existing"
    mod_count = len([k for k in MAP if k.startswith('mod_')])
    print(f"  {STATS['modules']} — MAP has {mod_count} module entries")

# ---------------------------------------------------------------------------
# 2. LESSONS (103 total — 61 existing, ~42 new)
# ---------------------------------------------------------------------------
def import_lessons():
    print("\n=== 2. LESSONS ===")
    data = load_json("lingullio_hsk3_lessons.json.txt")
    
    # Get ALL existing lessons for HSK3 modules
    module_ids = [MAP[k] for k in MAP if k.startswith('mod_')]
    existing_lessons = []
    for mid in module_ids:
        res = api_get_all("lessons", f"?module_id=eq.{mid}&select=id,sort_order,module_id")
        existing_lessons.extend(res)
    existing_by_key = {(l['module_id'], l['sort_order']): l['id'] for l in existing_lessons}
    
    created = 0
    skipped = 0
    for les in data:
        temp_id = les['_temp_id']
        parent = les['_parent_module']
        module_id = MAP.get(parent)
        if not module_id:
            print(f"  !! Parent module {parent} not mapped for lesson {temp_id}")
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
            res = api("post", "lessons", row)
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
    
    STATS['lessons'] = f"{created} created, {len(existing_by_key)} existing, {skipped} skipped"
    les_count = len([k for k in MAP if k.startswith('les_')])
    print(f"  {STATS['lessons']} — MAP has {les_count} lesson entries")

# ---------------------------------------------------------------------------
# 3. LESSON CONTENT (update content_html in lesson_translations)
# ---------------------------------------------------------------------------
def import_lesson_content():
    print("\n=== 3. LESSON CONTENT ===")
    data = load_json("lingullio_hsk3_lesson_content.json.txt")
    
    updated = 0
    missing = 0
    for item in data:
        lesson_ref = item['_lesson_ref']
        lesson_id = MAP.get(lesson_ref)
        if not lesson_id:
            print(f"  !! Lesson {lesson_ref} not mapped")
            missing += 1
            continue
        
        for locale, tr in item.get('translations', {}).items():
            content_html = tr.get('content_html')
            if content_html:
                upsert("lesson_translations", {
                    "lesson_id": lesson_id,
                    "locale": locale,
                    "content_html": content_html,
                }, on_conflict="lesson_id,locale")
                updated += 1
    
    STATS['lesson_content'] = f"{updated} updated, {missing} missing refs"
    print(f"  {STATS['lesson_content']}")

# ---------------------------------------------------------------------------
# 4. VOCABULARY (500 — all should already exist)
# ---------------------------------------------------------------------------
def import_vocabulary():
    print("\n=== 4. VOCABULARY ===")
    data = load_json("lingullio_hsk3_vocab.json.txt")
    
    # Get all existing vocab for level 3 (500 items)
    existing = api_get_all("vocabulary_items", f"?level=eq.{LEVEL}&select=id,simplified")
    existing_by_simplified = {v['simplified']: v['id'] for v in existing}
    print(f"  Found {len(existing_by_simplified)} existing vocabulary items")
    
    created = 0
    for item in data:
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
            res = api("post", "vocabulary_items", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or vocab_id
            if rid:
                created += 1
        
        # Upsert translations
        vid = MAP.get(temp_id)
        if vid:
            for locale, tr in item.get('translations', {}).items():
                upsert("vocabulary_translations", {
                    "vocabulary_item_id": vid,
                    "locale": locale,
                    "meaning": tr['meaning'],
                    "example_sentence": tr.get('example_sentence'),
                    "example_pinyin": tr.get('example_pinyin'),
                    "example_translation": tr.get('example_translation'),
                }, on_conflict="vocabulary_item_id,locale")
    
    STATS['vocabulary'] = f"{created} created, {len(existing_by_simplified)} existing"
    print(f"  {STATS['vocabulary']}")

# ---------------------------------------------------------------------------
# 5. CHARACTERS (284 — all should already exist)
# ---------------------------------------------------------------------------
def import_characters():
    print("\n=== 5. CHARACTERS ===")
    data = load_json("lingullio_hsk3_characters.json.txt")
    
    existing = api_get_all("characters", f"?level=eq.{LEVEL}&select=id,character")
    existing_by_char = {c['character']: c['id'] for c in existing}
    print(f"  Found {len(existing_by_char)} existing characters")
    
    created = 0
    for item in data:
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
            res = api("post", "characters", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or char_id
            if rid:
                created += 1
        
        cid = MAP.get(temp_id)
        if cid:
            for locale, tr in item.get('translations', {}).items():
                upsert("character_translations", {
                    "character_id": cid,
                    "locale": locale,
                    "meaning": tr['meaning'],
                    "mnemonic": tr.get('mnemonic'),
                }, on_conflict="character_id,locale")
    
    STATS['characters'] = f"{created} created, {len(existing_by_char)} existing"
    print(f"  {STATS['characters']}")

# ---------------------------------------------------------------------------
# 6. GRAMMAR (33 total — 11 existing, 22 new)
# ---------------------------------------------------------------------------
def import_grammar():
    print("\n=== 6. GRAMMAR ===")
    data = load_json("lingullio_hsk3_grammar.json.txt")
    
    existing = api_get_all("grammar_points", f"?level=eq.{LEVEL}&select=id,pattern")
    existing_by_pattern = {g['pattern']: g['id'] for g in existing}
    print(f"  Found {len(existing_by_pattern)} existing grammar points")
    
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
            res = api("post", "grammar_points", row)
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
# 7. EXERCISES (217 total — 80 existing, ~137 new) + OPTIONS
# ---------------------------------------------------------------------------
def import_exercises():
    print("\n=== 7. EXERCISES ===")
    data = load_json("lingullio_hsk3_exercises.json.txt")
    
    created = 0
    skipped = 0
    options_created = 0
    
    for idx, item in enumerate(data):
        temp_id = item['_temp_id']
        lesson_ref = item['_lesson_ref']
        lesson_id = MAP.get(lesson_ref)
        if not lesson_id:
            print(f"  !! Lesson {lesson_ref} not mapped for exercise {temp_id}")
            skipped += 1
            continue
        
        sort_order = item.get('sort_order', idx + 1)
        
        # Check existing by lesson_id + sort_order
        ex_check = api("get", "exercises", 
            params=f"?lesson_id=eq.{lesson_id}&sort_order=eq.{sort_order}&select=id")
        
        if ex_check and len(ex_check) > 0:
            MAP[temp_id] = ex_check[0]['id']
        else:
            eid = gen_uuid()
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
            res = api("post", "exercises", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or eid
            if rid:
                created += 1
        
        exercise_id = MAP.get(temp_id)
        if not exercise_id:
            continue
        
        # Exercise translations
        for locale, tr in item.get('translations', {}).items():
            upsert("exercise_translations", {
                "exercise_id": exercise_id,
                "locale": locale,
                "prompt": tr.get('prompt', ''),
                "instruction": tr.get('instruction'),
                "explanation": tr.get('explanation'),
                "hint": tr.get('hint'),
            }, on_conflict="exercise_id,locale")
        
        # Options
        for opt in item.get('options', []):
            opt_sort = opt.get('sort_order', 0)
            
            # Check existing option
            opt_check = api("get", "exercise_options",
                params=f"?exercise_id=eq.{exercise_id}&sort_order=eq.{opt_sort}&select=id")
            
            if opt_check and len(opt_check) > 0:
                opt_id = opt_check[0]['id']
            else:
                opt_id = gen_uuid()
                opt_row = {
                    "id": opt_id,
                    "exercise_id": exercise_id,
                    "sort_order": opt_sort,
                    "is_correct": opt.get('is_correct', False),
                }
                res = api("post", "exercise_options", opt_row)
                rid = extract_id(res)
                if rid:
                    opt_id = rid
                    options_created += 1
            
            # Option translations
            for locale, otr in opt.get('translations', {}).items():
                upsert("exercise_option_translations", {
                    "option_id": opt_id,
                    "locale": locale,
                    "content": otr.get('content', ''),
                    "error_explanation": otr.get('error_explanation'),
                }, on_conflict="option_id,locale")
        
        # Progress indicator
        if (idx + 1) % 25 == 0:
            print(f"  ... processed {idx+1}/{len(data)} exercises")
    
    STATS['exercises'] = f"{created} created, {skipped} skipped, {options_created} options created"
    print(f"  {STATS['exercises']}")

# ---------------------------------------------------------------------------
# 8. MOCK EXAMS (2 total — 1 existing, 1 new)
# Mock exam questions reference exercises via exercise_id.
# For the new HSK3 data, we create standalone exercises for each question,
# then link them as mock_exam_questions.
# ---------------------------------------------------------------------------
def import_mock_exams():
    print("\n=== 8. MOCK EXAMS ===")
    data = load_json("lingullio_hsk3_mock_exams.json.txt")
    
    existing = api_get_all("mock_exams", f"?course_id=eq.{COURSE_ID}&select=id,sort_order")
    existing_by_sort = {e['sort_order']: e['id'] for e in existing}
    print(f"  Found {len(existing_by_sort)} existing mock exams")
    
    exams_created = 0
    sections_created = 0
    questions_created = 0
    exercises_for_mock = 0
    
    for exam_idx, exam in enumerate(data.get('exams', [])):
        temp_id = exam['_temp_id']
        sort_order = exam_idx + 1
        
        if sort_order in existing_by_sort:
            MAP[temp_id] = existing_by_sort[sort_order]
            print(f"  Exam sort={sort_order} already exists: {MAP[temp_id]}")
        else:
            eid = gen_uuid()
            row = {
                "id": eid,
                "course_id": COURSE_ID,
                "sort_order": sort_order,
                "total_duration_minutes": exam.get('duration_minutes', 85),
                "total_points": exam.get('total_points', 100),
                "status": "published",
            }
            res = api("post", "mock_exams", row)
            rid = extract_id(res)
            MAP[temp_id] = rid or eid
            if rid:
                exams_created += 1
        
        exam_id = MAP.get(temp_id)
        if not exam_id:
            continue
        
        # Exam translations
        upsert("mock_exam_translations", {
            "mock_exam_id": exam_id,
            "locale": "en",
            "title": exam.get('title', f'HSK3 Mock Exam {sort_order}'),
            "description": None,
        }, on_conflict="mock_exam_id,locale")
        
        upsert("mock_exam_translations", {
            "mock_exam_id": exam_id,
            "locale": "fr",
            "title": exam.get('title', '').replace('Mock Exam', 'Examen Blanc') or f'Examen Blanc HSK3 {sort_order}',
            "description": None,
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
            # Check existing section
            sec_check = api("get", "mock_exam_sections",
                params=f"?mock_exam_id=eq.{exam_id}&sort_order=eq.{sec_idx}&select=id")
            
            if sec_check and len(sec_check) > 0:
                section_id = sec_check[0]['id']
            else:
                section_id = gen_uuid()
                sec_row = {
                    "id": section_id,
                    "mock_exam_id": exam_id,
                    "section_type": sec_name,
                    "sort_order": sec_idx,
                    "total_points": round(sum(i.get('points', 1.43) for i in items), 2),
                    "duration_minutes": section_duration,
                }
                res = api("post", "mock_exam_sections", sec_row)
                rid = extract_id(res)
                if rid:
                    section_id = rid
                    sections_created += 1
            
            # Questions — each needs an exercise_id
            for q_item in items:
                q_sort = q_item['sort_order']
                
                # Check if question already exists
                q_check = api("get", "mock_exam_questions",
                    params=f"?section_id=eq.{section_id}&sort_order=eq.{q_sort}&select=id")
                
                if q_check and len(q_check) > 0:
                    continue  # Already exists
                
                # Create a standalone exercise for this mock exam question
                ex_id = gen_uuid()
                ex_type = q_item.get('item_type', 'mcq')
                # Map mock exam item_type to valid exercise_type
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
                res = api("post", "exercises", ex_row)
                rid = extract_id(res)
                actual_ex_id = rid or ex_id
                if rid:
                    exercises_for_mock += 1
                
                # Exercise translation with the prompt
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
                        "prompt": prompt_zh,  # Chinese prompt stored as-is
                        "instruction": f"Mock exam {sec_name} question",
                    }, on_conflict="exercise_id,locale")
                
                # Create mock_exam_question linking section to exercise
                qid = gen_uuid()
                q_row = {
                    "id": qid,
                    "section_id": section_id,
                    "exercise_id": actual_ex_id,
                    "sort_order": q_sort,
                    "points": round(q_item.get('points', 1.43), 2),
                }
                api("post", "mock_exam_questions", q_row)
                questions_created += 1
        
        print(f"  Exam {sort_order}: {len(sections_map)} sections, questions created: {questions_created}")
    
    STATS['mock_exams'] = f"{exams_created} exams, {sections_created} sections, {questions_created} questions, {exercises_for_mock} exercises"
    print(f"  {STATS['mock_exams']}")

# ---------------------------------------------------------------------------
# 9. JUNCTION LINKS (lesson_vocabulary_items, lesson_grammar_points, lesson_characters)
# ---------------------------------------------------------------------------
def link_lesson_content():
    print("\n=== 9. LESSON LINKS ===")
    data = load_json("lingullio_hsk3_lessons.json.txt")
    
    vocab_links = 0
    grammar_links = 0
    char_links = 0
    vocab_missing = 0
    grammar_missing = 0
    char_missing = 0
    
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
                vocab_missing += 1
        
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
                grammar_missing += 1
        
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
                char_missing += 1
        
        if (les_idx + 1) % 20 == 0:
            print(f"  ... processed {les_idx+1}/{len(data)} lessons for links")
    
    STATS['links'] = (
        f"vocab={vocab_links} (missing={vocab_missing}), "
        f"grammar={grammar_links} (missing={grammar_missing}), "
        f"chars={char_links} (missing={char_missing})"
    )
    print(f"  {STATS['links']}")

# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("LINGULLIO HSK3 IMPORT v2")
    print("=" * 60)
    print(f"Course: {COURSE_ID}")
    print(f"Level: {LEVEL}")
    print(f"Data dir: {DATA_DIR}")
    
    t0 = time.time()
    
    import_modules()
    import_lessons()
    import_lesson_content()
    import_vocabulary()
    import_characters()
    import_grammar()
    import_exercises()
    import_mock_exams()
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
        print(f"\n⚠️  {len(ERRORS)} errors encountered:")
        for e in ERRORS[:20]:
            print(f"  - {e}")
        if len(ERRORS) > 20:
            print(f"  ... and {len(ERRORS) - 20} more")
    else:
        print("\n✅ No errors!")

if __name__ == "__main__":
    main()
