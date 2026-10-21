import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const skippedDirs = new Set(['.git', '.next', 'node_modules', '.vercel', 'coverage', 'artifacts']);
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.yml', '.yaml', '.md', '.env']);
const allowedEnv = new Set(['.env.example']);
const problems = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (skippedDirs.has(name)) continue;
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) { walk(full); continue; }
    const extension = name.includes('.') ? `.${name.split('.').pop()}` : '';
    if (!extensions.has(extension) && !allowedEnv.has(name)) continue;
    if (name.startsWith('.env') && !allowedEnv.has(name)) continue;
    const text = readFileSync(full, 'utf8');
    const file = relative(root, full);
    if (/NEXT_PUBLIC_(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|LLM_API_KEY|AWS_SECRET_ACCESS_KEY|PRIVATE_KEY)/i.test(text)) problems.push(`${file}: client-prefixed environment variable appears to expose a secret`);
    if (/(?:sk-[A-Za-z0-9_-]{24,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,})/.test(text)) problems.push(`${file}: possible hard-coded API token; verify and remove if real`);
  }
}
walk(root);
if (problems.length) {
  console.error(problems.map((p) => `FAIL ${p}`).join('\n'));
  process.exit(1);
}
console.log('PASS    No common hard-coded API-token patterns or known client-prefixed secret names found.');
console.log('Note: this heuristic is not a substitute for provider-side secret scanning or history scanning.');
