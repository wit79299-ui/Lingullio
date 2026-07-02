#!/usr/bin/env python3
"""
Import HSK1 vocabulary directly into Supabase via REST API.
Uses the service role key for full access.
"""

import json
import os
import sys
import urllib.request
import urllib.error

# Load env
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

def make_vocab_uuid(index):
    return f"d1000{index:03d}-0000-0000-0000-000000000000"

def make_trans_uuid(index, locale):
    suffix = "f" if locale == "fr" else "e"
    return f"d1000{index:03d}-0000-0000-0000-00000000000{suffix}"

def supabase_request(method, table, data=None, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{table}{params}"
    body = json.dumps(data).encode("utf-8") if data else None
    
    headers = dict(HEADERS)
    if method == "DELETE":
        headers.pop("Content-Type", None)
    if method in ("POST", "PATCH") and data:
        headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, resp.read().decode("utf-8") if resp.read else ""
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if e.read else ""
        return e.code, body

def main():
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "hsk1", "vocabulary_hsk1_complete.json")
    
    with open(data_path, "r", encoding="utf-8") as f:
        vocab = json.load(f)
    
    print(f"Loaded {len(vocab)} vocabulary items")
    
    # Step 1: Delete existing HSK1 translations
    print("\n[1/4] Deleting existing HSK1 vocabulary translations...")
    # First get all HSK1 vocab IDs
    status, body = supabase_request("GET", "vocabulary_items", params="?hsk_level=eq.HSK1&select=id")
    if status == 200:
        existing_ids = [item["id"] for item in json.loads(body)]
        if existing_ids:
            # Delete translations for these IDs in batches
            for i in range(0, len(existing_ids), 50):
                batch_ids = existing_ids[i:i+50]
                id_list = ",".join(batch_ids)
                s, b = supabase_request("DELETE", "vocabulary_translations", params=f"?vocabulary_id=in.({id_list})")
                if s in (200, 204):
                    print(f"  Deleted translations batch {i//50 + 1}")
                else:
                    print(f"  Warning: {s} - {b[:200]}")
            print(f"  Cleaned {len(existing_ids)} items' translations")
        else:
            print("  No existing HSK1 vocabulary found")
    else:
        print(f"  Warning getting existing items: {status}")
    
    # Step 2: Delete existing HSK1 vocabulary items
    print("\n[2/4] Deleting existing HSK1 vocabulary items...")
    status, body = supabase_request("DELETE", "vocabulary_items", params="?hsk_level=eq.HSK1")
    if status in (200, 204):
        print(f"  Done (status {status})")
    else:
        print(f"  Warning: {status} - {body[:200]}")
    
    # Step 3: Insert vocabulary items in batches
    print(f"\n[3/4] Inserting {len(vocab)} vocabulary items...")
    BATCH = 50
    inserted = 0
    for i in range(0, len(vocab), BATCH):
        batch = vocab[i:i+BATCH]
        items = []
        for j, item in enumerate(batch):
            idx = i + j + 1
            items.append({
                "id": make_vocab_uuid(idx),
                "simplified": item["simplified"],
                "traditional": item.get("traditional"),
                "pinyin": item["pinyin"],
                "hsk_level": "HSK1",
                "frequency_rank": idx,
                "word_type": item.get("word_type"),
                "theme": item.get("theme"),
                "status": "published",
            })
        
        status, body = supabase_request("POST", "vocabulary_items", data=items)
        if status in (200, 201, 204):
            inserted += len(items)
            print(f"  Batch {i//BATCH + 1}: {len(items)} items ✓")
        else:
            print(f"  Batch {i//BATCH + 1}: ERROR {status} - {body[:300]}")
    
    print(f"  Total inserted: {inserted}/{len(vocab)}")
    
    # Step 4: Insert translations
    print(f"\n[4/4] Inserting translations (FR + EN)...")
    trans_inserted = 0
    all_trans = []
    for i, item in enumerate(vocab):
        idx = i + 1
        vocab_id = make_vocab_uuid(idx)
        
        for locale in ["fr", "en"]:
            tr = item.get("translations", {}).get(locale, {})
            if not tr:
                continue
            all_trans.append({
                "id": make_trans_uuid(idx, locale),
                "vocabulary_id": vocab_id,
                "locale": locale,
                "meaning": tr.get("meaning", ""),
                "example_sentence": tr.get("example_sentence"),
                "example_pinyin": tr.get("example_pinyin"),
                "example_translation": tr.get("example_translation"),
                "usage_notes": tr.get("usage_notes"),
            })
    
    for i in range(0, len(all_trans), BATCH):
        batch = all_trans[i:i+BATCH]
        status, body = supabase_request("POST", "vocabulary_translations", data=batch)
        if status in (200, 201, 204):
            trans_inserted += len(batch)
            print(f"  Batch {i//BATCH + 1}: {len(batch)} translations ✓")
        else:
            print(f"  Batch {i//BATCH + 1}: ERROR {status} - {body[:300]}")
    
    print(f"  Total translations: {trans_inserted}/{len(all_trans)}")
    
    # Summary
    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"  Vocabulary items: {inserted}")
    print(f"  Translations:     {trans_inserted}")
    print(f"  Errors:           {len(vocab) - inserted + len(all_trans) - trans_inserted}")
    
    if inserted == len(vocab) and trans_inserted == len(all_trans):
        print(f"\n✅ SUCCESS: All {inserted} words + {trans_inserted} translations imported!")
        return 0
    else:
        print(f"\n⚠️  PARTIAL: Some items failed to import")
        return 1

if __name__ == "__main__":
    sys.exit(main())
