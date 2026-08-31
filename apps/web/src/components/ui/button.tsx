import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[9px] border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        cockpit:
          'border-[#2d4a49] bg-[#102923] px-[15px] py-[10px] text-[#dfffee] hover:border-[#4ee1a0]',
        retry:
          'border-[#61343a] bg-[#261820] px-[15px] py-[10px] text-[#ffd8d8] hover:border-[#d5737e]'
      }
    },
    defaultVariants: {
      variant: 'cockpit'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
