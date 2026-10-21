import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export function Button({ className, variant='default', size='md', loading=false, disabled, children, ...props }: Props) {
  return <button className={cn('dl-button', `dl-button-${variant}`, `dl-button-${size}`, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading && <span className="dl-button-spinner" aria-hidden="true" />}{children}
  </button>;
}
