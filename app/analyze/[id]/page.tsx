'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRightLeft, ArrowUpRight, Check, ChevronDown, CircleHelp, Copy, Download, ExternalLink, FileArchive, FileText, GitCompareArrows, LoaderCircle, Palette, Share2, Sparkles, WandSparkles, X } from 'lucide-react';
import CursorSpotlight from '@/components/cursor-spotlight';
import ThemeToggle from '@/components/theme-toggle';
import CommandPalette from '@/components/command-palette';
import DesignMdViewer from '@/components/design-md-viewer';
import TokenVisualizer from '@/components/token-visualizer';
import AnalysisLoader from '@/components/analysis-loader';
import { readResponseStream, slugify } from '@/lib/utils';
import type { AnalysisResult } from '@/lib/types';

const RESTYLE_GUIDES:Record<string,string> = {
  Linear:'A sharper product-led interpretation: reduce ornamental noise, tighten the spacing cadence, lean on quiet neutrals with one decisive accent, use crisp borders, and let typographic hierarchy and keyboard-first interactions do the work. This is a creative direction, not a claim about the source site.',
  Stripe:'An expressive platform interpretation: use confident editorial type, generous rhythm, layered color fields, clear explanation-first section flow, and high-contrast but accessible calls to action. This is a creative direction, not a claim about the source site.',
  Vercel:'A developer-tool interpretation: emphasize monochrome clarity, deliberate negative space, hairline dividers, technical labels, fast feedback, and code-like precision. This is a creative direction, not a claim about the source site.',
};

