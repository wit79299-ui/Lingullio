#!/usr/bin/env python3
"""
Import HSK 1 Mock Exam (real conditions) into Supabase.

Flow:
1. Create exercises for each of the 40 questions (with translations + options)
2. Create the mock_exam entry
3. Create mock_exam_sections (listening + reading) with translations
4. Link exercises to sections via mock_exam_questions

Tables involved:
- exercises, exercise_translations, exercise_options, exercise_option_translations
- mock_exams, mock_exam_translations
- mock_exam_sections, mock_exam_section_translations
- mock_exam_questions

UUID conventions for mock exams:
- Mock exam:    m1000000-0001-0000-0000-000000000001  (HSK1, exam #1)
- Sections:     m1100000-0001-{section_order:04d}-0000-000000000001
- Exercises:    m1200000-0001-0000-0000-{question_number:012d}
- Options:      m1300000-0001-{q:04d}-0000-{opt_order:012d}
- Translations: m14{table_code}-0001-{parent:04d}-0000-{n:012d}
"""

import json
import sys
import urllib.request
import urllib.error
import os

# ─── Config ─────────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

COURSE_ID = "a0000000-0000-0000-0000-000000000001"  # HSK-1
MOCK_EXAM_ID = "d0e00100-0001-4000-a000-000000000001"  # mock exam HSK1 #1

JSON_PATH = os.path.join(
    os.path.expanduser("~"),
    "uploaded_files",
    "hsk1_mock_exam_real_conditions_02_v2_premium (1).json.txt",
)

# ─── UUID Helpers ───────────────────────────────────────────────────────

def section_uuid(order: int) -> str:
    return f"d0e00110-0001-4000-a000-{order:012d}"

def exercise_uuid(question_number: int) -> str:
    return f"d0e00120-0001-4000-a000-{question_number:012d}"

def option_uuid(question_number: int, opt_order: int) -> str:
    return f"d0e00130-0001-4{question_number:03d}-a{opt_order:03d}-000000000001"

def ex_translation_uuid(question_number: int, n: int = 1) -> str:
    return f"d0e00141-0001-4{question_number:03d}-a000-{n:012d}"

def opt_translation_uuid(question_number: int, opt_order: int, n: int = 1) -> str:
    return f"d0e00142-0001-4{question_number:03d}-a{opt_order:03d}-{n:012d}"

def section_translation_uuid(section_order: int, n: int = 1) -> str:
    return f"d0e00143-0001-4{section_order:03d}-a000-{n:012d}"

def mock_exam_translation_uuid(n: int = 1) -> str:
    return f"d0e00144-0001-4000-a000-{n:012d}"

def mock_exam_question_uuid(question_number: int) -> str:
    return f"d0e00150-0001-4000-a000-{question_number:012d}"

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
            status = resp.getcode()
            if status in (200, 201, 204):
                return True
            else:
                print(f"  ⚠ {table}: HTTP {status}")
                return False
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"  ✗ {table}: HTTP {e.code} – {body[:300]}")
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

def map_question_type(json_type: str) -> str:
    """Map JSON question types to our exercise_type enum."""
    mapping = {
        "audio_picture_true_false": "mcq",       # True/False is 2-option MCQ
        "audio_choose_picture": "mcq",            # Choose from images = MCQ
        "audio_question_choose_text_answer": "mcq",
        "picture_sentence_true_false": "mcq",     # True/False with picture
        "sentence_picture_matching": "matching",
        "question_answer_matching": "matching",
        "fill_blank_from_word_bank": "fill_blank",
    }
    return mapping.get(json_type, "mcq")


# ─── Build exercise metadata ───────────────────────────────────────────

