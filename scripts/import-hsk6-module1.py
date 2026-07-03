#!/usr/bin/env python3
"""
Import HSK6 Module 1 from JSON into Supabase.

Creates:
  - 1 module (b0000000-0006-0000-0000-000000000001) in course HSK6
  - 5 lessons (c0000000-0006-0000-0000-000000000001..005)
  - lesson_translations (fr) with content_html generated from content_blocks
  - module_translations (fr)
  - exercises with metadata JSONB
  - exercise_translations (fr)
"""

import json
import sys
import os
import re
import html
import requests

# ─── Config ──────────────────────────────────────────────────────────────
SB_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
HEADERS = {
    "apikey": SB_KEY,
    "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

COURSE_ID = "a0000000-0000-0000-0000-000000000006"  # HSK6
MODULE_ID = "b0000000-0006-0000-0000-000000000001"   # Module 1

# Lesson ID pattern: c0000000-0006-0000-0000-00000000000X
def lesson_id(n):
    return f"c0000000-0006-0000-0000-{n:012d}"

# Exercise ID pattern: e6000000-0001-0000-0000-00000000XXXX
def exercise_id(n):
    return f"e6000000-0001-0000-0000-{n:012d}"


# ─── Load JSON ───────────────────────────────────────────────────────────
with open("/home/user/uploaded_files/hsk6_module1_lessons_v1.json.txt", "r") as f:
    data = json.load(f)

module = data["module"]
lessons = module["lessons"]

print(f"Module: {module['title']}")
print(f"Lessons: {len(lessons)}")
total_exercises = sum(len(l.get("exercises", [])) for l in lessons)
print(f"Total exercises: {total_exercises}")
print()


# ─── Helper: build content_html from content_blocks ─────────────────────
def build_content_html(lesson_data):
    """Convert content_blocks into rich HTML for lesson display."""
    blocks = lesson_data.get("content_blocks", [])
    parts = []

    for block in blocks:
        btype = block.get("type", "")

        if btype == "concept":
            title = block.get("title", "Concept")
            body = block.get("body_fr", "")
            parts.append(f"""
<div class="concept-block bg-indigo-50 border-l-4 border-indigo-400 rounded-xl p-5 my-6">
  <h3 class="text-lg font-bold text-indigo-800 mb-2">💡 {html.escape(title)}</h3>
  <p class="text-navy-700 leading-relaxed">{html.escape(body)}</p>
</div>""")

        elif btype == "strategy":
            title = block.get("title", "Stratégie")
            steps = block.get("steps", [])
            steps_html = "\n".join(
                f'  <li class="flex items-start gap-3 py-2"><span class="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0">{i+1}</span><span>{html.escape(s)}</span></li>'
                for i, s in enumerate(steps)
            )
            parts.append(f"""
<div class="strategy-block bg-teal-50 border border-teal-200 rounded-xl p-5 my-6">
  <h3 class="text-lg font-bold text-teal-800 mb-3">🎯 {html.escape(title)}</h3>
  <ol class="space-y-1">
{steps_html}
  </ol>
</div>""")

        elif btype in ("core_text", "test_text"):
            title = block.get("title", "Texte")
            text_zh = block.get("text_zh", "")
            text_pinyin = block.get("text_pinyin", "")
            translation = block.get("translation_fr", "")
            label = block.get("label", "")

            heading = title if not label else f"{title} ({label})"

            parts.append(f"""
<div class="text-block bg-amber-50/50 border border-amber-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-amber-800 mb-3">📖 {html.escape(heading)}</h3>
  <p class="text-xl leading-loose text-navy-900 font-chinese mb-3" lang="zh">{html.escape(text_zh)}</p>
  {f'<p class="text-sm text-navy-400 italic mb-3">{html.escape(text_pinyin)}</p>' if text_pinyin else ''}
  {f'<details class="mt-3"><summary class="text-sm text-navy-500 cursor-pointer hover:text-teal-600">Voir la traduction</summary><p class="text-sm text-navy-600 mt-2 p-3 bg-white rounded-lg">{html.escape(translation)}</p></details>' if translation else ''}
</div>""")

        elif btype == "vocabulary_focus":
            items = block.get("items", [])
            if items:
                rows = "\n".join(
                    f'<tr class="border-b border-cream-100"><td class="py-2.5 px-3 text-lg font-chinese" lang="zh">{html.escape(it["zh"])}</td><td class="py-2.5 px-3 text-sm text-navy-400 italic">{html.escape(it.get("pinyin",""))}</td><td class="py-2.5 px-3 text-sm text-navy-700">{html.escape(it["fr"])}</td><td class="py-2.5 px-3 text-xs text-navy-400">{html.escape(it.get("usage_note_fr",""))}</td></tr>'
                    for it in items
                )
                parts.append(f"""
<div class="vocab-block my-6">
  <h3 class="text-base font-semibold text-navy-800 mb-3">📝 Vocabulaire clé</h3>
  <div class="overflow-x-auto">
    <table class="w-full text-left">
      <thead><tr class="border-b-2 border-cream-200"><th class="py-2 px-3 text-xs text-navy-500">Chinois</th><th class="py-2 px-3 text-xs text-navy-500">Pinyin</th><th class="py-2 px-3 text-xs text-navy-500">Français</th><th class="py-2 px-3 text-xs text-navy-500">Note</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
</div>""")

        elif btype == "hsk_trap":
            title = block.get("title", "Piège HSK")
            body = block.get("body_fr", "")
            parts.append(f"""
<div class="trap-block bg-red-50 border-l-4 border-red-300 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-red-700 mb-2">⚠️ {html.escape(title)}</h3>
  <p class="text-sm text-navy-700 leading-relaxed">{html.escape(body)}</p>
</div>""")

        elif btype == "structure_map":
            title = block.get("title", "Structure")
            roles = block.get("roles", [])
            if roles:
                roles_html = "\n".join(
                    f'<div class="flex items-start gap-3 py-2"><span class="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium shrink-0">{html.escape(r.get("function_label_fr",""))}</span><span class="text-sm text-navy-700">{html.escape(r.get("sentence_zh",""))}</span></div>'
                    for r in roles
                )
                parts.append(f"""
<div class="structure-block bg-violet-50 border border-violet-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-violet-800 mb-3">🗂️ {html.escape(title)}</h3>
  <div class="space-y-1">{roles_html}</div>
</div>""")

        elif btype == "connector_table":
            title = block.get("title", "Connecteurs")
            rows_data = block.get("rows", [])
            if rows_data:
                rows = "\n".join(
                    f'<tr class="border-b border-cream-100"><td class="py-2.5 px-3 font-chinese text-lg" lang="zh">{html.escape(r.get("connector_zh",""))}</td><td class="py-2.5 px-3 text-sm text-navy-400 italic">{html.escape(r.get("pinyin",""))}</td><td class="py-2.5 px-3 text-sm text-navy-700">{html.escape(r.get("function_fr",""))}</td><td class="py-2.5 px-3 text-xs text-navy-400">{html.escape(r.get("example_zh",""))}</td></tr>'
                    for r in rows_data
                )
                parts.append(f"""
<div class="connector-block my-6">
  <h3 class="text-base font-semibold text-navy-800 mb-3">🔗 {html.escape(title)}</h3>
  <div class="overflow-x-auto">
    <table class="w-full text-left">
      <thead><tr class="border-b-2 border-cream-200"><th class="py-2 px-3 text-xs text-navy-500">Connecteur</th><th class="py-2 px-3 text-xs text-navy-500">Pinyin</th><th class="py-2 px-3 text-xs text-navy-500">Fonction</th><th class="py-2 px-3 text-xs text-navy-500">Exemple</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
</div>""")

        elif btype == "assessment_instruction":
            title = block.get("title", "Instructions")
            body = block.get("body_fr", "")
            parts.append(f"""
<div class="assessment-block bg-navy-50 border border-navy-200 rounded-xl p-5 my-6">
  <h3 class="text-lg font-bold text-navy-800 mb-2">📋 {html.escape(title)}</h3>
  <p class="text-navy-700 leading-relaxed">{html.escape(body)}</p>
</div>""")

        else:
            # Generic block
            body = block.get("body_fr", block.get("text", ""))
            if body:
                parts.append(f'<div class="my-4"><p class="text-navy-700">{html.escape(body)}</p></div>')

    # Add objectives if present
    objectives = lesson_data.get("objectives", [])
    if objectives:
        obj_items = "\n".join(f'<li class="text-sm text-navy-700">{html.escape(o)}</li>' for o in objectives)
        objectives_html = f"""
<div class="objectives-block bg-cream-50 border border-cream-100 rounded-xl p-5 mb-6">
  <h3 class="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-3">🎯 Objectifs de cette leçon</h3>
  <ul class="space-y-2 list-disc list-inside">
{obj_items}
  </ul>
</div>"""
        parts.insert(0, objectives_html)

    # Add revision_summary if present
    summary = lesson_data.get("revision_summary", {})
    if summary:
        key_points = summary.get("key_points_fr", [])
        if key_points:
            pts = "\n".join(f'<li class="text-sm text-navy-700">{html.escape(p)}</li>' for p in key_points)
            parts.append(f"""
<div class="summary-block bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-8">
  <h3 class="text-base font-semibold text-emerald-800 mb-3">✅ À retenir</h3>
  <ul class="space-y-2 list-disc list-inside">
{pts}
  </ul>
</div>""")

    return "\n".join(parts)


# ─── Map exercise types to DB exercise_type ──────────────────────────────
def map_exercise_type(json_type):
    """Map JSON exercise types to our DB exercise_type enum."""
    mapping = {
        "main_idea_mcq": "mcq",
        "summary_choice": "mcq",
        "inference_mcq": "mcq",
        "sentence_function": "mcq",
        "connector_analysis": "mcq",
        "connector_choice": "mcq",
        "meaning_in_context": "mcq",
        "trap_identification": "mcq",
        "title_selection": "mcq",
        "cross_text_analysis": "mcq",
        "timed_reading_main_idea": "mcq",
        "fill_in_blank": "fill_blank",
        "sentence_reordering": "reorder",
        "sentence_transformation": "controlled_translation",
        "micro_production": "controlled_translation",
        "mini_summary": "controlled_translation",
        "classification": "matching",
        "keyword_selection": "mcq",
        "reading_strategy_reflection": "controlled_translation",
    }
    return mapping.get(json_type, "mcq")


# ─── Build exercise metadata ─────────────────────────────────────────────
def build_exercise_metadata(ex, lesson_content_blocks):
    """Build metadata JSONB from exercise JSON."""
    json_type = ex.get("type", "")
    meta = {"original_type": json_type, "tags": ex.get("tags", [])}

    # Resolve stimulus_ref to actual text
    stimulus_ref = ex.get("stimulus_ref", "")
    if stimulus_ref:
        # Find the content block referenced
        for block in lesson_content_blocks:
            block_id = block.get("id", "")
            block_type = block.get("type", "")
            # Match by partial key
            if stimulus_ref.endswith(block_type) or stimulus_ref.endswith(block_id):
                meta["stimulus_zh"] = block.get("text_zh", "")
                meta["stimulus_pinyin"] = block.get("text_pinyin", "")
                meta["stimulus_fr"] = block.get("translation_fr", "")
                break
        # If not found by exact match, try fuzzy (core_text, test_text)
        if "stimulus_zh" not in meta:
            for block in lesson_content_blocks:
                if block.get("type") in ("core_text", "test_text"):
                    if block.get("label", "") in stimulus_ref or block.get("type", "") in stimulus_ref:
                        meta["stimulus_zh"] = block.get("text_zh", "")
                        meta["stimulus_pinyin"] = block.get("text_pinyin", "")
                        meta["stimulus_fr"] = block.get("translation_fr", "")
                        break

    # Direct stimulus
    if "stimulus_zh" in ex:
        meta["stimulus_zh"] = ex["stimulus_zh"]
    if "stimulus_pinyin" in ex:
        meta["stimulus_pinyin"] = ex["stimulus_pinyin"]

    # MCQ-like types
    if ex.get("options"):
        options = ex["options"]
        correct = ex.get("correct_answer", "")
        # Convert option format to our standard
        option_texts = []
        correct_index = 0
        for i, opt in enumerate(options):
            text = opt.get("text_fr", opt.get("text_zh", opt.get("text", "")))
            option_texts.append(text)
            if opt.get("id", "") == correct:
                correct_index = i
        meta["options"] = option_texts
        meta["correct_index"] = correct_index

    # Fill-in-blank
    if json_type == "fill_in_blank":
        meta["sentence_template"] = ex.get("sentence_zh", "")
        if ex.get("options"):
            option_texts = [opt.get("text_zh", opt.get("text", "")) for opt in ex["options"]]
            meta["options"] = option_texts
            correct = ex.get("correct_answer", "")
            for i, opt in enumerate(ex["options"]):
                if opt.get("id") == correct:
                    meta["correct_index"] = i
                    meta["correct_answer"] = opt.get("text_zh", "")
                    break

    # Reordering
    if json_type == "sentence_reordering":
        sentences = ex.get("sentences", [])
        meta["words"] = [s.get("text_zh", "") for s in sentences]
        correct_order = ex.get("correct_order", [])
        # Map letter order to indices
        id_to_idx = {s["id"]: i for i, s in enumerate(sentences)}
        meta["correct_order"] = [id_to_idx.get(letter, i) for i, letter in enumerate(correct_order)]
        meta["correct_sentence"] = "".join(meta["words"][i] for i in meta["correct_order"])

    # Classification (-> matching)
    if json_type == "classification":
        items = ex.get("items", [])
        categories = ex.get("categories", [])
        correct_mapping = ex.get("correct_mapping", {})
        cat_map = {c["id"]: c.get("label_fr", c["id"]) for c in categories}
        meta["pairs"] = []
        for item in items:
            cat_id = correct_mapping.get(item["id"], "")
            meta["pairs"].append({
                "left": item.get("text_zh", ""),
                "right": cat_map.get(cat_id, cat_id),
            })

    # Micro-production / sentence_transformation / mini_summary
    if json_type in ("micro_production", "sentence_transformation", "mini_summary", "reading_strategy_reflection"):
        meta["expected_pattern"] = ex.get("expected_pattern", "")
        meta["sample_answer_zh"] = ex.get("sample_answer_zh", ex.get("sample_answer", ""))
        meta["rubric"] = ex.get("rubric", [])
        meta["source_text"] = ex.get("source_zh", "")
        meta["prompt_detail"] = ex.get("prompt_fr", "")

    # Keyword selection
    if json_type == "keyword_selection":
        meta["keywords"] = ex.get("keywords", [])
        meta["correct_keywords"] = ex.get("correct_keywords", [])

    # Timed reading
    if json_type == "timed_reading_main_idea":
        meta["time_limit_seconds"] = ex.get("time_limit_seconds", 180)

    return meta


# ─── Supabase API helper ─────────────────────────────────────────────────
def sb_post(table, data):
    url = f"{SB_URL}/rest/v1/{table}"
    resp = requests.post(url, headers=HEADERS, json=data)
    if resp.status_code not in (200, 201):
        print(f"  ERROR {resp.status_code} inserting into {table}: {resp.text[:300]}")
        return None
    return resp.json()

def sb_upsert(table, data):
    url = f"{SB_URL}/rest/v1/{table}"
    h = {**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}
    resp = requests.post(url, headers=h, json=data)
    if resp.status_code not in (200, 201):
        print(f"  ERROR {resp.status_code} upserting into {table}: {resp.text[:300]}")
        return None
    return resp.json()

def sb_patch(table, query, data):
    url = f"{SB_URL}/rest/v1/{table}?{query}"
    resp = requests.patch(url, headers=HEADERS, json=data)
    if resp.status_code not in (200, 204):
        print(f"  ERROR {resp.status_code} patching {table}: {resp.text[:300]}")
        return None
    return True


# ═══════════════════════════════════════════════════════════════════════════
# MAIN IMPORT
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("STEP 1: Create Module")
print("=" * 60)

module_row = {
    "id": MODULE_ID,
    "course_id": COURSE_ID,
    "sort_order": 1,
    "status": "published",
    "estimated_duration_minutes": module.get("estimated_duration_min", 140),
}
result = sb_upsert("modules", module_row)
print(f"  Module: {result[0]['id'] if result else 'FAILED'}")

# Module translation
mod_trans = {
    "module_id": MODULE_ID,
    "locale": "fr",
    "title": module["title"],
    "description": module.get("subtitle", ""),
    "objectives": json.dumps(module.get("competency_outcomes", []), ensure_ascii=False),
}
result = sb_upsert("module_translations", mod_trans)
print(f"  Module translation: {'OK' if result else 'FAILED'}")

print()
print("=" * 60)
print("STEP 2: Create Lessons + Translations")
print("=" * 60)

for i, lesson in enumerate(lessons, 1):
    lid = lesson_id(i)
    
    # Determine lesson_type mapping
    lt = lesson.get("lesson_type", "standard")
    if lt in ("assessment",):
        lesson_type = "assessment"
    elif lt in ("reading_strategy", "connector_strategy", "timed_reading_strategy"):
        lesson_type = "standard"
    else:
        lesson_type = "standard"

    lesson_row = {
        "id": lid,
        "module_id": MODULE_ID,
        "sort_order": i,
        "lesson_type": lesson_type,
        "status": "published",
        "estimated_duration_minutes": lesson.get("estimated_duration_min", 25),
    }
    result = sb_upsert("lessons", lesson_row)
    print(f"  Lesson {i}: {lid} → {lesson['title'][:50]} ({'OK' if result else 'FAILED'})")

    # Build content_html from content_blocks
    content_html = build_content_html(lesson)

    lesson_trans = {
        "lesson_id": lid,
        "locale": "fr",
        "title": lesson["title"],
        "description": lesson.get("subtitle", ""),
        "content_html": content_html,
    }
    result = sb_upsert("lesson_translations", lesson_trans)
    print(f"    Translation fr: {'OK' if result else 'FAILED'} (content_html: {len(content_html)} chars)")

print()
print("=" * 60)
print("STEP 3: Create Exercises + Translations")
print("=" * 60)

ex_counter = 0
for i, lesson in enumerate(lessons, 1):
    lid = lesson_id(i)
    exercises = lesson.get("exercises", [])
    content_blocks = lesson.get("content_blocks", [])
    
    print(f"\n  Lesson {i} ({lesson['title'][:40]}) — {len(exercises)} exercises:")
    
    for j, ex in enumerate(exercises, 1):
        ex_counter += 1
        eid = exercise_id(ex_counter)
        
        db_type = map_exercise_type(ex.get("type", ""))
        metadata = build_exercise_metadata(ex, content_blocks)
        
        # Determine skill_tags from exercise tags
        skill_tags = ex.get("tags", [])
        
        exercise_row = {
            "id": eid,
            "lesson_id": lid,
            "exercise_type": db_type,
            "difficulty": ex.get("difficulty", 2),
            "points": ex.get("points", 2),
            "estimated_duration_seconds": 60,
            "skill_tags": skill_tags,
            "hsk_level": 6,
            "sort_order": j,
            "status": "published",
            "metadata": metadata,
        }
        result = sb_upsert("exercises", exercise_row)
        
        # Exercise translation
        ex_trans = {
            "exercise_id": eid,
            "locale": "fr",
            "prompt": ex.get("prompt_fr", ""),
            "instruction": "",
            "explanation": ex.get("explanation_fr", ""),
            "hint": None,
        }
        sb_upsert("exercise_translations", ex_trans)
        
        status = "OK" if result else "FAIL"
        print(f"    {eid}: {ex['type']} → {db_type} ({status})")

print()
print("=" * 60)
print("STEP 4: Publish HSK6 Course")
print("=" * 60)

result = sb_patch("courses", f"id=eq.{COURSE_ID}", {"status": "published"})
print(f"  Course HSK6 status → published: {'OK' if result else 'FAILED'}")

print()
print("=" * 60)
print(f"IMPORT COMPLETE: 1 module, {len(lessons)} lessons, {ex_counter} exercises")
print("=" * 60)
