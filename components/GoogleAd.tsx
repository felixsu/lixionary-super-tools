'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

interface AdSenseWindow {
  adsbygoogle?: Array<Record<string, unknown>>;
}

interface GoogleAdProps {
  type: 'sidebar' | 'bottom';
}

export default function GoogleAd({ type }: GoogleAdProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    try {
      const adsWindow = window as unknown as AdSenseWindow;
      adsWindow.adsbygoogle = adsWindow.adsbygoogle || [];
      adsWindow.adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense initialization error:', e);
    }
  }, []);

  if (type === 'sidebar') {
    return (
      <div className="sidebar-ad-left">
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2894895139200300"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
        <ins
          className="adsbygoogle"
          style={{ display: 'inline-block', width: '120px', height: '640px' }}
          data-ad-client="ca-pub-2894895139200300"
          data-ad-slot="5969605994"
        />
      </div>
    );
  }

  return (
    <div className="bottom-ad-container">
      <Script
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2894895139200300"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-2894895139200300"
        data-ad-slot="2087723810"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
