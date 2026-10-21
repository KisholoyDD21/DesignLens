import { chromium as playwrightChromium, type Browser, type Page } from 'playwright';
import sparticuzChromium from '@sparticuz/chromium';
import sharp from 'sharp';
import { assertPublicHttpUrl, assertRobotsAllowed } from './security';
import type { WebsiteSnapshot } from './types';
import { extractTokensFromEvidence, type BrowserEvidence } from './extract-tokens';
import { safeText } from './utils';
import { analyzeCssSources } from './css-analysis';

export type ProgressCallback = (stage: string, label: string, progress: number, detail?: string) => void;

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }
  const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
  if (executablePath) {
    return playwrightChromium.launch({ headless: true, executablePath });
  }

  try {
    return await playwrightChromium.launch({ headless: true });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    if (errMessage.includes("Executable doesn't exist") || errMessage.includes('playwright install')) {
      try {
        return await playwrightChromium.launch({ headless: true, channel: 'chrome' });
      } catch {
        try {
          return await playwrightChromium.launch({ headless: true, channel: 'msedge' });
        } catch {
          throw new Error('Playwright browser is not installed. Please run "npx playwright install" in your terminal, or use screenshot-only mode.');
        }
      }
    }
    throw error;
  }
}

async function pageEvidence(page: Page): Promise<BrowserEvidence> {
  return page.evaluate(() => {
    const text = (el: Element | null) => (el?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const computed = (el: Element, prop: string) => getComputedStyle(el).getPropertyValue(prop).trim();
    const counts = new Map<string, number>();
    const add = (value: string) => {
      if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'none' || value === 'initial' || value === 'inherit') return;
      counts.set(value, (counts.get(value) || 0) + 1);
    };
    const sample = (el: Element) => {
      for (const prop of ['color', 'background-color', 'border-top-color', 'outline-color']) add(computed(el, prop));
    };
    const visible = (el: Element) => {
      const style = getComputedStyle(el), rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const elements = Array.from(document.querySelectorAll('body *')).filter(visible).slice(0, 1800);
    elements.forEach(sample);
    const cssVariables: Record<string, string> = {};
    const cssSources: string[] = [];
    const mediaQueries: string[] = [];
    const animationNames: string[] = [];
    const cssRuleTexts: string[] = [];
    let focusStylesFound = false;
    const walkRules = (rules: CSSRuleList, depth = 0) => {
      if (depth > 5) return;
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          const selector = rule.selectorText || '';
          if (selector.includes(':focus') || selector.includes(':focus-visible')) focusStylesFound = true;
          if (selector === ':root' || selector === 'html' || selector === 'body') {
            for (const prop of Array.from(rule.style)) if (prop.startsWith('--') && cssVariables[prop] === undefined) cssVariables[prop] = rule.style.getPropertyValue(prop).trim();
          }
          if (/(color|font|spacing|radius|shadow|gap|size|surface|border|background)/i.test(rule.cssText)) cssRuleTexts.push(rule.cssText.slice(0, 1200));
        } else if (rule instanceof CSSMediaRule) {
          mediaQueries.push(rule.conditionText);
          walkRules(rule.cssRules, depth + 1);
        } else if (rule instanceof CSSKeyframesRule) {
          animationNames.push(rule.name);
        } else if ('cssRules' in rule) {
          try { walkRules((rule as CSSGroupingRule).cssRules, depth + 1); } catch { /* Cross-origin sheets are not readable. */ }
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try { if (sheet.cssRules) { walkRules(sheet.cssRules); const source = Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); if (source && cssSources.length < 50) cssSources.push(source.slice(0, 80000)); } } catch { /* Cross-origin stylesheet access is intentionally skipped. */ }
    }
    const headingElements = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(visible).slice(0, 40);
    const headings = headingElements.map(el => ({ level: Number(el.tagName.slice(1)), text: text(el), size: computed(el, 'font-size'), weight: computed(el, 'font-weight') })).filter(h => h.text);
    const sections = Array.from(document.querySelectorAll('header, main, section, article, footer, [role="main"]')).filter(visible).slice(0, 24).map(el => {
      const rect = el.getBoundingClientRect();
      const label = text(el.querySelector('h1,h2,h3,h4') || el.querySelector('[aria-label]') || el);
      return { tag: el.tagName.toLowerCase(), label: label.slice(0, 90), height: Math.round(rect.height) };
    });
    const buttons = Array.from(document.querySelectorAll('button,[role="button"],input[type="submit"]')).filter(visible).slice(0, 80);
    const buttonLabels = buttons.map(el => (el.getAttribute('aria-label') || el.getAttribute('title') || text(el) || (el instanceof HTMLInputElement ? el.value : '')).trim()).filter(Boolean).slice(0, 40);
    const buttonLabelsMissing = buttons.filter(el => !(el.getAttribute('aria-label') || el.getAttribute('title') || text(el) || (el instanceof HTMLInputElement && el.value))).length;
    const inputs = Array.from(document.querySelectorAll('input,textarea,select')).filter(visible);
    const components = [
      { type: 'Buttons', count: buttons.length, variants: Array.from(new Set(buttons.map(el => computed(el, 'background-color'))).values()).slice(0, 8), examples: buttonLabels.slice(0, 6), states: ['default', 'hover (not directly exercised)', 'focus (inferred from CSS)'] },
      { type: 'Form controls', count: inputs.length, variants: Array.from(new Set(inputs.map(el => computed(el, 'border-radius'))).values()).slice(0, 8), examples: inputs.map(el => el.getAttribute('placeholder') || el.getAttribute('aria-label') || el.getAttribute('name') || el.tagName.toLowerCase()).slice(0, 8), states: ['default', 'focus (if CSS rule detected)'] },
      { type: 'Cards / panels', count: document.querySelectorAll('[class*="card"],[class*="panel"],[class*="tile"],article').length, variants: ['surface, border, shadow values inspected from computed styles'], examples: Array.from(document.querySelectorAll('[class*="card"],[class*="panel"],article')).slice(0, 5).map(el => text(el)).filter(Boolean), states: ['static visual state'] },
      { type: 'Navigation items', count: document.querySelectorAll('nav a,header a,[role="navigation"] a').length, variants: ['link'], examples: Array.from(document.querySelectorAll('nav a,header a')).slice(0, 8).map(el => text(el)).filter(Boolean), states: ['default', 'hover not directly exercised'] },
      { type: 'Badges / labels', count: document.querySelectorAll('[class*="badge"],[class*="tag"],[class*="chip"],[class*="pill"]').length, variants: ['class-name inferred'], examples: Array.from(document.querySelectorAll('[class*="badge"],[class*="tag"],[class*="chip"],[class*="pill"]')).slice(0, 5).map(el => text(el)).filter(Boolean), states: ['static visual state'] },
    ];
    const fontStats = new Map<string, { family: string; count: number; weights: Set<number>; sizes: Set<string>; lineHeights: Set<string>; tags: Set<string> }>();
    elements.forEach(el => {
      const style = getComputedStyle(el);
      const family = style.fontFamily || 'system-ui';
      const record = fontStats.get(family) || { family, count: 0, weights: new Set<number>(), sizes: new Set<string>(), lineHeights: new Set<string>(), tags: new Set<string>() };
      record.count++; record.weights.add(Number(style.fontWeight) || 400); record.sizes.add(style.fontSize); record.lineHeights.add(style.lineHeight); record.tags.add(el.tagName.toLowerCase()); fontStats.set(family, record);
    });
    const fonts = Array.from(fontStats.values()).sort((a,b) => b.count - a.count).slice(0, 12).map(f => ({ family: f.family, count: f.count, weights: Array.from(f.weights).slice(0, 8), sizes: Array.from(f.sizes).slice(0, 12), lineHeights: Array.from(f.lineHeights).slice(0, 8), tags: Array.from(f.tags).slice(0, 12) }));
    const spacing = new Map<string, number>();
    const shadows = new Map<string, number>();
    const radii = new Map<string, number>();
    const motions: Array<{ name: string; duration: string; easing: string; trigger: string }> = [];
    elements.forEach(el => {
      const style = getComputedStyle(el);
      for (const prop of ['margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','gap','row-gap','column-gap']) {
        const value = style.getPropertyValue(prop).trim();
        if (value && value !== '0px' && value !== 'normal' && /^-?\d+(\.\d+)?px$/.test(value)) spacing.set(value, (spacing.get(value) || 0) + 1);
      }
      const shadow = style.boxShadow;
      if (shadow && shadow !== 'none') shadows.set(shadow, (shadows.get(shadow) || 0) + 1);
      const radius = style.borderRadius;
      if (radius && radius !== '0px') radii.set(radius, (radii.get(radius) || 0) + 1);
      const duration = style.animationDuration;
      const transition = style.transitionDuration;
      const animationName = style.animationName;
      if ((animationName && animationName !== 'none') || (transition && transition !== '0s')) {
        if (motions.length < 20) motions.push({ name: animationName && animationName !== 'none' ? animationName : 'transition', duration: animationName && animationName !== 'none' ? duration : transition, easing: animationName && animationName !== 'none' ? style.animationTimingFunction : style.transitionTimingFunction, trigger: animationName && animationName !== 'none' ? 'CSS animation (observed style)' : 'CSS transition (likely interaction/hover; trigger not exercised)' });
      }
    });
    const images = Array.from(document.querySelectorAll('img')).filter(visible);
    const svgs = Array.from(document.querySelectorAll('svg')).filter(visible);
    const imageAlts = images.map(img => img.getAttribute('alt') || '').slice(0, 50);
    const body = document.body;
    const html = document.documentElement;
    const bodyStyle = getComputedStyle(body);
    const bodyRect = body.getBoundingClientRect();
    const logo = document.querySelector('[class*="logo"], [id*="logo"], header svg, header img, a[aria-label*="home" i]');
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href || '';
    const logoDescription = logo ? `${logo.tagName.toLowerCase()}${logo.getAttribute('class') ? `, class=${logo.getAttribute('class')!.slice(0, 80)}` : ''}${text(logo) ? `, text="${text(logo)}"` : ''}` : 'No obvious logo element detected';
    const hrefs = Array.from(document.querySelectorAll('a[href]')).filter(visible).map(a => (a as HTMLAnchorElement).href).slice(0, 30);
    const gridColumns = Array.from(document.querySelectorAll('*')).filter(visible).map(el => getComputedStyle(el).gridTemplateColumns).filter(v => v && v !== 'none').map(v => v.split(' ').length);
    const containerWidths = elements.map(el => Math.round(el.getBoundingClientRect().width)).filter(width => width > 500 && width < window.innerWidth + 2);
    const focusStyle = focusStylesFound;
    return {
      url: location.href, title: document.title || ogTitle, description: metaDescription, ogImage, favicon,
      brandName: (document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || document.title || location.hostname).split(/[|–—:-]/)[0].trim(),
      tagline: text(document.querySelector('h1')),
      logoDescription, colorCounts: Array.from(counts.entries()).map(([value,count]) => ({ value, count })).sort((a,b) => b.count - a.count).slice(0, 60),
      cssVariables, cssSources, headings, sections, buttons: components, buttonLabels, buttonLabelsMissing, fonts,
      spacing: Array.from(spacing.entries()).map(([value,count]) => ({ value,count })).sort((a,b) => b.count-a.count).slice(0, 40),
      shadows: Array.from(shadows.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 8).map(([value])=>value),
      radii: Array.from(radii.entries()).sort((a,b)=>b[1]-a[1]).slice(0, 12).map(([value])=>value), motions,
      animationNames: Array.from(new Set([...animationNames, ...motions.map(m=>m.name)])).slice(0, 20),
      imageCount: images.length, svgCount: svgs.length, imageAlts, imagesMissingAlt: images.filter(img => !img.hasAttribute('alt')).length,
      links: hrefs.map(h => { try { const u = new URL(h); return `${u.hostname}${u.pathname}`.slice(0, 120); } catch { return h.slice(0,120); } }),
      bodyBackground: bodyStyle.backgroundColor, bodyTextColor: bodyStyle.color, bodyFont: bodyStyle.fontFamily, bodyFontSize: bodyStyle.fontSize, bodyLineHeight: bodyStyle.lineHeight,
      viewport: { width: window.innerWidth, height: window.innerHeight }, pageWidth: Math.max(html.scrollWidth, body.scrollWidth),
      headerPosition: document.querySelector('header') ? getComputedStyle(document.querySelector('header')!).position : 'not detected',
      footerPresent: Boolean(document.querySelector('footer')),
      gridColumns: Array.from(new Set(gridColumns)).sort((a,b)=>a-b).slice(0, 12),
      containerWidths: Array.from(new Set(containerWidths)).sort((a,b)=>a-b).slice(-10),
      mediaQueries: Array.from(new Set(mediaQueries)).slice(0, 40), cssRuleTexts: cssRuleTexts.slice(0, 120), focusStyle,
      bodyTextSample: text(body),
    };
  });
}

