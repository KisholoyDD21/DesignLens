import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import { extractTokensFromEvidence, type BrowserEvidence } from './extract-tokens';
import type { WebsiteSnapshot } from './types';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Analyze a user-uploaded screenshot without making any network requests. */
export async function analyzeScreenshotOnly(dataUrl: string, sourceUrl?: string): Promise<WebsiteSnapshot> {
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) {
    throw new Error('Upload a valid PNG, JPEG, or WebP screenshot.');
  }
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  if (base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 128) throw new Error('Screenshot exceeds the 3 MB upload limit.');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Screenshot exceeds the 3 MB upload limit.');

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: 40_000_000 }).metadata();
    if (!metadata.width || !metadata.height || metadata.width > 10_000 || metadata.height > 10_000 || metadata.width * metadata.height > 40_000_000) {
      throw new Error('Screenshot dimensions exceed the supported limit (10,000 px per side / 40 megapixels).');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('dimensions exceed')) throw error;
    throw new Error('This image could not be decoded. Try a PNG, JPEG, or WebP screenshot.');
  }

  const { data, info } = await sharp(buffer, { limitInputPixels: 40_000_000 })
    .flatten({ background: '#ffffff' })
    .resize({ width: 64, height: 64, fit: 'inside' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<string, { count: number; rgb: [number, number, number] }>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] ?? 0, g = data[i + 1] ?? 0, b = data[i + 2] ?? 0;
    // 5-bit color buckets keep tiny antialiasing variations from dominating the palette.
    const br = r >> 3, bg = g >> 3, bb = b >> 3;
    const key = `${br}:${bg}:${bb}`;
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else buckets.set(key, { count: 1, rgb: [Math.min(255, br * 8 + 4), Math.min(255, bg * 8 + 4), Math.min(255, bb * 8 + 4)] });
  }
  const palette = [...buckets.values()].sort((a, b) => b.count - a.count).slice(0, 18);
  const colorCounts = palette.map(item => ({ value: `#${item.rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`, count: item.count }));
  const dominant = colorCounts[0]?.value || '#171722';
  const validSource = (() => {
    try {
      const parsed = new URL(sourceUrl || 'https://screenshot-only.invalid/');
      if (!['http:', 'https:'].includes(parsed.protocol)) return 'https://screenshot-only.invalid/';
      parsed.username = ''; parsed.password = ''; parsed.search = ''; parsed.hash = '';
      return parsed.toString();
    } catch { return 'https://screenshot-only.invalid/'; }
  })();
  const emptyEvidence: BrowserEvidence = {
    url: validSource,
    title: 'Screenshot-only analysis',
    description: 'Generated from a user-provided screenshot. Original page source was not fetched.',
    brandName: 'Screenshot-only analysis', tagline: 'A visual snapshot, analyzed without source access.',
    logoDescription: 'Logo cannot be identified reliably from color sampling alone.', favicon: '',
    colorCounts, cssSources: [], warnings: [], cssVariables: {}, headings: [], sections: [],
    buttons: [], buttonLabels: [], buttonLabelsMissing: 0, fonts: [], spacing: [], shadows: [], radii: [],
    motions: [], animationNames: [], imageCount: 0, svgCount: 0, imageAlts: [], imagesMissingAlt: 0,
    links: [], bodyBackground: dominant, bodyTextColor: '#171717', bodyFont: 'Unknown from screenshot',
    bodyFontSize: 'unknown', bodyLineHeight: 'unknown', viewport: { width: metadata.width!, height: metadata.height! },
    pageWidth: metadata.width!, headerPosition: 'unknown from screenshot', footerPresent: false,
    gridColumns: [], containerWidths: [], mediaQueries: [], cssRuleTexts: [], focusStyle: false,
    bodyTextSample: '', screenshotDominant: dominant,
  };
  const previewBuffer = await sharp(buffer, { limitInputPixels: 40_000_000 }).resize({ width: 1440, height: 2400, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 66, mozjpeg: true }).toBuffer();
  const previewDataUrl = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`;
  const snapshot = extractTokensFromEvidence({
    url: validSource,
    finalUrl: validSource,
    title: 'Screenshot-only analysis',
    description: `Screenshot dimensions: ${metadata.width} × ${metadata.height}px. No website requests were made.`,
    brandName: 'Screenshot-only analysis',
    tagline: 'A visual snapshot, analyzed without source access.',
    logoDescription: 'Logo and brand marks are not confidently identified in screenshot-only mode.',
    favicon: '', evidence: emptyEvidence, screenshotDataUrl: previewDataUrl,
  });
  const sampledHexes = new Set(colorCounts.map(color => color.value.toUpperCase()));
  snapshot.colors = snapshot.colors.map(color => ({ ...color, source: sampledHexes.has(color.hex.toUpperCase()) ? 'screenshot' as const : 'inferred' as const }));
  snapshot.fonts = [{ family: 'Unknown from screenshot', weights: [], sampleRoles: ['Not measurable from pixels'], exampleSize: 'Not measurable', exampleLineHeight: 'Not measurable' }];
  snapshot.spacing = [];
  snapshot.components = [];
  snapshot.motion = [];
  snapshot.method = 'Screenshot-only pixel sampling with Sharp color quantization. No DOM, CSS, HTML, network requests, typography, or interactive behavior were inspected.';
  snapshot.warnings = [
    'Screenshot-only mode was used because source access was unavailable or the user chose manual analysis. Treat this report as visual inference, not a verified account of the live website.',
    'Colors are estimated from sampled screenshot pixels. Semantic color roles are inferred.',
    'Fonts, exact font weights, CSS variables, spacing tokens, breakpoints, component states, motion, links, accessibility, and ARIA behavior cannot be verified from a static image.',
    'Source URL is attribution supplied by the user and was not fetched or verified.',
  ];
  snapshot.accessibility.notes = [...snapshot.warnings];
  snapshot.layout.sections = [{ tag: 'screenshot', label: 'Uploaded screenshot', height: metadata.height! }];
  snapshot.rawEvidence.bodyFont = 'Unknown — screenshot-only inference';
  return snapshot;
}
