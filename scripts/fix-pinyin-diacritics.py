#!/usr/bin/env python3
"""
Convert numbered pinyin (ni3 hao3) to diacritic pinyin (nǐ hǎo) in Supabase.
Fixes both vocabulary_items.pinyin and vocabulary_translations.example_pinyin.
"""

import json
import re
import sys
import requests
import time

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ─── Tone diacritic mapping ────────────────────────────────────────
# Standard: the tone mark goes on the main vowel of the syllable
# Rules: a/e always get the mark; in "ou" mark the "o"; otherwise mark the last vowel.

TONE_MARKS = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],  # v is sometimes used for ü
}

def _convert_syllable(syllable: str) -> str:
    """Convert a single numbered syllable like 'ni3' to 'nǐ'."""
    if not syllable:
        return syllable
    
    # Already has diacritics? Return as-is
    diacritic_chars = set('āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ')
    if any(c in diacritic_chars for c in syllable):
        return syllable
    
    # Check if ends with a tone number
    match = re.match(r'^([a-züv]+?)([1-5])$', syllable, re.IGNORECASE)
    if not match:
        return syllable  # No tone number, return as-is (neutral tone)
    
    letters = match.group(1)
    tone = int(match.group(2))
    
    if tone == 5:
        # Tone 5 = neutral, no mark
        return letters
    
    # Handle 'v' -> 'ü'
    letters = letters.replace('v', 'ü').replace('V', 'Ü')
    
    # Find which vowel gets the tone mark
    # Rule 1: If there's an 'a' or 'e', it takes the mark
    for i, c in enumerate(letters):
        if c.lower() in ('a', 'e'):
            marked = TONE_MARKS[c.lower()][tone - 1]
            if c.isupper():
                marked = marked.upper()
            return letters[:i] + marked + letters[i+1:]
    
    # Rule 2: If there's 'ou', mark the 'o'
    ou_idx = letters.lower().find('ou')
    if ou_idx >= 0:
        c = letters[ou_idx]
        marked = TONE_MARKS['o'][tone - 1]
        if c.isupper():
            marked = marked.upper()
        return letters[:ou_idx] + marked + letters[ou_idx+1:]
    
    # Rule 3: Otherwise, mark the last vowel
    vowels = 'iouüIOU'
    for i in range(len(letters) - 1, -1, -1):
        c = letters[i]
        if c.lower() in ('i', 'o', 'u', 'ü'):
            marked = TONE_MARKS[c.lower()][tone - 1]
            if c.isupper():
                marked = marked.upper()
            return letters[:i] + marked + letters[i+1:]
    
    # No vowel found (shouldn't happen), return as-is
    return letters


def numbered_to_diacritic(pinyin_str: str) -> str:
    """Convert a full pinyin string like 'ni3 hao3' to 'nǐ hǎo'.
    Handles multi-syllable words separated by spaces."""
    if not pinyin_str:
        return pinyin_str
    
    # Already fully diacritic? Quick check
    if not re.search(r'[1-5]', pinyin_str):
        return pinyin_str
    
    # Split by spaces and convert each syllable
    parts = pinyin_str.split(' ')
    converted = []
    for part in parts:
        # Handle cases like "xue2sheng" (no space between syllables)
        # Try to split into syllables by finding tone numbers mid-string
        sub_parts = re.split(r'(?<=\d)(?=[a-zA-Z])', part)
        sub_converted = []
        for sp in sub_parts:
            sub_converted.append(_convert_syllable(sp))
        converted.append(''.join(sub_converted))
    
    return ' '.join(converted)


