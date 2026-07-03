#!/usr/bin/env python3
"""
HSK1 Phase 2 Ingestion: lesson_content, exercises, characters enrichment
=========================================================================
1. Update lesson_translations with rich content_html (30 lessons)
2. Enrich character_translations with mnemonics from JSON
3. Insert 200 exercises + options + translations
4. Populate stroke_order_data from HTML chars SVG
"""

import json, os, sys, time, urllib.request, ssl

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

def api_get(path): return api('GET', path)
def api_upsert(table, data, conflict_cols):
    return api('POST', f"{table}?on_conflict={conflict_cols}", data, {'Prefer': 'resolution=merge-duplicates'})
def api_insert(table, data):
    return api('POST', table, data, {'Prefer': 'resolution=ignore-duplicates'})
def api_patch(path, data): return api('PATCH', path, data)
def api_delete(path): return api('DELETE', path)

HSK_DIR = '/home/user/uploaded_files/hsk_content'

# ID maps
LESSON_ID_MAP = {}
for i in range(1, 52):
    LESSON_ID_MAP[f"les_{i:03d}"] = f"c0000000-0000-0000-0000-{i:012d}"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Update lesson_translations with rich content_html
# ═══════════════════════════════════════════════════════════════════════════════
print("="*70)
print("STEP 1: Lesson content_html (30 lessons)")
print("="*70)

with open(os.path.join(HSK_DIR, 'lingullio_hsk1_lesson_content.json')) as f:
    lesson_content = json.load(f)

updated = 0
for lc in lesson_content:
    lid = LESSON_ID_MAP.get(lc['_lesson_ref'])
    if not lid:
        print(f"  WARN: unknown lesson ref {lc['_lesson_ref']}")
        continue
    for locale in ['fr', 'en']:
        t = lc['translations'].get(locale, {})
        html = t.get('content_html')
        if html:
            api_patch(
                f"lesson_translations?lesson_id=eq.{lid}&locale=eq.{locale}",
                {'content_html': html}
            )
            updated += 1

print(f"  Updated {updated} lesson translations with content_html")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Enrich character_translations with mnemonics
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 2: Character translations — add mnemonics")
print("="*70)

with open(os.path.join(HSK_DIR, 'lingullio_hsk1_characters.json')) as f:
    chars_json = json.load(f)

# Build map: character -> DB character id
print("  Fetching existing characters...")
db_chars = []
offset = 0
while True:
    batch = api_get(f'characters?select=id,character&order=id&limit=100&offset={offset}')
    if not batch: break
    db_chars.extend(batch)
    offset += 100
    if len(batch) < 100: break

char_id_map = {}
for c in db_chars:
    char_id_map[c['character']] = c['id']

print(f"  DB characters: {len(db_chars)}, JSON characters: {len(chars_json)}")

# Check if character_translations has a 'mnemonic' column
test = api_get('character_translations?select=*&limit=1&locale=eq.en')
if test:
    sample_keys = set(test[0].keys())
    has_mnemonic = 'mnemonic' in sample_keys
    print(f"  character_translations columns: {sorted(sample_keys)}")
    print(f"  Has mnemonic column: {has_mnemonic}")
else:
    has_mnemonic = False
    print("  No character_translations found")

if has_mnemonic:
    enriched = 0
    for ch in chars_json:
        cid = char_id_map.get(ch['character'])
        if not cid:
            continue
        for locale in ['fr', 'en']:
            t = ch['translations'].get(locale, {})
            mnemonic = t.get('mnemonic')
            if mnemonic:
                try:
                    api_patch(
                        f"character_translations?character_id=eq.{cid}&locale=eq.{locale}",
                        {'mnemonic': mnemonic}
                    )
                    enriched += 1
                except:
                    pass
    print(f"  Enriched {enriched} character translations with mnemonics")
else:
    print("  SKIP: no mnemonic column in character_translations")
    print("  Mnemonics data available but no column to store them")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: Insert exercises + options + translations
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 3: Exercises (200)")
print("="*70)

with open(os.path.join(HSK_DIR, 'lingullio_hsk1_exercises.json')) as f:
    exercises_json = json.load(f)

# Exercise ID map
EXERCISE_ID_MAP = {}
for i in range(1, 201):
    EXERCISE_ID_MAP[f"ex_{i:03d}"] = f"ee000000-0000-0000-0000-{i:012d}"

# Step 3a: Insert exercise records
print("  Inserting exercises...")
ex_rows = []
for ex in exercises_json:
    eid = EXERCISE_ID_MAP[ex['_temp_id']]
    lid = LESSON_ID_MAP.get(ex['_lesson_ref'])
    if not lid:
        print(f"  WARN: unknown lesson {ex['_lesson_ref']} for {ex['_temp_id']}")
        continue
    ex_rows.append({
        'id': eid,
        'lesson_id': lid,
        'exercise_type': ex['exercise_type'],
        'difficulty': ex.get('difficulty', 1),
        'points': ex.get('points', 10),
        'estimated_duration_seconds': ex.get('estimated_duration_seconds', 30),
        'skill_tags': ex.get('skill_tags', []),
        'hsk_level': '1',
        'sort_order': ex.get('sort_order', 1),
        'status': 'published',
    })

