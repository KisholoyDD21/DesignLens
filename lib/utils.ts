import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function escapeMarkdown(value: string) {
  return value.replace(/[|`]/g, '\\$&').replace(/[\r\n]+/g, ' ').trim();
}

export function safeText(value: unknown, max = 300) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export function slugify(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'website';
}

export function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const s = hex.replace('#', '').trim();
  if (/^[0-9a-f]{3}$/i.test(s)) return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16)];
  if (/^[0-9a-f]{6}$/i.test(s)) return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  return null;
}

export function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export async function readResponseStream(response: Response, onEvent: (event: Record<string, unknown>) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed (${response.status})`);
  }
  if (!response.body) throw new Error('The server returned an empty response.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      try { onEvent(JSON.parse(line) as Record<string, unknown>); } catch { /* Ignore malformed transport frames. */ }
    }
  }
  if (buffer.trim()) {
    try { onEvent(JSON.parse(buffer) as Record<string, unknown>); } catch { /* Ignore incomplete final frame. */ }
  }
}