export async function scrapeWebsite(inputUrl: string, onProgress: ProgressCallback, signal?: AbortSignal): Promise<WebsiteSnapshot> {
  const url = await assertPublicHttpUrl(inputUrl);
  onProgress('robots', 'Checking robots.txt and destination safety', 8, url.hostname);
  const robots = await assertRobotsAllowed(url);
  onProgress('fetch', 'Launching a sandboxed browser', 15, 'Public HTTP(S) targets only');
  let browser: Browser | null = null;
  const abortBrowser = () => { if (browser) void browser.close().catch(() => undefined); };
  try {
    if (signal?.aborted) throw new Error('Analysis cancelled by the client.');
    browser = await launchBrowser();
    if (signal?.aborted) { await browser.close().catch(() => undefined); throw new Error('Analysis cancelled by the client.'); }
    signal?.addEventListener('abort', abortBrowser, { once:true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'en-US' });
    const page = await context.newPage();
    page.setDefaultTimeout(9_000);
    page.setDefaultNavigationTimeout(18_000);
    await page.route('**/*', async route => {
      const requestUrl = route.request().url();
      if (/^(data|blob|about):/.test(requestUrl)) return route.continue();
      try {
        await assertPublicHttpUrl(requestUrl);
        return route.continue();
      } catch {
        return route.abort('blockedbyclient');
      }
    });
    onProgress('fetch', 'Rendering the public website', 24, 'Waiting for the initial DOM and visible layout');
    const response = await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 18_000 });
    if (!response && page.url() === 'about:blank') throw new Error('The browser could not load this website.');
    await page.waitForLoadState('networkidle', { timeout: 5_500 }).catch(() => undefined);
    await page.waitForTimeout(700);
    if (signal?.aborted) throw new Error('Analysis cancelled by the client.');
    const finalUrl = page.url();
    await assertPublicHttpUrl(finalUrl);
    onProgress('parse', 'Inspecting computed styles and page structure', 42, 'Sampling visible UI, fonts, CSS variables, and responsive rules');
    const evidence = await pageEvidence(page);
    const cssAnalysis = analyzeCssSources(evidence.cssSources || []);
    evidence.cssVariables = { ...cssAnalysis.variables, ...evidence.cssVariables };
    evidence.colorCounts = [...evidence.colorCounts, ...cssAnalysis.colors];
    evidence.mediaQueries = Array.from(new Set([...evidence.mediaQueries, ...cssAnalysis.mediaQueries]));
    evidence.animationNames = Array.from(new Set([...evidence.animationNames, ...cssAnalysis.animationNames]));
    evidence.warnings = cssAnalysis.warnings;
    onProgress('palette', 'Extracting palette and design tokens', 58, 'Combining computed colors, source variables, and screenshot statistics');
    let screenshotDataUrl: string | undefined;
    try {
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 60, fullPage: true, animations: 'disabled', timeout: 8_000 });
      const resized = await sharp(screenshot).resize({ width: 1120, height: 2600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 56, mozjpeg: true }).toBuffer();
      screenshotDataUrl = `data:image/jpeg;base64,${resized.toString('base64')}`;
      const stats = await sharp(resized).stats();
      if (stats.dominant) evidence.screenshotDominant = `rgb(${stats.dominant.r}, ${stats.dominant.g}, ${stats.dominant.b})`;
    } catch { /* Screenshot extraction is optional; DOM evidence remains useful. */ }
    const snapshot = extractTokensFromEvidence({
      url: url.toString(), finalUrl, title: safeText(evidence.title, 180), description: safeText(evidence.description, 300), brandName: safeText(evidence.brandName, 100),
      tagline: safeText(evidence.tagline, 180), logoDescription: safeText(evidence.logoDescription, 180), favicon: safeText(evidence.favicon, 500), evidence,
      screenshotDataUrl, robotsNote: robots.note,
    });
    if (evidence.warnings?.length) snapshot.warnings.push(...evidence.warnings);
    onProgress('synthesis', 'Composing the design.md report', 74, 'Building twelve evidence-backed sections and token exports');
    await context.close();
    return snapshot;
  } catch (error) {
    if (signal?.aborted) throw new Error('Analysis cancelled by the client.');
    const message = error instanceof Error ? error.message : 'The website could not be analyzed.';
    if (message.includes('Timeout') || message.includes('timeout')) throw new Error('The website took too long to render. Try again or use screenshot-only analysis.');
    if (message.includes("Executable doesn't exist") || message.includes('playwright install')) {
      throw new Error('Playwright browser is not installed. Please run "npx playwright install" in your terminal, or use screenshot-only mode.');
    }
    throw error;
  } finally {
    signal?.removeEventListener('abort', abortBrowser);
    if (browser) await browser.close().catch(() => undefined);
  }
}
