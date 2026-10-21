'use client';

import { useState } from 'react';
import { Check, Copy, Layers3, Palette, Ruler, Type } from 'lucide-react';
import type { WebsiteSnapshot } from '@/lib/types';

type Props = { snapshot:WebsiteSnapshot; onCopy:(value:string)=>void; };
export default function TokenVisualizer({snapshot,onCopy}:Props) {
  const [copied,setCopied]=useState('');
  const copy=(value:string,key:string)=>{onCopy(value);setCopied(key);window.setTimeout(()=>setCopied(''),1300)};
  return <div className="token-panel" id="token-visualizer">
    <div className="token-panel-head"><div><span className="tiny-live-dot"/> LIVE TOKEN MAP</div><span className="token-sample-count">{snapshot.colors.length} COLORS</span></div>
    <section className="token-section color-token-section"><div className="token-section-title"><span className="token-section-icon"><Palette size={14}/></span><strong>Color palette</strong><span className="token-count">{snapshot.colors.length} tokens</span></div>
      <div className="color-grid">{snapshot.colors.slice(0,16).map((color,index)=><button key={`${color.hex}-${index}`} className="color-swatch" onClick={()=>copy(color.hex,color.hex)} title={`Copy ${color.hex}`} aria-label={`Copy ${color.name}, ${color.hex}`}><span className="swatch-paint" style={{backgroundColor:color.hex}}><span className="swatch-copy">{copied===color.hex?<Check size={13}/>:<Copy size={12}/>}</span></span><span className="swatch-meta"><strong>{color.name}</strong><code>{color.hex}</code></span></button>)}</div>
      <div className="palette-note"><span className="palette-note-dot"/> Click a swatch to copy its HEX value</div>
    </section>
    <section className="token-section"><div className="token-section-title"><span className="token-section-icon"><Type size={14}/></span><strong>Type specimens</strong><span className="token-count">{snapshot.fonts.length} families</span></div>
      <div className="font-specimens">{snapshot.fonts.slice(0,3).map((font,index)=><div className="font-specimen" key={font.family}><div className="font-specimen-head"><span>{index===0?'01 / PRIMARY':'0'+(index+1)+' / SUPPORT'}</span><button onClick={()=>copy(font.family,`font-${font.family}`)} title="Copy font family">{copied===`font-${font.family}`?<Check size={12}/>:<Copy size={12}/>}</button></div><div className="font-specimen-glyph" style={{fontFamily:font.family}}>{index===0?'Ag':'Aa'}<span>09</span></div><p>{font.family.split(',')[0].replace(/['"]/g,'')}</p><small>{font.weights.join(' / ')||'weight not detected'} <i>·</i> {font.exampleSize}</small></div>)}</div>
    </section>
    <section className="token-section"><div className="token-section-title"><span className="token-section-icon"><Ruler size={14}/></span><strong>Spacing rhythm</strong><span className="token-count">{snapshot.spacing.length} samples</span></div>
      <div className="spacing-ruler">{snapshot.spacing.slice(0,10).map((space,index)=>{const px=parseFloat(space.value)||4;return <button className="spacing-item" key={space.value} onClick={()=>copy(space.value,`space-${space.value}`)} title={`Copy ${space.value}`}><span className="spacing-item-value">{space.value}</span><span className="spacing-bar-wrap"><span className="spacing-bar" style={{width:`${Math.max(5,Math.min(100,px/Math.max(1,...snapshot.spacing.slice(0,10).map(s=>parseFloat(s.value)||0))*100))}%`}}/></span><span className="spacing-item-index">S{index+1}</span></button>})}</div>
    </section>
    <section className="token-section"><div className="token-section-title"><span className="token-section-icon"><Layers3 size={14}/></span><strong>Component census</strong><span className="token-count">{snapshot.components.length} groups</span></div>
      <div className="component-census">{snapshot.components.slice(0,5).map((item,index)=><div className="census-row" key={item.type}><span className="census-index">0{index+1}</span><span className="census-name">{item.type}</span><span className="census-bar"><span style={{width:`${Math.max(7,Math.min(100,item.count/Math.max(1,...snapshot.components.map(c=>c.count))*100))}%`}}/></span><strong>{item.count}</strong></div>)}</div>
      <div className="component-previews"><button className="preview-btn primary">Primary action <span>↗</span></button><button className="preview-btn secondary">Secondary</button><span className="preview-badge"><span/> Live token</span></div>
    </section>
    <div className="token-panel-foot"><span><span className="tiny-live-dot"/> SOURCE-DRIVEN</span><span>Computed styles + inference</span></div>
  </div>;
}
