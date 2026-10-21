'use client';

import { useState } from 'react';
import { ArrowUpRight, Check, ClipboardPaste, Globe2, LoaderCircle, ShieldCheck, WandSparkles } from 'lucide-react';

type Props = { onAnalyze:(url:string)=>void; loading:boolean; initialValue?:string; compact?:boolean; };
function normalizeUrl(raw:string) {
  const value=raw.trim(); if(!value) return '';
  const withProtocol=/^https?:\/\//i.test(value)?value:`https://${value}`;
  try { const url=new URL(withProtocol); if(!['https:','http:'].includes(url.protocol)||!url.hostname.includes('.')) return ''; return url.toString(); } catch { return ''; }
}
export default function HeroUrlInput({onAnalyze,loading,initialValue='',compact=false}:Props) {
  const [value,setValue]=useState(initialValue);
  const [error,setError]=useState('');
  const [pasted,setPasted]=useState(false);
  const submit=()=>{ const url=normalizeUrl(value); if(!url){setError('Enter a complete public website URL, such as linear.app.');return;} setError('');onAnalyze(url); };
  return <div className={`url-composer ${compact?'url-composer-compact':''}`} id="url-input-wrap">
    <label className="url-label" htmlFor="website-url"><span className="url-label-pip"/> WEBSITE URL <span className="url-label-note">NO LOGIN REQUIRED</span></label>
    <div className={`url-input-shell ${error?'has-error':''} ${loading?'is-loading':''}`}>
      <span className="url-globe"><Globe2 size={20}/></span>
      <input id="website-url" value={value} onChange={e=>{setValue(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter')submit()}} onPaste={()=>{setPasted(true);window.setTimeout(()=>setPasted(false),1400)}} placeholder="https://your-favorite-website.com" type="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby={error?'url-error':'url-help'} disabled={loading}/>
      {pasted?<span className="paste-status"><Check size={14}/> Pasted</span>:<button className="paste-button" onClick={async()=>{try{const text=await navigator.clipboard.readText();if(text){setValue(text.trim());setError('');setPasted(true);window.setTimeout(()=>setPasted(false),1400)}}catch{setError('Clipboard permission is unavailable. Paste directly into the field.')}}} aria-label="Paste a URL"><ClipboardPaste size={16}/><span>Paste</span></button>}
      <button className="analyze-button" onClick={submit} disabled={loading} aria-label="Analyze website">{loading?<LoaderCircle size={17} className="spin"/>:<WandSparkles size={17}/>}<span>{loading?'Analyzing':'Analyze'}</span><ArrowUpRight size={16}/></button>
    </div>
    {error&&<p className="url-error" id="url-error" role="alert">{error}</p>}
    <div className="url-input-foot" id="url-help"><span><ShieldCheck size={13}/> Public pages only · We don’t store your browsing history</span><span className="url-foot-right">~ 30–60 sec <span className="foot-dot">·</span> Markdown + tokens</span></div>
  </div>;
}
