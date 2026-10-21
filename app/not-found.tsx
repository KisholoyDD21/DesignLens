import Link from 'next/link';

export default function NotFound() {
  return <main className="not-found-page">
    <div className="not-found-orb" aria-hidden="true" />
    <Link href="/" className="legal-brand"><span aria-hidden="true" className="legal-brand-mark">◈</span> design<span>lens</span></Link>
    <div className="not-found-code">404 <span>— PAGE NOT FOUND</span></div>
    <h1>This page slipped<br /><em>out of focus.</em></h1>
    <p>The link may be outdated, or the page may have moved. Head back to the workspace and analyze something new.</p>
    <Link className="not-found-cta" href="/">Back to DesignLens <span aria-hidden="true">↗</span></Link>
  </main>;
}
