// Accès au site affectionplus.com depuis l'application : catalogue des pages, adresses en « mode application »
// (page sans en-tête ni pied : classe html.app, voir outils/gen/app_mode.py), scripts injectés dans la vue web.
import catalogue from './catalogue.json';
import type { Compte } from './compte';
import type { Langue } from './i18n';
import type { Favori, Profil } from './profil';

export const SITE = 'https://affectionplus.com/';
export const IMAGES_SITE = 'https://images.affectionplus.com/';

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
 *  elle aussi), ou retirée si l'appli n'a pas de compte.
 *  Le JETON de session n'est jamais écrit sur le disque de la vue web (23/11/2026, relecture) : il vit dans une variable de la page (J),
 *  et la lecture, l'écriture et le retrait de « ap.compte » dans localStorage sont détournés pour cette seule clé (Storage.prototype) :
 *  le site lit « ap.compte » avec sa session comme avant, mais le disque ne garde que l'adresse, les dates et les drapeaux. Une connexion
 *  faite dans la page passe par le même détour (jeton en mémoire, repris par l'appli dans son coffre : adopterCompte). Une copie laissée
 *  en clair par une version précédente est réécrite sans jeton au premier chargement. Après une déconnexion, plus rien à purger. Ce que la
 *  page garde sur le disque est repris tant que c'est le même compte (même ancienne session, ou même numéro). La page garde sa propre date de synchro (sync = null pour une session
 *  nouvelle pour elle). Depuis le 07/10/2026 nuit (« le local gagne », cahier specs/synchro-local-0710.md), compte.js ne tire plus
 *  rien hors connexion : à son premier chargement avec cette session, l'état de la vue web devient sa base, et elle n'envoie
 *  ensuite QUE ce qui y change (envoi partiel) ; ses scores apq:*, vides dans la vue web, ne remplacent donc jamais ceux du compte.
 *  Appareil partagé (08/10/2026) : proprio = propriétaire des données de l'appli (compte.ts proprioLocal : « c:<id> » du compte depuis le
 *  lot 7, ou l'empreinte de l'adresse sous l'ancienne forme ; '' = invité jamais connecté) et adresse = l'empreinte de son adresse
 *  (proprioLocalAdresse). Si la vue web garde les données d'un autre propriétaire (« ap.compte.proprio » de compte.js : id et a), elles sont
 *  d'abord effacées (profil, favoris, scores, séries, parties, tests, votes, jeton de vote, marqueur, base, empreinte, ap.lettre,
 *  ap_naissance), puis le propriétaire de l'appli est posé : rien de l'ancien propriétaire ne revient dans l'appli ni ne part au compte.
 *  Lot 7 (changement d'adresse, 11/11/2026) : le MÊME compte noté sous l'une ou l'autre forme (« c:<id> » d'un côté, empreinte de son adresse
 *  de l'autre) n'efface rien (compte.ts memeProprioNotes : même règle) ; deux numéros différents sont deux comptes. Le numéro du compte
 *  (id) accompagne la session posée dans la page, que compte.js reconnaît ainsi sans l'adresse ; une session déjà présente dans la page
 *  sans numéro le reçoit de l'appli (compte.js réécrit alors le propriétaire sous la forme « c:<id> », sans rien effacer).
 *  Signal « ap.app.proprio » = c (sessionStorage, 11/11/2026) : cette appli comprend la forme du compte. Il est posé ICI, juste après
 *  « ap.app » et avant tout calcul du propriétaire, donc avant que la page exécute compte.js, qui sinon garde l'ancienne forme
 *  (empreinte de l'adresse) pour une appli publiée avant le lot 7 dont le script d'injection effacerait les données de la page à
 *  chaque chargement. Ne jamais le retirer, ne pas toucher à « ap.app ». */
export function injectionAvant(profil: Profil | null, favoris?: Favori[] | null, compte?: Compte | null, proprio?: string, adresse?: string): string {
  const p = JSON.stringify(profil || {});
  const f = JSON.stringify(favoris || []);
  const pr = JSON.stringify(proprio || '');
  const ad = JSON.stringify(adresse || '');
  // admin : comme ap.compte.admin du site (messages.js : pas de formulaire « Nous écrire » pour l'admin dès le premier affichage)
  const c = JSON.stringify(compte ? { ...(compte.id !== undefined ? { id: compte.id } : {}), courriel: compte.courriel, session: compte.session, sync: null,
    ...(compte.depuis ? { depuis: compte.depuis } : {}), ...(compte.admin ? { admin: true } : {}) } : null);
  return `(function(){try{document.documentElement.classList.add('app');sessionStorage.setItem('ap.app','1');sessionStorage.setItem('ap.app.proprio','c');
var P=${pr},A=${ad},wo={};try{wo=JSON.parse(localStorage.getItem('ap.compte.proprio')||'null')||{};}catch(e){}
var wp=typeof wo.id==='string'?wo.id:'',wa=typeof wo.a==='string'?wo.a:'',cp=P.indexOf('c:')===0,cw=wp.indexOf('c:')===0,fp=cp?A:P,fw=cw?wa:wp;
var meme=P===wp||(P!==''&&wp!==''&&!(cp&&cw)&&fp!==''&&fp===fw);
if(!meme){var ks=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf('apq:')===0||k.indexOf('ap.sondage:')===0)){ks.push(k);}}
ks.concat(['ap.profil','ap.favoris','ap.qdj','ap.jeu2','ap.compat','ap.sondage.jeton','ap.compte.sale','ap.compte.essai','ap.compte.base','ap.compte.empreinte','ap.lettre','ap_naissance','ap.messages']).forEach(function(k){localStorage.removeItem(k);});
if(P){localStorage.setItem('ap.compte.proprio',JSON.stringify(cp&&A?{id:P,a:A}:{id:P}));}else{localStorage.removeItem('ap.compte.proprio');}}
var n=${p};var a={};try{a=JSON.parse(localStorage.getItem('ap.profil')||'{}')||{};}catch(e){}
var ch=false;for(var k in n){if(n[k]!==null&&n[k]!==undefined&&n[k]!==''&&JSON.stringify(a[k])!==JSON.stringify(n[k])){a[k]=n[k];ch=true;}}
if(ch){localStorage.setItem('ap.profil',JSON.stringify(a));}
var f=${f};if(f.length){var g=[];try{g=JSON.parse(localStorage.getItem('ap.favoris')||'[]')||[];}catch(e){}if(!Array.isArray(g)){g=[];}
var vus={},u=[];f.concat(g).forEach(function(x){if(x&&x.url&&!vus[x.url]){vus[x.url]=1;u.push(x);}});
u.sort(function(x,y){return String(y.date||'').localeCompare(String(x.date||''));});u=u.slice(0,500);
if(JSON.stringify(u)!==JSON.stringify(g)){localStorage.setItem('ap.favoris',JSON.stringify(u));}}
var c=${c};var LS=window.localStorage,SP=Storage.prototype,g0=SP.getItem,s0=SP.setItem,r0=SP.removeItem,J=null;
function ici(o){try{return o===LS;}catch(e){return false;}}
function sans(v){var o=null;try{o=JSON.parse(v);}catch(e){}if(o&&typeof o==='object'&&!Array.isArray(o)){J=typeof o.session==='string'&&o.session?o.session:null;delete o.session;return JSON.stringify(o);}J=null;return v;}
var ac=g0.call(LS,'ap.compte');var ao=null;try{ao=JSON.parse(ac||'null');}catch(e){}if(!ao||typeof ao!=='object'||Array.isArray(ao)){ao=null;}
var vieux=ao&&typeof ao.session==='string'?ao.session:null;if(ao){delete ao.session;}
if(c){var js=c.session;delete c.session;
var meme=!!ao&&((vieux!==null&&vieux===js)||(c.id!==undefined&&ao.id!==undefined&&String(ao.id)===String(c.id)));
if(!meme){ao=c;}else if(c.id!==undefined&&ao.id===undefined){ao.id=c.id;}
var na=JSON.stringify(ao);if(na!==ac){s0.call(LS,'ap.compte',na);}J=js;}else if(ac){r0.call(LS,'ap.compte');}
SP.getItem=function(k){var v=g0.apply(this,arguments);if(J&&v&&k==='ap.compte'&&ici(this)){try{var o=JSON.parse(v);if(o&&typeof o==='object'&&!Array.isArray(o)){o.session=J;return JSON.stringify(o);}}catch(e){}}return v;};
SP.setItem=function(k,v){if(k==='ap.compte'&&ici(this)){return s0.call(this,k,sans(String(v)));}return s0.apply(this,arguments);};
SP.removeItem=function(k){if(k==='ap.compte'&&ici(this)){J=null;}return r0.apply(this,arguments);};
}catch(e){}})();true;`;
}

/** Script injecté APRÈS le chargement : renvoie à l'application le profil et les favoris tenus par le site (postMessage) ;
 *  « compteChange » quand la page a changé « ap.compte » (connexion, déconnexion faites dans la page ; une synchro de la page
 *  ne change que sa propre date, que l'appli ignore ; les compteurs du serveur, messages non lus et, pour l'admin, réponses à valider
 *  de la page de validation, sont repris par compte.ts adopterCompte). « proprio » (08/10/2026) = propriétaire des données de la page
 *  (id de « ap.compte.proprio ») et « proprioA » (lot 7) = l'empreinte de son adresse (a) : vue-site.tsx ne reprend le profil et les
 *  favoris que s'il est celui de l'appli (compte.ts memeProprioPage). */
export const INJECTION_APRES = `(function(){function proprio(){try{var o=JSON.parse(localStorage.getItem('ap.compte.proprio')||'null')||{};return {id:typeof o.id==='string'?o.id:'',a:typeof o.a==='string'?o.a:''};}catch(e){return {id:'',a:''};}}
function envoyer(cc){try{var pw=proprio();window.ReactNativeWebView.postMessage(JSON.stringify({type:'etat',profil:localStorage.getItem('ap.profil'),favoris:localStorage.getItem('ap.favoris'),compte:localStorage.getItem('ap.compte'),proprio:pw.id,proprioA:pw.a,compteChange:!!cc,titre:document.title,url:location.href}));}catch(e){}}
envoyer();var S=Storage.prototype,set=S.setItem,del=S.removeItem;
function local(o){try{return o===window.localStorage;}catch(e){return false;}}
S.setItem=function(k,v){set.apply(this,arguments);if(local(this)&&(k==='ap.profil'||k==='ap.favoris'||k==='ap.compte')){envoyer(k==='ap.compte');}};
S.removeItem=function(k){del.apply(this,arguments);if(local(this)&&k==='ap.compte'){envoyer(true);}};
document.addEventListener('visibilitychange',function(){if(document.hidden){envoyer();}});})();true;`;

export type MessageSite = { type: 'etat'; profil: string | null; favoris: string | null; compte?: string | null; proprio?: string; proprioA?: string; compteChange?: boolean; titre: string; url: string };

export function lireMessage(brut: string): MessageSite | null {
  try {
    const m = JSON.parse(brut);
    return m && m.type === 'etat' ? (m as MessageSite) : null;
  } catch {
    return null;
  }
}
