import type { ColorToken, ComponentToken, FontToken, SpacingToken, WebsiteSnapshot } from './types';

export type BrowserEvidence = {
  url: string; title: string; description: string; brandName: string; tagline: string; logoDescription: string; favicon: string; ogImage?: string;
  colorCounts: Array<{ value: string; count: number }>;
  cssSources?: string[];
  warnings?: string[];
  cssVariables: Record<string, string>;
  headings: Array<{ level: number; text: string; size: string; weight: string }>;
  sections: Array<{ tag: string; label: string; height: number }>;
  buttons: Array<{ type: string; count: number; variants: string[]; examples: string[]; states: string[] }>;
  buttonLabels: string[]; buttonLabelsMissing: number;
  fonts: Array<{ family: string; count: number; weights: number[]; sizes: string[]; lineHeights: string[]; tags: string[] }>;
  spacing: Array<{ value: string; count: number }>;
  shadows: string[]; radii: string[];
  motions: Array<{ name: string; duration: string; easing: string; trigger: string }>;
  animationNames: string[]; imageCount: number; svgCount: number; imageAlts: string[]; imagesMissingAlt: number;
  links: string[]; bodyBackground: string; bodyTextColor: string; bodyFont: string; bodyFontSize: string; bodyLineHeight: string;
  viewport: { width: number; height: number }; pageWidth: number; headerPosition: string; footerPresent: boolean; gridColumns: number[]; containerWidths: number[];
  mediaQueries: string[]; cssRuleTexts: string[]; focusStyle: boolean; bodyTextSample: string; screenshotDominant?: string;
};

