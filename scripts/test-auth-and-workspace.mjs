import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Project imports
import {
  checkPasswordRequirements,
  isPasswordValid,
  getSafeRedirectUrl,
  sanitizeAuthError,
  emailSchema,
} from '../lib/auth-validation.ts';
import { isSupabaseConfigured } from '../lib/supabase/config.ts';

const root = fileURLToPath(new URL('../', import.meta.url));

test('Authentication: Password requirements and validation', () => {
  // Weak passwords
  assert.equal(isPasswordValid('short'), false, 'Should reject password shorter than 8 chars');
  assert.equal(isPasswordValid('alllowercase123'), false, 'Should reject password with no uppercase');
  assert.equal(isPasswordValid('ALLUPPERCASE123'), false, 'Should reject password with no lowercase');
  assert.equal(isPasswordValid('NoNumbersHere!'), false, 'Should reject password with no numbers');

  // Strong password
  assert.equal(isPasswordValid('DesignLens2026!'), true, 'Should accept valid strong password');

  // Checklist breakdown
  const reqs = checkPasswordRequirements('Aa1');
  const lengthReq = reqs.find(r => r.id === 'length');
  const upperReq = reqs.find(r => r.id === 'uppercase');
  const lowerReq = reqs.find(r => r.id === 'lowercase');
  const numberReq = reqs.find(r => r.id === 'number');

  assert.equal(lengthReq?.met, false);
  assert.equal(upperReq?.met, true);
  assert.equal(lowerReq?.met, true);
  assert.equal(numberReq?.met, true);
});

test('Authentication: Email format validation', () => {
  assert.equal(emailSchema.safeParse('designer@studio.com').success, true);
  assert.equal(emailSchema.safeParse('user.name+tag@sub.domain.org').success, true);
  assert.equal(emailSchema.safeParse('not-an-email').success, false);
  assert.equal(emailSchema.safeParse('@missinguser.com').success, false);
  assert.equal(emailSchema.safeParse('missingdomain@').success, false);
  assert.equal(emailSchema.safeParse('').success, false);
});

test('Security: Open redirect protection in getSafeRedirectUrl', () => {
  // Safe relative paths
  assert.equal(getSafeRedirectUrl('/dashboard'), '/dashboard');
  assert.equal(getSafeRedirectUrl('/analyze/3a79d380-4ecb'), '/analyze/3a79d380-4ecb');
  assert.equal(getSafeRedirectUrl('/settings/security'), '/settings/security');
  assert.equal(getSafeRedirectUrl('/dashboard?tab=favorites'), '/dashboard?tab=favorites');

  // Attack vectors (Protocol relative & absolute redirects)
  assert.equal(getSafeRedirectUrl('//evil.com'), '/dashboard', 'Must block protocol-relative //evil.com');
  assert.equal(getSafeRedirectUrl('/\\evil.com'), '/dashboard', 'Must block backslash redirect /\\evil.com');
  assert.equal(getSafeRedirectUrl('\\\\evil.com'), '/dashboard', 'Must block windows network redirect \\\\evil.com');
  assert.equal(getSafeRedirectUrl('https://evil.com/phishing'), '/dashboard', 'Must block absolute external URL');
  assert.equal(getSafeRedirectUrl('http://attacker.org'), '/dashboard', 'Must block absolute HTTP URL');
  assert.equal(getSafeRedirectUrl('javascript:alert(1)'), '/dashboard', 'Must block javascript URI');
  assert.equal(getSafeRedirectUrl(null), '/dashboard');
  assert.equal(getSafeRedirectUrl(''), '/dashboard');
});

test('Security: Sanitized error messages prevent account enumeration', () => {
  const genericCreds = sanitizeAuthError(new Error('Invalid login credentials'));
  assert.match(genericCreds, /Invalid email or password/);

  const userNotFound = sanitizeAuthError(new Error('User not found'));
  assert.match(userNotFound, /Invalid email or password/);

  const rateLimit = sanitizeAuthError(new Error('Rate limit exceeded: too many requests'));
  assert.match(rateLimit, /Too many login attempts/);

  const alreadyRegistered = sanitizeAuthError(new Error('User already registered'));
  assert.match(alreadyRegistered, /already exists/);
});

test('Database Schema & RLS: Migration verification', () => {
  const migrationPath = join(root, 'supabase/migrations/20261022000000_init_auth_and_workspace.sql');
  assert.equal(existsSync(migrationPath), true, 'SQL migration file must exist');

  const sql = readFileSync(migrationPath, 'utf8');

  // Tables
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.profiles/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.reports/);

  // Row Level Security
  assert.match(sql, /ALTER TABLE public\.profiles ENABLE ROW LEVEL SECURITY;/);
  assert.match(sql, /ALTER TABLE public\.reports ENABLE ROW LEVEL SECURITY;/);

  // RLS Policies with auth.uid() isolation
  assert.match(sql, /CREATE POLICY "Users can view own profile".*auth\.uid\(\) = id/s);
  assert.match(sql, /CREATE POLICY "Users can update own profile".*auth\.uid\(\) = id/s);
  assert.match(sql, /CREATE POLICY "Users can view own reports".*auth\.uid\(\) = user_id/s);
  assert.match(sql, /CREATE POLICY "Users can insert own reports".*auth\.uid\(\) = user_id/s);
  assert.match(sql, /CREATE POLICY "Users can update own reports".*auth\.uid\(\) = user_id/s);
  assert.match(sql, /CREATE POLICY "Users can delete own reports".*auth\.uid\(\) = user_id/s);

  // Cascading deletes on auth.users foreign key
  assert.match(sql, /REFERENCES auth\.users\(id\) ON DELETE CASCADE/);

  // Indexes
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_reports_user_id/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_reports_user_created/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_reports_user_favorite/);

  // Trigger for automatic profile creation
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.handle_new_user/);
  assert.match(sql, /CREATE TRIGGER on_auth_user_created/);

  // Secure account deletion RPC
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.delete_user_account/);
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.delete_user_account\(\) FROM public;/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.delete_user_account\(\) TO authenticated;/);
});

