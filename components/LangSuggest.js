'use client';
import { useEffect, useState } from 'react';

const LANGS = {
  ar: { prompt: 'هل تريد قراءة هذه الصفحة بالعربية؟', yes: 'اعرض بالعربية', no: 'لا، شكرًا', dir: 'rtl' },
  es: { prompt: '¿Quieres leer esta página en español?', yes: 'Ver en español', no: 'No, gracias', dir: 'ltr' },
  fr: { prompt: 'Voulez-vous lire cette page en français ?', yes: 'Voir en français', no: 'Non merci', dir: 'ltr' },
  pt: { prompt: 'Quer ler esta página em português?', yes: 'Ver em português', no: 'Não, obrigado', dir: 'ltr' },
};
const PATHS = { '/': '', '/best': '/best' };

// Suggests (never forces) the visitor's language on English pages that have a translation.
export default function LangSuggest() {
  const [s, setS] = useState(null);
  useEffect(() => {
    try {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      if (!(path in PATHS)) return;
      if (localStorage.getItem('lang-suggest-dismissed')) return;
      const pref = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']).map((l) => l.slice(0, 2).toLowerCase());
      const first = pref.find((l) => l === 'en' || LANGS[l]);
      if (!first || first === 'en') return;
      setS({ lang: first, href: `/${first}${PATHS[path]}` });
    } catch (e) { /* ignore */ }
  }, []);
  if (!s) return null;
  const t = LANGS[s.lang];
  return (
    <div role="region" aria-label="Language" dir={t.dir} lang={s.lang} className="bg-slate-900 text-white text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-3">
      <span>{t.prompt}</span>
      <a href={s.href} className="underline font-semibold" hrefLang={s.lang}>{t.yes}</a>
      <button type="button" onClick={() => { try { localStorage.setItem('lang-suggest-dismissed', '1'); } catch (e) {} setS(null); }} className="opacity-80 hover:opacity-100">{t.no}</button>
    </div>
  );
}
