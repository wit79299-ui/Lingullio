#!/usr/bin/env python3
"""
Fix HSK2/HSK3 character insertion.
The `characters` table has UNIQUE constraint on `character` column.
Many HSK2/3 characters overlap with HSK1.

Strategy:
1. Fetch all existing characters from DB to get their IDs
2. Only INSERT new characters that don't exist yet
3. Add translations and stroke data for ALL characters (new + existing)
"""

import json, re, urllib.request, urllib.error

URL = 'https://gmpjkoajhhwvxwsdohll.supabase.co'
KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc'
HEADERS = {'apikey': KEY, 'Authorization': f'Bearer {KEY}', 'Content-Type': 'application/json'}
BASE = '/home/user/uploaded_files/hsk_content'

def api_post(table, data, extra_headers=None):
    h = {**HEADERS}
    if extra_headers: h.update(extra_headers)
    body = json.dumps(data).encode()
    req = urllib.request.Request(f'{URL}/rest/v1/{table}', data=body, headers=h, method='POST')
    try:
        resp = urllib.request.urlopen(req)
        return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

def api_upsert(table, data, conflict_cols):
    return api_post(f'{table}?on_conflict={conflict_cols}', data, {'Prefer': 'resolution=merge-duplicates'})

def api_upsert_batch(table, data, conflict_cols, batch_size=50):
    ok, err = 0, 0
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        code, body = api_upsert(table, batch, conflict_cols)
        if code in (200, 201):
            ok += len(batch)
        else:
            msg = body.decode()[:300] if isinstance(body, bytes) else str(body)[:300]
            print(f"    ERR {table} [{i}]: {code} - {msg}")
            err += len(batch)
    return ok, err

# ─── Step 1: Fetch all existing characters from DB ───
print("Step 1: Fetching existing characters...")
existing_chars = {}  # character → id
offset = 0
while True:
    req = urllib.request.Request(
        f'{URL}/rest/v1/characters?select=id,character&order=id&offset={offset}&limit=1000',
        headers=HEADERS
    )
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    if not data:
        break
    for d in data:
        existing_chars[d['character']] = d['id']
    offset += 1000

print(f"  Found {len(existing_chars)} existing characters in DB")

# Also check existing stroke_order_data
existing_strokes = set()
offset = 0
while True:
    req = urllib.request.Request(
        f'{URL}/rest/v1/stroke_order_data?select=character_id&order=character_id&offset={offset}&limit=1000',
        headers=HEADERS
    )
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    if not data:
        break
    for d in data:
        existing_strokes.add(d['character_id'])
    offset += 1000

print(f"  Found {len(existing_strokes)} existing stroke records")

# ─── Step 2: Extract characters from HTML files ───
print("\nStep 2: Extracting characters from HTML files...")

def extract_words_from_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    m = re.search(r'const WORDS\s*=\s*(\[.*?\]);', html, re.DOTALL)
    if not m:
        raise ValueError(f"WORDS array not found in {filepath}")
    return json.loads(m.group(1))

def char_id_new(level, n):
    return f"f0{level:06d}-0000-0000-0000-{n:012d}"

def stroke_id_new(level, n):
    return f"f1{level:06d}-0000-0000-0000-{n:012d}"

for level, filename in [(2, 'HSK2-Vocabulaire-Vivant.html'), (3, 'HSK3-Vocabulaire-Vivant.html')]:
    words = extract_words_from_html(f'{BASE}/{filename}')
    print(f"\n  HSK{level}: {len(words)} words")
    
    # Collect unique characters
    char_map = {}  # char → (word_idx, char_data)
    for word_idx, w in enumerate(words):
        for cd in w.get('chars', []):
            ch = cd.get('char', '')
            if ch and ch not in char_map:
                char_map[ch] = (word_idx, cd)
    
    print(f"  Unique characters: {len(char_map)}")
    
    # Separate new vs existing
    new_chars = {}
    reused_chars = {}
    
    new_char_counter = 0
    for ch, (word_idx, cd) in char_map.items():
        if ch in existing_chars:
            reused_chars[ch] = existing_chars[ch]  # Use existing DB id
        else:
            new_char_counter += 1
            new_id = char_id_new(level, new_char_counter)
            new_chars[ch] = new_id
            existing_chars[ch] = new_id  # Track for next level
    
    print(f"  New characters to insert: {len(new_chars)}")
    print(f"  Reusing existing HSK1 characters: {len(reused_chars)}")
    
    # Insert new characters
    if new_chars:
        chars_data = []
        for ch, cid in new_chars.items():
            word_idx, cd = char_map[ch]
            chars_data.append({
                'id': cid,
                'character': ch,
                'pinyin': cd.get('pinyin', ''),
                'stroke_count': len(cd.get('strokes', [])),
                'hsk_level': str(level),
                'frequency_rank': None,
                'status': 'published',
            })
        ok, err = api_upsert_batch('characters', chars_data, 'id')
        print(f"  New characters inserted: {ok} ok, {err} err")
    
    # Build full char→id map for this level
    full_char_map = {**reused_chars, **new_chars}
    
    # Insert translations for ALL characters (new + reused)
    trans_fr = []
    trans_en = []
    for ch, (word_idx, cd) in char_map.items():
        cid = full_char_map[ch]
        parent_word = words[word_idx]
        fr_meaning = parent_word.get('meaning', {}).get('fr', '')
        
        trans_fr.append({
            'character_id': cid,
            'locale': 'fr',
            'meaning': f"Composant de « {parent_word['word']} » ({fr_meaning})",
        })
        trans_en.append({
            'character_id': cid,
            'locale': 'en',
            'meaning': f"Component of '{parent_word['word']}' ({fr_meaning})",
        })
    
    # Use upsert on character_id,locale to handle existing translations
    ok, err = api_upsert_batch('character_translations', trans_fr, 'character_id,locale')
    print(f"  Character translations FR: {ok} ok, {err} err")
    ok, err = api_upsert_batch('character_translations', trans_en, 'character_id,locale')
    print(f"  Character translations EN: {ok} ok, {err} err")
    
    # Insert stroke data for characters that don't have it yet
    strokes_data = []
    stroke_counter = 0
    for ch, (word_idx, cd) in char_map.items():
        cid = full_char_map[ch]
        if cid in existing_strokes:
            continue  # Already has stroke data
        if not cd.get('strokes'):
            continue
        
        stroke_counter += 1
        sid = stroke_id_new(level, stroke_counter)
        strokes_data.append({
            'id': sid,
            'character_id': cid,
            'strokes': cd.get('strokes', []),
            'medians': cd.get('medians', []),
            'source': 'makemeahanzi',
        })
    
    if strokes_data:
        ok, err = api_upsert_batch('stroke_order_data', strokes_data, 'id')
        print(f"  Stroke data: {ok} ok, {err} err (skipped {len(char_map) - len(strokes_data)} already existing)")
    else:
        print(f"  Stroke data: all {len(char_map)} already have strokes")

# ─── Final verification ───
print("\n" + "=" * 50)
print("Final character counts:")
for table in ['characters', 'character_translations', 'stroke_order_data']:
    req = urllib.request.Request(
        f'{URL}/rest/v1/{table}?select=id&limit=1',
        headers={**HEADERS, 'Prefer': 'count=exact', 'Range': '0-0'}
    )
    resp = urllib.request.urlopen(req)
    cr = resp.headers.get('Content-Range', '?')
    print(f"  {table}: {cr}")

print("\nDone!")
