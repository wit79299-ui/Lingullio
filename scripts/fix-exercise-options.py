#!/usr/bin/env python3
"""Fix exercise options with valid UUIDs and insert them."""

import json, os, urllib.request, ssl

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
        print(f"  HTTP {e.code}: {err[:200]}")
        raise

def api_insert(table, data):
    return api('POST', table, data, {'Prefer': 'resolution=ignore-duplicates'})
def api_upsert(table, data, conflict_cols):
    return api('POST', f"{table}?on_conflict={conflict_cols}", data, {'Prefer': 'resolution=merge-duplicates'})

# Load exercises
with open('/home/user/uploaded_files/hsk_content/lingullio_hsk1_exercises.json') as f:
    exercises_json = json.load(f)

# Exercise ID map (must match phase2 script)
EXERCISE_ID_MAP = {}
for i in range(1, 201):
    EXERCISE_ID_MAP[f"ex_{i:03d}"] = f"ee000000-0000-0000-0000-{i:012d}"

# Insert options with VALID UUIDs
# Format: ee0000EE-OOOO-0000-0000-000000000000 where EE=exercise#, OOOO=option#
print("Inserting exercise options with valid UUIDs...")

opt_count = 0
opt_trans_count = 0
errors = 0

for ex in exercises_json:
    eid = EXERCISE_ID_MAP[ex['_temp_id']]
    ex_num = int(ex['_temp_id'].split('_')[1])  # 1-200
    options = ex.get('options', [])
    
    for j, opt in enumerate(options):
        # Valid UUID format: 8-4-4-4-12
        # eoXXXXXX-YYYY-0000-0000-000000000000
        opt_id = f"eo{ex_num:06x}-{j+1:04d}-0000-0000-000000000000"
        
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
            errors += 1
        
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
                    errors += 1
    
    if ex_num % 20 == 0:
        print(f"  Progress: exercise {ex_num}/200 ({opt_count} options, {opt_trans_count} translations, {errors} errors)")

print(f"\nDONE: {opt_count} options, {opt_trans_count} option translations, {errors} errors")
