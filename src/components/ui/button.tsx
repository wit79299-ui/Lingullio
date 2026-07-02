import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium whitespace-nowrap transition-colors duration-150',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
    'disabled:pointer-events-none disabled:opacity-50',
    'touch-target select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-navy-900 text-white hover:bg-navy-700 active:bg-navy-800',
        secondary:
          'border-2 border-navy-900 text-navy-900 bg-white hover:bg-cream-50 active:bg-cream-100',
        ghost: 'text-navy-700 hover:bg-cream-50 active:bg-cream-100',
        danger: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-600',
        teal: 'bg-teal-500 text-white hover:bg-teal-600 active:bg-teal-600',
        link: 'text-blue-500 underline-offset-4 hover:underline p-0 h-auto min-h-0 min-w-0',
      },
      size: {
        sm: 'h-9 px-4 text-sm rounded-full',
        md: 'h-11 px-6 text-sm rounded-full',
        lg: 'h-12 px-8 text-base rounded-full',
        xl: 'h-14 px-10 text-base rounded-full',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
