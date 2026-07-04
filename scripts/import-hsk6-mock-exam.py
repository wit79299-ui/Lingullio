#!/usr/bin/env python3
"""
Import HSK 6 Mock Exam (real conditions, 101 questions) into Supabase.

HSK6 structure (official new format):
- Listening (50q): Section1 audio judgement true/false (15), Section2 audio MCQ text (35)
- Reading (50q):   Section1 fill-blank MCQ (10), Section2 sentence ordering MCQ (10),
                   Section3 reading MCQ (30: sentence insertion + passage comprehension)
- Writing (1q):    Summary rewrite memory-based (1, 20pts — ~400 chars handwritten)
Total: 101 questions, 300 points, passing 180, ~140 minutes

Tables involved:
- exercises, exercise_translations, exercise_options, exercise_option_translations
- mock_exams, mock_exam_translations
- mock_exam_sections, mock_exam_section_translations
- mock_exam_questions

UUID conventions for HSK6 mock exam (uses 0006 pattern):
- Mock exam:    d0e00100-0006-4000-a000-000000000001
- Sections:     d0e00110-0006-4000-a000-{section_order:012d}
- Exercises:    d0e00120-0006-4000-a000-{question_number:012d}
- Options:      d0e00130-0006-4{q:03d}-a{opt:03d}-000000000001
- Ex transl:    d0e00141-0006-4{q:03d}-a000-{n:012d}
- Opt transl:   d0e00142-0006-4{q:03d}-a{opt:03d}-{n:012d}
- Sec transl:   d0e00143-0006-4{sec:03d}-a000-{n:012d}
- Exam transl:  d0e00144-0006-4000-a000-{n:012d}
- Questions:    d0e00150-0006-4000-a000-{q:012d}
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

COURSE_ID = "a0000000-0000-0000-0000-000000000006"  # HSK-6
MOCK_EXAM_ID = "d0e00100-0006-4000-a000-000000000001"

JSON_PATH = os.path.join(
    os.path.expanduser("~"),
    "webapp", "tmp", "hsk6",
    "hsk6_mock_exam_real_conditions_01_v3_premium_with_summary_handwriting.json",
)

TOTAL_QUESTIONS = 101
NUM_SECTIONS = 3  # listening, reading, writing

# Summary handwriting sheet (Q101)
SUMMARY_SHEET_URL = "/static/mock-exam/hsk6/hsk6_summary_sheet.webp"

# ─── UUID Helpers ───────────────────────────────────────────────────────

def section_uuid(order: int) -> str:
    return f"d0e00110-0006-4000-a000-{order:012d}"

def exercise_uuid(q: int) -> str:
    return f"d0e00120-0006-4000-a000-{q:012d}"

def option_uuid(q: int, opt_order: int) -> str:
    return f"d0e00130-0006-4{q:03d}-a{opt_order:03d}-000000000001"

def ex_translation_uuid(q: int, n: int = 1) -> str:
    return f"d0e00141-0006-4{q:03d}-a000-{n:012d}"

def opt_translation_uuid(q: int, opt_order: int, n: int = 1) -> str:
    return f"d0e00142-0006-4{q:03d}-a{opt_order:03d}-{n:012d}"

def section_translation_uuid(sec: int, n: int = 1) -> str:
    return f"d0e00143-0006-4{sec:03d}-a000-{n:012d}"

def mock_exam_translation_uuid(n: int = 1) -> str:
    return f"d0e00144-0006-4000-a000-{n:012d}"

def mock_exam_question_uuid(q: int) -> str:
    return f"d0e00150-0006-4000-a000-{q:012d}"

# ─── Supabase REST helpers ──────────────────────────────────────────────

def supabase_post(table: str, rows: list, upsert: bool = True) -> bool:
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
    # Listening
    "audio_judgement": "mcq",                        # Section 1: true/false
    "audio_mcq_text": "mcq",                         # Section 2: 4-option MCQ
    # Reading
    "fill_blank_mcq": "fill_blank",                  # Section 1: cloze
    "sentence_ordering_mcq": "mcq",                  # Section 2: paragraph ordering
    "reading_mcq": "mcq",                            # Section 3: sentence insertion + comprehension
    # Writing
    "summary_rewrite_memory_based": "essay",          # Summary rewrite, 20pts
}

# ─── Build exercise metadata ───────────────────────────────────────────

def build_metadata(item: dict, section_type: str) -> dict:
    meta = {
        "mock_exam_type": item["type"],
        "section": section_type,
        "part": item.get("part", ""),
    }

    if "audio" in item:
        aud = item["audio"]
        meta["audio"] = {
            "script_hanzi": aud.get("transcript_zh", ""),
            "script_pinyin": aud.get("transcript_pinyin", ""),
            "repeat_count": aud.get("play_count", 2),
        }

    if "review" in item:
        meta["review"] = item["review"]

    if "diagnostic" in item:
        meta["diagnostic_tags"] = item["diagnostic"].get("skill_tags", [])
        meta["if_wrong"] = item["diagnostic"].get("if_wrong", [])

    if "exam_display" in item:
        meta["exam_display"] = item["exam_display"]

    if "stimulus" in item:
        meta["stimulus"] = item["stimulus"]

    # Summary writing specifics
    if item["type"] == "summary_rewrite_memory_based":
        rubric = item.get("review", {}).get("rubric")
        if rubric:
            meta["scoring_rubric"] = rubric
        meta["handwriting_sheet_url"] = SUMMARY_SHEET_URL
        meta["target_character_count"] = item.get("exam_display", {}).get("target_character_count", 400)

    return meta


def build_options(item: dict) -> list:
    options = []
    answer = item.get("correct_answer")
    item_type = item["type"]

    if item_type == "audio_judgement":
        for i, opt in enumerate(item["exam_display"]["options"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt.get("label_fr", cid),
                "content_fr": opt.get("label_fr", ""),
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "audio_mcq_text":
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

    elif item_type == "sentence_ordering_mcq":
        for i, opt in enumerate(item["exam_display"]["options"]):
            cid = opt["id"]
            options.append({
                "id": cid,
                "content": opt["zh"],
                "content_hanzi": opt["zh"],
                "is_correct": cid == answer,
                "sort_order": i + 1,
            })

    elif item_type == "reading_mcq":
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

    elif item_type == "summary_rewrite_memory_based":
        # Store model answer as reference option
        model = item.get("review", {}).get("model_answer_zh", "")
        if model:
            options.append({
                "id": "model",
                "content": model,
                "content_hanzi": model,
                "is_correct": True,
                "sort_order": 1,
            })

    return options


def build_prompt_fr(item: dict) -> str:
    item_type = item["type"]
    ed = item.get("exam_display", {})
    stim = item.get("stimulus", {})

    if item_type == "audio_judgement":
        statement = ed.get("statement_zh", "")
        instr = ed.get("instruction_fr", "Vrai ou faux ?")
        return f"{instr}\n{statement}"

    elif item_type == "audio_mcq_text":
        question = ed.get("question_zh", "")
        instr = ed.get("instruction_fr", "Choisis la bonne réponse.")
        return f"{instr}\n{question}"

    elif item_type == "fill_blank_mcq":
        sentence = stim.get("hanzi", "")
        instr = ed.get("instruction_fr", "Complète la phrase.")
        return f"{instr}\n{sentence}"

    elif item_type == "sentence_ordering_mcq":
        sentences = stim.get("sentences", [])
        numbered = "\n".join(sentences)
        instr = ed.get("instruction_fr", "Remets les phrases dans le bon ordre.")
        return f"{instr}\n{numbered}"

    elif item_type == "reading_mcq":
        # Some have passage_hanzi + question_hanzi, others have passage_with_blank
        passage = stim.get("passage_hanzi", stim.get("passage_with_blank", ""))
        question = stim.get("question_hanzi", "")
        instr = ed.get("instruction_fr", "Lis le texte et réponds.")
        if question:
            return f"{instr}\n{passage}\n★ {question}"
        else:
            return f"{instr}\n{passage}"

    elif item_type == "summary_rewrite_memory_based":
        instr = ed.get("instruction_fr", "Rédige un résumé.")
        target = ed.get("target_character_count", 400)
        return f"{instr}\nObjectif : environ {target} caractères."

    return ""


def build_instruction_fr(item: dict) -> str:
    return item.get("exam_display", {}).get("instruction_fr", "")


# ─── Main import logic ──────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  HSK 6 Mock Exam Import — 101 questions")
    print("=" * 60)

    print(f"\n📄 Loading JSON from {JSON_PATH}")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    exam = data["mock_exam"]
    sections_data = exam["sections"]
    sections_data = [s for s in sections_data if s.get("items")]

    total_items = sum(len(s["items"]) for s in sections_data)
    print(f"   Exam: {exam['id']}")
    print(f"   Sections with items: {len(sections_data)}")
    print(f"   Total questions: {total_items}")

    if total_items != TOTAL_QUESTIONS:
        print(f"   ⚠ Expected {TOTAL_QUESTIONS} questions, got {total_items}")

    # ─── Step 0: Cleanup ────────────────────────────────────────────────
    print("\n🧹 Cleaning up previous HSK6 mock exam import...")

    for sec_order in range(1, NUM_SECTIONS + 1):
        supabase_delete("mock_exam_questions", f"section_id=eq.{section_uuid(sec_order)}")

    for sec_order in range(1, NUM_SECTIONS + 1):
        supabase_delete("mock_exam_section_translations", f"section_id=eq.{section_uuid(sec_order)}")
    supabase_delete("mock_exam_sections", f"mock_exam_id=eq.{MOCK_EXAM_ID}")

    supabase_delete("mock_exam_translations", f"mock_exam_id=eq.{MOCK_EXAM_ID}")
    supabase_delete("mock_exams", f"id=eq.{MOCK_EXAM_ID}")

    for q in range(1, TOTAL_QUESTIONS + 1):
        eid = exercise_uuid(q)
        for o in range(1, 10):
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
        section_type = section["id"]

        for item in section["items"]:
            q_num = item["order"]
            ex_id = exercise_uuid(q_num)
            ex_type = TYPE_MAP.get(item["type"], "mcq")

            skill_tags = [section_type]
            metadata = build_metadata(item, section_type)

            if section_type == "listening":
                est_duration = 30
            elif section_type == "reading":
                est_duration = 50
            else:
                est_duration = 2700  # summary ~45min (reading + writing)

            points = item.get("scoring", {}).get("raw_points", 1)

            exercise = {
                "id": ex_id,
                "lesson_id": None,
                "exercise_type": ex_type,
                "difficulty": 5,  # HSK6 is difficulty 5
                "points": points,
                "estimated_duration_seconds": est_duration,
                "audio_url": None,
                "image_url": SUMMARY_SHEET_URL if item["type"] == "summary_rewrite_memory_based" else None,
                "skill_tags": skill_tags,
                "hsk_level": "6",
                "sort_order": q_num,
                "status": "published",
                "metadata": metadata,
            }
            all_exercises.append(exercise)

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

            options = build_options(item)
            for opt in options:
                opt_order = opt["sort_order"]
                opt_id = option_uuid(q_num, opt_order)

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

    ok = supabase_post("exercises", all_exercises)
    print(f"   {'✓' if ok else '✗'} exercises inserted")

    ok = supabase_post("exercise_translations", all_ex_translations)
    print(f"   {'✓' if ok else '✗'} exercise_translations inserted")

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

    # ─── Step 2: Mock exam ──────────────────────────────────────────────
    print("\n🏫 Creating mock exam...")

    mock_exam = {
        "id": MOCK_EXAM_ID,
        "course_id": COURSE_ID,
        "status": "published",
        "total_points": 300,
        "total_duration_minutes": 140,
        "sort_order": 1,
    }
    ok = supabase_post("mock_exams", [mock_exam])
    print(f"   {'✓' if ok else '✗'} mock_exam created")

    translations = [
        {
            "id": mock_exam_translation_uuid(1),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "fr",
            "title": "Examen blanc HSK 6 — Conditions réelles",
            "description": (
                "101 questions · ~140 min · Format officiel HSK 2026. "
                "Écoute (50 q.) + Lecture (50 q.) + Écriture (1 résumé manuscrit ~400 caractères). "
                "Score sur 300, seuil de réussite : 180."
            ),
        },
        {
            "id": mock_exam_translation_uuid(2),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "en",
            "title": "HSK 6 Mock Exam — Real Conditions",
            "description": (
                "101 questions · ~140 min · Official HSK 2026 format. "
                "Listening (50 q.) + Reading (50 q.) + Writing (1 handwritten summary ~400 chars). "
                "Score out of 300, passing score: 180."
            ),
        },
    ]
    ok = supabase_post("mock_exam_translations", translations)
    print(f"   {'✓' if ok else '✗'} mock_exam_translations created")

    # ─── Step 3: Sections ───────────────────────────────────────────────
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
                "Tu vas entendre des passages ou dialogues. "
                "Juge si les affirmations sont correctes ou choisis la meilleure réponse."
            ),
            "instructions_en": (
                "You will hear passages or dialogues. "
                "Judge whether statements are correct or choose the best answer."
            ),
        },
        {
            "json_id": "reading",
            "section_type": "reading",
            "sort_order": 2,
            "total_points": 100,
            "duration_minutes": 50,
            "title_fr": "Compréhension écrite",
            "title_en": "Reading Comprehension",
            "instructions_fr": (
                "Complète les phrases, remets les phrases en ordre "
                "ou lis les textes puis choisis la bonne réponse."
            ),
            "instructions_en": (
                "Complete sentences, reorder paragraphs, "
                "or read passages then choose the correct answer."
            ),
        },
        {
            "json_id": "writing",
            "section_type": "writing",
            "sort_order": 3,
            "total_points": 100,
            "duration_minutes": 45,
            "title_fr": "Expression écrite",
            "title_en": "Writing",
            "instructions_fr": (
                "Lis le texte (10 min), puis rédige de mémoire un résumé "
                "d'environ 400 caractères sans recopier l'original."
            ),
            "instructions_en": (
                "Read the passage (10 min), then write a summary of ~400 characters "
                "from memory without copying the original."
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

    # ─── Step 4: Link questions ─────────────────────────────────────────
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
    print("  ✅ HSK 6 Mock Exam import complete!")
    print("=" * 60)

    listening_count = sum(1 for s in sections_data if s["id"] == "listening" for _ in s["items"])
    reading_count = sum(1 for s in sections_data if s["id"] == "reading" for _ in s["items"])
    writing_count = sum(1 for s in sections_data if s["id"] == "writing" for _ in s["items"])

    type_counts = {}
    for s in sections_data:
        for item in s["items"]:
            t = item["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n  Mock Exam ID: {MOCK_EXAM_ID}")
    print(f"  Course: HSK 6 ({COURSE_ID})")
    print(f"  Total exercises: {len(all_exercises)}")
    print(f"  Total options: {len(all_ex_options)}")
    print(f"  Listening: {listening_count} questions")
    print(f"  Reading: {reading_count} questions")
    print(f"  Writing: {writing_count} questions")
    print(f"\n  Types breakdown:")
    for t, c in sorted(type_counts.items()):
        print(f"    {t}: {c}")
    print(f"\n  Total points: 300")
    print(f"  Duration: ~140 min")
    print(f"  Passing score: 180")
    print()


if __name__ == "__main__":
    main()
