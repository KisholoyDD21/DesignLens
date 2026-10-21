import { lookup } from 'node:dns/promises';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal', 'metadata', 'kubernetes.default.svc']);

function isPublicIp(address: string) {
  try {
    const parsed = ipaddr.parse(address);
    // ipaddr's non-unicast ranges include loopback, private, link-local, CGNAT,
    // multicast, reserved, IPv4-mapped and unique-local IPv6 addresses.
    return parsed.range() === 'unicast';
  } catch { return false; }
}

export async function assertPublicHttpUrl(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Enter a valid, complete website URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only the standard HTTP and HTTPS ports are allowed.');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test')) {
    throw new Error('Local and internal network destinations are blocked.');
  }
  if (net.isIP(host)) {
    if (!isPublicIp(host)) throw new Error('Private or reserved IP addresses are blocked.');
  } else {
    let records: Array<{ address: string }>;
    try { records = await lookup(host, { all: true, verbatim: true }) as Array<{ address: string }>; }
    catch { throw new Error('This hostname could not be resolved. Check the URL and try again.'); }
    if (!records.length || records.some((record) => !isPublicIp(record.address))) {
      throw new Error('This hostname resolves to a private or reserved network address.');
    }
  }
  url.hash = '';
  return url;
}

async function safeRobotsFetch(url: URL) {
  let current = new URL('/robots.txt', url.origin);
  for (let i = 0; i < 4; i++) {
    await assertPublicHttpUrl(current.toString());
    const response = await fetch(current, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(3500), headers: { 'user-agent': 'DesignLensBot/1.0 (+https://designlens.app/bot)' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return null;
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) return response.status === 404 ? '' : null;
    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let text = '';
    while (text.length < 200_000) {
      const { done, value } = await reader.read();
      if (done) { text += decoder.decode(); break; }
      text += decoder.decode(value, { stream: true });
      if (text.length >= 200_000) { await reader.cancel().catch(() => undefined); break; }
    }
    return text.slice(0, 200_000);
  }
  return null;
}

function robotsAllows(robots: string, pathname: string) {
  const lines = robots.split(/\r?\n/).map(line => line.split('#')[0].trim()).filter(Boolean);
  const groups: Array<{ agents: string[]; rules: Array<{ allow: boolean; path: string }> }> = [];
  let group: { agents: string[]; rules: Array<{ allow: boolean; path: string }> } | null = null;
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if ((key === 'allow' || key === 'disallow') && group && value) {
      group.rules.push({ allow: key === 'allow', path: value });
    }
  }
  const matching = groups.filter(g => g.agents.some(a => a === '*' || a.includes('designlens')));
  const rules = matching.flatMap(g => g.rules).filter(r => pathname.startsWith(r.path)).sort((a, b) => b.path.length - a.path.length);
  return rules.length === 0 || rules[0].allow;
}

export async function assertRobotsAllowed(url: URL) {
  const robots = await safeRobotsFetch(url);
  if (robots === null) return { allowed: true, note: 'robots.txt could not be read; the site may restrict automated access.' };
  if (!robotsAllows(robots, url.pathname)) throw new Error('This page is disallowed by the site’s robots.txt policy.');
  return { allowed: true, note: '' };
}

export async function validateRequestTarget(rawUrl: string) {
  return assertPublicHttpUrl(rawUrl);
}
