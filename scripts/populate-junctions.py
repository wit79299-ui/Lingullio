#!/usr/bin/env python3
"""
Populate junction tables: lesson_vocabulary_items, lesson_grammar_points, lesson_characters.

Strategy:
- HSK1 lessons: use lesson sort_order and module type to determine which vocab/grammar to link
- HSK2-4 lessons: modules were created with ranges, use them to link vocab/grammar/characters
"""

import json, re, urllib.request, urllib.error, uuid

URL = 'https://gmpjkoajhhwvxwsdohll.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc'
HEADERS = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}

def api_get(path):
    req = urllib.request.Request(f'{URL}/rest/v1/{path}', headers=HEADERS)
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())

def api_get_all(path):
    """Get all records (handles pagination)."""
    results = []
    offset = 0
    while True:
        data = api_get(f'{path}&offset={offset}&limit=1000')
        if not data:
            break
        results.extend(data)
        offset += 1000
    return results

def api_post(table, data, extra_headers=None):
    h = {**HEADERS}
    if extra_headers: h.update(extra_headers)
    body = json.dumps(data).encode()
    req = urllib.request.Request(f'{URL}/rest/v1/{table}', data=body, headers=h, method='POST')
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def api_upsert(table, data, conflict_cols):
    return api_post(f'{table}?on_conflict={conflict_cols}', data, {'Prefer': 'resolution=merge-duplicates'})

def batch_upsert(table, data, conflict_cols, batch_size=50):
    ok, err = 0, 0
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        code, body = api_upsert(table, batch, conflict_cols)
        if code in (200, 201):
            ok += len(batch)
        else:
            msg = body.decode()[:300] if isinstance(body, bytes) else str(body)[:300]
            print(f"    ERR {table} [{i}]: {code} - {msg}")
            err += len(batch)
    return ok, err

def gen_uuid():
    return str(uuid.uuid4())

# ═══════════════════════════════════════════
# Load all data from DB
# ═══════════════════════════════════════════
print("Loading data from DB...")

# Get modules with their course info
modules = api_get_all('modules?select=id,course_id,sort_order&order=course_id,sort_order')
print(f"  Modules: {len(modules)}")

# Get lessons with their module info
lessons = api_get_all('lessons?select=id,module_id,sort_order,lesson_type&order=module_id,sort_order')
print(f"  Lessons: {len(lessons)}")

# Get vocabulary items grouped by hsk_level
vocab = api_get_all('vocabulary_items?select=id,simplified,hsk_level,frequency_rank&order=hsk_level,frequency_rank')
print(f"  Vocabulary: {len(vocab)}")

# Get grammar points grouped by hsk_level
grammar = api_get_all('grammar_points?select=id,pattern,hsk_level,sort_order&order=hsk_level,sort_order')
print(f"  Grammar: {len(grammar)}")

# Get characters
characters = api_get_all('characters?select=id,character,hsk_level&order=id')
print(f"  Characters: {len(characters)}")

# Build lookup maps
vocab_by_level = {}
for v in vocab:
    lev = v['hsk_level']
    if lev not in vocab_by_level:
        vocab_by_level[lev] = []
    vocab_by_level[lev].append(v)

grammar_by_level = {}
for g in grammar:
    lev = g['hsk_level']
    if lev not in grammar_by_level:
        grammar_by_level[lev] = []
    grammar_by_level[lev].append(g)

# Build char lookup: character string → id
char_by_string = {c['character']: c['id'] for c in characters}

# Course ID → level mapping
course_to_level = {f"a0000000-0000-0000-0000-{i:012d}": str(i) for i in range(1, 10)}

# Module → course level
module_level = {}
for m in modules:
    level = course_to_level.get(m['course_id'], '?')
    module_level[m['id']] = level

# Group modules by course
modules_by_course = {}
for m in modules:
    cid = m['course_id']
    if cid not in modules_by_course:
        modules_by_course[cid] = []
    modules_by_course[cid].append(m)

# Group lessons by module
lessons_by_module = {}
for l in lessons:
    mid = l['module_id']
    if mid not in lessons_by_module:
        lessons_by_module[mid] = []
    lessons_by_module[mid].append(l)

# ═══════════════════════════════════════════
# HSK1 junction mapping
# ═══════════════════════════════════════════
print("\n=== HSK1 Junction Mapping ===")
hsk1_course_id = "a0000000-0000-0000-0000-000000000001"
hsk1_modules = sorted(modules_by_course.get(hsk1_course_id, []), key=lambda m: m['sort_order'])
hsk1_vocab = vocab_by_level.get('1', [])
hsk1_grammar = grammar_by_level.get('1', [])

print(f"  HSK1 modules: {len(hsk1_modules)}")
print(f"  HSK1 vocab: {len(hsk1_vocab)}")
print(f"  HSK1 grammar: {len(hsk1_grammar)}")

junction_vocab = []
junction_grammar = []
junction_chars = []

# For HSK1: Modules 1-6 are vocab (50 words each), module 7+ grammar, rest review/exam
# Based on structure from JSON: 10 modules with various lesson types
vocab_idx = 0
grammar_idx = 0

