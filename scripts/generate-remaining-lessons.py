#!/usr/bin/env python3
"""Generate content for remaining 11 empty lessons (batch 2)."""
import json, urllib.request, time, os, sys

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
LLM_BASE = os.environ["OPENAI_BASE_URL"]
LLM_KEY = os.environ["OPENAI_API_KEY"]

def call_llm(prompt):
    body = json.dumps({"model":"gpt-5-mini","messages":[{"role":"user","content":prompt}],"max_tokens":4000,"temperature":0.7}).encode()
    req = urllib.request.Request(f"{LLM_BASE}/chat/completions", data=body, headers={
        "Authorization":f"Bearer {LLM_KEY}","Content-Type":"application/json","User-Agent":"curl/8.0"})
    resp = urllib.request.urlopen(req, timeout=120)
    return json.loads(resp.read())["choices"][0]["message"]["content"]

def patch(lesson_id, locale, html):
    url = f"{SUPABASE_URL}/rest/v1/lesson_translations?lesson_id=eq.{lesson_id}&locale=eq.{locale}"
    body = json.dumps({"content_html": html}).encode()
    req = urllib.request.Request(url, data=body, method='PATCH', headers={
        "apikey":SUPABASE_KEY,"Authorization":f"Bearer {SUPABASE_KEY}",
        "Content-Type":"application/json","Prefer":"return=minimal"})
    urllib.request.urlopen(req)

def clean(text):
    text = text.strip()
    if text.startswith("```"): text = text.split("\n",1)[1] if "\n" in text else text[3:]
    if text.endswith("```"): text = text[:-3].strip()
    if text.startswith("html\n") or text.startswith("html "): text = text[5:]
    return text.strip()

SP = """You are a Chinese language education expert creating lesson content for HSK1 learners.
Return ONLY raw HTML (no markdown fences, no preamble). CSS classes:
- <section class='lesson-intro'> with <h2>Introduction</h2>
- <section class='lesson-core'> with <h2> subsections
- <div class='example-box'> with <p class='zh'>, <p class='pinyin'>, <p class='note'>
- <div class='tip-box'>, <div class='warning-box'>, <div class='practice-box'>, <div class='key-point'>
- <section class='summary'> with <h2>Summary</h2>
Rules: ALL Chinese has pinyin+translation. HSK1 vocab only. 2000-4000 chars HTML. Practical content."""

# Start from where we left off (index from CLI arg, default 0)
start = int(sys.argv[1]) if len(sys.argv) > 1 else 0

LESSONS = [
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

for idx, (lid, mod, mtitle, lnum, ten, tfr, ltype) in enumerate(LESSONS[start:], start=start):
    print(f"\n[{idx+1}/{len(LESSONS)}] M{mod}L{lnum}: {ten}")
    
    for locale, title, lang_inst in [
        ("en", ten, "IN ENGLISH"),
        ("fr", tfr, "IN FRENCH. All explanatory text in French. Chinese examples stay in Chinese with pinyin.")
    ]:
        prompt = f"""{SP}
HSK1, Module {mod} "{mtitle}", Lesson {lnum}: "{title}" (type: {ltype})
Generate content {lang_inst}."""
        
        print(f"  {locale.upper()}...", end=" ", flush=True)
        try:
            html = clean(call_llm(prompt))
            patch(lid, locale, html)
            print(f"✅ {len(html)}c saved")
        except Exception as e:
            print(f"❌ {e}")
        time.sleep(0.2)

print("\nDone!")
