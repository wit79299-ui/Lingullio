#!/usr/bin/env python3
"""
Lingullio TTS Audio Generation Script
======================================
Generates Chinese Mandarin TTS audio for all vocabulary items and characters
using Microsoft Edge TTS (zh-CN-XiaoxiaoNeural voice).

Pipeline:
1. Fetch items from Supabase (vocabulary_items + characters)
2. Generate MP3 via edge-tts
3. Upload to Supabase Storage (bucket: audio, public)
4. Update audio_url in the database
5. Insert record in audio_files table

Usage:
  python3 scripts/generate-audio-tts.py --type vocab --level 1
  python3 scripts/generate-audio-tts.py --type vocab --level all
  python3 scripts/generate-audio-tts.py --type char --level 1
  python3 scripts/generate-audio-tts.py --type char --level all
  python3 scripts/generate-audio-tts.py --type all --level all
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import argparse
import hashlib

# --- Config ---
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
VOICE = "zh-CN-XiaoxiaoNeural"  # High-quality female Mandarin voice
TMP_DIR = "/tmp/lingullio_audio"
STORAGE_BUCKET = "audio"

# Rate limiting
BATCH_SIZE = 20        # Process N items then pause
BATCH_PAUSE = 1.0      # Seconds between batches
CONCURRENT = 5         # Concurrent TTS generations

os.makedirs(TMP_DIR, exist_ok=True)


def supabase_request(method, path, data=None, headers_extra=None):
    """Make a request to Supabase REST API via curl."""
    url = f"{SUPABASE_URL}{path}"
    cmd = ["curl", "-s", "-X", method, url,
           "-H", f"apikey: {SUPABASE_KEY}",
           "-H", f"Authorization: Bearer {SUPABASE_KEY}"]
    
    if headers_extra:
        for h in headers_extra:
            cmd.extend(["-H", h])
    
    if data is not None:
        cmd.extend(["-H", "Content-Type: application/json", "-d", json.dumps(data)])
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return result.stdout


def supabase_upload(storage_path, local_file):
    """Upload a file to Supabase Storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"
    cmd = [
        "curl", "-s", "-X", "POST", url,
        "-H", f"apikey: {SUPABASE_KEY}",
        "-H", f"Authorization: Bearer {SUPABASE_KEY}",
        "-H", "Content-Type: audio/mpeg",
        "-H", "x-upsert: true",  # Overwrite if exists
        "--data-binary", f"@{local_file}"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        resp = json.loads(result.stdout)
        if "Key" in resp:
            return True
        else:
            print(f"  Upload error: {result.stdout[:200]}", file=sys.stderr)
            return False
    except:
        print(f"  Upload parse error: {result.stdout[:200]}", file=sys.stderr)
        return False


def get_public_url(storage_path):
    """Get the public URL for a file in Supabase Storage."""
    return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"


def fetch_items(item_type, level):
    """Fetch vocabulary items or characters from Supabase."""
    table = "vocabulary_items" if item_type == "vocab" else "characters"
    select = "id,simplified,pinyin" if item_type == "vocab" else "id,character,pinyin"
    
    all_items = []
    offset = 0
    
    while True:
        level_filter = f"&hsk_level=eq.{level}" if level != "all" else ""
        path = f"/rest/v1/{table}?select={select}{level_filter}&order=id"
        headers = [f"Range: {offset}-{offset + 999}"]
        
        resp = supabase_request("GET", path, headers_extra=headers)
        try:
            items = json.loads(resp)
            if not items:
                break
            all_items.extend(items)
            if len(items) < 1000:
                break
            offset += 1000
        except:
            print(f"Error fetching {table}: {resp[:200]}", file=sys.stderr)
            break
    
    return all_items


def make_safe_filename(text):
    """Create a safe filename from Chinese text."""
    # Use hex encoding of the text as filename
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:12]


async def generate_tts(text, output_path):
    """Generate TTS audio using edge-tts."""
    import edge_tts
    try:
        communicate = edge_tts.Communicate(text, VOICE, rate="-10%")  # Slightly slower for learning
        await communicate.save(output_path)
        return True
    except Exception as e:
        print(f"  TTS error for '{text}': {e}", file=sys.stderr)
        return False


async def generate_batch(items, semaphore):
    """Generate TTS for a batch of items concurrently."""
    async def gen_one(item):
        async with semaphore:
            text = item.get('simplified') or item.get('character')
            filename = make_safe_filename(text)
            local_path = os.path.join(TMP_DIR, f"{filename}.mp3")
            
            if os.path.exists(local_path) and os.path.getsize(local_path) > 100:
                return (item, local_path, True)  # Already generated
            
            ok = await generate_tts(text, local_path)
            return (item, local_path, ok)
    
    tasks = [gen_one(item) for item in items]
    return await asyncio.gather(*tasks)