for mod in hsk1_modules:
    mod_lessons = sorted(lessons_by_module.get(mod['id'], []), key=lambda l: l['sort_order'])
    
    for lesson in mod_lessons:
        lid = lesson['id']
        lt = lesson['lesson_type']
        
        if lt in ('exam', 'review', 'quiz'):
            continue
        
        # For standard lessons, assign ~6 vocab items per lesson
        # HSK1 has 319 vocab and 51 lessons, so ~6 per lesson
        if vocab_idx < len(hsk1_vocab):
            batch_end = min(vocab_idx + 6, len(hsk1_vocab))
            for vi in range(vocab_idx, batch_end):
                v = hsk1_vocab[vi]
                junction_vocab.append({
                    'id': gen_uuid(),
                    'lesson_id': lid,
                    'vocabulary_item_id': v['id'],
                    'sort_order': vi - vocab_idx + 1,
                })
                
                # Also add characters from this word
                for char in v['simplified']:
                    if char in char_by_string:
                        junction_chars.append({
                            'id': gen_uuid(),
                            'lesson_id': lid,
                            'character_id': char_by_string[char],
                            'sort_order': len(junction_chars) % 100 + 1,
                        })
            
            vocab_idx = batch_end
        
        # Assign grammar points (~1 per 1.5 lessons)
        if grammar_idx < len(hsk1_grammar) and lesson['sort_order'] % 2 == 0:
            g = hsk1_grammar[grammar_idx]
            junction_grammar.append({
                'id': gen_uuid(),
                'lesson_id': lid,
                'grammar_point_id': g['id'],
                'sort_order': 1,
            })
            grammar_idx += 1

print(f"  HSK1 junction_vocab: {len(junction_vocab)}")
print(f"  HSK1 junction_grammar: {len(junction_grammar)}")
print(f"  HSK1 junction_chars: {len(junction_chars)}")

# ═══════════════════════════════════════════
# HSK2-4 junction mapping
# ═══════════════════════════════════════════
for level in [2, 3, 4]:
    print(f"\n=== HSK{level} Junction Mapping ===")
    course_id = f"a0000000-0000-0000-0000-{level:012d}"
    level_modules = sorted(modules_by_course.get(course_id, []), key=lambda m: m['sort_order'])
    level_vocab = vocab_by_level.get(str(level), [])
    level_grammar = grammar_by_level.get(str(level), [])
    
    vocab_idx = 0
    grammar_idx = 0
    
    for mod in level_modules:
        mod_lessons = sorted(lessons_by_module.get(mod['id'], []), key=lambda l: l['sort_order'])
        
        for lesson in mod_lessons:
            lid = lesson['id']
            lt = lesson['lesson_type']
            
            if lt == 'exam':
                continue
            
            # Check if this is a vocab or grammar lesson based on module
            # We need to determine module type - vocab modules come first, then grammar
            # For HSK2: modules 1-4 are vocab (50 each), module 5 grammar, module 6 exam
            # For HSK3: modules 1-5 are vocab (100 each), module 6 grammar, module 7 exam
            # For HSK4: vocab modules first, then grammar, then exam
            
            # Assign vocab (10 per lesson for vocab modules)
            if vocab_idx < len(level_vocab):
                batch_end = min(vocab_idx + 10, len(level_vocab))
                for vi in range(vocab_idx, batch_end):
                    v = level_vocab[vi]
                    junction_vocab.append({
                        'id': gen_uuid(),
                        'lesson_id': lid,
                        'vocabulary_item_id': v['id'],
                        'sort_order': vi - vocab_idx + 1,
                    })
                    
                    # Characters
                    for char in v['simplified']:
                        if char in char_by_string:
                            junction_chars.append({
                                'id': gen_uuid(),
                                'lesson_id': lid,
                                'character_id': char_by_string[char],
                                'sort_order': len(junction_chars) % 100 + 1,
                            })
                
                vocab_idx = batch_end
                continue  # Don't also assign grammar to vocab lessons
            
            # Grammar lessons (after all vocab is assigned)
            if grammar_idx < len(level_grammar):
                g = level_grammar[grammar_idx]
                junction_grammar.append({
                    'id': gen_uuid(),
                    'lesson_id': lid,
                    'grammar_point_id': g['id'],
                    'sort_order': 1,
                })
                grammar_idx += 1
    
    lv = len([j for j in junction_vocab if True])  # just count
    print(f"  HSK{level} vocab mapped: {vocab_idx}/{len(level_vocab)}")
    print(f"  HSK{level} grammar mapped: {grammar_idx}/{len(level_grammar)}")

# ═══════════════════════════════════════════
# Deduplicate junction_chars (same lesson+character may appear multiple times)
# ═══════════════════════════════════════════
seen_char_junctions = set()
deduped_chars = []
for jc in junction_chars:
    key = (jc['lesson_id'], jc['character_id'])
    if key not in seen_char_junctions:
        seen_char_junctions.add(key)
        deduped_chars.append(jc)
junction_chars = deduped_chars

print(f"\n=== Totals ===")
print(f"  junction_vocab: {len(junction_vocab)}")
print(f"  junction_grammar: {len(junction_grammar)}")
print(f"  junction_chars (deduped): {len(junction_chars)}")

# ═══════════════════════════════════════════
# Insert all junctions
# ═══════════════════════════════════════════
print("\n=== Inserting junctions ===")

ok, err = batch_upsert('lesson_vocabulary_items', junction_vocab, 'lesson_id,vocabulary_item_id')
print(f"  lesson_vocabulary_items: {ok} ok, {err} err")

ok, err = batch_upsert('lesson_grammar_points', junction_grammar, 'lesson_id,grammar_point_id')
print(f"  lesson_grammar_points: {ok} ok, {err} err")

ok, err = batch_upsert('lesson_characters', junction_chars, 'lesson_id,character_id')
print(f"  lesson_characters: {ok} ok, {err} err")

# Verify
print("\n=== Verification ===")
for table in ['lesson_vocabulary_items', 'lesson_grammar_points', 'lesson_characters']:
    req = urllib.request.Request(
        f'{URL}/rest/v1/{table}?select=id&limit=1',
        headers={**HEADERS, 'Prefer': 'count=exact', 'Range': '0-0'}
    )
    resp = urllib.request.urlopen(req)
    cr = resp.headers.get('Content-Range', '?')
    print(f"  {table}: {cr}")

print("\nDone!")
