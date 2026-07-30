'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * TEF-specific audio & evaluation hooks.
 *
 * 1. French TTS via OpenAI API (primary) with SpeechSynthesis fallback
 *    Supports France and Quebec accents
 * 2. Speech Recognition via Web Speech API (for EO exercises)
 * 3. Text analysis (local, fast) + AI evaluation (server-side, thorough)
 * 4. Speech analysis (local, fast) + AI evaluation (server-side, thorough)
 */

// ═══════════════════════════════════════════════════════════════════════════
// FRENCH TTS (OpenAI API primary, SpeechSynthesis fallback)
// ═══════════════════════════════════════════════════════════════════════════

type Accent = 'france' | 'quebec';

export function useFrenchTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [activeAccent, setActiveAccent] = useState<Accent>('france');
  const speakingIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Audio cache to avoid re-fetching the same text
  const cacheRef = useRef<Map<string, string>>(new Map());

  // Keep ref in sync with state
  useEffect(() => { speakingIdRef.current = speakingId; }, [speakingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
      // Revoke cached blob URLs
      cacheRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Also cancel any SpeechSynthesis fallback
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speakingIdRef.current = null; // sync ref immediately
    setSpeakingId(null);
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, id: string, rate = 1.0, accent: Accent = 'france') => {
    // Toggle off if same id is already playing
    const wasPlaying = speakingIdRef.current === id;
    
    // Stop whatever is playing
    stop();
    
    if (wasPlaying) return;

    if (!text || text.trim().length === 0) return;

    // For very short texts (single words), pad with context for better TTS output.
    // OpenAI TTS struggles with isolated short words — they get clipped.
    // We wrap them in a carrier phrase then... actually, just ensure speed isn't too slow
    // for short texts (below 0.7 causes truncation on words < 4 syllables)
    const wordCount = text.trim().split(/\s+/).length;
    const minSpeed = wordCount <= 3 ? 0.7 : 0.5;
    const safeRate = Math.max(minSpeed, rate);

    setSpeakingId(id);
    speakingIdRef.current = id; // sync immediately, don't wait for useEffect
    setIsSpeaking(true);
    setActiveAccent(accent);

    const cacheKey = `${accent}:${safeRate}:${text.slice(0, 200)}`;

    try {
      let blobUrl = cacheRef.current.get(cacheKey);

      if (!blobUrl) {
        // Fetch from OpenAI TTS API
        const controller = new AbortController();
        abortRef.current = controller;

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, accent, speed: safeRate }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }

        const blob = await response.blob();
        
        // Only cache if blob has meaningful size (> 1KB)
        // Prevents caching corrupted/empty responses from aborted fetches
        if (blob.size < 1000) {
          console.warn(`[TTS] Response too small (${blob.size}B), skipping cache`);
        }
        
        blobUrl = URL.createObjectURL(blob);
        if (blob.size >= 1000) {
          cacheRef.current.set(cacheKey, blobUrl);
        }
        abortRef.current = null;
      }

      // Check if we were stopped while fetching
      if (speakingIdRef.current !== id) return;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setSpeakingId(null);
        speakingIdRef.current = null;
        setIsSpeaking(false);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.warn('[TTS] Audio playback error, falling back to SpeechSynthesis');
        // Remove from cache if playback failed
        cacheRef.current.delete(cacheKey);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        audioRef.current = null;
        speakFallback(text, id, rate);
      };

      await audio.play();
    } catch (err) {
      // If fetch was aborted (user stopped), don't fallback
      if (err instanceof DOMException && err.name === 'AbortError') {
        setSpeakingId(null);
        setIsSpeaking(false);
        return;
      }
      console.warn('[TTS] API unavailable, falling back to SpeechSynthesis:', err);
      speakFallback(text, id, rate);
    }
  }, [stop]);

  // SpeechSynthesis fallback (when API is unavailable)
  function speakFallback(text: string, id: string, rate: number) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setSpeakingId(null);
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a French voice
      const voices = window.speechSynthesis.getVoices();
      const frVoice =
        voices.find((v) => v.lang === 'fr-CA') ??
        voices.find((v) => v.lang === 'fr-FR') ??
        voices.find((v) => v.lang.startsWith('fr'));
      if (frVoice) utterance.voice = frVoice;

      utterance.onend = () => {
        setSpeakingId(null);
        setIsSpeaking(false);
      };
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[TTS Fallback] SpeechSynthesis error:', e.error);
        }
        setSpeakingId(null);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);

      // Chrome bug workaround: resume periodically
      const resumeInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
        } else {
          clearInterval(resumeInterval);
        }
      }, 5000);
    };

    setTimeout(doSpeak, 100);

    // Safety timeout
    const safetyMs = Math.max(text.length * 150, 10000);
    setTimeout(() => {
      setSpeakingId((prev) => (prev === id ? null : prev));
      setIsSpeaking(false);
    }, safetyMs);
  }

  return { isSpeaking, speakingId, activeAccent, speak, stop };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEECH RECOGNITION (for EO : learner speaks French)
