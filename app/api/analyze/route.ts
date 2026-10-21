import { createHash, randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { scrapeWebsite } from '@/lib/scraper';
import { analyzeScreenshotOnly } from '@/lib/screenshot-only';
import { buildDesignMarkdown } from '@/lib/synthesize-md';
import { acquireAnalysisSlot, checkRateLimit, getCached, getJob, setCached, setJob } from '@/lib/jobs';
import { assertPublicHttpUrl } from '@/lib/security';
import type { AnalysisResult, StreamEvent } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const requestSchema = z.object({
  mode: z.enum(['url', 'screenshot']).optional().default('url'),
  url: z.string().trim().min(8).max(2048).optional(),
  sourceUrl: z.string().trim().max(2048).optional(),
  screenshotDataUrl: z.string().max(4_200_000).optional(),
  forceRefresh: z.boolean().optional().default(false),
});
function jsonFrame(event: StreamEvent) { return `${JSON.stringify(event)}\n`; }
function cacheKeyFor(url: string) { return createHash('sha256').update(url).digest('hex'); }
function clientKey(request: NextRequest) {
  const raw = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return raw.slice(0, 100);
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 }); }
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: 'Invalid request. Check the URL or uploaded screenshot size.' }, { status: 400 });
  const input = parsed.data;
  if (input.mode === 'url' && !input.url) return Response.json({ error: 'Enter a website URL.' }, { status: 400 });
  if (input.mode === 'screenshot' && !input.screenshotDataUrl) return Response.json({ error: 'Upload a PNG, JPEG, or WebP screenshot first.' }, { status: 400 });

  const limited = checkRateLimit(clientKey(request));
  if (!limited.allowed) return Response.json({ error: `Rate limit reached. Try again in ${Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000))} seconds.` }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((limited.resetAt - Date.now()) / 1000))) } });

  // Screenshot-only mode performs no URL fetches; sourceUrl is retained only as user-provided attribution.
  let normalizedUrl: URL | null = null;
  if (input.mode === 'url') {
    try { normalizedUrl = await assertPublicHttpUrl(input.url!); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'This URL is not allowed.' }, { status: 400 }); }
  }
  const key = normalizedUrl ? cacheKeyFor(normalizedUrl.toString()) : null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (event: StreamEvent) => { if (!closed) { try { controller.enqueue(encoder.encode(jsonFrame(event))); } catch { closed = true; } } };
      const close = () => { if (!closed) { closed = true; try { controller.close(); } catch { /* Request already disconnected. */ } } };
      const run = async () => {
        try {
          const cached = key && !input.forceRefresh ? getCached(key) : null;
          if (cached) {
            send({ type:'stage', stage:'cache', label:'Restoring a recent analysis', progress:78, detail:'Using the 24-hour URL cache.' });
            for (const chunk of cached.markdown.match(/[\s\S]{1,180}/g) || []) send({ type:'chunk', text:chunk });
            send({ type:'result', result:cached }); close(); return;
          }
          const releaseSlot = acquireAnalysisSlot();
          if (!releaseSlot) { send({ type:'error', error:'The analysis queue is full. Please retry in a few seconds.', code:'BUSY' }); close(); return; }
          try {
          const snapshot = input.mode === 'screenshot'
            ? await (async () => {
                send({ type:'stage', stage:'screenshot', label:'Sampling screenshot pixels', progress:28, detail:'Reading image dimensions and extracting a representative color palette. No website request will be made.' });
                const output = await analyzeScreenshotOnly(input.screenshotDataUrl!, input.sourceUrl);
                send({ type:'stage', stage:'tokens', label:'Inferring visual tokens', progress:62, detail:'Building a palette and labeling which properties cannot be observed in a static image.' });
                return output;
              })()
            : await scrapeWebsite(normalizedUrl!.toString(), (stage,label,progress,detail) => send({ type:'stage', stage, label, progress, detail }), request.signal);
          send({ type:'stage', stage:input.mode==='screenshot'?'tokens':'synthesis', label:'Composing the report preview', progress:70, detail:'Rendering the 12-section document while the narrative layer prepares its final wording.' });
          const draftMarkdown = await buildDesignMarkdown(snapshot, { useLLM:false });
          for (const chunk of draftMarkdown.match(/[\s\S]{1,420}/g) || []) { send({ type:'chunk', text:chunk }); await new Promise(resolve => setTimeout(resolve, 3)); }
          send({ type:'stage', stage:input.mode==='screenshot'?'tokens':'synthesis', label:'Polishing the design narrative', progress:84, detail:process.env.OPENAI_API_KEY ? 'The evidence-backed report is visible while the optional narrative layer runs.' : 'Finalizing the locally generated report; no external AI key is configured.' });
          const markdown = process.env.OPENAI_API_KEY && input.mode !== 'screenshot' ? await buildDesignMarkdown(snapshot) : draftMarkdown;
          const id = randomUUID();
          const result: AnalysisResult = { id, url:snapshot.url, markdown, snapshot, createdAt:Date.now() };
          if (key) setCached(key, result);
          setJob(result);
          send({ type:'stage', stage:'complete', label:'Design system ready', progress:100, detail:'All 12 sections are assembled.' });
          send({ type:'result', result });
          close();
          } finally { releaseSlot(); }
        } catch (error) {
          let message = error instanceof Error ? error.message : 'Analysis failed. Please try a different public page.';
          if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
            message = 'Playwright browser is not installed. Please run "npx playwright install" in your terminal, or use screenshot-only mode.';
          } else {
            message = message.replace(/[╔═║╚╝│─┌┐└┘]/g, ' ').replace(/\s+/g, ' ').trim();
          }
          send({ type:'error', error:message, code:message.includes('robots.txt') ? 'ROBOTS_DISALLOW' : 'ANALYSIS_FAILED' });
          close();
        }
      };
      void run();
      request.signal.addEventListener('abort', () => { closed = true; }, { once:true });
    },
    cancel() { /* Browser disconnect; browser cleanup occurs in scrapeWebsite finally. */ },
  });
  return new Response(stream, { status:200, headers: { 'Content-Type':'application/x-ndjson; charset=utf-8', 'Cache-Control':'no-store, no-transform', 'X-Content-Type-Options':'nosniff', 'X-Accel-Buffering':'no' } });
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || id.length > 80) return Response.json({ error:'A valid analysis id is required.' }, { status:400 });
  const result = getJob(id);
  if (!result) return Response.json({ error:'This analysis is no longer available in this server instance. Run the URL again to recreate it.' }, { status:404 });
  return Response.json(result, { headers:{ 'Cache-Control':'no-store' } });
}
