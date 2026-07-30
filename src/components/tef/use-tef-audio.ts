'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * TEF-specific audio hook.
 *
 * 1. French TTS via SpeechSynthesis (for CO exercises — examiner reads)
 * 2. Speech Recognition via Web Speech API (for EO exercises — learner speaks)
 *
 * Same approach as HSK's useAudioPlayer but for French voices
 * and with added speech recognition capabilities.
 */

// ═══════════════════════════════════════════════════════════════════════════
// FRENCH TTS
// ═══════════════════════════════════════════════════════════════════════════

export function useFrenchTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const frVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const voicesReadyRef = useRef(false);

  // Pre-warm French voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Prefer high-quality French Canadian voices (TEF Canada context)
      const preferred = [
        // Canadian French
        'Amelie', 'Amélie', 'Google français canadien',
        // France French (fallback)
        'Thomas', 'Google français', 'Microsoft Paul',
        'Microsoft Julie', 'Microsoft Hortense',
        // Edge
        'Denise', 'Henri', 'Sylvie',
        // Generic
        'French',
      ];

      let voice: SpeechSynthesisVoice | undefined;

      // Try preferred names
      for (const name of preferred) {
        voice = voices.find(
          (v) => v.name.includes(name) && v.lang.startsWith('fr')
        );
        if (voice) break;
      }

      // Fallback: any French voice, prefer Canadian
      if (!voice) {
        voice =
          voices.find((v) => v.lang === 'fr-CA') ??
          voices.find((v) => v.lang === 'fr-FR') ??
          voices.find((v) => v.lang.startsWith('fr'));
      }

      if (voice) {
        frVoiceRef.current = voice;
        voicesReadyRef.current = true;
      }
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    window.speechSynthesis.getVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string, id: string, rate = 0.9) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop current
    window.speechSynthesis.cancel();

    // Toggle off if same
    if (speakingId === id) {
      setSpeakingId(null);
      setIsSpeaking(false);
      return;
    }

    setSpeakingId(id);
    setIsSpeaking(true);

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR'; // fr-CA often not available, fr-FR works
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      if (frVoiceRef.current) {
        utterance.voice = frVoiceRef.current;
      } else {
        // Last resort attempt
        const voices = window.speechSynthesis.getVoices();
        const frVoice =
          voices.find((v) => v.lang === 'fr-CA') ??
          voices.find((v) => v.lang === 'fr-FR') ??
          voices.find((v) => v.lang.startsWith('fr'));
        if (frVoice) {
          utterance.voice = frVoice;
          frVoiceRef.current = frVoice;
        }
      }

      utterance.onend = () => {
        setSpeakingId(null);
        setIsSpeaking(false);
      };
      utterance.onerror = (e) => {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('[TEF TTS] SpeechSynthesis error:', e.error);
        }
        setSpeakingId(null);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    };

    if (!voicesReadyRef.current) {
      setTimeout(doSpeak, 200);
    } else {
      setTimeout(doSpeak, 50);
    }

    // Safety timeout
    const safetyMs = Math.max(text.length * 120, 8000);
    setTimeout(() => {
      setSpeakingId((prev) => (prev === id ? null : prev));
      setIsSpeaking((prev) => (speakingId === id ? false : prev));
    }, safetyMs);
  }, [speakingId]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speakingId, speak, stop, hasVoice: voicesReadyRef.current };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEECH RECOGNITION (for EO — learner speaks French)
// ═══════════════════════════════════════════════════════════════════════════

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// Web Speech API types (not in standard TS lib)
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    // Stop any existing
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
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
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
          setConfidence(result[0].confidence);
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) setTranscript(finalText);
      setInterimTranscript(interimText);
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
      (recognitionRef.current as { stop: () => void }).stop();
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEXT ANALYSIS (for EE auto-scoring — no API needed)
// ═══════════════════════════════════════════════════════════════════════════

export interface TextAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
  connectorsUsed: string[];
  connectorsLevel: 'basic' | 'intermediate' | 'advanced';
  hasStructure: boolean;         // paragraphs or clear organization
  repetitionScore: number;       // 0 = many repetitions, 100 = all unique
  estimatedNCLC: number;
  criteriaScores: {
    taskCompletion: number;      // /20 - length & relevance
    organization: number;        // /20 - connectors & structure
    lexicalRichness: number;     // /20 - vocabulary variety
    grammar: number;             // /20 - approximated
    fifthCriterion: number;      // /20 - narrative or argumentative quality
  };
}

