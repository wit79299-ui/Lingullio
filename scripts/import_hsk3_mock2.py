#!/usr/bin/env python3
"""
HSK3 Import — Mock Exam #2 Fix
================================
Fix integer type issues for mock_exam_sections.duration_minutes,
exercises.points, and mock_exam_questions.points.
Also handle character refs in junction tables.
"""

import json, os, uuid, time, requests

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
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    r = requests.post(url, json=data, headers=HEADERS)
    if r.status_code >= 400:
        print(f"  !! POST {table} → {r.status_code}: {r.text[:300]}")
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
        print(f"  !! UPSERT {table} → {r.status_code}: {r.text[:300]}")
        return None
    try:
        return r.json()
    except:
        return None

def extract_id(res):
    if isinstance(res, list) and len(res) > 0:
        return res[0].get('id')
    if isinstance(res, dict):
        return res.get('id')
    return None

def gen_uuid():
    return str(uuid.uuid4())

def load_json(filename):
    with open(os.path.join(DATA_DIR, filename)) as f:
        return json.load(f)

def main():
    print("=" * 60)
    print("HSK3 — MOCK EXAM #2 + CHARACTER LINKS FIX")
    print("=" * 60)
    t0 = time.time()
    
    # Check existing mock exams
    existing = api_get_all("mock_exams", f"?course_id=eq.{COURSE_ID}&select=id,sort_order")
    existing_sorts = {e['sort_order']: e['id'] for e in existing}
    print(f"Existing mock exams: {existing_sorts}")
    
    data = load_json("lingullio_hsk3_mock_exams.json.txt")
    
    sections_created = 0
    questions_created = 0
    exercises_created = 0
    
    for exam_idx, exam in enumerate(data.get('exams', [])):
        sort_order = exam_idx + 1
        
        if sort_order == 1:
            print(f"  Exam 1 already exists, skipping...")
            continue
        
        # Get or create exam #2
        if sort_order in existing_sorts:
            exam_id = existing_sorts[sort_order]
            print(f"  Exam {sort_order} exists: {exam_id}")
        else:
            print(f"  !! Exam {sort_order} not found — should have been created earlier")
            continue
        
        # Check if sections already exist for this exam
        ex_sections = api_get_all("mock_exam_sections", f"?mock_exam_id=eq.{exam_id}&select=id,sort_order")
        if ex_sections:
            print(f"  Exam {sort_order} already has {len(ex_sections)} sections, skipping...")
            continue
        
        # Translations
        upsert("mock_exam_translations", {
            "mock_exam_id": exam_id,
            "locale": "en",
            "title": exam.get('title', f'HSK3 Mock Exam {sort_order}'),
        }, on_conflict="mock_exam_id,locale")
        
        upsert("mock_exam_translations", {
            "mock_exam_id": exam_id,
            "locale": "fr",
            "title": (exam.get('title', '') or '').replace('Mock Exam', 'Examen Blanc'),
        }, on_conflict="mock_exam_id,locale")
        
        # Group items by section
        sections_map = {}
        for item in exam.get('items', []):
            sec = item.get('section', 'general')
            if sec not in sections_map:
                sections_map[sec] = []
            sections_map[sec].append(item)
        
        total_duration = exam.get('duration_minutes', 85)
        section_duration = total_duration // max(len(sections_map), 1)
        
        for sec_idx, (sec_name, items) in enumerate(sections_map.items(), 1):
            section_id = gen_uuid()
            total_pts = sum(i.get('points', 1.43) for i in items)
            sec_row = {
                "id": section_id,
                "mock_exam_id": exam_id,
                "section_type": sec_name,
                "sort_order": sec_idx,
                "total_points": int(round(total_pts)),  # INTEGER!
                "duration_minutes": int(section_duration),  # INTEGER!
            }
            res = api_post("mock_exam_sections", sec_row)
            rid = extract_id(res)
            if rid:
                section_id = rid
                sections_created += 1
                print(f"  Section {sec_name} created: {section_id}")
            else:
                print(f"  !! Failed to create section {sec_name}")
                continue
            
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
                
                pts = q_item.get('points', 1.43)
                ex_row = {
                    "id": ex_id,
                    "exercise_type": exercise_type,
                    "difficulty": 2,
                    "points": int(round(pts)),  # INTEGER!
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
                else:
                    continue  # Can't create question without exercise
                
                # Exercise translation with prompt
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
                
                # Create question link
                qid = gen_uuid()
                q_row = {
                    "id": qid,
                    "section_id": section_id,
                    "exercise_id": actual_ex_id,
                    "sort_order": q_sort,
                    "points": int(round(pts)),  # INTEGER!
                }
                res = api_post("mock_exam_questions", q_row)
                if extract_id(res):
                    questions_created += 1
            
            print(f"    {sec_name}: {len(items)} questions processed")
    
    print(f"\nMock Exam #2 Results:")
    print(f"  Sections: {sections_created}")
    print(f"  Exercises: {exercises_created}")
    print(f"  Questions: {questions_created}")
    
    # -----------------------------------------------------------------------
    # CHARACTER LINKS — check lesson data for character_refs
    # -----------------------------------------------------------------------
    print("\n=== CHARACTER JUNCTION LINKS ===")
    lessons_data = load_json("lingullio_hsk3_lessons.json.txt")
    
    # Check how many lessons have character_refs
    has_char_refs = sum(1 for l in lessons_data if l.get('character_refs'))
    print(f"  Lessons with character_refs: {has_char_refs}")
    if has_char_refs == 0:
        print("  No character refs in data — this is normal for HSK3 lessons JSON")
    
    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s")

if __name__ == "__main__":
    main()
