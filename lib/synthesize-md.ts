import type { WebsiteSnapshot, ColorToken } from './types';
import { escapeMarkdown, slugify } from './utils';
import { DESIGN_MD_SYNTHESIS_SYSTEM, designMdSynthesisPrompt } from '@/prompts/design-md-synthesis';

type Narrative = { persona:string; tone:string; pairingRationale:string };
function inferredNarrative(s:WebsiteSnapshot):Narrative {
  if (s.method.startsWith('Screenshot-only')) return {
    persona:'This is a color-led reading of a single still image, not a reconstruction of the live interface. The sampled palette can suggest tonal direction, but the available evidence cannot establish typography, brand voice, component rules, layout behavior, or interactive states. Treat every semantic label as a visual hypothesis.',
    tone:'Brand tone cannot be reliably assessed from screenshot pixels alone; readable copy and metadata were not extracted.',
    pairingRationale:'A font pairing cannot be inferred from sampled pixels with confidence. Inspect source CSS or provide browser access before choosing production font families and weights.'
  };
  const colors=s.colors.filter(c=>!['neutral','surface','text','border'].includes(c.role)).slice(0,2).map(c=>c.name.toLowerCase());
  const families=s.fonts.slice(0,2).map(f=>f.family);
  const density=s.layout.sections.length>10?'content-rich':s.layout.sections.length>5?'structured':'focused';
  const visual=s.imagery.imageCount>3?'image-led':'interface-led';
  return {
    persona:`This website reads as a ${density}, ${visual} experience, with ${colors.join(' and ')||'a restrained palette'} shaping its visual character. ${families.length?`Its typography is led by ${families[0]}${families[1]?`, with ${families[1]} appearing as a secondary family`:''};`:'Its type stack leans on system defaults;'} layout rhythm and component treatments do most of the work of establishing hierarchy. Values that could not be directly observed are marked as inferred rather than presented as source-of-truth tokens.`,
    tone:s.tagline&&s.tagline.length<100?`The lead message “${s.tagline}” suggests a direct, benefit-led voice; this is a single-page content inference, not a full editorial audit.`:'Brand tone is inferred from the sampled headline, metadata, interface labels, and page structure; no complete editorial corpus was available.',
    pairingRationale:families.length>1?`${families[0]} carries the most sampled text; ${families[1]} appears in a complementary role. Confirm intended font roles with brand documentation because the pairing may be incidental.`:`${families[0]||'The detected system font stack'} is the most frequently sampled family. A deliberate display/body pairing was not confirmed in this snapshot.`
  };
}
async function llmNarrative(s:WebsiteSnapshot):Promise<Narrative|null>{
  const key=process.env.OPENAI_API_KEY;if(!key)return null;
  const base=(process.env.LLM_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'');
  try{
    const response=await fetch(`${base}/chat/completions`,{method:'POST',signal:AbortSignal.timeout(6500),headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',temperature:.25,max_tokens:330,messages:[{role:'system',content:DESIGN_MD_SYNTHESIS_SYSTEM},{role:'user',content:designMdSynthesisPrompt({brandName:s.brandName,title:s.title,description:s.description,tagline:s.tagline,colors:s.colors.slice(0,12),fonts:s.fonts.slice(0,8),layout:s.layout,components:s.components,imagery:s.imagery,motion:s.motion.slice(0,8)})}]})});
    if(!response.ok)return null;const data=await response.json() as {choices?:Array<{message?:{content?:string}}>};const content=data.choices?.[0]?.message?.content||'';const parsed=JSON.parse(content.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')) as Partial<Narrative>;
    if(typeof parsed.persona!=='string'||typeof parsed.tone!=='string'||typeof parsed.pairingRationale!=='string')return null;
    return {persona:parsed.persona.slice(0,900),tone:parsed.tone.slice(0,400),pairingRationale:parsed.pairingRationale.slice(0,500)};
  }catch{return null;}
}
function table(headers:string[], rows:Array<Array<string|number>>){
  const clean=(v:string|number)=>String(v).replace(/\|/g,'\\|').replace(/[\r\n]/g,' ');
  const safeRows=rows.length?rows:[headers.map((_,i)=>i===0?'No high-confidence values observed':'—')];
  return `| ${headers.join(' | ')} |\n| ${headers.map(()=>':--').join(' | ')} |\n${safeRows.map(r=>`| ${r.map(clean).join(' | ')} |`).join('\n')}`;
}
function semanticCss(s:WebsiteSnapshot){
  const roles=new Map(s.colors.map(c=>[c.role,c.hex]));
  const vars:[string,string][]=[['color-primary',roles.get('primary')||'#6C5CE7'],['color-secondary',roles.get('secondary')||'#7A8194'],['color-accent',roles.get('accent')||'#50D6E8'],['color-surface',roles.get('surface')||'#F7F7F9'],['color-text',roles.get('text')||'#15151B'],['color-border',roles.get('border')||'#D8D8E0'],['color-success',roles.get('success')||'#2FA772'],['color-warning',roles.get('warning')||'#DFA33A'],['color-error',roles.get('error')||'#D94B4B']];
  s.spacing.forEach((x,i)=>vars.push([`space-${i+1}`,x.value]));if(s.fonts[0])vars.push(['font-body',s.fonts[0].family]);if(s.fonts[1])vars.push(['font-display',s.fonts[1].family]);
  return `:root {\n${vars.map(([k,v])=>`  --${k}: ${v};`).join('\n')}\n}`;
}

export async function buildDesignMarkdown(snapshot:WebsiteSnapshot, options:{useLLM?:boolean} = {}){
  const screenshotOnly = snapshot.method.startsWith('Screenshot-only');
  const narrative=options.useLLM===false || screenshotOnly ? inferredNarrative(snapshot) : await llmNarrative(snapshot)||inferredNarrative(snapshot);const date=new Date(snapshot.analyzedAt).toISOString();
  const colorRows=snapshot.colors.map(c=>[c.name,c.role,c.hex,c.rgb,c.hsl,`${c.contrastOnWhite}:1`,`${c.contrastOnBlack}:1`,c.source]);
  const fontRows=snapshot.fonts.map(f=>[f.family,f.weights.join(', ')||'not determined',f.exampleSize,f.exampleLineHeight,f.sampleRoles.join(', ')]);
  const spacingRows=snapshot.spacing.map((s,i)=>[`space-${i+1}`,s.value,s.count]);
  const componentRows=snapshot.components.map(c=>[c.type,c.count,c.variants.slice(0,4).join('; ')||'not determined',c.states.join('; '),c.examples.slice(0,4).map(escapeMarkdown).join('; ')||'—']);
  const layoutRows=snapshot.layout.sections.map((s,i)=>[i+1,s.tag,s.label||'Unnamed section',`${s.height}px`]);
  const motionRows=snapshot.motion.map(m=>[m.name,m.duration,m.easing,m.trigger]);
  const tokenJson=JSON.stringify({metadata:{sourceUrl:snapshot.url,finalUrl:snapshot.finalUrl,brand:snapshot.brandName,analyzedAt:snapshot.analyzedAt},colors:snapshot.colors,typography:snapshot.fonts,spacing:snapshot.spacing,layout:snapshot.layout,components:snapshot.components,motion:snapshot.motion,imagery:snapshot.imagery,accessibility:snapshot.accessibility,cssVariables:Object.fromEntries(Object.entries(snapshot.cssVariables).slice(0,200)),methodology:{method:snapshot.method,caveat:'Measured values are sampled from one unauthenticated browser render. Inferences and fallback values are labelled.'}},null,2);
  const source=snapshot.finalUrl.replace(/[<>]/g,'');const brand=snapshot.brandName.replace(/[\r\n|]/g,' ').trim();
  const sectionNames=snapshot.layout.sections.length?snapshot.layout.sections.map(s=>s.label||s.tag).filter(Boolean).slice(0,14).join(' → '):'No semantic section sequence confidently detected.';
  const headings=snapshot.rawEvidence.headings.length?table(['Level','Text','Computed size','Weight'],snapshot.rawEvidence.headings.slice(0,28).map(h=>[`H${h.level}`,h.text,h.size,h.weight])):'_No visible semantic headings were detected in the sampled DOM._';
  const variables=Object.entries(snapshot.cssVariables).slice(0,80).map(([k,v])=>`| \`${k}\` | \`${v.replace(/\|/g,'\\|').slice(0,180)}\` |`).join('\n');
  const contrastNotes=snapshot.colors.map(c=>`- **${c.name} (${c.hex})** — ${c.contrastOnWhite}:1 against white; ${c.contrastOnBlack}:1 against black. These are standalone color checks, not proof of a real component pairing.`).join('\n');
  return `# Design System: ${brand||new URL(snapshot.url).hostname}

> Reverse-engineered visual design notes generated by DesignLens. Treat these findings as a structured snapshot, not the source-of-truth brand specification.

- **Source:** ${source}
- **Captured:** ${date}
- **Method:** ${snapshot.method}
- **Confidence legend:** *Observed* = browser-computed or directly detected; *inferred* = role mapping or fallback where source values were not available.

## 1. Brand Identity

| Attribute | Finding | Confidence |
|---|---|---|
| Brand / site name | ${escapeMarkdown(snapshot.brandName)} | Inferred from metadata and page title |
| Title | ${escapeMarkdown(snapshot.title)} | Observed |
| Tagline / primary message | ${escapeMarkdown(snapshot.tagline)} | ${screenshotOnly?'Not extracted from screenshot text':'Observed from H1 when present'} |
| Meta description | ${escapeMarkdown(snapshot.description||'Not supplied by page metadata.')} | Observed |
| Logo description | ${escapeMarkdown(snapshot.logoDescription)} | DOM-based heuristic |
| Favicon | ${snapshot.favicon?`[favicon](${snapshot.favicon.replace(/[\s)]/g,'')})`:'No favicon link detected'} | Observed |
| Brand tone | ${escapeMarkdown(narrative.tone)} | Inferred from visible copy and structure |

## 2. Color System

${screenshotOnly?'Colors are sampled from quantized screenshot pixels. Semantic roles and contrast numbers are inferred; no computed CSS color values were available. Contrast numbers compare each color against pure white/black, not real component pairs.':'Semantic roles are assigned from CSS variable names when possible; otherwise they are inferred from computed-style frequency, page background/text, and colorfulness. Contrast numbers are standalone checks against pure white/black, not a complete pairwise WCAG audit.'}

${table(['Token','Role','HEX','RGB','HSL','On white','On black','Source'],colorRows)}

### Contrast notes

${contrastNotes||'- No reliable colors were extracted.'}

## 3. Typography Scale

${table(['Family','Weights sampled','Example size','Example line-height','Observed roles / elements'],fontRows)}

### Heading specimens

${headings}

### Pairing rationale

${escapeMarkdown(narrative.pairingRationale)}

> ${screenshotOnly?'Typography values are not observable from this image. The following sizes are illustrative implementation defaults only, not extracted measurements.':'Size values are sampled examples from the rendered page, not necessarily a complete H1–H6 scale. Practical interpolations for missing levels (inferred, not observed):'} H1 \`clamp(2.5rem, 5vw, 5rem)\`, H2 \`clamp(2rem, 3.4vw, 3.25rem)\`, H3 \`clamp(1.5rem, 2.2vw, 2rem)\`, H4 \`1.5rem\`, H5 \`1.25rem\`, H6 \`1rem\`, body \`1rem\`, caption \`0.8125rem\`.

## 4. Spacing & Grid

${table(['Token','Value','Occurrences sampled'],spacingRows)}

- **Likely base unit:** ${snapshot.spacing[0]?.value||'4px (inferred fallback; no confident base unit detected)'}
- **${screenshotOnly?'Screenshot dimensions':'Viewport sampled'}:** ${snapshot.layout.viewport.width} × ${snapshot.layout.viewport.height}px
- **Rendered page width:** ${snapshot.layout.pageWidth}px
- **Detected grid column counts:** ${snapshot.layout.gridColumns.length?snapshot.layout.gridColumns.join(', '):'No CSS Grid column tracks detected'}
- **Measured container-width samples:** ${snapshot.layout.containerWidths.length?snapshot.layout.containerWidths.join(', ')+'px':'No reliable container widths sampled'}
- **Breakpoints from readable media queries:** ${snapshot.layout.breakpoints.join(', ')}px${snapshot.rawEvidence.mediaQueries.length?'':' (common inferred defaults; media queries were unavailable)'}
- **Grid fallback if source evidence is missing:** 12 columns wide, 8 tablet, 4 mobile; 24px desktop gutters and 16px mobile gutters. These are recommendations, not detected source values.

## 5. Layout Architecture

- **Header positioning:** ${snapshot.layout.headerPosition}
- **Footer present:** ${snapshot.layout.footerPresent?'Yes':'Not detected'}
- **Section sequence:** ${escapeMarkdown(sectionNames)}

${table(['#','Element','Visible label / content sample','Approx. height'],layoutRows)}

${screenshotOnly?'The dimensions above describe the uploaded image, not a browser viewport. A single screenshot cannot establish page sections, Grid/Flexbox ratios, sticky behavior, or responsive stacking.':'Layout ratios are measured from the sampled viewport only. Confirm Grid/Flexbox ratios, sticky behavior and responsive stacking at relevant widths. This inspection does not emulate every breakpoint or user state; unobserved behavior remains a hypothesis.'}

## 6. Component Inventory

${table(['Component family','Count','Variant evidence','States inspected / inferred','Examples'],componentRows)}

**Inventory notes:** ${screenshotOnly?'A static screenshot cannot identify DOM component types, control states, ARIA semantics, or working interactions. This section is intentionally left unverified.':'Buttons and form controls are counted from visible elements. Cards and badges are heuristically detected using semantic elements and class-name patterns; absence does not prove the component does not exist. Hover, active, disabled, validation and modal states are not forcibly triggered.'}

${snapshot.components.map(c=>`### ${c.type}\n\n- **Count:** ${c.count}\n- **Variants:** ${c.variants.join(', ')||'Not confidently extracted'}\n- **States:** ${c.states.join(', ')}\n- **Examples:** ${c.examples.slice(0,8).map(escapeMarkdown).join('; ')||'None sampled'}\n`).join('\n')}
## 7. Iconography & Imagery

- **Visible raster images:** ${screenshotOnly?'Not measurable as source assets from a static screenshot':snapshot.imagery.imageCount}
- **Visible SVG elements:** ${screenshotOnly?'Not measurable from pixels alone':snapshot.imagery.svgCount}
- **Iconography:** ${snapshot.imagery.iconStyle}
- **Image treatment:** ${snapshot.imagery.imageTreatments.join('; ')||'Not determined'}
- **Border-radius samples:** ${snapshot.radii.length?snapshot.radii.join(', '):'No non-zero radius confidently sampled'}
- **Shadow / elevation samples:** ${snapshot.shadows.length?snapshot.shadows.map(v=>`\`${v}\``).join('; '):'No non-none box shadows confidently sampled'}
- **Image alt samples:** ${snapshot.rawEvidence.imageAlts.slice(0,20).map(v=>v?`“${escapeMarkdown(v)}”`:'_empty_').join(', ')||'No visible image alt sample'}

## 8. Motion & Interaction

${table(['Animation / transition','Duration','Easing','Trigger / confidence'],motionRows)}

${screenshotOnly?'Motion and transitions cannot be detected from a static image. The absence of entries below means “not observable”, not “no motion”.':'This is a static style inspection. A computed transition is evidence an element can animate, not proof of its trigger. Scroll-linked motion, entrance sequences and spring behavior may require runtime interaction recording to confirm.'}

## 9. Accessibility Notes

${table(['Check','Finding','Interpretation'],[
['Images without alt attribute',screenshotOnly?'Not assessable':snapshot.accessibility.missingAlt,'Observed count among visible images'],['Buttons without a detectable label',screenshotOnly?'Not assessable':snapshot.accessibility.buttonsWithoutLabels,'Observed count; some icon-only controls may use labels the heuristic cannot read'],['Explicit focus CSS selector',screenshotOnly?'Not assessable':snapshot.accessibility.focusStylesFound?'Detected':'Not detected','Browser default focus indication may still exist'],['Potential contrast concerns',screenshotOnly?'Not assessable':snapshot.accessibility.contrastCandidates,'Heuristic screening; actual foreground/background pairs are needed'],['ARIA patterns',screenshotOnly?'Not assessable from pixels':'Limited semantic and label sampling','Not a complete accessibility-tree or keyboard audit']])}

${snapshot.accessibility.notes.map(n=>`- ${escapeMarkdown(n)}`).join('\n')}

**Audit limit:** This does not replace manual keyboard and screen-reader testing, WCAG pairwise contrast measurements, form validation testing, zoom/reflow checks, or a complete accessibility audit.

## 10. Design Tokens

### CSS variables

The following variables map the extracted palette and spacing into semantic names. They are normalized design roles; original variables are listed separately when readable.

\`\`\`css
${semanticCss(snapshot)}
\`\`\`

### Source custom properties (sample)

| Variable | Value |
|---|---|
${variables||'| No readable custom properties | Semantic variables are supplied above |'}

### JSON token export

\`\`\`json
${tokenJson}
\`\`\`

## 11. Design Persona

${narrative.persona}

**Working principle:** Preserve observed contrast, typography hierarchy, spacing cadence and shape language before adding decorative patterns. Treat unobserved interactions and inferred tokens as hypotheses to validate.

## 12. References & Attribution

- **Requested URL:** ${snapshot.url}
- **${screenshotOnly?'Attribution URL (not fetched)':'Final rendered URL'}:** ${source}
- **Captured at (UTC):** ${date}
- **Favicon:** ${snapshot.favicon||'Not detected'}
- **Method:** ${snapshot.method}
- **Storage:** DesignLens does not write reports to a database. The current implementation keeps results in short-lived process memory for cache/refresh convenience and in browser session storage after analysis. Cache entries expire after 24 hours but can be lost on server restart or serverless instance changes.
- **Attribution:** The website, brand, copy, marks and imagery belong to their respective owners. This analysis aid does not imply affiliation or ownership.
- **Limits:** Only public unauthenticated pages are inspected. CAPTCHA bypass, login bypass, paywall evasion and restricted endpoints are not attempted. Some stylesheets may be unreadable across browser security boundaries. If a host blocks analysis, request authorization or use a manually supplied screenshot outside this automated scrape.
${snapshot.warnings.length?`\n### Extraction warnings\n\n${snapshot.warnings.map(w=>`- ${escapeMarkdown(w)}`).join('\n')}\n`:''}
---

_Generated by DesignLens · Report reference: \`${slugify(snapshot.brandName)}-${date.slice(0,10)}\`_
`;
}
