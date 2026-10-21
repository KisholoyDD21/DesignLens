import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.cwd();
const scanRoots = ['app', 'components'];
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(tsx?|md)$/.test(entry.name)) files.push(file);
  }
}
for (const path of scanRoots) if (existsSync(join(root, path))) walk(join(root, path));

const allSourceText = files.map((file) => readFileSync(file, 'utf8')).join('\n');
const routeFiles = new Set();
function walkApp(dir, rel = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walkApp(file, join(rel, entry.name));
    else if (/^(page|route|robots|sitemap|opengraph-image)\.(tsx?|svg)$/.test(entry.name)) routeFiles.add(join(rel, entry.name).split(sep).join('/'));
  }
}
walkApp(join(root, 'app'));
const routes = new Set(['/']);
for (const file of routeFiles) {
  let normalized = file.replace(/\([^/]+\)\//g, '').replace(/\/(page|route|robots|sitemap|opengraph-image)\.(tsx?|svg)$/, '').replace(/^(robots|sitemap|opengraph-image)\.(tsx?|svg)$/, '');
  normalized = normalized.split('/').filter(Boolean).map((segment) => /^\[[^\]]+\]$/.test(segment) ? segment : segment).join('/');
  if (normalized) routes.add('/' + normalized.replaceAll('\\', '/'));
}
for (const file of ['app/icon.svg', 'app/robots.ts', 'app/sitemap.ts', 'app/opengraph-image.tsx']) {
  if (existsSync(join(root, file))) {
    if (file === 'app/icon.svg') routes.add('/icon.svg');
    if (file === 'app/robots.ts') routes.add('/robots.txt');
    if (file === 'app/sitemap.ts') routes.add('/sitemap.xml');
    if (file === 'app/opengraph-image.tsx') routes.add('/opengraph-image');
  }
}
const redirects = new Set(['/home', '/index.html']);
const errors = [];
const scanned = new Set();
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const relativeFile = relative(root, file);
  for (const match of source.matchAll(/\bhref\s*=\s*["']([^"']+)["']/g)) {
    const href = match[1];
    if (href.startsWith('https://') || href.startsWith('http://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:')) continue;
    if (href.startsWith('#')) {
      if (file.includes('(marketing)')) {
        const id = href.slice(1);
        if (!new RegExp(`\\bid\\s*=\\s*["']${id.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}["']`).test(allSourceText)) errors.push(`${relativeFile}: anchor ${href} not found in this file`);
      }
      continue;
    }
    if (!href.startsWith('/')) continue;
    const path = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    scanned.add(path);
    const found = routes.has(path) || redirects.has(path) || [...routes].some((route) => route.includes('[') && new RegExp('^' + route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[[^/]+\\\]/g, '[^/]+') + '$').test(path));
    if (!found) errors.push(`${relativeFile}: internal link ${path} has no matching App Router route or redirect`);
  }
}
if (errors.length) {
  console.error(errors.map((error) => `FAIL ${error}`).join('\n'));
  process.exit(1);
}
console.log(`PASS    Checked ${scanned.size} literal internal paths across ${files.length} files.`);
console.log('Note: this source scanner cannot detect runtime-generated destinations or verify external websites.');
