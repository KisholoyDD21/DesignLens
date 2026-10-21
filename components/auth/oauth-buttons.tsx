'use client';

import { useState } from 'react';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import { sanitizeAuthError } from '@/lib/auth-validation';

type OAuthButtonsProps = {
  next?: string;
  onError: (error: string) => void;
};

export default function OAuthButtons({ next = '/dashboard', onError }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);

  const handleOAuth = async (provider: 'google' | 'github') => {
    try {
      const supabase = getBrowserClientSafe();
      if (!supabase) {
        onError('Authentication is not configured. Please set your Supabase environment variables.');
        return;
      }

      setLoadingProvider(provider);
      onError('');

      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        onError(sanitizeAuthError(error));
        setLoadingProvider(null);
      }
    } catch (err) {
      onError(sanitizeAuthError(err));
      setLoadingProvider(null);
    }
  };

  return (
    <div className="auth-social-grid">
      <button
        type="button"
        className="auth-social-btn"
        onClick={() => handleOAuth('google')}
        disabled={loadingProvider !== null}
        aria-label="Continue with Google"
      >
        {loadingProvider === 'google' ? (
          <span className="dl-button-spinner" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-3z"
            />
            <path
              fill="#34A853"
              d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
            />
          </svg>
        )}
        <span>Google</span>
      </button>

      <button
        type="button"
        className="auth-social-btn"
        onClick={() => handleOAuth('github')}
        disabled={loadingProvider !== null}
        aria-label="Continue with GitHub"
      >
        {loadingProvider === 'github' ? (
          <span className="dl-button-spinner" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
        )}
        <span>GitHub</span>
      </button>
    </div>
  );
}
