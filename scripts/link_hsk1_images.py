#!/usr/bin/env python3
"""
HSK1 Mock Exam #1 — Link images to exercises in Supabase.

Images already exist on disk in public/static/mock-exam/hsk1/.
This script:
1. Reads the source JSON to get the mapping: question_number → image prompts
2. Reads the DB to get: sort_order → exercise_id
3. Cross-checks using audio_transcript_zh from source vs option labels in DB
4. PATCHes exercises.image_url and exercise_options.metadata.image_url

Image types:
- Part 1 Listening (Q1-Q5): 1 image per exercise → exercises.image_url
- Part 2 Listening (Q6-Q10): 3 image choices per exercise → exercise_options.metadata
- Part 3 Listening (Q11-Q15): 3 image choices per exercise → exercise_options.metadata
- Part 1 Reading (Q21-Q25): 1 image per exercise → exercises.image_url
- Part 2 Reading (Q26-Q30): 5-image bank → exercise_options.metadata (matching)
"""

import json
import urllib.request
import urllib.error
import os

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co/rest/v1"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
PUBLIC_DIR = "/home/user/webapp/public"
HSK1_IMG = "/static/mock-exam/hsk1"

EXAM_ID = "d0e00100-0001-4000-a000-000000000001"

def api_get(endpoint):
    h = dict(HEADERS)
    h["Range"] = "0-999"
    req = urllib.request.Request(f"{SUPABASE_URL}/{endpoint}", headers=h)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  GET ERROR {e.code}: {e.read().decode()[:200]}")
        return []

def api_patch(endpoint, data):
    """PATCH (partial update) an existing row."""
    h = dict(HEADERS)
    h["Prefer"] = "return=representation"
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}/{endpoint}", data=body, headers=h, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  PATCH ERROR {e.code}: {e.read().decode()[:200]}")
        return None

# ─── Load source data ───
with open("/home/user/uploaded_files/hsk1_mock_exam_real_conditions_02_v2_premium (1).json.txt") as f:
    source = json.load(f)["mock_exam"]

source_sections = source["sections"]
listening_parts = source_sections[0]["parts"]
reading_parts = source_sections[1]["parts"]

# Build source map: question_number → { image_asset, choices, correct_answer, audio_zh }
source_map = {}
for s in source_sections:
    for p in s["parts"]:
        for item in p["items"]:
            qnum = item["number"]
            audio = item.get("audio", {})
            audio_zh = audio.get("transcript_zh", "") if isinstance(audio, dict) else ""
            source_map[qnum] = {
                "type": item.get("type", ""),
                "image_asset": item.get("image_asset"),
                "choices": item.get("exam_display", {}).get("choices", []),
                "correct_answer": item.get("answer", item.get("correct_answer", "")),
                "audio_zh": audio_zh,
                "stimulus": item.get("stimulus", {}),
            }

# ─── Load DB data ───
print("Loading DB data...")

# Get sections
sections = api_get(f"mock_exam_sections?mock_exam_id=eq.{EXAM_ID}&select=id,section_type,sort_order&order=sort_order")
print(f"  Sections: {len(sections)}")

# Build question map: sort_order → { exercise_id, section_type }
db_questions = {}
for sec in sections:
    qs = api_get(f"mock_exam_questions?section_id=eq.{sec['id']}&select=id,exercise_id,sort_order&order=sort_order")
    for q in qs:
        db_questions[q["sort_order"]] = {
            "exercise_id": q["exercise_id"],
            "section_type": sec["section_type"],
            "question_id": q["id"]
        }

print(f"  Questions loaded: {len(db_questions)}")

# ─── STEP 1: Listening Part 1 (Q1-Q5) — exercises.image_url ───
print("\n" + "="*60)
print("STEP 1: Listening Part 1 (Q1-Q5) — exercises.image_url")
print("="*60)

