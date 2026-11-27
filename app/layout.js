import './globals.css';
import './fonts.css';
import { siteConfig } from '../lib/config';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NewsletterCTA from '../components/NewsletterCTA';
import NewsletterPopover from '../components/NewsletterPopover';
import ReadingProgress from '../components/ReadingProgress';
import SkipLink from '../components/SkipLink';
import CookieBanner from '../components/CookieBanner';
import BackToTop from '../components/BackToTop';
import TrackVisit from '../components/TrackVisit';

import Script from 'next/script';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";


export const metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.tagline,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.author }],
  creator: siteConfig.author,
  publisher: siteConfig.name,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.tagline,
    siteName: siteConfig.name,
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.tagline,
    creator: '@aipulsedaily',
    images: ['/og-default.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  alternates: {
    canonical: siteConfig.url,
    types: {
      'application/rss+xml': [
        { url: '/rss.xml', title: 'All Posts' },
        { url: '/news/feed.xml', title: 'AI News Feed' },
      ],
    },
  },
  icons: { icon: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  verification: { google: 'y7AXfkgsUGiewK9dcouEB5kyOFYhOxIIxm8j_qEkUCE', bing: '' },
};

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google AdSense account declaration (verification + auto ads) */}
        <meta name="google-adsense-account" content={siteConfig.adsenseClient} />
        {/* Monetag site ownership verification (aiblogger.us.ci, site id 3596145) */}
        <meta name="monetag" content="e4f329f07a687ea3b9345a356856e2d3" />
        {/* Preconnect & DNS-prefetch for third-party origins */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        {/* Dark mode init — runs before paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try { if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); } catch(e) {}
        `}} />
        {/* AI Search Engine crawler permissions — CRITICAL for GEO */}
        {/* JSON-LD inline (not next/script) so it's in the initial SSR HTML — crawlers and AI engines read the raw HTML */}
        <script
          id="ld-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-dark-text antialiased font-body">
        <ReadingProgress />
        <SkipLink />
        <Header />
        {/* No animate-fade-in on <main>: it ran on every route change
            (client navigation re-mounts children inside <main>) and was
            the #1 cause of "the site feels slow" on every internal link. */}
        <main id="main-content" className="min-h-screen">{children}</main>
        <NewsletterCTA />
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
        <BackToTop />
        <NewsletterPopover />
        <TrackVisit />
        <Footer />

        {/* Google AdSense */}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${siteConfig.adsenseClient}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />

        {/* Cloudflare Web Analytics (cookieless) */}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "cb93f64eab5142f182b903c5e83df5ff"}'
          strategy="afterInteractive"
        />

        {/* Monetag — In-Page Push (aiblogger.us.ci zone 12362073). PAUSED 2026-11-27 (owner OK) until the GSC Harmful downloads review clears; enable by setting NEXT_PUBLIC_MONETAG_ENABLED=1 in the build environment. Known risk: zone has served deceptive "Download is ready" creatives that triggered the GSC "Harmful downloads" flag; Monetag offers no publisher-side creative blocklist. */}
        {process.env.NEXT_PUBLIC_MONETAG_ENABLED === '1' && (
        <Script
          id="monetag-ipp"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `
            (function(){
              var done=false;
              function load(){
                if(done) return; done=true;
                var s=document.createElement('script');
                s.src='https://nap5k.com/tag.min.js';
                s.setAttribute('data-zone','12362073');
                s.async=true;
                document.head.appendChild(s);
              }
              var t=setTimeout(load,3000);
              ['scroll','pointerdown','touchstart'].forEach(function(ev){
                window.addEventListener(ev,function(){clearTimeout(t);load();},{once:true,passive:true});
              });
            })();
          `}}
        />
        )}

        {/* Ezoic — higher RPM than AdSense (enable: set NEXT_PUBLIC_EZOIC_ID) */}
        {process.env.NEXT_PUBLIC_EZOIC_ID && (
          <Script
            id="ezoic"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{ __html: `
              var ezoicId = '${process.env.NEXT_PUBLIC_EZOIC_ID}';
              var script = document.createElement('script');
              script.src = 'https://go.ezoic.net/detroitchicago/' + ezoicId + '/script.js';
              script.async = true;
              document.head.appendChild(script);
            `}}
          />
        )}

        {/* Plausible Analytics — privacy-first, no cookie banner */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script defer data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
        )}

        {/* GA4 */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}} />
          </>
        )}

        {/* Microsoft Clarity — free heatmaps */}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="clarity" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
          `}} />
        )}
      </body>
    </html>
  );
}

function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.tagline,
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteConfig.url}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: { '@type': 'ImageObject', url: `${siteConfig.url}/logo.svg` },
    },
  };
}
