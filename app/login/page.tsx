'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, LoaderCircle, LogIn } from 'lucide-react';
import AuthShell from '@/components/auth/auth-shell';
import OAuthButtons from '@/components/auth/oauth-buttons';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import { emailSchema, getSafeRedirectUrl, sanitizeAuthError } from '@/lib/auth-validation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeRedirectUrl(searchParams.get('next'), '/dashboard');
  const initialError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      errors.email = emailResult.error.issues[0]?.message;
    }
    if (!password) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    const supabase = getBrowserClientSafe();
    if (!supabase) {
      setError('Authentication is not configured. Please configure Supabase in your environment.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(sanitizeAuthError(signInError));
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(sanitizeAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow">ACCOUNT ACCESS</span>
        <h2>
          Welcome back to <em>DesignLens.</em>
        </h2>
        <p>Sign in to access your saved design systems and workspaces.</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 18 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <OAuthButtons next={next} onError={setError} />

      <div className="auth-divider">
        <span>OR CONTINUE WITH EMAIL</span>
      </div>

      <form className="auth-form" onSubmit={handleLogin} noValidate>
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-label">
            <span>EMAIL ADDRESS</span>
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={`auth-input ${fieldErrors.email ? 'has-error' : ''}`}
            placeholder="designer@studio.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={loading}
            required
          />
          {fieldErrors.email && <span className="auth-error-text">{fieldErrors.email}</span>}
        </div>

        <div className="auth-field">
          <div className="auth-label">
            <label htmlFor="login-password">PASSWORD</label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <div className="auth-input-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={`auth-input ${fieldErrors.password ? 'has-error' : ''}`}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && <span className="auth-error-text">{fieldErrors.password}</span>}
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={16} className="spin" /> Signing in...
            </>
          ) : (
            <>
              <LogIn size={16} /> Sign in
            </>
          )}
        </button>
      </form>

      <div className="auth-card-footer">
        Don&apos;t have an account yet?
        <Link href={`/signup${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>
          Sign up
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      showcaseTitle={
        <>
          Turn public websites into <em>living specs.</em>
        </>
      }
      showcaseDesc="Sign in to resume inspecting design tokens, comparing systems, and exporting production-ready documentation."
      badge="DESIGN SYSTEM REPOSITORY"
    >
      <Suspense fallback={<div className="auth-card"><span className="dl-button-spinner" /></div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
