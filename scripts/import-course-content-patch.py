#!/usr/bin/env python3
"""
Import course content patch into Supabase.

Handles per-level JSON files (hsk4.json, hsk5.json, hsk6.json, hsk79.json)
with the following content types:
  - vocabulary_bank → vocabulary_items + vocabulary_translations
  - grammar_bank   → grammar_points + grammar_point_translations
  - character_bank  → characters + character_translations
  - modules[]       → modules + module_translations + lessons + lesson_translations
                       + lesson_vocabulary_items + lesson_grammar_points + lesson_characters

Usage:
  python3 scripts/import-course-content-patch.py tmp/patches/hsk4.json
  python3 scripts/import-course-content-patch.py tmp/patches/hsk6.json --dry-run
  python3 scripts/import-course-content-patch.py --all   # Import all 4 levels
"""

import json
import sys
import os
import hashlib
import urllib.request
import urllib.error

# ─── Config ─────────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwi"
    "cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4"
    "NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
)

# Course ID mapping
COURSE_MAP = {
    "hsk4":   {"course_id": "a0000000-0000-0000-0000-000000000004", "hsk_level": "4", "difficulty": 3},
    "hsk5":   {"course_id": "a0000000-0000-0000-0000-000000000005", "hsk_level": "5", "difficulty": 4},
    "hsk6":   {"course_id": "a0000000-0000-0000-0000-000000000006", "hsk_level": "6", "difficulty": 5},
    "hsk7_9": {"course_id": "a0000000-0000-0000-0000-000000000079", "hsk_level": "7", "difficulty": 5},
}

DRY_RUN = False
MODE = "full"  # "full", "chars-only", "lesson-chars-only"

# ─── UUID helpers ───────────────────────────────────────────────────────

def deterministic_uuid(namespace: str, key: str) -> str:
    """Generate a deterministic UUID v5-like string from namespace+key."""
    h = hashlib.sha256(f"{namespace}:{key}".encode()).hexdigest()
    return f"{h[:8]}-{h[8:12]}-4{h[13:16]}-a{h[17:20]}-{h[20:32]}"

# ─── Supabase REST helpers ──────────────────────────────────────────────

def supabase_post(table: str, rows: list, upsert: bool = True) -> bool:
    if DRY_RUN:
        print(f"    [DRY-RUN] Would upsert {len(rows)} rows into {table}")
        return True
    if not rows:
        return True
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    data = json.dumps(rows).encode("utf-8")
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates" if upsert else "return=minimal",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode() in (200, 201, 204)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"    ✗ {table}: HTTP {e.code} – {body[:400]}")
        return False