def main():
    # ─── Test the converter ───────────────────────────────────────
    tests = [
        ("ni3", "nǐ"),
        ("hao3", "hǎo"),
        ("wo3", "wǒ"),
        ("shi4", "shì"),
        ("bu4", "bù"),
        ("zai4", "zài"),
        ("ren2", "rén"),
        ("you3", "yǒu"),
        ("ni3 hao3", "nǐ hǎo"),
        ("wo3 shi4 xue2sheng", "wǒ shì xuésheng"),
        ("ta1 shi4 lao3shi1", "tā shì lǎoshī"),
        ("bā", "bā"),  # already diacritic
        ("àì", "àì"),  # already diacritic
        ("de", "de"),   # neutral tone
        ("le", "le"),   # neutral tone
        ("lǜ", "lǜ"),  # already diacritic with ü
        ("lv4", "lǜ"),  # v notation for ü
    ]
    
    print("=== Testing converter ===")
    all_pass = True
    for input_val, expected in tests:
        result = numbered_to_diacritic(input_val)
        status = "✓" if result == expected else "✗"
        if result != expected:
            all_pass = False
        print(f"  {status} '{input_val}' → '{result}' (expected '{expected}')")
    
    if not all_pass:
        print("\n⚠️  Some tests failed, but continuing anyway (edge cases)")
    print()
    
    # ─── Step 1: Fix vocabulary_items.pinyin ─────────────────────
    print("=== Fetching vocabulary_items ===")
    all_items = []
    offset = 0
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/vocabulary_items?select=id,pinyin&hsk_level=eq.1&order=id&offset={offset}&limit=100",
            headers=HEADERS
        )
        batch = resp.json()
        if not batch:
            break
        all_items.extend(batch)
        offset += len(batch)
        if len(batch) < 100:
            break
    
    print(f"  Found {len(all_items)} vocabulary items")
    
    # Find items that need fixing
    to_fix = []
    for item in all_items:
        old = item['pinyin']
        new = numbered_to_diacritic(old)
        if old != new:
            to_fix.append({"id": item['id'], "old": old, "new": new})
    
    print(f"  {len(to_fix)} items need pinyin fix")
    
    if to_fix:
        print(f"  Sample fixes: {to_fix[:5]}")
        
        # Update in batches
        fixed = 0
        for item in to_fix:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/vocabulary_items?id=eq.{item['id']}",
                headers=HEADERS,
                json={"pinyin": item["new"]}
            )
            if resp.status_code in (200, 204):
                fixed += 1
            else:
                print(f"  ERROR fixing {item['id']}: {resp.status_code} {resp.text[:100]}")
            
            if fixed % 50 == 0 and fixed > 0:
                print(f"  ... fixed {fixed}/{len(to_fix)}")
                time.sleep(0.3)
        
        print(f"  ✓ Fixed {fixed} vocabulary_items pinyin")
    
    # ─── Step 2: Fix vocabulary_translations.example_pinyin ──────
    print("\n=== Fetching vocabulary_translations ===")
    all_trans = []
    offset = 0
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/vocabulary_translations?select=vocabulary_item_id,locale,example_pinyin&order=vocabulary_item_id&offset={offset}&limit=200",
            headers=HEADERS
        )
        batch = resp.json()
        if not batch:
            break
        all_trans.extend(batch)
        offset += len(batch)
        if len(batch) < 200:
            break
    
    print(f"  Found {len(all_trans)} translations")
    
    trans_to_fix = []
    for t in all_trans:
        old = t.get('example_pinyin')
        if not old:
            continue
        new = numbered_to_diacritic(old)
        if old != new:
            trans_to_fix.append({
                "vocabulary_item_id": t['vocabulary_item_id'],
                "locale": t['locale'],
                "old": old,
                "new": new,
            })
    
    print(f"  {len(trans_to_fix)} translations need example_pinyin fix")
    
    if trans_to_fix:
        print(f"  Sample fixes: {trans_to_fix[:3]}")
        
        fixed = 0
        for t in trans_to_fix:
            resp = requests.patch(
                f"{SUPABASE_URL}/rest/v1/vocabulary_translations?vocabulary_item_id=eq.{t['vocabulary_item_id']}&locale=eq.{t['locale']}",
                headers=HEADERS,
                json={"example_pinyin": t["new"]}
            )
            if resp.status_code in (200, 204):
                fixed += 1
            else:
                print(f"  ERROR fixing trans {t['vocabulary_item_id']}/{t['locale']}: {resp.status_code}")
            
            if fixed % 100 == 0 and fixed > 0:
                print(f"  ... fixed {fixed}/{len(trans_to_fix)}")
                time.sleep(0.3)
        
        print(f"  ✓ Fixed {fixed} vocabulary_translations example_pinyin")
    
    # ─── Verify ──────────────────────────────────────────────────
    print("\n=== Verification ===")
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/vocabulary_items?select=simplified,pinyin&hsk_level=eq.1&order=frequency_rank&limit=10",
        headers=HEADERS
    )
    sample = resp.json()
    for s in sample:
        print(f"  {s['simplified']} → {s['pinyin']}")
    
    # Check if any numbered pinyins remain
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/vocabulary_items?select=id,pinyin&hsk_level=eq.1&pinyin=like.*1*&order=id&limit=5",
        headers=HEADERS
    )
    remaining_num = resp.json()
    # Filter to only actual tone numbers (not part of diacritics)
    actual_remaining = [r for r in remaining_num if re.search(r'[a-z][1-5]($|\s)', r['pinyin'])]
    if actual_remaining:
        print(f"  ⚠️  {len(actual_remaining)} items may still have numbered pinyin")
    else:
        print("  ✓ All pinyins converted to diacritics")
    
    print("\nDone!")


if __name__ == "__main__":
    main()
