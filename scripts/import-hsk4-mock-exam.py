#!/usr/bin/env python3
"""
Import HSK 4 Mock Exam (real conditions, 100 questions) into Supabase.

HSK4 structure (official new format):
- Listening (45q): Part1 picture choice (10), Part2+3 audio MCQ text (35)
- Reading (40q):   Part1+2 fill-blank MCQ (20), Part3+4 reading MCQ (20)
- Writing (15q):   Part1 reorder words (10), Part2 picture prompt writing (5)
Total: 100 questions, 300 points, passing 180, ~95 minutes

Tables involved:
- exercises, exercise_translations, exercise_options, exercise_option_translations
- mock_exams, mock_exam_translations
- mock_exam_sections, mock_exam_section_translations
- mock_exam_questions

UUID conventions for HSK4 mock exam (uses 0004 pattern):
- Mock exam:    d0e00100-0004-4000-a000-000000000001
- Sections:     d0e00110-0004-4000-a000-{section_order:012d}
- Exercises:    d0e00120-0004-4000-a000-{question_number:012d}
- Options:      d0e00130-0004-4{q:03d}-a{opt:03d}-000000000001
- Ex transl:    d0e00141-0004-4{q:03d}-a000-{n:012d}
- Opt transl:   d0e00142-0004-4{q:03d}-a{opt:03d}-{n:012d}
- Sec transl:   d0e00143-0004-4{sec:03d}-a000-{n:012d}
- Exam transl:  d0e00144-0004-4000-a000-{n:012d}
- Questions:    d0e00150-0004-4000-a000-{q:012d}
"""

import json
import sys
import urllib.request
import urllib.error
import os

# ─── Config ─────────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwi"
    "cm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4"
    "NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
)

COURSE_ID = "a0000000-0000-0000-0000-000000000004"  # HSK-4
MOCK_EXAM_ID = "d0e00100-0004-4000-a000-000000000001"

JSON_PATH = os.path.join(
    os.path.expanduser("~"),
    "webapp", "tmp", "hsk4",
    "hsk4_mock_exam_real_conditions_01_v3_premium_with_image_mapping.json",
)

TOTAL_QUESTIONS = 100
NUM_SECTIONS = 3  # listening, reading, writing

# ─── UUID Helpers ───────────────────────────────────────────────────────

def section_uuid(order: int) -> str:
    return f"d0e00110-0004-4000-a000-{order:012d}"

def exercise_uuid(q: int) -> str:
    return f"d0e00120-0004-4000-a000-{q:012d}"

def option_uuid(q: int, opt_order: int) -> str:
    return f"d0e00130-0004-4{q:03d}-a{opt_order:03d}-000000000001"

def ex_translation_uuid(q: int, n: int = 1) -> str:
    return f"d0e00141-0004-4{q:03d}-a000-{n:012d}"

def opt_translation_uuid(q: int, opt_order: int, n: int = 1) -> str:
    return f"d0e00142-0004-4{q:03d}-a{opt_order:03d}-{n:012d}"

def section_translation_uuid(sec: int, n: int = 1) -> str:
    return f"d0e00143-0004-4{sec:03d}-a000-{n:012d}"

def mock_exam_translation_uuid(n: int = 1) -> str:
    return f"d0e00144-0004-4000-a000-{n:012d}"

def mock_exam_question_uuid(q: int) -> str:
    return f"d0e00150-0004-4000-a000-{q:012d}"

# ─── Supabase REST helpers ──────────────────────────────────────────────

def supabase_post(table: str, rows: list, upsert: bool = True) -> bool:
    """POST rows to Supabase REST API. Returns True on success."""
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
        print(f"  ✗ {table}: HTTP {e.code} – {body[:400]}")
        return False

def supabase_delete(table: str, filter_str: str) -> bool:
    """DELETE rows matching filter."""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filter_str}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
    }
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.getcode() in (200, 204)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  ✗ DELETE {table}: {e.code} – {body[:200]}")
        return False

