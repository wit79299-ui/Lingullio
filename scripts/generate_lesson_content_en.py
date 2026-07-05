#!/usr/bin/env python3
"""
Generate EN lesson content_html for lessons that have NO source content (neither EN nor FR).

Targets:
- HSK3: 55 standard lessons missing EN content (titles available)
- HSK4 mod03: 11 standard lessons missing EN content (FR titles available with grammar points)
- HSK5: 50 standard lessons missing EN content (titles list Chinese words)

Uses existing content from sibling lessons as format reference.
Generates via GPT-5 with structured prompts based on title + HSK level context.

Usage:
  python3 scripts/generate_lesson_content_en.py [hsk3|hsk4|hsk5|all]
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

config_path = os.path.expanduser("~/.genspark_llm.yaml")
with open(config_path) as f:
    cfg = yaml.safe_load(f)

client = OpenAI(api_key=cfg["openai"]["api_key"], base_url=cfg["openai"]["base_url"])

# ─── Reference content format (from HSK3 existing lesson) ───
REFERENCE_FORMAT = """<section class='lesson-intro'><h2>Introduction</h2><p>This lesson introduces resultative complements — verbs that attach to another verb to show its outcome — plus vocabulary for talking about duration and timeliness.</p></section><section class='lesson-core'><h2>Resultative complements: 完/好/到/见/懂</h2><div class='example-box'><p class='zh'>他常常迟到，但是今天没迟到。</p><p class='pinyin'>Tā chángcháng chídào, dànshì jīntiān méi chídào.</p><p class='note'>He's often late, but today he wasn't.</p></div><h2>半天 and 段</h2><div class='example-box'><p class='zh'>我等了半天，才等到一段时间的安静。</p><p class='pinyin'>Wǒ děngle bàntiān, cái děngdào yí duàn shíjiān de ānjìng.</p><p class='note'>I waited a good while before finally getting a period of quiet.</p></div><div class='warning-box'><p><strong>Caution:</strong> 才 here means "only then" — it signals something happened later than expected.</p></div></section><section class='lesson-practice'><h2>Key takeaways</h2><ul><li>Resultative complements (完/好/到/见/懂) show the successful outcome of an action.</li><li>才 = only then, later than expected; 就 = right away, sooner than expected.</li></ul></section>"""

SYSTEM_PROMPT_VOCAB = """You are an expert Chinese language teacher creating lesson content for an HSK exam preparation platform.

Generate a lesson in HTML format for English-speaking learners studying Chinese vocabulary.

REQUIREMENTS:
1. Follow this EXACT HTML structure (use these class names exactly):
   - <section class='lesson-intro'><h2>Introduction</h2>... brief overview ...</section>
   - <section class='lesson-core'><h2>Word Group Title</h2>... teaching content with examples ...</section>
   - <section class='lesson-practice'><h2>Key takeaways</h2><ul>... summary points ...</ul></section>

2. For each word or word group in the lesson-core, include at least one example in this format:
   <div class='example-box'>
     <p class='zh'>Chinese sentence using the word</p>
     <p class='pinyin'>Full pinyin with tones</p>
     <p class='note'>Natural English translation</p>
   </div>

3. Use <div class='warning-box'><p><strong>Caution:</strong>...</p></div> for common mistakes or confusions.

4. Group related words together under <h2> headings.
5. Keep the lesson concise: 800-1500 characters of HTML.
6. All Chinese must be accurate for the specified HSK level.
7. Pinyin MUST have correct tone marks (ā á ǎ à, ē é ě è, etc.).
8. Return ONLY the HTML — no markdown fencing, no explanations.

REFERENCE FORMAT:
""" + REFERENCE_FORMAT

SYSTEM_PROMPT_GRAMMAR = """You are an expert Chinese language teacher creating lesson content for an HSK exam preparation platform.

Generate a lesson in HTML format for English-speaking learners studying Chinese grammar.

REQUIREMENTS:
1. Follow this EXACT HTML structure:
   - <section class='lesson-intro'><h2>Introduction</h2>... brief overview of the grammar point ...</section>
   - <section class='lesson-core'><h2>Grammar Point</h2>... teaching content with pattern + examples ...</section>
   - <section class='lesson-practice'><h2>Key takeaways</h2><ul>... summary points ...</ul></section>

