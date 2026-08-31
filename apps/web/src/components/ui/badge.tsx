import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-[0.08em] uppercase',
  {
    variants: {
      tone: {
        positive: 'border-[#28634e] bg-[#123a2d] text-[#7af0b9]',
        watching: 'border-[#3b506c] bg-[#17263a] text-[#9db0c8]',
        planned: 'border-[#66562f] bg-[#342d1b] text-[#e8ca77]',
        muted: 'border-[#303c4c] bg-[#18212e] text-[#77869a]'
      }
    },
    defaultVariants: {
      tone: 'watching'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
