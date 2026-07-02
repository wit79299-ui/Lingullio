#!/usr/bin/env python3
"""
Import HSK1 grammar points into Supabase via REST API.
- grammar_points table: id, pattern, hsk_level, sort_order, difficulty, status
- grammar_point_translations table: grammar_point_id, locale, title, explanation_html
"""

import json
import sys
import requests
import time

SUPABASE_URL = "https://gmpjkoajhhwvxwsdohll.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtcGprb2FqaGh3dnh3c2RvaGxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjk4Mzk0NSwiZXhwIjoyMDk4NTU5OTQ1fQ.iHoqQdpjq3_vCMuuHEs9Y9in_lpKQ_cCRaI3EtJ6tKc"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def make_uuid(index: int) -> str:
    """Generate deterministic UUID for grammar points.
    Uses a valid UUID format: 91000NNN-0000-0000-0000-000000000000
    (prefix 9 = grammar, distinguishes from vocab d1000NNN)"""
    return f"91000{index:03d}-0000-0000-0000-000000000000"


def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else "/home/user/uploaded_files/lingullio_hsk1_grammar.json.txt"
    
    with open(input_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    print(f"Loaded {len(data)} grammar points from {input_file}")
    
    # Validate
    for i, item in enumerate(data):
        assert "pattern" in item, f"Item {i} missing pattern"
        assert "translations" in item, f"Item {i} missing translations"
        assert "fr" in item["translations"], f"Item {i} missing fr translation"
        assert "en" in item["translations"], f"Item {i} missing en translation"
    
    print("Validation OK")
    
    # Step 1: Delete existing HSK1 grammar imported by this script (g1000xxx UUIDs)
    # First check what's there
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/grammar_points?hsk_level=eq.1&select=id",
        headers=HEADERS
    )
    existing = resp.json() if resp.status_code == 200 else []
    print(f"Existing grammar points for level 1: {len(existing)}")
    
    # Step 2: Insert grammar_points
    grammar_rows = []
    for i, item in enumerate(data):
        uid = make_uuid(i + 1)
        grammar_rows.append({
            "id": uid,
            "pattern": item["pattern"],
            "hsk_level": "1",  # Normalized to match courses slug
            "sort_order": item.get("sort_order", i + 1),
            "difficulty": item.get("difficulty", 1),
            "status": "published",
        })
    
    print(f"\nInserting {len(grammar_rows)} grammar_points...")
    
    # Batch insert (upsert to handle re-runs)
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/grammar_points",
        headers={**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json=grammar_rows,
    )
    
    if resp.status_code in (200, 201):
        inserted = resp.json()
        print(f"  OK: {len(inserted)} grammar_points upserted")
    else:
        print(f"  ERROR {resp.status_code}: {resp.text}")
        sys.exit(1)
    
    time.sleep(0.5)
    
    # Step 3: Insert translations
    translation_rows = []
    for i, item in enumerate(data):
        uid = make_uuid(i + 1)
        for locale in ("fr", "en"):
            t = item["translations"].get(locale, {})
            if not t:
                continue
            
            # Store examples and common_errors as JSON in explanation_html
            # by appending them as structured HTML
            explanation = t.get("explanation_html", "")
            
            # Add examples as HTML
            examples = t.get("examples", [])
            if examples:
                explanation += '\n<div class="examples"><h3>Exemples</h3>' if locale == "fr" else '\n<div class="examples"><h3>Examples</h3>'
                for ex in examples:
                    explanation += f'<div class="example">'
                    explanation += f'<p class="zh">{ex.get("zh", "")}</p>'
                    explanation += f'<p class="pinyin">{ex.get("pinyin", "")}</p>'
                    explanation += f'<p class="translation">{ex.get("translation", "")}</p>'
                    explanation += f'</div>'
                explanation += '</div>'
            
            # Add common errors as HTML
            errors = t.get("common_errors", [])
            if errors:
                explanation += '\n<div class="common-errors"><h3>Erreurs frequentes</h3>' if locale == "fr" else '\n<div class="common-errors"><h3>Common errors</h3>'
                for err in errors:
                    explanation += f'<div class="error-item">'
                    explanation += f'<p class="error"><span class="wrong">✗</span> {err.get("error", "")}</p>'
                    explanation += f'<p class="correction"><span class="right">✓</span> {err.get("correction", "")}</p>'
                    explanation += f'<p class="error-explanation">{err.get("explanation", "")}</p>'
                    explanation += f'</div>'
                explanation += '</div>'
            
            translation_rows.append({
                "grammar_point_id": uid,
                "locale": locale,
                "title": t.get("title", item["pattern"]),
                "explanation_html": explanation,
            })
    
    print(f"Inserting {len(translation_rows)} grammar_point_translations...")
    
    # Batch upsert
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/grammar_point_translations",
        headers={**HEADERS, "Prefer": "return=representation,resolution=merge-duplicates"},
        json=translation_rows,
    )
    
    if resp.status_code in (200, 201):
        inserted = resp.json()
        print(f"  OK: {len(inserted)} translations upserted")
    else:
        print(f"  ERROR {resp.status_code}: {resp.text}")
        sys.exit(1)
    
    # Verify
    time.sleep(0.5)
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/grammar_points?hsk_level=eq.1&select=id,pattern&order=sort_order",
        headers=HEADERS
    )
    final = resp.json() if resp.status_code == 200 else []
    print(f"\nVerification: {len(final)} grammar points for HSK level 1")
    
    resp2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/grammar_point_translations?select=locale,grammar_point_id",
        headers=HEADERS
    )
    translations = resp2.json() if resp2.status_code == 200 else []
    fr_count = sum(1 for t in translations if t["locale"] == "fr")
    en_count = sum(1 for t in translations if t["locale"] == "en")
    print(f"Translations: {fr_count} FR, {en_count} EN")
    print("\nDone!")


if __name__ == "__main__":
    main()
