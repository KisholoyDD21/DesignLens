'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Braces, Check, ChevronRight, Command, FileCode2, Fingerprint, Layers3, LockKeyhole, MousePointer2, Palette, ScanSearch, ShieldCheck, Sparkles, WandSparkles, Workflow, Zap } from 'lucide-react';
import HeroUrlInput from '@/components/hero-url-input';
import AnalysisLoader from '@/components/analysis-loader';
import CursorSpotlight from '@/components/cursor-spotlight';
import ThemeToggle from '@/components/theme-toggle';
import CommandPalette from '@/components/command-palette';
import UserMenu from '@/components/user-menu';
import { readResponseStream } from '@/lib/utils';
import type { AnalysisResult } from '@/lib/types';

const examples = [
  {domain:'linear.app',label:'Linear',type:'PRODUCT / SAAS',colors:['#5E6AD2','#818CF8','#16171D','#F4F4F5'],heading:'Move fast. Stay aligned.',style:'linear'},
  {domain:'stripe.com',label:'Stripe',type:'FINANCE / PLATFORM',colors:['#635BFF','#80E9FF','#0A2540','#F6F9FC'],heading:'Financial infrastructure.',style:'stripe'},
  {domain:'vercel.com',label:'Vercel',type:'DEVELOPER / PLATFORM',colors:['#000000','#FFFFFF','#0070F3','#EAEAEA'],heading:'Build ships faster.',style:'vercel'},
  {domain:'notion.so',label:'Notion',type:'WORKSPACE / PRODUCTIVITY',colors:['#171717','#F7F6F3','#D8D5CE','#E8A33B'],heading:'One workspace. Every team.',style:'notion'},
];
const featureItems = [
  {number:'01',title:'See the DNA',tag:'COLOR + TYPE',description:'Pull colors, font stacks, spacing rhythms, and the visual rules hiding in computed styles.',icon:Palette,kind:'palette'},
  {number:'02',title:'Map the system',tag:'LAYOUT + UI',description:'Turn the page into an inventory of sections, component families, states, breakpoints, and motion.',icon:Workflow,kind:'map'},
  {number:'03',title:'Ship the spec',tag:'MARKDOWN + TOKENS',description:'Export one polished design.md, machine-readable JSON tokens, and the page snapshot.',icon:Braces,kind:'code'},
];

