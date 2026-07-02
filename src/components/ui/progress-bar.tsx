import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ProgressBar = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  ProgressBarProps
>(({ className, value, max = 100, label, showValue = false, size = 'md', ...props }, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm font-medium text-navy-700">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-navy-900">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-cream-100',
          heights[size],
          className
        )}
        value={value}
        max={max}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full rounded-full bg-teal-500 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };
