// Dépôt des mises à jour de contenu sur l'iPhone (ticket #162) : fichiers de DONNÉES téléchargés et vérifiés (maj/coeur.ts), rangés dans
// le dossier de l'appli (Documents/maj/ : f/ publics, achats/ fichiers achetés, à part ; etat-<n>.json ; tmp/). Aucun code n'est
// téléchargé. Un fichier du dépôt remplace la copie embarquée du même nom (embarque.ts) ; sans dépôt (aperçu web), l'appli lit ses copies.
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { VERSION_EMBARQUEE } from '../embarque-registre';
import { texteOrigine, texteUri } from '../embarque-origine';
import { chargerEtat, ecrireEtat, ETAT_VIDE, lireLot, lireManifeste, mettreAJour, nettoyer, sansPerime, type ES, type Etat, type Manifeste, type Resultat } from './coeur';

const ACTIF = Platform.OS !== 'web';
// adresse du site (comme site.ts, non importé ici : site.ts lit le catalogue, que maj/donnees.ts doit mettre à jour avant)
// EXPO_PUBLIC_MAJ_SITE (essais seulement, fixé à la construction : serveur local http://localhost:…/) ; absent dans les versions publiées
const SITE = process.env.EXPO_PUBLIC_MAJ_SITE || 'https://affectionplus.com/';
const UN_JOUR = 24 * 3600 * 1000;

let racine: Directory | null = null;
function dossierRacine(): Directory {
  if (!racine) {
    racine = new Directory(Paths.document, 'maj');
    try { if (!racine.exists) racine.create({ intermediates: true, idempotent: true }); } catch { /* existe déjà */ }
  }
  return racine;
}
const parties = (chemin: string) => chemin.split('/').filter(Boolean);
const fichier = (chemin: string) => new File(dossierRacine(), ...parties(chemin));
const dossier = (chemin: string) => (chemin ? new Directory(dossierRacine(), ...parties(chemin)) : dossierRacine());

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

/** Entrées-sorties réelles (expo-file-system, expo-crypto) : aucune bibliothèque native nouvelle. */
export const ES_APPAREIL: ES = {
  lire: (c) => { try { const f = fichier(c); return f.exists ? f.textSync() : null; } catch { return null; } },
  ecrire: (c, t) => { const f = fichier(c); if (!f.exists) f.create({ intermediates: true }); f.write(t); },
  existe: (c) => { try { return fichier(c).exists; } catch { return false; } },
  supprimer: (c) => { const f = fichier(c); if (f.exists) f.delete(); },
  deplacer: (de, vers) => { fichier(de).moveSync(fichier(vers)); },
  lister: (c) => { try { const d = dossier(c); return d.exists ? d.list().filter((x) => x instanceof File).map((x) => x.name) : []; } catch { return []; } },
  creerDossier: (c) => { const d = dossier(c); if (!d.exists) d.create({ intermediates: true, idempotent: true }); },
  taille: (c) => fichier(c).size || 0,
  empreinte: async (c) => hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, await fichier(c).bytes())),
  telecharger: async (url, c) => { const f = fichier(c); if (f.exists) f.delete(); await File.downloadFileAsync(url, f, { idempotent: true }); },
  texteDistant: async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('site ' + r.status); return r.text(); },
};

const EMBARQUE = {
  manifeste: async (): Promise<Manifeste | null> => lireManifeste(await texteOrigine('m/manifeste.json')),
  lot: async (id: string) => lireLot(await texteOrigine('l/' + id + '.json')),
};

// ---- état courant (lu une fois, de façon synchrone : les images et les données en ont besoin au premier rendu)
let etat: Etat | null = null;
function etatCourant(): Etat {
  if (!etat) {
    if (!ACTIF) return (etat = { ...ETAT_VIDE, fichiers: {} });
    try {
      const lu = chargerEtat(ES_APPAREIL);
      // nouvelle version de l'appli : son contenu embarqué est au moins aussi récent que les fichiers téléchargés avant elle
      etat = sansPerime(lu, VERSION_EMBARQUEE);
      if (Object.keys(etat.fichiers).length !== Object.keys(lu.fichiers).length) {
        etat = ecrireEtat(ES_APPAREIL, etat);
        nettoyer(ES_APPAREIL, etat);
      }
    } catch { etat = { ...ETAT_VIDE, fichiers: {} }; }
  }
  return etat;
}

/** L'adresse locale du fichier téléchargé qui remplace la copie embarquée de ce nom, ou null. */
export function fichierDepot(nom: string): string | null {
  const e = etatCourant().fichiers[nom];
  if (!e) return null;
  try { return fichier(e.f).uri; } catch { return null; }
}

