#!/usr/bin/env python3
"""
Generate SQL INSERT statements for HSK1 vocabulary data.
Reads the merged vocabulary JSON and produces:
1. vocabulary_items INSERTs (with deterministic UUIDs)
2. vocabulary_translations INSERTs (FR + EN)

UUID scheme: deterministic based on content to allow re-runs without duplicates.
- vocabulary_items: d1{nnn}000-0000-0000-0000-000000000000  (nnn = 001-299)
- vocabulary_translations FR: d1{nnn}000-0000-0000-0000-00000000000f
- vocabulary_translations EN: d1{nnn}000-0000-0000-0000-00000000000e
"""

import json
import os

def escape_sql(s):
    """Escape single quotes for SQL."""
    if s is None:
        return None
    return s.replace("'", "''")

def sql_val(v):
    """Format a value for SQL."""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return f"'{escape_sql(str(v))}'"

def make_vocab_uuid(index):
    """Generate a deterministic UUID for vocabulary item."""
    return f"d1{index:03d}0000-0000-0000-0000-000000000000"

def make_vocab_trans_uuid(index, locale):
    """Generate a deterministic UUID for vocabulary translation."""
    suffix = "f" if locale == "fr" else "e"
    return f"d1{index:03d}0000-0000-0000-0000-00000000000{suffix}"

def main():
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'hsk1')
    input_path = os.path.join(data_dir, 'vocabulary_hsk1_complete.json')
    
    with open(input_path, 'r', encoding='utf-8') as f:
        vocab = json.load(f)
    
    print(f"Loaded {len(vocab)} vocabulary items")
    
    lines = []
    lines.append("-- ============================================================")
    lines.append("-- HSK 1 VOCABULARY - Complete (299 words)")
    lines.append("-- Generated from official HSK 3.0 (2025 final) word list")
    lines.append("-- ============================================================")
    lines.append("")
    
    # Delete existing HSK1 vocab data first (for clean re-import)
    lines.append("-- Clean existing HSK1 vocabulary data")
    lines.append("DELETE FROM public.vocabulary_translations WHERE vocabulary_id IN (SELECT id FROM public.vocabulary_items WHERE hsk_level = 'HSK1');")
    lines.append("DELETE FROM public.vocabulary_items WHERE hsk_level = 'HSK1';")
    lines.append("")
    
    # vocabulary_items INSERT
    lines.append("-- vocabulary_items")
    lines.append("INSERT INTO public.vocabulary_items (id, simplified, traditional, pinyin, hsk_level, frequency_rank, word_type, theme, status) VALUES")
    
    item_values = []
    for i, item in enumerate(vocab):
        idx = i + 1
        uuid = make_vocab_uuid(idx)
        simplified = sql_val(item['simplified'])
        traditional = sql_val(item.get('traditional'))
        pinyin = sql_val(item['pinyin'])
        hsk = sql_val(item['hsk_level'])
        freq = item.get('frequency_rank', idx)
        wt = sql_val(item.get('word_type'))
        theme = sql_val(item.get('theme'))
        
        item_values.append(
            f"  ('{uuid}', {simplified}, {traditional}, {pinyin}, {hsk}, {freq}, {wt}, {theme}, 'published')"
        )
    
    lines.append(",\n".join(item_values) + ";")
    lines.append("")
    
    # vocabulary_translations INSERT (FR + EN)
    lines.append("-- vocabulary_translations (FR + EN)")
    lines.append("INSERT INTO public.vocabulary_translations (id, vocabulary_id, locale, meaning, example_sentence, example_pinyin, example_translation, usage_notes) VALUES")
    
    trans_values = []
    for i, item in enumerate(vocab):
        idx = i + 1
        vocab_uuid = make_vocab_uuid(idx)
        
        for locale in ['fr', 'en']:
            tr = item.get('translations', {}).get(locale, {})
            if not tr:
                continue
            
            trans_uuid = make_vocab_trans_uuid(idx, locale)
            meaning = sql_val(tr.get('meaning'))
            example = sql_val(tr.get('example_sentence'))
            ex_pinyin = sql_val(tr.get('example_pinyin'))
            ex_trans = sql_val(tr.get('example_translation'))
            usage = sql_val(tr.get('usage_notes'))
            
            trans_values.append(
                f"  ('{trans_uuid}', '{vocab_uuid}', '{locale}', {meaning}, {example}, {ex_pinyin}, {ex_trans}, {usage})"
            )
    
    lines.append(",\n".join(trans_values) + ";")
    
    # Write SQL file
    output_path = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'seed_hsk1_vocabulary.sql')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    
    print(f"✅ SQL file generated: {output_path}")
    print(f"   {len(vocab)} vocabulary_items")
    print(f"   {len(trans_values)} vocabulary_translations")
    
    # Also output stats
    total_chars = sum(len(line) for line in lines)
    print(f"   File size: ~{total_chars // 1024} KB")

if __name__ == '__main__':
    main()
