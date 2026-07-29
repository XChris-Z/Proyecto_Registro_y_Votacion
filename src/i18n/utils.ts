import { ui, defaultLang } from './ui';

export function getLangFromCookie(cookieValue?: string): keyof typeof ui {
  if (cookieValue && cookieValue in ui) {
    return cookieValue as keyof typeof ui;
  }
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}
