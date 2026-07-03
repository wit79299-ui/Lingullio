#!/usr/bin/env python3
"""
Generate content_html for empty HSK1 lessons via LLM (gpt-5-mini).
Generates both EN and FR versions for each lesson.
"""
import json, urllib.request, time, sys, os

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

LLM_BASE = os.environ.get("OPENAI_BASE_URL", "https://www.genspark.ai/api/llm_proxy/v1")
LLM_KEY = os.environ.get("OPENAI_API_KEY", "")

def fetch_supabase(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"
    })
    return json.loads(urllib.request.urlopen(req).read())

def patch_supabase(table, filters, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method='PATCH', headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    })
    urllib.request.urlopen(req)

def call_llm(prompt, max_tokens=4000):
    url = f"{LLM_BASE}/chat/completions"
    body = json.dumps({
        "model": "gpt-5-mini",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7
    }).encode()
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"Bearer {LLM_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "curl/8.0"
    })
    resp = urllib.request.urlopen(req, timeout=120)
    result = json.loads(resp.read())
    return result["choices"][0]["message"]["content"]

# ─── Empty lessons to generate ────────────────────────────────────────

EMPTY_LESSONS = [
    ("c0000000-0000-0000-0000-000000000004", 1, "Chinese Basics", 4, "Practice — Writing the First Characters", "Pratique — Tracer les premiers caractères", "practice"),
    ("c0000000-0000-0000-0000-000000000005", 1, "Chinese Basics", 5, "Initial Diagnostic", "Diagnostic initial", "diagnostic"),
    ("c0000000-0000-0000-0000-000000000009", 2, "Greetings and Introductions", 4, "Practice — Introduction Dialogue", "Pratique — Dialogue d'introduction", "practice"),
    ("c0000000-0000-0000-0000-000000000010", 2, "Greetings and Introductions", 5, "Review — Module 2", "Révision — Module 2", "review"),
    ("c0000000-0000-0000-0000-000000000014", 3, "Family and People", 4, "Practice — Introducing Your Family", "Pratique — Présenter sa famille", "practice"),
    ("c0000000-0000-0000-0000-000000000015", 3, "Family and People", 5, "Diagnostic — Module 3", "Diagnostic — Module 3", "diagnostic"),
    ("c0000000-0000-0000-0000-000000000020", 4, "Numbers, Dates and Time", 5, "Practice — Telling Time and Date", "Pratique — Dire l'heure et la date", "practice"),
    ("c0000000-0000-0000-0000-000000000024", 5, "Daily Life: Food and Drink", 4, "Practice — Ordering Food", "Pratique — Commander à manger", "practice"),
    ("c0000000-0000-0000-0000-000000000025", 5, "Daily Life: Food and Drink", 5, "Diagnostic — Module 5", "Diagnostic — Module 5", "diagnostic"),
    ("c0000000-0000-0000-0000-000000000030", 6, "Places and Getting Around", 5, "Practice — Asking for Directions", "Pratique — Demander son chemin", "practice"),
    ("c0000000-0000-0000-0000-000000000034", 7, "Activities and Hobbies", 4, "Practice — Talking About Hobbies", "Pratique — Parler de ses loisirs", "practice"),
    ("c0000000-0000-0000-0000-000000000035", 7, "Activities and Hobbies", 5, "Diagnostic — Module 7", "Diagnostic — Module 7", "diagnostic"),
    ("c0000000-0000-0000-0000-000000000039", 8, "Shopping and Descriptions", 4, "Practice — Going Shopping", "Pratique — Faire du shopping", "practice"),
    ("c0000000-0000-0000-0000-000000000040", 8, "Shopping and Descriptions", 5, "Review — Module 8", "Révision — Module 8", "review"),
    ("c0000000-0000-0000-0000-000000000044", 9, "Communication and Feelings", 4, "Practice — Free Conversation", "Pratique — Conversation libre", "practice"),
    ("c0000000-0000-0000-0000-000000000045", 9, "Communication and Feelings", 5, "Diagnostic — Module 9", "Diagnostic — Module 9", "diagnostic"),
    ("c0000000-0000-0000-0000-000000000047", 10, "General Review and HSK 1 Exam Preparation", 2, "Complete Vocabulary Review", "Révision complète du vocabulaire", "review"),
    ("c0000000-0000-0000-0000-000000000048", 10, "General Review and HSK 1 Exam Preparation", 3, "Complete Grammar Review", "Révision complète de la grammaire", "review"),
    ("c0000000-0000-0000-0000-000000000049", 10, "General Review and HSK 1 Exam Preparation", 4, "Mock Exam #1", "Examen blanc n°1", "mock_exam"),
    ("c0000000-0000-0000-0000-000000000050", 10, "General Review and HSK 1 Exam Preparation", 5, "Mock Exam #2", "Examen blanc n°2", "mock_exam"),
    ("c0000000-0000-0000-0000-000000000051", 10, "General Review and HSK 1 Exam Preparation", 6, "Final Assessment", "Évaluation finale", "assessment"),
]

