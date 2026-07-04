'use client';

import { useEffect, useRef } from 'react';
import { registerLessonVocabulary } from '@/lib/gamification/knowledge-tracker';

/**
 * Client component that auto-registers vocabulary items from a lesson
 * in the Knowledge Map when the user visits the lesson page.
 * This is invisible — renders nothing in the DOM.
 */
export function LessonVocabularyRegister({
  lessonId,
  hskLevel,
  vocabularyItems,
}: {
  lessonId: string;
  hskLevel: string;
  vocabularyItems: Array<{
    id: string;
    type: 'vocabulary' | 'character' | 'grammar';
    display: string;
    pinyin: string;
    meaning: string;
    audio_url?: string | null;
    theme?: string | null;
  }>;
}) {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current || vocabularyItems.length === 0) return;
    registered.current = true;

    registerLessonVocabulary(
      lessonId,
      vocabularyItems.map((v) => ({
        id: v.id,
        type: v.type,
        level: hskLevel,
        display: v.display,
        pinyin: v.pinyin,
        meaning: v.meaning,
        audio_url: v.audio_url,
        theme: v.theme,
      })),
    );
  }, [lessonId, hskLevel, vocabularyItems]);

  return null;
}
