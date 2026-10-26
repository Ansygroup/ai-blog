'use client';
import { useEffect } from 'react';
import { siteConfig } from '../lib/config';

export default function AdSlot({ slot, format = 'auto', style = {}, className = '', network = 'auto' }) {
  const adsenseClient = siteConfig.adsenseClient;
  const ezoicId = process.env.NEXT_PUBLIC_EZOIC_ID;
  const propellerKey = process.env.NEXT_PUBLIC_PROPELLER_KEY;

  const useEzoic = network === 'ezoic' || (network === 'auto' && ezoicId && !adsenseClient);
  const usePropeller = network === 'propeller' || (network === 'auto' && propellerKey && !adsenseClient && !ezoicId);
  const useAdsense = network === 'adsense' || (network === 'auto' && adsenseClient);

  useEffect(() => {
    if (useAdsense && adsenseClient && slot) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* noop */ }
    }
  }, [useAdsense, adsenseClient, slot]);

  if (useEzoic && ezoicId) {
    return (
      <div className={`my-6 text-center ${className}`} style={style}>
        <div id={`ezoic-pub-ad-placeholder-${slot || '101'}`} />
      </div>
    );
  }

  if (usePropeller && propellerKey) {
    return (
      <div className={`my-6 text-center ${className}`} style={style}>
        <ins className="propeller-ads" data-propeller-key={propellerKey} />
      </div>
    );
  }

  const isPlaceholder = !slot || /^1{2,}|123456789/.test(String(slot));
  if (!adsenseClient || !slot || isPlaceholder) return null;
  return (
    <div className={`my-6 text-center ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center', ...style }}
        data-ad-client={adsenseClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
