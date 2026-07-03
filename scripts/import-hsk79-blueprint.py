#!/usr/bin/env python3
"""
Import HSK 7-9 Premium Course Blueprint into Supabase.

This script:
1. Replaces the 3 separate HSK 7/8/9 courses with a single 'hsk-7-9' course
2. Creates 18 modules with translations (fr)
3. Creates 90 lessons with rich content_html generated from the blueprint specs
4. No exercises yet (the blueprint is a specification, not content with exercises)

UUID conventions:
  Course:  a0000000-0000-0000-0000-000000000079  (new, for HSK 7-9 block)
  Modules: b0000000-0079-0000-0000-{n:012d}       (n=1..18)
  Lessons: c0000000-0079-0000-0000-{n:012d}       (n=1..90)
"""

import json
import sys
import requests
import uuid

SUPA_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
HEADERS = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}

COURSE_ID = "a0000000-0000-0000-0000-000000000079"
OLD_COURSE_IDS = [
    "a0000000-0000-0000-0000-000000000007",
    "a0000000-0000-0000-0000-000000000008",
    "a0000000-0000-0000-0000-000000000009",
]

def module_uuid(n):
    return f"b0000000-0079-0000-0000-{n:012d}"

def lesson_uuid(n):
    return f"c0000000-0079-0000-0000-{n:012d}"


# ──────────────────────────────────────────────────────────────────────────
# HTML GENERATORS
# ──────────────────────────────────────────────────────────────────────────

TRACK_LABELS = {
    "track_hsk7": "HSK 7 (C1-)",
    "track_hsk8": "HSK 8 (C1)",
    "track_hsk9": "HSK 9 (C2)",
}

SKILL_ICONS = {
    "reading": "📖", "listening": "🎧", "writing": "✍️", "speaking": "🗣️",
    "translation": "🔄", "vocabulary": "📝", "grammar": "🔤", "exam_strategy": "🎯",
    "metacognition": "🧠", "inference": "🔍", "logic": "🧩", "analysis": "📊",
    "register": "📋", "culture": "🏮", "note_taking": "📓", "assessment": "📈",
    "adaptive_learning": "⚡",
}

EXERCISE_TYPE_LABELS = {
    "main_idea": "Idée principale", "inference": "Inférence", "detail": "Détail",
    "mcq": "QCM", "true_false_not_given": "Vrai/Faux/Non donné",
    "evidence_matching": "Mise en correspondance", "timed_reading": "Lecture chronométrée",
    "title_selection": "Sélection de titre", "trap_identification": "Identification de pièges",
    "audio_true_false": "Audio vrai/faux", "gap_fill": "Texte à trous",
    "speaker_attitude": "Attitude du locuteur", "note_completion": "Complétion de notes",
    "oral_paraphrase": "Paraphrase orale", "short_argument": "Argumentation courte",
    "written_translation": "Traduction écrite", "translation_task": "Tâche de traduction",
    "guided_writing": "Écriture guidée", "oral_prompt": "Prompt oral",
    "argument_map": "Carte argumentative", "collocation_choice": "Choix de collocation",
    "register_transform": "Transformation de registre", "error_review": "Révision d'erreurs",
    "timed_mixed_section": "Section mixte chronométrée",
    "format_mapping": "Correspondance de format", "self_assessment": "Auto-évaluation",
    "sample_micro_tasks": "Micro-tâches d'exemple",
    "word_formation": "Formation de mots", "context_usage": "Usage en contexte",
    "connector_choice": "Choix de connecteur", "discourse_completion": "Complétion discursive",
    "error_rewrite": "Réécriture d'erreurs", "paragraph_rewrite": "Réécriture de paragraphe",
    "pattern_interpretation": "Interprétation de patterns",
    "oral_reformulation": "Reformulation orale",
    "chengyu_context": "Chengyu en contexte", "meaning_in_context": "Sens en contexte",
    "near_synonym_choice": "Choix de quasi-synonymes", "rewrite_formal": "Réécriture formelle",
    "rewrite_spoken": "Réécriture parlée", "sentence_completion": "Complétion de phrase",
    "translation_microdrill": "Micro-exercice de traduction",
    "explanation_choice": "Choix d'explication", "error_explanation": "Explication d'erreurs",
    "author_intent": "Intention de l'auteur", "logic_chain": "Chaîne logique",
    "modifier_scope": "Portée des modificateurs", "paragraph_function": "Fonction du paragraphe",
    "reference_resolution": "Résolution de références",
    "sentence_segmentation": "Segmentation de phrases", "reorder": "Réordonnancement",
    "audio_outline": "Plan audio", "audio_variation": "Variation audio",
    "detail_selection": "Sélection de détails", "inference_mcq": "QCM d'inférence",
    "paraphrase_recognition": "Reconnaissance de paraphrases",
    "section_labeling": "Étiquetage de sections",
    "timeline_reconstruction": "Reconstruction chronologique",
    "learning_path_assignment": "Attribution du parcours",
}


def build_module_description(module_data, blueprint):
    """Build a rich module description from blueprint data."""
    tracks = module_data.get("track_focus", [])
    track_str = " · ".join(TRACK_LABELS.get(t, t) for t in tracks)
    
    alignment = module_data.get("official_alignment_summary", {})
    
    lessons = module_data.get("lessons", [])
    all_skills = set()
    all_etypes = set()
    for l in lessons:
        for s in l.get("skills", []):
            all_skills.add(s)
        for et in l.get("exercise_types", []):
            all_etypes.add(et)
    
    skills_str = ", ".join(f"{SKILL_ICONS.get(s, '📌')} {s}" for s in sorted(all_skills))
    
    parts = [module_data.get("subtitle", "")]
    if track_str:
        parts.append(f"Paliers : {track_str}")
    if skills_str:
        parts.append(f"Compétences : {skills_str}")
    parts.append(f"{len(lessons)} leçons · ~{module_data.get('estimated_duration_min', '?')} min")
    
    return " | ".join(p for p in parts if p)


def build_module_objectives(module_data):
    """Extract objectives from lesson learner_outputs."""
    objectives = []
    for l in module_data.get("lessons", []):
        outputs = l.get("learner_output", [])
        for o in outputs:
            label = o.replace("_", " ").capitalize()
            if label not in objectives:
                objectives.append(label)
    return objectives


def build_lesson_content_html(lesson_data, module_data, module_order):
    """Generate rich HTML content for a lesson from blueprint specs."""
    parts = []
    
    title = lesson_data.get("title", "")
    duration = lesson_data.get("duration_min", "?")
    tracks = lesson_data.get("target_tracks", [])
    skills = lesson_data.get("skills", [])
    exam_sections = lesson_data.get("exam_sections", [])
    focus_items = lesson_data.get("focus", [])
    learner_outputs = lesson_data.get("learner_output", [])
    exercise_types = lesson_data.get("exercise_types", [])
    official_task = lesson_data.get("official_task_alignment", [])
    quality_req = lesson_data.get("quality_requirements", {})
    
    # ── Header with track badges ──
    track_badges = " ".join(
        f'<span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium '
        f'{"bg-blue-100 text-blue-700" if "hsk7" in t else "bg-purple-100 text-purple-700" if "hsk8" in t else "bg-amber-100 text-amber-700"}">'
        f'{TRACK_LABELS.get(t, t)}</span>'
        for t in tracks
    )
    
    parts.append(f'''
    <div class="mb-6">
      <div class="flex flex-wrap items-center gap-2 mb-3">
        {track_badges}
        <span class="text-sm text-gray-500">⏱️ ~{duration} min</span>
      </div>
    </div>''')
    
    # ── Skills & Exam sections ──
    if skills or exam_sections:
        skill_tags = " ".join(
            f'<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-medium">'
            f'{SKILL_ICONS.get(s, "📌")} {s.replace("_", " ").title()}</span>'
            for s in skills
        )
        exam_tags = " ".join(
            f'<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium">'
            f'📋 {s.title()}</span>'
            for s in exam_sections
        )
        parts.append(f'''
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Compétences visées</h3>
      <div class="flex flex-wrap gap-2">{skill_tags}</div>
      {"<h3 class='text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2 mt-3'>Sections d'examen</h3><div class='flex flex-wrap gap-2'>" + exam_tags + "</div>" if exam_sections and exam_sections != ['all'] else ""}
    </div>''')
    
    # ── Focus / Learning objectives ──
    if focus_items:
        focus_html = ""
        has_chinese = any(any('\u4e00' <= c <= '\u9fff' for c in item) for item in focus_items)
        
        if has_chinese:
            # Chinese items → display as vocabulary focus
            focus_html = '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">'
            for item in focus_items:
                focus_html += f'<div class="p-2 rounded-lg bg-amber-50 border border-amber-100 text-center"><span class="text-lg font-medium text-gray-900">{item}</span></div>'
            focus_html += '</div>'
        else:
            focus_html = '<ul class="space-y-1">'
            for item in focus_items:
                focus_html += f'<li class="flex items-start gap-2 text-sm text-gray-700"><span class="text-teal-500 mt-0.5">▸</span> {item}</li>'
            focus_html += '</ul>'
        
        parts.append(f'''
    <div class="mb-6 p-4 rounded-xl bg-cream-50 border border-cream-100">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">🎯 Points de focus</h3>
      {focus_html}
    </div>''')
    
    # ── Official task alignment ──
    if official_task:
        task_items = "".join(
            f'<li class="text-sm text-gray-600">{t}</li>' for t in official_task
        )
        parts.append(f'''
    <div class="mb-6 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
      <h3 class="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-2">📋 Alignement officiel HSK 7-9</h3>
      <ul class="space-y-1 list-disc list-inside">{task_items}</ul>
    </div>''')
    
    # ── Exercise types preview ──
    if exercise_types:
        etype_tags = " ".join(
            f'<span class="px-2 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-600">'
            f'{EXERCISE_TYPE_LABELS.get(et, et.replace("_", " ").title())}</span>'
            for et in exercise_types
        )
        parts.append(f'''
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">🧩 Types d'exercices</h3>
      <div class="flex flex-wrap gap-2">{etype_tags}</div>
    </div>''')
    
    # ── Learner output ──
    if learner_outputs:
        output_items = "".join(
            f'<div class="flex items-center gap-2 p-2 rounded-lg bg-emerald-50">'
            f'<span class="text-emerald-500">✓</span>'
            f'<span class="text-sm text-gray-700">{o.replace("_", " ").title()}</span></div>'
            for o in learner_outputs
        )
        parts.append(f'''
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">🎓 Ce que tu sauras faire</h3>
      <div class="space-y-2">{output_items}</div>
    </div>''')
    
    # ── Quality requirements note ──
    if quality_req:
        must_include = quality_req.get("must_include", [])
        if must_include:
            req_tags = " ".join(
                f'<span class="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500">{r.replace("_", " ")}</span>'
                for r in must_include
            )
            density = quality_req.get("minimum_advanced_density", "")
            no_pinyin = quality_req.get("no_pinyin_in_main_text", False)
            extra = []
            if density:
                extra.append(f"Densité avancée : {density}")
            if no_pinyin:
                extra.append("Pas de pinyin dans le texte principal")
            extra_html = "<br>".join(f'<span class="text-xs text-gray-400">{e}</span>' for e in extra) if extra else ""
            
            parts.append(f'''
    <div class="mt-6 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Exigences qualité</p>
      <div class="flex flex-wrap gap-1.5">{req_tags}</div>
      {extra_html}
    </div>''')
    
    return "\n".join(parts)


