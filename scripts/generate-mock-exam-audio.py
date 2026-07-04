#!/usr/bin/env python3
"""
Generate TTS audio for all mock exam listening exercises (HSK 1-6).
=================================================================
Reads audio.script_hanzi from exercises.metadata in Supabase,
generates MP3 via edge-tts (Microsoft Xiaoxiao voice), uploads
to Supabase Storage, and updates exercises.audio_url.

Usage:
  python3 scripts/generate-mock-exam-audio.py
  python3 scripts/generate-mock-exam-audio.py --level 4
  python3 scripts/generate-mock-exam-audio.py --level 4 --dry-run
"""

import asyncio
import hashlib
import json
import os
import subprocess
import sys
import time
import argparse

# ── Config ──────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwi"
    "cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4"
    "NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
)
VOICE = "zh-CN-XiaoxiaoNeural"
TMP_DIR = "/tmp/mock_exam_audio"
STORAGE_BUCKET = "audio"
STORAGE_PREFIX = "mock-exam"
CONCURRENT_TTS = 8

os.makedirs(TMP_DIR, exist_ok=True)

# ── Helpers ─────────────────────────────────────────────────────────

def make_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:16]


def supabase_get(path: str):
    import urllib.request
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def supabase_patch(table: str, filter_qs: str, data: dict):
    """PATCH a row (update)."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filter_qs}"
    body = json.dumps(data).encode()
    import urllib.request
    req = urllib.request.Request(url, data=body, method="PATCH", headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    })
    with urllib.request.urlopen(req) as resp:
        return resp.status


def upload_to_storage(local_path: str, storage_path: str) -> bool:
    """Upload a file to Supabase Storage via curl."""
    url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"
    cmd = [
        "curl", "-s", "-X", "POST", url,
        "-H", f"apikey: {SERVICE_KEY}",
        "-H", f"Authorization: Bearer {SERVICE_KEY}",
        "-H", "Content-Type: audio/mpeg",
        "-H", "x-upsert: true",
        "--data-binary", f"@{local_path}",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        resp = json.loads(r.stdout)
        return "Key" in resp
    except Exception:
        return False


def public_url(storage_path: str) -> str:
    return f"{SUPABASE_URL}/storage/v1/object/public/{STORAGE_BUCKET}/{storage_path}"


# ── Phase 1: Collect exercises needing audio ────────────────────────

def collect_exercises(levels: list[int]) -> list[dict]:
    """Return list of {exercise_id, script_hanzi, level} for exercises
    that have audio.script_hanzi but no audio_url yet."""
    results = []
    for level in levels:
        exam_id = f"d0e00100-000{level}-4000-a000-000000000001"
        sections = supabase_get(
            f"mock_exam_sections?mock_exam_id=eq.{exam_id}&select=id,section_type"
        )
        for sec in sections:
            questions = supabase_get(
                f"mock_exam_questions?section_id=eq.{sec['id']}"
                f"&select=exercise_id,sort_order&limit=200&order=sort_order"
            )
            for q in questions:
                exs = supabase_get(
                    f"exercises?id=eq.{q['exercise_id']}"
                    f"&select=id,audio_url,metadata"
                )
                if not exs:
                    continue
                ex = exs[0]
                meta = ex.get("metadata") or {}
                audio = meta.get("audio") or {}
                script = audio.get("script_hanzi", "")
                if script:
                    results.append({
                        "exercise_id": ex["id"],
                        "script_hanzi": script,
                        "current_audio_url": ex.get("audio_url") or "",
                        "level": level,
                        "sort_order": q["sort_order"],
                    })
    return results


# ── Phase 2: Generate TTS MP3s ──────────────────────────────────────

async def generate_tts(exercises: list[dict], force: bool = False):
    """Generate MP3 for each unique script_hanzi."""
    import edge_tts

    # Deduplicate by text
    unique_texts = {}
    for ex in exercises:
        txt = ex["script_hanzi"]
        if txt not in unique_texts:
            unique_texts[txt] = make_hash(txt)

    to_generate = {}
    for txt, h in unique_texts.items():
        path = os.path.join(TMP_DIR, f"{h}.mp3")
        if not force and os.path.exists(path) and os.path.getsize(path) > 200:
            continue
        to_generate[txt] = h

    print(f"  Unique texts: {len(unique_texts)}")
    print(f"  Already cached: {len(unique_texts) - len(to_generate)}")
    print(f"  To generate: {len(to_generate)}")

    if not to_generate:
        return unique_texts

    sem = asyncio.Semaphore(CONCURRENT_TTS)
    ok = 0
    fail = 0

    async def gen(text, h):
        nonlocal ok, fail
        async with sem:
            path = os.path.join(TMP_DIR, f"{h}.mp3")
            try:
                comm = edge_tts.Communicate(text, VOICE, rate="-5%")
                await comm.save(path)
                if os.path.getsize(path) > 200:
                    ok += 1
                else:
                    fail += 1
                    print(f"    ✗ Too small: {text[:40]}", file=sys.stderr)
            except Exception as e:
                fail += 1
                print(f"    ✗ TTS error: {text[:40]} — {e}", file=sys.stderr)

    # Chunk for progress display
    items = list(to_generate.items())
    chunk = 30
    for i in range(0, len(items), chunk):
        batch = items[i : i + chunk]
        await asyncio.gather(*(gen(t, h) for t, h in batch))
        done = min(i + chunk, len(items))
        print(f"    TTS: {done}/{len(items)} ({ok} ok, {fail} fail)")

    print(f"  TTS complete: {ok} ok, {fail} fail")
    return unique_texts


# ── Phase 3: Upload + update DB ──────────────────────────────────────

def upload_and_update(exercises: list[dict], unique_texts: dict[str, str], dry_run: bool):
    """Upload MP3s and update audio_url in exercises table."""
    uploaded = 0
    updated = 0
    skipped = 0

    for ex in exercises:
        txt = ex["script_hanzi"]
        h = unique_texts.get(txt)
        if not h:
            continue

        local_path = os.path.join(TMP_DIR, f"{h}.mp3")
        if not os.path.exists(local_path) or os.path.getsize(local_path) < 200:
            print(f"    ⚠ Missing MP3 for exercise {ex['exercise_id']}")
            continue

        storage_path = f"{STORAGE_PREFIX}/hsk{ex['level']}/{h}.mp3"
        target_url = public_url(storage_path)

        # Skip if already set to this URL
        if ex["current_audio_url"] == target_url:
            skipped += 1
            continue

        if dry_run:
            print(f"    [DRY] Would upload {storage_path} and set audio_url")
            uploaded += 1
            updated += 1
            continue

        # Upload
        if upload_to_storage(local_path, storage_path):
            uploaded += 1
        else:
            print(f"    ✗ Upload failed: {storage_path}", file=sys.stderr)
            continue

        # Update DB
        try:
            supabase_patch("exercises", f"id=eq.{ex['exercise_id']}", {
                "audio_url": target_url,
            })
            updated += 1
        except Exception as e:
            print(f"    ✗ DB update failed: {ex['exercise_id']} — {e}", file=sys.stderr)

    return uploaded, updated, skipped


# ── Main ─────────────────────────────────────────────────────────────

async def main():
    parser = argparse.ArgumentParser(description="Generate mock exam audio")
    parser.add_argument("--level", type=int, default=0, help="HSK level (0=all)")
    parser.add_argument("--dry-run", action="store_true", help="Don't upload or update DB")
    parser.add_argument("--force", action="store_true", help="Re-generate even if cached")
    args = parser.parse_args()

    levels = [args.level] if args.level else list(range(1, 7))
    start = time.time()

    print(f"{'='*60}")
    print(f" Mock Exam Audio Generator — HSK {','.join(map(str, levels))}")
    print(f"{'='*60}")

    # Phase 1: Collect
    print("\n📋 Phase 1: Collecting exercises from Supabase...")
    exercises = collect_exercises(levels)
    print(f"  Found {len(exercises)} exercises with audio scripts")

    if not exercises:
        print("  Nothing to do!")
        return

    # Group by level for display
    by_level = {}
    for ex in exercises:
        by_level.setdefault(ex["level"], []).append(ex)
    for lvl in sorted(by_level):
        print(f"    HSK{lvl}: {len(by_level[lvl])} exercises")

    # Phase 2: Generate TTS
    print("\n🎙️  Phase 2: Generating TTS MP3s...")
    unique_texts = await generate_tts(exercises, force=args.force)

    # Phase 3: Upload + update
    print("\n☁️  Phase 3: Uploading to Supabase Storage & updating DB...")
    uploaded, updated, skipped = upload_and_update(
        exercises, unique_texts, dry_run=args.dry_run
    )

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f" ✅ DONE in {elapsed:.1f}s")
    print(f"    Uploaded: {uploaded}")
    print(f"    DB updated: {updated}")
    print(f"    Skipped (already ok): {skipped}")
    print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
