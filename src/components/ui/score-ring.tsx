'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScoreRingProps {
  score: number;
  maxScore: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  confidence?: string;
  change?: number;
  className?: string;
}

const dimensions = {
  sm: { size: 100, stroke: 6, fontSize: 'text-xl', subSize: 'text-xs' },
  md: { size: 160, stroke: 8, fontSize: 'text-3xl', subSize: 'text-sm' },
  lg: { size: 200, stroke: 10, fontSize: 'text-4xl', subSize: 'text-base' },
};

export function ScoreRing({
  score,
  maxScore,
  size = 'md',
  label,
  confidence,
  change,
  className,
}: ScoreRingProps) {
  const dim = dimensions[size];
  const radius = (dim.size - dim.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(score / maxScore, 0), 1);
  const offset = circumference * (1 - percentage);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: dim.size, height: dim.size }}>
        <svg
          width={dim.size}
          height={dim.size}
          viewBox={`0 0 ${dim.size} ${dim.size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={dim.size / 2}
            cy={dim.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={dim.stroke}
            className="text-cream-100"
          />
          {/* Active track */}
          <circle
            cx={dim.size / 2}
            cy={dim.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={dim.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-teal-500 transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold text-navy-900', dim.fontSize)}>
            {score}
          </span>
          <span className={cn('text-navy-400', dim.subSize)}>
            /{maxScore}
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-2 text-sm font-medium text-navy-700">{label}</span>
      )}
      {confidence && (
        <span className="text-xs text-navy-400">{confidence}</span>
      )}
      {change !== undefined && change !== 0 && (
        <span
          className={cn(
            'mt-1 text-xs font-medium',
            change > 0 ? 'text-teal-500' : 'text-error-500'
          )}
        >
          {change > 0 ? '+' : ''}{change} pts
        </span>
      )}
    </div>
  );
}
