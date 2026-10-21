'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Command, FileText, Github, Moon, Search, Sparkles, Sun, X } from 'lucide-react';

type Action = { id:string; label:string; description:string; keys:string; icon: ReactNode; run:()=>void };
type Props = { onAction:(action:string)=>void; };

export default function CommandPalette({ onAction }: Props) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(v => !v);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => document.getElementById('command-search')?.focus(), 20);
      return () => {
        document.body.style.overflow = '';
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const actions: Action[] = useMemo(() => [
    { id: 'analyze', label: 'Analyze a website', description: 'Jump to the URL input', keys: 'A', icon: <Sparkles size={17} />, run: () => onAction('analyze') },
    { id: 'features', label: 'Explore the toolkit', description: 'See how DesignLens works', keys: 'F', icon: <FileText size={17} />, run: () => onAction('features') },
    { id: 'theme', label: 'Toggle color theme', description: 'Switch dark / light mode', keys: 'T', icon: <Sun size={17} />, run: () => onAction('theme') },
    { id: 'docs', label: 'Project documentation', description: 'Read setup and architecture', keys: 'D', icon: <Command size={17} />, run: () => onAction('docs') },
    { id: 'github', label: 'Source repository', description: 'Open project source when configured', keys: '↗', icon: <Github size={17} />, run: () => onAction('github') },
  ], [onAction]);

  const filtered = useMemo(
    () => actions.filter(a => (a.label + ' ' + a.description).toLowerCase().includes(query.toLowerCase())),
    [actions, query]
  );

  return (
    <>
      <button
        type="button"
        className="command-hint"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <Command size={14} />
        <span>Quick actions</span>
        <kbd>⌘ K</kbd>
      </button>

      {mounted && open && createPortal(
        <div
          className="command-backdrop"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <section className="command-panel" role="dialog" aria-modal="true" aria-label="Command palette">
            <div className="command-search-row">
              <Search size={17} />
              <input
                id="command-search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveIndex(i => (filtered.length ? (i + 1) % filtered.length : 0));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveIndex(i => (filtered.length ? (i - 1 + filtered.length) % filtered.length : 0));
                  } else if (e.key === 'Enter' && filtered[activeIndex]) {
                    e.preventDefault();
                    setOpen(false);
                    filtered[activeIndex].run();
                  }
                }}
                placeholder="What would you like to do?"
                aria-label="Search commands"
                aria-activedescendant={filtered[activeIndex] ? `command-${filtered[activeIndex].id}` : undefined}
              />
              <kbd>ESC</kbd>
              <button
                type="button"
                className="bare-icon"
                onClick={() => setOpen(false)}
                aria-label="Close command palette"
              >
                <X size={17} />
              </button>
            </div>
            <div className="command-eyebrow">SUGGESTED ACTIONS</div>
            <div className="command-list">
              {filtered.map((action, index) => (
                <button
                  type="button"
                  id={`command-${action.id}`}
                  className={`command-item ${index === activeIndex ? 'active' : ''}`}
                  key={action.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    setOpen(false);
                    action.run();
                  }}
                >
                  <span className="command-item-icon">{action.icon}</span>
                  <span className="command-item-copy">
                    <strong>{action.label}</strong>
                    <small>{action.description}</small>
                  </span>
                  <kbd>{action.keys}</kbd>
                  <ArrowRight size={14} className="command-arrow" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="command-empty">No matching commands. Try “analyze” or “theme”.</div>
              )}
            </div>
            <div className="command-footer">
              <span><Command size={12} /> <b>K</b> to open anywhere</span>
              <span>↑ ↓ to browse · ↵ to select</span>
            </div>
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