def build_exercise_metadata(item: dict, part_data: dict, section_type: str) -> dict:
    """Build the JSONB metadata for an exercise from the JSON item."""
    meta = {
        "mock_exam_type": item["type"],
        "section": section_type,
        "part": item["part"],
        "difficulty": item.get("difficulty", "exam_realistic"),
        "diagnostic_tags": item.get("diagnostic_tags", []),
    }

    # Audio data
    if "audio" in item:
        meta["audio"] = {
            "script_hanzi": item["audio"]["script_hanzi"],
            "script_pinyin": item["audio"]["script_pinyin"],
            "repeat_count": item["audio"].get("repeat_count", 2),
        }

    # Stimulus (for reading questions)
    if "stimulus" in item:
        meta["stimulus"] = {
            "hanzi": item["stimulus"]["hanzi"],
            "pinyin": item["stimulus"]["pinyin"],
        }

    # Question (for listening part 4)
    if "question" in item:
        meta["question"] = {
            "hanzi": item["question"]["hanzi"],
            "pinyin": item["question"]["pinyin"],
        }

    # Image asset info (for generating/referencing images later)
    if "image_asset" in item:
        meta["image_asset"] = item["image_asset"]

    # Exam display info
    if "exam_display" in item:
        meta["exam_display"] = item["exam_display"]

    # Review/explanation data
    if "review" in item:
        meta["review"] = item["review"]

    # For matching parts (reading part 2, 3, 4) — store shared banks
    if "shared_image_bank" in part_data:
        meta["shared_image_bank"] = part_data["shared_image_bank"]
    if "shared_answer_bank" in part_data:
        meta["shared_answer_bank"] = part_data["shared_answer_bank"]
    if "word_bank" in part_data:
        meta["word_bank"] = part_data["word_bank"]

    return meta


def build_options(item: dict, part_data: dict) -> list:
    """
    Build option list: [{id, content_fr, content_zh, is_correct, sort_order}]
    """
    options = []
    answer = item["answer"]
    item_type = item["type"]

    if item_type in ("audio_picture_true_false", "picture_sentence_true_false"):
        # True/False options
        choices = item.get("exam_display", {}).get("choices", [
            {"id": "true", "label": "✓"},
            {"id": "false", "label": "✗"},
        ])
        for i, c in enumerate(choices):
            options.append({
                "id": c["id"],
                "content": c["label"],
                "is_correct": c["id"] == answer,
                "sort_order": i + 1,
            })

    elif item_type == "audio_choose_picture":
        # Image choices
        choices = item.get("exam_display", {}).get("choices", [])
        for i, c in enumerate(choices):
            label = c["id"]  # A, B, C
            desc = c.get("image_asset", {}).get("prompt_en", label)
            options.append({
                "id": label,
                "content": label,
                "content_detail": desc,
                "is_correct": label == answer,
                "sort_order": i + 1,
            })

    elif item_type == "audio_question_choose_text_answer":
        # Text choices with hanzi + pinyin
        choices = item.get("exam_display", {}).get("choices", [])
        for i, c in enumerate(choices):
            label = c["id"]
            text = f"{c['hanzi']}（{c['pinyin']}）"
            options.append({
                "id": label,
                "content": text,
                "content_hanzi": c["hanzi"],
                "content_pinyin": c["pinyin"],
                "is_correct": label == answer,
                "sort_order": i + 1,
            })

    elif item_type == "sentence_picture_matching":
        # Shared image bank → A-E
        bank = part_data.get("shared_image_bank", [])
        for i, b in enumerate(bank):
            label = b["id"]
            options.append({
                "id": label,
                "content": label,
                "content_detail": b.get("image_asset", {}).get("prompt_en", label),
                "is_correct": label == answer,
                "sort_order": i + 1,
            })

    elif item_type == "question_answer_matching":
        # Shared answer bank → A-E
        bank = part_data.get("shared_answer_bank", [])
        for i, b in enumerate(bank):
            label = b["id"]
            text = f"{b['hanzi']}（{b['pinyin']}）"
            options.append({
                "id": label,
                "content": text,
                "content_hanzi": b["hanzi"],
                "content_pinyin": b["pinyin"],
                "is_correct": label == answer,
                "sort_order": i + 1,
            })

    elif item_type == "fill_blank_from_word_bank":
        # Word bank → A-E
        bank = part_data.get("word_bank", [])
        for i, b in enumerate(bank):
            label = b["id"]
            text = f"{b['hanzi']}（{b['pinyin']}）"
            options.append({
                "id": label,
                "content": text,
                "content_hanzi": b["hanzi"],
                "content_pinyin": b["pinyin"],
                "is_correct": label == answer,
                "sort_order": i + 1,
            })

    return options


# ─── Prompt text for translation ────────────────────────────────────────