2. For each grammar pattern, show the structure clearly, then give 2-3 examples:
   <div class='example-box'>
     <p class='zh'>Chinese sentence</p>
     <p class='pinyin'>Full pinyin with tone marks</p>
     <p class='note'>Natural English translation + brief grammar note</p>
   </div>

3. Use <div class='warning-box'> for common mistakes or confusions.
4. Keep the lesson concise: 800-1500 characters of HTML.
5. All Chinese must be accurate for the specified HSK level.
6. Pinyin MUST have correct tone marks.
7. Return ONLY the HTML — no markdown fencing, no explanations.

REFERENCE FORMAT:
""" + REFERENCE_FORMAT


def sb_get(ep):
    req = urllib.request.Request(f"{SUPABASE_URL}/{ep}", headers=SB_H)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  sb_get error: {e}", flush=True)
        return []


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
        print(f"  SB POST ERR {e.code}: {e.read().decode()[:200]}")
        return None


def openai_generate(prompt, system_prompt, max_retries=3):
    for attempt in range(max_retries):
        try:
            resp = client.chat.completions.create(
                model="gpt-5",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.4,
            )
            result = resp.choices[0].message.content
            if result:
                result = result.strip()
                # Strip markdown fencing
                if result.startswith("```"):
                    lines = result.split("\n")
                    if lines[0].startswith("```"):
                        lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    result = "\n".join(lines)
                return result
        except Exception as e:
            print(f"    OpenAI attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** (attempt + 1))
    return None


def sb_get_all(ep):
    """Get all rows from Supabase endpoint (handles pagination via Range header)."""
    all_rows = []
    offset = 0
    batch = 1000
    while True:
        h = dict(SB_H)
        h["Range"] = f"{offset}-{offset + batch - 1}"
        req = urllib.request.Request(f"{SUPABASE_URL}/{ep}", headers=h)
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
                if not data:
                    break
                all_rows.extend(data)
                if len(data) < batch:
                    break
                offset += batch
        except Exception as e:
            print(f"  Warning: sb_get_all error at offset {offset}: {e}")
            break
    return all_rows


def collect_missing_lessons(course_id, module_filter=None):
    """Collect standard lessons with no EN content_html — optimized per-module batch."""
    print("  Fetching modules...", flush=True)
    mods = sb_get(f"modules?course_id=eq.{course_id}&select=id,sort_order&order=sort_order")
    if not mods:
        print("  ⚠️ No modules found", flush=True)
        return []
    print(f"  Found {len(mods)} modules", flush=True)

    lessons = []

    for m in mods:
        if module_filter and m["sort_order"] not in module_filter:
            continue

        mod_id = m["id"]
        mod_sort = m["sort_order"]

        # Fetch all standard lessons for this module (single request)
        mod_lessons = sb_get(
            f"lessons?module_id=eq.{mod_id}&lesson_type=eq.standard&select=id,module_id,sort_order&order=sort_order"
        )
        if not mod_lessons:
            continue

        # Fetch all translations for this module's lessons (single request)
        lesson_ids = ",".join([l["id"] for l in mod_lessons])
        all_trans = sb_get(
            f"lesson_translations?lesson_id=in.({lesson_ids})&select=id,lesson_id,locale,title,description,content_html"
        )

        # Index translations by lesson_id
        trans_by_lesson = {}
        for t in (all_trans or []):
            lid = t["lesson_id"]
            if lid not in trans_by_lesson:
                trans_by_lesson[lid] = []
            trans_by_lesson[lid].append(t)

        for l in mod_lessons:
            trans = trans_by_lesson.get(l["id"], [])
            en_data = None
            fr_data = None
            for t in trans:
                if t["locale"] == "en":
                    en_data = t
                elif t["locale"] == "fr":
                    fr_data = t

            if en_data and en_data.get("content_html"):
                continue  # Already has content

            en_title = en_data.get("title", "") if en_data else ""
            fr_title = fr_data.get("title", "") if fr_data else ""
            title = en_title or fr_title

            lessons.append({
                "lesson_id": l["id"],
                "mod": mod_sort,
                "les": l["sort_order"],
                "en_title": en_title,
                "fr_title": fr_title,
                "title": title,
                "en_row_id": en_data["id"] if en_data else None,
            })

        print(f"    Module {mod_sort:02d}: {len(mod_lessons)} lessons scanned", flush=True)

    # Sort by module then lesson
    lessons.sort(key=lambda x: (x["mod"], x["les"]))
    return lessons


def determine_lesson_type(title):
    """Determine if lesson is vocab or grammar based on title."""
    grammar_indicators = [
        "被", "即使", "尽管", "无论", "不管", "越", "一...就",
        "把", "的", "了", "着", "过", "得", "grammar", "Grammar",
        "voix passive", "concessive", "proportionnalité", "immédiateté",
    ]
    for g in grammar_indicators:
        if g in title:
            return "grammar"
    return "vocab"


def process_lessons(course_key, course_id, label, module_filter=None):
    print(f"\n{'='*70}")
    print(f"GENERATING EN CONTENT — {label}")
    print(f"{'='*70}")

    lessons = collect_missing_lessons(course_id, module_filter)
    print(f"  Found {len(lessons)} lessons to generate\n", flush=True)

    success = 0
    fail = 0

    for i, les in enumerate(lessons):
        ref = f"mod{les['mod']:02d}_les{les['les']}"
        lesson_type = determine_lesson_type(les["title"])
        system = SYSTEM_PROMPT_GRAMMAR if lesson_type == "grammar" else SYSTEM_PROMPT_VOCAB

        print(f"  [{i+1}/{len(lessons)}] {ref} — '{les['title'][:55]}' (type: {lesson_type})", flush=True)

        # Build generation prompt
        hsk_level = label.replace("HSK", "").replace(" mod03", "")
        prompt = f"""Generate an HSK{hsk_level} lesson for: "{les['title']}"

