'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Circle,
  Eye,
  EyeOff,
  FolderGit2,
  KeyRound,
  LoaderCircle,
  LogOut,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import CursorSpotlight from '@/components/cursor-spotlight';
import ThemeToggle from '@/components/theme-toggle';
import UserMenu from '@/components/user-menu';
import SettingsNav from '@/components/settings/settings-nav';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import { checkPasswordRequirements, isPasswordValid, sanitizeAuthError } from '@/lib/auth-validation';

export default function SettingsSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Password update form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Deletion modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const passwordRequirements = useMemo(() => checkPasswordRequirements(newPassword), [newPassword]);

  useEffect(() => {
    async function loadAccount() {
      try {
        const res = await fetch('/api/account', { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login?next=/settings/security');
            return;
          }
          throw new Error('Failed to load security info.');
        }

        const data = await res.json();
        setProviders(data.user?.providers || ['email']);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not fetch account details.');
      } finally {
        setLoading(false);
      }
    }

    void loadAccount();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const isOAuthOnly = providers.length > 0 && !providers.includes('email');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!isPasswordValid(newPassword)) {
      setPasswordError('Password must satisfy all security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    const supabase = getBrowserClientSafe();
    if (!supabase) {
      setPasswordError('Authentication is not configured.');
      return;
    }

    setUpdatingPassword(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError(sanitizeAuthError(updateError));
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setToast('Password updated successfully.');
    } catch (err) {
      setPasswordError(sanitizeAuthError(err));
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = getBrowserClientSafe();
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push('/');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete account.');
      }

      router.push('/?deleted=true');
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Deletion failed.');
      setDeletingAccount(false);
    }
  };

  return (
    <main className="settings-page">
      <CursorSpotlight />
      <div className="ambient ambient-one" aria-hidden="true" />

      <header className="site-header">
        <Link href="/" className="brand-lockup" aria-label="DesignLens Home">
          <span className="brand-mark">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span className="brand-word">
            design<span>lens</span>
          </span>
          <span className="brand-version">SECURITY</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <UserMenu />
          <Link href="/dashboard" className="dl-button dl-button-secondary dl-button-sm">
            <FolderGit2 size={13} /> Workspace
          </Link>
        </div>
      </header>

      <div className="settings-content">
        <div style={{ marginBottom: 12 }}>
          <span className="eyebrow" style={{ color: 'var(--cyan)', font: '10px var(--mono)', letterSpacing: '.14em' }}>
            CREDENTIALS &amp; PRIVACY
          </span>
          <h1 style={{ fontSize: 32, letterSpacing: '-.03em', margin: '6px 0 8px', fontWeight: 600 }}>
            Security &amp; <em>Account.</em>
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: 0 }}>
            Manage your credentials, active authentication methods, and privacy controls.
          </p>
        </div>

        <SettingsNav />

        {error && (
          <div className="auth-alert auth-alert-error" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="settings-section-card" style={{ display: 'grid', placeItems: 'center', minHeight: 200 }}>
            <span className="dl-button-spinner" style={{ width: 20, height: 20 }} />
          </div>
        ) : (
          <>
            <section className="settings-section-card">
              <h3>Authentication Method</h3>
              <p>Your account is linked to the following identity provider(s):</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                {providers.map((p) => (
                  <span
                    key={p}
                    className="dl-badge dl-badge-accent"
                    style={{ textTransform: 'uppercase', padding: '6px 12px', fontSize: 11 }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              {isOAuthOnly ? (
                <div className="auth-alert" style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-soft)', fontSize: 13 }}>
                    You signed in via an external OAuth provider. You can set a password below if you wish to also sign in directly using your email and password.
                  </span>
                </div>
              ) : null}
            </section>

            <section className="settings-section-card">
              <h3>{isOAuthOnly ? 'Set Account Password' : 'Change Password'}</h3>
              <p>Ensure your account uses a strong, dedicated password.</p>

              {passwordError && (
                <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="auth-field">
                  <label htmlFor="new-password" className="auth-label">
                    <span>NEW PASSWORD</span>
                  </label>
                  <div className="auth-input-wrapper">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
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
                </div>

                <div className="auth-field">
                  <label htmlFor="confirm-new-password" className="auth-label">
                    <span>CONFIRM NEW PASSWORD</span>
                  </label>
                  <input
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
                  <button
                    type="submit"
                    className="dl-button dl-button-default"
                    disabled={updatingPassword || !newPassword}
                  >
                    {updatingPassword ? <LoaderCircle size={14} className="spin" /> : <KeyRound size={14} />}
                    {isOAuthOnly ? 'Set Password' : 'Save New Password'}
                  </button>
                </div>
              </form>
            </section>

            <section className="settings-section-card">
              <h3>Session Management</h3>
              <p>Terminate active sessions on this device.</p>
              <button
                type="button"
                className="dl-button dl-button-outline"
                onClick={handleSignOut}
              >
                <LogOut size={14} /> Sign out of DesignLens
              </button>
            </section>

            <section className="settings-section-card settings-danger-card">
              <h3>Danger Zone: Delete Account</h3>
              <p>
                Permanently erase your user profile and all saved design systems from DesignLens. This action is irreversible.
              </p>

              <button
                type="button"
                className="dl-button dl-button-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 size={14} /> Delete Account &amp; Workspace
              </button>
            </section>
          </>
        )}
      </div>

      {showDeleteModal && (
        <div className="cookie-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cookie-modal" style={{ maxWidth: 460 }}>
            <span className="eyebrow" style={{ color: 'var(--danger)', font: '10px var(--mono)', letterSpacing: '.14em' }}>
              PERMANENT ACCOUNT DELETION
            </span>
            <h2 style={{ fontSize: 22, margin: '8px 0 10px' }}>
              Are you <em>absolutely sure?</em>
            </h2>
            <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
              This will permanently delete your user account, authentication profile, and all saved design system reports and tokens.
            </p>

            {deleteError && (
              <div className="auth-alert auth-alert-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={15} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="confirm-delete-input"
                style={{ display: 'block', fontSize: 11, font: '11px var(--mono)', color: 'var(--muted)', marginBottom: 6 }}
              >
                TYPE &quot;DELETE&quot; TO CONFIRM
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                className="auth-input"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="dl-button dl-button-secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                  setDeleteError('');
                }}
                disabled={deletingAccount}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dl-button dl-button-danger"
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmation !== 'DELETE'}
              >
                {deletingAccount ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}
                Permanently Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-message" role="status">
          <Check size={14} />
          <span>{toast}</span>
          <button type="button" onClick={() => setToast('')} aria-label="Dismiss">
            <X size={12} />
          </button>
        </div>
      )}
    </main>
  );
}
