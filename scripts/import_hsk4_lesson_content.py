#!/usr/bin/env python3
"""
HSK4 Lesson Content Import — PATCH content_html into lesson_translations.

Source: lingullio_hsk4_lesson_content.json.txt
  167 entries, each with _lesson_ref (les_h4_XX_YY) and translations.en.content_html

Target: Supabase lesson_translations table
  PATCH content_html WHERE lesson_id = <resolved> AND locale = 'en'

Mapping: _lesson_ref les_h4_XX_YY → modules.sort_order=XX + lessons.sort_order=YY → lesson_id
"""

import json
import urllib.request
import urllib.error
import sys
import time

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co/rest/v1"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
H = {"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
HSK4_COURSE = "a0000000-0000-0000-0000-000000000004"

SOURCE_FILE = "/home/user/uploaded_files/lingullio_hsk4_lesson_content.json.txt"


def api_get(endpoint):
    req = urllib.request.Request(f"{SUPABASE_URL}/{endpoint}", headers=H)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  GET ERROR {e.code}: {e.read().decode()[:200]}")
        return []


def api_patch(endpoint, data):
    h = dict(H)
    h["Content-Type"] = "application/json"
    h["Prefer"] = "return=minimal"
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}/{endpoint}", data=body, headers=h, method="PATCH"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return True
    except urllib.error.HTTPError as e:
        print(f"  PATCH ERROR {e.code}: {e.read().decode()[:200]}")
        return False


# ─── STEP 1: Build DB map (module_sort, lesson_sort) → lesson_id ───
print("Step 1: Building DB map...")
modules = api_get(
    f"modules?course_id=eq.{HSK4_COURSE}&select=id,sort_order&order=sort_order"
)
print(f"  HSK4 modules: {len(modules)}")

db_map = {}  # (chapter, lesson) → lesson_id
for m in modules:
    lessons = api_get(
        f"lessons?module_id=eq.{m['id']}&select=id,sort_order&order=sort_order"
    )
    for l in lessons:
        db_map[(m["sort_order"], l["sort_order"])] = l["id"]

print(f"  Total lesson entries in DB map: {len(db_map)}")

# ─── STEP 2: Load source JSON ───
print("\nStep 2: Loading source JSON...")
with open(SOURCE_FILE) as f:
    source_data = json.load(f)
print(f"  Entries: {len(source_data)}")

# ─── STEP 3: Map and validate ───
print("\nStep 3: Mapping lesson refs to DB IDs...")
mapping = []  # list of (ref, lesson_id, content_html)
errors = []

for entry in source_data:
    ref = entry["_lesson_ref"]
    parts = ref.split("_")
    chapter = int(parts[2])
    lesson = int(parts[3])

    lesson_id = db_map.get((chapter, lesson))
    if not lesson_id:
        errors.append(f"  {ref}: No DB lesson for chapter={chapter} lesson={lesson}")
        continue

    content_html = entry.get("translations", {}).get("en", {}).get("content_html", "")
    if not content_html:
        errors.append(f"  {ref}: Empty content_html in source")
        continue

    mapping.append((ref, lesson_id, content_html))

print(f"  Valid mappings: {len(mapping)}")
if errors:
    print(f"  Errors: {len(errors)}")
    for e in errors[:10]:
        print(e)

# ─── STEP 4: PATCH content_html ───
print(f"\nStep 4: PATCHing {len(mapping)} lesson_translations...")
success = 0
fail = 0

for i, (ref, lesson_id, content_html) in enumerate(mapping):
    ok = api_patch(
        f"lesson_translations?lesson_id=eq.{lesson_id}&locale=eq.en",
        {"content_html": content_html},
    )
    if ok:
        success += 1
        if (i + 1) % 20 == 0 or i == 0:
            print(f"  [{i+1}/{len(mapping)}] ✅ {ref} ({len(content_html)} chars)")
    else:
        fail += 1
        print(f"  [{i+1}/{len(mapping)}] ❌ {ref} FAILED")

    # Small delay every 50 requests to avoid rate limits
    if (i + 1) % 50 == 0:
        time.sleep(0.5)

# ─── SUMMARY ───
print(f"\n{'='*60}")
print(f"IMPORT COMPLETE")
print(f"{'='*60}")
print(f"  Total source entries: {len(source_data)}")
print(f"  Valid mappings: {len(mapping)}")
print(f"  ✅ Success: {success}")
print(f"  ❌ Failed: {fail}")
print(f"  ⚠️  Skipped: {len(errors)}")

if fail == 0 and len(errors) == 0:
    print(f"\n  🎉 ALL {success} lessons updated successfully!")
elif fail == 0:
    print(f"\n  ✅ All valid mappings updated, {len(errors)} entries skipped")
else:
    print(f"\n  ⚠️  {fail} failures — check logs above")