// ═══════════════════════════════════════════════════════════════════════════

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const finalPartsRef = useRef<string[]>([]);
  const confidenceAccRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SR) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur');
      return;
    }

    if (recognitionRef.current) {
      try { (recognitionRef.current as { stop: () => void }).stop(); } catch { /* ignore */ }
    }

    finalPartsRef.current = [];
    confidenceAccRef.current = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SR as any)();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
      setInterimTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const segmentText = result[0].transcript.trim();
          if (segmentText) {
            finalPartsRef.current.push(segmentText);
            confidenceAccRef.current.push(result[0].confidence);
          }
        } else {
          interimText += result[0].transcript;
        }
      }

      const fullFinal = finalPartsRef.current.join(' ');
      setTranscript(fullFinal);
      setInterimTranscript(interimText);

      if (confidenceAccRef.current.length > 0) {
        const avgConf = confidenceAccRef.current.reduce((a, b) => a + b, 0) / confidenceAccRef.current.length;
        setConfidence(avgConf);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { (recognitionRef.current as { stop: () => void }).stop(); } catch { /* ignore */ }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    finalPartsRef.current = [];
    confidenceAccRef.current = [];
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isListening, transcript, interimTranscript, confidence,
    error, isSupported, startListening, stopListening, resetTranscript,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// AI EVALUATION HOOKS (server-side GPT-4o-mini)
// ═══════════════════════════════════════════════════════════════════════════

export interface AIWritingEvaluation {
  scores: {
    respectTache: { score: number; max: number; feedback: string };
    organisation: { score: number; max: number; feedback: string };
    richesseLexicale: { score: number; max: number; feedback: string };
    grammaire: { score: number; max: number; feedback: string };
    cinquiemeCritere: { score: number; max: number; feedback: string };
  };
  totalScore: number;
  maxScore: number;
  estimatedNCLC: number;
  globalFeedback: string;
  strengths: string[];
  improvements: string[];
  correctedExcerpts: { original: string; corrected: string; explanation: string }[];
}

export interface AISpeakingEvaluation {
  scores: {
    fluidite: { score: number; max: number; feedback: string };
    richesseLexicale: { score: number; max: number; feedback: string };
    interaction: { score: number; max: number; feedback: string };
    connecteurs: { score: number; max: number; feedback: string };
    registre: { score: number; max: number; feedback: string };
  };
  totalScore: number;
  maxScore: number;
  estimatedNCLC: number;
  globalFeedback: string;
  strengths: string[];
  improvements: string[];
  suggestedRephrasing: { original: string; improved: string; why: string }[];
}

export function useAIEvaluation() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [writingEval, setWritingEval] = useState<AIWritingEvaluation | null>(null);
  const [speakingEval, setSpeakingEval] = useState<AISpeakingEvaluation | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  const evaluateWriting = useCallback(async (
    text: string,
    sujet: string,
    section: 'A' | 'B',
    minWords: number,
    maxWords: number,
  ) => {
    setIsEvaluating(true);
    setEvalError(null);
    setWritingEval(null);

    try {
      const res = await fetch('/api/evaluate/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sujet, section, minWords, maxWords }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(err.error || `Erreur ${res.status}`);
      }

      const evaluation: AIWritingEvaluation = await res.json();
      setWritingEval(evaluation);
      return evaluation;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'évaluation';
      setEvalError(msg);
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  const evaluateSpeaking = useCallback(async (
    transcript: string,
    scenario: string,
    durationSeconds: number,
    variant?: { type: string; examinerLine: string; expectedSkill: string },
  ) => {
    setIsEvaluating(true);
    setEvalError(null);
    setSpeakingEval(null);

    try {
      const res = await fetch('/api/evaluate/speaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, scenario, durationSeconds, variant }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(err.error || `Erreur ${res.status}`);
      }

      const evaluation: AISpeakingEvaluation = await res.json();
      setSpeakingEval(evaluation);
      return evaluation;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur d\'évaluation';
      setEvalError(msg);
      return null;
    } finally {
      setIsEvaluating(false);
    }
  }, []);

  const resetEvaluation = useCallback(() => {
    setWritingEval(null);
    setSpeakingEval(null);
    setEvalError(null);
  }, []);

  return {
    isEvaluating, writingEval, speakingEval, evalError,
    evaluateWriting, evaluateSpeaking, resetEvaluation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT ANALYSIS (local, fast, for EE instant feedback)
// ═══════════════════════════════════════════════════════════════════════════

export interface TextAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  connectorsUsed: string[];
  connectorsLevel: 'basic' | 'intermediate' | 'advanced';
  hasStructure: boolean;
  repetitionScore: number;
  estimatedNCLC: number;
  criteriaScores: {
    taskCompletion: number;
    organization: number;
    lexicalRichness: number;
    grammar: number;
    fifthCriterion: number;
  };
}

const CONNECTORS = {
  basic: ['et', 'mais', 'donc', 'car', 'parce que', 'aussi', 'puis', 'alors', 'ensuite', 'enfin'],
  intermediate: ['cependant', 'néanmoins', 'toutefois', 'par ailleurs', 'en revanche', 'de plus', 'en effet', 'ainsi', 'par conséquent', 'en outre', 'd\'une part', 'd\'autre part', 'bien que', 'malgré'],
  advanced: ['il n\'en demeure pas moins que', 'il serait réducteur de', 'on ne saurait', 'il convient de', 'force est de constater', 'quoique', 'nonobstant', 'en dépit de', 'dès lors', 'dans la mesure où', 'à condition que', 'sous réserve de'],
};

export function analyzeText(text: string, minWords: number, maxWords: number): TextAnalysis {
  const cleanText = text.trim();
  if (!cleanText) {
    return {
      wordCount: 0, sentenceCount: 0, avgWordsPerSentence: 0,
      connectorsUsed: [], connectorsLevel: 'basic', hasStructure: false,
      repetitionScore: 0, estimatedNCLC: 3,
      criteriaScores: { taskCompletion: 0, organization: 0, lexicalRichness: 0, grammar: 0, fifthCriterion: 0 },
    };
  }

  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

  const textLower = cleanText.toLowerCase();
  const foundConnectors: string[] = [];
  let connectorLevel: 'basic' | 'intermediate' | 'advanced' = 'basic';

  for (const c of CONNECTORS.advanced) {
    if (textLower.includes(c)) { foundConnectors.push(c); connectorLevel = 'advanced'; }
  }
  for (const c of CONNECTORS.intermediate) {
    if (textLower.includes(c)) { foundConnectors.push(c); if (connectorLevel !== 'advanced') connectorLevel = 'intermediate'; }
  }
  for (const c of CONNECTORS.basic) {
    if (textLower.includes(c)) foundConnectors.push(c);
  }

  const hasStructure = cleanText.includes('\n\n') || cleanText.split('\n').length >= 3;

  const wordsLower = words.map(w => w.toLowerCase().replace(/[^a-zà-ÿ]/g, ''));
  const uniqueWords = new Set(wordsLower.filter(w => w.length > 3));
  const meaningfulWords = wordsLower.filter(w => w.length > 3);
  const repetitionScore = meaningfulWords.length > 0
    ? Math.round((uniqueWords.size / meaningfulWords.length) * 100)
    : 0;

  let taskCompletion = 0;
  if (wordCount >= minWords) {
    taskCompletion = 12;
    if (wordCount <= maxWords) taskCompletion = 16;
    if (wordCount >= minWords * 1.2 && wordCount <= maxWords) taskCompletion = 20;
  } else {
    taskCompletion = Math.round((wordCount / minWords) * 10);
  }

  let organization = 4;
  organization += Math.min(foundConnectors.length * 2, 8);
  if (connectorLevel === 'intermediate') organization += 4;
  if (connectorLevel === 'advanced') organization += 8;
  if (hasStructure) organization += 2;
  organization = Math.min(organization, 20);

  let lexicalRichness = Math.round(repetitionScore * 0.2);
  if (uniqueWords.size > 30) lexicalRichness = Math.min(lexicalRichness + 4, 20);
  if (uniqueWords.size > 50) lexicalRichness = Math.min(lexicalRichness + 4, 20);

  let grammar = 10;
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25) grammar += 4;
  if (sentenceCount >= 3) grammar += 3;
  if (connectorLevel !== 'basic') grammar += 3;
  grammar = Math.min(grammar, 20);

  let fifthCriterion = 4;
  if (foundConnectors.length >= 3) fifthCriterion += 4;
  if (connectorLevel === 'advanced') fifthCriterion += 6;
  if (hasStructure && wordCount >= minWords) fifthCriterion += 4;
  if (sentenceCount >= 5) fifthCriterion += 2;
  fifthCriterion = Math.min(fifthCriterion, 20);

  const totalScore = taskCompletion + organization + lexicalRichness + grammar + fifthCriterion;
  const percentage = Math.round((totalScore / 100) * 100);

  let estimatedNCLC: number;
  if (percentage >= 85) estimatedNCLC = 9;
  else if (percentage >= 70) estimatedNCLC = 8;
  else if (percentage >= 60) estimatedNCLC = 7;
  else if (percentage >= 45) estimatedNCLC = 6;
  else if (percentage >= 30) estimatedNCLC = 5;
  else estimatedNCLC = 4;

  return {
    wordCount, sentenceCount, avgWordsPerSentence,
    connectorsUsed: foundConnectors, connectorsLevel: connectorLevel,
    hasStructure, repetitionScore, estimatedNCLC,
    criteriaScores: { taskCompletion, organization, lexicalRichness, grammar, fifthCriterion },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEECH ANALYSIS (local, fast, for EO instant feedback)
// ═══════════════════════════════════════════════════════════════════════════

export interface SpeechAnalysis {
  wordCount: number;
  duration: number;
  wordsPerMinute: number;
  confidence: number;
  connectorsUsed: string[];
  fluencyScore: number;
  contentScore: number;
  interactionScore: number;
  estimatedNCLC: number;
}

function computeRepetitionPenalty(text: string): { uniqueRatio: number; repeatedWords: string[] } {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return { uniqueRatio: 0, repeatedWords: [] };

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);

  const uniqueRatio = counts.size / words.length;
  const repeatedWords: string[] = [];
  counts.forEach((count, word) => { if (count >= 3) repeatedWords.push(word); });

  return { uniqueRatio, repeatedWords };
}

export function analyzeSpeech(transcript: string, confidence: number, durationSeconds: number): SpeechAnalysis {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const wordsPerMinute = durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;

  const textLower = transcript.toLowerCase();
  const foundConnectors: string[] = [];
  for (const list of [CONNECTORS.advanced, CONNECTORS.intermediate, CONNECTORS.basic]) {
    for (const c of list) {
      if (textLower.includes(c)) foundConnectors.push(c);
    }
  }

  const { uniqueRatio } = computeRepetitionPenalty(transcript);
  const repetitionPenalty = uniqueRatio < 0.3 ? 0.3 : uniqueRatio < 0.5 ? 0.6 : uniqueRatio < 0.7 ? 0.85 : 1.0;

  let fluencyScore = 4;
  const effectiveWPM = wordsPerMinute > 180 && uniqueRatio < 0.5 ? 60 : wordsPerMinute;
  if (effectiveWPM >= 60 && effectiveWPM <= 180) fluencyScore += 4;
  if (effectiveWPM >= 90 && effectiveWPM <= 160) fluencyScore += 4;
  if (effectiveWPM >= 110 && effectiveWPM <= 150) fluencyScore += 4;
  if (confidence >= 0.7) fluencyScore += 2;
  if (confidence >= 0.85) fluencyScore += 2;
  fluencyScore = Math.round(fluencyScore * repetitionPenalty);
  fluencyScore = Math.max(2, Math.min(fluencyScore, 20));

  const uniqueWordCount = new Set(words.map(w => w.toLowerCase())).size;
  let contentScore = 4;
  if (uniqueWordCount >= 15) contentScore += 4;
  if (uniqueWordCount >= 30) contentScore += 4;
  if (foundConnectors.length >= 2) contentScore += 4;
  if (foundConnectors.length >= 4) contentScore += 4;
  contentScore = Math.min(contentScore, 20);

  let interactionScore = 4;
  if (transcript.includes('?')) interactionScore += 4;
  if (textLower.includes('c\'est-à-dire') || textLower.includes('autrement dit') || textLower.includes('je veux dire')) interactionScore += 4;
  if (textLower.includes('mais') || textLower.includes('cependant') || textLower.includes('par contre')) interactionScore += 4;
  if (uniqueWordCount >= 20) interactionScore += 4;
  interactionScore = Math.min(interactionScore, 20);

  const totalScore = fluencyScore + contentScore + interactionScore;
  const percentage = Math.round((totalScore / 60) * 100);

  let estimatedNCLC: number;
  if (percentage >= 85) estimatedNCLC = 9;
  else if (percentage >= 70) estimatedNCLC = 8;
  else if (percentage >= 55) estimatedNCLC = 7;
  else if (percentage >= 40) estimatedNCLC = 6;
  else if (percentage >= 25) estimatedNCLC = 5;
  else estimatedNCLC = 4;

  return {
    wordCount, duration: durationSeconds, wordsPerMinute, confidence,
    connectorsUsed: foundConnectors,
    fluencyScore, contentScore, interactionScore, estimatedNCLC,
  };
}