def supabase_get(table: str, params: str) -> list:
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url, headers={
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except:
        return []

# ─── Import vocabulary ──────────────────────────────────────────────────

def import_vocabulary(vocab_bank: list, hsk_level: str, course_id: str) -> dict:
    """Import vocabulary items. Returns {hanzi: vocab_id} map."""
    print(f"\n  📖 Importing {len(vocab_bank)} vocabulary items...")
    
    # Check existing vocabulary to avoid duplicates
    existing = supabase_get("vocabulary_items", f"hsk_level=eq.{hsk_level}&select=id,simplified")
    existing_map = {v["simplified"]: v["id"] for v in existing}
    
    # Find max frequency_rank for this level
    all_items = supabase_get("vocabulary_items", f"hsk_level=eq.{hsk_level}&select=frequency_rank&order=frequency_rank.desc&limit=1")
    next_rank = (all_items[0]["frequency_rank"] + 1) if all_items else 1
    
    vocab_rows = []
    vocab_tr_rows = []
    hanzi_to_id = dict(existing_map)  # Start with existing
    
    new_count = 0
    skip_count = 0
    
    for i, v in enumerate(vocab_bank):
        hanzi = v["hanzi"]
        
        if hanzi in existing_map:
            skip_count += 1
            continue
        
        vid = deterministic_uuid(f"vocab-{hsk_level}", hanzi)
        hanzi_to_id[hanzi] = vid
        new_count += 1
        
        vocab_rows.append({
            "id": vid,
            "simplified": hanzi,
            "traditional": None,
            "pinyin": v["pinyin"],
            "audio_url": None,  # Will be filled by TTS later
            "hsk_level": hsk_level,
            "frequency_rank": next_rank + i,
            "radical": None,
            "stroke_count": None,
            "word_type": v.get("pos", ""),
            "theme": v.get("tags", ["general"])[0] if v.get("tags") else "general",
            "status": "published",
        })
        
        # French translation
        examples = v.get("examples", [])
        example_zh = examples[0] if examples else ""
        collocations = v.get("collocations", [])
        usage = ", ".join(collocations) if collocations else None
        
        vocab_tr_rows.append({
            "id": deterministic_uuid(f"vocab-tr-fr-{hsk_level}", hanzi),
            "vocabulary_id": vid,
            "locale": "fr",
            "meaning": v["fr"],
            "example_sentence": example_zh,
            "example_pinyin": "",
            "example_translation": "",
            "usage_notes": usage,
        })
    
    print(f"    New: {new_count}, Skipped (already exist): {skip_count}")
    
    if vocab_rows:
        ok = supabase_post("vocabulary_items", vocab_rows)
        print(f"    {'✓' if ok else '✗'} vocabulary_items upserted")
    if vocab_tr_rows:
        ok = supabase_post("vocabulary_translations", vocab_tr_rows)
        print(f"    {'✓' if ok else '✗'} vocabulary_translations upserted")
    
    return hanzi_to_id

# ─── Import grammar ────────────────────────────────────────────────────

def import_grammar(grammar_bank: list, hsk_level: str, difficulty: int) -> dict:
    """Import grammar points. Returns {json_id: grammar_point_id} map."""
    print(f"\n  📐 Importing {len(grammar_bank)} grammar points...")
    
    existing = supabase_get("grammar_points", f"hsk_level=eq.{hsk_level}&select=id,pattern")
    existing_patterns = {g["pattern"] for g in existing}
    
    # Find max sort_order
    all_gp = supabase_get("grammar_points", f"hsk_level=eq.{hsk_level}&select=sort_order&order=sort_order.desc&limit=1")
    next_order = (all_gp[0]["sort_order"] + 1) if all_gp else 1
    
    gp_rows = []
    gp_tr_rows = []
    id_map = {}
    
    new_count = 0
    skip_count = 0
    
    for i, g in enumerate(grammar_bank):
        pattern = g["pattern"]
        json_id = g.get("id", f"hsk{hsk_level}_g{i+1:02d}")
        
        # Check if pattern already exists
        if pattern in existing_patterns:
            # Find existing ID
            for eg in existing:
                if eg["pattern"] == pattern:
                    id_map[json_id] = eg["id"]
                    break
            skip_count += 1
            continue
        
        gid = deterministic_uuid(f"grammar-{hsk_level}", pattern)
        id_map[json_id] = gid
        new_count += 1
        
        gp_rows.append({
            "id": gid,
            "pattern": pattern,
            "hsk_level": hsk_level,
            "sort_order": next_order + i,
            "difficulty": difficulty,
            "status": "published",
        })
        
        examples = g.get("examples_zh", [])
        common_errors = g.get("common_traps_fr", [])
        
        gp_tr_rows.append({
            "id": deterministic_uuid(f"grammar-tr-fr-{hsk_level}", pattern),
            "grammar_point_id": gid,
            "locale": "fr",
            "title": g.get("title", pattern),
            "explanation_html": g.get("explanation_fr", ""),
            "examples": [{"zh": ex, "pinyin": "", "fr": ""} for ex in examples],
            "common_errors": common_errors,
        })
    
    print(f"    New: {new_count}, Skipped (already exist): {skip_count}")
    
    if gp_rows:
        ok = supabase_post("grammar_points", gp_rows)
        print(f"    {'✓' if ok else '✗'} grammar_points upserted")
    if gp_tr_rows:
        ok = supabase_post("grammar_point_translations", gp_tr_rows)
        print(f"    {'✓' if ok else '✗'} grammar_point_translations upserted")
    
    return id_map

# ─── Import characters ──────────────────────────────────────────────────

def import_characters(char_bank: list, hsk_level: str) -> dict:
    """Import characters. Returns {char: character_id} map.
    
    IMPORTANT: The `characters` table has a GLOBAL UNIQUE constraint on `character`.
    We must check ALL existing characters across ALL levels, not just the current level.
    For chars that already exist at another level, we reuse their existing ID.
    """
    print(f"\n  🔤 Importing {len(char_bank)} characters...")
    
    # GLOBAL check — fetch ALL existing characters, not just this level
    # Paginate to handle large tables (1000 per page)
    existing_map = {}
    offset = 0
    page_size = 1000
    while True:
        page = supabase_get("characters", f"select=id,character,hsk_level&offset={offset}&limit={page_size}")
        for c in page:
            existing_map[c["character"]] = c["id"]
        if len(page) < page_size:
            break
        offset += page_size
    print(f"    Global characters in DB: {len(existing_map)}")
    
    # Find max frequency_rank for THIS level
    all_chars = supabase_get("characters", f"hsk_level=eq.{hsk_level}&select=frequency_rank&order=frequency_rank.desc.nullslast&limit=1")
    next_rank = ((all_chars[0]["frequency_rank"] or 0) + 1) if all_chars else 1
    
    char_rows = []
    char_tr_rows = []
    char_to_id = dict(existing_map)
    
    new_count = 0
    skip_count = 0
    
    for i, c in enumerate(char_bank):
        ch = c["char"]
        
        if ch in existing_map:
            # Reuse existing ID — char exists at some level
            char_to_id[ch] = existing_map[ch]
            skip_count += 1
            continue
        
        cid = deterministic_uuid(f"char-{hsk_level}", ch)
        char_to_id[ch] = cid
        new_count += 1
        
        # Estimate stroke_count from common chars (required NOT NULL)
        stroke_est = len(ch.encode('utf-8'))  # rough fallback: 3 bytes per char ≈ 8-12 strokes
        # Better estimation: use Unicode CJK stroke count lookup
        stroke_map = {
            "安":6,"保":9,"材":7,"成":6,"改":7,"关":6,"积":10,"技":7,"经":8,"精":14,
            "决":6,"困":7,"理":11,"量":12,"密":11,"判":7,"趋":12,"实":8,"视":8,"势":8,
            "属":12,"思":9,"特":10,"系":7,"效":10,"续":11,"研":9,"因":6,"质":8,"层":7,
            "论":6,"证":7,"策":12,"辩":16,"促":9,"阐":11,"悖":10,"惯":11,"涵":11,
            "鉴":13,"谨":13,"框":11,"脉":9,"默":16,"偏":11,"歧":7,"诠":11,"隐":11,
            "韵":13,"障":13,"衷":10,"综":11,"尊":12,"兼":10,"概":13,"累":11,"竞":10,
        }
        sc = stroke_map.get(ch, max(6, min(16, len(ch.encode('utf-8')))))
        
        char_rows.append({
            "id": cid,
            "character": ch,
            "pinyin": c.get("pinyin", ""),
            "radical": None,
            "stroke_count": sc,
            "hsk_level": hsk_level,
            "frequency_rank": next_rank + i,
            "decomposition": None,
            "audio_url": None,  # Will be filled by TTS later
            "status": "published",
        })
        
        key_words = c.get("key_words", [])
        note = c.get("note_fr", "")
        meaning = note if note else ", ".join(key_words)
        
        char_tr_rows.append({
            "id": deterministic_uuid(f"char-tr-fr-{hsk_level}", ch),
            "character_id": cid,
            "locale": "fr",
            "meaning": meaning,
            "mnemonic": None,
        })
    
    print(f"    New: {new_count}, Skipped (already exist): {skip_count}")
    
    if char_rows:
        ok = supabase_post("characters", char_rows)
        print(f"    {'✓' if ok else '✗'} characters upserted")
    if char_tr_rows:
        ok = supabase_post("character_translations", char_tr_rows)
        print(f"    {'✓' if ok else '✗'} character_translations upserted")
    
    return char_to_id

# ─── Import modules + lessons ───────────────────────────────────────────

def import_modules(modules_data: list, course_id: str, hsk_level: str,
                   vocab_map: dict, grammar_map: dict, char_map: dict):
    """Import modules with their lessons and junction table links."""
    print(f"\n  📚 Importing {len(modules_data)} modules...")
    
    # Get existing modules to find max sort_order
    existing_mods = supabase_get("modules", f"course_id=eq.{course_id}&select=id,sort_order&order=sort_order.desc&limit=1")
    next_mod_order = (existing_mods[0]["sort_order"] + 1) if existing_mods else 1
    
    mod_rows = []
    mod_tr_rows = []
    lesson_rows = []
    lesson_tr_rows = []
    lvi_rows = []  # lesson_vocabulary_items
    lgp_rows = []  # lesson_grammar_points
    lc_rows = []   # lesson_characters
    
    total_lessons = 0
    
    for mi, mod in enumerate(modules_data):
        mod_id = deterministic_uuid(f"module-{hsk_level}", mod["id"])
        mod_order = next_mod_order + mi
        
        lessons = mod.get("lessons", [])
        est_duration = max(15, len(lessons) * 20)
        
        mod_rows.append({
            "id": mod_id,
            "course_id": course_id,
            "sort_order": mod_order,
            "status": "published",
            "estimated_duration_minutes": est_duration,
        })
        
        mod_tr_rows.append({
            "id": deterministic_uuid(f"module-tr-fr-{hsk_level}", mod["id"]),
            "module_id": mod_id,
            "locale": "fr",
            "title": mod["title_fr"],
            "description": mod.get("description_fr", ""),
            "objectives": None,
        })
        
        for li, lesson in enumerate(lessons):
            lesson_id = deterministic_uuid(f"lesson-{hsk_level}", lesson["id"])
            total_lessons += 1
            
            objectives = lesson.get("learning_objectives_fr", [])
            
            lesson_rows.append({
                "id": lesson_id,
                "module_id": mod_id,
                "sort_order": li + 1,
                "lesson_type": "standard",
                "status": "published",
                "estimated_duration_minutes": 20,
                "prerequisites": None,
            })
            
            # Build content_html from practice_sequence
            content_parts = []
            for obj in objectives:
                content_parts.append(f"<li>{obj}</li>")
            objectives_html = f"<ul>{''.join(content_parts)}</ul>" if content_parts else ""
            
            practice = lesson.get("practice_sequence", [])
            practice_html = ""
            if practice:
                practice_parts = []
                for p in practice:
                    practice_parts.append(f"<li><strong>{p.get('type','')}</strong>: {p.get('prompt_fr','')}</li>")
                practice_html = f"<h3>Exercices</h3><ul>{''.join(practice_parts)}</ul>"
            
            lesson_tr_rows.append({
                "id": deterministic_uuid(f"lesson-tr-fr-{hsk_level}", lesson["id"]),
                "lesson_id": lesson_id,
                "locale": "fr",
                "title": lesson["title_fr"],
                "description": "; ".join(objectives) if objectives else "",
                "content_html": objectives_html + practice_html,
            })
            
            # Junction: lesson ↔ vocabulary
            for vi, vhanzi in enumerate(lesson.get("linked_vocabulary", [])):
                vid = vocab_map.get(vhanzi)
                if vid:
                    lvi_rows.append({
                        "id": deterministic_uuid(f"lvi-{hsk_level}", f"{lesson['id']}:{vhanzi}"),
                        "lesson_id": lesson_id,
                        "vocabulary_item_id": vid,
                        "sort_order": vi + 1,
                    })
            
            # Junction: lesson ↔ grammar
            for gi, gref in enumerate(lesson.get("linked_grammar", [])):
                gid = grammar_map.get(gref)
                if gid:
                    lgp_rows.append({
                        "id": deterministic_uuid(f"lgp-{hsk_level}", f"{lesson['id']}:{gref}"),
                        "lesson_id": lesson_id,
                        "grammar_point_id": gid,
                        "sort_order": gi + 1,
                    })
            
            # Junction: lesson ↔ characters
            for ci, ch in enumerate(lesson.get("linked_characters", [])):
                cid = char_map.get(ch)
                if cid:
                    lc_rows.append({
                        "id": deterministic_uuid(f"lc-{hsk_level}", f"{lesson['id']}:{ch}"),
                        "lesson_id": lesson_id,
                        "character_id": cid,
                        "sort_order": ci + 1,
                    })
    
    print(f"    Modules: {len(mod_rows)}, Lessons: {total_lessons}")
    print(f"    Vocab links: {len(lvi_rows)}, Grammar links: {len(lgp_rows)}, Char links: {len(lc_rows)}")
    
    # Insert in dependency order
    if mod_rows:
        ok = supabase_post("modules", mod_rows)
        print(f"    {'✓' if ok else '✗'} modules upserted")
    if mod_tr_rows:
        ok = supabase_post("module_translations", mod_tr_rows)
        print(f"    {'✓' if ok else '✗'} module_translations upserted")
    if lesson_rows:
        ok = supabase_post("lessons", lesson_rows)
        print(f"    {'✓' if ok else '✗'} lessons upserted")
    if lesson_tr_rows:
        ok = supabase_post("lesson_translations", lesson_tr_rows)
        print(f"    {'✓' if ok else '✗'} lesson_translations upserted")
    
    # Junction tables (chunked)
    for rows, table in [(lvi_rows, "lesson_vocabulary_items"),
                         (lgp_rows, "lesson_grammar_points"),
                         (lc_rows, "lesson_characters")]:
        if rows:
            for i in range(0, len(rows), 50):
                chunk = rows[i:i+50]
                ok = supabase_post(table, chunk)
                if not ok:
                    print(f"    ✗ {table} batch {i//50+1} failed")
                    break
            else:
                print(f"    ✓ {table} upserted ({len(rows)} links)")


# ─── Process a single patch file ────────────────────────────────────────

def process_patch(filepath: str):
    print(f"\n{'='*60}")
    print(f"  Processing: {os.path.basename(filepath)} [mode={MODE}]")
    print(f"{'='*60}")
    
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    course_key = data.get("course_id", "")
    
    if course_key not in COURSE_MAP:
        print(f"  ✗ Unknown course_id: {course_key}")
        print(f"    Valid keys: {list(COURSE_MAP.keys())}")
        return False
    
    cfg = COURSE_MAP[course_key]
    course_id = cfg["course_id"]
    hsk_level = cfg["hsk_level"]
    difficulty = cfg["difficulty"]
    content = data["content"]
    
    print(f"  Course: {course_key} → {course_id}")
    print(f"  HSK Level: {hsk_level}, Difficulty: {difficulty}")
    print(f"  Goal: {content.get('patch_goal_fr', '(none)')}")
    
    # ── chars-only mode: only import characters + translations ──
    if MODE == "chars-only":
        char_map = {}
        if "character_bank" in content:
            char_map = import_characters(content["character_bank"], hsk_level)
        print(f"\n  ✅ Chars-only patch {course_key} complete! ({len(char_map)} chars in map)")
        return True
    
    # ── lesson-chars-only mode: rebuild lesson_characters junctions ──
    if MODE == "lesson-chars-only":
        # Build char_map from what's in DB now (no new inserts)
        char_map = {}
        if "character_bank" in content:
            existing_map = {}
            offset = 0
            while True:
                page = supabase_get("characters", f"select=id,character&offset={offset}&limit=1000")
                for c in page:
                    existing_map[c["character"]] = c["id"]
                if len(page) < 1000:
                    break
                offset += 1000
            for c in content["character_bank"]:
                ch = c["char"]
                if ch in existing_map:
                    char_map[ch] = existing_map[ch]
        
        # Now only insert lesson_characters links from modules
        if "modules" in content:
            import_lesson_chars_only(content["modules"], course_id, hsk_level, char_map)
        
        print(f"\n  ✅ Lesson-chars-only patch {course_key} complete!")
        return True
    
    # ── full mode ──
    # Phase 1: Vocabulary
    vocab_map = {}
    if "vocabulary_bank" in content:
        vocab_map = import_vocabulary(content["vocabulary_bank"], hsk_level, course_id)
    
    # Phase 2: Grammar
    grammar_map = {}
    if "grammar_bank" in content:
        grammar_map = import_grammar(content["grammar_bank"], hsk_level, difficulty)
    
    # Phase 3: Characters
    char_map = {}
    if "character_bank" in content:
        char_map = import_characters(content["character_bank"], hsk_level)
    
    # Phase 4: Modules + Lessons
    if "modules" in content:
        import_modules(content["modules"], course_id, hsk_level,
                       vocab_map, grammar_map, char_map)
    
    print(f"\n  ✅ Patch {course_key} complete!")
    return True


# ─── Main ───────────────────────────────────────────────────────────────

def import_lesson_chars_only(modules_data: list, course_id: str, hsk_level: str, char_map: dict):
    """Only insert lesson_characters junction links (for re-run after chars fix)."""
    print(f"\n  🔗 Re-linking lesson_characters for {len(modules_data)} modules...")
    
    lc_rows = []
    for mi, mod in enumerate(modules_data):
        mod_id = deterministic_uuid(f"module-{hsk_level}", mod["id"])
        for li, lesson in enumerate(mod.get("lessons", [])):
            lesson_id = deterministic_uuid(f"lesson-{hsk_level}", lesson["id"])
            for ci, ch in enumerate(lesson.get("linked_characters", [])):
                cid = char_map.get(ch)
                if cid:
                    lc_rows.append({
                        "id": deterministic_uuid(f"lc-{hsk_level}", f"{lesson['id']}:{ch}"),
                        "lesson_id": lesson_id,
                        "character_id": cid,
                        "sort_order": ci + 1,
                    })
                else:
                    print(f"    ⚠ Char '{ch}' not found in char_map for lesson {lesson['id']}")
    
    if lc_rows:
        for i in range(0, len(lc_rows), 50):
            chunk = lc_rows[i:i+50]
            ok = supabase_post("lesson_characters", chunk)
            if not ok:
                print(f"    ✗ lesson_characters batch {i//50+1} failed")
                break
        else:
            print(f"    ✓ lesson_characters upserted ({len(lc_rows)} links)")
    else:
        print("    (no lesson_characters links to insert)")


def main():
    global DRY_RUN, MODE
    
    args = sys.argv[1:]
    
    if "--dry-run" in args:
        DRY_RUN = True
        args.remove("--dry-run")
        print("🏜️ DRY-RUN mode — no data will be written")
    
    if "--chars-only" in args:
        MODE = "chars-only"
        args.remove("--chars-only")
        print("🔤 CHARS-ONLY mode — only importing characters + translations")
    
    if "--lesson-chars-only" in args:
        MODE = "lesson-chars-only"
        args.remove("--lesson-chars-only")
        print("🔗 LESSON-CHARS-ONLY mode — only inserting lesson_characters links")
    
    if "--all" in args:
        # Process all 4 patch files
        patch_dir = os.path.join(os.path.expanduser("~"), "webapp", "tmp", "patches")
        files = [
            os.path.join(patch_dir, "hsk4.json"),
            os.path.join(patch_dir, "hsk5.json"),
            os.path.join(patch_dir, "hsk6.json"),
            os.path.join(patch_dir, "hsk79.json"),
        ]
        for f in files:
            if os.path.exists(f):
                process_patch(f)
            else:
                print(f"⚠ File not found: {f}")
    elif args:
        for filepath in args:
            if os.path.exists(filepath):
                process_patch(filepath)
            else:
                print(f"⚠ File not found: {filepath}")
    else:
        print("Usage:")
        print("  python3 scripts/import-course-content-patch.py <file.json>")
        print("  python3 scripts/import-course-content-patch.py --all")
        print("  python3 scripts/import-course-content-patch.py --all --dry-run")
        sys.exit(1)
    
    print(f"\n{'='*60}")
    print("  🎉 All patches processed!")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
