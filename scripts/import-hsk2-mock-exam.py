#!/usr/bin/env python3
"""
Import HSK 2 Mock Exam (real conditions, 60 questions) into Supabase.

Flow:
1. Clean up any previous HSK2 mock exam data
2. Create exercises for each of the 60 questions (with translations + options)
3. Create the mock_exam entry
4. Create mock_exam_sections (listening + reading) with translations
5. Link exercises to sections via mock_exam_questions

Tables involved:
- exercises, exercise_translations, exercise_options, exercise_option_translations
- mock_exams, mock_exam_translations
- mock_exam_sections, mock_exam_section_translations
- mock_exam_questions

UUID conventions for HSK2 mock exam (uses 0002 pattern):
- Mock exam:    d0e00100-0002-4000-a000-000000000001
- Sections:     d0e00110-0002-4000-a000-{section_order:012d}
- Exercises:    d0e00120-0002-4000-a000-{question_number:012d}
- Options:      d0e00130-0002-4{q:03d}-a{opt:03d}-000000000001
- Ex transl:    d0e00141-0002-4{q:03d}-a000-{n:012d}
- Opt transl:   d0e00142-0002-4{q:03d}-a{opt:03d}-{n:012d}
- Sec transl:   d0e00143-0002-4{sec:03d}-a000-{n:012d}
- Exam transl:  d0e00144-0002-4000-a000-{n:012d}
- Questions:    d0e00150-0002-4000-a000-{q:012d}
"""

import json
import sys
import urllib.request
import urllib.error
import os

# ─── Config ─────────────────────────────────────────────────────────────
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

COURSE_ID = "a0000000-0000-0000-0000-000000000002"  # HSK-2
MOCK_EXAM_ID = "d0e00100-0002-4000-a000-000000000001"

JSON_PATH = os.path.join(
    os.path.expanduser("~"),
    "uploaded_files",
    "hsk2_mock_exam_real_conditions_02_v3_premium_with_image_mapping.json.txt",
)

TOTAL_QUESTIONS = 60

# ─── UUID Helpers ───────────────────────────────────────────────────────

def section_uuid(order: int) -> str:
    return f"d0e00110-0002-4000-a000-{order:012d}"

def exercise_uuid(q: int) -> str:
    return f"d0e00120-0002-4000-a000-{q:012d}"

def option_uuid(q: int, opt_order: int) -> str:
    return f"d0e00130-0002-4{q:03d}-a{opt_order:03d}-000000000001"

def ex_translation_uuid(q: int, n: int = 1) -> str:
    return f"d0e00141-0002-4{q:03d}-a000-{n:012d}"

def opt_translation_uuid(q: int, opt_order: int, n: int = 1) -> str:
    return f"d0e00142-0002-4{q:03d}-a{opt_order:03d}-{n:012d}"

def section_translation_uuid(sec: int, n: int = 1) -> str:
    return f"d0e00143-0002-4{sec:03d}-a000-{n:012d}"

def mock_exam_translation_uuid(n: int = 1) -> str:
    return f"d0e00144-0002-4000-a000-{n:012d}"

def mock_exam_question_uuid(q: int) -> str:
    return f"d0e00150-0002-4000-a000-{q:012d}"

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

TYPE_MAP = {
    "picture_true_false": "mcq",
    "picture_choice": "mcq",
    "audio_mcq_text": "mcq",
    "sentence_picture_choice": "mcq",
    "word_bank_fill_blank": "fill_blank",
    "true_false_consistency": "mcq",
    "matching": "matching",
}

# ─── Image path helpers ─────────────────────────────────────────────────

def image_path_single(q: int) -> str:
    """Part 1 single image: hsk2_l_p1_qNN.webp"""
    return f"/static/mock-exam/hsk2/hsk2_l_p1_q{q:02d}.webp"

def image_path_row(q: int) -> str:
    """Part 2 row image: hsk2_l_p2_qNN_row.webp"""
    return f"/static/mock-exam/hsk2/hsk2_l_p2_q{q:02d}_row.webp"

