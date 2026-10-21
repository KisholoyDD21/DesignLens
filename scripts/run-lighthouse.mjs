import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const target = process.env.LIGHTHOUSE_URL || 'http://localhost:3000';
const outputDir = process.env.LIGHTHOUSE_OUTPUT_DIR || 'artifacts';
await mkdir(outputDir, { recursive: true });
const args = [
  '--yes', 'lighthouse@latest', target,
  '--only-categories=performance,accessibility,best-practices,seo',
  '--output=html', '--output=json',
  `--output-path=${outputDir}/lighthouse-report`,
  '--chrome-flags=--headless=new --no-sandbox',
];
const child = spawn('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
child.on('error', (error) => { console.error('Unable to start Lighthouse. Install Node.js/npm and retry.', error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
