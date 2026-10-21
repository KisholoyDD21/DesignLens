'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export type Theme = 'dark' | 'light';
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  useEffect(() => {
    const stored = localStorage.getItem('designlens-theme') as Theme | null;
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const next = stored === 'light' || stored === 'dark' ? stored : preferred;
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('designlens-theme', next);
    setTheme(next);
  };
  return <button className="icon-button theme-button" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span className="theme-icon theme-icon-sun"><Sun size={16}/></span><span className="theme-icon theme-icon-moon"><Moon size={16}/></span></button>;
}