def image_path_choice(q: int, choice: str) -> str:
    """Part 2 individual choice: hsk2_l_p2_qNN_a/b/c.webp"""
    return f"/static/mock-exam/hsk2/hsk2_l_p2_q{q:02d}_{choice.lower()}.webp"

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
            "script_pinyin": item["audio"]["transcript_pinyin"],
            "repeat_count": item["audio"].get("play_count", 2),
        }

    # Prompt (reading questions)
    if "prompt" in item and isinstance(item["prompt"], dict):
        meta["prompt"] = {
            "hanzi": item["prompt"]["zh"],
            "pinyin": item["prompt"]["pinyin"],
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

    # Image references for Part 1 (single image + true/false)
    q_num = item["order"]
    item_type = item["type"]

    if item_type == "picture_true_false":
        meta["image_url"] = image_path_single(q_num)
        meta["image_asset"] = {
            "prompt_fr": item.get("exam_display", {}).get("image_prompt", ""),
        }

    elif item_type == "picture_choice":
        # Part 2: row image + 3 individual choice images
        meta["image_row_url"] = image_path_row(q_num)
        meta["image_choices"] = {}
        for opt in item.get("exam_display", {}).get("image_options", []):
            cid = opt["id"]  # A, B, C
            meta["image_choices"][cid] = {
                "url": image_path_choice(q_num, cid),
                "prompt": opt.get("image_prompt", ""),
            }

    elif item_type == "sentence_picture_choice":
        # Reading Part 1: image prompts only (no actual images cropped)
        meta["image_prompts"] = {}
        for opt in item.get("exam_display", {}).get("image_options", []):
            meta["image_prompts"][opt["id"]] = opt.get("image_prompt", "")

    return meta


def build_options(item: dict) -> list:
    """Build option list for an exercise."""
    options = []
    answer = item["correct_answer"]
    item_type = item["type"]

    if item_type == "picture_true_false":
        # True/False from exam_display.options
        for i, opt in enumerate(item.get("exam_display", {}).get("options", [])):
            options.append({
                "id": opt["id"],
                "content_zh": opt.get("label_zh", ""),
                "content_fr": opt.get("label_fr", ""),
                "content": opt.get("label_fr", opt["id"]),
                "is_correct": opt["id"] == answer,
                "sort_order": i + 1,
            })

    elif item_type == "picture_choice":
        # A, B, C image choices
        q_num = item["order"]
        for i, opt in enumerate(item.get("exam_display", {}).get("image_options", [])):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": cid,
                "content_detail": opt.get("image_prompt", ""),
                "image_url": image_path_choice(q_num, cid),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "audio_mcq_text":
        # Text options with hanzi + pinyin
        for i, opt in enumerate(item.get("exam_display", {}).get("options", [])):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": f"{opt['zh']}（{opt['pinyin']}）",
                "content_hanzi": opt["zh"],
                "content_pinyin": opt["pinyin"],
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "sentence_picture_choice":
        # Reading Part 1: image choices (prompts only)
        for i, opt in enumerate(item.get("exam_display", {}).get("image_options", [])):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": cid,
                "content_detail": opt.get("image_prompt", ""),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "word_bank_fill_blank":
        # Word bank: 6 options A-F (shared across Q41-45)
        for i, opt in enumerate(item.get("exam_display", {}).get("word_bank", [])):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": f"{opt['zh']}（{opt['pinyin']}）",
                "content_hanzi": opt["zh"],
                "content_pinyin": opt["pinyin"],
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "true_false_consistency":
        # True/False with second sentence
        for i, opt in enumerate(item.get("exam_display", {}).get("options", [])):
            options.append({
                "id": opt["id"],
                "content_zh": opt.get("label_zh", ""),
                "content_fr": opt.get("label_fr", ""),
                "content": opt.get("label_fr", opt["id"]),
                "is_correct": opt["id"] == answer,
                "sort_order": i + 1,
            })

    elif item_type == "matching":
        # 10 matching options A-J (shared across Q51-60)
        for i, opt in enumerate(item.get("exam_display", {}).get("matching_options", [])):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": f"{opt['zh']}（{opt['pinyin']}）",
                "content_hanzi": opt["zh"],
                "content_pinyin": opt["pinyin"],
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    return options


def build_prompt_fr(item: dict) -> str:
    """Build the French prompt/instruction for the exercise translation."""
    item_type = item["type"]

    if item_type == "picture_true_false":
        return item.get("exam_display", {}).get("instruction_fr", "Vrai ou faux ?")

    elif item_type == "picture_choice":
        return item.get("exam_display", {}).get("instruction_fr", "Choisis l'image correspondante.")

    elif item_type == "audio_mcq_text":
        return item.get("exam_display", {}).get("instruction_fr", "Choisis la bonne réponse.")

    elif item_type == "sentence_picture_choice":
        p = item.get("prompt", {})
        return f"{p.get('zh', '')}（{p.get('pinyin', '')}）"

    elif item_type == "word_bank_fill_blank":
        p = item.get("prompt", {})
        return f"{p.get('zh', '')}（{p.get('pinyin', '')}）"

    elif item_type == "true_false_consistency":
        p = item.get("prompt", {})
        second = item.get("exam_display", {}).get("second_sentence", {})
        return f"{p.get('zh', '')}（{p.get('pinyin', '')}）\n★ {second.get('zh', '')}（{second.get('pinyin', '')}）"

    elif item_type == "matching":
        p = item.get("prompt", {})
        return f"{p.get('zh', '')}（{p.get('pinyin', '')}）"

    return ""


def build_instruction_fr(item: dict) -> str:
    """Get the French instruction for this item's part."""
    return item.get("exam_display", {}).get("instruction_fr", "")


# ─── Main import logic ──────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  HSK 2 Mock Exam Import — 60 questions")
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
    print("\n🧹 Cleaning up previous HSK2 mock exam import...")
    
    # Delete mock exam question links
    supabase_delete("mock_exam_questions", f"section_id=eq.{section_uuid(1)}")
    supabase_delete("mock_exam_questions", f"section_id=eq.{section_uuid(2)}")
    
    # Delete section translations and sections
    supabase_delete("mock_exam_section_translations", f"section_id=eq.{section_uuid(1)}")
    supabase_delete("mock_exam_section_translations", f"section_id=eq.{section_uuid(2)}")
    supabase_delete("mock_exam_sections", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    
    # Delete exam translations and exam
    supabase_delete("mock_exam_translations", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    supabase_delete("mock_exams", f"id=eq.{MOCK_EXAM_ID}")
    
    # Clean exercise-related data
    for q in range(1, TOTAL_QUESTIONS + 1):
        eid = exercise_uuid(q)
        # Delete option translations and options (up to 12 options for matching)
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
        section_type = section["id"]  # "listening" or "reading"

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

            # Exercise row
            exercise = {
                "id": ex_id,
                "lesson_id": None,
                "exercise_type": ex_type,
                "difficulty": 1,
                "points": item.get("scoring", {}).get("raw_points", 1),
                "estimated_duration_seconds": 25 if section_type == "listening" else 35,
                "audio_url": None,
                "image_url": metadata.get("image_url"),
                "skill_tags": skill_tags,
                "hsk_level": "2",
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

    # Insert options in batches (some may be large — matching has 10 opts x 10 questions)
    # Split into chunks of 50 to avoid payload limits
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
        "total_points": 200,
        "total_duration_minutes": 50,  # 25 listening + 3 transfer + 22 reading
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
            "title": "Examen blanc HSK 2 — Conditions réelles",
            "description": "60 questions · 50 min · Format officiel HSK 2026. Écoute (35 q.) + Lecture (25 q.). Score sur 200, seuil de réussite : 120.",
        },
        {
            "id": mock_exam_translation_uuid(2),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "en",
            "title": "HSK 2 Mock Exam — Real Conditions",
            "description": "60 questions · 50 min · Official HSK 2026 format. Listening (35 q.) + Reading (25 q.). Score out of 200, passing score: 120.",
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
            "duration_minutes": 25,
            "title_fr": "Compréhension orale",
            "title_en": "Listening Comprehension",
            "instructions_fr": "Tu vas entendre des phrases ou dialogues deux fois. Réponds aux questions correspondantes.",
            "instructions_en": "You will hear sentences or dialogues twice. Answer the corresponding questions.",
        },
        {
            "json_id": "reading",
            "section_type": "reading",
            "sort_order": 2,
            "total_points": 100,
            "duration_minutes": 22,
            "title_fr": "Compréhension écrite",
            "title_en": "Reading Comprehension",
            "instructions_fr": "Lis les phrases et choisis la bonne réponse.",
            "instructions_en": "Read the sentences and choose the correct answer.",
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
    print("  ✅ HSK 2 Mock Exam import complete!")
    print("=" * 60)

    # Count by section
    listening_count = sum(1 for s in sections_data if s["id"] == "listening" for _ in s["items"])
    reading_count = sum(1 for s in sections_data if s["id"] == "reading" for _ in s["items"])

    # Count by type
    type_counts = {}
    for s in sections_data:
        for item in s["items"]:
            t = item["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n  Mock Exam ID: {MOCK_EXAM_ID}")
    print(f"  Course: HSK 2 ({COURSE_ID})")
    print(f"  Total exercises: {len(all_exercises)}")
    print(f"  Total options: {len(all_ex_options)}")
    print(f"  Listening: {listening_count} questions")
    print(f"  Reading: {reading_count} questions")
    print(f"\n  Types breakdown:")
    for t, c in sorted(type_counts.items()):
        print(f"    {t}: {c}")
    print(f"\n  Total points: 200")
    print(f"  Duration: ~50 min")
    print(f"  Passing score: 120")
    print()


if __name__ == "__main__":
    main()