SYSTEM_PROMPT = """You are a Chinese language education expert creating lesson content for HSK1 learners.

OUTPUT FORMAT: Return ONLY raw HTML (no markdown, no ```html fences, no preamble text).
The HTML uses specific CSS classes for styling:

- <section class='lesson-intro'> — Opening section with <h2>Introduction</h2> and lesson goals
- <section class='lesson-core'> — Main teaching content with <h2> sub-sections
- <div class='example-box'> — Example with Chinese + pinyin + note:
    <p class='zh'>Chinese characters</p>
    <p class='pinyin'>Pinyin transcription</p>
    <p class='note'>Translation or explanation</p>
- <div class='tip-box'> — <p><strong>Tip:</strong> helpful learning tip</p>
- <div class='warning-box'> — <p><strong>Warning:</strong> common mistake warning</p>
- <div class='practice-box'> — Practice exercise for the learner
- <div class='key-point'> — Key takeaway box
- <section class='summary'> — End-of-lesson summary with <h2>Summary</h2>

CONTENT RULES:
1. ALL Chinese text must include pinyin AND translation/explanation
2. Use HSK1 vocabulary only (~150 basic words)
3. Content should be 2000-4000 chars of HTML
4. Be practical and conversational
5. For practice lessons: include 3-5 concrete guided activities
6. For diagnostic/review: include 5-8 self-check questions/exercises
7. For mock exams: simulate real HSK1 format (listening descriptions, reading comprehension, matching)
8. RETURN ONLY THE RAW HTML — no explanation, no code fences"""

def clean_html(text):
    text = text.strip()
    # Remove markdown code fences
    if text.startswith("```"):
        first_nl = text.find("\n")
        text = text[first_nl+1:] if first_nl != -1 else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    # Remove leading 'html' tag name
    if text.startswith("html\n"):
        text = text[5:]
    elif text.startswith("html "):
        text = text[5:]
    return text.strip()

# ─── Generate and upload ──────────────────────────────────────────────

print(f"LLM Base URL: {LLM_BASE}")
print(f"LLM Key prefix: {LLM_KEY[:20]}...")
print(f"Processing {len(EMPTY_LESSONS)} empty lessons...\n")

success_count = 0
fail_count = 0

for idx, (lesson_id, mod_num, mod_title, lesson_num, title_en, title_fr, lesson_type) in enumerate(EMPTY_LESSONS):
    print(f"[{idx+1}/{len(EMPTY_LESSONS)}] M{mod_num}L{lesson_num}: {title_en}")
    
    # Get sibling context (first filled sibling)
    siblings = fetch_supabase(
        f"lessons?module_id=eq.b0000000-0000-0000-0000-{str(mod_num).zfill(12)}&order=sort_order&select=id,sort_order"
    )
    context_text = ""
    for sib in siblings:
        if sib['id'] == lesson_id:
            continue
        st = fetch_supabase(f"lesson_translations?lesson_id=eq.{sib['id']}&locale=eq.en&select=title,content_html")
        if st and st[0].get('content_html') and len(st[0]['content_html']) > 100:
            context_text = f"Sibling lesson '{st[0]['title']}' content excerpt:\n{st[0]['content_html'][:800]}"
            break
    
    # ─── EN ─────────────────────────────────────────────────────────
    prompt_en = f"""{SYSTEM_PROMPT}

CONTEXT: HSK 1 course, Module {mod_num} "{mod_title}", Lesson {lesson_num}: "{title_en}" (type: {lesson_type})
{context_text}

Generate the HTML content for this lesson IN ENGLISH."""
    
    print(f"  EN...", end=" ", flush=True)
    html_en = ""
    try:
        html_en = clean_html(call_llm(prompt_en))
        print(f"✅ {len(html_en)} chars")
    except Exception as e:
        print(f"❌ {e}")
        fail_count += 1
    
    # ─── FR ─────────────────────────────────────────────────────────
    prompt_fr = f"""{SYSTEM_PROMPT}

CONTEXT: HSK 1 course, Module {mod_num} "{mod_title}", Lesson {lesson_num}: "{title_fr}" (type: {lesson_type})

IMPORTANT: ALL pedagogical text, explanations, tips, translations, and notes must be in FRENCH. Chinese examples stay in Chinese with pinyin. The surrounding text is in French.

Generate the HTML content for this lesson IN FRENCH."""
    
    print(f"  FR...", end=" ", flush=True)
    html_fr = ""
    try:
        html_fr = clean_html(call_llm(prompt_fr))
        print(f"✅ {len(html_fr)} chars")
    except Exception as e:
        print(f"❌ {e}")
        fail_count += 1
    
    # ─── Upload ─────────────────────────────────────────────────────
    if html_en:
        try:
            patch_supabase("lesson_translations", f"lesson_id=eq.{lesson_id}&locale=eq.en", {"content_html": html_en})
            print(f"  📤 EN saved")
            success_count += 1
        except Exception as e:
            print(f"  ❌ EN save failed: {e}")
            fail_count += 1
    
    if html_fr:
        try:
            patch_supabase("lesson_translations", f"lesson_id=eq.{lesson_id}&locale=eq.fr", {"content_html": html_fr})
            print(f"  📤 FR saved")
            success_count += 1
        except Exception as e:
            print(f"  ❌ FR save failed: {e}")
            fail_count += 1
    
    time.sleep(0.3)

print(f"\n{'='*50}")
print(f"Done! {success_count} translations saved, {fail_count} failures.")
