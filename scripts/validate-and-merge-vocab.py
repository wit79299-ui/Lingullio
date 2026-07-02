#!/usr/bin/env python3
"""
Validate and merge HSK1 vocabulary lots into a single clean JSON file.
Checks: JSON validity, duplicates, required fields, theme/word_type values, pinyin format.
"""

import json
import sys
import os
from collections import Counter

# Expected values
VALID_THEMES = {
    'greetings', 'family', 'food_drink', 'numbers', 'time_dates',
    'transport', 'school_work', 'body_health', 'weather_nature',
    'shopping', 'places', 'daily_life', 'communication', 'feelings',
    'clothing', 'hobbies', 'directions', 'basic_verbs', 'basic_adjectives',
    'pronouns_particles'
}

VALID_WORD_TYPES = {
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'conjunction',
    'particle', 'measure_word', 'preposition', 'interjection',
    'numeral', 'proper_noun'
}

REQUIRED_FIELDS = ['_temp_id', 'simplified', 'pinyin', 'hsk_level', 'word_type', 'theme', 'translations']

def load_lot(filepath):
    """Load a JSON lot file, return list of items."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().strip()
        # Some files might have trailing commas or issues
        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"  ERROR: Invalid JSON in {filepath}: {e}")
            # Try to fix common issues
            # Remove trailing commas before ] or }
            import re
            content = re.sub(r',\s*([\]}])', r'\1', content)
            try:
                data = json.loads(content)
                print(f"  FIXED: Trailing comma issue resolved")
            except json.JSONDecodeError as e2:
                print(f"  FATAL: Cannot parse {filepath}: {e2}")
                return []
    
    if not isinstance(data, list):
        print(f"  ERROR: {filepath} is not a JSON array")
        return []
    
    return data

def validate_item(item, index, errors, warnings):
    """Validate a single vocabulary item."""
    prefix = f"Item {index} ({item.get('_temp_id', 'NO_ID')}, {item.get('simplified', '???')})"
    
    # Check required fields
    for field in REQUIRED_FIELDS:
        if field not in item or item[field] is None:
            errors.append(f"{prefix}: missing required field '{field}'")
    
    # Check hsk_level
    if item.get('hsk_level') != 'HSK1':
        errors.append(f"{prefix}: hsk_level is '{item.get('hsk_level')}', expected 'HSK1'")
    
    # Check theme
    theme = item.get('theme')
    if theme and theme not in VALID_THEMES:
        warnings.append(f"{prefix}: unknown theme '{theme}'")
    
    # Check word_type
    wt = item.get('word_type')
    if wt and wt not in VALID_WORD_TYPES:
        warnings.append(f"{prefix}: unknown word_type '{wt}'")
    
    # Check translations exist for fr and en
    tr = item.get('translations', {})
    for lang in ['fr', 'en']:
        if lang not in tr:
            errors.append(f"{prefix}: missing '{lang}' translation")
        else:
            if not tr[lang].get('meaning'):
                errors.append(f"{prefix}: missing '{lang}' meaning")
            if not tr[lang].get('example_sentence'):
                warnings.append(f"{prefix}: missing '{lang}' example_sentence")
    
    # Check pinyin has unicode accents (not numbers)
    pinyin = item.get('pinyin', '')
    if any(c.isdigit() for c in pinyin) and not any(c in pinyin for c in 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ'):
        warnings.append(f"{prefix}: pinyin '{pinyin}' uses numbers instead of unicode accents")
    
    # Check simplified is not empty
    if not item.get('simplified'):
        errors.append(f"{prefix}: empty 'simplified' field")

def main():
    raw_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'hsk1', 'raw')
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'hsk1')
    
    all_items = []
    errors = []
    warnings = []
    
    print("=" * 60)
    print("HSK1 Vocabulary Validation & Merge")
    print("=" * 60)
    
    # Load all lots
    for i in range(1, 7):
        filepath = os.path.join(raw_dir, f'lingullio_hsk1_vocab_lot{i}.json.txt')
        print(f"\nLoading Lot {i}/6: {filepath}")
        
        if not os.path.exists(filepath):
            errors.append(f"Lot {i}: file not found: {filepath}")
            continue
        
        items = load_lot(filepath)
        print(f"  Loaded {len(items)} items")
        all_items.extend(items)
    
    print(f"\n{'=' * 60}")
    print(f"Total items loaded: {len(all_items)}")
    print(f"{'=' * 60}")
    
    # Validate each item
    print("\nValidating items...")
    for idx, item in enumerate(all_items):
        validate_item(item, idx + 1, errors, warnings)
    
    # Check for duplicate simplified characters
    simplified_list = [item.get('simplified', '') for item in all_items]
    duplicates = {k: v for k, v in Counter(simplified_list).items() if v > 1}
    if duplicates:
        for word, count in duplicates.items():
            warnings.append(f"Duplicate simplified '{word}' appears {count} times")
    
    # Check for duplicate _temp_id
    id_list = [item.get('_temp_id', '') for item in all_items]
    id_dups = {k: v for k, v in Counter(id_list).items() if v > 1}
    if id_dups:
        for tid, count in id_dups.items():
            errors.append(f"Duplicate _temp_id '{tid}' appears {count} times")
    
    # Stats
    themes = Counter(item.get('theme', 'UNKNOWN') for item in all_items)
    word_types = Counter(item.get('word_type', 'UNKNOWN') for item in all_items)
    has_traditional = sum(1 for item in all_items if item.get('traditional'))
    has_example_fr = sum(1 for item in all_items if item.get('translations', {}).get('fr', {}).get('example_sentence'))
    has_example_en = sum(1 for item in all_items if item.get('translations', {}).get('en', {}).get('example_sentence'))
    has_usage_fr = sum(1 for item in all_items if item.get('translations', {}).get('fr', {}).get('usage_notes'))
    has_usage_en = sum(1 for item in all_items if item.get('translations', {}).get('en', {}).get('usage_notes'))
    
    # Print report
    print(f"\n{'=' * 60}")
    print("VALIDATION REPORT")
    print(f"{'=' * 60}")
    print(f"\nTotal words: {len(all_items)}")
    print(f"With traditional variant: {has_traditional}")
    print(f"With FR example: {has_example_fr}/{len(all_items)}")
    print(f"With EN example: {has_example_en}/{len(all_items)}")
    print(f"With FR usage notes: {has_usage_fr}/{len(all_items)}")
    print(f"With EN usage notes: {has_usage_en}/{len(all_items)}")
    print(f"Unique simplified: {len(set(simplified_list))}")
    print(f"Duplicate simplified: {len(duplicates)}")
    
    print(f"\nThemes ({len(themes)}):")
    for theme, count in sorted(themes.items(), key=lambda x: -x[1]):
        marker = "  " if theme in VALID_THEMES else "⚠ "
        print(f"  {marker}{theme}: {count}")
    
    print(f"\nWord types ({len(word_types)}):")
    for wt, count in sorted(word_types.items(), key=lambda x: -x[1]):
        marker = "  " if wt in VALID_WORD_TYPES else "⚠ "
        print(f"  {marker}{wt}: {count}")
    
    if errors:
        print(f"\n❌ ERRORS ({len(errors)}):")
        for e in errors[:30]:
            print(f"  - {e}")
        if len(errors) > 30:
            print(f"  ... and {len(errors) - 30} more")
    
    if warnings:
        print(f"\n⚠️  WARNINGS ({len(warnings)}):")
        for w in warnings[:30]:
            print(f"  - {w}")
        if len(warnings) > 30:
            print(f"  ... and {len(warnings) - 30} more")
    
    if not errors:
        print(f"\n✅ VALIDATION PASSED")
    else:
        print(f"\n❌ VALIDATION FAILED ({len(errors)} errors)")
    
    # Deduplicate by simplified (keep first occurrence)
    seen = set()
    unique_items = []
    removed = []
    for item in all_items:
        s = item.get('simplified', '')
        if s not in seen:
            seen.add(s)
            unique_items.append(item)
        else:
            removed.append(s)
    
    if removed:
        print(f"\nDeduplicated: removed {len(removed)} duplicates: {removed}")
    
    # Re-number frequency_rank sequentially
    for i, item in enumerate(unique_items):
        item['frequency_rank'] = i + 1
    
    # Save merged file
    output_path = os.path.join(output_dir, 'vocabulary_hsk1_complete.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(unique_items, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Merged file saved: {output_path}")
    print(f"   Final count: {len(unique_items)} unique words")
    
    # Also save a summary
    summary = {
        "total_words": len(unique_items),
        "duplicates_removed": len(removed),
        "themes": dict(Counter(item.get('theme', 'UNKNOWN') for item in unique_items)),
        "word_types": dict(Counter(item.get('word_type', 'UNKNOWN') for item in unique_items)),
        "errors": len(errors),
        "warnings": len(warnings),
    }
    summary_path = os.path.join(output_dir, 'vocabulary_hsk1_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    return 0 if not errors else 1

if __name__ == '__main__':
    sys.exit(main())