def update_audio_url(item_type, item_id, audio_url):
    """Update audio_url in the database."""
    table = "vocabulary_items" if item_type == "vocab" else "characters"
    path = f"/rest/v1/{table}?id=eq.{item_id}"
    data = {"audio_url": audio_url}
    headers = ["Prefer: return=minimal"]
    resp = supabase_request("PATCH", path, data=data, headers_extra=headers)
    return True


def insert_audio_file(storage_path, public_url, file_size, reference_type, reference_id, transcript):
    """Insert a record into the audio_files table."""
    data = {
        "storage_path": storage_path,
        "public_url": public_url,
        "file_size_bytes": file_size,
        "mime_type": "audio/mpeg",
        "source": "tts",
        "tts_model": "edge-tts",
        "tts_voice": VOICE,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "transcript": transcript
    }
    headers = ["Prefer: return=minimal"]
    resp = supabase_request("POST", "/rest/v1/audio_files", data=data, headers_extra=headers)
    return True


async def process_items(item_type, level):
    """Main processing function."""
    print(f"\n{'='*60}")
    print(f"Processing: {item_type} - HSK Level: {level}")
    print(f"{'='*60}")
    
    # Fetch items
    print(f"Fetching {item_type} items...")
    items = fetch_items(item_type, level)
    print(f"  Found {len(items)} items")
    
    if not items:
        print("  No items to process.")
        return 0, 0
    
    # Deduplicate by text (same word = same audio)
    text_key = 'simplified' if item_type == 'vocab' else 'character'
    unique_texts = {}
    text_to_items = {}
    
    for item in items:
        text = item[text_key]
        if text not in unique_texts:
            unique_texts[text] = item
            text_to_items[text] = [item]
        else:
            text_to_items[text].append(item)
    
    print(f"  Unique texts: {len(unique_texts)} (dedup from {len(items)})")
    
    # Process in batches
    semaphore = asyncio.Semaphore(CONCURRENT)
    unique_list = list(unique_texts.values())
    
    total_ok = 0
    total_fail = 0
    storage_prefix = "vocab" if item_type == "vocab" else "char"
    ref_type = "vocabulary_item" if item_type == "vocab" else "character"
    
    for batch_start in range(0, len(unique_list), BATCH_SIZE):
        batch = unique_list[batch_start:batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (len(unique_list) + BATCH_SIZE - 1) // BATCH_SIZE
        
        print(f"\n  Batch {batch_num}/{total_batches} ({len(batch)} items)...")
        
        # Generate TTS
        results = await generate_batch(batch, semaphore)
        
        # Upload and update DB
        for item, local_path, tts_ok in results:
            text = item.get('simplified') or item.get('character')
            
            if not tts_ok:
                total_fail += 1
                print(f"    ✗ TTS failed: {text}")
                continue
            
            file_size = os.path.getsize(local_path)
            if file_size < 100:
                total_fail += 1
                print(f"    ✗ File too small: {text} ({file_size}b)")
                continue
            
            # Upload to Supabase Storage
            filename = make_safe_filename(text)
            storage_path = f"{storage_prefix}/{filename}.mp3"
            
            upload_ok = supabase_upload(storage_path, local_path)
            if not upload_ok:
                total_fail += 1
                print(f"    ✗ Upload failed: {text}")
                continue
            
            public_url = get_public_url(storage_path)
            
            # Update all items with this text
            all_items_for_text = text_to_items[text]
            for db_item in all_items_for_text:
                update_audio_url(item_type, db_item['id'], public_url)
                insert_audio_file(
                    storage_path, public_url, file_size,
                    ref_type, db_item['id'], text
                )
            
            total_ok += len(all_items_for_text)
        
        # Rate limit pause
        if batch_start + BATCH_SIZE < len(unique_list):
            await asyncio.sleep(BATCH_PAUSE)
    
    print(f"\n  ✓ Success: {total_ok}/{len(items)}")
    if total_fail:
        print(f"  ✗ Failed: {total_fail}")
    
    return total_ok, total_fail


async def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for Lingullio")
    parser.add_argument("--type", choices=["vocab", "char", "all"], default="all",
                        help="Type of items to process")
    parser.add_argument("--level", default="all",
                        help="HSK level (1-5 or 'all')")
    args = parser.parse_args()
    
    start_time = time.time()
    total_ok = 0
    total_fail = 0
    
    types = ["vocab", "char"] if args.type == "all" else [args.type]
    levels = ["1", "2", "3", "4", "5"] if args.level == "all" else [args.level]
    
    for item_type in types:
        for level in levels:
            ok, fail = await process_items(item_type, level)
            total_ok += ok
            total_fail += fail
    
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"COMPLETE")
    print(f"  Total success: {total_ok}")
    print(f"  Total failed:  {total_fail}")
    print(f"  Time elapsed:  {elapsed:.1f}s")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
