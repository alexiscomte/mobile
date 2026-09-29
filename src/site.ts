// Accès au site affectionplus.com depuis l'application : catalogue des pages, adresses en « mode application »
// (page sans en-tête ni pied : classe html.app, voir outils/gen/app_mode.py), scripts injectés dans la vue web.
import catalogue from './catalogue.json';
import type { Langue } from './i18n';
import type { Profil } from './profil';

export const SITE = 'https://affectionplus.com/';

export type Page = { u: string; t: string; d: string };
type Catalogue = { langues: string[]; site: string; pages: Record<string, Partial<Record<Langue, Page>>> };
const CAT = catalogue as unknown as Catalogue;

export type Cle = keyof typeof catalogue.pages;
export const CLES = Object.keys(CAT.pages) as Cle[];

/** La page du catalogue dans la langue voulue (sinon en anglais, sinon en français). */
export function page(cle: Cle, lg: Langue): Page {
  const p = CAT.pages[cle];
  return (p[lg] || p.en || p.fr) as Page;
}

/** Adresse complète d'une page du site en mode application (?app=1 avant l'ancre). */
export function url(rel: string): string {
  const [chemin, ancre] = rel.split('#');
  const sep = chemin.includes('?') ? '&' : '?';
  return SITE + chemin + sep + 'app=1' + (ancre ? '#' + ancre : '');
}

export function urlPage(cle: Cle, lg: Langue, ancre?: string): string {
  return url(page(cle, lg).u + (ancre ? '#' + ancre : ''));
}

/** Adresse hors du site (à ouvrir dans le navigateur du téléphone). */
export function estExterne(u: string): boolean {
  return !u.startsWith(SITE) && !u.startsWith('about:');
}

/** Retire ?app=1 pour partager une adresse propre. */
export function urlPropre(u: string): string {
  return u.replace(/([?&])app=1(&|$)/, (m, a, b) => (b === '&' ? a : '')).replace(/\?$/, '');
}

/** Script injecté AVANT le chargement : mode application + profil de l'appareil vers le stockage du site (fusion). */
export function injectionAvant(profil: Profil | null): string {
  const p = JSON.stringify(profil || {});
  return `(function(){try{document.documentElement.classList.add('app');sessionStorage.setItem('ap.app','1');
var n=${p};var a={};try{a=JSON.parse(localStorage.getItem('ap.profil')||'{}')||{};}catch(e){}
var ch=false;for(var k in n){if(n[k]!==null&&n[k]!==undefined&&n[k]!==''&&JSON.stringify(a[k])!==JSON.stringify(n[k])){a[k]=n[k];ch=true;}}
if(ch){localStorage.setItem('ap.profil',JSON.stringify(a));}}catch(e){}})();true;`;
}

/** Script injecté APRÈS le chargement : renvoie à l'application le profil et les favoris tenus par le site (postMessage). */
export const INJECTION_APRES = `(function(){function envoyer(){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'etat',profil:localStorage.getItem('ap.profil'),favoris:localStorage.getItem('ap.favoris'),titre:document.title,url:location.href}));}catch(e){}}
envoyer();var set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){set.apply(this,arguments);if(k==='ap.profil'||k==='ap.favoris'){envoyer();}};
document.addEventListener('visibilitychange',function(){if(document.hidden){envoyer();}});})();true;`;

export type MessageSite = { type: 'etat'; profil: string | null; favoris: string | null; titre: string; url: string };

export function lireMessage(brut: string): MessageSite | null {
  try {
    const m = JSON.parse(brut);
    return m && m.type === 'etat' ? (m as MessageSite) : null;
  } catch {
    return null;
  }
}
