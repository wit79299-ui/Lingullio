#!/usr/bin/env python3
"""
Import HSK 7-9 Mock Exam (elite level, 98 questions) into Supabase.

HSK 7-9 structure (official unified advanced exam):
- Listening (40q): Section1 audio_mcq_text (34), Section2 audio_short_answer (6)
- Reading (47q):   Section1 reading_mcq (33), Section2 reading_short_answer (14)
- Writing (2q):    chart_description_and_argumentative_response (1, 25pts),
                   argumentative_essay (1, 27pts)
- Translation (4q): translation_task (4, 22pts each)
- Speaking (5q):    spoken_response (5, 22pts each)
Total: 98 questions, 483 points, ~210 minutes

Scoring bands:
  Below HSK7: 0-54%, HSK7: 55-69%, HSK8: 70-84%, HSK9: 85-100%

Tables involved:
- courses, course_translations  (create HSK 7-9 course if missing)
- exercises, exercise_translations, exercise_options, exercise_option_translations
- mock_exams, mock_exam_translations
- mock_exam_sections, mock_exam_section_translations
- mock_exam_questions

UUID conventions for HSK 7-9 mock exam (uses 0007 pattern):
- Mock exam:    d0e00100-0007-4000-a000-000000000001
- Sections:     d0e00110-0007-4000-a000-{section_order:012d}
- Exercises:    d0e00120-0007-4000-a000-{question_number:012d}
- Options:      d0e00130-0007-4{q:03d}-a{opt:03d}-000000000001
- Ex transl:    d0e00141-0007-4{q:03d}-a000-{n:012d}
- Opt transl:   d0e00142-0007-4{q:03d}-a{opt:03d}-{n:012d}
- Sec transl:   d0e00143-0007-4{sec:03d}-a000-{n:012d}
- Exam transl:  d0e00144-0007-4000-a000-{n:012d}
- Questions:    d0e00150-0007-4000-a000-{q:012d}
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

COURSE_ID = "a0000000-0000-0000-0000-000000000079"  # HSK 7-9 (existing course)
MOCK_EXAM_ID = "d0e00100-0007-4000-a000-000000000001"

JSON_PATH = os.path.join(
    os.path.expanduser("~"),
    "webapp", "tmp", "hsk79",
    "hsk7_9_mock_exam_elite_v1_full.json",
)

TOTAL_QUESTIONS = 98
NUM_SECTIONS = 5  # listening, reading, writing, translation, speaking

LEVEL_STR = "0007"

# ─── UUID Helpers ───────────────────────────────────────────────────────

def section_uuid(order: int) -> str:
    return f"d0e00110-{LEVEL_STR}-4000-a000-{order:012d}"

def exercise_uuid(q: int) -> str:
    return f"d0e00120-{LEVEL_STR}-4000-a000-{q:012d}"

def option_uuid(q: int, opt_order: int) -> str:
    return f"d0e00130-{LEVEL_STR}-4{q:03d}-a{opt_order:03d}-000000000001"

def ex_translation_uuid(q: int, n: int = 1) -> str:
    return f"d0e00141-{LEVEL_STR}-4{q:03d}-a000-{n:012d}"

def opt_translation_uuid(q: int, opt_order: int, n: int = 1) -> str:
    return f"d0e00142-{LEVEL_STR}-4{q:03d}-a{opt_order:03d}-{n:012d}"

def section_translation_uuid(sec: int, n: int = 1) -> str:
    return f"d0e00143-{LEVEL_STR}-4{sec:03d}-a000-{n:012d}"

def mock_exam_translation_uuid(n: int = 1) -> str:
    return f"d0e00144-{LEVEL_STR}-4000-a000-{n:012d}"

def mock_exam_question_uuid(q: int) -> str:
    return f"d0e00150-{LEVEL_STR}-4000-a000-{q:012d}"

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
    "audio_mcq_text": "mcq",                                       # 34 items, 4-option MCQ
    "audio_short_answer": "essay",                                  # 6 items, open-ended response
    # Reading
    "reading_mcq": "mcq",                                          # 33 items, 4-option MCQ
    "reading_short_answer": "essay",                                # 14 items, open-ended response
    # Writing
    "chart_description_and_argumentative_response": "essay",        # 1 item, 25pts, chart + argument
    "argumentative_essay": "essay",                                 # 1 item, 27pts, full essay
    # Translation
    "translation_task": "controlled_translation",                   # 4 items, 22pts each
    # Speaking
    "spoken_response": "essay",                                     # 5 items, 22pts each, oral
}

# ─── Build exercise metadata ───────────────────────────────────────────

def build_metadata(item: dict, section_type: str) -> dict:
    meta = {
        "mock_exam_type": item["type"],
        "section": section_type,
        "part": item.get("part", ""),
    }

    # Audio (listening section) — HSK 7-9 uses transcript_zh (not script_hanzi)
    if item.get("audio"):
        aud = item["audio"]
        meta["audio"] = {
            "script_hanzi": aud.get("transcript_zh", ""),
            "script_pinyin": "",
            "repeat_count": aud.get("play_count", 1),
        }

    # Review / explanation
    if "review" in item:
        meta["review"] = item["review"]

    # Diagnostic tags
    if "diagnostic_tags" in item:
        meta["diagnostic_tags"] = item["diagnostic_tags"]

    # Exam display (instructions, options layout, timers)
    if "exam_display" in item:
        meta["exam_display"] = item["exam_display"]

    # Stimulus (passage, chart, topic, source_text)
    if item.get("stimulus"):
        meta["stimulus"] = item["stimulus"]

    # Expected answer points for subjective items
    if "expected_answer_points" in item:
        meta["expected_answer_points"] = item["expected_answer_points"]

    # Chart writing specifics
    if item["type"] == "chart_description_and_argumentative_response":
        rubric = item.get("review", {}).get("rubric")
        if rubric:
            meta["scoring_rubric"] = rubric

    # Argumentative essay specifics
    if item["type"] == "argumentative_essay":
        rubric = item.get("review", {}).get("rubric")
        if rubric:
            meta["scoring_rubric"] = rubric

    # Translation specifics
    if item["type"] == "translation_task":
        rubric = item.get("review", {}).get("rubric")
        if rubric:
            meta["scoring_rubric"] = rubric

    # Speaking specifics
    if item["type"] == "spoken_response":
        rubric = item.get("review", {}).get("rubric")
        if rubric:
            meta["scoring_rubric"] = rubric
        if item.get("exam_display"):
            meta["preparation_seconds"] = item["exam_display"].get("preparation_seconds", 90)
            meta["response_seconds"] = item["exam_display"].get("response_seconds", 120)

    return meta


def build_options(item: dict) -> list:
    options = []
    answer = item.get("correct_answer")
    item_type = item["type"]

    if item_type == "audio_mcq_text":
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

    elif item_type == "audio_short_answer":
        # Store expected answer points as a model option for review mode
        points = item.get("expected_answer_points", [])
        if points:
            options.append({
                "id": "model",
                "content": " / ".join(points),
                "is_correct": True,
                "sort_order": 1,
            })

    elif item_type == "reading_short_answer":
        points = item.get("expected_answer_points", [])
        if points:
            options.append({
                "id": "model",
                "content": " / ".join(points),
                "is_correct": True,
                "sort_order": 1,
            })

    elif item_type == "chart_description_and_argumentative_response":
        model = item.get("review", {}).get("model_answer_zh", "")
        if model:
            options.append({
                "id": "model",
                "content": model,
                "content_hanzi": model,
                "is_correct": True,
                "sort_order": 1,
            })

    elif item_type == "argumentative_essay":
        model = item.get("review", {}).get("model_answer_zh", "")
        if model:
            options.append({
                "id": "model",
                "content": model,
                "content_hanzi": model,
                "is_correct": True,
                "sort_order": 1,
            })

    elif item_type == "translation_task":
        model = item.get("review", {}).get("model_translation_zh", "")
        if model:
            options.append({
                "id": "model",
                "content": model,
                "content_hanzi": model,
                "is_correct": True,
                "sort_order": 1,
            })

    elif item_type == "spoken_response":
        note = item.get("review", {}).get("sample_response_note_zh", "")
        if note:
            options.append({
                "id": "model",
                "content": note,
                "content_hanzi": note,
                "is_correct": True,
                "sort_order": 1,
            })

    return options


def build_prompt_fr(item: dict) -> str:
    item_type = item["type"]
    ed = item.get("exam_display", {})
    stim = item.get("stimulus") or {}

    if item_type == "audio_mcq_text":
        question = ed.get("question_zh", "")
        instr = ed.get("instruction_fr", "Écoute puis choisis la meilleure réponse.")
        return f"{instr}\n{question}"

    elif item_type == "audio_short_answer":
        prompt = ed.get("prompt_zh", "")
        instr = ed.get("instruction_fr", "Réponds en chinois de façon concise et structurée.")
        return f"{instr}\n{prompt}"

    elif item_type == "reading_mcq":
        passage = stim.get("passage_hanzi", stim.get("text_zh", ""))
        question = ed.get("question_zh", stim.get("question_hanzi", ""))
        instr = ed.get("instruction_fr", "Lis le texte et réponds.")
        if question:
            return f"{instr}\n{passage}\n★ {question}"
        else:
            return f"{instr}\n{passage}"

    elif item_type == "reading_short_answer":
        passage = stim.get("text_zh", "")
        prompt = ed.get("prompt_zh", "")
        instr = ed.get("instruction_fr", "Réponds en chinois de façon concise et structurée.")
        return f"{instr}\n{passage}\n★ {prompt}"

    elif item_type == "chart_description_and_argumentative_response":
        prompt = stim.get("prompt_zh", "")
        instr = ed.get("instruction_fr", "Décris le graphique et argumente.")
        chart = stim.get("chart_data", {})
        chart_title = chart.get("title_zh", "")
        return f"{instr}\n📊 {chart_title}\n{prompt}"

    elif item_type == "argumentative_essay":
        topic = stim.get("topic_zh", "")
        reqs = stim.get("requirements_zh", "")
        instr = ed.get("instruction_fr", "Rédige un essai argumentatif.")
        return f"{instr}\n{topic}\n{reqs}"

    elif item_type == "translation_task":
        source = stim.get("source_text", "")
        instr = ed.get("instruction_fr", "Traduis en chinois.")
        return f"{instr}\n{source}"

    elif item_type == "spoken_response":
        topic = stim.get("topic_zh", "")
        instr = ed.get("instruction_fr", "Prépare puis réponds oralement en chinois.")
        prep = ed.get("preparation_seconds", 90)
        resp_time = ed.get("response_seconds", 120)
        return f"{instr}\n{topic}\n⏱ Préparation : {prep}s · Réponse : {resp_time}s"

    return ""


def build_instruction_fr(item: dict) -> str:
    return item.get("exam_display", {}).get("instruction_fr", "")


# ─── Main import logic ──────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  HSK 7-9 Mock Exam Import — 98 questions")
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

    # ─── Step 0: Course already exists ───────────────────────────────────
    print(f"\n📚 Using existing HSK 7-9 course: {COURSE_ID}")

    # ─── Step 1: Cleanup ────────────────────────────────────────────────
    print("\n🧹 Cleaning up previous HSK 7-9 mock exam import...")

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

    # ─── Step 2: Create exercises ───────────────────────────────────────
    print("\n📝 Creating exercises...")

    all_exercises = []
    all_ex_translations = []
    all_ex_options = []
    all_opt_translations = []

    for section in sections_data:
        section_type = section["id"]

        for item in section["items"]:
            q_num = item["global_order"]
            ex_id = exercise_uuid(q_num)
            ex_type = TYPE_MAP.get(item["type"], "mcq")

            skill_tags = [section_type]
            if item.get("diagnostic_tags"):
                skill_tags.extend(item["diagnostic_tags"])

            metadata = build_metadata(item, section_type)

            # Estimated duration by section type
            if section_type == "listening":
                est_duration = 30 if item["type"] == "audio_mcq_text" else 60
            elif section_type == "reading":
                est_duration = 60 if item["type"] == "reading_mcq" else 90
            elif section_type == "writing":
                est_duration = 1800  # ~30min per writing task
            elif section_type == "translation":
                est_duration = 600  # ~10min per translation
            elif section_type == "speaking":
                est_duration = 210  # prep + response time
            else:
                est_duration = 60

            points = item.get("scoring", {}).get("raw_points", 1)

            exercise = {
                "id": ex_id,
                "lesson_id": None,
                "exercise_type": ex_type,
                "difficulty": 5,  # HSK 7-9 max difficulty (constraint: 1-5)
                "points": points,
                "estimated_duration_seconds": est_duration,
                "audio_url": None,
                "image_url": None,
                "skill_tags": skill_tags,
                "hsk_level": "7",  # Use '7' for HSK 7-9 (check constraint)
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

    # ─── Step 3: Mock exam ──────────────────────────────────────────────
    print("\n🏫 Creating mock exam...")

    mock_exam = {
        "id": MOCK_EXAM_ID,
        "course_id": COURSE_ID,
        "status": "published",
        "total_points": 483,
        "total_duration_minutes": 210,
        "sort_order": 1,
    }
    ok = supabase_post("mock_exams", [mock_exam])
    print(f"   {'✓' if ok else '✗'} mock_exam created")

    translations = [
        {
            "id": mock_exam_translation_uuid(1),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "fr",
            "title": "Examen blanc HSK 7-9 — Niveau élite V1",
            "description": (
                "98 questions · ~210 min · Format officiel HSK 7-9 unifié. "
                "Écoute (40 q.) + Lecture (47 q.) + Écriture (2 q.) + Traduction (4 q.) + Expression orale (5 q.). "
                "Score sur 483, bandes : HSK7 (55-69 %), HSK8 (70-84 %), HSK9 (85-100 %)."
            ),
        },
        {
            "id": mock_exam_translation_uuid(2),
            "mock_exam_id": MOCK_EXAM_ID,
            "locale": "en",
            "title": "HSK 7-9 Mock Exam — Elite Level V1",
            "description": (
                "98 questions · ~210 min · Official unified HSK 7-9 format. "
                "Listening (40 q.) + Reading (47 q.) + Writing (2 q.) + Translation (4 q.) + Speaking (5 q.). "
                "Score out of 483, bands: HSK7 (55-69%), HSK8 (70-84%), HSK9 (85-100%)."
            ),
        },
    ]
    ok = supabase_post("mock_exam_translations", translations)
    print(f"   {'✓' if ok else '✗'} mock_exam_translations created")

    # ─── Step 4: Sections ───────────────────────────────────────────────
    print("\n📋 Creating sections...")

    section_configs = [
        {
            "json_id": "listening",
            "section_type": "listening",
            "sort_order": 1,
            "total_points": 88,
            "duration_minutes": 30,
            "title_fr": "Compréhension orale avancée",
            "title_en": "Advanced Listening Comprehension",
            "instructions_fr": (
                "Tu vas entendre des passages ou dialogues une seule fois. "
                "Choisis la meilleure réponse ou réponds de façon concise en chinois."
            ),
            "instructions_en": (
                "You will hear passages or dialogues played once. "
                "Choose the best answer or respond concisely in Chinese."
            ),
        },
        {
            "json_id": "reading",
            "section_type": "reading",
            "sort_order": 2,
            "total_points": 145,
            "duration_minutes": 60,
            "title_fr": "Compréhension écrite avancée",
            "title_en": "Advanced Reading Comprehension",
            "instructions_fr": (
                "Lis les textes puis choisis la bonne réponse "
                "ou réponds de façon concise et structurée en chinois."
            ),
            "instructions_en": (
                "Read the passages then choose the correct answer "
                "or respond concisely and coherently in Chinese."
            ),
        },
        {
            "json_id": "writing",
            "section_type": "writing",
            "sort_order": 3,
            "total_points": 52,
            "duration_minutes": 55,
            "title_fr": "Expression écrite avancée",
            "title_en": "Advanced Writing",
            "instructions_fr": (
                "Décris un graphique et argumente, puis rédige un essai argumentatif. "
                "Minimum 300 et 500 caractères respectivement."
            ),
            "instructions_en": (
                "Describe a chart and argue, then write an argumentative essay. "
                "Minimum 300 and 500 characters respectively."
            ),
        },
        {
            "json_id": "translation",
            "section_type": "translation",
            "sort_order": 4,
            "total_points": 88,
            "duration_minutes": 41,
            "title_fr": "Traduction écrite et orale",
            "title_en": "Written and Oral Translation",
            "instructions_fr": (
                "Traduis les passages du français ou de l'anglais vers le chinois. "
                "Préserve le sens, le registre et la fluidité."
            ),
            "instructions_en": (
                "Translate passages from French or English into Chinese. "
                "Preserve meaning, register, and fluency."
            ),
        },
        {
            "json_id": "speaking",
            "section_type": "speaking",
            "sort_order": 5,
            "total_points": 110,
            "duration_minutes": 24,
            "title_fr": "Expression orale avancée",
            "title_en": "Advanced Speaking",
            "instructions_fr": (
                "Prépare-toi puis réponds oralement en chinois. "
                "Paraphrase, donne ton opinion ou développe un sujet."
            ),
            "instructions_en": (
                "Prepare then respond orally in Chinese. "
                "Paraphrase, give your opinion, or develop a topic."
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

    # ─── Step 5: Link questions ─────────────────────────────────────────
    print("\n🔗 Linking questions to sections...")

    question_links = []
    section_id_map = {
        "listening": section_uuid(1),
        "reading": section_uuid(2),
        "writing": section_uuid(3),
        "translation": section_uuid(4),
        "speaking": section_uuid(5),
    }

    for section in sections_data:
        sec_id = section_id_map[section["id"]]
        for item in section["items"]:
            q_num = item["global_order"]
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
    print("  ✅ HSK 7-9 Mock Exam import complete!")
    print("=" * 60)

    type_counts = {}
    section_counts = {}
    for s in sections_data:
        section_counts[s["id"]] = len(s["items"])
        for item in s["items"]:
            t = item["type"]
            type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n  Mock Exam ID: {MOCK_EXAM_ID}")
    print(f"  Course: HSK 7-9 ({COURSE_ID})")
    print(f"  Total exercises: {len(all_exercises)}")
    print(f"  Total options: {len(all_ex_options)}")

    for sec_name, count in section_counts.items():
        print(f"  {sec_name.capitalize()}: {count} questions")

    print(f"\n  Types breakdown:")
    for t, c in sorted(type_counts.items()):
        print(f"    {t}: {c}")

    print(f"\n  Total points: 483")
    print(f"  Duration: ~210 min")
    print(f"  Bands: Below HSK7 (0-54%), HSK7 (55-69%), HSK8 (70-84%), HSK9 (85-100%)")
    print()


if __name__ == "__main__":
    main()