def build_prompt_fr(item: dict) -> str:
    """Build the French prompt/instruction for the exercise translation."""
    item_type = item["type"]

    if item_type in ("audio_picture_true_false", "picture_sentence_true_false"):
        return item.get("prompt_fr", "Vrai ou faux ?")
    elif item_type == "audio_choose_picture":
        return "Choisis l'image correspondante."
    elif item_type == "audio_question_choose_text_answer":
        q = item.get("question", {})
        return f"Question : {q.get('hanzi', '')}（{q.get('pinyin', '')}）"
    elif item_type == "sentence_picture_matching":
        s = item.get("stimulus", {})
        return f"{s.get('hanzi', '')}（{s.get('pinyin', '')}）"
    elif item_type == "question_answer_matching":
        s = item.get("stimulus", {})
        return f"{s.get('hanzi', '')}（{s.get('pinyin', '')}）"
    elif item_type == "fill_blank_from_word_bank":
        s = item.get("stimulus", {})
        return f"{s.get('hanzi', '')}（{s.get('pinyin', '')}）"
    return item.get("prompt_fr", "")


def build_instruction_fr(part_data: dict) -> str:
    """Get the French instruction for this part."""
    return part_data.get("instruction_fr_exam", "")


# ─── Main import logic ──────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  HSK 1 Mock Exam Import")
    print("=" * 60)

    # Load JSON
    print(f"\n📄 Loading JSON from {JSON_PATH}")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    exam = data["mock_exam"]
    sections = exam["sections"]
    scoring = exam["scoring"]

    print(f"   Exam: {exam['id']} v{exam['version']}")
    print(f"   Level: {exam['exam_level']}")
    print(f"   Sections: {len(sections)}")
    total_items = sum(
        len(item)
        for sec in sections
        for part in sec["parts"]
        for item in [part["items"]]
    )
    print(f"   Total questions: {total_items}")

    # ─── Step 0: Clean up any previous import ───────────────────────────
    print("\n🧹 Cleaning up previous import (if any)...")
    # Delete in correct FK order
    supabase_delete("mock_exam_questions", f"section_id=eq.{section_uuid(1)}")
    supabase_delete("mock_exam_questions", f"section_id=eq.{section_uuid(2)}")
    supabase_delete("mock_exam_section_translations", f"section_id=eq.{section_uuid(1)}")
    supabase_delete("mock_exam_section_translations", f"section_id=eq.{section_uuid(2)}")
    supabase_delete("mock_exam_sections", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    supabase_delete("mock_exam_translations", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    supabase_delete("mock_exams", f"id=eq.{MOCK_EXAM_ID}")
    # Clean exercise-related data (question by question)
    for q in range(1, 41):
        eid = exercise_uuid(q)
        for o in range(1, 8):
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

    section_map = {
        "hsk1_listening": "listening",
        "hsk1_reading": "reading",
    }

    for section in sections:
        section_type = section_map.get(section["id"], section["id"])

        for part in section["parts"]:
            part_instruction = build_instruction_fr(part)

            for item in part["items"]:
                q_num = item["number"]
                ex_id = exercise_uuid(q_num)
                ex_type = map_question_type(item["type"])

                # Determine skill tags
                skill_tags = [section_type]
                if item.get("diagnostic_tags"):
                    skill_tags.extend(item["diagnostic_tags"][:3])

                # Build metadata
                metadata = build_exercise_metadata(item, part, section_type)

                # Exercise row
                exercise = {
                    "id": ex_id,
                    "lesson_id": None,  # Mock exam exercises aren't tied to lessons
                    "exercise_type": ex_type,
                    "difficulty": 1 if "easy" in item.get("difficulty", "") else 2,
                    "points": item.get("points", 5),
                    "estimated_duration_seconds": 30 if section_type == "reading" else 20,
                    "audio_url": None,
                    "image_url": None,
                    "skill_tags": skill_tags,
                    "hsk_level": "1",
                    "sort_order": q_num,
                    "status": "published",
                    "metadata": metadata,
                }
                all_exercises.append(exercise)

                # Exercise translation (French)
                prompt = build_prompt_fr(item)
                explanation = item.get("review", {}).get("explanation_fr", "")
                ex_tr = {
                    "id": ex_translation_uuid(q_num),
                    "exercise_id": ex_id,
                    "locale": "fr",
                    "prompt": prompt,
                    "instruction": part_instruction,
                    "explanation": explanation,
                    "hint": None,
                }
                all_ex_translations.append(ex_tr)

                # Options
                options = build_options(item, part)
                for opt in options:
                    opt_id = option_uuid(q_num, opt["sort_order"])
                    ex_opt = {
                        "id": opt_id,
                        "exercise_id": ex_id,
                        "is_correct": opt["is_correct"],
                        "sort_order": opt["sort_order"],
                        "metadata": {
                            k: v
                            for k, v in opt.items()
                            if k not in ("is_correct", "sort_order", "id", "content")
                        } or None,
                    }
                    all_ex_options.append(ex_opt)

                    # Option translation
                    opt_tr = {
                        "id": opt_translation_uuid(q_num, opt["sort_order"]),
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

    ok = supabase_post("exercise_options", all_ex_options)
    print(f"   {'✓' if ok else '✗'} exercise_options inserted")

    ok = supabase_post("exercise_option_translations", all_opt_translations)
    print(f"   {'✓' if ok else '✗'} exercise_option_translations inserted")

    # ─── Step 2: Create mock exam ──────────────────────────────────────
    print("\n🏫 Creating mock exam...")

    mock_exam = {
        "id": MOCK_EXAM_ID,
        "course_id": COURSE_ID,
        "status": "published",
        "total_points": scoring["total_points"],
        "total_duration_minutes": exam["official_alignment"]["official_format_summary"]["test_minutes_without_personal_info_about"],
        "sort_order": 1,
    }
    ok = supabase_post("mock_exams", [mock_exam])
    print(f"   {'✓' if ok else '✗'} mock_exam created")

    # Mock exam translations
    translations = [
        {
            "id": mock_exam_translation_uuid(1),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "fr",
            "title": "Examen blanc HSK 1 — Conditions réelles",
            "description": "40 questions · 35 min · Format officiel HSK 2026. Écoute + Lecture. Score sur 200, seuil de réussite : 120.",
        },
        {
            "id": mock_exam_translation_uuid(2),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "en",
            "title": "HSK 1 Mock Exam — Real Conditions",
            "description": "40 questions · 35 min · Official HSK 2026 format. Listening + Reading. Score out of 200, passing score: 120.",
        },
    ]
    ok = supabase_post("mock_exam_translations", translations)
    print(f"   {'✓' if ok else '✗'} mock_exam_translations created")

    # ─── Step 3: Create sections ────────────────────────────────────────
    print("\n📋 Creating sections...")

    section_configs = [
        {
            "json_id": "hsk1_listening",
            "section_type": "listening",
            "sort_order": 1,
            "title_fr": "Compréhension orale",
            "title_en": "Listening Comprehension",
            "instructions_fr": "Tu vas entendre des phrases ou dialogues deux fois. Réponds aux questions correspondantes.",
            "instructions_en": "You will hear sentences or dialogues twice. Answer the corresponding questions.",
        },
        {
            "json_id": "hsk1_reading",
            "section_type": "reading",
            "sort_order": 2,
            "title_fr": "Compréhension écrite",
            "title_en": "Reading Comprehension",
            "instructions_fr": "Lis les phrases et choisis la bonne réponse.",
            "instructions_en": "Read the sentences and choose the correct answer.",
        },
    ]

    section_rows = []
    section_tr_rows = []

    for sc in section_configs:
        json_section = next(s for s in sections if s["id"] == sc["json_id"])
        sec_id = section_uuid(sc["sort_order"])

        section_rows.append({
            "id": sec_id,
            "mock_exam_id": MOCK_EXAM_ID,
            "section_type": sc["section_type"],
            "sort_order": sc["sort_order"],
            "total_points": json_section["score_max"],
            "duration_minutes": json_section.get("duration_about_minutes") or json_section.get("duration_minutes"),
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
        "hsk1_listening": section_uuid(1),
        "hsk1_reading": section_uuid(2),
    }

    for section in sections:
        sec_id = section_id_map[section["id"]]
        for part in section["parts"]:
            for item in part["items"]:
                q_num = item["number"]
                question_links.append({
                    "id": mock_exam_question_uuid(q_num),
                    "section_id": sec_id,
                    "exercise_id": exercise_uuid(q_num),
                    "sort_order": q_num,
                    "points": item.get("points", 5),
                })

    ok = supabase_post("mock_exam_questions", question_links)
    print(f"   {'✓' if ok else '✗'} question links created ({len(question_links)})")

    # ─── Summary ────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ✅ HSK 1 Mock Exam import complete!")
    print("=" * 60)
    print(f"  Mock Exam ID: {MOCK_EXAM_ID}")
    print(f"  Course: HSK 1 ({COURSE_ID})")
    print(f"  Exercises: {len(all_exercises)}")
    print(f"  Options: {len(all_ex_options)}")
    print(f"  Sections: {len(section_rows)}")
    print(f"  Question links: {len(question_links)}")
    print(f"  Total points: {scoring['total_points']}")
    print(f"  Duration: ~35 min")
    print()


if __name__ == "__main__":
    main()
