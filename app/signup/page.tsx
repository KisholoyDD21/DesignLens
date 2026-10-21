'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Check, CheckCircle2, Circle, Eye, EyeOff, LoaderCircle, Mail, Sparkles, UserPlus } from 'lucide-react';
import AuthShell from '@/components/auth/auth-shell';
import OAuthButtons from '@/components/auth/oauth-buttons';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import { checkPasswordRequirements, emailSchema, getSafeRedirectUrl, isPasswordValid, sanitizeAuthError } from '@/lib/auth-validation';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = getSafeRedirectUrl(searchParams.get('next'), '/dashboard');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; email?: string; password?: string; agreeTerms?: string }>({});
  const [verificationPending, setVerificationPending] = useState(false);

  const passwordRequirements = useMemo(() => checkPasswordRequirements(password), [password]);

  const validate = () => {
    const errors: { fullName?: string; email?: string; password?: string; agreeTerms?: string } = {};

    if (!fullName.trim()) {
      errors.fullName = 'Please enter your name.';
    }

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      errors.email = emailResult.error.issues[0]?.message;
    }

    if (!isPasswordValid(password)) {
      errors.password = 'Password does not meet all security requirements.';
    }

    if (!agreeTerms) {
      errors.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
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
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        setError(sanitizeAuthError(signUpError));
        setLoading(false);
        return;
      }

      // Check if session was returned directly (e.g. email confirmation disabled in Supabase)
      if (data.session) {
        router.push(next);
        router.refresh();
      } else {
        // Verification email sent
        setVerificationPending(true);
        setLoading(false);
      }
    } catch (err) {
      setError(sanitizeAuthError(err));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const supabase = getBrowserClientSafe();
    if (!supabase || !email) return;

    setResending(true);
    setResendMessage('');

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (resendError) {
        setResendMessage('Could not resend email. Please wait a minute and try again.');
      } else {
        setResendMessage('Verification email resent! Please check your inbox.');
      }
    } catch {
      setResendMessage('Could not resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (verificationPending) {
    return (
      <div className="auth-card">
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(95, 224, 231, 0.12)',
              border: '1px solid var(--cyan)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 18px',
              color: 'var(--cyan)',
            }}
          >
            <Mail size={26} />
          </div>

          <span className="eyebrow">VERIFICATION REQUIRED</span>
          <h2 style={{ fontSize: 24, margin: '8px 0 10px' }}>
            Check your <em>inbox.</em>
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            We sent a verification link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Click the link in that email to activate your workspace.
          </p>

          {resendMessage && (
            <div className="auth-alert auth-alert-success" style={{ marginBottom: 16 }}>
              <CheckCircle2 size={16} />
              <span>{resendMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? <LoaderCircle size={15} className="spin" /> : null} Resend verification email
            </button>

            <Link href="/login" className="dl-button dl-button-outline" style={{ height: 40, width: '100%' }}>
              Return to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow">CREATE WORKSPACE</span>
        <h2>
          Start your <em>studio.</em>
        </h2>
        <p>Save reports, map design DNA, and manage your tokens across devices.</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 18 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <OAuthButtons next={next} onError={setError} />

      <div className="auth-divider">
        <span>OR REGISTER WITH EMAIL</span>
      </div>

      <form className="auth-form" onSubmit={handleSignup} noValidate>
        <div className="auth-field">
          <label htmlFor="signup-name" className="auth-label">
            <span>FULL NAME</span>
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            className={`auth-input ${fieldErrors.fullName ? 'has-error' : ''}`}
            placeholder="Ada Lovelace"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            disabled={loading}
            required
          />
          {fieldErrors.fullName && <span className="auth-error-text">{fieldErrors.fullName}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email" className="auth-label">
            <span>EMAIL ADDRESS</span>
          </label>
          <input
            id="signup-email"
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
          <label htmlFor="signup-password" className="auth-label">
            <span>CHOOSE A PASSWORD</span>
          </label>
          <div className="auth-input-wrapper">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
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

          <div className="auth-checklist" aria-live="polite">
            {passwordRequirements.map((req) => (
              <div
                key={req.id}
                className={`auth-checklist-item ${req.met ? 'met' : ''}`}
              >
                {req.met ? <Check size={13} /> : <Circle size={13} />}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
          {fieldErrors.password && <span className="auth-error-text">{fieldErrors.password}</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
          <input
            type="checkbox"
            id="agree-terms"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              if (fieldErrors.agreeTerms) setFieldErrors((prev) => ({ ...prev, agreeTerms: undefined }));
            }}
            style={{ marginTop: 3, accentColor: 'var(--accent)' }}
          />
          <label htmlFor="agree-terms" style={{ fontSize: 11, color: 'var(--text-soft)', lineHeight: 1.5 }}>
            I agree to the <Link href="/terms" target="_blank" style={{ color: 'var(--cyan)', textDecoration: 'underline' }}>Terms of Service</Link> and{' '}
            <Link href="/privacy" target="_blank" style={{ color: 'var(--cyan)', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </label>
        </div>
        {fieldErrors.agreeTerms && <span className="auth-error-text">{fieldErrors.agreeTerms}</span>}

        <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? (
            <>
              <LoaderCircle size={16} className="spin" /> Creating account...
            </>
          ) : (
            <>
              <UserPlus size={16} /> Create account
            </>
          )}
        </button>
      </form>

      <div className="auth-card-footer">
        Already have an account?
        <Link href={`/login${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}>
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell
      showcaseTitle={
        <>
          Preserve your <em>design discoveries.</em>
        </>
      }
      showcaseDesc="Create an account to keep your reverse-engineered design systems, compare palettes side by side, and share token exports."
      badge="PERSONAL WORKSPACE"
    >
      <Suspense fallback={<div className="auth-card"><span className="dl-button-spinner" /></div>}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
