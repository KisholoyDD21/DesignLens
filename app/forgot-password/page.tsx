'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import AuthShell from '@/components/auth/auth-shell';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import { emailSchema, sanitizeAuthError } from '@/lib/auth-validation';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldError('');

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message || 'Please enter a valid email address.');
      return;
    }

    const supabase = getBrowserClientSafe();
    if (!supabase) {
      setError('Authentication is not configured. Please configure Supabase in your environment.');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?type=recovery&next=/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      // Always show generic success message to prevent user enumeration
      if (resetError) {
        console.warn('Password recovery error:', resetError.message);
      }
      setSubmitted(true);
    } catch (err) {
      console.warn('Password recovery exception:', err);
      // Still show the generic confirmation to maintain security against timing attacks/enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-card">
        <div style={{ textAlign: 'center', padding: '12px 0 6px' }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'rgba(136, 219, 178, 0.12)',
              border: '1px solid var(--green)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: 'var(--green)',
            }}
          >
            <CheckCircle2 size={24} />
          </div>

          <span className="eyebrow">RECOVERY EMAIL SENT</span>
          <h2 style={{ fontSize: 24, margin: '8px 0 10px' }}>
            Check your <em>inbox.</em>
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            If an account is associated with <strong style={{ color: 'var(--text)' }}>{email}</strong>, you will receive password reset instructions shortly.
          </p>

          <Link href="/login" className="dl-button dl-button-outline" style={{ width: '100%', height: 42 }}>
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow">PASSWORD RECOVERY</span>
        <h2>
          Reset your <em>password.</em>
        </h2>
        <p>Enter your account email and we will send you a secure recovery link.</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 18 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label htmlFor="recovery-email" className="auth-label">
            <span>ACCOUNT EMAIL</span>
          </label>
          <input
            id="recovery-email"
            type="email"
            autoComplete="email"
            className={`auth-input ${fieldError ? 'has-error' : ''}`}
            placeholder="designer@studio.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError('');
            }}
            disabled={loading}
            required
          />
          {fieldError && <span className="auth-error-text">{fieldError}</span>}
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={16} className="spin" /> Sending instructions...
            </>
          ) : (
            <>
              <KeyRound size={16} /> Send recovery link
            </>
          )}
        </button>
      </form>

      <div className="auth-card-footer">
        Remember your credentials?
        <Link href="/login">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      showcaseTitle={
        <>
          Account security <em>made seamless.</em>
        </>
      }
      showcaseDesc="We use secure, single-use, time-limited cryptographic tokens for password resets to protect your design workspace."
      badge="ZERO-TRUST RECOVERY"
    >
      <Suspense fallback={<div className="auth-card"><span className="dl-button-spinner" /></div>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
