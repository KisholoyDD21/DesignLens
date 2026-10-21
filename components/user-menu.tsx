'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, FolderGit2, LogIn, LogOut, Settings, Sparkles } from 'lucide-react';
import { getBrowserClientSafe } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getBrowserClientSafe();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSignOut = async () => {
    const supabase = getBrowserClientSafe();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setOpen(false);
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return <div className="nav-user-pill" style={{ opacity: 0.6 }}><span className="dl-button-spinner" /></div>;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Link href="/login" className="nav-user-pill nav-auth-link nav-sign-in" aria-label="Sign in">
          <LogIn size={14} aria-hidden="true" />
          <span>Sign in</span>
        </Link>
        <Link href="/signup" className="header-cta nav-auth-link nav-sign-up" aria-label="Sign up">
          <span>Sign up</span> <Sparkles size={14} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
  const initial = (name[0] || 'U').toUpperCase();

  return (
    <div className="user-menu-root" ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="nav-user-pill"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="User account menu"
      >
        <span className="user-avatar-circle">{initial}</span>
        <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <ChevronDown size={13} style={{ opacity: 0.7 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 220,
            background: 'var(--surface-strong)',
            border: '1px solid var(--border-strong)',
            borderRadius: 10,
            boxShadow: '0 16px 50px rgba(0,0,0,0.4)',
            padding: 8,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 650, fontSize: 13, color: 'var(--text)' }}>{name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </div>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              fontSize: 12,
              borderRadius: 6,
              color: 'var(--text)',
              transition: 'background .15s',
            }}
            className="dropdown-hover"
          >
            <FolderGit2 size={15} style={{ color: 'var(--accent)' }} />
            <span>Workspace</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              fontSize: 12,
              borderRadius: 6,
              color: 'var(--text)',
              transition: 'background .15s',
            }}
            className="dropdown-hover"
          >
            <Settings size={15} style={{ color: 'var(--text-soft)' }} />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              fontSize: 12,
              borderRadius: 6,
              color: 'var(--danger)',
              background: 'transparent',
              border: 0,
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              marginTop: 4,
              borderTop: '1px solid var(--border)',
            }}
          >
            <LogOut size={15} />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
