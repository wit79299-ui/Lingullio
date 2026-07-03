#!/usr/bin/env python3
"""
Import HSK 7-9 Module 1 v2 Premium Full Content into Supabase.

This script:
1. Deletes existing Module 1 lessons (5 empty placeholder lessons)
2. Updates module metadata (title, duration)
3. Creates 6 new lessons with rich content_html
4. Creates 38 exercises (L1-L5) + 8 assessment items (L6) = 46 total
5. Creates exercise_translations (fr) with prompt, feedback
6. Creates exercise_options + translations for MCQ types

UUID conventions (matching import-hsk79-blueprint.py):
  Course:  a0000000-0000-0000-0000-000000000079 (HSK 7-9)
  Module:  b0000000-0079-0000-0000-000000000001 (Module 1)
  Lessons: c0000000-0079-0001-0000-{n:012d}      (n=1..6, new pattern for v2)
  Exercises: e7900000-0001-0000-0000-{n:012d}     (n=1..46)
"""

import json
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

COURSE_ID = "a0000000-0000-0000-0000-000000000079"
MODULE_ID = "b0000000-0079-0000-0000-000000000001"

# Old lesson IDs to delete (from blueprint import)
OLD_LESSON_IDS = [
    "c0000000-0079-0000-0000-000000000001",
    "c0000000-0079-0000-0000-000000000002",
    "c0000000-0079-0000-0000-000000000003",
    "c0000000-0079-0000-0000-000000000004",
    "c0000000-0079-0000-0000-000000000005",
]

# New lesson IDs (new pattern to avoid collision with other modules)
def lesson_id(n):
    return f"c0000000-0079-0001-0000-{n:012d}"

# Exercise IDs
def exercise_id(n):
    return f"e7900000-0001-0000-0000-{n:012d}"

# Option IDs
def option_id(ex_n, opt_n):
    return f"f7900000-0001-{ex_n:04d}-0000-{opt_n:012d}"


# ─── Map exercise types to DB exercise_type ──────────────────────────────
def map_exercise_type(json_type):
    """Map JSON exercise types to our DB exercise_type enum."""
    mapping = {
        # MCQ-like types
        "main_idea_mcq": "mcq",
        "sentence_function": "mcq",
        "inference_mcq": "mcq",
        "connector_choice": "mcq",
        "paraphrase_choice": "mcq",
        "word_usage": "mcq",
        "trap_identification": "mcq",
        "audio_main_idea": "mcq",
        "audio_detail": "mcq",
        "speaker_attitude": "mcq",
        "audio_inference": "mcq",
        "phrase_interpretation": "mcq",
        "source_position": "mcq",
        "argument_connector": "mcq",
        "paragraph_function": "mcq",
        "register_choice": "mcq",
        "spoken_connector_choice": "mcq",
        "oral_prompt": "mcq",
        # Fill-blank types
        "listening_note_completion": "fill_blank",
        # Reorder types
        "summary_ranking": "reorder",
        # Translation types
        "micro_translation_zh_to_fr": "controlled_translation",
        "zh_to_fr_translation": "controlled_translation",
        "fr_to_zh_translation": "controlled_translation",
        "translation_error_detection": "controlled_translation",
        "sentence_transform": "controlled_translation",
        "translation_mini_task": "controlled_translation",
        # Writing types
        "guided_summary_zh": "essay",
        "micro_debate": "essay",
        "sentence_improvement": "essay",
        "writing_micro_plan": "essay",
        "full_writing_task": "essay",
        "short_argument": "essay",
        # Speaking types
        "oral_reformulation": "speaking",
        "speaking_outline": "speaking",
        "speaking_full_response": "speaking",
        "fluency_repair": "speaking",
        "oral_self_assessment": "speaking",
    }
    return mapping.get(json_type, "mcq")


