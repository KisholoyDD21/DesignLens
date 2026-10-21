import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'accent' | 'success' | 'warning' | 'outline';
export function Badge({ className, variant='default', ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return <span className={cn('dl-badge', `dl-badge-${variant}`, className)} {...props} />;
}
