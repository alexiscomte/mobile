// Accès au site affectionplus.com depuis l'application : catalogue des pages, adresses en « mode application »
// (page sans en-tête ni pied : classe html.app, voir outils/gen/app_mode.py), scripts injectés dans la vue web.
import catalogue from './catalogue.json';
import type { Compte } from './compte';
import type { Langue } from './i18n';
import type { Favori, Profil } from './profil';

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

/** Script injecté AVANT le chargement : mode application + profil de l'appareil vers le stockage du site (fusion) ;
 *  favoris de l'appareil ajoutés à ceux de la page (union par url, comme compte.js), pour que la page ne renvoie pas une liste
 *  plus courte que celle du compte ; compte (06/10/2026) : la session de l'appli est posée dans « ap.compte » (page connectée
 *  elle aussi), ou retirée si l'appli n'a pas de compte. La page garde sa propre date de synchro (sync = null pour une session
 *  nouvelle pour elle). Depuis le 07/10/2026 nuit (« le local gagne », cahier specs/synchro-local-0710.md), compte.js ne tire plus
 *  rien hors connexion : à son premier chargement avec cette session, l'état de la vue web devient sa base, et elle n'envoie
 *  ensuite QUE ce qui y change (envoi partiel) ; ses scores apq:*, vides dans la vue web, ne remplacent donc jamais ceux du compte.
 *  Appareil partagé (08/10/2026) : proprio = propriétaire des données de l'appli (compte.ts proprioLocal, empreinte de l'adresse ; '' =
 *  invité jamais connecté). Si la vue web garde les données d'un autre propriétaire (« ap.compte.proprio » de compte.js), elles sont
 *  d'abord effacées (profil, favoris, scores, séries, parties, tests, votes, jeton de vote, marqueur, base, empreinte, ap.lettre,
 *  ap_naissance), puis le propriétaire de l'appli est posé : rien de l'ancien propriétaire ne revient dans l'appli ni ne part au compte. */
export function injectionAvant(profil: Profil | null, favoris?: Favori[] | null, compte?: Compte | null, proprio?: string): string {
  const p = JSON.stringify(profil || {});
  const f = JSON.stringify(favoris || []);
  const pr = JSON.stringify(proprio || '');
  // admin : comme ap.compte.admin du site (messages.js : pas de formulaire « Nous écrire » pour l'admin dès le premier affichage)
  const c = JSON.stringify(compte ? { courriel: compte.courriel, session: compte.session, sync: null, ...(compte.depuis ? { depuis: compte.depuis } : {}),
    ...(compte.admin ? { admin: true } : {}) } : null);
  return `(function(){try{document.documentElement.classList.add('app');sessionStorage.setItem('ap.app','1');
var P=${pr};var wp='';try{wp=(JSON.parse(localStorage.getItem('ap.compte.proprio')||'null')||{}).id||'';}catch(e){}
if(P!==wp){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf('apq:')===0||k.indexOf('ap.sondage:')===0)){ks.push(k);}}
ks.concat(['ap.profil','ap.favoris','ap.qdj','ap.jeu2','ap.compat','ap.sondage.jeton','ap.compte.sale','ap.compte.essai','ap.compte.base','ap.compte.empreinte','ap.lettre','ap_naissance','ap.messages']).forEach(function(k){localStorage.removeItem(k);});
if(P){localStorage.setItem('ap.compte.proprio',JSON.stringify({id:P}));}else{localStorage.removeItem('ap.compte.proprio');}}
var n=${p};var a={};try{a=JSON.parse(localStorage.getItem('ap.profil')||'{}')||{};}catch(e){}
var ch=false;for(var k in n){if(n[k]!==null&&n[k]!==undefined&&n[k]!==''&&JSON.stringify(a[k])!==JSON.stringify(n[k])){a[k]=n[k];ch=true;}}
if(ch){localStorage.setItem('ap.profil',JSON.stringify(a));}
var f=${f};if(f.length){var g=[];try{g=JSON.parse(localStorage.getItem('ap.favoris')||'[]')||[];}catch(e){}if(!Array.isArray(g)){g=[];}
var vus={},u=[];f.concat(g).forEach(function(x){if(x&&x.url&&!vus[x.url]){vus[x.url]=1;u.push(x);}});
u.sort(function(x,y){return String(y.date||'').localeCompare(String(x.date||''));});u=u.slice(0,500);
if(JSON.stringify(u)!==JSON.stringify(g)){localStorage.setItem('ap.favoris',JSON.stringify(u));}}
var c=${c};var ac=localStorage.getItem('ap.compte');var ao=null;try{ao=JSON.parse(ac||'null');}catch(e){}
if(c){if(!ao||ao.session!==c.session){localStorage.setItem('ap.compte',JSON.stringify(c));}}else if(ac){localStorage.removeItem('ap.compte');}
}catch(e){}})();true;`;
}

/** Script injecté APRÈS le chargement : renvoie à l'application le profil et les favoris tenus par le site (postMessage) ;
 *  « compteChange » quand la page a changé « ap.compte » (connexion, déconnexion faites dans la page ; une synchro de la page
 *  ne change que sa propre date, que l'appli ignore ; les compteurs du serveur, messages non lus et, pour l'admin, réponses à valider
 *  de la page de validation, sont repris par compte.ts adopterCompte). « proprio » (08/10/2026) = propriétaire des données de la page
 *  (empreinte de « ap.compte.proprio ») : vue-site.tsx ne reprend le profil et les favoris que s'il est celui de l'appli. */
export const INJECTION_APRES = `(function(){function proprio(){try{return (JSON.parse(localStorage.getItem('ap.compte.proprio')||'null')||{}).id||'';}catch(e){return '';}}
function envoyer(cc){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'etat',profil:localStorage.getItem('ap.profil'),favoris:localStorage.getItem('ap.favoris'),compte:localStorage.getItem('ap.compte'),proprio:proprio(),compteChange:!!cc,titre:document.title,url:location.href}));}catch(e){}}
envoyer();var S=Storage.prototype,set=S.setItem,del=S.removeItem;
function local(o){try{return o===window.localStorage;}catch(e){return false;}}
S.setItem=function(k,v){set.apply(this,arguments);if(local(this)&&(k==='ap.profil'||k==='ap.favoris'||k==='ap.compte')){envoyer(k==='ap.compte');}};
S.removeItem=function(k){del.apply(this,arguments);if(local(this)&&k==='ap.compte'){envoyer(true);}};
document.addEventListener('visibilitychange',function(){if(document.hidden){envoyer();}});})();true;`;

export type MessageSite = { type: 'etat'; profil: string | null; favoris: string | null; compte?: string | null; proprio?: string; compteChange?: boolean; titre: string; url: string };

export function lireMessage(brut: string): MessageSite | null {
  try {
    const m = JSON.parse(brut);
    return m && m.type === 'etat' ? (m as MessageSite) : null;
  } catch {
    return null;
  }
}