function parseRgb(value: string): [number, number, number] | null {
  const s = value.trim().toLowerCase();
  const hex = s.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    let h = hex[1]; if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  const rgb = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return [Math.round(Number(rgb[1])), Math.round(Number(rgb[2])), Math.round(Number(rgb[3]))];
  const hsl = s.match(/hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%/);
  if (hsl) {
    const h = ((Number(hsl[1]) % 360) + 360) % 360 / 360, sat = Number(hsl[2]) / 100, light = Number(hsl[3]) / 100;
    if (sat === 0) { const v = Math.round(light * 255); return [v,v,v]; }
    const hue2rgb = (p: number, q: number, t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p+(q-p)*6*t; if (t < 1/2) return q; if (t < 2/3) return p+(q-p)*(2/3-t)*6; return p; };
    const q = light < .5 ? light*(1+sat) : light+sat-light*sat, p = 2*light-q;
    return [hue2rgb(p,q,h+1/3),hue2rgb(p,q,h),hue2rgb(p,q,h-1/3)].map(v=>Math.round(v*255)) as [number,number,number];
  }
  return null;
}
function toHex(rgb: [number,number,number]) { return `#${rgb.map(n=>Math.max(0,Math.min(255,n)).toString(16).padStart(2,'0')).join('')}`.toUpperCase(); }
function toHsl([r,g,b]: [number,number,number]) {
  r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min; let h=0, s=0; const l=(max+min)/2;
  if (d) { s=d/(1-Math.abs(2*l-1)); if(max===r)h=60*(((g-b)/d)%6); else if(max===g)h=60*((b-r)/d+2); else h=60*((r-g)/d+4); }
  if(h<0)h+=360; return `hsl(${Math.round(h)} ${Math.round(s*100)}% ${Math.round(l*100)}%)`;
}
function luminance(rgb: [number,number,number]) {
  const channels = rgb.map(v => { const c=v/255; return c <= .04045 ? c/12.92 : Math.pow((c+.055)/1.055,2.4); });
  return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
}
function contrast(a: [number,number,number], b: [number,number,number]) { const l1=luminance(a), l2=luminance(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); }
function roleFromName(name: string) {
  const s = name.toLowerCase();
  if (/success|positive|valid|complete|approved/.test(s)) return 'success';
  if (/warning|warn|caution|pending/.test(s)) return 'warning';
  if (/error|danger|destructive|invalid|critical/.test(s)) return 'error';
  if (/accent|highlight|brand-2/.test(s)) return 'accent';
  if (/primary|brand|main/.test(s)) return 'primary';
  if (/secondary|muted/.test(s)) return 'secondary';
  if (/surface|background|bg-|canvas|panel/.test(s)) return 'surface';
  if (/text|foreground|ink/.test(s)) return 'text';
  if (/border|stroke|divider|outline/.test(s)) return 'border';
  return '';
}
function isNeutral(rgb: [number,number,number]) { return Math.max(...rgb)-Math.min(...rgb) < 22; }
function parseCountColor(value: string) {
  const rgb = parseRgb(value);
  if (!rgb) return null;
  // Normalize alpha-free output and ignore near-transparent-looking colors (rarely useful brand tokens).
  if (rgb.some(c => c < 0 || c > 255)) return null;
  return { rgb, hex: toHex(rgb) };
}
function cssVarColor(value: string) {
  // Handles direct colors and a common `var(--token)` chain through the caller's map.
  return parseCountColor(value);
}
function cleanFamily(family: string) { return family.split(',')[0].replace(/^['"]|['"]$/g, '').trim() || 'system-ui'; }

export function extractTokensFromEvidence(input: {
  url: string; finalUrl: string; title: string; description: string; brandName: string; tagline: string; logoDescription: string; favicon: string;
  evidence: BrowserEvidence; screenshotDataUrl?: string; robotsNote?: string;
}): WebsiteSnapshot {
  const e = input.evidence;
  const cssVariables = { ...e.cssVariables };
  const variableColors: Array<{ value: string; count: number; source: 'css-variable'; variable: string }> = [];
  for (const [name, raw] of Object.entries(cssVariables)) {
    const direct = cssVarColor(raw);
    if (direct) variableColors.push({ value: direct.hex, count: 30 + (roleFromName(name) ? 20 : 0), source: 'css-variable', variable: name });
    else {
      const reference = raw.match(/^var\((--[^,)]+)/);
      if (reference && cssVariables[reference[1]]) {
        const nested = cssVarColor(cssVariables[reference[1]]);
        if (nested) variableColors.push({ value: nested.hex, count: 25, source: 'css-variable', variable: name });
      }
    }
  }
  const counts = new Map<string, { count: number; source: ColorToken['source']; variable?: string }>();
  for (const item of e.colorCounts) {
    const parsed = parseCountColor(item.value);
    if (!parsed) continue;
    const existing = counts.get(parsed.hex);
    counts.set(parsed.hex, { count: (existing?.count || 0) + item.count, source: 'computed-style' });
  }
  for (const item of variableColors) {
    const key = item.value.toUpperCase(), existing = counts.get(key);
    counts.set(key, { count: (existing?.count || 0) + item.count, source: 'css-variable', variable: item.variable });
  }
  if (e.screenshotDominant) {
    const parsed = parseCountColor(e.screenshotDominant);
    if (parsed) counts.set(parsed.hex, { count: (counts.get(parsed.hex)?.count || 0) + 10, source: 'screenshot' });
  }
  const sorted = Array.from(counts.entries()).sort((a,b)=>b[1].count-a[1].count).filter(([hex]) => parseRgb(hex)).slice(0, 18);
  const bodyBg = parseCountColor(e.bodyBackground)?.hex;
  const bodyText = parseCountColor(e.bodyTextColor)?.hex;
  const neutralOrdered = sorted.filter(([hex]) => { const rgb=parseRgb(hex)!; return isNeutral(rgb); });
  const chromaticOrdered = sorted.filter(([hex]) => { const rgb=parseRgb(hex)!; return !isNeutral(rgb); });
  const findVar = (role: string) => variableColors.find(v => roleFromName(v.variable || '') === role)?.value.toUpperCase();
  const roleMap: Record<string, string | undefined> = {
    primary: findVar('primary') || chromaticOrdered[0]?.[0] || bodyText || '#6C5CE7',
    secondary: findVar('secondary') || chromaticOrdered[1]?.[0] || '#7A8194',
    accent: findVar('accent') || chromaticOrdered[2]?.[0] || chromaticOrdered[0]?.[0] || '#50D6E8',
    surface: findVar('surface') || bodyBg || neutralOrdered[neutralOrdered.length-1]?.[0] || '#F7F7F9',
    text: findVar('text') || bodyText || neutralOrdered[0]?.[0] || '#15151B',
    border: findVar('border') || neutralOrdered[Math.floor(neutralOrdered.length/2)]?.[0] || '#D8D8E0',
    success: findVar('success') || '#2FA772', warning: findVar('warning') || '#DFA33A', error: findVar('error') || '#D94B4B',
  };
  const semanticKeys = Object.keys(roleMap);
  const colors: ColorToken[] = [];
  const used = new Set<string>();
  for (const role of semanticKeys) {
    const hex = roleMap[role]; if (!hex || used.has(hex)) continue;
    const rgb = parseRgb(hex); if (!rgb) continue;
    const original = counts.get(hex);
    colors.push({ name: role.replace(/(^\w)/, s=>s.toUpperCase()), hex, rgb: `rgb(${rgb.join(', ')})`, hsl: toHsl(rgb), role, contrastOnWhite: Number(contrast(rgb,[255,255,255]).toFixed(2)), contrastOnBlack: Number(contrast(rgb,[0,0,0]).toFixed(2)), source: original?.source || (variableColors.some(v=>v.value.toUpperCase()===hex) ? 'css-variable' : 'inferred') });
    used.add(hex);
  }
  for (const [hex, details] of sorted) {
    if (used.has(hex)) continue;
    const rgb = parseRgb(hex)!;
    const variable = details.variable || Object.entries(cssVariables).find(([,v]) => parseCountColor(v)?.hex === hex)?.[0];
    const name = variable ? variable.replace(/^--/, '').replace(/[-_]/g, ' ') : `palette-${colors.length + 1}`;
    colors.push({ name: name.slice(0,36), hex, rgb: `rgb(${rgb.join(', ')})`, hsl: toHsl(rgb), role: roleFromName(variable || '') || (isNeutral(rgb) ? 'neutral' : 'supporting'), contrastOnWhite: Number(contrast(rgb,[255,255,255]).toFixed(2)), contrastOnBlack: Number(contrast(rgb,[0,0,0]).toFixed(2)), source: details.source });
    used.add(hex);
  }
  const fonts: FontToken[] = e.fonts.map(f => ({ family: f.family, weights: f.weights.filter(Boolean).sort((a,b)=>a-b), sampleRoles: f.tags.slice(0,8), exampleSize: f.sizes[0] || '16px', exampleLineHeight: f.lineHeights[0] || 'normal' }));
  if (!fonts.length) fonts.push({ family: 'system-ui, sans-serif', weights: [400, 500, 600, 700], sampleRoles: ['body'], exampleSize: e.bodyFontSize || '16px', exampleLineHeight: e.bodyLineHeight || '1.5' });
  const spacing = e.spacing.map(s => ({ ...s, numeric: Number.parseFloat(s.value) })).filter(s => Number.isFinite(s.numeric) && s.numeric > 0).sort((a,b)=>a.numeric-b.numeric).reduce<SpacingToken[]>((acc,s)=>{
    if (!acc.some(item=>item.value===s.value)) acc.push({ value:s.value, count:s.count }); return acc;
  },[]).slice(0,18);
  const components: ComponentToken[] = e.buttons.map(c => ({ type:c.type, count:c.count, variants:c.variants, states:c.states, examples:c.examples }));
  const mediaQueries = e.mediaQueries.filter(Boolean);
  const breakpointValues = mediaQueries.map(q => {
    const matches = [...q.matchAll(/(?:min-width|max-width)\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)/g)];
    return matches.map(m => Math.round(Number(m[1]) * (m[2] === 'px' ? 1 : 16)));
  }).flat().filter(v => v > 280 && v < 3000);
  const breakpoints = Array.from(new Set(breakpointValues.length ? breakpointValues : [640,768,1024,1280])).sort((a,b)=>a-b).slice(0,10);
  const contrastCandidates = colors.filter(c => c.role === 'text' || c.role === 'primary').filter(c => c.contrastOnWhite < 4.5 && c.contrastOnBlack < 4.5).length;
  const warnings: string[] = [];
  if (e.imagesMissingAlt > 0) warnings.push(`${e.imagesMissingAlt} visible image(s) lack an alt attribute; decorative images should use an empty alt, informative images need meaningful text.`);
  if (!e.focusStyle) warnings.push('No explicit :focus or :focus-visible CSS selector was detected in readable stylesheets. Browser defaults may still be present.');
  if (e.buttonLabelsMissing > 0) warnings.push(`${e.buttonLabelsMissing} visible button-like control(s) have no detectable accessible text or aria-label.`);
  if (contrastCandidates > 0) warnings.push('Some inferred foreground brand colors may not meet WCAG AA against common light and dark surfaces. Validate actual foreground/background pairs in a browser.');
  if (input.robotsNote) warnings.push(input.robotsNote);
  if (!Object.keys(cssVariables).length) warnings.push('CSS custom properties were not readable from the page; token names and some design roles are inferred from computed styles.');
  if (e.mediaQueries.length === 0) warnings.push('No media queries were available from readable stylesheets. Responsive breakpoints shown below are common inferred defaults, not confirmed source values.');
  const motions = e.motions.slice(0,16).map(m=>({ name:m.name, duration:m.duration, easing:m.easing, trigger:m.trigger }));
  if (!motions.length) motions.push({ name: 'No explicit motion detected', duration: '—', easing: '—', trigger: 'Motion was not observed in the sampled initial state; interactive states were not actively triggered.' });
  const imageTreatments = [e.ogImage ? 'Open Graph preview image is defined' : '', e.imageCount ? `${e.imageCount} visible raster image(s); treatment inferred from current computed styles` : 'No visible raster images sampled', e.svgCount ? `${e.svgCount} inline/visible SVG element(s) detected` : 'No visible SVG elements sampled'].filter(Boolean);
  const notes = warnings.length ? warnings : ['No high-confidence issues were detected in this static, unauthenticated snapshot. This is not a full accessibility audit.'];
  return {
    url: input.url, finalUrl: input.finalUrl, title: input.title || input.brandName || new URL(input.url).hostname,
    description: input.description || '', brandName: input.brandName || new URL(input.url).hostname, tagline: input.tagline || 'No clear H1 tagline detected in the initial viewport.',
    logoDescription: input.logoDescription, favicon: input.favicon, screenshotDataUrl: input.screenshotDataUrl,
    colors: colors.slice(0,24), fonts, spacing,
    components,
    layout: { viewport: e.viewport, pageWidth: e.pageWidth, sections: e.sections, breakpoints, containerWidths: e.containerWidths, gridColumns: e.gridColumns, headerPosition: e.headerPosition, footerPresent: e.footerPresent },
    motion: motions,
    imagery: { imageCount:e.imageCount, svgCount:e.svgCount, iconStyle:e.svgCount ? 'SVG-based iconography is present; exact library/style inferred from markup.' : 'No inline SVG icons sampled; icon library could not be confidently identified.', imageTreatments },
    shadows:e.shadows, radii:e.radii,
    accessibility:{ missingAlt:e.imagesMissingAlt, contrastCandidates, focusStylesFound:e.focusStyle, buttonsWithoutLabels:e.buttonLabelsMissing, notes },
    cssVariables,
    rawEvidence:{ headings:e.headings, links:e.links, buttonLabels:e.buttonLabels, imageAlts:e.imageAlts, mediaQueries:e.mediaQueries, animations:e.animationNames, bodyBackground:e.bodyBackground, bodyTextColor:e.bodyTextColor, bodyFont:e.bodyFont },
    warnings, analyzedAt:new Date().toISOString(), method:'Playwright-rendered DOM and computed-style inspection; readable CSS custom properties/rules; screenshot-derived dominant-color hint; role mapping is inferred where source tokens are absent.'
  };
}
