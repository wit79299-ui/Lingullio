#!/usr/bin/env python3
"""
Fix exercise options insertion for HSK1 exercises.
Previous attempts failed due to invalid UUID format.

UUID scheme for exercises (already in DB, DECIMAL format):
  ee000000-0000-0000-0000-{exercise_num:012d}
  e.g. exercise 10 → ee000000-0000-0000-0000-000000000010

UUID scheme for options (DECIMAL to stay consistent):
  ef000000-{exercise_num:04d}-{option_num:04d}-0000-000000000000
  e.g. exercise 1, option 1 → ef000000-0001-0001-0000-000000000000
       exercise 200, option 4 → ef000000-0200-0004-0000-000000000000

UUID scheme for option translations:
  ef000000-{exercise_num:04d}-{option_num:04d}-{locale_idx:04d}-000000000000
  locale_idx: 0001=fr, 0002=en
"""

import json, urllib.request, urllib.error, sys

URL = 'https://gmpjkoajhhwvxwsdohll.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc'
HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
}

LOCALE_IDX = {'fr': 1, 'en': 2}

def api_post(table, data, extra_headers=None):
    """POST to Supabase REST API."""
    h = {**HEADERS}
    if extra_headers:
        h.update(extra_headers)
    body = json.dumps(data).encode()
    req = urllib.request.Request(f'{URL}/rest/v1/{table}', data=body, headers=h, method='POST')
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def api_upsert(table, data, conflict_cols):
    """Upsert with on_conflict."""
    return api_post(
        f'{table}?on_conflict={conflict_cols}',
        data,
        {'Prefer': 'resolution=merge-duplicates'}
    )


# Load exercises JSON
with open('/home/user/uploaded_files/hsk_content/lingullio_hsk1_exercises.json') as f:
    exercises = json.load(f)

print(f"Loaded {len(exercises)} exercises")

# Validate UUID format
test_ex_id = f"ee000000-0000-0000-0000-{10:012d}"
test_opt_id = f"ef000000-{10:04d}-{1:04d}-0000-000000000000"
test_trans_id = f"ef000000-{10:04d}-{1:04d}-{1:04d}-000000000000"
for label, uid in [('exercise', test_ex_id), ('option', test_opt_id), ('trans', test_trans_id)]:
    assert len(uid) == 36, f"{label} UUID length wrong: {len(uid)} - {uid}"
    parts = uid.split('-')
    assert [len(p) for p in parts] == [8, 4, 4, 4, 12], f"{label} UUID segments wrong: {[len(p) for p in parts]}"
    print(f"  {label} UUID OK: {uid}")

# Process in batches of 20 exercises
BATCH_SIZE = 20
total_opts = 0
total_trans = 0
total_errs = 0

for batch_start in range(0, len(exercises), BATCH_SIZE):
    batch = exercises[batch_start:batch_start + BATCH_SIZE]
    options_batch = []
    translations_batch = []

    for ex in batch:
        # Extract exercise number from _temp_id: "ex_001" → 1
        ex_num = int(ex['_temp_id'].replace('ex_', ''))
        exercise_id = f"ee000000-0000-0000-0000-{ex_num:012d}"

        for opt in ex.get('options', []):
            j = opt['sort_order']  # 1-based

            opt_id = f"ef000000-{ex_num:04d}-{j:04d}-0000-000000000000"

            options_batch.append({
                'id': opt_id,
                'exercise_id': exercise_id,
                'sort_order': j,
                'is_correct': opt['is_correct'],
            })

            for locale, trans in opt.get('translations', {}).items():
                if locale not in LOCALE_IDX:
                    continue
                li = LOCALE_IDX[locale]
                trans_id = f"ef000000-{ex_num:04d}-{j:04d}-{li:04d}-000000000000"

                translations_batch.append({
                    'id': trans_id,
                    'option_id': opt_id,
                    'locale': locale,
                    'content': trans.get('content', ''),
                    'error_explanation': trans.get('error_explanation'),
                })

    # Insert options batch
    if options_batch:
        code, body = api_upsert('exercise_options', options_batch, 'id')
        if code in (200, 201):
            total_opts += len(options_batch)
        else:
            err_msg = body.decode()[:200] if isinstance(body, bytes) else str(body)[:200]
            print(f"  ERROR options batch {batch_start}: {code} - {err_msg}")
            total_errs += len(options_batch)

    # Insert translations batch
    if translations_batch:
        code, body = api_upsert('exercise_option_translations', translations_batch, 'id')
        if code in (200, 201):
            total_trans += len(translations_batch)
        else:
            err_msg = body.decode()[:200] if isinstance(body, bytes) else str(body)[:200]
            print(f"  ERROR translations batch {batch_start}: {code} - {err_msg}")
            total_errs += len(translations_batch)

    done = min(batch_start + BATCH_SIZE, len(exercises))
    print(f"  Progress: {done}/{len(exercises)} — {total_opts} opts, {total_trans} trans, {total_errs} errs")

print(f"\nDONE: {total_opts} options, {total_trans} translations, {total_errs} errors")
