import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        new: 'bg-teal-100 text-teal-600',
        inProgress: 'bg-blue-100 text-blue-500',
        toReview: 'bg-gold-100 text-gold-600',
        mastered: 'bg-teal-50 text-teal-600',
        draft: 'bg-gray-100 text-gray-600',
        published: 'bg-teal-100 text-teal-600',
        archived: 'bg-gray-100 text-gray-400',
        error: 'bg-error-100 text-error-500',
      },
    },
    defaultVariants: {
      variant: 'new',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