# ─── Supabase API helpers ────────────────────────────────────────────────
def sb_upsert(table, data):
    url = f"{SB_URL}/rest/v1/{table}"
    h = {**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"}
    resp = requests.post(url, headers=h, json=data)
    if resp.status_code not in (200, 201):
        print(f"  ERROR {resp.status_code} upserting into {table}: {resp.text[:300]}")
        return None
    return resp.json()

def sb_delete(table, query):
    url = f"{SB_URL}/rest/v1/{table}?{query}"
    resp = requests.delete(url, headers=HEADERS)
    if resp.status_code not in (200, 204):
        print(f"  ERROR {resp.status_code} deleting from {table}: {resp.text[:300]}")
        return False
    return True

def sb_patch(table, query, data):
    url = f"{SB_URL}/rest/v1/{table}?{query}"
    resp = requests.patch(url, headers=HEADERS, json=data)
    if resp.status_code not in (200, 204):
        print(f"  ERROR {resp.status_code} patching {table}: {resp.text[:300]}")
        return False
    return True


# ─── HTML builders ───────────────────────────────────────────────────────

def build_vocabulary_html(vocab_list):
    """Build HTML table from key_vocabulary array."""
    if not vocab_list:
        return ""
    rows = []
    for v in vocab_list:
        word = html.escape(v.get("word", ""))
        pinyin = html.escape(v.get("pinyin", ""))
        defn = html.escape(v.get("definition_fr", ""))
        usage = html.escape(v.get("usage_note_fr", ""))
        example_zh = html.escape(v.get("example_zh", ""))
        example_fr = html.escape(v.get("example_fr", ""))
        
        extra = ""
        if usage:
            extra += f'<div class="text-xs text-navy-400 mt-1">💡 {usage}</div>'
        if example_zh:
            extra += f'<div class="text-xs text-navy-500 mt-1">例：{example_zh}</div>'
        if example_fr:
            extra += f'<div class="text-xs text-navy-400 italic">{example_fr}</div>'
        
        rows.append(
            f'<tr class="border-b border-cream-100">'
            f'<td class="py-3 px-3 text-lg font-chinese" lang="zh">{word}</td>'
            f'<td class="py-3 px-3 text-sm text-navy-400 italic">{pinyin}</td>'
            f'<td class="py-3 px-3 text-sm text-navy-700">{defn}{extra}</td>'
            f'</tr>'
        )
    
    return f"""
<div class="vocab-block my-6">
  <h3 class="text-base font-semibold text-navy-800 mb-3">📝 Vocabulaire clé</h3>
  <div class="overflow-x-auto">
    <table class="w-full text-left">
      <thead><tr class="border-b-2 border-cream-200">
        <th class="py-2 px-3 text-xs text-navy-500">Chinois</th>
        <th class="py-2 px-3 text-xs text-navy-500">Pinyin</th>
        <th class="py-2 px-3 text-xs text-navy-500">Définition & usage</th>
      </tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>
</div>"""


def build_discourse_points_html(points):
    """Build HTML from discourse_points array."""
    if not points:
        return ""
    rows = []
    for dp in points:
        pattern = html.escape(dp.get("pattern", ""))
        func = html.escape(dp.get("function_fr", ""))
        example = html.escape(dp.get("example_zh", ""))
        rows.append(
            f'<tr class="border-b border-cream-100">'
            f'<td class="py-2.5 px-3 font-chinese text-lg" lang="zh">{pattern}</td>'
            f'<td class="py-2.5 px-3 text-sm text-navy-700">{func}</td>'
            f'<td class="py-2.5 px-3 text-sm text-navy-500 font-chinese" lang="zh">{example}</td>'
            f'</tr>'
        )
    return f"""
<div class="connector-block my-6">
  <h3 class="text-base font-semibold text-navy-800 mb-3">🔗 Structures discursives</h3>
  <div class="overflow-x-auto">
    <table class="w-full text-left">
      <thead><tr class="border-b-2 border-cream-200">
        <th class="py-2 px-3 text-xs text-navy-500">Structure</th>
        <th class="py-2 px-3 text-xs text-navy-500">Fonction</th>
        <th class="py-2 px-3 text-xs text-navy-500">Exemple</th>
      </tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>
</div>"""


def build_exam_traps_html(traps):
    """Build HTML from exam_traps array."""
    if not traps:
        return ""
    items = []
    for trap in traps:
        trap_type = html.escape(trap.get("trap_type", "").replace("_", " ").title())
        desc = html.escape(trap.get("description_fr", ""))
        items.append(f"""
  <div class="flex items-start gap-3 py-2">
    <span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium shrink-0">{trap_type}</span>
    <span class="text-sm text-navy-700">{desc}</span>
  </div>""")
    return f"""
<div class="trap-block bg-red-50 border-l-4 border-red-300 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-red-700 mb-2">⚠️ Pièges d'examen HSK</h3>
  <div class="space-y-1">{"".join(items)}</div>
</div>"""


def build_core_text_html(core_text, show_translation=True):
    """Build HTML from core_text object."""
    if not core_text:
        return ""
    title = html.escape(core_text.get("title_zh", ""))
    text_zh = html.escape(core_text.get("text_zh", ""))
    translation_fr = html.escape(core_text.get("translation_fr", ""))
    
    # Format text with proper paragraphs
    paragraphs = text_zh.split("\\n\\n") if "\\n\\n" in text_zh else text_zh.split("\n\n")
    text_html = "".join(f'<p class="text-lg leading-loose text-navy-900 font-chinese mb-4" lang="zh">{p.strip()}</p>' for p in paragraphs if p.strip())
    
    translation_section = ""
    if translation_fr and show_translation:
        translation_section = f"""
  <details class="mt-4">
    <summary class="text-sm text-navy-500 cursor-pointer hover:text-teal-600 font-medium">📖 Voir la traduction / résumé</summary>
    <p class="text-sm text-navy-600 mt-2 p-4 bg-white rounded-lg leading-relaxed">{translation_fr}</p>
  </details>"""
    
    return f"""
<div class="text-block bg-amber-50/50 border border-amber-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-amber-800 mb-3">📖 {title}</h3>
  {text_html}
  {translation_section}
</div>"""


def build_audio_script_html(audio_script):
    """Build HTML from audio_script object (for listening lessons)."""
    if not audio_script:
        return ""
    title = html.escape(audio_script.get("title_zh", ""))
    script = audio_script.get("script_zh", "")
    summary = html.escape(audio_script.get("translation_summary_fr", ""))
    
    # Format dialogue lines
    lines = script.split("\n")
    formatted_lines = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Detect speaker prefixes (主持人：, 嘉宾：, 女：, 男：)
        if "：" in line:
            speaker, text = line.split("：", 1)
            formatted_lines.append(
                f'<div class="flex gap-3 py-2">'
                f'<span class="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-xs font-medium shrink-0 h-fit">{html.escape(speaker)}</span>'
                f'<p class="text-base text-navy-900 font-chinese leading-relaxed" lang="zh">{html.escape(text)}</p>'
                f'</div>'
            )
        else:
            formatted_lines.append(f'<p class="text-base text-navy-900 font-chinese leading-relaxed py-1" lang="zh">{html.escape(line)}</p>')
    
    summary_section = ""
    if summary:
        summary_section = f"""
  <details class="mt-4">
    <summary class="text-sm text-navy-500 cursor-pointer hover:text-teal-600 font-medium">📖 Résumé en français</summary>
    <p class="text-sm text-navy-600 mt-2 p-4 bg-white rounded-lg leading-relaxed">{summary}</p>
  </details>"""
    
    return f"""
<div class="audio-block bg-blue-50/50 border border-blue-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-blue-800 mb-3">🎧 {title}</h3>
  <div class="space-y-1">{"".join(formatted_lines)}</div>
  {summary_section}
</div>"""


def build_strategy_html(title, items):
    """Build strategy/tips section."""
    if not items:
        return ""
    steps_html = "\n".join(
        f'<li class="flex items-start gap-3 py-2">'
        f'<span class="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0">{i+1}</span>'
        f'<span class="text-sm text-navy-700">{html.escape(s)}</span></li>'
        for i, s in enumerate(items)
    )
    return f"""
<div class="strategy-block bg-teal-50 border border-teal-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-teal-800 mb-3">🎯 {html.escape(title)}</h3>
  <ol class="space-y-1">{steps_html}</ol>
</div>"""


def build_translation_principles_html(principles):
    """Build HTML from translation_principles_fr array."""
    if not principles:
        return ""
    items = "\n".join(f'<li class="text-sm text-navy-700 py-1">{html.escape(p)}</li>' for p in principles)
    return f"""
<div class="principles-block bg-violet-50 border border-violet-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-violet-800 mb-3">🔑 Principes de traduction</h3>
  <ul class="space-y-1 list-disc list-inside">{items}</ul>
</div>"""


def build_source_text_html(source_text, direction="zh"):
    """Build HTML for source text (translation exercises)."""
    if not source_text:
        return ""
    if direction == "zh":
        title = html.escape(source_text.get("title_zh", ""))
        text = html.escape(source_text.get("text_zh", ""))
        model = html.escape(source_text.get("translation_fr_model", ""))
        lang_class = 'font-chinese" lang="zh'
        label = "Traduction modèle (français)"
    else:
        title = html.escape(source_text.get("title_fr", ""))
        text = html.escape(source_text.get("text_fr", ""))
        model = html.escape(source_text.get("translation_zh_model", ""))
        lang_class = ""
        label = "Traduction modèle (chinois)"
    
    model_section = ""
    if model:
        model_section = f"""
  <details class="mt-4">
    <summary class="text-sm text-navy-500 cursor-pointer hover:text-teal-600 font-medium">📖 {label}</summary>
    <p class="text-sm text-navy-600 mt-2 p-4 bg-white rounded-lg leading-relaxed">{model}</p>
  </details>"""
    
    return f"""
<div class="source-text-block bg-amber-50/50 border border-amber-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-amber-800 mb-3">📄 {title}</h3>
  <p class="text-base leading-relaxed text-navy-900 {lang_class}">{text}</p>
  {model_section}
</div>"""


def build_key_expressions_html(expressions):
    """Build HTML for key translation expressions."""
    if not expressions:
        return ""
    rows = []
    for expr in expressions:
        fr = html.escape(expr.get("fr", ""))
        zh = html.escape(expr.get("natural_zh", ""))
        rows.append(
            f'<tr class="border-b border-cream-100">'
            f'<td class="py-2.5 px-3 text-sm text-navy-700">{fr}</td>'
            f'<td class="py-2.5 px-3 font-chinese text-base" lang="zh">{zh}</td>'
            f'</tr>'
        )
    return f"""
<div class="expressions-block my-6">
  <h3 class="text-base font-semibold text-navy-800 mb-3">🔗 Expressions clés de traduction</h3>
  <div class="overflow-x-auto">
    <table class="w-full text-left">
      <thead><tr class="border-b-2 border-cream-200">
        <th class="py-2 px-3 text-xs text-navy-500">Français</th>
        <th class="py-2 px-3 text-xs text-navy-500">Chinois naturel</th>
      </tr></thead>
      <tbody>{"".join(rows)}</tbody>
    </table>
  </div>
</div>"""


def build_writing_scaffold_html(scaffold):
    """Build HTML from writing_scaffold."""
    if not scaffold:
        return ""
    structure = scaffold.get("recommended_structure", [])
    if not structure:
        return ""
    
    parts = []
    for step in structure:
        part_name = html.escape(step.get("part", "").replace("_", " ").title())
        patterns = step.get("sentence_patterns", [])
        patterns_html = "".join(
            f'<div class="text-sm font-chinese text-navy-800 py-1 pl-3 border-l-2 border-teal-200" lang="zh">{html.escape(p)}</div>'
            for p in patterns
        )
        parts.append(f"""
    <div class="mb-3">
      <h4 class="text-xs font-semibold text-navy-500 uppercase mb-1">{part_name}</h4>
      {patterns_html}
    </div>""")
    
    return f"""
<div class="scaffold-block bg-emerald-50 border border-emerald-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-emerald-800 mb-3">🏗️ Structure recommandée pour l'écriture</h3>
  {"".join(parts)}
</div>"""


def build_speaking_framework_html(framework):
    """Build HTML from speaking_framework."""
    if not framework:
        return ""
    name = html.escape(framework.get("name", ""))
    steps = framework.get("steps", [])
    expressions = framework.get("useful_expressions", [])
    
    steps_html = "".join(
        f'<div class="flex items-start gap-3 py-2">'
        f'<span class="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-sm font-bold shrink-0">{i+1}</span>'
        f'<div><span class="text-sm font-medium text-navy-800">{html.escape(s.get("fr", ""))}</span>'
        f'<span class="text-sm font-chinese text-navy-500 ml-2" lang="zh">{html.escape(s.get("zh", ""))}</span></div>'
        f'</div>'
        for i, s in enumerate(steps)
    )
    
    expr_html = ""
    if expressions:
        expr_items = "".join(
            f'<span class="inline-block px-3 py-1.5 rounded-lg bg-white border border-cream-200 text-sm font-chinese m-1" lang="zh">{html.escape(e)}</span>'
            for e in expressions
        )
        expr_html = f"""
  <div class="mt-4">
    <h4 class="text-xs font-semibold text-navy-500 uppercase mb-2">Expressions utiles</h4>
    <div class="flex flex-wrap gap-1">{expr_items}</div>
  </div>"""
    
    return f"""
<div class="framework-block bg-indigo-50 border border-indigo-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-indigo-800 mb-3">🗣️ {name}</h3>
  <div class="space-y-1">{steps_html}</div>
  {expr_html}
</div>"""


def build_model_speaking_html(models):
    """Build HTML from model_speaking_answers."""
    if not models:
        return ""
    items = []
    for m in models:
        prompt = html.escape(m.get("prompt_zh", ""))
        answer = html.escape(m.get("model_answer_zh", ""))
        summary = html.escape(m.get("model_answer_fr_summary", ""))
        items.append(f"""
  <div class="mb-4 p-4 bg-white rounded-lg border border-cream-200">
    <p class="text-sm font-semibold text-navy-700 mb-2">❓ {prompt}</p>
    <details>
      <summary class="text-sm text-teal-600 cursor-pointer font-medium">Voir le modèle de réponse</summary>
      <p class="text-base font-chinese text-navy-900 mt-2 leading-relaxed" lang="zh">{answer}</p>
      <p class="text-xs text-navy-400 italic mt-2">{summary}</p>
    </details>
  </div>""")
    
    return f"""
<div class="models-block my-6">
  <h3 class="text-base font-semibold text-navy-800 mb-3">💬 Exemples de réponses modèles</h3>
  {"".join(items)}
</div>"""


def build_source_materials_html(materials):
    """Build HTML for writing source materials."""
    if not materials:
        return ""
    items = []
    for mat in materials:
        title = html.escape(mat.get("title_fr", ""))
        text = html.escape(mat.get("text_zh", ""))
        items.append(f"""
  <div class="mb-4 p-4 bg-white rounded-lg border border-amber-200">
    <h4 class="text-sm font-semibold text-amber-700 mb-2">{title}</h4>
    <p class="text-base font-chinese text-navy-900 leading-relaxed" lang="zh">{text}</p>
  </div>""")
    
    return f"""
<div class="materials-block bg-amber-50/50 border border-amber-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-amber-800 mb-3">📑 Matériaux sources</h3>
  {"".join(items)}
</div>"""


def build_writing_task_html(task):
    """Build HTML for writing task prompt."""
    if not task:
        return ""
    prompt = html.escape(task.get("prompt_fr", ""))
    time_limit = task.get("time_limit_min", "")
    model_answer = html.escape(task.get("model_answer_zh", ""))
    
    model_section = ""
    if model_answer:
        model_section = f"""
  <details class="mt-4">
    <summary class="text-sm text-teal-600 cursor-pointer font-medium">📖 Modèle de réponse</summary>
    <p class="text-base font-chinese text-navy-900 mt-2 p-4 bg-white rounded-lg leading-relaxed" lang="zh">{model_answer}</p>
  </details>"""
    
    return f"""
<div class="task-block bg-navy-50 border border-navy-200 rounded-xl p-5 my-6">
  <h3 class="text-lg font-bold text-navy-800 mb-2">✍️ Tâche d'écriture</h3>
  <p class="text-navy-700 leading-relaxed">{prompt}</p>
  {"<p class='text-sm text-navy-400 mt-2'>⏱️ Temps recommandé : " + str(time_limit) + " minutes</p>" if time_limit else ""}
  {model_section}
</div>"""


def build_assessment_info_html(rules, reading_text, listening_script):
    """Build HTML for assessment lesson header."""
    parts = []
    
    if rules:
        total = rules.get("total_points", 0)
        threshold = rules.get("recommended_threshold_ready_for_next_module", 0)
        timing = rules.get("timing", {})
        timing_str = " · ".join(f"{k.replace('_min','').title()} {v}min" for k, v in timing.items())
        parts.append(f"""
<div class="assessment-block bg-navy-50 border border-navy-200 rounded-xl p-5 my-6">
  <h3 class="text-lg font-bold text-navy-800 mb-2">📋 Mini-test intégré</h3>
  <div class="flex flex-wrap gap-4 text-sm text-navy-600">
    <span>🎯 Total : {total} points</span>
    <span>✅ Seuil de passage : {threshold} points ({int(threshold/total*100) if total else 0}%)</span>
  </div>
  <p class="text-xs text-navy-400 mt-2">{timing_str}</p>
</div>""")
    
    # Reading text
    if reading_text:
        title = html.escape(reading_text.get("title_zh", ""))
        text = html.escape(reading_text.get("text_zh", ""))
        paragraphs = text.split("\n\n") if "\n\n" in text else [text]
        text_html = "".join(f'<p class="text-base leading-relaxed text-navy-900 font-chinese mb-3" lang="zh">{p.strip()}</p>' for p in paragraphs if p.strip())
        parts.append(f"""
<div class="text-block bg-amber-50/50 border border-amber-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-amber-800 mb-3">📖 Texte de lecture — {title}</h3>
  {text_html}
</div>""")
    
    # Listening script
    if listening_script:
        title = html.escape(listening_script.get("title_zh", ""))
        script = listening_script.get("script_zh", "")
        lines = script.split("\n")
        formatted = []
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if "：" in line:
                speaker, text = line.split("：", 1)
                formatted.append(
                    f'<div class="flex gap-3 py-2">'
                    f'<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium shrink-0 h-fit">{html.escape(speaker)}</span>'
                    f'<p class="text-base text-navy-900 font-chinese leading-relaxed" lang="zh">{html.escape(text)}</p></div>'
                )
            else:
                formatted.append(f'<p class="text-base text-navy-900 font-chinese leading-relaxed py-1" lang="zh">{html.escape(line)}</p>')
        
        parts.append(f"""
<div class="audio-block bg-blue-50/50 border border-blue-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-blue-800 mb-3">🎧 Audio — {title}</h3>
  <div class="space-y-1">{"".join(formatted)}</div>
</div>""")
    
    return "\n".join(parts)


# ─── Build content_html for each lesson type ─────────────────────────────

def build_lesson_content_html(lesson_data):
    """Build complete lesson content_html from v2 JSON structure."""
    parts = []
    lesson_type = lesson_data.get("lesson_type", "")
    
    # 1. Objectives
    objectives = lesson_data.get("learning_objectives_fr", [])
    if objectives:
        obj_items = "\n".join(f'<li class="text-sm text-navy-700">{html.escape(o)}</li>' for o in objectives)
        parts.append(f"""
<div class="objectives-block bg-cream-50 border border-cream-100 rounded-xl p-5 mb-6">
  <h3 class="text-sm font-semibold text-navy-700 uppercase tracking-wider mb-3">🎯 Objectifs</h3>
  <ul class="space-y-2 list-disc list-inside">{obj_items}</ul>
</div>""")
    
    # 2. Core text (reading lessons)
    core_text = lesson_data.get("core_text")
    if core_text:
        parts.append(build_core_text_html(core_text))
    
    # 3. Audio script (listening lessons)
    audio_script = lesson_data.get("audio_script")
    if audio_script:
        parts.append(build_audio_script_html(audio_script))
    
    # 4. Listening strategy
    listening_strategy = lesson_data.get("listening_strategy_fr", [])
    if listening_strategy:
        parts.append(build_strategy_html("Stratégie d'écoute", listening_strategy))
    
    # 5. Translation principles
    translation_principles = lesson_data.get("translation_principles_fr", [])
    if translation_principles:
        parts.append(build_translation_principles_html(translation_principles))
    
    # 6. Source texts (translation lessons)
    source_zh = lesson_data.get("source_text_zh")
    if source_zh:
        parts.append(build_source_text_html(source_zh, "zh"))
    source_fr = lesson_data.get("source_text_fr")
    if source_fr:
        parts.append(build_source_text_html(source_fr, "fr"))
    
    # 7. Key expressions
    key_expressions = lesson_data.get("key_expressions", [])
    if key_expressions:
        parts.append(build_key_expressions_html(key_expressions))
    
    # 8. Source materials (writing lessons)
    materials = lesson_data.get("source_materials", [])
    if materials:
        parts.append(build_source_materials_html(materials))
    
    # 9. Writing task
    writing_task = lesson_data.get("writing_task")
    if writing_task:
        parts.append(build_writing_task_html(writing_task))
    
    # 10. Writing scaffold
    scaffold = lesson_data.get("writing_scaffold")
    if scaffold:
        parts.append(build_writing_scaffold_html(scaffold))
    
    # 11. Speaking framework
    speaking_framework = lesson_data.get("speaking_framework")
    if speaking_framework:
        parts.append(build_speaking_framework_html(speaking_framework))
    
    # 12. Model speaking answers
    model_answers = lesson_data.get("model_speaking_answers", [])
    if model_answers:
        parts.append(build_model_speaking_html(model_answers))
    
    # 13. Vocabulary (all lessons)
    vocab = lesson_data.get("key_vocabulary", [])
    if vocab:
        parts.append(build_vocabulary_html(vocab))
    
    # 14. Discourse points
    discourse = lesson_data.get("discourse_points", [])
    if discourse:
        parts.append(build_discourse_points_html(discourse))
    
    # 15. Exam traps
    traps = lesson_data.get("exam_traps", [])
    if traps:
        parts.append(build_exam_traps_html(traps))
    
    # 16. Assessment-specific content (L6)
    assessment_rules = lesson_data.get("assessment_rules")
    reading_text = lesson_data.get("reading_text")
    listening_script = lesson_data.get("listening_script")
    if assessment_rules or reading_text or listening_script:
        parts.append(build_assessment_info_html(assessment_rules, reading_text, listening_script))
    
    # 17. Remediation tips
    remediation = lesson_data.get("remediation", [])
    if remediation:
        items = []
        for r in remediation:
            tags = ", ".join(r.get("if_tags_failed", []))
            rec = html.escape(r.get("recommendation_fr", ""))
            items.append(f'<div class="text-sm text-navy-700 py-1"><span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full mr-2">{tags}</span>{rec}</div>')
        parts.append(f"""
<div class="remediation-block bg-orange-50 border border-orange-200 rounded-xl p-5 my-6">
  <h3 class="text-base font-semibold text-orange-800 mb-3">🔄 Remédiation</h3>
  {"".join(items)}
</div>""")
    
    return "\n".join(p for p in parts if p)


# ─── Build exercise metadata ─────────────────────────────────────────────

def build_exercise_metadata(ex):
    """Build metadata JSONB from exercise JSON."""
    json_type = ex.get("type", "")
    meta = {
        "original_type": json_type,
        "diagnostic_tags": ex.get("diagnostic_tags", []),
    }
    
    # MCQ choices → store in metadata for flexible use
    choices = ex.get("choices", [])
    if choices:
        meta["choices"] = choices
        meta["correct_answer"] = ex.get("answer", "")
    
    # Rubric for open-ended exercises
    rubric = ex.get("rubric")
    if rubric:
        meta["rubric"] = rubric
    
    # Model answers
    if ex.get("model_answer_zh"):
        meta["model_answer_zh"] = ex["model_answer_zh"]
    if ex.get("model_answer_fr"):
        meta["model_answer_fr"] = ex["model_answer_fr"]
    if ex.get("expected_answer_fr"):
        meta["expected_answer_fr"] = ex["expected_answer_fr"]
    if ex.get("alternative_answers_zh"):
        meta["alternative_answers_zh"] = ex["alternative_answers_zh"]
    
    # Common errors
    if ex.get("common_errors_fr"):
        meta["common_errors_fr"] = ex["common_errors_fr"]
    if ex.get("common_errors"):
        meta["common_errors"] = ex["common_errors"]
    
    # Summary ranking items & answer_order
    if ex.get("items"):
        meta["items"] = ex["items"]
    if ex.get("answer_order"):
        meta["answer_order"] = ex["answer_order"]
    
    # Fill-blank (listening_note_completion)
    if ex.get("blanks"):
        meta["blanks"] = ex["blanks"]
    
    # Checklist (oral_self_assessment)
    if ex.get("checklist_fr"):
        meta["checklist_fr"] = ex["checklist_fr"]
    
    # Prompt in Chinese (for exercises with Chinese prompts)
    if ex.get("prompt_zh"):
        meta["prompt_zh"] = ex["prompt_zh"]
    
    # Skill tag (for assessment items)
    if ex.get("skill"):
        meta["skill"] = ex["skill"]
    
    return meta


# ═══════════════════════════════════════════════════════════════════════════
# MAIN IMPORT
# ═══════════════════════════════════════════════════════════════════════════

# Load JSON
with open("/home/user/uploaded_files/hsk7_9_module1_v2_premium_full_content (1).json.txt", "r") as f:
    data = json.load(f)

module_data = data["course_module"]
lessons = module_data["lessons"]

print(f"Module: {module_data['title_fr']}")
print(f"Lessons: {len(lessons)}")

# Count exercises
total_ex = 0
for lesson in lessons:
    total_ex += len(lesson.get("exercises", []))
    total_ex += len(lesson.get("items", []))  # L6 assessment items
print(f"Total exercises/items: {total_ex}")
print()

# ═══════════════════════════════════════════════════════════════════════════
print("=" * 60)
print("STEP 0: Delete old Module 1 lessons")
print("=" * 60)

for old_lid in OLD_LESSON_IDS:
    # Delete lesson_translations first (FK)
    sb_delete("lesson_translations", f"lesson_id=eq.{old_lid}")
    # Delete exercises (check if any exist)
    sb_delete("exercise_translations", f"exercise_id=in.({old_lid})")  # unlikely but safe
    # Delete the lesson itself
    sb_delete("lessons", f"id=eq.{old_lid}")
    print(f"  Deleted lesson {old_lid}")

print()
print("=" * 60)
print("STEP 1: Update Module metadata")
print("=" * 60)

# Update module estimated_duration
sb_patch("modules", f"id=eq.{MODULE_ID}", {
    "estimated_duration_minutes": module_data["density"]["estimated_duration_min"],
})
print(f"  Module duration → {module_data['density']['estimated_duration_min']} min")

# Update module translation (PATCH since it already exists)
module_trans_data = {
    "title": module_data["title_fr"],
    "description": module_data["target_level"]["positioning_fr"],
    "objectives": module_data.get("module_learning_outcomes_fr", []),
}
result = sb_patch("module_translations", f"module_id=eq.{MODULE_ID}&locale=eq.fr", module_trans_data)
print(f"  Module translation: {'OK' if result else 'FAILED'}")

print()
print("=" * 60)
print("STEP 2: Create 6 Lessons + Translations")
print("=" * 60)

for i, lesson in enumerate(lessons, 1):
    lid = lesson_id(i)
    
    # Determine lesson_type
    lt = lesson.get("lesson_type", "")
    if "assessment" in lt:
        lesson_type = "assessment"
    else:
        lesson_type = "standard"
    
    lesson_row = {
        "id": lid,
        "module_id": MODULE_ID,
        "sort_order": i,
        "lesson_type": lesson_type,
        "status": "published",
        "estimated_duration_minutes": lesson.get("duration_min", 30),
    }
    result = sb_upsert("lessons", lesson_row)
    print(f"  Lesson {i}: {lid} → {lesson['title_fr'][:50]} ({'OK' if result else 'FAILED'})")
    
    # Build content_html
    content_html = build_lesson_content_html(lesson)
    
    lesson_trans = {
        "lesson_id": lid,
        "locale": "fr",
        "title": lesson["title_fr"],
        "description": f"Module 1, Leçon {i} · ~{lesson.get('duration_min', 30)} min",
        "content_html": content_html,
    }
    result = sb_upsert("lesson_translations", lesson_trans)
    print(f"    Translation fr: {'OK' if result else 'FAILED'} (content_html: {len(content_html)} chars)")

print()
print("=" * 60)
print("STEP 3: Create Exercises + Options + Translations")
print("=" * 60)

ex_counter = 0
for i, lesson in enumerate(lessons, 1):
    lid = lesson_id(i)
    
    # Get exercises (regular lessons use "exercises", L6 uses "items")
    exercises = lesson.get("exercises", [])
    if not exercises:
        exercises = lesson.get("items", [])
    
    print(f"\n  Lesson {i} ({lesson['title_fr'][:40]}) — {len(exercises)} exercises:")
    
    for j, ex in enumerate(exercises, 1):
        ex_counter += 1
        eid = exercise_id(ex_counter)
        
        db_type = map_exercise_type(ex.get("type", ""))
        metadata = build_exercise_metadata(ex)
        
        # Build skill_tags from diagnostic_tags
        skill_tags = ex.get("diagnostic_tags", [])
        
        exercise_row = {
            "id": eid,
            "lesson_id": lid,
            "exercise_type": db_type,
            "difficulty": 4,  # HSK 7-9 = advanced
            "points": ex.get("points", 5),
            "estimated_duration_seconds": max(60, ex.get("points", 5) * 15),
            "skill_tags": skill_tags,
            "hsk_level": 7,
            "sort_order": j,
            "status": "published",
            "metadata": metadata,
        }
        result = sb_upsert("exercises", exercise_row)
        
        # Exercise translation
        # Determine prompt: prefer prompt_fr, fallback to prompt_zh
        prompt = ex.get("prompt_fr", "")
        if not prompt:
            prompt = ex.get("prompt_zh", "")
        
        # Explanation from feedback_fr
        explanation = ex.get("feedback_fr", "")
        
        ex_trans = {
            "exercise_id": eid,
            "locale": "fr",
            "prompt": prompt,
            "instruction": "",
            "explanation": explanation,
            "hint": None,
        }
        sb_upsert("exercise_translations", ex_trans)
        
        # Create exercise_options for MCQ types (those with "choices")
        choices = ex.get("choices", [])
        correct_answer = ex.get("answer", "")
        
        if choices:
            for k, choice in enumerate(choices, 1):
                oid = option_id(ex_counter, k)
                choice_id = choice.get("id", "")
                is_correct = (choice_id == correct_answer)
                
                option_row = {
                    "id": oid,
                    "exercise_id": eid,
                    "sort_order": k,
                    "is_correct": is_correct,
                }
                sb_upsert("exercise_options", option_row)
                
                # Option text: prefer text_fr, fallback to text_zh
                option_text = choice.get("text_fr", choice.get("text_zh", ""))
                option_trans = {
                    "option_id": oid,
                    "locale": "fr",
                    "content": option_text,
                }
                sb_upsert("exercise_option_translations", option_trans)
        
        status = "OK" if result else "FAIL"
        choices_info = f" + {len(choices)} options" if choices else ""
        print(f"    {eid}: {ex['type']} → {db_type} ({status}){choices_info}")

print()
print("=" * 60)
print(f"IMPORT COMPLETE: 1 module updated, {len(lessons)} lessons, {ex_counter} exercises")
print("=" * 60)
