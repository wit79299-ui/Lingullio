// ─── Knowledge Sync API ──────────────────────────────────────────────
// POST /api/sync/knowledge — Upsert knowledge items from client store
// GET  /api/sync/knowledge — Pull all knowledge items for the user
//
// Strategy: Last-write-wins at the item level.
// Client sends its full items map (or a batch of changed items).
// Server upserts each item using ON CONFLICT (user_id, item_id).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSyncUser } from '@/lib/sync/auth-helper';
import { createServiceRoleClient } from '@/lib/supabase/server';

// ─── POST: Push knowledge items to server ──────────────────────────

export async function POST(request: NextRequest) {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items, last_updated } = body as {
      items: Record<string, KnowledgeItemPayload>;
      last_updated: string | null;
    };

    if (!items || typeof items !== 'object') {
      return NextResponse.json({ error: 'Invalid payload: items required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const itemList = Object.values(items);

    if (itemList.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    // Build upsert rows
    const rows = itemList.map((item) => ({
      user_id: syncUser.user_id,
      item_id: item.item_id,
      item_type: item.item_type,
      level: item.level,
      display: item.display,
      pinyin: item.pinyin,
      meaning: item.meaning,
      audio_url: item.audio_url || null,
      theme: item.theme || null,
      srs_ease_factor: item.srs.ease_factor,
      srs_interval_days: item.srs.interval_days,
      srs_repetitions: item.srs.repetitions,
      srs_next_review_at: item.srs.next_review_at,
      srs_last_quality: item.srs.last_quality,
      mastery: item.mastery,
      times_seen: item.times_seen,
      times_correct: item.times_correct,
      times_incorrect: item.times_incorrect,
      last_seen_at: item.last_seen_at || null,
      first_seen_at: item.first_seen_at,
      last_correct_at: item.last_correct_at || null,
      last_incorrect_at: item.last_incorrect_at || null,
      source_lesson_ids: JSON.stringify(item.source_lesson_ids || []),
      source_exercise_ids: JSON.stringify(item.source_exercise_ids || []),
    }));

    // Batch upsert (Supabase supports bulk upsert with onConflict)
    // Process in chunks of 500 to avoid payload limits
    const CHUNK_SIZE = 500;
    let totalSynced = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabase
        .from('user_knowledge_items')
        .upsert(chunk, {
          onConflict: 'user_id,item_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('[sync/knowledge] Upsert error:', error);
        return NextResponse.json(
          { error: 'Database error', detail: error.message },
          { status: 500 }
        );
      }
      totalSynced += chunk.length;
    }

    return NextResponse.json({
      synced: totalSynced,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[sync/knowledge] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── GET: Pull knowledge items from server ─────────────────────────

export async function GET() {
  const syncUser = await getSyncUser();
  if (!syncUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('user_knowledge_items')
      .select('*')
      .eq('user_id', syncUser.user_id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[sync/knowledge] Fetch error:', error);
      return NextResponse.json(
        { error: 'Database error', detail: error.message },
        { status: 500 }
      );
    }

    // Transform DB rows back to client format (Record<string, KnowledgeItem>)
    const items: Record<string, unknown> = {};
    for (const row of (data || [])) {
      items[row.item_id] = {
        item_id: row.item_id,
        item_type: row.item_type,
        level: row.level,
        display: row.display,
        pinyin: row.pinyin,
        meaning: row.meaning,
        audio_url: row.audio_url,
        theme: row.theme,
        srs: {
          ease_factor: parseFloat(row.srs_ease_factor),
          interval_days: row.srs_interval_days,
          repetitions: row.srs_repetitions,
          next_review_at: row.srs_next_review_at,
          last_quality: row.srs_last_quality,
        },
        mastery: row.mastery,
        times_seen: row.times_seen,
        times_correct: row.times_correct,
        times_incorrect: row.times_incorrect,
        last_seen_at: row.last_seen_at,
        first_seen_at: row.first_seen_at,
        last_correct_at: row.last_correct_at,
        last_incorrect_at: row.last_incorrect_at,
        source_lesson_ids: typeof row.source_lesson_ids === 'string' 
          ? JSON.parse(row.source_lesson_ids) 
          : (row.source_lesson_ids || []),
        source_exercise_ids: typeof row.source_exercise_ids === 'string'
          ? JSON.parse(row.source_exercise_ids)
          : (row.source_exercise_ids || []),
      };
    }

    return NextResponse.json({
      items,
      last_updated: data && data.length > 0 ? data[0].updated_at : null,
      count: Object.keys(items).length,
    });
  } catch (err) {
    console.error('[sync/knowledge] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Types ─────────────────────────────────────────────────────────

interface KnowledgeItemPayload {
  item_id: string;
  item_type: 'vocabulary' | 'character' | 'grammar';
  level: string;
  display: string;
  pinyin: string;
  meaning: string;
  audio_url?: string | null;
  theme?: string | null;
  srs: {
    ease_factor: number;
    interval_days: number;
    repetitions: number;
    next_review_at: string;
    last_quality: number;
  };
  mastery: string;
  times_seen: number;
  times_correct: number;
  times_incorrect: number;
  last_seen_at: string | null;
  first_seen_at: string;
  last_correct_at: string | null;
  last_incorrect_at: string | null;
  source_lesson_ids: string[];
  source_exercise_ids: string[];
}
