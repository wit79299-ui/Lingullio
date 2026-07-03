#!/usr/bin/env python3
"""
Import HSK 3 Mock Exam (real conditions, 80 questions) into Supabase.

HSK3 structure (official new format):
- Listening (40q): Part1 picture matching (10), Part2 statement T/F (10),
                   Part3 short dialogue MCQ (10), Part4 long dialogue MCQ (10)
- Reading (30q):   Part1 sentence matching (10), Part2 fill-blank word bank (10),
                   Part3 reading comprehension MCQ (10)
- Writing (10q):   Part1 sentence reordering (5), Part2 write missing character (5)
Total: 80 questions, 300 points, passing 180, ~85 minutes

Tables involved:
- exercises, exercise_translations, exercise_options, exercise_option_translations
- mock_exams, mock_exam_translations
- mock_exam_sections, mock_exam_section_translations
- mock_exam_questions

UUID conventions for HSK3 mock exam (uses 0003 pattern):
- Mock exam:    d0e00100-0003-4000-a000-000000000001
- Sections:     d0e00110-0003-4000-a000-{section_order:012d}
- Exercises:    d0e00120-0003-4000-a000-{question_number:012d}
- Options:      d0e00130-0003-4{q:03d}-a{opt:03d}-000000000001
- Ex transl:    d0e00141-0003-4{q:03d}-a000-{n:012d}
- Opt transl:   d0e00142-0003-4{q:03d}-a{opt:03d}-{n:012d}
- Sec transl:   d0e00143-0003-4{sec:03d}-a000-{n:012d}
- Exam transl:  d0e00144-0003-4000-a000-{n:012d}
- Questions:    d0e00150-0003-4000-a000-{q:012d}
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

COURSE_ID = "a0000000-0000-0000-0000-000000000003"  # HSK-3
MOCK_EXAM_ID = "d0e00100-0003-4000-a000-000000000001"

JSON_PATH = os.path.join(
    os.path.expanduser("~"),
    "webapp", "tmp", "hsk3",
    "hsk3_mock_exam_real_conditions_01_v3_premium_with_image_mapping.json",
)

TOTAL_QUESTIONS = 80
NUM_SECTIONS = 3  # listening, reading, writing

# ─── UUID Helpers ───────────────────────────────────────────────────────

def section_uuid(order: int) -> str:
    return f"d0e00110-0003-4000-a000-{order:012d}"

def exercise_uuid(q: int) -> str:
    return f"d0e00120-0003-4000-a000-{q:012d}"

def option_uuid(q: int, opt_order: int) -> str:
    return f"d0e00130-0003-4{q:03d}-a{opt_order:03d}-000000000001"

def ex_translation_uuid(q: int, n: int = 1) -> str:
    return f"d0e00141-0003-4{q:03d}-a000-{n:012d}"

def opt_translation_uuid(q: int, opt_order: int, n: int = 1) -> str:
    return f"d0e00142-0003-4{q:03d}-a{opt_order:03d}-{n:012d}"

def section_translation_uuid(sec: int, n: int = 1) -> str:
    return f"d0e00143-0003-4{sec:03d}-a000-{n:012d}"

def mock_exam_translation_uuid(n: int = 1) -> str:
    return f"d0e00144-0003-4000-a000-{n:012d}"

def mock_exam_question_uuid(q: int) -> str:
    return f"d0e00150-0003-4000-a000-{q:012d}"

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
    "audio_dialogue_choose_picture_from_shared_bank": "mcq",      # Part 1: picture matching
    "audio_statement_true_false": "mcq",                           # Part 2: true/false
    "audio_dialogue_text_mcq": "mcq",                              # Part 3: short dialogue MCQ
    "audio_long_dialogue_text_mcq": "mcq",                         # Part 4: long dialogue MCQ
    # Reading
    "sentence_response_matching": "matching",                      # Part 1: sentence matching
    "fill_blank_from_word_bank": "fill_blank",                     # Part 2: fill blank
    "short_reading_mcq": "mcq",                                    # Part 3: reading comprehension
    # Writing
    "reorder_words_sentence": "reorder",                           # Part 1: sentence reordering
    "write_missing_character": "fill_blank",                       # Part 2: write character
}

# ─── Image path helpers ─────────────────────────────────────────────────

# Image bank for Part 1 questions (Q1-Q10)
# Block 1 (Q1-Q5): shared bank A-E
# Block 2 (Q6-Q10): shared bank A-E
IMAGE_BANK = {
    "block1": {
        "A": "/static/mock-exam/hsk3/hsk3_l_p1a_A_subway.webp",
        "B": "/static/mock-exam/hsk3/hsk3_l_p1a_B_glasses_under_table.webp",
        "C": "/static/mock-exam/hsk3/hsk3_l_p1a_C_email.webp",
        "D": "/static/mock-exam/hsk3/hsk3_l_p1a_D_study_characters.webp",
        "E": "/static/mock-exam/hsk3/hsk3_l_p1a_E_rest_rain.webp",
    },
    "block2": {
        "A": "/static/mock-exam/hsk3/hsk3_l_p1b_A_restaurant_family.webp",
        "B": "/static/mock-exam/hsk3/hsk3_l_p1b_B_medicine.webp",
        "C": "/static/mock-exam/hsk3/hsk3_l_p1b_C_train_ticket.webp",
        "D": "/static/mock-exam/hsk3/hsk3_l_p1b_D_piano.webp",
        "E": "/static/mock-exam/hsk3/hsk3_l_p1b_E_photo_park.webp",
    },
}

def get_block_for_question(q_num: int) -> str:
    """Q1-Q5 → block1, Q6-Q10 → block2"""
    return "block1" if q_num <= 5 else "block2"

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

    # Review/explanation
    if "review" in item:
        meta["review"] = item["review"]

    # Diagnostic tags
    if "diagnostic" in item:
        meta["diagnostic_tags"] = item["diagnostic"].get("skill_tags", [])
        meta["if_wrong"] = item["diagnostic"].get("if_wrong", [])

    # Exam display info (crucial for rendering)
    if "exam_display" in item:
        meta["exam_display"] = item["exam_display"]

    # Scoring rubric (writing section)
    if "scoring" in item and "rubric" in item["scoring"]:
        meta["scoring_rubric"] = item["scoring"]["rubric"]

    # Accepted answers (writing section — may have multiple valid answers)
    if "accepted_answers" in item:
        meta["accepted_answers"] = item["accepted_answers"]

    # Image references for Part 1 picture matching
    item_type = item["type"]
    q_num = item["order"]

    if item_type == "audio_dialogue_choose_picture_from_shared_bank":
        block = get_block_for_question(q_num)
        meta["image_bank"] = IMAGE_BANK[block]
        meta["image_bank_id"] = item.get("exam_display", {}).get("image_bank_id", "")

    return meta


def build_options(item: dict) -> list:
    """Build option list for an exercise."""
    options = []
    answer = item["correct_answer"]
    item_type = item["type"]
    q_num = item["order"]

    if item_type == "audio_dialogue_choose_picture_from_shared_bank":
        # Part 1: 5 image options A-E (shared bank)
        block = get_block_for_question(q_num)
        for i, opt in enumerate(item["exam_display"]["image_options"]):
            cid = opt["id"]  # A, B, C, D, E
            options.append({
                "id": cid,
                "content": cid,
                "content_detail": opt.get("description_fr_admin", ""),
                "image_url": IMAGE_BANK[block].get(cid, ""),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "audio_statement_true_false":
        # Part 2: True/False options
        for i, opt in enumerate(item["exam_display"]["options"]):
            options.append({
                "id": opt["id"],
                "content_zh": opt.get("label_zh", ""),
                "content_fr": opt.get("label_fr", ""),
                "content": opt.get("label_fr", opt["id"]),
                "is_correct": str(opt["id"]) == str(answer),
                "sort_order": i + 1,
            })

    elif item_type in ("audio_dialogue_text_mcq", "audio_long_dialogue_text_mcq"):
        # Part 3 & 4: Text MCQ options A/B/C
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

    elif item_type == "sentence_response_matching":
        # Reading Part 1: 10 response options A-J (shared bank)
        for i, opt in enumerate(item["exam_display"]["response_bank"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt["zh"],
                "content_hanzi": opt["zh"],
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "fill_blank_from_word_bank":
        # Reading Part 2: 10 word options A-J (shared bank)
        for i, opt in enumerate(item["exam_display"]["word_bank"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt["zh"],
                "content_hanzi": opt["zh"],
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "short_reading_mcq":
        # Reading Part 3: Text MCQ A/B/C
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

    elif item_type == "reorder_words_sentence":
        # Writing Part 1: Word tiles as individual options (for reorder UI)
        tiles = item["exam_display"]["word_tiles_zh"]
        for i, tile in enumerate(tiles):
            options.append({
                "id": str(i + 1),
                "content": tile,
                "content_hanzi": tile,
                "is_correct": True,  # All tiles are part of the answer
                "sort_order": i + 1,
            })

    elif item_type == "write_missing_character":
        # Writing Part 2: Single correct character + accepted variants
        accepted = item.get("accepted_answers", [item["correct_answer"]])
        for i, ans in enumerate(accepted):
            options.append({
                "id": str(i + 1),
                "content": ans,
                "content_hanzi": ans,
                "is_correct": True,
                "sort_order": i + 1,
            })

    return options


def build_prompt_fr(item: dict) -> str:
    """Build the French prompt/instruction for the exercise translation."""
    item_type = item["type"]
    ed = item.get("exam_display", {})

    if item_type == "audio_dialogue_choose_picture_from_shared_bank":
        return ed.get("instruction_fr", "Choisis l'image qui correspond au dialogue.")

    elif item_type == "audio_statement_true_false":
        # Display the statement that the student reads
        statement = ed.get("statement_zh", "")
        return f"{ed.get('instruction_fr', 'Vrai ou faux ?')}\n{statement}"

    elif item_type in ("audio_dialogue_text_mcq", "audio_long_dialogue_text_mcq"):
        question = ed.get("question_zh", "")
        return f"{ed.get('instruction_fr', 'Choisis la bonne réponse.')}\n{question}"

    elif item_type == "sentence_response_matching":
        stimulus = ed.get("stimulus_zh", "")
        return f"{ed.get('instruction_fr', 'Choisis la réponse correspondante.')}\n{stimulus}"

    elif item_type == "fill_blank_from_word_bank":
        stimulus = ed.get("stimulus_zh", "")
        return f"{ed.get('instruction_fr', 'Complète la phrase.')}\n{stimulus}"

    elif item_type == "short_reading_mcq":
        passage = ed.get("passage_zh", "")
        question = ed.get("question_zh", "")
        return f"{ed.get('instruction_fr', 'Lis le texte et réponds.')}\n{passage}\n★ {question}"

    elif item_type == "reorder_words_sentence":
        tiles = " / ".join(ed.get("word_tiles_zh", []))
        return f"{ed.get('instruction_fr', 'Remets les mots dans le bon ordre.')}\n{tiles}"

    elif item_type == "write_missing_character":
        stimulus = ed.get("stimulus_zh", "")
        pinyin = ed.get("pinyin_prompt", "")
        return f"{ed.get('instruction_fr', 'Écris le caractère manquant.')}\n{stimulus}\n({pinyin})"

    return ""


def build_instruction_fr(item: dict) -> str:
    """Get the French instruction for this item's part."""
    return item.get("exam_display", {}).get("instruction_fr", "")


