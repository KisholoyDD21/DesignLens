import Link from 'next/link';
import CookieSettingsTrigger from '@/components/cookie-settings-trigger';
import type { ReactNode } from 'react';

export default function LegalLayout({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return <main className="legal-page">
    <header className="legal-header"><Link href="/" className="legal-brand"><span aria-hidden="true" className="legal-brand-mark">◈</span> design<span>lens</span></Link><Link href="/" className="legal-back">← Back to DesignLens</Link></header>
    <article className="legal-document"><div className="legal-eyebrow">{eyebrow}</div><h1>{title}</h1><p className="legal-updated">Last updated: {updated}</p>{children}
      <aside className="legal-note"><strong>Before public launch</strong><p>Publish the operator’s legal name and a monitored privacy/contact email, and review this policy against your actual deployment, analytics settings, and applicable law.</p></aside>
    </article>
    <footer className="legal-footer"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/">DesignLens</Link><CookieSettingsTrigger /><span>© 2026 DesignLens</span></footer>
  </main>;
}
