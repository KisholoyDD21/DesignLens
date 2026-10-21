import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const required = [
  'app/(marketing)/page.tsx', 'app/analyze/[id]/page.tsx', 'app/api/analyze/route.ts', 'app/api/export/route.ts',
  'app/globals.css', 'app/layout.tsx', 'components/hero-url-input.tsx', 'components/analysis-loader.tsx',
  'components/design-md-viewer.tsx', 'components/token-visualizer.tsx', 'components/cursor-spotlight.tsx',
  'components/command-palette.tsx', 'components/theme-toggle.tsx', 'lib/scraper.ts', 'lib/security.ts',
  'lib/css-analysis.ts', 'lib/extract-tokens.ts', 'lib/screenshot-only.ts', 'lib/synthesize-md.ts',
  'lib/jobs.ts', 'prompts/design-md-synthesis.ts', 'styles/tokens.css', 'README.md', 'vercel.json',
  'docs/previews/landing-preview.svg', 'docs/previews/report-preview.svg',
  'app/privacy/page.tsx', 'app/terms/page.tsx', 'app/not-found.tsx', 'app/robots.ts', 'app/sitemap.ts',
  'app/opengraph-image.tsx', 'app/icon.svg', 'middleware.ts', 'components/cookie-consent.tsx',
  'components/legal-layout.tsx', 'components/cookie-settings-trigger.tsx', 'SECURITY.md', 'CONTRIBUTING.md', 'LICENSE', 'docs/production-readiness.md',
  // Authentication & Workspace additions
  'app/login/page.tsx', 'app/signup/page.tsx', 'app/forgot-password/page.tsx', 'app/reset-password/page.tsx',
  'app/auth/callback/route.ts', 'app/dashboard/page.tsx', 'app/settings/page.tsx', 'app/settings/security/page.tsx',
  'app/api/reports/route.ts', 'app/api/reports/[id]/route.ts', 'app/api/account/route.ts', 'app/api/account/delete/route.ts',
  'lib/supabase/client.ts', 'lib/supabase/server.ts', 'lib/supabase/middleware.ts', 'lib/supabase/config.ts',
  'lib/auth-validation.ts', 'components/user-menu.tsx', 'components/auth/auth-shell.tsx', 'components/auth/oauth-buttons.tsx',
  'supabase/migrations/20261022000000_init_auth_and_workspace.sql'
];
const missing = required.filter(file => !existsSync(join(root, file)));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const synthesis = readFileSync(join(root, 'lib/synthesize-md.ts'), 'utf8');
const sections = [...synthesis.matchAll(/^## (\d+)\./gm)].map(match => Number(match[1]));
const route = readFileSync(join(root, 'app/api/analyze/route.ts'), 'utf8');
const checks = [
  ['12 report sections exist in the synthesis template', sections.length === 12 && sections.every((n, i) => n === i + 1)],
  ['URL and screenshot-only request modes exist', route.includes("z.enum(['url', 'screenshot'])") && route.includes('analyzeScreenshotOnly')],
  ['URL mode uses the public HTTP URL guard', route.includes('assertPublicHttpUrl')],
  ['Streaming events and final result are present', route.includes("type:'chunk'") && route.includes("type:'result'")],
  ['Markdown and ZIP export route exists', existsSync(join(root, 'app/api/export/route.ts'))],
  ['Vercel function duration is configured', readFileSync(join(root, 'vercel.json'), 'utf8').includes('maxDuration')],
  ['TypeScript check script is present', typeof packageJson.scripts?.typecheck === 'string'],
  ['Privacy, terms, 404, robots and sitemap routes exist', ['app/privacy/page.tsx','app/terms/page.tsx','app/not-found.tsx','app/robots.ts','app/sitemap.ts'].every(p => existsSync(join(root,p)))],
  ['Consent is implemented without default analytics loading', existsSync(join(root,'components/cookie-consent.tsx')) && readFileSync(join(root,'components/cookie-consent.tsx'),'utf8').includes('localStorage')],
  ['Secret scanning and Lighthouse scripts are configured', typeof packageJson.scripts?.['verify:secrets'] === 'string' && typeof packageJson.scripts?.lighthouse === 'string'],
  ['HTTPS, HSTS, and permanent redirects are configured', existsSync(join(root,'middleware.ts')) && readFileSync(join(root,'middleware.ts'),'utf8').includes('NextResponse.redirect(target, 301)') && readFileSync(join(root,'next.config.ts'),'utf8').includes('Strict-Transport-Security')],
  ['Canonical, Open Graph, and Twitter metadata are present', readFileSync(join(root,'app/layout.tsx'),'utf8').includes('openGraph:') && readFileSync(join(root,'app/layout.tsx'),'utf8').includes('twitter:') && readFileSync(join(root,'app/layout.tsx'),'utf8').includes("alternates: { canonical: '/' }")],
  // Auth & Workspace checks
  ['Authentication routes exist (/login, /signup, /forgot-password, /reset-password)', ['app/login/page.tsx','app/signup/page.tsx','app/forgot-password/page.tsx','app/reset-password/page.tsx'].every(p => existsSync(join(root,p)))],
  ['Workspace dashboard and settings routes exist', ['app/dashboard/page.tsx','app/settings/page.tsx','app/settings/security/page.tsx'].every(p => existsSync(join(root,p)))],
  ['Supabase Auth integration and session middleware are configured', existsSync(join(root,'lib/supabase/server.ts')) && existsSync(join(root,'lib/supabase/client.ts')) && existsSync(join(root,'lib/supabase/middleware.ts'))],
  ['Database schema migration with RLS policies exists', existsSync(join(root,'supabase/migrations/20261022000000_init_auth_and_workspace.sql')) && readFileSync(join(root,'supabase/migrations/20261022000000_init_auth_and_workspace.sql'),'utf8').includes('ROW LEVEL SECURITY')],
];
for (const file of missing) console.error(`MISSING  ${file}`);
for (const [label, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'}    ${label}`);
if (missing.length || checks.some(([, pass]) => !pass)) process.exit(1);
console.log(`\nSource verification passed: ${required.length} required paths found; ${checks.length} structural checks passed.`);
console.log('Note: this is not a substitute for dependency-backed TypeScript, lint, production build, or browser tests.');