/** Le texte du fichier téléchargé de ce nom, ou null (lecture du fichier même, sans réseau). */
export async function texteDepot(nom: string): Promise<string | null> {
  const e = etatCourant().fichiers[nom];
  if (!e) return null;
  try { const f = fichier(e.f); return f.exists ? await f.text() : null; } catch { return texteUri(fichierDepot(nom)); }
}

/** Texte synchrone d'un petit fichier téléchargé (données des outils, au lancement), ou null. */
export function texteDepotSync(nom: string): string | null {
  const e = etatCourant().fichiers[nom];
  return e ? ES_APPAREIL.lire(e.f) : null;
}

/** Noms des fichiers téléchargés en service. */
export function nomsDepot(): string[] { return Object.keys(etatCourant().fichiers); }

/** Date (ms) du dernier contact réussi avec le site, 0 si jamais. */
export function derniereVerification(): number { return etatCourant().verifie || 0; }

// ---- droits sur les dossiers achetés (rempli par l'achat intégré, à venir) : sans droit, rien n'est téléchargé
let droits = new Set<string>();
export function definirDroits(ids: string[]): void { droits = new Set(ids); }

// ---- état de la mise à jour (indicateur discret de l'écran Moi) et abonnés aux changements de contenu
export type EtatMaj = { enCours: boolean; verifie: number; fait?: number; total?: number };
let etatMaj: EtatMaj = { enCours: false, verifie: 0 };
const abonnesMaj = new Set<(e: EtatMaj) => void>();
const abonnesContenu = new Set<() => void>();
function noter(e: Partial<EtatMaj>): void { etatMaj = { ...etatMaj, ...e }; abonnesMaj.forEach((f) => f(etatMaj)); }
/** Suit l'état de la mise à jour ; rend la fonction de désabonnement. */
export function surMaj(f: (e: EtatMaj) => void): () => void { abonnesMaj.add(f); f({ ...etatMaj, verifie: etatMaj.verifie || derniereVerification() }); return () => { abonnesMaj.delete(f); }; }
/** Appelé quand de nouveaux fichiers sont en service (les écrans vident leurs copies en mémoire). */
export function surNouveauContenu(f: () => void): () => void { abonnesContenu.add(f); return () => { abonnesContenu.delete(f); }; }

let enCours: Promise<Resultat> | null = null;
/** Mise à jour du contenu (vérification quotidienne, bouton ou geste « tirer pour actualiser ») ; une seule à la fois. Lève une erreur si
 *  le site ne répond pas (le contenu de l'appareil reste lisible). */
export function mettreAJourContenu(progression?: (fait: number, total: number) => void): Promise<Resultat> {
  if (!ACTIF) return Promise.reject(new Error('aperçu web : pas de dépôt'));
  if (enCours) return enCours;
  const avant = etatCourant();
  noter({ enCours: true, fait: 0, total: 0 });
  enCours = mettreAJour({
    es: ES_APPAREIL, embarque: EMBARQUE, site: SITE, appli: Application.nativeApplicationVersion || '1.0.0',
    droit: (d) => droits.has(d),
    progression: (f, t) => { noter({ fait: f, total: t }); if (progression) progression(f, t); },
  }).then((r) => {
    etat = r.etat;
    noter({ enCours: false, verifie: r.etat.verifie });
    const change = JSON.stringify(avant.fichiers) !== JSON.stringify(r.etat.fichiers);
    if (change) abonnesContenu.forEach((f) => { try { f(); } catch { /* écran démonté */ } });
    return r;
  }, (e) => { noter({ enCours: false }); throw e; }).finally(() => { enCours = null; });
  return enCours;
}

let tentee = 0;
/** Vérification discrète, au plus une fois par jour (au lancement et au retour au premier plan), sans message ni blocage. */
export function majQuotidienne(): void {
  if (!ACTIF || Date.now() - Math.max(derniereVerification(), tentee) < UN_JOUR) return;
  tentee = Date.now();
  mettreAJourContenu().catch(() => { tentee = Date.now() - UN_JOUR + 3600 * 1000; });   // hors ligne : nouvel essai dans une heure
}

/** Le manifeste en service (téléchargé, sinon embarqué) : journal des pages modifiées de l'écran « Nouveautés ». */
export async function manifesteCourant(): Promise<Manifeste | null> {
  return lireManifeste(await texteDepot('m/manifeste.json')) || EMBARQUE.manifeste();
}
