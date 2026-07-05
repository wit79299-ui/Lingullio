#!/usr/bin/env python3
"""
Translate lesson content_html from French to English using OpenAI API.

Targets: HSK6 (13 lessons) and HSK7-9 (82 lessons) that have FR content but no EN content.
Also translates the FR title to EN.

Strategy:
- Reads FR content_html + FR title from lesson_translations
- Sends to GPT-5 for translation (preserving ALL HTML structure, classes, emojis)
- Creates EN translation row via POST (since no EN row exists for these lessons)

Usage:
  python3 scripts/translate_lessons_fr_to_en.py [hsk6|hsk79|all]
"""

import json
import urllib.request
import urllib.error
import sys
import time
import yaml
import os
from openai import OpenAI

# ─── Config ───
SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co/rest/v1"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
SB_H = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}

# Load OpenAI config and init client
config_path = os.path.expanduser("~/.genspark_llm.yaml")
with open(config_path) as f:
    cfg = yaml.safe_load(f)

client = OpenAI(api_key=cfg["openai"]["api_key"], base_url=cfg["openai"]["base_url"])

COURSES = {
    "hsk6": ("a0000000-0000-0000-0000-000000000006", "HSK6"),
    "hsk79": ("a0000000-0000-0000-0000-000000000079", "HSK7-9"),
}

SYSTEM_PROMPT = """You are a professional translator for a Chinese language learning platform (HSK exam prep).
Translate the following lesson content from French to English.

CRITICAL RULES:
1. Translate ONLY the French text. Keep ALL HTML tags, CSS classes, inline styles, and structure EXACTLY as-is.
2. NEVER modify, remove, or add any HTML tag, class name, id, or attribute.
3. Keep ALL Chinese characters (汉字), pinyin, and example sentences EXACTLY as-is — do NOT translate or modify them.
4. Keep ALL emojis exactly as-is (🎯, 💡, ⚠️, etc.).
5. Keep HTML entities like &#x27; as-is.
6. The translation should sound natural for an English-speaking learner of Chinese.
7. Use clear, pedagogical English appropriate for HSK exam preparation.
8. Return ONLY the translated HTML — no markdown fencing, no explanations, no extra text."""

TITLE_SYSTEM_PROMPT = """You are a professional translator for a Chinese language learning platform.
Translate the following French lesson title to English.
Return ONLY the translated title — no quotes, no explanations, no markdown.
Keep any Chinese characters or technical terms as-is."""


def sb_get(ep):
    req = urllib.request.Request(f"{SUPABASE_URL}/{ep}", headers=SB_H)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  SB GET ERR {e.code}: {e.read().decode()[:200]}")
        return []


def sb_post(ep, data):
    h = dict(SB_H)
    h["Content-Type"] = "application/json"
    h["Prefer"] = "return=representation"
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}/{ep}", data=body, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  SB POST ERR {e.code}: {e.read().decode()[:300]}")
        return None


def sb_patch(ep, data):
    h = dict(SB_H)
    h["Content-Type"] = "application/json"
    h["Prefer"] = "return=minimal"
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{SUPABASE_URL}/{ep}", data=body, headers=h, method="PATCH")
    try:
        with urllib.request.urlopen(req) as r:
            return True
    except urllib.error.HTTPError as e:
        print(f"  SB PATCH ERR {e.code}: {e.read().decode()[:200]}")
        return False


