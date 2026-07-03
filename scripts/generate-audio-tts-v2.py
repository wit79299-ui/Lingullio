#!/usr/bin/env python3
"""
Lingullio TTS Audio Generation Script v2 — Optimized
=====================================================
3-phase approach for speed:
  Phase A: Generate all MP3 files locally (fast, concurrent edge-tts)
  Phase B: Upload all MP3s to Supabase Storage (curl, parallel)
  Phase C: Batch update audio_url in DB (single curl per batch via RPC or chunked PATCHes)

Usage:
  python3 scripts/generate-audio-tts-v2.py --type vocab --level 1
  python3 scripts/generate-audio-tts-v2.py --type vocab --level all
  python3 scripts/generate-audio-tts-v2.py --type char --level all
  python3 scripts/generate-audio-tts-v2.py --type all --level all
  python3 scripts/generate-audio-tts-v2.py --phase a --type vocab --level 1   # TTS only
  python3 scripts/generate-audio-tts-v2.py --phase b --type vocab --level 1   # Upload only
  python3 scripts/generate-audio-tts-v2.py --phase c --type vocab --level 1   # DB update only
"""

import asyncio
import json
import os
import subprocess
import sys
import time
import argparse
import hashlib
from concurrent.futures import ThreadPoolExecutor

# --- Config ---
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
VOICE = "zh-CN-XiaoxiaoNeural"
TMP_DIR = "/tmp/lingullio_audio"
STORAGE_BUCKET = "audio"
MANIFEST_FILE = "/tmp/lingullio_audio_manifest.json"
CONCURRENT_TTS = 10
CONCURRENT_UPLOAD = 8

os.makedirs(TMP_DIR, exist_ok=True)


def make_hash(text):
    return hashlib.md5(text.encode('utf-8')).hexdigest()[:12]


def fetch_items(item_type, level):
    """Fetch items from Supabase, paginated."""
    table = "vocabulary_items" if item_type == "vocab" else "characters"
    select = "id,simplified,pinyin,audio_url" if item_type == "vocab" else "id,character,pinyin,audio_url"
    text_key = "simplified" if item_type == "vocab" else "character"
    
    all_items = []
    offset = 0
    while True:
        lf = f"&hsk_level=eq.{level}" if level != "all" else ""
        url = f"{SUPABASE_URL}/rest/v1/{table}?select={select}{lf}&order=id"
        cmd = ["curl", "-s", url,
               "-H", f"apikey: {SUPABASE_KEY}",
               "-H", f"Authorization: Bearer {SUPABASE_KEY}",
               "-H", f"Range: {offset}-{offset+999}"]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        items = json.loads(r.stdout)
        if not items:
            break
        all_items.extend(items)
        if len(items) < 1000:
            break
        offset += 1000
    
    return all_items, text_key


# ======== PHASE A: Generate TTS ========

async def phase_a_generate(items, text_key):
    """Generate MP3 files for all unique texts."""
    import edge_tts
    
    # Deduplicate
    unique = {}
    for item in items:
        t = item[text_key]
        if t not in unique:
            unique[t] = make_hash(t)
    
    print(f"  Phase A: {len(unique)} unique texts to generate")
    
    # Check which already exist
    to_generate = {}
    for text, h in unique.items():
        path = os.path.join(TMP_DIR, f"{h}.mp3")
        if os.path.exists(path) and os.path.getsize(path) > 100:
            continue  # Already done
        to_generate[text] = h
    
    print(f"  Already cached: {len(unique) - len(to_generate)}")
    print(f"  Need to generate: {len(to_generate)}")
    
    if not to_generate:
        return unique
    
    sem = asyncio.Semaphore(CONCURRENT_TTS)
    ok_count = 0
    fail_count = 0
    
    async def gen_one(text, h):
        nonlocal ok_count, fail_count
        async with sem:
            path = os.path.join(TMP_DIR, f"{h}.mp3")
            try:
                comm = edge_tts.Communicate(text, VOICE, rate="-10%")
                await comm.save(path)
                if os.path.getsize(path) > 100:
                    ok_count += 1
                    return True
                else:
                    fail_count += 1
                    return False
            except Exception as e:
                fail_count += 1
                print(f"    ✗ TTS fail: {text} — {e}", file=sys.stderr)
                return False
    
    tasks = [gen_one(text, h) for text, h in to_generate.items()]
    
    # Process in chunks to show progress
    chunk_size = 50
    task_list = list(to_generate.items())
    for i in range(0, len(task_list), chunk_size):
        chunk = task_list[i:i+chunk_size]
        chunk_tasks = [gen_one(text, h) for text, h in chunk]
        await asyncio.gather(*chunk_tasks)
        done = min(i + chunk_size, len(task_list))
        print(f"    TTS progress: {done}/{len(task_list)} ({ok_count} ok, {fail_count} fail)")
    
    print(f"  Phase A complete: {ok_count} generated, {fail_count} failed")
    return unique


