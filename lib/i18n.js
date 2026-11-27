import ar from '../content/i18n/ar.json';
import es from '../content/i18n/es.json';
import fr from '../content/i18n/fr.json';
import pt from '../content/i18n/pt.json';
import { siteConfig } from './config';

export const LANGS = ['ar', 'es', 'fr', 'pt'];
const DICTS = { ar, es, fr, pt };

export function getDict(lang) {
  return DICTS[lang] || null;
}

// English pages that have translations, mapped to their path inside /<lang>.
export const TRANSLATED_PATHS = { '/': '', '/best': '/best' };

export function hreflangAlternates(enPath) {
  const sub = TRANSLATED_PATHS[enPath];
  const languages = { en: siteConfig.url + (enPath === '/' ? '' : enPath), 'x-default': siteConfig.url + (enPath === '/' ? '' : enPath) };
  LANGS.forEach((l) => { languages[l] = `${siteConfig.url}/${l}${sub}`; });
  return languages;
}