# ──────────────────────────────────────────────────────────────────────────
# API HELPERS
# ──────────────────────────────────────────────────────────────────────────

def api_post(table, data):
    """POST to Supabase REST API."""
    r = requests.post(f"{SUPA_URL}/rest/v1/{table}", json=data, headers=HEADERS)
    if r.status_code not in (200, 201, 204):
        print(f"  ERROR POST {table}: {r.status_code} {r.text[:300]}")
        return False
    return True

def api_patch(table, filters, data):
    """PATCH a row in Supabase."""
    r = requests.patch(f"{SUPA_URL}/rest/v1/{table}?{filters}", json=data, headers=HEADERS)
    if r.status_code not in (200, 204):
        print(f"  ERROR PATCH {table}: {r.status_code} {r.text[:300]}")
        return False
    return True

def api_delete(table, filters):
    """DELETE rows from Supabase."""
    r = requests.delete(f"{SUPA_URL}/rest/v1/{table}?{filters}", headers=HEADERS)
    if r.status_code not in (200, 204):
        print(f"  ERROR DELETE {table}: {r.status_code} {r.text[:300]}")
        return False
    return True

def api_upsert(table, data):
    """UPSERT to Supabase REST API."""
    h = {**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"}
    r = requests.post(f"{SUPA_URL}/rest/v1/{table}", json=data, headers=h)
    if r.status_code not in (200, 201, 204):
        print(f"  ERROR UPSERT {table}: {r.status_code} {r.text[:300]}")
        return False
    return True


# ──────────────────────────────────────────────────────────────────────────
# MAIN IMPORT
# ──────────────────────────────────────────────────────────────────────────

def main():
    # Load blueprint
    with open("/home/user/uploaded_files/hsk7_9_premium_course_blueprint_v1.json.txt") as f:
        blueprint = json.load(f)
    
    course = blueprint["course"]
    modules = course["modules"]
    
    print(f"📘 Blueprint: {course['title']}")
    print(f"   {len(modules)} modules, {sum(len(m['lessons']) for m in modules)} lessons")
    print()
    
    # ── Step 1: Clean up old separate courses ──
    print("Step 1: Remove old HSK 7/8/9 separate courses...")
    for old_id in OLD_COURSE_IDS:
        # Delete translations first (FK constraint)
        api_delete("course_translations", f"course_id=eq.{old_id}")
        # Delete the course
        api_delete("courses", f"id=eq.{old_id}")
    print("  ✓ Removed old HSK 7, 8, 9 courses")
    
    # ── Step 2: Create unified HSK 7-9 course ──
    print("\nStep 2: Create unified HSK 7-9 course...")
    api_upsert("courses", {
        "id": COURSE_ID,
        "slug": "hsk-7-9",
        "exam_type": "HSK",
        "status": "published",
    })
    
    # Course translation (fr)
    api_upsert("course_translations", {
        "course_id": COURSE_ID,
        "locale": "fr",
        "title": course["title"],
        "description": course["subtitle"],
    })
    
    # Course translation (en)
    api_upsert("course_translations", {
        "course_id": COURSE_ID,
        "locale": "en",
        "title": "HSK 7-9 — Upper Advanced",
        "description": "Single-block course aligned with the HSK 7-9 exam: deep comprehension, advanced expression, translation, speaking, writing and exam strategy.",
    })
    
    print(f"  ✓ Course {COURSE_ID} (slug=hsk-7-9, published)")
    
    # ── Step 3: Create modules ──
    print("\nStep 3: Creating 18 modules...")
    for m_data in modules:
        m_order = m_data["order"]
        m_id = module_uuid(m_order)
        tracks = m_data.get("track_focus", [])
        duration = m_data.get("estimated_duration_min", 0)
        
        api_upsert("modules", {
            "id": m_id,
            "course_id": COURSE_ID,
            "sort_order": m_order,
            "status": "published",
            "estimated_duration_minutes": duration,
        })
        
        description = build_module_description(m_data, blueprint)
        objectives = build_module_objectives(m_data)
        
        api_upsert("module_translations", {
            "module_id": m_id,
            "locale": "fr",
            "title": m_data["title"],
            "description": description,
            "objectives": objectives,
        })
        
        print(f"  ✓ Module {m_order}: {m_data['title'][:50]} ({len(m_data['lessons'])} lessons, {duration}min)")
    
    # ── Step 4: Create lessons ──
    print("\nStep 4: Creating 90 lessons...")
    lesson_counter = 0
    
    for m_data in modules:
        m_order = m_data["order"]
        m_id = module_uuid(m_order)
        
        for l_idx, l_data in enumerate(m_data["lessons"]):
            lesson_counter += 1
            l_id = lesson_uuid(lesson_counter)
            l_order = l_idx + 1
            duration = l_data.get("duration_min", 30)
            
            # Determine lesson_type
            skills = l_data.get("skills", [])
            exercise_types = l_data.get("exercise_types", [])
            is_assessment = any(et in exercise_types for et in [
                "timed_mixed_section", "error_review", "learning_path_assignment",
                "self_assessment"
            ])
            lesson_type = "assessment" if is_assessment else "standard"
            
            api_upsert("lessons", {
                "id": l_id,
                "module_id": m_id,
                "sort_order": l_order,
                "lesson_type": lesson_type,
                "status": "published",
                "estimated_duration_minutes": duration,
            })
            
            # Generate content HTML
            content_html = build_lesson_content_html(l_data, m_data, m_order)
            
            api_upsert("lesson_translations", {
                "lesson_id": l_id,
                "locale": "fr",
                "title": l_data["title"],
                "description": f"Module {m_order}, Leçon {l_order} · ~{duration} min",
                "content_html": content_html,
            })
            
            # Short progress line every 10 lessons
            if lesson_counter % 10 == 0:
                print(f"    ... {lesson_counter}/90 lessons created")
    
    print(f"  ✓ {lesson_counter} lessons created")
    
    # ── Summary ──
    print(f"\n{'='*60}")
    print(f"✅ HSK 7-9 import complete!")
    print(f"   Course:  {COURSE_ID} (hsk-7-9)")
    print(f"   Modules: {len(modules)}")
    print(f"   Lessons: {lesson_counter}")
    print(f"   Status:  published")
    print(f"{'='*60}")
    print()
    print("📌 Note: This imports the course structure (modules + lessons)")
    print("   with rich descriptive content. Exercises will be added")
    print("   in subsequent content batches as per the blueprint's")
    print("   recommended_next_content_batches plan.")


if __name__ == "__main__":
    main()