This is a standard vocabulary/grammar lesson at HSK level {hsk_level}.
The lesson title suggests the content focus — create appropriate teaching content with Chinese examples, pinyin, and English explanations."""

        en_html = openai_generate(prompt, system)
        if not en_html:
            print(f"    ❌ Generation failed — skipping")
            fail += 1
            continue

        # Validate: should contain example-box and Chinese characters
        if "example-box" not in en_html or "class='zh'" not in en_html:
            print(f"    ⚠️  Missing expected structure — attempting anyway ({len(en_html)} chars)")

        # Save to DB
        if les["en_row_id"]:
            ok = sb_patch(
                f"lesson_translations?id=eq.{les['en_row_id']}",
                {"content_html": en_html},
            )
        else:
            # Need to create EN row
            result = sb_post(
                "lesson_translations",
                {
                    "lesson_id": les["lesson_id"],
                    "locale": "en",
                    "title": les["en_title"] or les["fr_title"],
                    "content_html": en_html,
                },
            )
            ok = result is not None

        status = "✅" if ok else "❌"
        print(f"    {status} EN content saved ({len(en_html)} chars)", flush=True)
        if ok:
            success += 1
        else:
            fail += 1

        time.sleep(0.5)

    print(f"\n  {'='*50}")
    print(f"  {label} COMPLETE: ✅ {success} | ❌ {fail} | Total {len(lessons)}")
    print(f"  {'='*50}")
    return success, fail


TARGETS = {
    "hsk3": ("a0000000-0000-0000-0000-000000000003", "HSK3", None),
    "hsk4": ("a0000000-0000-0000-0000-000000000004", "HSK4 mod03", [3]),
    "hsk5": ("a0000000-0000-0000-0000-000000000005", "HSK5", None),
}

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    if target in TARGETS:
        cid, lbl, mf = TARGETS[target]
        process_lessons(target, cid, lbl, mf)
    elif target == "all":
        total_s, total_f = 0, 0
        for key in ["hsk3", "hsk4", "hsk5"]:
            cid, lbl, mf = TARGETS[key]
            s, f = process_lessons(key, cid, lbl, mf)
            total_s += s
            total_f += f
        print(f"\n{'='*70}")
        print(f"GRAND TOTAL: ✅ {total_s} | ❌ {total_f}")
        print(f"{'='*70}")
    else:
        print(f"Usage: {sys.argv[0]} [hsk3|hsk4|hsk5|all]")
        sys.exit(1)
