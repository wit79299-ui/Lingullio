'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

export type PadMode = 'learn' | 'quiz' | 'free';

export interface StrokeResult {
  strokeNum: number;
  mistakesOnStroke: number;
  totalMistakes: number;
  strokesRemaining: number;
  isComplete: boolean;
}

export interface QuizResult {
  character: string;
  totalMistakes: number;
  strokeCount: number;
  /** 0–100 score: 100 minus penalty per mistake, floored at 0 */
  score: number;
}

interface HanziWriterPadProps {
  character: string;
  mode: PadMode;
  size?: number;
  /** Show light outline of character as guide (learn + quiz modes) */
  showOutline?: boolean;
  /** Stroke color */
  strokeColor?: string;
  /** Delay between strokes in animation (ms) */
  strokeAnimationSpeed?: number;
  /** Called when a single stroke completes in quiz mode */
  onStrokeComplete?: (result: StrokeResult) => void;
  /** Called when the entire character is done in quiz mode */
  onQuizComplete?: (result: QuizResult) => void;
  /** Called when animation finishes in learn mode */
  onAnimationComplete?: () => void;
}

export function HanziWriterPad({
  character,
  mode,
  size = 300,
  showOutline = true,
  strokeColor = '#1e293b',
  strokeAnimationSpeed = 600,
  onStrokeComplete,
  onQuizComplete,
  onAnimationComplete,
}: HanziWriterPadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const [currentStroke, setCurrentStroke] = useState(0);

  // Track mistakes with a ref to avoid stale closure issues
  const mistakesRef = useRef(0);

  const initWriter = useCallback(() => {
    if (!containerRef.current) return;

    // Clean up existing
    if (writerRef.current) {
      // HanziWriter doesn't have a destroy method — clear the container
      containerRef.current.innerHTML = '';
      writerRef.current = null;
    }

    setIsLoading(true);
    setLoadError(null);
    setTotalMistakes(0);
    setCurrentStroke(0);
    mistakesRef.current = 0;

    try {
      const writer = HanziWriter.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: 20,
        showOutline: mode === 'learn' || (mode === 'quiz' && showOutline),
        showCharacter: mode === 'learn',
        strokeAnimationSpeed,
        delayBetweenStrokes: 300,
        strokeColor,
        outlineColor: '#e2e8f0',
        drawingColor: mode === 'free' ? '#0d9488' : '#0d9488',
        drawingWidth: 6,
        showHintAfterMisses: mode === 'quiz' ? 3 : false,
        highlightOnComplete: true,
        highlightColor: '#10b981',
        charDataLoader: (char: string) => {
          return fetch(
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`
          ).then((r) => {
            if (!r.ok) throw new Error(`Character data not found: ${char}`);
            return r.json();
          });
        },
        onLoadCharDataSuccess: (data) => {
          setIsLoading(false);
          setStrokeCount(data.strokes.length);
        },
        onLoadCharDataError: () => {
          setIsLoading(false);
          setLoadError(`Character "${character}" not available`);
        },
      });

      writerRef.current = writer;

      // Start based on mode
      if (mode === 'learn') {
        // Auto-animate the character
        writer.animateCharacter({
          onComplete: () => {
            onAnimationComplete?.();
          },
        });
      } else if (mode === 'quiz') {
        writer.quiz({
          onMistake: (strokeData) => {
            mistakesRef.current += 1;
            setTotalMistakes(mistakesRef.current);
            setCurrentStroke(strokeData.strokeNum);
            onStrokeComplete?.({
              strokeNum: strokeData.strokeNum,
              mistakesOnStroke: strokeData.mistakesOnStroke,
              totalMistakes: mistakesRef.current,
              strokesRemaining: strokeData.strokesRemaining,
              isComplete: false,
            });
          },
          onCorrectStroke: (strokeData) => {
            setCurrentStroke(strokeData.strokeNum + 1);
            onStrokeComplete?.({
              strokeNum: strokeData.strokeNum,
              mistakesOnStroke: strokeData.mistakesOnStroke,
              totalMistakes: mistakesRef.current,
              strokesRemaining: strokeData.strokesRemaining,
              isComplete: false,
            });
          },
          onComplete: (summaryData) => {
            const totalStrokes = summaryData.character
              ? summaryData.character.length
              : strokeCount || 1;
            const mistakes = mistakesRef.current;
            // Score: 100 - (10 per mistake), minimum 0
            const score = Math.max(0, 100 - mistakes * 10);
            onQuizComplete?.({
              character,
              totalMistakes: mistakes,
              strokeCount: totalStrokes,
              score,
            });
          },
        });
      }
      // 'free' mode: writer is ready, user draws freely (no quiz, no animation)
    } catch (err) {
      setIsLoading(false);
      setLoadError(`Failed to create writer: ${err}`);
    }
  }, [
    character,
    mode,
    size,
    showOutline,
    strokeColor,
    strokeAnimationSpeed,
    onStrokeComplete,
    onQuizComplete,
    onAnimationComplete,
    strokeCount,
  ]);

  useEffect(() => {
    initWriter();
    // cleanup on unmount
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      writerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, mode, size]);

  /** Replay animation (learn mode) */
  const replay = useCallback(() => {
    if (!writerRef.current) return;
    if (mode === 'learn') {
      writerRef.current.animateCharacter({
        onComplete: () => onAnimationComplete?.(),
      });
    }
  }, [mode, onAnimationComplete]);

  /** Reset quiz (quiz mode) */
  const resetQuiz = useCallback(() => {
    initWriter();
  }, [initWriter]);

  /** Show hint: animate next stroke */
  const showHint = useCallback(() => {
    // In HanziWriter quiz mode, hints are shown automatically after 3 misses
    // For manual hint, we can't easily trigger it — but we can highlight
    if (writerRef.current && mode === 'learn') {
      writerRef.current.animateCharacter();
    }
  }, [mode]);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Writing pad with grid */}
      <div
        className="relative bg-white rounded-2xl border-2 border-cream-200 shadow-sm overflow-hidden"
        style={{ width: size, height: size }}
      >
        {/* Tianzige grid (田字格) */}
        <svg
          className="absolute inset-0 pointer-events-none z-0"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Outer border */}
          <rect
            x={1}
            y={1}
            width={size - 2}
            height={size - 2}
            fill="none"
            stroke="#f1e8dc"
            strokeWidth={2}
          />
          {/* Vertical center dashed */}
          <line
            x1={size / 2}
            y1={0}
            x2={size / 2}
            y2={size}
            stroke="#f1e8dc"
            strokeWidth={1}
            strokeDasharray="8 6"
          />
          {/* Horizontal center dashed */}
          <line
            x1={0}
            y1={size / 2}
            x2={size}
            y2={size / 2}
            stroke="#f1e8dc"
            strokeWidth={1}
            strokeDasharray="8 6"
          />
          {/* Diagonal guides (optional, lighter) */}
          <line
            x1={0}
            y1={0}
            x2={size}
            y2={size}
            stroke="#f8f0e6"
            strokeWidth={0.5}
            strokeDasharray="6 8"
          />
          <line
            x1={size}
            y1={0}
            x2={0}
            y2={size}
            stroke="#f8f0e6"
            strokeWidth={0.5}
            strokeDasharray="6 8"
          />
        </svg>

        {/* HanziWriter container */}
        <div ref={containerRef} className="relative z-10" />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-navy-400">Loading…</span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {loadError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90">
            <p className="text-sm text-red-500 text-center px-4">{loadError}</p>
          </div>
        )}
      </div>

      {/* Stroke progress (quiz mode) */}
      {mode === 'quiz' && strokeCount > 0 && !loadError && (
        <div className="w-full max-w-[300px]">
          <div className="flex items-center justify-between text-xs text-navy-400 mb-1">
            <span>
              Stroke {Math.min(currentStroke + 1, strokeCount)}/{strokeCount}
            </span>
            {totalMistakes > 0 && (
              <span className="text-amber-600">
                {totalMistakes} mistake{totalMistakes > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{
                width: `${(currentStroke / strokeCount) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Expose actions via data attributes for parent to call */}
      <input type="hidden" data-replay={String(!!replay)} />
      {/* We'll expose methods via forwardRef in a future iteration */}
    </div>
  );
}

// Utility hook to control the pad from parent
export function useHanziPadActions() {
  const padRef = useRef<{
    replay: () => void;
    resetQuiz: () => void;
    showHint: () => void;
  } | null>(null);

  return padRef;
}