# ─── Exercise type mapping ──────────────────────────────────────────────
# Maps JSON type → Supabase exercise_type enum

TYPE_MAP = {
    # Listening
    "picture_choice": "mcq",           # Part 1: 4 image options A/B/C/D
    "audio_mcq_text": "mcq",           # Part 2+3: 3 text options with audio
    # Reading
    "fill_blank_mcq": "fill_blank",    # Part 1+2: sentence with blank, 4 options
    "reading_mcq": "mcq",              # Part 3+4: passage + question, 3 options
    # Writing
    "reorder_words": "reorder",                   # Part 1: reorder word tiles
    "picture_prompt_writing": "controlled_translation",  # Part 2: free writing from image+keyword (5pts)
}

# ─── Image path helpers ─────────────────────────────────────────────────
# HSK4 picture_choice: each question has its own 4 images (A/B/C/D),
# unlike HSK3 which had a shared bank.

def get_image_url(q_num: int, label: str) -> str:
    """Get the static URL for a picture_choice option image."""
    return f"/static/mock-exam/hsk4/hsk4_l_p1_q{q_num:02d}_{label}.webp"

# ─── Build exercise metadata ───────────────────────────────────────────

def build_metadata(item: dict, section_type: str) -> dict:
    """Build the JSONB metadata for an exercise."""
    meta = {
        "mock_exam_type": item["type"],
        "section": section_type,
        "part": item["part"],
    }

    # Audio data (listening questions)
    if "audio" in item:
        meta["audio"] = {
            "script_hanzi": item["audio"]["transcript_zh"],
            "script_pinyin": item["audio"].get("transcript_pinyin", ""),
            "repeat_count": item["audio"].get("play_count", 2),
        }

    # Stimulus (reading/writing questions)
    if "stimulus" in item:
        meta["stimulus"] = item["stimulus"]

    # Review/explanation
    if "review" in item:
        meta["review"] = item["review"]

    # Exam display info (crucial for rendering)
    if "exam_display" in item:
        meta["exam_display"] = item["exam_display"]

    # Scoring rubric (writing section)
    if "scoring" in item:
        meta["scoring_info"] = item["scoring"]

    # For picture_choice: store image URLs in metadata
    if item["type"] == "picture_choice":
        q_num = item["order"]
        meta["image_options"] = {}
        for opt in item["exam_display"]["image_options"]:
            label = opt["id"]
            meta["image_options"][label] = {
                "url": get_image_url(q_num, label),
                "prompt": opt["image_prompt"],
            }

    # For picture_prompt_writing: store image prompt in metadata
    if item["type"] == "picture_prompt_writing":
        stim = item.get("stimulus", {})
        meta["keyword_phrase_zh"] = stim.get("keyword_phrase_zh", "")
        meta["image_prompt"] = stim.get("image_prompt", "")

    return meta