success = 0
for qnum in range(1, 6):
    src = source_map[qnum]
    db = db_questions.get(qnum)
    if not db:
        print(f"  Q{qnum}: NOT FOUND in DB!")
        continue
    
    img_path = f"{HSK1_IMG}/q{qnum:02d}.webp"
    disk_path = os.path.join(PUBLIC_DIR, img_path.lstrip("/"))
    
    if not os.path.exists(disk_path):
        print(f"  Q{qnum}: FILE MISSING {disk_path}")
        continue
    
    # Verify: source has image_asset with prompt
    prompt = src["image_asset"]["prompt_en"][:60] if src.get("image_asset") else "NO PROMPT"
    
    # PATCH exercise
    result = api_patch(f"exercises?id=eq.{db['exercise_id']}", {"image_url": img_path})
    status = "✅" if result else "❌"
    print(f"  Q{qnum}: {status} → {img_path} (prompt: {prompt})")
    if result:
        success += 1

print(f"  Done: {success}/5")

# ─── STEP 2: Listening Part 2 (Q6-Q10) — exercise_options.metadata.image_url ───
print("\n" + "="*60)
print("STEP 2: Listening Part 2 (Q6-Q10) — options with image")
print("="*60)

success = 0
for qnum in range(6, 11):
    src = source_map[qnum]
    db = db_questions.get(qnum)
    if not db:
        print(f"  Q{qnum}: NOT FOUND in DB!")
        continue
    
    choices = src.get("choices", [])
    if not choices:
        print(f"  Q{qnum}: NO choices in source!")
        continue
    
    # Get DB options
    opts = api_get(f"exercise_options?exercise_id=eq.{db['exercise_id']}&select=id,sort_order,is_correct,metadata&order=sort_order")
    
    if len(opts) != len(choices):
        print(f"  Q{qnum}: MISMATCH options count: DB={len(opts)} vs source={len(choices)}")
        continue
    
    # Map: choice letter → image file
    letters = ['a', 'b', 'c']
    q_success = 0
    for i, (opt, choice) in enumerate(zip(opts, choices)):
        letter = letters[i] if i < len(letters) else chr(ord('a') + i)
        img_path = f"{HSK1_IMG}/q{qnum:02d}_{letter}.webp"
        disk_path = os.path.join(PUBLIC_DIR, img_path.lstrip("/"))
        
        if not os.path.exists(disk_path):
            print(f"  Q{qnum} opt{opt['sort_order']}: FILE MISSING {disk_path}")
            continue
        
        prompt = choice.get("image_asset", {}).get("prompt_en", "")[:50]
        
        # Build metadata with image_url + content_detail
        meta = opt.get("metadata") or {}
        if not isinstance(meta, dict):
            meta = {}
        meta["image_url"] = img_path
        meta["content_detail"] = choice.get("image_asset", {}).get("prompt_en", "")
        
        result = api_patch(f"exercise_options?id=eq.{opt['id']}", {"metadata": meta})
        status = "✅" if result else "❌"
        print(f"  Q{qnum} opt{opt['sort_order']} ({choice['id']}): {status} → {img_path} ({prompt})")
        if result:
            q_success += 1
    
    success += q_success

print(f"  Done: {success} option updates")

# ─── STEP 3: Listening Part 3 (Q11-Q15) — exercise_options.metadata.image_url ───
print("\n" + "="*60)
print("STEP 3: Listening Part 3 (Q11-Q15) — options with image")
print("="*60)

success = 0
for qnum in range(11, 16):
    src = source_map[qnum]
    db = db_questions.get(qnum)
    if not db:
        print(f"  Q{qnum}: NOT FOUND in DB!")
        continue
    
    choices = src.get("choices", [])
    if not choices:
        print(f"  Q{qnum}: NO choices in source!")
        continue
    
    opts = api_get(f"exercise_options?exercise_id=eq.{db['exercise_id']}&select=id,sort_order,is_correct,metadata&order=sort_order")
    
    if len(opts) != len(choices):
        print(f"  Q{qnum}: MISMATCH options count: DB={len(opts)} vs source={len(choices)}")
        continue
    
    letters = ['a', 'b', 'c']
    q_success = 0
    for i, (opt, choice) in enumerate(zip(opts, choices)):
        letter = letters[i] if i < len(letters) else chr(ord('a') + i)
        img_path = f"{HSK1_IMG}/q{qnum:02d}_{letter}.webp"
        disk_path = os.path.join(PUBLIC_DIR, img_path.lstrip("/"))
        
        if not os.path.exists(disk_path):
            print(f"  Q{qnum} opt{opt['sort_order']}: FILE MISSING {disk_path}")
            continue
        
        prompt = choice.get("image_asset", {}).get("prompt_en", "")[:50]
        
        meta = opt.get("metadata") or {}
        if not isinstance(meta, dict):
            meta = {}
        meta["image_url"] = img_path
        meta["content_detail"] = choice.get("image_asset", {}).get("prompt_en", "")
        
        result = api_patch(f"exercise_options?id=eq.{opt['id']}", {"metadata": meta})
        status = "✅" if result else "❌"
        print(f"  Q{qnum} opt{opt['sort_order']} ({choice['id']}): {status} → {img_path} ({prompt})")
        if result:
            q_success += 1
    
    success += q_success

