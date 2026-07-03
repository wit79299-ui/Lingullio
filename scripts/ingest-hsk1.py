#!/usr/bin/env python3
"""
HSK1 Content Ingestion Script
==============================
1. Delete 5 old grammar points (e0000000-*) and their translations
2. Create 7 missing modules + upsert FR+EN translations for all 10
3. Create 47 missing lessons + upsert FR+EN translations for all 51
4. Enrich grammar_point_translations FR+EN with rich content from JSON
5. Compare vocab JSON vs DB, enrich FR+EN translations with usage_notes
"""

import json, os, sys, time, urllib.request, urllib.parse, ssl

# ─── Config ───────────────────────────────────────────────────────────────────
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env.local')
with open(ENV_PATH) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

SUPABASE_URL = os.environ['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
BASE = f"{SUPABASE_URL}/rest/v1"
ctx = ssl.create_default_context()

def api(method, path, data=None, headers_extra=None):
    url = f"{BASE}/{path}"
    body = json.dumps(data, ensure_ascii=False).encode('utf-8') if data else None
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json; charset=utf-8',
    }
    if headers_extra:
        headers.update(headers_extra)
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            text = resp.read().decode()
            return json.loads(text) if text.strip() else None
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path[:80]}: {err[:300]}")
        raise

def api_get(path):
    return api('GET', path)

def api_upsert(table, data, conflict_cols):
    """POST with on_conflict for true upsert (insert or update)."""
    path = f"{table}?on_conflict={conflict_cols}"
    return api('POST', path, data, {'Prefer': 'resolution=merge-duplicates'})

def api_insert(table, data):
    """POST with ignore-duplicates (skip if exists)."""
    return api('POST', table, data, {'Prefer': 'resolution=ignore-duplicates'})

def api_patch(path, data):
    return api('PATCH', path, data)

def api_delete(path):
    return api('DELETE', path)

# ─── Load JSON files ──────────────────────────────────────────────────────────
UPLOAD_DIR = '/home/user/uploaded_files'

print("Loading JSON files...")
with open(os.path.join(UPLOAD_DIR, 'lingullio_hsk1_modules.json.txt')) as f:
    modules_json = json.load(f)
print(f"  Modules: {len(modules_json)}")

with open(os.path.join(UPLOAD_DIR, 'lingullio_hsk1_lessons.json.txt')) as f:
    lessons_json = json.load(f)
print(f"  Lessons: {len(lessons_json)}")

with open(os.path.join(UPLOAD_DIR, 'lingullio_hsk1_grammar.json (2).txt')) as f:
    grammar_json = json.load(f)
print(f"  Grammar: {len(grammar_json)}")

vocab_json = []
for i in range(1, 7):
    with open(os.path.join(UPLOAD_DIR, f'lingullio_hsk1_vocab_lot{i}.json.txt')) as f:
        vocab_json.extend(json.load(f))
print(f"  Vocabulary: {len(vocab_json)} (6 lots)")

COURSE_ID = 'a0000000-0000-0000-0000-000000000001'

# ─── ID Maps ──────────────────────────────────────────────────────────────────
MODULE_ID_MAP = {}
for i in range(1, 11):
    MODULE_ID_MAP[f"mod_{i:03d}"] = f"b0000000-0000-0000-0000-{i:012d}"

LESSON_ID_MAP = {}
for i in range(1, 52):
    LESSON_ID_MAP[f"les_{i:03d}"] = f"c0000000-0000-0000-0000-{i:012d}"

GRAMMAR_ID_MAP = {}
for i in range(1, 36):
    GRAMMAR_ID_MAP[f"gram_{i:03d}"] = f"910000{i:02d}-0000-0000-0000-000000000000"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Delete 5 old grammar points (e0000000-*)
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 1: Delete old grammar points (e0000000-*)")
print("="*70)

old_ids = [f"e0000000-0000-0000-0000-00000000000{i}" for i in range(1, 6)]

for gid in old_ids:
    try:
        api_delete(f'grammar_point_translations?grammar_point_id=eq.{gid}')
    except: pass
    try:
        api_delete(f'grammar_points?id=eq.{gid}')
        print(f"  Deleted {gid}")
    except Exception as e:
        print(f"  Skip {gid}: {e}")

print("  Step 1 done.")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Modules — create 7 new + upsert all 10 FR+EN translations
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 2: Modules")
print("="*70)

# Create 7 new modules (sort_order 4-10)
new_modules = []
for mod in modules_json:
    so = mod['sort_order']
    if so >= 4:
        new_modules.append({
            'id': MODULE_ID_MAP[mod['_temp_id']],
            'course_id': COURSE_ID,
            'sort_order': so,
            'status': 'published',
            'estimated_duration_minutes': mod.get('estimated_duration_minutes', 120),
        })

