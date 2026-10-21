'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, CheckCircle2, Circle, Eye, EyeOff, KeyRound, LoaderCircle } from 'lucide-react';
import AuthShell from '@/components/auth/auth-shell';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import { checkPasswordRequirements, isPasswordValid, sanitizeAuthError } from '@/lib/auth-validation';

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const passwordRequirements = useMemo(() => checkPasswordRequirements(password), [password]);

  useEffect(() => {
    const supabase = getBrowserClientSafe();
    if (!supabase) {
      setError('Supabase is not configured.');
      setCheckingSession(false);
      return;
    }

    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        setHasValidSession(false);
      } else {
        setHasValidSession(true);
      }
      setCheckingSession(false);
    });
  }, []);

  const validate = () => {
    const errors: { password?: string; confirmPassword?: string } = {};

    if (!isPasswordValid(password)) {
      errors.password = 'Password must meet all security requirements.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    const supabase = getBrowserClientSafe();
    if (!supabase) {
      setError('Authentication is not configured.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(sanitizeAuthError(updateError));
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(sanitizeAuthError(err));
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="auth-card" style={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span className="dl-button-spinner" style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Verifying recovery session...</span>
        </div>
      </div>
    );
  }

  if (!hasValidSession && !success) {
    return (
      <div className="auth-card">
        <div style={{ textAlign: 'center', padding: '12px 0 6px' }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'rgba(250, 135, 135, 0.12)',
              border: '1px solid var(--danger)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              color: 'var(--danger)',
            }}
          >
            <AlertCircle size={24} />
          </div>

          <span className="eyebrow">LINK EXPIRED OR INVALID</span>
          <h2 style={{ fontSize: 24, margin: '8px 0 10px' }}>
            Session <em>not found.</em>
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            This password recovery link has either expired or has already been used. Please request a new recovery link.
          </p>

          <Link href="/forgot-password" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
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

          <span className="eyebrow">PASSWORD UPDATED</span>
          <h2 style={{ fontSize: 24, margin: '8px 0 10px' }}>
            Security <em>restored.</em>
          </h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            Your account password has been updated successfully. You can now access your workspace.
          </p>

          <Link href="/dashboard" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
            Go to workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-head">
        <span className="eyebrow">NEW CREDENTIALS</span>
        <h2>
          Set your new <em>password.</em>
        </h2>
        <p>Please enter and confirm your new account password below.</p>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error" role="alert" style={{ marginBottom: 18 }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleReset} noValidate>
        <div className="auth-field">
          <label htmlFor="reset-password" className="auth-label">
            <span>NEW PASSWORD</span>
          </label>
          <div className="auth-input-wrapper">
            <input
              id="reset-password"
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
              <div key={req.id} className={`auth-checklist-item ${req.met ? 'met' : ''}`}>
                {req.met ? <Check size={13} /> : <Circle size={13} />}
                <span>{req.label}</span>
              </div>
            ))}
          </div>
          {fieldErrors.password && <span className="auth-error-text">{fieldErrors.password}</span>}
        </div>

        <div className="auth-field">
          <label htmlFor="confirm-password" className="auth-label">
            <span>CONFIRM PASSWORD</span>
          </label>
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`auth-input ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
            placeholder="••••••••••••"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            disabled={loading}
            required
          />
          {fieldErrors.confirmPassword && <span className="auth-error-text">{fieldErrors.confirmPassword}</span>}
        </div>

        <button type="submit" className="auth-submit-btn" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? (
            <>
              <LoaderCircle size={16} className="spin" /> Updating password...
            </>
          ) : (
            <>
              <KeyRound size={16} /> Update password
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      showcaseTitle={
        <>
          Update your <em>security credentials.</em>
        </>
      }
      showcaseDesc="Create a strong, unique password to protect your reverse-engineered design systems and private exports."
      badge="PASSWORD RESET"
    >
      <Suspense fallback={<div className="auth-card"><span className="dl-button-spinner" /></div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
