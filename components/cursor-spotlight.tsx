'use client';

import { useEffect } from 'react';

export default function CursorSpotlight() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--pointer-x', `${event.clientX}px`);
        root.style.setProperty('--pointer-y', `${event.clientY}px`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive:true });
    return () => { window.removeEventListener('pointermove', onMove); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return <div className="cursor-spotlight" aria-hidden="true"/>;
}
