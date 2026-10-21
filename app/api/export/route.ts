import { NextRequest } from 'next/server';
import JSZip from 'jszip';
import { z } from 'zod';
import type { WebsiteSnapshot } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const schema = z.object({
  format:z.enum(['md','zip']), markdown:z.string().max(2_000_000),
  filename:z.string().max(120).optional(),
  tokens:z.unknown().optional(), screenshotDataUrl:z.string().max(8_000_000).optional(),
});
function safeFilename(value: string) { return value.toLowerCase().replace(/[^a-z0-9-_]+/g,'-').replace(/^-|-$/g,'').slice(0,90) || 'design-system'; }
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({error:'Invalid JSON body.'},{status:400}); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({error:'Invalid export payload.'},{status:400});
  const filename = safeFilename(parsed.data.filename || 'design-system');
  if (parsed.data.format === 'md') return new Response(parsed.data.markdown, { headers:{ 'Content-Type':'text/markdown; charset=utf-8', 'Content-Disposition':`attachment; filename="${filename}.md"`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } });
  const zip = new JSZip();
  zip.file('design.md', parsed.data.markdown);
  zip.file('tokens.json', JSON.stringify(parsed.data.tokens ?? {}, null, 2));
  if (parsed.data.screenshotDataUrl?.startsWith('data:image/')) {
    const match = parsed.data.screenshotDataUrl.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/=]+)$/);
    if (match && match[2].length < 7_500_000) zip.file(`screenshot.${match[1] === 'jpeg' ? 'jpg' : match[1]}`, match[2], {base64:true});
  }
  const output = await zip.generateAsync({ type:'uint8array', compression:'DEFLATE', compressionOptions:{level:6} });
  return new Response(Buffer.from(output), { headers:{ 'Content-Type':'application/zip', 'Content-Disposition':`attachment; filename="${filename}.zip"`, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } });
}
