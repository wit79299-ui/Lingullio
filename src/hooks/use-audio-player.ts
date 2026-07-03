'use client';

import { useState, useCallback, useRef } from 'react';

/**
 * Shared audio player hook.
 * 
 * Priority:
 * 1. If an `audioUrl` (Supabase Storage MP3) is provided → play via HTML5 Audio
 * 2. Otherwise → fallback to browser SpeechSynthesis (if a Chinese voice is available)
 */
export function useAudioPlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingId(null);
  }, []);

  const play = useCallback(
    (itemId: string, audioUrl: string | null | undefined, fallbackText: string) => {
      // Stop whatever is currently playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      // If same item is playing, just stop (toggle off)
      if (playingId === itemId) {
        setPlayingId(null);
        return;
      }

      setPlayingId(itemId);

      // ─── Strategy 1: HTML5 Audio with Supabase Storage URL ────────────────
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setPlayingId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          // If the MP3 fails, try SpeechSynthesis fallback
          audioRef.current = null;
          speakFallback(fallbackText, itemId);
        };

        audio.play().catch(() => {
          // play() rejected (e.g. autoplay policy) — try fallback
          audioRef.current = null;
          speakFallback(fallbackText, itemId);
        });
        return;
      }

      // ─── Strategy 2: SpeechSynthesis fallback ─────────────────────────────
      speakFallback(fallbackText, itemId);
    },
    [playingId]
  );

  function speakFallback(text: string, itemId: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setPlayingId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.85;

    const voices = window.speechSynthesis.getVoices();
    const zhVoice =
      voices.find((v) => v.lang === 'zh-CN') ??
      voices.find((v) => v.lang.startsWith('zh')) ??
      voices.find((v) => v.lang.includes('CN') || v.lang.includes('cmn'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);

    // Safety timeout — never leave the button stuck in "playing"
    setTimeout(() => setPlayingId((prev) => (prev === itemId ? null : prev)), 8000);
  }

  return { playingId, play, stop };
}