export default function LandingPage() {
  const router=useRouter();
  const reduceMotion=useReducedMotion();
  const [loading,setLoading]=useState(false);
  const [loader,setLoader]=useState({progress:5,stage:'robots',label:'Preparing a secure browser session',detail:'Validating the public destination.'});
  const [error,setError]=useState('');
  const [lastAttemptedUrl,setLastAttemptedUrl]=useState('');
  const [partialOutput,setPartialOutput]=useState('');
  const [exampleIndex,setExampleIndex]=useState(0);
  useEffect(()=>{const timer=window.setInterval(()=>setExampleIndex(v=>(v+1)%examples.length),3900);return()=>window.clearInterval(timer)},[]);

  const runAnalysis=async(payload:Record<string,unknown>, initialDetail:string)=>{
    setError('');setPartialOutput('');setLoading(true);setLoader({progress:4,stage:'robots',label:'Preparing a secure analysis',detail:initialDetail});
    const received:{result:AnalysisResult|null}={result:null}; let streamError='';
    try {
      const response=await fetch('/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      await readResponseStream(response,event=>{
        if(event.type==='stage') setLoader({progress:Number(event.progress)||0,stage:String(event.stage||''),label:String(event.label||''),detail:String(event.detail||'')});
        else if(event.type==='result') received.result=event.result as AnalysisResult;
        else if(event.type==='chunk') setPartialOutput(current=>(current+String(event.text||'')).slice(-12000));
        else if(event.type==='error') streamError=String(event.error||'Analysis failed.');
      });
      if(streamError)throw new Error(streamError);
      const finalResult=received.result as AnalysisResult|null;
      if(!finalResult)throw new Error('The analysis finished without a report. Please try again.');
      try { sessionStorage.setItem(`designlens-result-${finalResult.id}`,JSON.stringify(finalResult)); }
      catch { const lightweight={...finalResult,snapshot:{...finalResult.snapshot,screenshotDataUrl:undefined}};try{sessionStorage.setItem(`designlens-result-${finalResult.id}`,JSON.stringify(lightweight))}catch{/* Use server-side short-lived retrieval as fallback. */} }
      router.push(`/analyze/${finalResult.id}`);
    } catch(err) {
      setError(err instanceof Error?err.message:'Could not analyze this website.');setLoading(false);
    }
  };
  const analyze=async(url:string)=>{
    window.dispatchEvent(new CustomEvent('designlens:track',{detail:{name:'analysis_started'}}));
    setLastAttemptedUrl(url);
    await runAnalysis({mode:'url',url},'Checking the URL and access policy.');
  };
  const analyzeScreenshot=async(file:File)=>{
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)){setError('Choose a PNG, JPEG, or WebP screenshot.');return;}
    if(file.size>3*1024*1024){setError('Screenshot must be 3 MB or smaller.');return;}
    window.dispatchEvent(new CustomEvent('designlens:track',{detail:{name:'screenshot_analysis_started'}}));
    try {
      const screenshotDataUrl=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(new Error('Could not read screenshot.'));reader.onerror=()=>reject(new Error('Could not read screenshot.'));reader.readAsDataURL(file);
      });
      await runAnalysis({mode:'screenshot',screenshotDataUrl,sourceUrl:lastAttemptedUrl||undefined},'Using screenshot-only mode. The supplied image is analyzed locally on the server; no URL is fetched.');
    } catch(err) { setError(err instanceof Error?err.message:'Could not read the screenshot.'); }
  };
  const commandAction=(action:string)=>{
    if(action==='analyze')document.getElementById('url-input-wrap')?.scrollIntoView({behavior:'smooth',block:'center'});
    else if(action==='features')document.getElementById('features')?.scrollIntoView({behavior:'smooth',block:'start'});
    else if(action==='theme')document.querySelector<HTMLButtonElement>('.theme-button')?.click();
    else if(action==='docs')document.getElementById('how-it-works')?.scrollIntoView({behavior:'smooth',block:'start'});
    else if(action==='github')setError('The project source is included in the DesignLens ZIP package and README.');
  };
  const words='Turn any website'.split(' ');
  return <main className="landing-page">
    <CursorSpotlight/>
    <div className="ambient ambient-one" aria-hidden="true"/><div className="ambient ambient-two" aria-hidden="true"/><div className="ambient ambient-three" aria-hidden="true"/>
    <header className="site-header">
      <a href="#top" className="brand-lockup" aria-label="DesignLens home"><span className="brand-mark"><span/><span/><span/><span/></span><span className="brand-word">design<span>lens</span></span><span className="brand-version">BETA / 01</span></a>
      <nav className="top-nav" aria-label="Main navigation"><a href="#features">Toolkit</a><a href="#how-it-works">How it works</a><a href="#manifesto">Manifesto</a></nav>
      <div className="header-actions"><CommandPalette onAction={commandAction}/><ThemeToggle/><UserMenu/></div>
    </header>

    <section className="hero-section" id="top">
      <div className="hero-grid-lines" aria-hidden="true"/>
      <motion.div className="hero-copy" initial={reduceMotion?false:{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.7,ease:[.2,.7,.2,1]}}>
        <div className="hero-kicker"><span className="kicker-line"/><span>THE REVERSE-ENGINEERING TOOLKIT</span><span className="kicker-pill">NOW IN BETA <span/></span></div>
        <h1>{words.map((word,index)=><motion.span key={word} className="headline-word" initial={reduceMotion?false:{opacity:0,y:34,filter:'blur(7px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} transition={{duration:.7,delay:.12*index,ease:[.2,.7,.2,1]}}>{word}{index===2?'':''} </motion.span>)}<br/><span className="headline-last"><em>into a design</em><span className="headline-highlight"> system.</span></span></h1>
        <p className="hero-subhead">A URL in. A design system out. See the invisible rules behind the internet’s best interfaces — beautifully documented, ready to build with.</p>
        <div className="hero-points"><span><Check size={13}/> Real browser inspection</span><span><Check size={13}/> Exportable design.md</span><span><Check size={13}/> No account needed</span></div>
      </motion.div>
      <motion.div className="hero-workspace" initial={reduceMotion?false:{opacity:0,y:28,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.85,delay:.18,ease:[.2,.7,.2,1]}}>
        <div className="workspace-backdrop-grid" aria-hidden="true"/>
        <div className="workspace-meta"><span><span className="live-pulse"/> ANALYSIS WORKSPACE</span><span className="workspace-meta-right">01 <span>/</span> INPUT</span></div>
        <div className="workspace-display">
          <div className="display-shimmer"/>
          <div className="display-top"><span className="display-window-dots"><i/><i/><i/></span><span className="display-url"><LockKeyhole size={10}/> {examples[exampleIndex].domain}</span><span className="display-status">PUBLIC</span></div>
          <div className={`site-preview preview-${examples[exampleIndex].style}`} key={examples[exampleIndex].style}>
            <div className="preview-nav"><span className="preview-brand-mark"/><span>{examples[exampleIndex].label}</span><i/><i/><i/><b>↗</b></div>
            <div className="preview-hero-copy"><span className="preview-eyebrow">{examples[exampleIndex].type}</span><strong>{examples[exampleIndex].heading}</strong><span className="preview-subline"/><span className="preview-subline short"/><span className="preview-action"/></div>
            <div className="preview-colors">{examples[exampleIndex].colors.map(color=><span key={color} style={{background:color}} title={color}/>)}</div>
            <div className="preview-orb"/>
          </div>
          <AnimatePresence mode="wait"><motion.div key={exampleIndex} className="preview-label" initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.25}}><span className="preview-label-dot"/><span>{examples[exampleIndex].label}</span><span className="preview-label-muted">DESIGN DNA PREVIEW</span><span className="preview-label-arrow"><ArrowUpRight size={12}/></span></motion.div></AnimatePresence>
        </div>
        <HeroUrlInput onAnalyze={analyze} loading={loading}/>
        {error&&<div className="global-error" role="alert"><span>!</span><p>{error}</p><label className="screenshot-fallback">Use screenshot instead<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void analyzeScreenshot(file);e.currentTarget.value='';}} disabled={loading}/></label><button onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>}
        <div className="workspace-bottom"><span><span className="tiny-lock"><ShieldCheck size={12}/></span> YOUR INPUT STAYS YOURS</span><span>POWERED BY PIXEL-LEVEL CURIOSITY <Sparkles size={12}/></span></div>
      </motion.div>
      <div className="hero-bottom-note"><span>DESIGN SYSTEMS, DECODED.</span><a href="#features">SCROLL TO EXPLORE <ArrowDownRight size={13}/></a></div>
      <div className="hero-index">DL<span>—</span>001</div>
    </section>

    <section className="signal-strip" aria-label="Capabilities"><div className="signal-strip-inner"><span className="signal-lead">MADE FOR PEOPLE WHO NOTICE THE DETAILS</span><span><ScanSearch size={15}/> DOM + CSS INSPECTION</span><span><Palette size={15}/> COLOR INTELLIGENCE</span><span><FileCode2 size={15}/> TOKEN EXPORT</span><span><Fingerprint size={15}/> EVIDENCE FIRST</span></div></section>

    <section className="features-section section-wrap" id="features">
      <div className="section-intro"><div><div className="eyebrow"><span>01</span> THE TOOLKIT</div><h2>A site is never just<br/><em>a pretty face.</em></h2></div><p>Every interface is a system of repeatable decisions. DesignLens makes those decisions visible — and gives you the parts to reuse.</p></div>
      <div className="feature-bento">
        <motion.article className="feature-card feature-large" whileHover={{y:-5}} transition={{type:'spring',stiffness:280,damping:22}}><div className="feature-card-top"><span className="feature-number">{featureItems[0].number} / SIGNAL</span><span className="feature-tag">{featureItems[0].tag}</span></div><div className="feature-visual palette-visual"><div className="palette-orbit orbit-1"/><div className="palette-orbit orbit-2"/><div className="palette-stack">{['#8F7BFF','#46D8E5','#F3B765','#EDECF5','#171722'].map(c=><span key={c} style={{background:c}}/>)}</div><div className="palette-callout callout-top"><i/> --color-accent <b>#46D8E5</b></div><div className="palette-callout callout-bottom"><i/> --surface-elevated <b>#171722</b></div></div><div className="feature-card-copy"><FeatureItems0Icon/><div><h3>{featureItems[0].title}</h3><p>{featureItems[0].description}</p></div></div></motion.article>
        <motion.article className="feature-card feature-map" whileHover={{y:-5}} transition={{type:'spring',stiffness:280,damping:22}}><div className="feature-card-top"><span className="feature-number">{featureItems[1].number} / STRUCTURE</span><span className="feature-tag">{featureItems[1].tag}</span></div><div className="layout-wireframe"><div className="wireframe-header"><i/><i/><i/><b/></div><div className="wireframe-hero"><span/><strong/><i/><i/><b/></div><div className="wireframe-cards"><span/><span/><span/></div><div className="wireframe-footer"><i/><i/></div><div className="wireframe-measure measure-a">12 COL GRID</div><div className="wireframe-measure measure-b">24 PX GUTTER</div></div><div className="feature-card-copy"><FeatureItems1Icon/><div><h3>{featureItems[1].title}</h3><p>{featureItems[1].description}</p></div></div></motion.article>
        <motion.article className="feature-card feature-code" whileHover={{y:-5}} transition={{type:'spring',stiffness:280,damping:22}}><div className="feature-card-top"><span className="feature-number">{featureItems[2].number} / OUTPUT</span><span className="feature-tag">{featureItems[2].tag}</span></div><div className="code-visual"><div className="code-window-head"><div><i/><i/><i/></div><span>design.md</span><span className="code-window-badge">MARKDOWN</span></div><div className="code-lines"><span><b>#</b> Brand identity</span><span className="indent"><i/> inferred tone <b>— premium</b></span><span><b>##</b> Color system</span><span className="indent code-swatches"><i style={{background:'#8978FF'}}/><i style={{background:'#39CBDD'}}/><i style={{background:'#1B1B27'}}/><i style={{background:'#F4F3F8'}}/></span><span><b>##</b> Typography scale</span><span className="indent"><i/> font-family: <b>Geist</b></span><span><b>##</b> Design tokens</span><span className="code-cursor">▍</span></div></div><div className="feature-card-copy"><FeatureItems2Icon/><div><h3>{featureItems[2].title}</h3><p>{featureItems[2].description}</p></div></div></motion.article>
      </div>
    </section>

    <section className="how-section" id="how-it-works"><div className="how-inner section-wrap"><div className="eyebrow"><span>02</span> FROM URL TO UNDERSTANDING</div><div className="how-heading-row"><h2>Three steps.<br/><em>Zero guesswork.</em></h2><p>A fast, transparent pipeline that distinguishes what the browser measured from what the report inferred.</p></div><div className="steps-grid"><div className="step-card"><span className="step-index">01</span><div className="step-icon"><GlobeIcon/></div><h3>Point to a page</h3><p>Paste a public URL. DesignLens checks the destination, reads robots.txt, then opens a sandboxed browser.</p><span className="step-foot">INPUT <ArrowRight size={13}/></span></div><div className="step-card"><span className="step-index">02</span><div className="step-icon"><ScanSearch size={20}/></div><h3>Read the evidence</h3><p>Computed styles, readable CSS variables, visible component patterns, fonts, spacing, and motion signals are sampled.</p><span className="step-foot">INSPECT <ArrowRight size={13}/></span></div><div className="step-card"><span className="step-index">03</span><div className="step-icon"><FileCode2 size={20}/></div><h3>Take the system</h3><p>Download a designed-for-humans Markdown spec, plus JSON tokens and a page snapshot in one ZIP.</p><span className="step-foot">EXPORT <Check size={13}/></span></div></div></div></section>

    <section className="manifesto-section section-wrap" id="manifesto"><div className="manifesto-grid"><div className="manifesto-left"><div className="eyebrow"><span>03</span> THE DESIGNLENS PROMISE</div><h2>Show your work.<br/><em>Not just your taste.</em></h2><p>Design is full of invisible systems. We believe the best way to learn them is to observe carefully, label uncertainty, and make the output useful beyond a screenshot.</p><a href="#url-input-wrap" className="manifesto-cta">Reverse-engineer something <ArrowUpRight size={15}/></a></div><div className="manifesto-right"><div className="principle-card"><div className="principle-icon"><ShieldCheck size={17}/></div><div><h3>Evidence before assumptions.</h3><p>Values from computed styles and readable CSS are distinguished from inferred semantic tokens and fallbacks.</p></div><span className="principle-num">01</span></div><div className="principle-card"><div className="principle-icon"><LockKeyhole size={17}/></div><div><h3>Respect the boundary.</h3><p>Private IPs are blocked, robots.txt is checked, and access barriers are not bypassed. No database stores reports.</p></div><span className="principle-num">02</span></div><div className="principle-card"><div className="principle-icon"><Zap size={17}/></div><div><h3>Useful from the first export.</h3><p>Human-readable guidance meets machine-readable tokens, without needing an account or a proprietary viewer.</p></div><span className="principle-num">03</span></div></div></div></section>

    <section className="closing-section section-wrap"><div className="closing-frame"><div className="closing-stars" aria-hidden="true">✳ &nbsp; · &nbsp; ✧ &nbsp; · &nbsp; ✳</div><span className="eyebrow"><span>READY WHEN YOU ARE</span></span><h2>Good design leaves<br/>a <em>trail of clues.</em></h2><p>Choose a website. We’ll find the system hiding in plain sight.</p><a className="closing-cta" href="#url-input-wrap">Analyze your first URL <ArrowUpRight size={16}/></a><span className="closing-coordinate">10.0000° / 10.0000°</span></div></section>

    <footer className="site-footer"><a href="#top" className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span/><span/><span/><span/></span><span className="brand-word">design<span>lens</span></span></a><span className="footer-center">BUILT FOR THE CURIOUS. DOCUMENTED FOR THE NEXT BUILDER.</span><div className="footer-right"><span>© 2026 DESIGNLENS</span><a href="#how-it-works">METHOD</a><a href="#manifesto">PRINCIPLES</a><a href="/privacy">PRIVACY</a><a href="/terms">TERMS</a><button type="button" className="footer-cookie-settings" onClick={() => window.dispatchEvent(new Event("designlens:cookie-settings"))}>COOKIE SETTINGS</button></div></footer>
    {loading&&<AnalysisLoader progress={loader.progress} stage={loader.stage} label={loader.label} detail={loader.detail} preview={partialOutput}/>}
  </main>;
}
function FeatureItems0Icon(){return <div className="feature-icon"><Palette size={17}/></div>}
function FeatureItems1Icon(){return <div className="feature-icon"><Layers3 size={17}/></div>}
function FeatureItems2Icon(){return <div className="feature-icon"><Braces size={17}/></div>}
function GlobeIcon(){return <span className="globe-icon"><span/><span/><span/></span>}