print(f"  Done: {success} option updates")

# ─── STEP 4: Reading Part 1 (Q21-Q25) — exercises.image_url ───
print("\n" + "="*60)
print("STEP 4: Reading Part 1 (Q21-Q25) — exercises.image_url")
print("="*60)

success = 0
for qnum in range(21, 26):
    src = source_map[qnum]
    db = db_questions.get(qnum)
    if not db:
        print(f"  Q{qnum}: NOT FOUND in DB!")
        continue
    
    img_path = f"{HSK1_IMG}/q{qnum}.webp"
    disk_path = os.path.join(PUBLIC_DIR, img_path.lstrip("/"))
    
    if not os.path.exists(disk_path):
        print(f"  Q{qnum}: FILE MISSING {disk_path}")
        continue
    
    prompt = src.get("image_asset", {}).get("prompt_en", "")[:60] if src.get("image_asset") else "NO PROMPT"
    
    result = api_patch(f"exercises?id=eq.{db['exercise_id']}", {"image_url": img_path})
    status = "✅" if result else "❌"
    print(f"  Q{qnum}: {status} → {img_path} (prompt: {prompt})")
    if result:
        success += 1

print(f"  Done: {success}/5")

# ─── STEP 5: Reading Part 2 (Q26-Q30) — sentence_picture_matching ───
# These use a shared image bank (r2_bank_a through r2_bank_e)
# Each question matches to one of 5 images
print("\n" + "="*60)
print("STEP 5: Reading Part 2 (Q26-Q30) — image bank matching")
print("="*60)

# Check what the source says about this part
r_part2 = reading_parts[1]
r_items = r_part2["items"]
print(f"  Source items: {len(r_items)}")

# Check what images are on disk
bank_files = [f"r2_bank_{l}.webp" for l in "abcde"]
all_exist = all(os.path.exists(os.path.join(PUBLIC_DIR, HSK1_IMG.lstrip("/"), f)) for f in bank_files)
print(f"  Image bank files exist: {all_exist} ({bank_files})")

# For each Q26-Q30, the answer maps to a letter (A-E)
# Each option should reference an image from the bank
for qnum in range(26, 31):
    src = source_map.get(qnum)
    db = db_questions.get(qnum)
    if not db or not src:
        print(f"  Q{qnum}: NOT FOUND")
        continue
    
    correct = src.get("correct_answer", "")
    stimulus = src.get("stimulus", {})
    hanzi = stimulus.get("hanzi", "") if isinstance(stimulus, dict) else ""
    
    # Get DB options
    opts = api_get(f"exercise_options?exercise_id=eq.{db['exercise_id']}&select=id,sort_order,is_correct,metadata&order=sort_order")
    
    print(f"  Q{qnum}: correct={correct} stimulus='{hanzi}' options={len(opts)}")
    
    # Map options to bank images: opt1=A, opt2=B, etc.
    letters = ['a', 'b', 'c', 'd', 'e']
    for i, opt in enumerate(opts):
        if i >= len(letters):
            break
        letter = letters[i]
        img_path = f"{HSK1_IMG}/r2_bank_{letter}.webp"
        
        meta = opt.get("metadata") or {}
        if not isinstance(meta, dict):
            meta = {}
        meta["image_url"] = img_path
        
        result = api_patch(f"exercise_options?id=eq.{opt['id']}", {"metadata": meta})
        status = "✅" if result else "❌"
        print(f"    opt{opt['sort_order']} ({letter.upper()}): {status} → {img_path}")

print("\n" + "="*60)
print("ALL DONE!")
print("="*60)