# ======== PHASE B: Upload to Supabase Storage ========

def upload_one(args):
    """Upload a single file (for thread pool)."""
    text, h, storage_prefix = args
    local_path = os.path.join(TMP_DIR, f"{h}.mp3")
    if not os.path.exists(local_path) or os.path.getsize(local_path) < 100:
        return (text, h, False, 0)
    
    storage_path = f"{storage_prefix}/{h}.mp3"
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"
    cmd = [
        "curl", "-s", "-X", "POST", url,
        "-H", f"apikey: {SUPABASE_KEY}",
        "-H", f"Authorization: Bearer {SUPABASE_KEY}",
        "-H", "Content-Type: audio/mpeg",
        "-H", "x-upsert: true",
        "--data-binary", f"@{local_path}"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        resp = json.loads(r.stdout)
        if "Key" in resp:
            return (text, h, True, os.path.getsize(local_path))
        return (text, h, False, 0)
    except:
        return (text, h, False, 0)


def phase_b_upload(unique_texts, storage_prefix):
    """Upload all generated files to Supabase Storage."""
    tasks = [(text, h, storage_prefix) for text, h in unique_texts.items()]
    
    print(f"  Phase B: Uploading {len(tasks)} files to Supabase Storage...")
    
    ok = 0
    fail = 0
    results = {}
    
    with ThreadPoolExecutor(max_workers=CONCURRENT_UPLOAD) as executor:
        chunk_size = 50
        for i in range(0, len(tasks), chunk_size):
            chunk = tasks[i:i+chunk_size]
            for text, h, success, size in executor.map(upload_one, chunk):
                if success:
                    ok += 1
                    results[text] = {
                        "hash": h,
                        "storage_path": f"{storage_prefix}/{h}.mp3",
                        "public_url": f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_prefix}/{h}.mp3",
                        "file_size": size
                    }
                else:
                    fail += 1
            done = min(i + chunk_size, len(tasks))
            print(f"    Upload progress: {done}/{len(tasks)} ({ok} ok, {fail} fail)")
    
    print(f"  Phase B complete: {ok} uploaded, {fail} failed")
    return results


# ======== PHASE C: Update DB ========

