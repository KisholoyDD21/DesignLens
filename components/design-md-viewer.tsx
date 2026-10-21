'use client';

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronDown, ListTree } from 'lucide-react';
import { slugify } from '@/lib/utils';

type Props = { markdown:string };
function CustomHeading({level,children}:{level:1|2|3|4|5|6;children?:ReactNode}) {
  const raw=Array.isArray(children)?children.map(c=>typeof c==='string'?c:'').join(''):typeof children==='string'?children:'';
  const Tag=`h${level}` as ElementType;
  return <Tag id={slugify(raw)}>{children}</Tag>;
}
export default function DesignMdViewer({markdown}:Props) {
  const toc=useMemo(()=>markdown.split('\n').filter(line=>/^## \d+\./.test(line)).map(line=>{const title=line.replace(/^##\s*/,'').trim();return{title,id:slugify(title)}}),[markdown]);
  const [active,setActive]=useState(toc[0]?.id||'');
  const [tocOpen,setTocOpen]=useState(true);
  useEffect(()=>{
    const nodes=toc.map(item=>document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
    if(!nodes.length)return;
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(visible)setActive(visible.target.id);
    },{rootMargin:'-15% 0px -70% 0px',threshold:[0,.1,.35,.65]});
    nodes.forEach(node=>observer.observe(node));return()=>observer.disconnect();
  },[toc,markdown]);
  const markdownComponents: Components = {
    h1:({children})=><CustomHeading level={1}>{children}</CustomHeading>,
    h2:({children})=><CustomHeading level={2}>{children}</CustomHeading>,
    h3:({children})=><CustomHeading level={3}>{children}</CustomHeading>,
    h4:({children})=><CustomHeading level={4}>{children}</CustomHeading>,
    h5:({children})=><CustomHeading level={5}>{children}</CustomHeading>,
    h6:({children})=><CustomHeading level={6}>{children}</CustomHeading>,
    table:({children})=><div className="table-scroll"><table>{children}</table></div>,
    blockquote:({children})=><blockquote className="md-quote">{children}</blockquote>,
    code:({className,children})=><code className={className||''}>{children}</code>,
  };
  return <div className="markdown-layout">
    <aside className={`markdown-toc ${tocOpen?'':'toc-collapsed'}`}>
      <button className="toc-title" onClick={()=>setTocOpen(v=>!v)}><span><ListTree size={14}/> DOCUMENT MAP</span><ChevronDown size={14} className={tocOpen?'':'rotate-180'}/></button>
      {tocOpen&&<nav aria-label="Design document sections">{toc.map((item,index)=><a href={`#${item.id}`} key={item.id} className={active===item.id?'active':''} onClick={()=>setActive(item.id)}><span className="toc-index">{String(index+1).padStart(2,'0')}</span><span>{item.title.replace(/^\d+\.\s*/,'')}</span></a>)}</nav>}
      <div className="toc-meta"><span className="tiny-live-dot"/> 12 REPORT SECTIONS</div>
    </aside>
    <article className="markdown-document">
      <div className="document-intro"><span className="document-kicker"><span className="tiny-live-dot"/> DESIGN DOCUMENT <span>·</span> MARKDOWN</span><h1>Design <em>specification.</em></h1><p>Measured signals, clearly marked inferences, and the tokens that tie it all together.</p></div>
      <div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{markdown}</ReactMarkdown></div>
      <div className="document-end"><span className="end-line"/><span>END OF DESIGN DOCUMENT</span><span className="end-line"/></div>
    </article>
  </div>;
}