// French connectors by level
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

  // Connector detection
  const textLower = cleanText.toLowerCase();
  const foundConnectors: string[] = [];
  let connectorLevel: 'basic' | 'intermediate' | 'advanced' = 'basic';

  for (const c of CONNECTORS.advanced) {
    if (textLower.includes(c)) {
      foundConnectors.push(c);
      connectorLevel = 'advanced';
    }
  }
  for (const c of CONNECTORS.intermediate) {
    if (textLower.includes(c)) {
      foundConnectors.push(c);
      if (connectorLevel !== 'advanced') connectorLevel = 'intermediate';
    }
  }
  for (const c of CONNECTORS.basic) {
    if (textLower.includes(c)) {
      foundConnectors.push(c);
    }
  }

  // Structure check (paragraphs)
  const hasStructure = cleanText.includes('\n\n') || cleanText.split('\n').length >= 3;

  // Repetition score (unique words ratio)
  const wordsLower = words.map(w => w.toLowerCase().replace(/[^a-zà-ÿ]/g, ''));
  const uniqueWords = new Set(wordsLower.filter(w => w.length > 3)); // only count meaningful words
  const meaningfulWords = wordsLower.filter(w => w.length > 3);
  const repetitionScore = meaningfulWords.length > 0
    ? Math.round((uniqueWords.size / meaningfulWords.length) * 100)
    : 0;

  // ── Criteria scoring (each /20) ──

  // 1. Task completion: length adherence
  let taskCompletion = 0;
  if (wordCount >= minWords) {
    taskCompletion = 12;
    if (wordCount <= maxWords) taskCompletion = 16;
    if (wordCount >= minWords * 1.2 && wordCount <= maxWords) taskCompletion = 20;
  } else {
    taskCompletion = Math.round((wordCount / minWords) * 10);
  }

  // 2. Organization: connectors & structure
  let organization = 4;
  organization += Math.min(foundConnectors.length * 2, 8);
  if (connectorLevel === 'intermediate') organization += 4;
  if (connectorLevel === 'advanced') organization += 8;
  if (hasStructure) organization += 2;
  organization = Math.min(organization, 20);

  // 3. Lexical richness: unique words ratio
  let lexicalRichness = Math.round(repetitionScore * 0.2);
  if (uniqueWords.size > 30) lexicalRichness = Math.min(lexicalRichness + 4, 20);
  if (uniqueWords.size > 50) lexicalRichness = Math.min(lexicalRichness + 4, 20);

  // 4. Grammar: approximate by sentence length consistency & basic patterns
  let grammar = 10; // base score
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25) grammar += 4;
  if (sentenceCount >= 3) grammar += 3;
  if (connectorLevel !== 'basic') grammar += 3;
  grammar = Math.min(grammar, 20);

  // 5. Fifth criterion (narrative/argumentative)
  let fifthCriterion = 4;
  if (foundConnectors.length >= 3) fifthCriterion += 4;
  if (connectorLevel === 'advanced') fifthCriterion += 6;
  if (hasStructure && wordCount >= minWords) fifthCriterion += 4;
  if (sentenceCount >= 5) fifthCriterion += 2;
  fifthCriterion = Math.min(fifthCriterion, 20);

  const totalScore = taskCompletion + organization + lexicalRichness + grammar + fifthCriterion;
  const percentage = Math.round((totalScore / 100) * 100);

  // Estimate NCLC from total
  let estimatedNCLC: number;
  if (percentage >= 85) estimatedNCLC = 9;
  else if (percentage >= 70) estimatedNCLC = 8;
  else if (percentage >= 60) estimatedNCLC = 7;
  else if (percentage >= 45) estimatedNCLC = 6;
  else if (percentage >= 30) estimatedNCLC = 5;
  else estimatedNCLC = 4;

  return {
    wordCount, sentenceCount, avgWordsPerSentence,
    connectorsUsed: foundConnectors,
    connectorsLevel: connectorLevel,
    hasStructure, repetitionScore,
    estimatedNCLC,
    criteriaScores: { taskCompletion, organization, lexicalRichness, grammar, fifthCriterion },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// SPEECH ANALYSIS (for EO auto-scoring — no API needed)
// ═══════════════════════════════════════════════════════════════════════════

export interface SpeechAnalysis {
  wordCount: number;
  duration: number;          // estimated seconds
  wordsPerMinute: number;
  confidence: number;        // from recognition API
  connectorsUsed: string[];
  fluencyScore: number;      // /20
  contentScore: number;      // /20
  interactionScore: number;  // /20
  estimatedNCLC: number;
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

  // Fluency: based on WPM and confidence
  let fluencyScore = 4;
  if (wordsPerMinute >= 60) fluencyScore += 4;
  if (wordsPerMinute >= 90) fluencyScore += 4;
  if (wordsPerMinute >= 120) fluencyScore += 4;
  if (confidence >= 0.7) fluencyScore += 2;
  if (confidence >= 0.85) fluencyScore += 2;
  fluencyScore = Math.min(fluencyScore, 20);

  // Content: word count and connectors
  let contentScore = 4;
  if (wordCount >= 20) contentScore += 4;
  if (wordCount >= 40) contentScore += 4;
  if (foundConnectors.length >= 2) contentScore += 4;
  if (foundConnectors.length >= 4) contentScore += 4;
  contentScore = Math.min(contentScore, 20);

  // Interaction: presence of questions, rebuttals, reformulations
  let interactionScore = 4;
  if (transcript.includes('?')) interactionScore += 4;
  if (textLower.includes('c\'est-à-dire') || textLower.includes('autrement dit') || textLower.includes('je veux dire')) interactionScore += 4;
  if (textLower.includes('mais') || textLower.includes('cependant') || textLower.includes('par contre')) interactionScore += 4;
  if (wordCount >= 30) interactionScore += 4;
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
    fluencyScore, contentScore, interactionScore,
    estimatedNCLC,
  };
}
