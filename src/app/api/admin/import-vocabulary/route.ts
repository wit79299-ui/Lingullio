import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/admin/import-vocabulary
// Body: { data: VocabItem[], mode: 'replace' | 'append' }
export async function POST(request: Request) {
  try {
    const { data, mode = 'replace' } = await request.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const results = { inserted: 0, translations: 0, errors: [] as string[] };

    // If replace mode, delete existing HSK1 vocab first
    if (mode === 'replace') {
      // Delete translations first (FK constraint)
      const { error: delTransErr } = await supabase
        .from('vocabulary_translations')
        .delete()
        .in(
          'vocabulary_id',
          data.map((_: unknown, i: number) => makeUUID(i + 1))
        );

      if (delTransErr) {
        // Try broader delete for HSK1
        await supabase.rpc('exec_sql', {
          sql: "DELETE FROM vocabulary_translations WHERE vocabulary_id IN (SELECT id FROM vocabulary_items WHERE level = 'HSK1')"
        }).then(() => {});
      }

      const { error: delItemErr } = await supabase
        .from('vocabulary_items')
        .delete()
        .eq('level', 'HSK1');

      if (delItemErr) {
        results.errors.push(`Delete existing: ${delItemErr.message}`);
      }
    }

    // Insert vocabulary_items in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const items = batch.map((item: VocabInput, batchIdx: number) => ({
        id: makeUUID(i + batchIdx + 1),
        simplified: item.simplified,
        traditional: item.traditional || null,
        pinyin: item.pinyin,
        level: item.level || 'HSK1',
        frequency_rank: item.frequency_rank || i + batchIdx + 1,
        word_type: item.word_type || null,
        theme: item.theme || null,
        status: 'published',
      }));

      const { error } = await supabase
        .from('vocabulary_items')
        .upsert(items, { onConflict: 'id' });

      if (error) {
        results.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        results.inserted += items.length;
      }
    }

    // Insert translations in batches
    const allTranslations: TranslationRow[] = [];
    data.forEach((item: VocabInput, idx: number) => {
      const vocabId = makeUUID(idx + 1);
      const translations = item.translations || {};

      for (const locale of ['fr', 'en'] as const) {
        const tr = translations[locale];
        if (!tr) continue;

        allTranslations.push({
          id: makeTransUUID(idx + 1, locale),
          vocabulary_id: vocabId,
          locale,
          meaning: tr.meaning || '',
          example_sentence: tr.example_sentence || null,
          example_pinyin: tr.example_pinyin || null,
          example_translation: tr.example_translation || null,
          usage_notes: tr.usage_notes || null,
        });
      }
    });

    for (let i = 0; i < allTranslations.length; i += BATCH_SIZE) {
      const batch = allTranslations.slice(i, i + BATCH_SIZE);

      const { error } = await supabase
        .from('vocabulary_translations')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        results.errors.push(`Trans batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        results.translations += batch.length;
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      summary: `${results.inserted} words, ${results.translations} translations (${results.errors.length} errors)`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// UUID generators (deterministic)
function makeUUID(index: number): string {
  return `d1${String(index).padStart(3, '0')}0000-0000-0000-0000-000000000000`;
}

function makeTransUUID(index: number, locale: string): string {
  const suffix = locale === 'fr' ? 'f' : 'e';
  return `d1${String(index).padStart(3, '0')}0000-0000-0000-0000-00000000000${suffix}`;
}

// Types
interface VocabTranslation {
  meaning: string;
  example_sentence?: string;
  example_pinyin?: string;
  example_translation?: string;
  usage_notes?: string;
}

interface VocabInput {
  simplified: string;
  traditional?: string;
  pinyin: string;
  level?: string;
  frequency_rank?: number;
  word_type?: string;
  theme?: string;
  translations?: {
    fr?: VocabTranslation;
    en?: VocabTranslation;
  };
}

interface TranslationRow {
  id: string;
  vocabulary_id: string;
  locale: string;
  meaning: string;
  example_sentence: string | null;
  example_pinyin: string | null;
  example_translation: string | null;
  usage_notes: string | null;
}
