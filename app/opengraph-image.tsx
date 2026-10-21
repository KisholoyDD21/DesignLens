import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DesignLens — turn any website into a design system';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
const siteHost = (process.env.SITE_URL || 'https://designlens.app').replace(/^https?:\/\//, '').split('/')[0].toUpperCase();

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', overflow: 'hidden', background: '#0A0A0F', color: '#F4F2FA', padding: '68px', fontFamily: 'Arial, sans-serif' }}>
    <div style={{ position: 'absolute', left: '510px', top: '-280px', width: '700px', height: '700px', borderRadius: '50%', background: 'linear-gradient(145deg, rgba(120,90,245,.52), rgba(20,20,30,0) 78%)' }} />
    <div style={{ position: 'absolute', right: '-210px', bottom: '-440px', width: '820px', height: '820px', borderRadius: '50%', background: 'linear-gradient(145deg, rgba(40,205,219,.28), rgba(10,10,15,0) 78%)' }} />
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '26px', letterSpacing: '-1px' }}><div style={{ width: '35px', height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9px', background: 'linear-gradient(135deg,#9B8CFF,#4DDCE4)', color: '#0A0A0F', fontSize: '25px', fontWeight: 900 }}>◈</div><span>design<span style={{ color: '#AAA1FF' }}>lens</span></span><span style={{ marginLeft: '12px', fontSize: '13px', color: '#9997AA', letterSpacing: '2px' }}>WEBSITE → DESIGN SYSTEM</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}><div style={{ fontSize: '67px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-4px' }}>Turn any website</div><div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}><div style={{ fontSize: '67px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-4px' }}>into a</div><div style={{ fontSize: '70px', fontStyle: 'italic', color: '#A99BFF', fontFamily: 'Georgia, serif' }}>design.md.</div></div><div style={{ marginTop: '24px', color: '#B6B4C5', fontSize: '21px' }}>Colors, typography, spacing, components, motion, and tokens — documented.</div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', color: '#AFAEC0', letterSpacing: '2px' }}><span style={{ color: '#5FE0E7' }}>●</span> EVIDENCE-FIRST ANALYSIS <span style={{ marginLeft: 'auto', color: '#F4B86B' }}>{siteHost} ↗</span></div>
    </div>
  </div>, { ...size });
}
