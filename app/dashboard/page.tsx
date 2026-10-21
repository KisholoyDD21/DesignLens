'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileText,
  Filter,
  FolderGit2,
  Heart,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import CursorSpotlight from '@/components/cursor-spotlight';
import ThemeToggle from '@/components/theme-toggle';
import UserMenu from '@/components/user-menu';
import type { WebsiteSnapshot } from '@/lib/types';
import { slugify } from '@/lib/utils';

type SavedReport = {
  id: string;
  url: string;
  brand_name: string;
  is_favorite: boolean;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  snapshot: WebsiteSnapshot;
};

export default function DashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [toast, setToast] = useState('');
  const [busyExportId, setBusyExportId] = useState<string>('');
  const [deleteModalReport, setDeleteModalReport] = useState<SavedReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports', { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?next=/dashboard');
          return;
        }
        throw new Error('Failed to load saved reports.');
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch workspace reports.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggleFavorite = async (report: SavedReport) => {
    const newStatus = !report.is_favorite;
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, is_favorite: newStatus } : r))
    );

    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newStatus }),
      });
      if (!res.ok) throw new Error();
      setToast(newStatus ? 'Added to favorites.' : 'Removed from favorites.');
    } catch {
      // Revert on failure
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, is_favorite: !newStatus } : r))
      );
      setToast('Failed to update favorite status.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteModalReport) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${deleteModalReport.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Could not delete report.');
      setReports((prev) => prev.filter((r) => r.id !== deleteModalReport.id));
      setToast(`Deleted "${deleteModalReport.brand_name}" from workspace.`);
      setDeleteModalReport(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Deletion failed.');
    } finally {
      setDeleting(false);
    }
  };

  const downloadExport = async (report: SavedReport, format: 'md' | 'zip') => {
    setBusyExportId(`${report.id}-${format}`);
    try {
      // Fetch full report if needed
      const fullRes = await fetch(`/api/reports/${report.id}`);
      if (!fullRes.ok) throw new Error('Could not load report content for export.');
      const fullData = await fullRes.json();
      const markdown = fullData.report?.markdown || '';

      const expRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          markdown,
          filename: `${slugify(report.brand_name)}-design-system`,
          tokens: {
            colors: report.snapshot?.colors,
            fonts: report.snapshot?.fonts,
            spacing: report.snapshot?.spacing,
            layout: report.snapshot?.layout,
            components: report.snapshot?.components,
            motion: report.snapshot?.motion,
            cssVariables: report.snapshot?.cssVariables,
          },
          screenshotDataUrl: report.snapshot?.screenshotDataUrl,
        }),
      });

      if (!expRes.ok) throw new Error('Export failed.');

      const blob = await expRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(report.brand_name)}-design-system.${format === 'md' ? 'md' : 'zip'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setToast(format === 'md' ? 'Markdown exported.' : 'ZIP bundle exported.');
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusyExportId('');
    }
  };

  const copyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setToast(`Copied ${hex} to clipboard.`);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (filter === 'favorites' && !r.is_favorite) return false;
      if (search) {
        const query = search.toLowerCase();
        const brand = (r.brand_name || '').toLowerCase();
        const url = (r.url || '').toLowerCase();
        return brand.includes(query) || url.includes(query);
      }
      return true;
    });
  }, [reports, filter, search]);

  const totalTokens = useMemo(() => {
    return reports.reduce((acc, r) => acc + (r.snapshot?.colors?.length || 0), 0);
  }, [reports]);

  return (
    <main className="workspace-page">
      <CursorSpotlight />
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

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
          <span className="brand-version">WORKSPACE</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <UserMenu />
          <Link href="/#url-input-wrap" className="header-cta">
            <Plus size={14} /> New analysis
          </Link>
        </div>
      </header>

      <div className="workspace-content">
        <div className="workspace-hero">
          <div>
            <span className="eyebrow" style={{ color: 'var(--cyan)', font: '10px var(--mono)', letterSpacing: '.14em' }}>
              PERSONAL REPOSITORY
            </span>
            <h1>
              Your design <em>workspace.</em>
            </h1>
            <p>
              Persistent, reverse-engineered design systems saved to your account. Open any spec, copy tokens, or export bundles anytime.
            </p>
          </div>

          <div className="workspace-actions">
            <button
              type="button"
              className="dl-button dl-button-secondary"
              onClick={() => void loadReports()}
              title="Refresh reports"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <Link href="/" className="dl-button dl-button-default">
              <Plus size={14} /> Analyze URL
            </Link>
          </div>
        </div>

        <div className="workspace-stats-row">
          <div className="workspace-stat-card">
            <div className="workspace-stat-icon">
              <FolderGit2 size={20} />
            </div>
            <div>
              <b>{reports.length}</b>
              <small>SAVED SYSTEMS</small>
            </div>
          </div>

          <div className="workspace-stat-card">
            <div className="workspace-stat-icon" style={{ color: 'var(--amber)' }}>
              <Star size={20} />
            </div>
            <div>
              <b>{reports.filter((r) => r.is_favorite).length}</b>
              <small>FAVORITES</small>
            </div>
          </div>

          <div className="workspace-stat-card">
            <div className="workspace-stat-icon" style={{ color: 'var(--cyan)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <b>{totalTokens}</b>
              <small>DETECTED TOKENS</small>
            </div>
          </div>
        </div>

        <div className="workspace-toolbar">
          <div className="workspace-search-wrap">
            <Search size={15} />
            <input
              type="search"
              className="workspace-search-input"
              placeholder="Filter by brand name or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Filter saved systems"
            />
          </div>

          <div className="workspace-filters">
            <button
              type="button"
              className={`workspace-filter-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Systems ({reports.length})
            </button>
            <button
              type="button"
              className={`workspace-filter-chip ${filter === 'favorites' ? 'active' : ''}`}
              onClick={() => setFilter('favorites')}
            >
              <Star size={13} /> Favorites ({reports.filter((r) => r.is_favorite).length})
            </button>
          </div>
        </div>

        {error && (
          <div className="auth-alert auth-alert-error" style={{ marginBottom: 24 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadReports()}
              style={{ marginLeft: 'auto', textDecoration: 'underline', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="workspace-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="report-card"
                style={{ height: 210, opacity: 0.6, animation: 'pulse 1.5s infinite' }}
              >
                <div style={{ height: 20, width: '60%', background: 'var(--border)', borderRadius: 4 }} />
                <div style={{ height: 14, width: '40%', background: 'var(--border)', borderRadius: 4 }} />
                <div style={{ height: 36, width: '100%', background: 'var(--border)', borderRadius: 6, marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="workspace-empty-card">
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(143, 123, 255, 0.12)',
                border: '1px solid var(--accent)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent)',
              }}
            >
              <FolderGit2 size={24} />
            </div>
            <h3>
              {search || filter === 'favorites'
                ? 'No matching systems found.'
                : 'Your workspace is empty.'}
            </h3>
            <p>
              {search || filter === 'favorites'
                ? 'Try adjusting your search filters or clearing the favorite filter.'
                : 'Analyze your first public website and save its 12-section design system to keep it here permanently.'}
            </p>
            {search || filter === 'favorites' ? (
              <button
                type="button"
                className="dl-button dl-button-secondary"
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
              >
                Clear filters
              </button>
            ) : (
              <Link href="/" className="dl-button dl-button-default">
                <Plus size={14} /> Analyze your first website
              </Link>
            )}
          </div>
        ) : (
          <div className="workspace-grid">
            {filteredReports.map((report) => {
              const domain = new URL(report.url).hostname;
              const colors = report.snapshot?.colors || [];
              const fonts = report.snapshot?.fonts || [];

              return (
                <div key={report.id} className="report-card">
                  <div className="report-card-top">
                    <div>
                      <div className="report-card-brand">
                        <span className="tiny-live-dot" />
                        <span>{report.brand_name}</span>
                      </div>
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noreferrer"
                        className="report-card-url"
                        title={report.url}
                      >
                        <ExternalLink size={11} /> {domain}
                      </a>
                    </div>

                    <button
                      type="button"
                      className={`report-card-fav-btn ${report.is_favorite ? 'is-favorite' : ''}`}
                      onClick={() => void toggleFavorite(report)}
                      title={report.is_favorite ? 'Remove favorite' : 'Mark as favorite'}
                      aria-label="Toggle favorite"
                    >
                      <Star size={18} fill={report.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  {colors.length > 0 && (
                    <div className="report-card-palette">
                      {colors.slice(0, 8).map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          className="report-card-swatch"
                          style={{ background: c.hex }}
                          title={`Click to copy: ${c.name} (${c.hex})`}
                          onClick={() => copyHex(c.hex)}
                          aria-label={`Copy color ${c.hex}`}
                        />
                      ))}
                    </div>
                  )}

                  <div className="report-card-meta">
                    <span>
                      {fonts.length > 0 ? fonts[0].family.split(',')[0] : 'System UI'}
                    </span>
                    <span>
                      {new Date(report.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="report-card-actions">
                    <Link
                      href={`/analyze/${report.id}`}
                      className="dl-button dl-button-default dl-button-sm"
                    >
                      <Eye size={13} /> Open Spec
                    </Link>

                    <button
                      type="button"
                      className="dl-button dl-button-secondary dl-button-sm"
                      onClick={() => void downloadExport(report, 'md')}
                      disabled={busyExportId === `${report.id}-md`}
                      title="Download Markdown"
                    >
                      {busyExportId === `${report.id}-md` ? (
                        <LoaderCircle size={13} className="spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      MD
                    </button>

                    <button
                      type="button"
                      className="dl-button dl-button-secondary dl-button-sm"
                      onClick={() => void downloadExport(report, 'zip')}
                      disabled={busyExportId === `${report.id}-zip`}
                      title="Download ZIP Bundle"
                    >
                      {busyExportId === `${report.id}-zip` ? (
                        <LoaderCircle size={13} className="spin" />
                      ) : (
                        <FileArchive size={13} />
                      )}
                      ZIP
                    </button>

                    <button
                      type="button"
                      className="dl-button dl-button-danger dl-button-sm"
                      onClick={() => setDeleteModalReport(report)}
                      title="Delete saved report"
                      aria-label="Delete saved report"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteModalReport && (
        <div className="cookie-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cookie-modal" style={{ maxWidth: 440 }}>
            <span className="eyebrow" style={{ color: 'var(--danger)', font: '10px var(--mono)', letterSpacing: '.14em' }}>
              CONFIRM REMOVAL
            </span>
            <h2 style={{ fontSize: 22, margin: '8px 0 10px' }}>
              Delete <em>{deleteModalReport.brand_name}?</em>
            </h2>
            <p style={{ color: 'var(--text-soft)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              This will remove this saved design system report from your workspace. You can re-run the public URL anytime, but any notes or customizations will be cleared.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="dl-button dl-button-secondary"
                onClick={() => setDeleteModalReport(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dl-button dl-button-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? <LoaderCircle size={14} className="spin" /> : <Trash2 size={14} />}
                Confirm Delete
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