export default function AnalyzeResultPage() {
  const params=useParams<{id:string}>(); const id=params.id; const router=useRouter();
  const [result,setResult]=useState<AnalysisResult|null>(null);
  const [markdown,setMarkdown]=useState('');
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  const [loadError,setLoadError]=useState('');
  const [toast,setToast]=useState('');
  const [busy,setBusy]=useState<'md'|'zip'|'share'|'card'|''>('');
  const [celebrate,setCelebrate]=useState(false);
  const [compareOpen,setCompareOpen]=useState(false);
  const [compareUrl,setCompareUrl]=useState('');
  const [compareResult,setCompareResult]=useState<AnalysisResult|null>(null);
  const [compareLoading,setCompareLoading]=useState(false);
  const [compareError,setCompareError]=useState('');
  const [restyle,setRestyle]=useState('');
  const [activePane,setActivePane]=useState<'document'|'tokens'>('document');

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      try {
        const saved=sessionStorage.getItem(`designlens-result-${id}`);
        if(saved){const parsed=JSON.parse(saved) as AnalysisResult;if(alive){setResult(parsed);setMarkdown(parsed.markdown);setStatus('ready');}return;}
        const response=await fetch(`/api/analyze?id=${encodeURIComponent(id)}`,{cache:'no-store'});
        if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'This analysis is no longer available.');
        const parsed=await response.json() as AnalysisResult;
        if(alive){setResult(parsed);setMarkdown(parsed.markdown);setStatus('ready');try{sessionStorage.setItem(`designlens-result-${id}`,JSON.stringify(parsed))}catch{}}
      } catch(error) {if(alive){setLoadError(error instanceof Error?error.message:'Unable to load this analysis.');setStatus('error')}}
    };
    void load();return()=>{alive=false};
  },[id]);
  useEffect(()=>{if(!toast)return;const timer=window.setTimeout(()=>setToast(''),2600);return()=>window.clearTimeout(timer)},[toast]);
  const colors=result?.snapshot.colors||[];
  useEffect(()=>{if(colors.length){document.documentElement.style.setProperty('--report-primary',colors.find(c=>c.role==='primary')?.hex||'#8F7BFF');document.documentElement.style.setProperty('--report-accent',colors.find(c=>c.role==='accent')?.hex||'#46D8E5');}},[colors]);

  const copy=useCallback(async(text:string)=>{
    try{await navigator.clipboard.writeText(text);setToast('Copied to clipboard.')}catch{setToast('Clipboard access is unavailable in this browser.');}
  },[]);
  const download=async(format:'md'|'zip')=>{
    if(!result)return;setBusy(format);
    try {
      const response=await fetch('/api/export',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({format,markdown,filename:`${slugify(result.snapshot.brandName)}-design-system`,tokens:{colors:result.snapshot.colors,fonts:result.snapshot.fonts,spacing:result.snapshot.spacing,layout:result.snapshot.layout,components:result.snapshot.components,motion:result.snapshot.motion,cssVariables:result.snapshot.cssVariables},screenshotDataUrl:result.snapshot.screenshotDataUrl})});
      if(!response.ok)throw new Error((await response.json().catch(()=>({}))).error||'Export failed.');
      const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${slugify(result.snapshot.brandName)}-design-system.${format==='md'?'md':'zip'}`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('designlens:track',{detail:{name:'report_downloaded'}}));
      setCelebrate(true);window.setTimeout(()=>setCelebrate(false),1500);setToast(format==='md'?'Markdown downloaded.':'Design bundle downloaded.');
    } catch(error){setToast(error instanceof Error?error.message:'Export could not be completed.')}finally{setBusy('')}
  };
  const share=async()=>{
    if(!result)return;setBusy('share');
    try {
      if(navigator.share) await navigator.share({title:`${result.snapshot.brandName} design system`,text:'A DesignLens reverse-engineered design system report.',url:window.location.href});
      else {await navigator.clipboard.writeText(window.location.href);setToast('Share link copied. Note: report links depend on the current ephemeral session/cache.');}
    }catch(error){if(error instanceof Error&&error.name!=='AbortError')setToast('Sharing is not available here.')}finally{setBusy('')}
  };
  const shareCard=async()=>{
    setBusy('card');
    try {
      const node=document.getElementById('share-card-capture');if(!node)throw new Error('Share card is not ready.');
      const { toPng } = await import('html-to-image');
      const data=await toPng(node,{pixelRatio:2,cacheBust:true,backgroundColor:'#0A0A0F'});
      const a=document.createElement('a');a.href=data;a.download=`${slugify(result?.snapshot.brandName||'website')}-designlens-card.png`;a.click();setToast('Social card generated.');
    }catch(error){setToast(error instanceof Error?error.message:'Could not create the social card.')}finally{setBusy('')}
  };
  const runCompare=async()=>{
    const raw=compareUrl.trim();if(!raw)return;const val=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;setCompareLoading(true);setCompareError('');const received:{result:AnalysisResult|null}={result:null};let frameError='';
    try {
      const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:val})});
      await readResponseStream(response,event=>{if(event.type==='result')received.result=event.result as AnalysisResult;else if(event.type==='error')frameError=String(event.error||'Comparison failed.')});
      if(frameError)throw new Error(frameError);const comparison=received.result as AnalysisResult|null;if(!comparison)throw new Error('No comparison report was returned.');
      setCompareResult(comparison);setToast('Comparison system loaded.');
    }catch(error){setCompareError(error instanceof Error?error.message:'Could not compare that website.')}finally{setCompareLoading(false)}
  };
  const applyRestyle=()=>{
    if(!result||!restyle)return;
    const start='## 11. Design Persona';const end='## 12. References & Attribution';const a=markdown.indexOf(start),b=markdown.indexOf(end);
    if(a<0||b<a){setToast('Could not locate the design persona section.');return;}
    const original=markdown.slice(a,b);
    const replaced=`${start}\n\n**Creative lens: ${restyle}.**\n\n${RESTYLE_GUIDES[restyle]}\n\n**Source evidence remains unchanged.** Color measurements, type samples, counts, and accessibility notes above are still based on the original website. Treat this lens as a restyling brief, not an extraction result.\n\n`;
    setMarkdown(markdown.slice(0,a)+replaced+markdown.slice(b));setToast(`${restyle} creative lens applied to the persona section.`);
  };
  const commandAction=(action:string)=>{
    if(action==='analyze')router.push('/#url-input-wrap');
    if(action==='features')router.push('/#features');
    if(action==='theme')document.querySelector<HTMLButtonElement>('.theme-button')?.click();
    if(action==='docs')window.open('https://github.com/','_blank','noopener,noreferrer');
    if(action==='github')setToast('Project source is available in the generated project package.');
  };
  const mainColors=colors.slice(0,7);

  if(status==='loading')return <main className="result-loading-screen"><CursorSpotlight/><AnalysisLoader progress={92} stage="synthesis" label="Restoring your design system" detail="Loading the report from this browser session."/></main>;
  if(status==='error')return <main className="expired-screen"><CursorSpotlight/><div className="expired-card"><Link href="/" className="brand-lockup"><span className="brand-mark"><span/><span/><span/><span/></span><span className="brand-word">design<span>lens</span></span></Link><div className="expired-icon"><CircleHelp size={24}/></div><p className="eyebrow">SESSION NOT FOUND</p><h1>This report has<br/><em>left the studio.</em></h1><p>{loadError} Reports are ephemeral and may be lost if the server instance restarts. You can recreate the report from its original public URL.</p><button className="analyze-button" onClick={()=>router.push('/')}><ArrowLeft size={16}/> Analyze another URL <ArrowUpRight size={15}/></button></div><ThemeToggle/></main>;
  if(!result)return null;

  return <main className="result-app" style={{'--report-primary':colors.find(c=>c.role==='primary')?.hex||'#8F7BFF','--report-accent':colors.find(c=>c.role==='accent')?.hex||'#46D8E5'} as React.CSSProperties}>
    <CursorSpotlight/><div className="report-ambient report-ambient-one"/><div className="report-ambient report-ambient-two"/>
    <header className="result-header"><Link href="/" className="brand-lockup"><span className="brand-mark"><span/><span/><span/><span/></span><span className="brand-word">design<span>lens</span></span><span className="brand-version">BETA / 01</span></Link><div className="result-breadcrumb"><span className="breadcrumb-divider">/</span><span>ANALYSIS</span><ChevronDown size={12}/><span className="breadcrumb-domain">{new URL(result.url).hostname}</span></div><div className="result-header-actions"><CommandPalette onAction={commandAction}/><ThemeToggle/><Link className="back-home" href="/"><ArrowLeft size={14}/> New analysis</Link></div></header>
    <section className="result-titlebar"><div className="result-title-left"><div className="result-eyebrow"><span className="tiny-live-dot"/> ANALYSIS COMPLETE <span className="result-eyebrow-sep">/</span><span>{new Date(result.snapshot.analyzedAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</span></div><h1>{result.snapshot.brandName}<span className="title-subtitle">’s design <em>DNA.</em></span></h1><div className="result-source"><span className="source-icon"><ExternalLink size={13}/></span><a href={result.snapshot.finalUrl} target="_blank" rel="noreferrer">{result.snapshot.finalUrl}</a><span className="source-status">{result.snapshot.method.startsWith('Screenshot-only')?'SCREENSHOT-ONLY':'PUBLIC PAGE'}</span><span className="result-source-dot">·</span><span>{result.snapshot.colors.length} color tokens detected</span></div></div><div className="result-title-right"><div className="quality-stamp"><span className="stamp-orbit"><Sparkles size={16}/></span><span><b>12</b><small>REPORT SECTIONS</small></span></div><div className="result-top-colors">{mainColors.slice(0,5).map(c=><span key={c.hex} style={{background:c.hex}} title={`${c.name}: ${c.hex}`}/>)}</div></div></section>

    <div className="result-toolbar"><div className="toolbar-left"><span className="toolbar-ready"><span className="tiny-live-dot"/> REPORT READY</span><span className="toolbar-separator"/><button className="toolbar-button" onClick={()=>copy(markdown)}><Copy size={14}/> Copy Markdown</button><button className="toolbar-button" onClick={()=>setCompareOpen(v=>!v)}><GitCompareArrows size={14}/> Compare</button></div><div className="toolbar-right"><div className="restyle-control"><WandSparkles size={14}/><select aria-label="Choose a creative restyling lens" value={restyle} onChange={e=>setRestyle(e.target.value)}><option value="">Prompt-to-restyle</option><option>Linear</option><option>Stripe</option><option>Vercel</option></select><button onClick={applyRestyle} disabled={!restyle} title="Apply the selected creative lens">Apply</button></div><button className="toolbar-button" onClick={shareCard} disabled={busy==='card'}>{busy==='card'?<LoaderCircle size={14} className="spin"/>:<Sparkles size={14}/>} Social card</button><button className="toolbar-button" onClick={share} disabled={busy==='share'}>{busy==='share'?<LoaderCircle size={14} className="spin"/>:<Share2 size={14}/>} Share</button><button className="export-button" onClick={()=>download('md')} disabled={busy==='md'}>{busy==='md'?<LoaderCircle size={15} className="spin"/>:<Download size={15}/>} Download .md</button><button className="export-zip-button" onClick={()=>download('zip')} disabled={busy==='zip'} title="Download Markdown, JSON tokens and page screenshot">{busy==='zip'?<LoaderCircle size={15} className="spin"/>:<FileArchive size={15}/>} ZIP</button></div></div>

    {compareOpen&&<section className="compare-panel"><div className="compare-panel-head"><div><span className="eyebrow"><span>COMPARE MODE</span></span><h2>Two sites. <em>Two systems.</em></h2><p>Analyze a second public URL to compare the extracted color palettes side by side.</p></div><button className="bare-icon compare-close" onClick={()=>setCompareOpen(false)} aria-label="Close compare mode"><X size={17}/></button></div><div className="compare-input-row"><div className="compare-input-shell"><ExternalLink size={16}/><input value={compareUrl} onChange={e=>setCompareUrl(e.target.value)} placeholder="https://another-website.com" onKeyDown={e=>{if(e.key==='Enter')void runCompare()}} aria-label="Second URL to compare"/><button onClick={()=>void runCompare()} disabled={!compareUrl.trim()||compareLoading}>{compareLoading?<LoaderCircle size={15} className="spin"/>:<ArrowRightLeft size={15}/>} Compare URL</button></div>{compareError&&<p className="compare-error" role="alert">{compareError}</p>}</div>
      {compareResult&&<div className="compare-results"><div className="compare-site"><div className="compare-site-name"><span className="tiny-live-dot"/>{result.snapshot.brandName}<small>{new URL(result.url).hostname}</small></div><div className="compare-palette">{result.snapshot.colors.slice(0,8).map(c=><button key={c.hex} title={`${c.name}: ${c.hex}`} onClick={()=>void copy(c.hex)} style={{background:c.hex}}><span>{c.hex}</span></button>)}</div><p>{result.snapshot.fonts.slice(0,2).map(f=>f.family.split(',')[0]).join(' + ')}</p></div><div className="compare-divider"><ArrowRightLeft size={16}/></div><div className="compare-site"><div className="compare-site-name"><span className="tiny-live-dot"/>{compareResult.snapshot.brandName}<small>{new URL(compareResult.url).hostname}</small></div><div className="compare-palette">{compareResult.snapshot.colors.slice(0,8).map(c=><button key={c.hex} title={`${c.name}: ${c.hex}`} onClick={()=>void copy(c.hex)} style={{background:c.hex}}><span>{c.hex}</span></button>)}</div><p>{compareResult.snapshot.fonts.slice(0,2).map(f=>f.family.split(',')[0]).join(' + ')}</p></div></div>}
    </section>}

    <div className="mobile-pane-switch"><button className={activePane==='document'?'active':''} onClick={()=>setActivePane('document')}><FileText size={14}/> design.md</button><button className={activePane==='tokens'?'active':''} onClick={()=>setActivePane('tokens')}><Palette size={14}/> Token visualizer</button></div>
    <section className={`report-workspace pane-${activePane}`}>
      <div className="report-main-pane"><DesignMdViewer markdown={markdown}/></div>
      <aside className="report-side-pane"><div className="side-pane-sticky"><div className="side-pane-heading"><div><span className="eyebrow"><span>VISUAL COMPANION</span></span><h2>The live <em>tokens.</em></h2></div><span className="side-pane-spark"><Sparkles size={15}/></span></div><p className="side-pane-description">A small, interactive map of the values detected in the source page. Click any token to copy.</p><TokenVisualizer snapshot={result.snapshot} onCopy={value=>void copy(value)}/><div className="side-pane-disclaimer"><CircleHelp size={13}/><span>Measured evidence and inferred roles are both included. See the report for confidence notes.</span></div></div></aside>
    </section>
    <footer className="result-footer"><Link href="/" className="result-footer-brand"><span className="brand-mark small"><span/><span/><span/><span/></span>DESIGNLENS</Link><span>FROM A PUBLIC URL TO A REUSABLE SYSTEM.</span><div><button onClick={()=>void copy(result.url)}>COPY SOURCE URL <Copy size={12}/></button><Link href="/">START A NEW ANALYSIS <ArrowUpRight size={13}/></Link></div></footer>
    <div className="share-card-offscreen" aria-hidden="true"><div id="share-card-capture" className="share-card-capture"><div className="share-card-top"><span className="brand-mark"><span/><span/><span/><span/></span><span>DESIGNLENS / FIELD NOTES</span><span className="share-card-no">DL—{id.slice(0,4).toUpperCase()}</span></div><p className="share-card-kicker">DESIGN SYSTEM REPORT</p><h2>{result.snapshot.brandName}<br/><em>decoded.</em></h2><p className="share-card-url">{new URL(result.url).hostname}</p><div className="share-card-palette">{result.snapshot.colors.slice(0,8).map(c=><span key={c.hex} style={{background:c.hex}}/> )}</div><div className="share-card-bottom"><div><small>TYPOGRAPHY</small><b>{result.snapshot.fonts.slice(0,2).map(f=>f.family.split(',')[0]).join(' × ')}</b></div><div><small>EXTRACTED</small><b>{result.snapshot.colors.length} COLORS · {result.snapshot.components.length} COMPONENT GROUPS</b></div></div><span className="share-card-watermark">designlens</span></div></div>
    {toast&&<motion.div className="toast-message" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}} role="status"><Check size={15}/>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss message"><X size={13}/></button></motion.div>}
    {celebrate&&<div className="confetti-burst" aria-hidden="true">{Array.from({length:26},(_,i)=><i key={i} style={{'--confetti-index':i,'--confetti-hue':(i*43)%360} as React.CSSProperties}/>)}</div>}
  </main>;
}
