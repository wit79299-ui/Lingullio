'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Shared audio player hook.
 *
 * Priority:
 * 1. If an `audioUrl` (Supabase Storage MP3) is provided → play via HTML5 Audio
 * 2. Otherwise → fallback to browser SpeechSynthesis (Chinese TTS)
 *
 * Handles the async voice-loading quirk of SpeechSynthesis:
 * voices are loaded lazily, so we pre-warm them on mount and
 * cache the best Chinese voice for immediate use.
 */
export function useAudioPlayer() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const zhVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesReadyRef = useRef(false);

  // Pre-warm SpeechSynthesis voices on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Prefer high-quality voices
      const preferred = [
        // iOS / macOS
        'Tingting', 'Ting-Ting', 'Meijia', 'Sinji',
        // Android / Chrome
        'Google 普通话', 'Google Mandarin', 'Chinese',
        // Edge
        'Xiaoxiao', 'Yunyang', 'Microsoft Xiaoxiao',
      ];

      let voice: SpeechSynthesisVoice | undefined;

      // Try preferred names first
      for (const name of preferred) {
        voice = voices.find(
          (v) => v.name.includes(name) && (v.lang.startsWith('zh') || v.lang.includes('CN'))
        );
        if (voice) break;
      }

      // Fallback: any Chinese voice
      if (!voice) {
        voice =
          voices.find((v) => v.lang === 'zh-CN') ??
          voices.find((v) => v.lang.startsWith('zh')) ??
          voices.find((v) => v.lang.includes('CN') || v.lang.includes('cmn'));
      }

      if (voice) {
        zhVoiceRef.current = voice;
        voicesReadyRef.current = true;
      }
    };

    // Try immediately (Chrome sometimes has them ready)
    pickVoice();

    // Listen for async loading (most browsers)
    window.speechSynthesis.onvoiceschanged = () => {
      pickVoice();
    };

    // Chrome bug workaround: calling getVoices() triggers the event
    window.speechSynthesis.getVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

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

      // ─── Strategy 1: HTML5 Audio with MP3 URL ────────────────────────────
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
          speakChinese(fallbackText, itemId);
        };

        audio.play().catch(() => {
          // play() rejected (e.g. autoplay policy) — try fallback
          audioRef.current = null;
          speakChinese(fallbackText, itemId);
        });
        return;
      }

      // ─── Strategy 2: SpeechSynthesis ─────────────────────────────────────
      speakChinese(fallbackText, itemId);
    },
    [playingId]
  );

  /**
   * Speak Chinese text using the Web Speech API.
   * Handles the voices-not-yet-loaded case by retrying once
   * after a short delay.
   */
  function speakChinese(text: string, itemId: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setPlayingId(null);
      return;
    }

    if (!text || text.trim().length === 0) {
      setPlayingId(null);
      return;
    }

    // Chrome bug: SpeechSynthesis gets "stuck" if we don't cancel first
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Use pre-cached Chinese voice if available
      if (zhVoiceRef.current) {
        utterance.voice = zhVoiceRef.current;
      } else {
        // One more attempt to find a voice
        const voices = window.speechSynthesis.getVoices();
        const zhVoice =
          voices.find((v) => v.lang === 'zh-CN') ??
          voices.find((v) => v.lang.startsWith('zh')) ??
          voices.find((v) => v.lang.includes('CN') || v.lang.includes('cmn'));
        if (zhVoice) {
          utterance.voice = zhVoice;
          zhVoiceRef.current = zhVoice;
        }
      }

      utterance.onend = () => setPlayingId(null);
      utterance.onerror = (e) => {
        // 'interrupted' and 'canceled' are not real errors
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[AudioPlayer] SpeechSynthesis error:', e.error);
        }
        setPlayingId(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    // If voices not loaded yet, wait briefly then try
    if (!voicesReadyRef.current) {
      setTimeout(doSpeak, 200);
    } else {
      // Small delay to ensure cancel() has completed
      setTimeout(doSpeak, 50);
    }

    // Safety timeout — never leave the button stuck in "playing"
    const safetyMs = Math.max(text.length * 500, 5000);
    setTimeout(() => setPlayingId((prev) => (prev === itemId ? null : prev)), safetyMs);
  }

  return { playingId, play, stop };
}