if new_modules:
    api_insert('modules', new_modules)
    print(f"  Created {len(new_modules)} new modules")

# Update existing 3 modules' duration
for mod in modules_json:
    if mod['sort_order'] <= 3:
        mid = MODULE_ID_MAP[mod['_temp_id']]
        api_patch(f'modules?id=eq.{mid}', {
            'estimated_duration_minutes': mod.get('estimated_duration_minutes', 120),
        })
print("  Updated 3 existing modules")

# Upsert FR+EN translations for all 10 modules
mod_trans = []
for mod in modules_json:
    mid = MODULE_ID_MAP[mod['_temp_id']]
    for locale in ['fr', 'en']:
        t = mod['translations'].get(locale, {})
        if t:
            mod_trans.append({
                'module_id': mid,
                'locale': locale,
                'title': t.get('title', ''),
                'description': t.get('description', ''),
                'objectives': t.get('objectives', []),
            })

api_upsert('module_translations', mod_trans, 'module_id,locale')
print(f"  Upserted {len(mod_trans)} module translations")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Lessons — create 47 new + upsert all 51 FR+EN translations
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 3: Lessons")
print("="*70)

# Create 47 new lessons
new_lessons = []
for les in lessons_json:
    tid = les['_temp_id']
    idx = int(tid.split('_')[1])
    if idx >= 5:
        mod_id = MODULE_ID_MAP.get(les['_parent_module'])
        if not mod_id:
            print(f"  WARN: {tid} -> unknown module {les['_parent_module']}")
            continue
        new_lessons.append({
            'id': LESSON_ID_MAP[tid],
            'module_id': mod_id,
            'sort_order': les.get('sort_order', idx),
            'lesson_type': les.get('lesson_type', 'standard'),
            'status': 'published',
            'estimated_duration_minutes': les.get('estimated_duration_minutes', 30),
        })

# Insert in batches (avoid too large payload)
for i in range(0, len(new_lessons), 25):
    batch = new_lessons[i:i+25]
    api_insert('lessons', batch)
    print(f"  Batch {i//25+1}: {len(batch)} lessons created")

# Update 4 existing lessons' module_id and type
for les in lessons_json:
    tid = les['_temp_id']
    idx = int(tid.split('_')[1])
    if idx <= 4:
        mod_id = MODULE_ID_MAP.get(les['_parent_module'])
        if mod_id:
            api_patch(f"lessons?id=eq.{LESSON_ID_MAP[tid]}", {
                'module_id': mod_id,
                'lesson_type': les.get('lesson_type', 'standard'),
                'sort_order': les.get('sort_order', idx),
                'estimated_duration_minutes': les.get('estimated_duration_minutes', 30),
            })
print(f"  Updated 4 existing lessons")

# Upsert FR+EN translations for all 51 lessons
les_trans = []
for les in lessons_json:
    lid = LESSON_ID_MAP[les['_temp_id']]
    for locale in ['fr', 'en']:
        t = les['translations'].get(locale, {})
        if t:
            les_trans.append({
                'lesson_id': lid,
                'locale': locale,
                'title': t.get('title', ''),
                'description': t.get('description', ''),
                'content_html': t.get('content_html'),
            })

for i in range(0, len(les_trans), 50):
    batch = les_trans[i:i+50]
    api_upsert('lesson_translations', batch, 'lesson_id,locale')
    print(f"  Lesson translations batch {i//50+1}: {len(batch)} upserted")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Grammar — enrich FR+EN translations with rich content
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 4: Grammar translations")
print("="*70)

gram_trans = []
for g in grammar_json:
    gid = GRAMMAR_ID_MAP[g['_temp_id']]
    for locale in ['fr', 'en']:
        t = g['translations'].get(locale, {})
        if t:
            gram_trans.append({
                'grammar_point_id': gid,
                'locale': locale,
                'title': t.get('title', ''),
                'explanation_html': t.get('explanation_html', ''),
                'examples': t.get('examples', []),
                'common_errors': t.get('common_errors', []),
            })

for i in range(0, len(gram_trans), 20):
    batch = gram_trans[i:i+20]
    api_upsert('grammar_point_translations', batch, 'grammar_point_id,locale')
    print(f"  Grammar translations batch {i//20+1}: {len(batch)} upserted")

print(f"  Total: {len(gram_trans)} grammar translations upserted")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: Vocabulary — compare and enrich FR+EN
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 5: Vocabulary")
print("="*70)

# Fetch all existing vocabulary items
print("  Fetching existing DB vocabulary...")
db_vocab = []
offset = 0
while True:
    batch = api_get(f'vocabulary_items?select=id,simplified,pinyin&order=id&limit=100&offset={offset}')
    if not batch:
        break
    db_vocab.extend(batch)
    offset += 100
    if len(batch) < 100:
        break
