import type { AnalysisResult } from './types';

type CacheEntry = { result: AnalysisResult; expiresAt: number };
type RateEntry = { count: number; resetAt: number };
type Store = { cache: Map<string, CacheEntry>; jobs: Map<string, AnalysisResult>; rate: Map<string, RateEntry>; activeAnalyses: number };
const root = globalThis as typeof globalThis & { __designLensStore?: Store };
const store: Store = root.__designLensStore ??= { cache: new Map(), jobs: new Map(), rate: new Map(), activeAnalyses: 0 };
const TTL = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 100;
const MAX_JOBS = 100;
const MAX_RATE_KEYS = 10_000;
const MAX_ACTIVE_ANALYSES = Math.max(1, Number(process.env.DESIGNLENS_MAX_CONCURRENT_ANALYSES || 3));

function prune() {
  const now = Date.now();
  for (const [key, item] of store.cache) if (item.expiresAt < now) store.cache.delete(key);
  for (const [id, item] of store.jobs) if (item.createdAt < now - TTL) store.jobs.delete(id);
  for (const [key, item] of store.rate) if (item.resetAt <= now) store.rate.delete(key);
  while (store.cache.size > MAX_CACHE_ENTRIES) store.cache.delete(store.cache.keys().next().value!);
  while (store.jobs.size > MAX_JOBS) store.jobs.delete(store.jobs.keys().next().value!);
  while (store.rate.size > MAX_RATE_KEYS) store.rate.delete(store.rate.keys().next().value!);
}

export function acquireAnalysisSlot(): (() => void) | null {
  if (store.activeAnalyses >= MAX_ACTIVE_ANALYSES) return null;
  store.activeAnalyses += 1;
  let released = false;
  return () => { if (!released) { released = true; store.activeAnalyses = Math.max(0, store.activeAnalyses - 1); } };
}

export function getCached(key: string) {
  const item = store.cache.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) { store.cache.delete(key); return null; }
  return item.result;
}
export function setCached(key: string, result: AnalysisResult) {
  store.cache.set(key, { result, expiresAt: Date.now() + TTL });
  store.jobs.set(result.id, result);
  prune();
}
export function getJob(id: string) { const result = store.jobs.get(id) ?? null; if (result && result.createdAt < Date.now() - TTL) { store.jobs.delete(id); return null; } return result; }
export function setJob(result: AnalysisResult) { store.jobs.set(result.id, result); prune(); }
export function checkRateLimit(key: string) {
  prune();
  const now = Date.now();
  const max = Math.max(1, Number(process.env.ANALYZE_RATE_LIMIT || 5));
  const windowMs = Math.max(60_000, Number(process.env.ANALYZE_RATE_WINDOW_MS || 600_000));
  const current = store.rate.get(key);
  if (!current || current.resetAt <= now) { store.rate.set(key, { count: 1, resetAt: now + windowMs }); prune(); return { allowed: true, remaining: max - 1, resetAt: now + windowMs }; }
  if (current.count >= max) return { allowed: false, remaining: 0, resetAt: current.resetAt };
  current.count++;
  return { allowed: true, remaining: max - current.count, resetAt: current.resetAt };
}
