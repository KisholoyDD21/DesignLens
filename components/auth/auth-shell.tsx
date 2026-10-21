'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Layers3, Palette, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import CursorSpotlight from '@/components/cursor-spotlight';
import ThemeToggle from '@/components/theme-toggle';

type AuthShellProps = {
  children: React.ReactNode;
  showcaseTitle?: React.ReactNode;
  showcaseDesc?: string;
  badge?: string;
};

export default function AuthShell({
  children,
  showcaseTitle = (
    <>
      See the system <em>behind</em> every interface.
    </>
  ),
  showcaseDesc = 'Create a personal workspace to preserve extracted palettes, font stacks, layout rhythms, and downloadable design.md specs across projects.',
  badge = 'PERSISTENT WORKSPACE',
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <CursorSpotlight />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      <header className="auth-nav">
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
          <span className="brand-version">BETA / 01</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <Link href="/" className="bare-icon" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-soft)' }}>
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>

      <div className="auth-layout split-layout">
        <section className="auth-showcase">
          <div className="auth-showcase-eyebrow">
            <Sparkles size={14} />
            <span>{badge}</span>
          </div>

          <h1>{showcaseTitle}</h1>
          <p className="auth-showcase-desc">{showcaseDesc}</p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <Check size={16} />
              <span>Save evidence-backed 12-section design systems forever.</span>
            </div>
            <div className="auth-feature-item">
              <Check size={16} />
              <span>Direct ZIP bundle exports with tokens.json and screenshots.</span>
            </div>
            <div className="auth-feature-item">
              <Check size={16} />
              <span>Full privacy control with Row Level Security data isolation.</span>
            </div>
          </div>

          <div className="auth-quote-card">
            &ldquo;Design systems are not arbitrary mood boards. They are engineering decisions waiting to be decoded.&rdquo;
            <small>DESIGNLENS ARCHITECTURE PRINCIPLE</small>
          </div>
        </section>

        <div className="auth-card-panel">
          {children}
        </div>
      </div>
    </main>
  );
}