test('Authorization & Route Protection: Route Handlers and Middleware', () => {
  const middlewareCode = readFileSync(join(root, 'middleware.ts'), 'utf8');
  assert.match(middlewareCode, /updateSession/, 'Middleware must call updateSession helper');
  assert.match(middlewareCode, /NextResponse\.redirect\(target, 301\)/, 'Must preserve canonical redirect');

  const supMiddlewareCode = readFileSync(join(root, 'lib/supabase/middleware.ts'), 'utf8');
  assert.match(supMiddlewareCode, /PROTECTED_PREFIXES = \['\/dashboard', '\/settings'\]/);
  assert.match(supMiddlewareCode, /supabase\.auth\.getUser\(\)/, 'Must use getUser() instead of getSession()');
  assert.match(supMiddlewareCode, /getSafeRedirectUrl\(next, '\/dashboard'\)/, 'Auth redirects must reject external and backslash destinations');

  // Reports API route authorization
  const reportsApiCode = readFileSync(join(root, 'app/api/reports/route.ts'), 'utf8');
  assert.match(reportsApiCode, /const user = await getServerUser\(\)/);
  assert.match(reportsApiCode, /if \(!user\)\s*\{\s*return Response\.json/);
  assert.match(reportsApiCode, /status:\s*401/);
  assert.match(reportsApiCode, /\.eq\('user_id', user\.id\)/, 'Enforces server-side user_id filtering');

  // Single report API route authorization
  const singleReportApiCode = readFileSync(join(root, 'app/api/reports/[id]/route.ts'), 'utf8');
  assert.match(singleReportApiCode, /const user = await getServerUser\(\)/);
  assert.match(singleReportApiCode, /\.eq\('user_id', user\.id\)/, 'Cross-user protection on fetch, update, and delete');

  // Account deletion API route authorization
  const deleteAccountApiCode = readFileSync(join(root, 'app/api/account/delete/route.ts'), 'utf8');
  assert.match(deleteAccountApiCode, /const user = await getServerUser\(\)/);
  assert.match(deleteAccountApiCode, /confirmation !== 'DELETE'/);
  assert.match(deleteAccountApiCode, /if \(rpcError\)[\s\S]*status: 500/);
  assert.match(deleteAccountApiCode, /signOut\(\{ scope: 'local' \}\)/);

  const reportListApiCode = readFileSync(join(root, 'app/api/reports/route.ts'), 'utf8');
  assert.match(reportListApiCode, /replace\(\/\[\^\\p\{L\}\\p\{N\}\\s-\]\/gu, ''\)/);
  assert.match(reportListApiCode, /delete snapshot\.screenshotDataUrl/);
});

test('Guest Mode & Public Access: Core product functions without login', () => {
  // Check that public analyze API does NOT mandate a user session
  const analyzeApiCode = readFileSync(join(root, 'app/api/analyze/route.ts'), 'utf8');
  assert.equal(analyzeApiCode.includes('getServerUser'), false, 'Analyze route must remain usable by guests');
  assert.match(analyzeApiCode, /assertPublicHttpUrl/, 'SSRF protections remain active');
  assert.match(analyzeApiCode, /checkRateLimit/, 'Rate limit remains active');

  // Check that export API remains accessible
  const exportApiCode = readFileSync(join(root, 'app/api/export/route.ts'), 'utf8');
  assert.match(exportApiCode, /format:z\.enum\(\['md','zip'\]\)/);

  // Check that analyze/[id] page handles both guest sessions and saved DB reports
  const analyzePageCode = readFileSync(join(root, 'app/analyze/[id]/page.tsx'), 'utf8');
  assert.match(analyzePageCode, /sessionStorage\.getItem\(`designlens-result-\$\{id\}`\)/, 'Reads ephemeral session storage for guests');
  assert.match(analyzePageCode, /\/api\/reports\//, 'Falls back to database for saved workspace reports');
  assert.match(analyzePageCode, /handleSaveToWorkspace/, 'Allows saving to workspace');
});

test('Design System: Dark and light theme tokens & responsive styles', () => {
  const tokensCss = readFileSync(join(root, 'styles/tokens.css'), 'utf8');
  assert.match(tokensCss, /:root \{/);
  assert.match(tokensCss, /:root\[data-theme='light'\] \{/);
  assert.match(tokensCss, /--dl-bg:/);
  assert.match(tokensCss, /--dl-violet:/);
  assert.match(tokensCss, /--dl-cyan:/);

  const globalsCss = readFileSync(join(root, 'app/globals.css'), 'utf8');
  assert.match(globalsCss, /\.auth-page/, 'Authentication layout styles present');
  assert.match(globalsCss, /\.workspace-page/, 'Workspace dashboard styles present');
  assert.match(globalsCss, /\.settings-page/, 'Settings styles present');
  assert.match(globalsCss, /@media \(prefers-reduced-motion: reduce\)/, 'Respects reduced-motion preference');
});
