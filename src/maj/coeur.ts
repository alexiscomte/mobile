// Mises à jour de contenu SANS nouvelle version de l'appli (ticket #162, V15-07, 26/10/2026) : logique pure, sans dépendance native.
// RÈGLE D'ALEXIS : AUCUN code n'est téléchargé (ni JavaScript ni natif) ; seuls des fichiers de DONNÉES (JSON, images, villes au format
// de données) le sont, jamais exécutés. Le manifeste du site (assets/data/appli/manifeste.json, outils/gen/app_manifeste.py) décrit chaque
// paquet (adresse, version, taille, empreinte sha256, version minimale de l'appli) ; l'appli compare avec le manifeste EMBARQUÉ (contenu
// présent dès l'installation) et ne télécharge que les fichiers qui en diffèrent.
// Sûreté : chaque fichier est téléchargé dans tmp/, vérifié (taille, sha256), puis rangé sous son empreinte (f/<sha256>.<ext>, jamais
// écrasé) ; l'état (quel fichier sert pour quel nom) est écrit dans un NOUVEAU fichier etat-<n>.json, le plus haut lisible faisant foi :
// une coupure (réseau, appli fermée, téléphone éteint) laisse toujours l'état précédent intact, et les fichiers déjà vérifiés servent à la
// reprise. Les fichiers achetés (acces « achat ») sont rangés à part (achats/) et ne sont jamais téléchargés sans droit.

export const FORMAT = 1;
export type Acces = 'public' | 'achat';
export type Paquet = {
  id: string; categorie: string; type: 'fichier' | 'lot'; url: string; version: string; taille: number; sha256: string;
  min_appli: string; acces: Acces; nom?: string; dossier?: string;
};
export type PageModifiee = { url: string; titre: string; type: 'ajout' | 'mise_a_jour'; resume?: string; sections?: string[] };
export type Modification = { version: string; date: string; pages_modifiees: PageModifiee[]; nombre?: Record<string, number> };
export type Manifeste = { format: number; version: string; date: string; min_appli?: string; paquets: Paquet[]; modifications?: Modification[] };
export type FichierLot = { nom: string; url: string; taille: number; sha256: string };
// une entrée de l'état : fichier vérifié du dépôt qui remplace la copie embarquée du même nom
export type Entree = { sha256: string; taille: number; f: string; p: string; v: string };   // f : chemin dans le dépôt ; p : paquet ; v : version du manifeste
export type Etat = { n: number; version: string; verifie: number; fichiers: Record<string, Entree> };

/** Accès aux fichiers et au réseau (expo-file-system dans l'appli, fs de Node dans les essais). Chemins relatifs à la racine du dépôt. */
export interface ES {
  lire(chemin: string): string | null;                    // petit fichier texte (état, lot), synchrone ; null s'il manque
  ecrire(chemin: string, texte: string): void;
  existe(chemin: string): boolean;
  supprimer(chemin: string): void;
  deplacer(de: string, vers: string): void;               // « vers » n'existe pas
  lister(dossier: string): string[];                      // noms des fichiers du dossier ([] s'il manque)
  creerDossier(chemin: string): void;
  taille(chemin: string): number;
  empreinte(chemin: string): Promise<string>;             // sha256 en hexadécimal
  telecharger(url: string, chemin: string): Promise<void>; // écrit la réponse dans « chemin » ; lève une erreur si le site échoue
  texteDistant(url: string): Promise<string>;
}