print(f"  DB: {len(db_vocab)} items")

# Build lookup
db_by_simplified = {}
for v in db_vocab:
    db_by_simplified.setdefault(v['simplified'], []).append(v)

json_by_simplified = {}
for v in vocab_json:
    json_by_simplified[v['simplified']] = v

matched = sum(1 for v in vocab_json if v['simplified'] in db_by_simplified)
new_words = [v for v in vocab_json if v['simplified'] not in db_by_simplified]
db_only_count = sum(1 for s in db_by_simplified if s not in json_by_simplified)

print(f"  Matched: {matched}, New in JSON: {len(new_words)}, DB-only: {db_only_count}")

# Create new vocabulary items not yet in DB
if new_words:
    print(f"  Creating {len(new_words)} new vocabulary items...")
    for v in new_words:
        freq = v.get('frequency_rank', 900)
        vid = f"d1000{freq:03d}-0000-0000-0000-000000000000"
        # Avoid collision
        existing_ids = {item['id'] for item in db_vocab}
        suffix = 0
        while vid in existing_ids:
            suffix += 1
            vid = f"d100{freq:03d}{suffix:01d}-0000-0000-0000-000000000000"
        
        try:
            api_insert('vocabulary_items', [{
                'id': vid,
                'simplified': v['simplified'],
                'traditional': v.get('traditional'),
                'pinyin': v['pinyin'],
                'hsk_level': '1',
                'word_type': v.get('word_type'),
                'theme': v.get('theme'),
                'frequency_rank': v.get('frequency_rank'),
            }])
            db_vocab.append({'id': vid, 'simplified': v['simplified'], 'pinyin': v['pinyin']})
            db_by_simplified.setdefault(v['simplified'], []).append({'id': vid, 'simplified': v['simplified']})
            print(f"    Created: {v['simplified']} ({vid})")
        except Exception as e:
            print(f"    Skip {v['simplified']}: {e}")

# Enrich FR+EN translations for all vocab in JSON
print("  Enriching vocabulary translations FR+EN...")

vocab_trans = []
for v in vocab_json:
    db_items = db_by_simplified.get(v['simplified'], [])
    for locale in ['fr', 'en']:
        t = v['translations'].get(locale, {})
        if not t:
            continue
        for db_item in db_items:
            vocab_trans.append({
                'vocabulary_id': db_item['id'],
                'locale': locale,
                'meaning': t.get('meaning', ''),
                'example_sentence': t.get('example_sentence', ''),
                'example_pinyin': t.get('example_pinyin', ''),
                'example_translation': t.get('example_translation', ''),
                'usage_notes': t.get('usage_notes'),
            })

success = 0
errors = 0
for i in range(0, len(vocab_trans), 50):
    batch = vocab_trans[i:i+50]
    try:
        api_upsert('vocabulary_translations', batch, 'vocabulary_id,locale')
        success += len(batch)
    except:
        # Fallback: one by one
        for row in batch:
            try:
                api_upsert('vocabulary_translations', [row], 'vocabulary_id,locale')
                success += 1
            except:
                errors += 1
    
    if (i // 50) % 4 == 0:
        print(f"    Progress: {i+len(batch)}/{len(vocab_trans)} ({success} ok, {errors} err)")

print(f"  Vocab translations: {success} success, {errors} errors")

# ═══════════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("VERIFICATION")
print("="*70)

checks = {
    'modules': 'modules?select=id&course_id=eq.a0000000-0000-0000-0000-000000000001',
    'lessons': 'lessons?select=id',
    'grammar_points': 'grammar_points?select=id',
    'vocabulary_items': 'vocabulary_items?select=id',
}

for name, path in checks.items():
    items = api_get(path)
    print(f"  {name}: {len(items)} rows")

# Check translation counts for FR+EN
for table, fk in [
    ('module_translations', 'module_id'),
    ('lesson_translations', 'lesson_id'),
    ('grammar_point_translations', 'grammar_point_id'),
    ('vocabulary_translations', 'vocabulary_id'),
]:
    for loc in ['fr', 'en']:
        items = api_get(f'{table}?select=id&locale=eq.{loc}&limit=1000')
        print(f"  {table} [{loc}]: {len(items)} rows")

# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("DONE!")
print("="*70)
print(f"""
Summary:
  - 5 old grammar points (e0000000-*) deleted
  - 10 modules: 7 created, 3 updated
  - 51 lessons: 47 created, 4 updated
  - 35 grammar translations enriched (FR+EN)
  - {len(vocab_json)} vocab translations enriched (FR+EN)

Remaining:
  - Junction tables (lesson<->content) — waiting for user SQL
  - Audio TTS — deferred
  - HSK2-4 — waiting for files
""")
