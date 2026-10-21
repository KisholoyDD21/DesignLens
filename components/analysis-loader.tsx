'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Circle, Code2, Eye, FileText, LoaderCircle, Palette, ScanSearch, Sparkles } from 'lucide-react';

const steps = [
  {id:'robots',label:'Checking access policy',icon:ShieldIcon,description:'URL safety and robots.txt'},
  {id:'fetch',label:'Rendering the website',icon:Eye,description:'DOM, layout and visible elements'},
  {id:'parse',label:'Parsing visual styles',icon:Code2,description:'Typography, spacing, components'},
  {id:'palette',label:'Extracting the palette',icon:Palette,description:'Color roles and contrast checks'},
  {id:'synthesis',label:'Writing design.md',icon:FileText,description:'Twelve sections, token exports'},
];
function ShieldIcon({size=17}:{size?:number}) { return <ScanSearch size={size}/>; }
type Props = { progress:number; stage:string; label:string; detail?:string; error?:string; preview?:string; };
export default function AnalysisLoader({progress,stage,label,detail,error,preview}:Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const screenshotMode = stage==='screenshot' || stage==='tokens';
  const current = stage==='complete'?steps.length-1:stage==='cache'?steps.length-1:stage==='screenshot'?1:stage==='tokens'?3:Math.max(0,steps.findIndex(s=>s.id===stage));
  
  const content = (
    <AnimatePresence>
      <motion.div className="analysis-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} role="dialog" aria-modal="true" aria-labelledby="loader-heading">
        <motion.div className="analysis-modal" initial={{opacity:0,y:22,scale:.97}} animate={{opacity:1,y:0,scale:1}} transition={{type:'spring',damping:24,stiffness:220}}>
          <div className="loader-topline"><div className="loader-brand"><span className="brand-mark small"><span/><span/><span/><span/></span>DESIGNLENS</div><span className="live-indicator"><i/>{error?'ATTENTION':'LIVE ANALYSIS'}</span></div>
          <div className="loader-aurora"><div className="loader-orb orb-a"/><div className="loader-orb orb-b"/><div className="loader-orb orb-c"/><div className="loader-core"><div className="loader-core-rings"/><Sparkles size={25}/></div></div>
          <p className="eyebrow">THE SITE IS IN THE STUDIO</p><h2 id="loader-heading">Reading between<br/>the <em>pixels.</em></h2>
          <p className="loader-current">{error?'Analysis paused':label||'Preparing the browser session'}<span className="loader-cursor">▍</span></p>
          {detail&&<p className="loader-detail">{detail}</p>}
          <div className="loader-progress-track"><motion.div className="loader-progress-fill" animate={{width:`${Math.max(2,progress)}%`}} transition={{duration:.42,ease:'easeOut'}}/><span>{Math.round(progress)}%</span></div>
          <div className="loader-steps">{steps.map((step,index)=>{const Icon=step.icon;const done=index<current||(stage==='complete')||(stage==='cache');const active=index===current&&stage!=='complete';return <div className={`loader-step ${done?'done':''} ${active?'active':''}`} key={step.id}><span className="loader-step-icon">{done?<Check size={14}/>:active?<LoaderCircle size={14} className="spin"/>:<Icon size={14}/>}</span><span className="loader-step-copy"><strong>{step.label}</strong><small>{step.description}</small></span>{active&&<span className="step-active-dot"/>}</div>})}</div>
          <div className="loader-note"><Circle size={10} fill="currentColor"/> {screenshotMode?'Screenshot-only mode: no website request is made.':'Only publicly accessible pages are inspected; no CAPTCHA or login bypass is attempted.'}</div>
          {preview&&<div className="loader-stream-preview"><div><span className="tiny-live-dot"/> LIVE DESIGN.MD PREVIEW</div><pre>{preview.slice(-1600)}</pre></div>}
          {error&&<p className="loader-error" role="alert">{error}</p>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