const HEX = /^[0-9a-f]{64}$/;
// noms logiques : préfixe d'une lettre (c contenu, s recherche, q quiz, v villes, i images, d données des outils, p pages JSON, k catalogue
// des dossiers, l lots, m manifeste, a fichiers achetés) ; extensions de DONNÉES seulement. Les villes sont des données « APV.set("XX", […]) »
// lues comme JSON (moteur/lieux.ts), jamais exécutées : c'est le seul « .js » admis, et seulement sous v/.
const NOM = /^([a-z])\/([A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*)$/;
const EXT_DONNEES = ['json', 'webp', 'png', 'jpg', 'jpeg', 'svg', 'gif'];

/** Un nom logique sûr (pas de « .. », pas de chemin absolu) et un type de fichier de données. */
export function nomSur(nom: string): boolean {
  const m = NOM.exec(nom);
  if (!m || nom.includes('..')) return false;
  const ext = (m[2].split('.').pop() || '').toLowerCase();
  if (m[1] === 'v') return ext === 'js' || ext === 'json';
  return EXT_DONNEES.includes(ext) && 'csqidpklma'.includes(m[1]);
}

/** Une adresse de fichier relative au site (« assets/… ») ou absolue en https. */
function urlSure(u: string): boolean {
  return typeof u === 'string' && (/^assets\/[A-Za-z0-9._/-]+$/.test(u) && !u.includes('..') || /^https:\/\/[^\s]+$/.test(u));
}

/** Compare deux versions « 1.2.3 » : <0, 0, >0. */
export function compareVersions(a: string, b: string): number {
  const pa = String(a || '0').split('.').map((x) => parseInt(x, 10) || 0), pb = String(b || '0').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
}

/** Le manifeste lu et contrôlé, ou null s'il est illisible ou incohérent (alors rien n'est changé sur l'appareil). */
export function lireManifeste(texte: string | null): Manifeste | null {
  if (!texte) return null;
  let m: Manifeste;
  try { m = JSON.parse(texte) as Manifeste; } catch { return null; }
  if (!m || typeof m !== 'object' || typeof m.format !== 'number' || typeof m.version !== 'string' || !Array.isArray(m.paquets)) return null;
  const ids = new Set<string>();
  for (const p of m.paquets) {
    if (!p || typeof p.id !== 'string' || ids.has(p.id) || !HEX.test(p.sha256) || !urlSure(p.url) || typeof p.taille !== 'number') return null;
    if (p.type !== 'fichier' && p.type !== 'lot') return null;
    if (p.type === 'fichier' && !nomSur(p.nom || '')) return null;
    if (p.acces !== 'public' && p.acces !== 'achat') return null;
    ids.add(p.id);
  }
  if (m.modifications !== undefined && !Array.isArray(m.modifications)) return null;
  return m;
}

/** La liste d'un lot, contrôlée (noms sûrs, empreintes, adresses), ou null. */
export function lireLot(texte: string | null): FichierLot[] | null {
  if (!texte) return null;
  try {
    const l = JSON.parse(texte) as { fichiers?: FichierLot[] };
    if (!l || !Array.isArray(l.fichiers)) return null;
    for (const f of l.fichiers) if (!f || !nomSur(f.nom) || !HEX.test(f.sha256) || !urlSure(f.url) || typeof f.taille !== 'number') return null;
    return l.fichiers;
  } catch { return null; }
}

// ---------------------------------------------------------------- état
const RX_ETAT = /^etat-(\d+)\.json$/;
export const ETAT_VIDE: Etat = { n: 0, version: '', verifie: 0, fichiers: {} };

/** L'état le plus récent lisible (etat-<n>.json au n le plus haut) ; un état illisible (coupure pendant l'écriture) est ignoré. */
export function chargerEtat(es: ES): Etat {
  const ns = es.lister('').map((n) => RX_ETAT.exec(n)).filter((m): m is RegExpExecArray => !!m).map((m) => Number(m[1])).sort((a, b) => b - a);
  for (const n of ns) {
    try {
      const e = JSON.parse(es.lire('etat-' + n + '.json') || '') as Etat;
      if (e && typeof e.fichiers === 'object' && e.fichiers) return { ...ETAT_VIDE, ...e, n };
    } catch { /* état incomplet : le précédent fait foi */ }
  }
  return { ...ETAT_VIDE, fichiers: {} };
}

/** Écrit un nouvel état (etat-<n+1>.json, d'abord sous un nom provisoire puis renommé), puis efface les anciens. Rend l'état écrit. */
export function ecrireEtat(es: ES, etat: Etat): Etat {
  const n = etat.n + 1;
  const tmp = 'tmp/etat-' + n + '.json';
  es.creerDossier('tmp');
  if (es.existe(tmp)) es.supprimer(tmp);
  es.ecrire(tmp, JSON.stringify({ ...etat, n }));
  const dest = 'etat-' + n + '.json';
  if (es.existe(dest)) es.supprimer(dest);
  es.deplacer(tmp, dest);
  for (const nom of es.lister('')) {
    const m = RX_ETAT.exec(nom);
    if (m && Number(m[1]) < n) { try { es.supprimer(nom); } catch { /* sera effacé plus tard */ } }
  }
  return { ...etat, n };
}

/** Retire les fichiers d'un dépôt qu'un contenu embarqué au moins aussi récent rend inutiles (nouvelle version de l'appli installée). */
export function sansPerime(etat: Etat, versionEmbarquee: string): Etat {
  if (!versionEmbarquee) return etat;
  const fichiers: Record<string, Entree> = {};
  for (const [nom, e] of Object.entries(etat.fichiers)) if (e.v > versionEmbarquee) fichiers[nom] = e;
  return { ...etat, fichiers, version: etat.version > versionEmbarquee ? etat.version : '' };
}

// ---------------------------------------------------------------- mise à jour
export type Embarque = {
  manifeste: () => Promise<Manifeste | null>;               // manifeste embarqué dans l'appli
  lot: (id: string) => Promise<FichierLot[] | null>;        // lot embarqué (l/<id>.json)
};
export type Options = {
  es: ES; embarque: Embarque; site: string; appli: string;
  droit?: (dossier: string) => boolean;                     // droit d'accès à un dossier acheté (aucun par défaut)
  maintenant?: () => number;
  progression?: (fait: number, total: number) => void;
  pointDeReprise?: number;                                  // état écrit tous les N fichiers téléchargés (reprise après coupure)
};
export type Resultat = { etat: Etat; telecharges: number; echecs: string[]; complet: boolean; version: string; aJour: boolean; manifeste: Manifeste | null };

const extension = (nom: string) => (nom.split('.').pop() || 'dat').toLowerCase();
// ordre des téléchargements : images, villes, données, quiz, pages JSON, catalogue, paquets d'articles, puis index et recherche (un index
// ne doit pas annoncer un paquet encore absent)
function rang(nom: string): number {
  const ordre = 'ivdqpkcsl';
  if (nom.startsWith('c/') && nom.endsWith('-index.json')) return 7.5;
  const i = ordre.indexOf(nom[0]);
  return i < 0 ? 9 : i;
}

type Voulu = { nom: string; sha256: string; taille: number; url: string; paquet: string; achat: boolean };

/** Télécharge un fichier dans tmp/, le vérifie (taille, empreinte) et le range sous son empreinte. Rend son chemin dans le dépôt. */
async function obtenir(es: ES, site: string, v: Voulu): Promise<string> {
  const dossier = v.achat ? 'achats' : 'f';
  es.creerDossier(dossier);
  es.creerDossier('tmp');
  const dest = dossier + '/' + v.sha256 + '.' + extension(v.nom);
  // reprise : un fichier déjà téléchargé et vérifié lors d'un passage interrompu sert tel quel
  if (es.existe(dest)) {
    try { if (await es.empreinte(dest) === v.sha256) return dest; } catch { /* illisible : on le remplace */ }
    es.supprimer(dest);
  }
  const tmp = 'tmp/' + v.sha256 + '.part';
  if (es.existe(tmp)) es.supprimer(tmp);
  const url = (/^https:/.test(v.url) ? v.url : site + v.url) + (v.url.includes('?') ? '&' : '?') + 'v=' + v.sha256.slice(0, 12);
  try {
    await es.telecharger(url, tmp);
    if (es.taille(tmp) !== v.taille) throw new Error('taille');
    if (await es.empreinte(tmp) !== v.sha256) throw new Error('empreinte');
    es.deplacer(tmp, dest);
    return dest;
  } catch (e) {
    try { if (es.existe(tmp)) es.supprimer(tmp); } catch { /* sera effacé au prochain passage */ }
    throw e;
  }
}

/** Efface les fichiers du dépôt qu'aucun état ne cite et le dossier provisoire. */
export function nettoyer(es: ES, etat: Etat): void {
  const gardes = new Set(Object.values(etat.fichiers).map((e) => e.f));
  for (const d of ['f', 'achats']) for (const n of es.lister(d)) if (!gardes.has(d + '/' + n)) { try { es.supprimer(d + '/' + n); } catch { /* plus tard */ } }
  for (const n of es.lister('tmp')) { try { es.supprimer('tmp/' + n); } catch { /* plus tard */ } }
}

/** Une mise à jour complète : manifeste du site, lots, fichiers modifiés. Ne lève une erreur que si le manifeste est inaccessible. */
export async function mettreAJour(o: Options): Promise<Resultat> {
  const { es, site } = o;
  const maintenant = o.maintenant || Date.now;
  const emb = await o.embarque.manifeste();
  let etat = sansPerime(chargerEtat(es), emb ? emb.version : '');
  const texteManifeste = await es.texteDistant(site + 'assets/data/appli/manifeste.json?t=' + Math.floor(maintenant() / 600000));
  const manifeste = lireManifeste(texteManifeste);
  if (!manifeste) throw new Error('manifeste illisible');
  const fin = (r: Partial<Resultat>): Resultat => {
    etat = ecrireEtat(es, { ...etat, verifie: maintenant() });
    nettoyer(es, etat);
    return { etat, telecharges: 0, echecs: [], complet: true, version: etat.version, aJour: true, manifeste, ...r };
  };
  // format inconnu (appli trop ancienne) ou contenu du site plus ancien que celui de l'appli : rien à télécharger
  if (manifeste.format > FORMAT) return fin({ aJour: false });
  if (emb && manifeste.version <= emb.version) { etat = { ...etat, fichiers: {}, version: '' }; return fin({}); }

  // empreintes du contenu embarqué : nom -> sha256
  const embSha = new Map<string, string>();
  const embParId = new Map<string, Paquet>();
  for (const p of emb ? emb.paquets : []) {
    embParId.set(p.id, p);
    if (p.type === 'fichier' && p.nom) embSha.set(p.nom, p.sha256);
    else embSha.set('l/' + p.id + '.json', p.sha256);
  }
  const voulus = new Map<string, Voulu>();
  const gardesTels = new Set<string>();       // paquets non traités (appli trop ancienne, lot indisponible) : leurs fichiers restent tels quels
  const echecs: string[] = [];
  for (const p of manifeste.paquets) {
    if (compareVersions(o.appli, p.min_appli || '0') < 0) { gardesTels.add(p.id); continue; }
    const achat = p.acces === 'achat';
    if (achat && !(p.dossier && o.droit && o.droit(p.dossier))) continue;   // jamais téléchargé sans droit
    if (p.type === 'fichier') {
      voulus.set(p.nom as string, { nom: p.nom as string, sha256: p.sha256, taille: p.taille, url: p.url, paquet: p.id, achat });
      continue;
    }
    // lot : sa liste vient de l'appli (même empreinte), du dépôt, ou du site (vérifiée comme un fichier)
    const nomLot = 'l/' + p.id + '.json';
    const vLot: Voulu = { nom: nomLot, sha256: p.sha256, taille: p.taille, url: p.url, paquet: p.id, achat };
    let liste: FichierLot[] | null = null;
    if (embSha.get(nomLot) === p.sha256) liste = await o.embarque.lot(p.id);
    const deja = etat.fichiers[nomLot];
    if (!liste && deja && deja.sha256 === p.sha256) liste = lireLot(es.lire(deja.f));
    if (!liste) {
      try {
        const f = await obtenir(es, site, vLot);
        liste = lireLot(es.lire(f));
        if (liste) etat = { ...etat, fichiers: { ...etat.fichiers, [nomLot]: { sha256: p.sha256, taille: p.taille, f, p: p.id, v: manifeste.version } } };
      } catch { liste = null; }
    }
    if (!liste) { echecs.push(nomLot); gardesTels.add(p.id); continue; }
    voulus.set(nomLot, vLot);
    // empreintes embarquées des fichiers du lot (lot embarqué du même paquet, quelle que soit sa version)
    if (embParId.has(p.id)) {
      const le = embSha.get(nomLot) === p.sha256 ? liste : await o.embarque.lot(p.id);
      for (const f of le || []) if (!embSha.has(f.nom)) embSha.set(f.nom, f.sha256);
    }
    for (const f of liste) voulus.set(f.nom, { nom: f.nom, sha256: f.sha256, taille: f.taille, url: f.url, paquet: p.id, achat });
  }

  // ce qui reste à télécharger
  const finaux: Record<string, Entree> = {};
  for (const [nom, e] of Object.entries(etat.fichiers)) if (gardesTels.has(e.p)) finaux[nom] = e;
  const aTelecharger: Voulu[] = [];
  for (const v of voulus.values()) {
    if (embSha.get(v.nom) === v.sha256) continue;                                  // l'appli a déjà ce fichier
    const e = etat.fichiers[v.nom];
    if (e && e.sha256 === v.sha256 && es.existe(e.f)) { finaux[v.nom] = e; continue; }   // déjà téléchargé
    aTelecharger.push(v);
  }
  aTelecharger.sort((a, b) => rang(a.nom) - rang(b.nom) || (a.nom < b.nom ? -1 : 1));

  let telecharges = 0;
  const reprise = o.pointDeReprise || 40;
  const total = aTelecharger.length;
  let fait = 0;
  for (const v of aTelecharger) {
    try {
      const f = await obtenir(es, site, v);
      const e: Entree = { sha256: v.sha256, taille: v.taille, f, p: v.paquet, v: manifeste.version };
      finaux[v.nom] = e;
      telecharges++;
      // point de reprise : l'état intermédiaire garde l'ancien contenu et y ajoute ce qui est déjà vérifié
      if (telecharges % reprise === 0) etat = ecrireEtat(es, { ...etat, fichiers: { ...etat.fichiers, ...pris(finaux, etat) } });
    } catch {
      echecs.push(v.nom);
      if (etat.fichiers[v.nom]) finaux[v.nom] = etat.fichiers[v.nom];        // l'ancienne version reste
    }
    fait++;
    if (o.progression) o.progression(fait, total);
  }
  // complet si rien d'essentiel n'a échoué (une image manquante sur le site n'empêche pas d'annoncer les nouveautés)
  // (un paquet réservé à une version plus récente de l'appli ne compte pas)
  const complet = !echecs.some((n) => !n.startsWith('i/'));
  // le manifeste lui-même (journal des pages modifiées de l'écran « Nouveautés ») n'est gardé qu'une fois la mise à jour faite
  if (complet) {
    try { finaux['m/manifeste.json'] = rangerTexte(es, texteManifeste, manifeste.version); } catch { /* journal de l'appli */ }
  } else if (etat.fichiers['m/manifeste.json']) finaux['m/manifeste.json'] = etat.fichiers['m/manifeste.json'];
  etat = { ...etat, fichiers: finaux, version: complet ? manifeste.version : etat.version };
  return fin({ telecharges, echecs, complet, version: etat.version, aJour: complet });
}

/** Range un texte déjà vérifié (le manifeste) dans le dépôt, sous un nom unique ; rend son entrée. */
function rangerTexte(es: ES, texte: string, version: string): Entree {
  es.creerDossier('f');
  const f = 'f/manifeste-' + version.replace(/[^0-9A-Za-z]/g, '') + '.json';
  if (!es.existe(f)) {
    es.creerDossier('tmp');
    const tmp = 'tmp/manifeste.part';
    if (es.existe(tmp)) es.supprimer(tmp);
    es.ecrire(tmp, texte);
    es.deplacer(tmp, f);
  }
  return { sha256: '', taille: es.taille(f), f, p: 'manifeste', v: version };
}

/** Les entrées téléchargées pendant ce passage (pour le point de reprise). */
function pris(finaux: Record<string, Entree>, etat: Etat): Record<string, Entree> {
  const r: Record<string, Entree> = {};
  for (const [n, e] of Object.entries(finaux)) if (!etat.fichiers[n] || etat.fichiers[n].sha256 !== e.sha256) r[n] = e;
  return r;
}

/** Les pages modifiées par la dernière mise à jour dans une langue (journal du manifeste). */
export function nouveautes(m: Manifeste | null, lg: string, max = 1): { version: string; date: string; pages: PageModifiee[]; total: number }[] {
  const out: { version: string; date: string; pages: PageModifiee[]; total: number }[] = [];
  for (const mod of (m && m.modifications) || []) {
    const pages = (mod.pages_modifiees || []).filter((p) => p && typeof p.url === 'string' && p.url.startsWith(lg + '/'));
    if (!pages.length) continue;
    out.push({ version: mod.version, date: mod.date, pages, total: Math.max(pages.length, (mod.nombre && mod.nombre[lg]) || 0) });
    if (out.length >= max) break;
  }
  return out;
}