# ─── Main import logic ──────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  HSK 3 Mock Exam Import — 80 questions")
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
    print("\n🧹 Cleaning up previous HSK3 mock exam import...")
    
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
        # Delete option translations and options (up to 12 options for matching/response banks)
        for o in range(1, 12):
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
            diag = item.get("diagnostic", {})
            if diag.get("skill_tags"):
                skill_tags.extend(diag["skill_tags"][:3])

            # Build metadata
            metadata = build_metadata(item, section_type)

            # Duration estimation by section/part
            if section_type == "listening":
                est_duration = 30  # listening items ~30s with replay
            elif section_type == "reading":
                est_duration = 40  # reading items ~40s
            else:
                est_duration = 60  # writing items ~60s

            # Exercise row
            exercise = {
                "id": ex_id,
                "lesson_id": None,
                "exercise_type": ex_type,
                "difficulty": 2,  # HSK3 is difficulty 2
                "points": item.get("scoring", {}).get("raw_points", 1),
                "estimated_duration_seconds": est_duration,
                "audio_url": None,
                "image_url": None,
                "skill_tags": skill_tags,
                "hsk_level": "3",
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

    # Insert options in batches (matching/response banks have 10 opts x 10 q = 100)
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
        "total_duration_minutes": 85,  # ~35 listening + 5 transfer + 30 reading + 15 writing
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
            "title": "Examen blanc HSK 3 — Conditions réelles",
            "description": (
                "80 questions · ~85 min · Format officiel HSK 2026. "
                "Écoute (40 q.) + Lecture (30 q.) + Écriture (10 q.). "
                "Score sur 300, seuil de réussite : 180."
            ),
        },
        {
            "id": mock_exam_translation_uuid(2),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "en",
            "title": "HSK 3 Mock Exam — Real Conditions",
            "description": (
                "80 questions · ~85 min · Official HSK 2026 format. "
                "Listening (40 q.) + Reading (30 q.) + Writing (10 q.). "
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
            "duration_minutes": 35,
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
            "duration_minutes": 30,
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
            "duration_minutes": 15,
            "title_fr": "Expression écrite",
            "title_en": "Writing",
            "instructions_fr": (
                "Remets les mots dans l'ordre ou écris le caractère manquant."
            ),
            "instructions_en": (
                "Reorder the words to form a sentence or write the missing character."
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
            question_links.append({
                "id": mock_exam_question_uuid(q_num),
                "section_id": sec_id,
                "exercise_id": exercise_uuid(q_num),
                "sort_order": q_num,
                "points": item.get("scoring", {}).get("raw_points", 1),
            })

    ok = supabase_post("mock_exam_questions", question_links)
    print(f"   {'✓' if ok else '✗'} question links created ({len(question_links)})")

    # ─── Summary ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ✅ HSK 3 Mock Exam import complete!")
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
    print(f"  Course: HSK 3 ({COURSE_ID})")
    print(f"  Total exercises: {len(all_exercises)}")
    print(f"  Total options: {len(all_ex_options)}")
    print(f"  Listening: {listening_count} questions")
    print(f"  Reading: {reading_count} questions")
    print(f"  Writing: {writing_count} questions")
    print(f"\n  Types breakdown:")
    for t, c in sorted(type_counts.items()):
        print(f"    {t}: {c}")
    print(f"\n  Total points: 300")
    print(f"  Duration: ~85 min")
    print(f"  Passing score: 180")
    print()


if __name__ == "__main__":
    main()