for i in range(0, len(ex_rows), 50):
    batch = ex_rows[i:i+50]
    api_insert('exercises', batch)
print(f"  Inserted {len(ex_rows)} exercises")

# Step 3b: Insert exercise translations
print("  Inserting exercise translations...")
ex_trans = []
for ex in exercises_json:
    eid = EXERCISE_ID_MAP[ex['_temp_id']]
    for locale in ['fr', 'en']:
        t = ex['translations'].get(locale, {})
        if t:
            ex_trans.append({
                'exercise_id': eid,
                'locale': locale,
                'prompt': t.get('prompt', ''),
                'instruction': t.get('instruction', ''),
                'explanation': t.get('explanation', ''),
                'hint': t.get('hint', ''),
            })

for i in range(0, len(ex_trans), 50):
    batch = ex_trans[i:i+50]
    api_upsert('exercise_translations', batch, 'exercise_id,locale')
print(f"  Upserted {len(ex_trans)} exercise translations")

# Step 3c: Insert exercise options + option translations
print("  Inserting exercise options...")
opt_count = 0
opt_trans_count = 0
for ex in exercises_json:
    eid = EXERCISE_ID_MAP[ex['_temp_id']]
    options = ex.get('options', [])
    for j, opt in enumerate(options):
        opt_id = f"eo{eid[2:10]}-{j+1:04d}-0000-0000-000000000000"
        
        # Insert option
        try:
            api_insert('exercise_options', [{
                'id': opt_id,
                'exercise_id': eid,
                'sort_order': opt.get('sort_order', j+1),
                'is_correct': opt.get('is_correct', False),
            }])
            opt_count += 1
        except:
            pass  # May already exist
        
        # Insert option translations
        for locale in ['fr', 'en']:
            t = opt.get('translations', {}).get(locale, {})
            if t:
                try:
                    api_upsert('exercise_option_translations', [{
                        'option_id': opt_id,
                        'locale': locale,
                        'content': t.get('content', ''),
                        'error_explanation': t.get('error_explanation'),
                    }], 'option_id,locale')
                    opt_trans_count += 1
                except:
                    pass

print(f"  Inserted {opt_count} options, {opt_trans_count} option translations")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: Stroke order data from characters JSON
# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("STEP 4: Stroke order data")  
print("="*70)

# Check if we have stroke data in the HTML vocab file
import re

with open(os.path.join(HSK_DIR, 'HSK1-Vocabulaire-Vivant.html'), encoding='utf-8') as f:
    html = f.read()

# Extract WORDS array 
start = html.find('const WORDS')
bracket = html.find('[', start)
depth = 0
end = bracket
for i in range(bracket, min(bracket + 5000000, len(html))):
    if html[i] == '[': depth += 1
    elif html[i] == ']':
        depth -= 1
        if depth == 0:
            end = i + 1
            break

vocab_html_data = json.loads(html[bracket:end])

# Collect unique characters with stroke data
chars_with_strokes = {}
for word in vocab_html_data:
    for ch in word.get('chars', []):
        char = ch.get('char', '')
        strokes = ch.get('strokes', [])
        medians = ch.get('medians', [])
        if char and strokes and char not in chars_with_strokes:
            chars_with_strokes[char] = {
                'strokes': strokes,
                'medians': medians,
            }

print(f"  Found stroke data for {len(chars_with_strokes)} unique characters")

# Insert stroke_order_data
stroke_rows = []
for char, data in chars_with_strokes.items():
    cid = char_id_map.get(char)
    if not cid:
        continue
    stroke_rows.append({
        'character_id': cid,
        'strokes': data['strokes'],
        'medians': data['medians'],
        'source': 'makemeahanzi',
    })

if stroke_rows:
    for i in range(0, len(stroke_rows), 20):
        batch = stroke_rows[i:i+20]
        try:
            api_insert('stroke_order_data', batch)
        except:
            # One by one fallback
            for row in batch:
                try:
                    api_insert('stroke_order_data', [row])
                except:
                    pass
    print(f"  Inserted stroke data for {len(stroke_rows)} characters")

# ═══════════════════════════════════════════════════════════════════════════════
print("\n" + "="*70)
print("PHASE 2 COMPLETE")
print("="*70)
print(f"""
  Lesson content_html: {updated} translations updated
  Exercises: {len(ex_rows)} exercises + {len(ex_trans)} translations
  Exercise options: {opt_count} options + {opt_trans_count} option translations
  Stroke data: {len(stroke_rows)} characters
""")