def openai_translate(text, system_prompt, max_retries=3):
    """Call OpenAI API to translate text using SDK."""
    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model="gpt-5",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text},
                ],
                temperature=0.3,
            )
            result = resp.choices[0].message.content
            if result:
                return result.strip()
            else:
                print(f"    OpenAI returned empty content (attempt {attempt+1})")
        except Exception as e:
            print(f"    OpenAI attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 1))
    return None


def collect_lessons(course_id):
    """Collect all standard lessons with FR content but no EN content."""
    mods = sb_get(f"modules?course_id=eq.{course_id}&select=id,sort_order&order=sort_order")
    lessons = []

    for m in mods:
        mod_lessons = sb_get(
            f"lessons?module_id=eq.{m['id']}&select=id,sort_order,lesson_type&order=sort_order"
        )
        for l in mod_lessons:
            if l["lesson_type"] != "standard":
                continue

            trans = sb_get(
                f"lesson_translations?lesson_id=eq.{l['id']}&select=id,locale,title,description,content_html"
            )
            fr_data = None
            en_data = None
            for t in trans:
                if t["locale"] == "fr":
                    fr_data = t
                elif t["locale"] == "en":
                    en_data = t

            if fr_data and fr_data.get("content_html") and (not en_data or not en_data.get("content_html")):
                lessons.append({
                    "lesson_id": l["id"],
                    "mod": m["sort_order"],
                    "les": l["sort_order"],
                    "fr_title": fr_data.get("title", ""),
                    "fr_description": fr_data.get("description", ""),
                    "fr_html": fr_data["content_html"],
                    "en_row_id": en_data["id"] if en_data else None,
                    "en_title": en_data.get("title", "") if en_data else "",
                })

    return lessons


def process_course(course_key):
    course_id, label = COURSES[course_key]
    print(f"\n{'='*70}")
    print(f"TRANSLATING {label} — FR → EN")
    print(f"{'='*70}")

    lessons = collect_lessons(course_id)
    print(f"  Found {len(lessons)} lessons to translate\n")

    success = 0
    fail = 0

    for i, les in enumerate(lessons):
        ref = f"mod{les['mod']:02d}_les{les['les']}"
        print(f"  [{i+1}/{len(lessons)}] {ref} — '{les['fr_title'][:50]}' ({len(les['fr_html'])} chars)")

        # Translate title
        en_title = les.get("en_title", "")
        if not en_title or en_title == les["fr_title"]:
            en_title = openai_translate(les["fr_title"], TITLE_SYSTEM_PROMPT)
            if not en_title:
                print(f"    ❌ Title translation failed — skipping")
                fail += 1
                continue
            print(f"    Title: '{les['fr_title'][:40]}' → '{en_title[:40]}'")

        # Translate description if present
        en_description = ""
        if les.get("fr_description"):
            en_description = openai_translate(les["fr_description"], TITLE_SYSTEM_PROMPT)

        # Translate content HTML
        en_html = openai_translate(les["fr_html"], SYSTEM_PROMPT)
        if not en_html:
            print(f"    ❌ Content translation failed — skipping")
            fail += 1
            continue

        # Basic validation: EN should be at least 30% of FR length
        if len(en_html) < len(les["fr_html"]) * 0.3:
            print(f"    ⚠️  Suspicious: EN ({len(en_html)}) << FR ({len(les['fr_html'])})")

        # Strip markdown fencing if model added it
        if en_html.startswith("```"):
            lines = en_html.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            en_html = "\n".join(lines)

        # Insert or update EN translation
        if les["en_row_id"]:
            # PATCH existing row
            ok = sb_patch(
                f"lesson_translations?id=eq.{les['en_row_id']}",
                {"title": en_title, "description": en_description or None, "content_html": en_html},
            )
        else:
            # POST new row
            result = sb_post(
                "lesson_translations",
                {
                    "lesson_id": les["lesson_id"],
                    "locale": "en",
                    "title": en_title,
                    "description": en_description or None,
                    "content_html": en_html,
                },
            )
            ok = result is not None

        status = "✅" if ok else "❌"
        print(f"    {status} EN content saved ({len(en_html)} chars)")

        if ok:
            success += 1
        else:
            fail += 1

        # Small delay between lessons
        time.sleep(0.5)

    print(f"\n  {'='*50}")
    print(f"  {label} COMPLETE: ✅ {success} | ❌ {fail} | Total {len(lessons)}")
    print(f"  {'='*50}")
    return success, fail


# ─── Main ───
if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target == "hsk6":
        process_course("hsk6")
    elif target == "hsk79":
        process_course("hsk79")
    elif target == "all":
        s1, f1 = process_course("hsk6")
        s2, f2 = process_course("hsk79")
        print(f"\n{'='*70}")
        print(f"GRAND TOTAL: ✅ {s1+s2} | ❌ {f1+f2}")
        print(f"{'='*70}")
    else:
        print(f"Usage: {sys.argv[0]} [hsk6|hsk79|all]")
        sys.exit(1)
