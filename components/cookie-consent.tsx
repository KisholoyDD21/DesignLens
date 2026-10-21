'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'designlens-cookie-consent-v1';
type Consent = { necessary: true; analytics: boolean; updatedAt: string };
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function measurementId() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

function setAnalytics(id: string, enabled: boolean) {
  if (typeof window === 'undefined') return;
  const w = window as AnalyticsWindow;
  (w as unknown as Record<string, unknown>)[`ga-disable-${id}`] = !enabled;
  if (!enabled) {
    document.querySelectorAll('script[data-designlens-analytics="true"]').forEach((node) => node.remove());
    document.cookie.split(';').forEach((entry) => {
      const name = entry.trim().split('=')[0];
      if (/^_ga(_.*)?$/.test(name)) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        const hostname = window.location.hostname;
        if (hostname.includes('.')) document.cookie = `${name}=; Max-Age=0; path=/; domain=.${hostname}; SameSite=Lax`;
      }
    });
    return;
  }
  if (document.querySelector('script[data-designlens-analytics="true"]')) return;
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || function (...args: unknown[]) { w.dataLayer!.push(args); };
  const script = document.createElement('script');
  script.async = true;
  script.dataset.designlensAnalytics = 'true';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  w.gtag('js', new Date());
  w.gtag('config', id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: false });
}

function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Consent>;
    if (value.necessary !== true || typeof value.analytics !== 'boolean') return null;
    return { necessary: true, analytics: value.analytics, updatedAt: String(value.updatedAt || '') };
  } catch { return null; }
}

export default function CookieConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const id = measurementId();

  useEffect(() => {
    const current = readConsent();
    setConsent(current);
    setAnalyticsEnabled(current?.analytics ?? false);
    setShowBanner(!current);
    setHydrated(true);
    const openSettings = () => { setSettingsOpen(true); setShowBanner(true); };
    window.addEventListener('designlens:cookie-settings', openSettings);
    return () => window.removeEventListener('designlens:cookie-settings', openSettings);
  }, []);

  useEffect(() => {
    if (!hydrated || !consent?.analytics || !id) return;
    setAnalytics(id, true);
    // Generated report URLs contain per-session identifiers; do not send those paths to analytics.
    if (!pathname.startsWith('/analyze/')) {
      const w = window as AnalyticsWindow;
      w.gtag?.('event', 'page_view', { page_path: pathname, page_title: document.title });
    }
  }, [consent?.analytics, hydrated, id, pathname]);

  useEffect(() => {
    if (!settingsOpen) return;
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  useEffect(() => {
    if (!hydrated || !consent?.analytics || !id) return;
    const permittedEvents = new Set(['analysis_started', 'screenshot_analysis_started', 'report_downloaded']);
    const track = (event: Event) => {
      const name = (event as CustomEvent<{ name?: string }>).detail?.name;
      if (name && permittedEvents.has(name)) (window as AnalyticsWindow).gtag?.('event', name);
    };
    window.addEventListener('designlens:track', track);
    return () => window.removeEventListener('designlens:track', track);
  }, [consent?.analytics, hydrated, id]);

  const save = useCallback((analytics: boolean) => {
    const next: Consent = { necessary: true, analytics, updatedAt: new Date().toISOString() };
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Consent controls remain usable if storage is blocked. */ }
    setConsent(next);
    setAnalyticsEnabled(analytics);
    setShowBanner(false);
    setSettingsOpen(false);
    if (id) setAnalytics(id, analytics);
  }, [id]);

  if (!hydrated) return null;
  if (!showBanner && !settingsOpen) return null;

  return <div className="cookie-consent-root" role="region" aria-label="Cookie and analytics preferences">
    {showBanner && !settingsOpen && <section className="cookie-banner" aria-labelledby="cookie-title">
      <div className="cookie-banner-copy"><span className="cookie-eyebrow">YOUR PRIVACY, YOUR CALL</span><h2 id="cookie-title">A little choice goes a long way.</h2><p>Essential local storage keeps your consent preference. Optional analytics help us understand product usage and stay off until you opt in. Analysis results are not sent to analytics.</p><a href="/privacy">Read the privacy policy</a></div>
      <div className="cookie-actions"><button type="button" className="cookie-button cookie-secondary" onClick={() => save(false)}>Reject optional</button><button type="button" className="cookie-button cookie-primary" onClick={() => save(true)} disabled={!id} title={!id ? 'Analytics is not configured for this deployment' : undefined}>Accept analytics</button><button type="button" className="cookie-text-button" onClick={() => setSettingsOpen(true)}>Customize</button></div>
    </section>}
    {settingsOpen && <div className="cookie-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <section className="cookie-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-settings-title">
        <button ref={closeButtonRef} className="cookie-close" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close cookie settings">×</button>
        <span className="cookie-eyebrow">PRIVACY SETTINGS</span><h2 id="cookie-settings-title">Choose what you share.</h2><p>Necessary storage remembers your preference and cannot be disabled here. Optional analytics only loads after you enable it.</p>
        <div className="cookie-option"><div><strong>Necessary storage</strong><small>Stores your preference locally in this browser.</small></div><span className="cookie-always-on">Always on</span></div>
        <label className="cookie-option" htmlFor="analytics-toggle"><div><strong>Analytics</strong><small>{id ? 'Google Analytics loads only after consent. Generated report paths are excluded.' : 'No analytics provider is configured; this option is unavailable.'}</small></div><input id="analytics-toggle" type="checkbox" checked={analyticsEnabled && Boolean(id)} disabled={!id} onChange={(event) => setAnalyticsEnabled(event.currentTarget.checked)} /></label>
        <div className="cookie-modal-actions"><button className="cookie-button cookie-secondary" onClick={() => save(false)}>Reject optional</button><button className="cookie-button cookie-primary" onClick={() => save(analyticsEnabled && Boolean(id))}>Save preferences</button></div>
        <a href="/privacy">Read privacy policy</a>
      </section>
    </div>}
  </div>;
}