def build_options(item: dict) -> list:
    """Build option list for an exercise."""
    options = []
    answer = item["correct_answer"]
    item_type = item["type"]
    q_num = item["order"]

    if item_type == "picture_choice":
        # Part 1: 4 image options A/B/C/D (each question has its own images)
        for i, opt in enumerate(item["exam_display"]["image_options"]):
            label = opt["id"]  # A, B, C, D
            options.append({
                "id": label,
                "content": label,
                "content_detail": opt.get("image_prompt", ""),
                "image_url": get_image_url(q_num, label),
                "is_correct": label == answer,
                "sort_order": i + 1,
            })

    elif item_type == "audio_mcq_text":
        # Part 2+3: 3 text options A/B/C with zh + pinyin
        for i, opt in enumerate(item["exam_display"]["options"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt["zh"],
                "content_hanzi": opt["zh"],
                "content_pinyin": opt.get("pinyin", ""),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "fill_blank_mcq":
        # Reading Part 1+2: 4 text options A/B/C/D with zh + pinyin
        for i, opt in enumerate(item["exam_display"]["options"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt["zh"],
                "content_hanzi": opt["zh"],
                "content_pinyin": opt.get("pinyin", ""),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "reading_mcq":
        # Reading Part 3+4: 3 text options A/B/C
        for i, opt in enumerate(item["exam_display"]["options"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt["zh"],
                "content_hanzi": opt["zh"],
                "content_pinyin": opt.get("pinyin", ""),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "reorder_words":
        # Writing Part 1: Word tiles as individual options (for reorder UI)
        tiles = item["stimulus"]["word_bank"]
        for i, tile in enumerate(tiles):
            options.append({
                "id": str(i + 1),
                "content": tile,
                "content_hanzi": tile,
                "is_correct": True,  # All tiles are part of the answer
                "sort_order": i + 1,
            })

    elif item_type == "picture_prompt_writing":
        # Writing Part 2: Free writing — no options to choose from
        # Store the model answer as a single "reference" option
        model_answer = item.get("review", {}).get("model_answer_zh", "")
        if model_answer:
            options.append({
                "id": "model",
                "content": model_answer,
                "content_hanzi": model_answer,
                "is_correct": True,
                "sort_order": 1,
            })

    return options


def build_prompt_fr(item: dict) -> str:
    """Build the French prompt/instruction for the exercise translation."""
    item_type = item["type"]
    ed = item.get("exam_display", {})

    if item_type == "picture_choice":
        return ed.get("instruction_fr", "Choisis l'image qui correspond au dialogue.")

    elif item_type == "audio_mcq_text":
        return ed.get("instruction_fr", "Choisis la bonne réponse.")

    elif item_type == "fill_blank_mcq":
        stimulus = item.get("stimulus", {}).get("hanzi", "")
        return f"{ed.get('instruction_fr', 'Complète la phrase.')}\n{stimulus}"

    elif item_type == "reading_mcq":
        passage = item.get("stimulus", {}).get("passage_hanzi", "")
        question = item.get("stimulus", {}).get("question_hanzi", "")
        return f"{ed.get('instruction_fr', 'Lis le texte et réponds.')}\n{passage}\n★ {question}"

    elif item_type == "reorder_words":
        tiles = " / ".join(item.get("stimulus", {}).get("word_bank", []))
        return f"{ed.get('instruction_fr', 'Remets les mots dans le bon ordre.')}\n{tiles}"

    elif item_type == "picture_prompt_writing":
        keyword = item.get("stimulus", {}).get("keyword_phrase_zh", "")
        return f"{ed.get('instruction_fr', 'Écris une ou plusieurs phrases.')}\n关键词：{keyword}"

    return ""


def build_instruction_fr(item: dict) -> str:
    """Get the French instruction for this item's part."""
    return item.get("exam_display", {}).get("instruction_fr", "")


# ─── Main import logic ──────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  HSK 4 Mock Exam Import — 100 questions")
    print("=" * 60)

    # Load JSON
    print(f"\n📄 Loading JSON from {JSON_PATH}")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    exam = data["mock_exam"]
    sections_data = exam["sections"]
    # Filter out "answer_transfer" section which has no items
    sections_data = [s for s in sections_data if s.get("items")]

    total_items = sum(len(s["items"]) for s in sections_data)
    print(f"   Exam: {exam['id']}")
    print(f"   Sections with items: {len(sections_data)}")
    print(f"   Total questions: {total_items}")

    if total_items != TOTAL_QUESTIONS:
        print(f"   ⚠ Expected {TOTAL_QUESTIONS} questions, got {total_items}")

    # ─── Step 0: Clean up any previous import ───────────────────────────
    print("\n🧹 Cleaning up previous HSK4 mock exam import...")
    
    # Delete mock exam question links (all 3 sections)
    for sec_order in range(1, NUM_SECTIONS + 1):
        supabase_delete("mock_exam_questions", f"section_id=eq.{section_uuid(sec_order)}")
    
    # Delete section translations and sections
    for sec_order in range(1, NUM_SECTIONS + 1):
        supabase_delete("mock_exam_section_translations", f"section_id=eq.{section_uuid(sec_order)}")
    supabase_delete("mock_exam_sections", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    
    # Delete exam translations and exam
    supabase_delete("mock_exam_translations", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    supabase_delete("mock_exams", f"id=eq.{MOCK_EXAM_ID}")
    
    # Clean exercise-related data
    for q in range(1, TOTAL_QUESTIONS + 1):
        eid = exercise_uuid(q)
        # Delete option translations and options (up to 10 options for word banks)
        for o in range(1, 11):
            oid = option_uuid(q, o)
            supabase_delete("exercise_option_translations", f"option_id=eq.{oid}")
        supabase_delete("exercise_options", f"exercise_id=eq.{eid}")
        supabase_delete("exercise_translations", f"exercise_id=eq.{eid}")
        supabase_delete("exercises", f"id=eq.{eid}")
    
    print("   ✓ Cleanup done")

    # ─── Step 1: Create exercises ───────────────────────────────────────
    print("\n📝 Creating exercises...")

    all_exercises = []
    all_ex_translations = []
    all_ex_options = []
    all_opt_translations = []

    for section in sections_data:
        section_type = section["id"]  # "listening", "reading", or "writing"

        for item in section["items"]:
            q_num = item["order"]
            ex_id = exercise_uuid(q_num)
            ex_type = TYPE_MAP.get(item["type"], "mcq")

            # Skill tags
            skill_tags = [section_type]

            # Build metadata
            metadata = build_metadata(item, section_type)

            # Duration estimation by section/type
            if section_type == "listening":
                est_duration = 35  # listening items ~35s with replay
            elif section_type == "reading":
                if item["type"] == "reading_mcq":
                    est_duration = 60  # reading passages take longer
                else:
                    est_duration = 45  # fill-blank items ~45s
            else:
                if item["type"] == "picture_prompt_writing":
                    est_duration = 180  # free writing ~3min
                else:
                    est_duration = 60  # reorder ~60s

            # Points
            points = item.get("scoring", {}).get("raw_points", 1)

            # Exercise row
            exercise = {
                "id": ex_id,
                "lesson_id": None,
                "exercise_type": ex_type,
                "difficulty": 3,  # HSK4 is difficulty 3
                "points": points,
                "estimated_duration_seconds": est_duration,
                "audio_url": None,
                "image_url": None,
                "skill_tags": skill_tags,
                "hsk_level": "4",
                "sort_order": q_num,
                "status": "published",
                "metadata": metadata,
            }
            all_exercises.append(exercise)

            # Exercise translation (French)
            prompt = build_prompt_fr(item)
            instruction = build_instruction_fr(item)
            explanation = item.get("review", {}).get("explanation_fr", "")

            ex_tr = {
                "id": ex_translation_uuid(q_num),
                "exercise_id": ex_id,
                "locale": "fr",
                "prompt": prompt,
                "instruction": instruction,
                "explanation": explanation,
                "hint": None,
            }
            all_ex_translations.append(ex_tr)

            # Options
            options = build_options(item)
            for opt in options:
                opt_order = opt["sort_order"]
                opt_id = option_uuid(q_num, opt_order)

                # Build option metadata (everything except standard fields)
                opt_meta = {}
                for k in ("content_hanzi", "content_pinyin", "content_zh",
                          "content_fr", "content_detail", "image_url"):
                    if k in opt and opt[k]:
                        opt_meta[k] = opt[k]

                ex_opt = {
                    "id": opt_id,
                    "exercise_id": ex_id,
                    "is_correct": opt["is_correct"],
                    "sort_order": opt_order,
                    "metadata": opt_meta or None,
                }
                all_ex_options.append(ex_opt)

                # Option translation
                opt_tr = {
                    "id": opt_translation_uuid(q_num, opt_order),
                    "option_id": opt_id,
                    "locale": "fr",
                    "content": opt["content"],
                    "error_explanation": None,
                }
                all_opt_translations.append(opt_tr)

    print(f"   Exercises: {len(all_exercises)}")
    print(f"   Translations: {len(all_ex_translations)}")
    print(f"   Options: {len(all_ex_options)}")
    print(f"   Option translations: {len(all_opt_translations)}")

    # Insert exercises in batch
    ok = supabase_post("exercises", all_exercises)
    print(f"   {'✓' if ok else '✗'} exercises inserted")

    ok = supabase_post("exercise_translations", all_ex_translations)
    print(f"   {'✓' if ok else '✗'} exercise_translations inserted")

    # Insert options in batches
    chunk_size = 50
    for i in range(0, len(all_ex_options), chunk_size):
        chunk = all_ex_options[i:i + chunk_size]
        ok = supabase_post("exercise_options", chunk)
        if not ok:
            print(f"   ✗ exercise_options batch {i//chunk_size + 1} failed")
            break
    else:
        print(f"   ✓ exercise_options inserted ({len(all_ex_options)} rows)")

    for i in range(0, len(all_opt_translations), chunk_size):
        chunk = all_opt_translations[i:i + chunk_size]
        ok = supabase_post("exercise_option_translations", chunk)
        if not ok:
            print(f"   ✗ exercise_option_translations batch {i//chunk_size + 1} failed")
            break
    else:
        print(f"   ✓ exercise_option_translations inserted ({len(all_opt_translations)} rows)")

    # ─── Step 2: Create mock exam ──────────────────────────────────────
    print("\n🏫 Creating mock exam...")

    mock_exam = {
        "id": MOCK_EXAM_ID,
        "course_id": COURSE_ID,
        "status": "published",
        "total_points": 300,
        "total_duration_minutes": 95,  # ~30 listening + 5 transfer + 40 reading + 25 writing
        "sort_order": 1,
    }
    ok = supabase_post("mock_exams", [mock_exam])
    print(f"   {'✓' if ok else '✗'} mock_exam created")

    # Mock exam translations (fr + en)
    translations = [
        {
            "id": mock_exam_translation_uuid(1),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "fr",
            "title": "Examen blanc HSK 4 — Conditions réelles",
            "description": (
                "100 questions \u00b7 ~95 min \u00b7 Format officiel HSK 2026. "
                "Écoute (45 q.) + Lecture (40 q.) + Écriture (15 q.). "
                "Score sur 300, seuil de réussite : 180."
            ),
        },
        {
            "id": mock_exam_translation_uuid(2),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "en",
            "title": "HSK 4 Mock Exam — Real Conditions",
            "description": (
                "100 questions \u00b7 ~95 min \u00b7 Official HSK 2026 format. "
                "Listening (45 q.) + Reading (40 q.) + Writing (15 q.). "
                "Score out of 300, passing score: 180."
            ),
        },
    ]
    ok = supabase_post("mock_exam_translations", translations)
    print(f"   {'✓' if ok else '✗'} mock_exam_translations created")

    # ─── Step 3: Create sections ────────────────────────────────────────
    print("\n📋 Creating sections...")

    section_configs = [
        {
            "json_id": "listening",
            "section_type": "listening",
            "sort_order": 1,
            "total_points": 100,
            "duration_minutes": 30,
            "title_fr": "Compréhension orale",
            "title_en": "Listening Comprehension",
            "instructions_fr": (
                "Tu vas entendre des phrases ou dialogues deux fois. "
                "Réponds aux questions correspondantes."
            ),
            "instructions_en": (
                "You will hear sentences or dialogues twice. "
                "Answer the corresponding questions."
            ),
        },
        {
            "json_id": "reading",
            "section_type": "reading",
            "sort_order": 2,
            "total_points": 100,
            "duration_minutes": 40,
            "title_fr": "Compréhension écrite",
            "title_en": "Reading Comprehension",
            "instructions_fr": (
                "Lis les phrases et textes, puis choisis la bonne réponse."
            ),
            "instructions_en": (
                "Read the sentences and texts, then choose the correct answer."
            ),
        },
        {
            "json_id": "writing",
            "section_type": "writing",
            "sort_order": 3,
            "total_points": 100,
            "duration_minutes": 25,
            "title_fr": "Expression écrite",
            "title_en": "Writing",
            "instructions_fr": (
                "Remets les mots dans le bon ordre ou rédige des phrases "
                "à partir des images et des mots-clés."
            ),
            "instructions_en": (
                "Reorder the words to form sentences or write sentences "
                "based on images and keywords."
            ),
        },
    ]

    section_rows = []
    section_tr_rows = []

    for sc in section_configs:
        sec_id = section_uuid(sc["sort_order"])

        section_rows.append({
            "id": sec_id,
            "mock_exam_id": MOCK_EXAM_ID,
            "section_type": sc["section_type"],
            "sort_order": sc["sort_order"],
            "total_points": sc["total_points"],
            "duration_minutes": sc["duration_minutes"],
        })

        section_tr_rows.append({
            "id": section_translation_uuid(sc["sort_order"], 1),
            "section_id": sec_id,
            "locale": "fr",
            "title": sc["title_fr"],
            "instructions": sc["instructions_fr"],
        })
        section_tr_rows.append({
            "id": section_translation_uuid(sc["sort_order"], 2),
            "section_id": sec_id,
            "locale": "en",
            "title": sc["title_en"],
            "instructions": sc["instructions_en"],
        })

    ok = supabase_post("mock_exam_sections", section_rows)
    print(f"   {'✓' if ok else '✗'} sections created ({len(section_rows)})")

    ok = supabase_post("mock_exam_section_translations", section_tr_rows)
    print(f"   {'✓' if ok else '✗'} section_translations created ({len(section_tr_rows)})")

    # ─── Step 4: Link questions to sections ─────────────────────────────
    print("\n🔗 Linking questions to sections...")

    question_links = []
    section_id_map = {
        "listening": section_uuid(1),
        "reading": section_uuid(2),
        "writing": section_uuid(3),
    }

    for section in sections_data:
        sec_id = section_id_map[section["id"]]
        for item in section["items"]:
            q_num = item["order"]
            points = item.get("scoring", {}).get("raw_points", 1)
            question_links.append({
                "id": mock_exam_question_uuid(q_num),
                "section_id": sec_id,
                "exercise_id": exercise_uuid(q_num),
                "sort_order": q_num,
                "points": points,
            })

    ok = supabase_post("mock_exam_questions", question_links)
    print(f"   {'✓' if ok else '✗'} question links created ({len(question_links)})")

    # ─── Summary ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ✅ HSK 4 Mock Exam import complete!")
    print("=" * 60)

    # Count by section
    listening_count = sum(1 for s in sections_data if s["id"] == "listening" for _ in s["items"])
    reading_count = sum(1 for s in sections_data if s["id"] == "reading" for _ in s["items"])
    writing_count = sum(1 for s in sections_data if s["id"] == "writing" for _ in s["items"])

    # Count by type
    type_counts = {}
    for s in sections_data:
        for item in s["items"]:
            t = item["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n  Mock Exam ID: {MOCK_EXAM_ID}")
    print(f"  Course: HSK 4 ({COURSE_ID})")
    print(f"  Total exercises: {len(all_exercises)}")
    print(f"  Total options: {len(all_ex_options)}")
    print(f"  Listening: {listening_count} questions")
    print(f"  Reading: {reading_count} questions")
    print(f"  Writing: {writing_count} questions")
    print(f"\n  Types breakdown:")
    for t, c in sorted(type_counts.items()):
        print(f"    {t}: {c}")
    print(f"\n  Total points: 300")
    print(f"  Duration: ~95 min")
    print(f"  Passing score: 180")

    # Check 5-point writing items
    five_pt = sum(1 for s in sections_data for it in s["items"]
                  if it.get("scoring", {}).get("raw_points", 1) == 5)
    print(f"  5-point items (picture_prompt_writing): {five_pt}")
    print()


if __name__ == "__main__":
    main()
