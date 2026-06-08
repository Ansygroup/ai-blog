'use client';
import { useEffect } from 'react';
import { siteConfig } from '../lib/config';

export default function AdSlot({ slot, format = 'auto', style = {}, className = '' }) {
  const client = siteConfig.adsenseClient;
  useEffect(() => {
    if (!client || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) { /* noop */ }
  }, [client, slot]);

  if (!client || !slot) return null;
  return (
    <div className={`my-6 text-center ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', ...style }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
