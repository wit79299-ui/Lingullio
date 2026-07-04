#!/usr/bin/env python3
"""
Generate TTS audio for vocabulary_items and characters that have no audio_url.
Uses edge-tts (Microsoft XiaoxiaoNeural) to generate MP3 files, then uploads
them to Supabase Storage and updates the DB records.

Usage:
  python3 scripts/generate-course-content-audio.py           # All levels
  python3 scripts/generate-course-content-audio.py --level 6  # Only HSK6
"""

import asyncio
import json
import os
import sys
import hashlib
import urllib.request
import urllib.error
import urllib.parse

try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    os.system("pip install edge-tts")
    import edge_tts

# ─── Config ─────────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwi"
    "cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4"
    "NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
)
VOICE = "zh-CN-XiaoxiaoNeural"
BUCKET = "audio"
TMP_DIR = "/tmp/tts_content"

os.makedirs(TMP_DIR, exist_ok=True)

# ─── Supabase helpers ────────────────────────────────────────────────────

def supabase_get(table, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"  GET {table} failed: {e.code}")
        return []


def supabase_upload(bucket, path, data, content_type="audio/mpeg"):
    """Upload a file to Supabase Storage."""
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"
    req = urllib.request.Request(url, data=data, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"    Upload failed: {e.code} – {body[:200]}")
        return False


def supabase_patch(table, record_id, data):
    """Update a single record."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?id=eq.{record_id}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"    PATCH failed: {e.code} – {body[:200]}")
        return False


# ─── TTS generation ──────────────────────────────────────────────────────

async def generate_audio(text: str, filepath: str) -> bool:
    """Generate TTS audio using edge-tts."""
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(filepath)
        return os.path.exists(filepath) and os.path.getsize(filepath) > 100
    except Exception as e:
        print(f"    TTS error for '{text}': {e}")
        return False


async def process_items(items: list, item_type: str, text_field: str, hsk_level: str):
    """Process a list of items (vocab or chars) that need audio."""
    print(f"\n  🔊 Generating {item_type} audio for HSK{hsk_level}: {len(items)} items")
    
    success = 0
    failed = 0
    
    for i, item in enumerate(items):
        item_id = item["id"]
        text = item[text_field]
        
        # Storage path — use hash-based filename to avoid Unicode issues in URLs
        safe_name = hashlib.md5(text.encode()).hexdigest()[:12]
        storage_path = f"content/{item_type}/hsk{hsk_level}/{safe_name}.mp3"
        local_path = os.path.join(TMP_DIR, f"{item_type}_{hsk_level}_{i}.mp3")
        
        # Generate TTS
        ok = await generate_audio(text, local_path)
        if not ok:
            print(f"    ✗ TTS failed: {text}")
            failed += 1
            continue
        
        # Upload to Supabase Storage
        with open(local_path, "rb") as f:
            audio_data = f.read()
        
        uploaded = supabase_upload(BUCKET, storage_path, audio_data)
        if not uploaded:
            print(f"    ✗ Upload failed: {text}")
            failed += 1
            continue
        
        # Build public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
        
        # Update DB record
        table = "vocabulary_items" if item_type == "vocab" else "characters"
        updated = supabase_patch(table, item_id, {"audio_url": public_url})
        
        if updated:
            success += 1
        else:
            failed += 1
        
        # Clean up
        if os.path.exists(local_path):
            os.remove(local_path)
        
        # Progress
        if (i + 1) % 10 == 0:
            print(f"    Progress: {i+1}/{len(items)}")
    
    print(f"    ✅ {success} OK, ✗ {failed} failed")
    return success, failed


async def main():
    args = sys.argv[1:]
    target_levels = ["4", "5", "6", "7"]
    
    if "--level" in args:
        idx = args.index("--level")
        if idx + 1 < len(args):
            target_levels = [args[idx + 1]]
    
    total_success = 0
    total_failed = 0
    
    for level in target_levels:
        level_label = "HSK7-9" if level == "7" else f"HSK{level}"
        print(f"\n{'='*60}")
        print(f"  Processing {level_label}")
        print(f"{'='*60}")
        
        # Vocabulary without audio
        vocab_no_audio = supabase_get(
            "vocabulary_items",
            f"hsk_level=eq.{level}&audio_url=is.null&select=id,simplified"
        )
        if vocab_no_audio:
            s, f = await process_items(vocab_no_audio, "vocab", "simplified", level)
            total_success += s
            total_failed += f
        else:
            print(f"\n  📖 All vocab for {level_label} already have audio")
        
        # Characters without audio
        chars_no_audio = supabase_get(
            "characters",
            f"hsk_level=eq.{level}&audio_url=is.null&select=id,character"
        )
        if chars_no_audio:
            s, f = await process_items(chars_no_audio, "char", "character", level)
            total_success += s
            total_failed += f
        else:
            print(f"\n  🔤 All chars for {level_label} already have audio")
    
    print(f"\n{'='*60}")
    print(f"  🎉 DONE — {total_success} audio files generated, {total_failed} failed")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