def phase_c_update_db(items, text_key, upload_results, item_type):
    """Update audio_url and insert audio_files records."""
    table = "vocabulary_items" if item_type == "vocab" else "characters"
    ref_type = "vocabulary_item" if item_type == "vocab" else "character"
    
    print(f"  Phase C: Updating database for {len(items)} items...")
    
    # Check which items already have the correct supabase audio_url
    already_ok = 0
    to_update = []
    
    for item in items:
        text = item[text_key]
        if text not in upload_results:
            continue
        
        expected_url = upload_results[text]["public_url"]
        current_url = item.get("audio_url")
        
        if current_url == expected_url:
            already_ok += 1
            continue
        
        to_update.append((item, upload_results[text]))
    
    print(f"    Already up-to-date: {already_ok}")
    print(f"    Need DB update: {len(to_update)}")
    
    if not to_update:
        return
    
    # Batch PATCH: group by audio_url (same word = same URL)
    url_to_ids = {}
    for item, info in to_update:
        url = info["public_url"]
        if url not in url_to_ids:
            url_to_ids[url] = {"ids": [], "info": info, "text": item[text_key]}
        url_to_ids[url]["ids"].append(item["id"])
    
    ok = 0
    fail = 0
    
    for url, data in url_to_ids.items():
        ids = data["ids"]
        info = data["info"]
        text = data["text"]
        
        # Batch update: PATCH with in.() filter (chunk if needed)
        for chunk_start in range(0, len(ids), 20):
            chunk_ids = ids[chunk_start:chunk_start+20]
            id_list = ",".join(chunk_ids)
            
            patch_url = f"{SUPABASE_URL}/rest/v1/{table}?id=in.({id_list})"
            patch_data = json.dumps({"audio_url": info["public_url"]})
            cmd = [
                "curl", "-s", "-X", "PATCH", patch_url,
                "-H", f"apikey: {SUPABASE_KEY}",
                "-H", f"Authorization: Bearer {SUPABASE_KEY}",
                "-H", "Content-Type: application/json",
                "-H", "Prefer: return=minimal",
                "-d", patch_data
            ]
            subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            ok += len(chunk_ids)
        
        # Insert audio_files records (one per unique item)
        for item_id in ids:
            af_data = json.dumps({
                "storage_path": info["storage_path"],
                "public_url": info["public_url"],
                "file_size_bytes": info["file_size"],
                "mime_type": "audio/mpeg",
                "source": "tts",
                "tts_model": "edge-tts",
                "tts_voice": VOICE,
                "reference_type": ref_type,
                "reference_id": item_id,
                "transcript": text
            })
            cmd = [
                "curl", "-s", "-X", "POST",
                f"{SUPABASE_URL}/rest/v1/audio_files",
                "-H", f"apikey: {SUPABASE_KEY}",
                "-H", f"Authorization: Bearer {SUPABASE_KEY}",
                "-H", "Content-Type: application/json",
                "-H", "Prefer: return=minimal",
                "-d", af_data
            ]
            subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    
    print(f"  Phase C complete: {ok} items updated in {table}")


async def run(args):
    types = ["vocab", "char"] if args.type == "all" else [args.type]
    levels = ["1", "2", "3", "4", "5"] if args.level == "all" else [args.level]
    
    start = time.time()
    
    for item_type in types:
        storage_prefix = "vocab" if item_type == "vocab" else "char"
        
        for level in levels:
            print(f"\n{'='*60}")
            print(f" {item_type.upper()} — HSK {level}")
            print(f"{'='*60}")
            
            items, text_key = fetch_items(item_type, level)
            if not items:
                print(f"  No items found.")
                continue
            
            print(f"  Total items: {len(items)}")
            
            # Deduplicate
            unique = {}
            for item in items:
                t = item[text_key]
                if t not in unique:
                    unique[t] = make_hash(t)
            
            phases = args.phase if args.phase else "abc"
            
            if "a" in phases:
                unique = await phase_a_generate(items, text_key)
            
            if "b" in phases:
                upload_results = phase_b_upload(unique, storage_prefix)
            
            if "c" in phases:
                if "b" not in phases:
                    # Reconstruct upload_results from existing files
                    upload_results = {}
                    for text, h in unique.items():
                        local_path = os.path.join(TMP_DIR, f"{h}.mp3")
                        if os.path.exists(local_path) and os.path.getsize(local_path) > 100:
                            upload_results[text] = {
                                "hash": h,
                                "storage_path": f"{storage_prefix}/{h}.mp3",
                                "public_url": f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_prefix}/{h}.mp3",
                                "file_size": os.path.getsize(local_path)
                            }
                
                phase_c_update_db(items, text_key, upload_results, item_type)
    
    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f" DONE in {elapsed:.1f}s")
    print(f"{'='*60}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", choices=["vocab", "char", "all"], default="all")
    parser.add_argument("--level", default="all")
    parser.add_argument("--phase", default="", help="Phase(s) to run: a, b, c, ab, bc, abc (default: abc)")
    args = parser.parse_args()
    
    asyncio.run(run(args))
