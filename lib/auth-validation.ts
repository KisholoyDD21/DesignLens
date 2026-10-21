import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .min(3, 'Email address is required.')
  .max(255, 'Email address is too long.')
  .email('Please enter a valid email address.');

export type PasswordRequirement = {
  id: string;
  label: string;
  met: boolean;
};

export function checkPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'At least one number (0-9)',
      met: /[0-9]/.test(password),
    },
  ];
}

export function isPasswordValid(password: string): boolean {
  return checkPasswordRequirements(password).every((req) => req.met);
}

/**
 * Validates a redirect target to prevent open redirect vulnerabilities.
 * Only allows relative paths on the same origin (e.g., '/dashboard', '/analyze/123').
 */
export function getSafeRedirectUrl(target: string | null | undefined, fallback = '/dashboard'): string {
  if (!target) return fallback;
  const trimmed = target.trim();

  // Disallow protocol-relative URLs (e.g. //evil.com) and backslash redirects (e.g. /\evil.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return fallback;
  }

  // Must start with a single slash
  if (!trimmed.startsWith('/')) {
    return fallback;
  }

  // Prevent embedded protocol tricks (e.g. /http:// or /javascript:)
  try {
    const dummy = new URL(trimmed, 'https://designlens.local');
    if (dummy.origin !== 'https://designlens.local') return fallback;
    return `${dummy.pathname}${dummy.search}${dummy.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Generic authentication error message to prevent account enumeration.
 */
export function sanitizeAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = error instanceof Error ? error.message : String(error);

  const lower = msg.toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('email not confirmed') ||
    lower.includes('user not found') ||
    lower.includes('wrong password')
  ) {
    return 'Invalid email or password. Please verify your credentials and try again.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many login attempts. Please wait a few minutes before trying again.';
  }

  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  return msg.length < 160 ? msg : 'Authentication request failed. Please try again.';
}
