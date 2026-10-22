import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      default: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 shadow-sm',
      secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/60',
      outline: 'border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-200',
      ghost: 'hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100',
    };

    const sizes = {
      default: 'h-8 px-3 py-1.5',
      sm: 'h-7 rounded px-2.5 text-[11px]',
      lg: 'h-9 px-4 text-sm',
      icon: 'h-8 w-8',
    };

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
