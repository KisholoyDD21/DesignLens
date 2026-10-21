'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  FolderGit2,
  LoaderCircle,
  Moon,
  Save,
  Sun,
  X,
} from 'lucide-react';
import CursorSpotlight from '@/components/cursor-spotlight';
import ThemeToggle from '@/components/theme-toggle';
import UserMenu from '@/components/user-menu';
import SettingsNav from '@/components/settings/settings-nav';

export default function SettingsProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [email, setEmail] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'system'>('dark');

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/account', { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login?next=/settings');
            return;
          }
          throw new Error('Failed to load profile.');
        }

        const data = await res.json();
        setEmail(data.user?.email || '');
        setIsEmailVerified(Boolean(data.user?.emailConfirmedAt));
        setDisplayName(data.profile?.display_name || '');
        setThemePreference(data.profile?.theme_preference || 'dark');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not fetch profile.');
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be blank.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          themePreference,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to update profile.');
      }

      // Apply theme preference to document if changed
      if (themePreference === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      } else if (themePreference === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }

      setToast('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
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
          <span className="brand-version">SETTINGS</span>
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
            STUDIO PREFERENCES
          </span>
          <h1 style={{ fontSize: 32, letterSpacing: '-.03em', margin: '6px 0 8px', fontWeight: 600 }}>
            Account <em>settings.</em>
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14, margin: 0 }}>
            Manage your personal profile and workspace appearance.
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
          <form onSubmit={handleSave}>
            <section className="settings-section-card">
              <h3>Profile Details</h3>
              <p>Your display name is shown in the workspace header and on generated social cards.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="auth-field">
                  <label htmlFor="settings-name" className="auth-label">
                    <span>DISPLAY NAME</span>
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    className="auth-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ada Lovelace"
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="settings-email" className="auth-label">
                    <span>ACCOUNT EMAIL</span>
                    {isEmailVerified ? (
                      <span style={{ color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'none' }}>
                        <CheckCircle2 size={12} /> Verified
                      </span>
                    ) : (
                      <span style={{ color: 'var(--amber)', textTransform: 'none' }}>
                        Unverified
                      </span>
                    )}
                  </label>
                  <input
                    id="settings-email"
                    type="email"
                    className="auth-input"
                    value={email}
                    disabled
                    style={{ opacity: 0.7, cursor: 'not-allowed' }}
                  />
                  <small style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Email is managed through your authentication provider and cannot be modified directly here.
                  </small>
                </div>
              </div>
            </section>

            <section className="settings-section-card">
              <h3>Studio Theme</h3>
              <p>Select your default aesthetic mode for the analysis workspace and Markdown viewer.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <button
                  type="button"
                  className={`dl-button ${themePreference === 'dark' ? 'dl-button-default' : 'dl-button-secondary'}`}
                  onClick={() => setThemePreference('dark')}
                  style={{ height: 44, justifyContent: 'flex-start', padding: '0 16px' }}
                >
                  <Moon size={15} /> Dark studio
                </button>
                <button
                  type="button"
                  className={`dl-button ${themePreference === 'light' ? 'dl-button-default' : 'dl-button-secondary'}`}
                  onClick={() => setThemePreference('light')}
                  style={{ height: 44, justifyContent: 'flex-start', padding: '0 16px' }}
                >
                  <Sun size={15} /> Light paper
                </button>
              </div>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                type="submit"
                className="dl-button dl-button-default"
                disabled={saving}
                style={{ minWidth: 140, height: 42 }}
              >
                {saving ? <LoaderCircle size={15} className="spin" /> : <Save size={15} />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

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
