#!/usr/bin/env python3
"""
Enrich all HSK1 exercises with structured metadata for interactive rendering.
Each exercise type gets specific fields in metadata JSON.
"""
import json, urllib.request, os, time, sys

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"
LLM_BASE = os.environ["OPENAI_BASE_URL"]
LLM_KEY = os.environ["OPENAI_API_KEY"]

def fetch(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    req = urllib.request.Request(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"})
    return json.loads(urllib.request.urlopen(req).read())

def patch(table, filters, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}?{filters}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method='PATCH', headers={
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json", "Prefer": "return=minimal"})
    urllib.request.urlopen(req)

def call_llm(prompt):
    body = json.dumps({"model":"gpt-5-mini","messages":[{"role":"user","content":prompt}],"max_tokens":2000,"temperature":0.3}).encode()
    req = urllib.request.Request(f"{LLM_BASE}/chat/completions", data=body, headers={
        "Authorization": f"Bearer {LLM_KEY}", "Content-Type": "application/json", "User-Agent": "curl/8.0"})
    resp = urllib.request.urlopen(req, timeout=60)
    return json.loads(resp.read())["choices"][0]["message"]["content"]

def extract_json(text):
    """Extract JSON from LLM response, handling markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("json\n") or text.startswith("json "):
        text = text[5:]
    return json.loads(text.strip())

# ─── Metadata schema per exercise type ─────────────────────────────────

SCHEMA_PROMPT = """You are generating structured exercise data for a Chinese HSK1 learning platform.
Given an exercise's type, prompt, instruction, hint, and explanation, generate the MISSING interactive data as JSON.

RETURN ONLY VALID JSON — no markdown fences, no explanation.

The JSON structure depends on exercise_type:

For "mcq":
{"options": ["A text", "B text", "C text", "D text"], "correct_index": 0}
- 4 options, one correct. correct_index is 0-based.

For "fill_blank":
{"correct_answer": "是", "accept_alternatives": ["是的"], "sentence_template": "我___学生。"}
- correct_answer: the word to fill in. accept_alternatives: other accepted answers.

For "matching":
{"pairs": [{"left": "你好", "right": "Hello"}, {"left": "谢谢", "right": "Thank you"}, ...]}
- 4-6 pairs to match. Left = Chinese, Right = translation/pinyin.

For "reorder":
{"words": ["你", "叫", "什么", "名字"], "correct_order": [0, 1, 2, 3], "correct_sentence": "你叫什么名字？"}
- Scrambled word tiles. correct_order maps indices to proper sequence.

For "character_recognition":
{"options": [{"char": "大", "pinyin": "dà"}, {"char": "太", "pinyin": "tài"}, {"char": "天", "pinyin": "tiān"}, {"char": "夫", "pinyin": "fū"}], "correct_index": 0}

For "flashcard":
{"front": "人", "front_pinyin": "rén", "back": "person", "audio_text": "人"}

For "listening_comprehension":
{"audio_text": "你好，我叫小明。", "options": ["His name is Xiao Ming", "He is a student", "He likes food", "He is from Beijing"], "correct_index": 0}

For "dictation":
{"audio_text": "你叫什么名字？", "correct_answer": "你叫什么名字", "accept_alternatives": ["你叫什么名字？"]}

For "controlled_translation":
{"source_text": "I am a student.", "correct_answer": "我是学生", "accept_alternatives": ["我是学生。", "我是一个学生"], "key_words": ["我", "是", "学生"]}

For "reading_comprehension":
{"passage": "A: 你好！你叫什么名字？\\nB: 我叫李华。", "questions": [{"question": "What is B's name?", "options": ["Wang Wei", "Li Hua", "Zhang San", "Xiao Ming"], "correct_index": 1}]}
"""

# ─── Fetch and process all exercises ──────────────────────────────────

start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0

exercises = fetch("exercises?hsk_level=eq.1&order=sort_order&select=id,exercise_type,metadata,sort_order,difficulty,points,lesson_id")
print(f"Total exercises: {len(exercises)}")

# Filter only those with empty metadata
to_process = [(i, e) for i, e in enumerate(exercises) if not e.get('metadata') or e['metadata'] == {}]
print(f"Need enrichment: {len(to_process)}")
to_process = [(i, e) for i, e in to_process if i >= start_idx]
print(f"Processing from index {start_idx}: {len(to_process)} exercises\n")

# Batch by groups of 5 for LLM efficiency
batch_size = 3
success = 0
fail = 0

for batch_start in range(0, len(to_process), batch_size):
    batch = to_process[batch_start:batch_start + batch_size]
    
    # Gather translation info for each exercise in batch
    batch_info = []
    for orig_idx, ex in batch:
        trans = fetch(f"exercise_translations?exercise_id=eq.{ex['id']}&locale=eq.en&select=prompt,instruction,hint,explanation")
        t = trans[0] if trans else {}
        batch_info.append({
            "id": ex['id'],
            "idx": orig_idx,
            "type": ex['exercise_type'],
            "prompt": t.get('prompt', ''),
            "instruction": t.get('instruction', ''),
            "hint": t.get('hint', ''),
            "explanation": t.get('explanation', ''),
            "difficulty": ex['difficulty'],
        })
    
    # Build batch prompt
    exercises_desc = "\n\n".join([
        f"Exercise {i+1}:\n  type: {b['type']}\n  prompt: {b['prompt']}\n  instruction: {b['instruction']}\n  hint: {b['hint']}\n  explanation: {b['explanation']}"
        for i, b in enumerate(batch_info)
    ])
    
    prompt = f"""{SCHEMA_PROMPT}

Generate metadata for these {len(batch_info)} exercises. Return a JSON ARRAY with one object per exercise, in order.

{exercises_desc}

Return ONLY a JSON array [{"{...}"}, {"{...}"}, ...] with {len(batch_info)} objects."""
    
    print(f"Batch {batch_start//batch_size + 1} ({len(batch_info)} exercises: {', '.join(b['type'] for b in batch_info)})...", end=" ", flush=True)
    
    try:
        result = extract_json(call_llm(prompt))
        if not isinstance(result, list):
            result = [result]
        
        for bi, metadata in zip(batch_info, result):
            try:
                patch("exercises", f"id=eq.{bi['id']}", {"metadata": metadata})
                success += 1
            except Exception as e:
                print(f"\n  ❌ Save failed for {bi['id']}: {e}")
                fail += 1
        
        print(f"✅ {len(result)} saved")
    except Exception as e:
        print(f"❌ {e}")
        fail += len(batch_info)
    
    time.sleep(0.3)

print(f"\n{'='*50}")
print(f"Done! {success} enriched, {fail} failed.")
