// Profil de l'utilisateur (prénom, naissance…), favoris, langue et compte facultatif : gardés sur l'appareil (AsyncStorage).
// Sans compte, rien n'est envoyé ; avec un compte (src/compte.ts, 06/10/2026), chaque changement est renvoyé au compte.
// Même forme que le profil du site (assets/js/espace.js, clés localStorage « ap.profil », « ap.favoris ») pour pré-remplir ses outils
// et pour la synchronisation commune.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { chargerCompte, compteActuel, envoyerEnAttente, pousser, presence, surCompte, tirerSiVieux, deconnecter, type Compte } from './compte';
import { estLangue, langueAppareil, type Langue } from './i18n';
import { paysParCode } from './moteur/lieux';

export type Lieu = { code: string; ville?: string | null; lat?: number | null; lon?: number | null };
export type Profil = {
  prenom?: string;
  nom?: string;              // nom de famille (facultatif, 06/10/2026 : numérologie du nom complet)
  sexe?: string;             // 'f' ou 'm' (facultatif, 06/10/2026 : compatibilité amoureuse, lecture védique)
  naissance?: string;        // AAAA-MM-JJ
  heure?: string;            // HH:MM
  rencontre?: string;        // AAAA-MM-JJ (compteur de couple du site, 06/10/2026)
  mariage?: string;          // AAAA-MM-JJ
  naissance_lieu?: Lieu;
  residence?: Lieu;
  courriel?: string;
};
/** Favori : forme du site (espace.js) — url = chemin « /fr/….html », titre, langue, date AAAA-MM-JJ. */
export type Favori = { url: string; titre: string; lang?: string; date?: string };
export type { Compte };

const K = { profil: 'ap.profil', favoris: 'ap.favoris', langue: 'ap.langue', compte: 'ap.compte', paysIp: 'ap.pays_ip' };
const PRESENCE_MS = 60000;   // présence : une fois par minute au plus, appli au premier plan et compte connecté (comme le site)
const CHAMPS = ['prenom', 'nom', 'sexe', 'naissance', 'heure', 'rencontre', 'mariage', 'naissance_lieu', 'residence', 'courriel'];
const RX_DATE = /^\d{4}-\d{2}-\d{2}$/;

type Etat = {
  pret: boolean;
  profil: Profil;
  favoris: Favori[];
  langue: Langue;
  /** compte connecté (null = sans compte) */
  compte: Compte | null;
  setProfil: (p: Profil) => Promise<void>;
  fusionnerProfil: (p: Profil) => Promise<void>;
  setFavoris: (f: Favori[]) => Promise<void>;
  setLangue: (l: Langue) => Promise<void>;
  effacer: () => Promise<void>;
  /** relit profil et favoris dans AsyncStorage (après une synchronisation avec le compte) */
  recharger: () => Promise<void>;
};

const Ctx = createContext<Etat | null>(null);

function nettoyer(p: unknown): Profil {
  if (!p || typeof p !== 'object') return {};
  const x = p as Record<string, unknown>;
  const out: Profil = {};
  if (typeof x.prenom === 'string') out.prenom = x.prenom.slice(0, 40);
  if (typeof x.nom === 'string' && x.nom.trim()) out.nom = x.nom.trim().slice(0, 60);
  if (x.sexe === 'f' || x.sexe === 'm') out.sexe = x.sexe;
  if (typeof x.naissance === 'string' && RX_DATE.test(x.naissance)) out.naissance = x.naissance;
  if (typeof x.heure === 'string' && /^\d{2}:\d{2}/.test(x.heure)) out.heure = x.heure.slice(0, 5);
  if (typeof x.rencontre === 'string' && RX_DATE.test(x.rencontre)) out.rencontre = x.rencontre;
  if (typeof x.mariage === 'string' && RX_DATE.test(x.mariage)) out.mariage = x.mariage;
  if (typeof x.courriel === 'string') out.courriel = x.courriel.slice(0, 254);
  for (const k of ['naissance_lieu', 'residence'] as const) {
    const l = x[k] as Record<string, unknown> | undefined;
    if (l && typeof l === 'object' && typeof l.code === 'string' && /^[A-Za-z]{2}$/.test(l.code)) {
      out[k] = { code: l.code.toUpperCase(), ville: typeof l.ville === 'string' ? l.ville : null,
        lat: typeof l.lat === 'number' ? l.lat : null, lon: typeof l.lon === 'number' ? l.lon : null };
    }
  }
  return out;
}

/** Champs du profil que l'appli ne gère pas (ex. « ascendant » du site) : gardés tels quels pour ne pas les effacer du compte. */
function autres(p: unknown): Record<string, unknown> {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p as Record<string, unknown>)) if (!CHAMPS.includes(k) && v !== undefined) out[k] = v;
  return out;
}

/** Chemin d'un favori : « /fr/….html » (une URL complète du site perd son domaine, l'ancre et les paramètres). */
function chemin(u: string): string {
  let p = u.trim().replace(/^https?:\/\/[^/?#]+/i, '').split('#')[0].split('?')[0];
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

/** Favoris : forme du site { url, titre, lang, date } ; l'ancienne forme de l'appli { u, t } est convertie. */
function nettoyerFavoris(f: unknown): Favori[] {
  if (!Array.isArray(f)) return [];
  const vus = new Set<string>();
  const out: Favori[] = [];
  for (const x of f) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    const brut = typeof o.url === 'string' ? o.url : typeof o.u === 'string' ? o.u : '';
    if (!brut) continue;
    const url = chemin(brut);
    if (vus.has(url)) continue;
    vus.add(url);
    const fav: Favori = { url, titre: String(o.titre || o.t || url).slice(0, 200) };
    const lang = typeof o.lang === 'string' && /^[a-z]{2}$/.test(o.lang) ? o.lang : (/^\/([a-z]{2})\//.exec(url) || [])[1];
    if (lang) fav.lang = lang;
    if (typeof o.date === 'string' && RX_DATE.test(o.date.slice(0, 10))) fav.date = o.date.slice(0, 10);
    out.push(fav);
  }
  return out.slice(0, 500);
}

function lire(v: string | null | undefined): unknown {
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

export function ProfilProvider({ children }: { children: React.ReactNode }) {
  const [pret, setPret] = useState(false);
  const [profil, setProfilEtat] = useState<Profil>({});
  const [favoris, setFavorisEtat] = useState<Favori[]>([]);
  const [langue, setLangueEtat] = useState<Langue>('en');
  const [compte, setCompte] = useState<Compte | null>(null);
  // valeurs courantes (lues de façon synchrone par les écritures, sans dépendre du rendu)
  const profilRef = useRef<Profil>({});
  const extras = useRef<Record<string, unknown>>({});
  const favorisRef = useRef<Favori[]>([]);

  const lireStockage = useCallback(async () => {
    const [p, f] = await AsyncStorage.multiGet([K.profil, K.favoris]);
    const brutP = lire(p[1]);
    const np = nettoyer(brutP);
    profilRef.current = np; extras.current = autres(brutP);
    setProfilEtat(np);
    const brutF = lire(f[1]);
    const nf = nettoyerFavoris(brutF);
    favorisRef.current = nf;
    setFavorisEtat(nf);
    // anciens favoris de l'appli ({u, t}) : réécrits une fois dans la forme du site, pour la synchronisation
    if (Array.isArray(brutF) && JSON.stringify(brutF) !== JSON.stringify(nf)) await AsyncStorage.setItem(K.favoris, JSON.stringify(nf));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [l] = await AsyncStorage.multiGet([K.langue]);
        await lireStockage();
        const lg = l[1] && estLangue(l[1]) ? l[1] : langueAppareil(getLocales().map((x) => x.languageTag));
        setLangueEtat(lg);
        setCompte(await chargerCompte());   // même chargement que le profil : pas d'état « déconnecté » transitoire
      } catch {
        setLangueEtat(langueAppareil(getLocales().map((x) => x.languageTag)));
      } finally {
        setPret(true);
      }
    })();
  }, [lireStockage]);

  const recharger = useCallback(async () => {
    try { await lireStockage(); } catch { /* stockage illisible */ }
  }, [lireStockage]);

  // compte : suivi des connexions/déconnexions et des données reçues (« sync » = état des envois, lu par « Mon compte » lui-même)
  useEffect(() => {
    const fin = surCompte((e) => {
      if (e === 'compte') setCompte(compteActuel());
      else if (e === 'donnees') recharger();
    });
    return fin;
  }, [recharger]);
  // synchronisation automatique (07/10/2026 nuit, comme le site) : tirage au lancement et au retour au premier plan si le dernier date
  // de plus de 2 min ; au passage en arrière-plan, l'envoi en attente part tout de suite ; au retour, un envoi en échec repart
  useEffect(() => {
    if (!pret) return;
    const minuterie = setTimeout(tirerSiVieux, 800);
    const abo = AppState.addEventListener('change', (s) => {
      if (s === 'active') { tirerSiVieux(); envoyerEnAttente(); }
      else envoyerEnAttente();                       // 'background' ou 'inactive'
    });
    return () => { clearTimeout(minuterie); abo.remove(); };
  }, [pret]);

  const ecrireProfil = useCallback(async (n: Profil, extra?: Record<string, unknown>) => {
    const ext = extra ? { ...extras.current, ...extra } : extras.current;
    if (JSON.stringify(n) === JSON.stringify(profilRef.current) && ext === extras.current) return;   // rien de neuf
    profilRef.current = n; extras.current = ext;
    setProfilEtat(n);
    await AsyncStorage.setItem(K.profil, JSON.stringify({ ...ext, ...n }));
    pousser();
  }, []);
  const setProfil = useCallback(async (p: Profil) => {
    await ecrireProfil(nettoyer(p));
  }, [ecrireProfil]);
  const fusionnerProfil = useCallback(async (p: Profil) => {
    const ext = autres(p);
    const n = nettoyer({ ...profilRef.current, ...nettoyer(p) });
    await ecrireProfil(n, Object.keys(ext).length && JSON.stringify({ ...extras.current, ...ext }) !== JSON.stringify(extras.current) ? ext : undefined);
  }, [ecrireProfil]);
  const setFavoris = useCallback(async (f: Favori[]) => {
    const n = nettoyerFavoris(f);
    if (JSON.stringify(n) === JSON.stringify(favorisRef.current)) return;
    favorisRef.current = n;
    setFavorisEtat(n);
    await AsyncStorage.setItem(K.favoris, JSON.stringify(n));
    pousser();
  }, []);
  /** Pays déduit de l'adresse IP (réponse de /api/presence) : remplit UNE seule fois par appareil (marque « ap.pays_ip ») le pays vide
   *  de la « ville où vous vivez », s'il existe dans pays.json (assets/data/pays.js du site) ; un pays déjà rempli n'est jamais
   *  remplacé, et un pays effacé par la personne n'est pas remis (comme espace.js paysIp). */
  const paysIp = useCallback(async (code: string) => {
    try { if (await AsyncStorage.getItem(K.paysIp)) return; } catch { return; }
    const fait = () => AsyncStorage.setItem(K.paysIp, code).catch(() => undefined);
    if (profilRef.current.residence && profilRef.current.residence.code) { await fait(); return; }
    if (!paysParCode(code, 'fr')) return;                                  // pays inconnu du site : rien
    await fait();
    await ecrireProfil(nettoyer({ ...profilRef.current, residence: { code, ville: null, lat: null, lon: null } }));
  }, [ecrireProfil]);

  // présence (activite_api.js, 07/10/2026 soir) : POST /api/presence {appareil:'appli'} 1,5 s après l'ouverture de session ou le
  // lancement, puis toutes les 60 s et au retour au premier plan, seulement si un compte est connecté et que l'appli est active
  const session = compte ? compte.session : '';
  const presDerniere = useRef({ session: '', t: 0 });
  useEffect(() => {
    if (!pret || !session) return;
    const tic = () => {
      if (AppState.currentState !== 'active') return;
      const d = presDerniere.current;
      if (d.session === session && Date.now() - d.t < PRESENCE_MS - 2000) return;
      presDerniere.current = { session, t: Date.now() };
      presence().then((code) => { if (code) paysIp(code).catch(() => undefined); }).catch(() => undefined);
    };
    const premier = setTimeout(tic, 1500);
    const minuterie = setInterval(tic, PRESENCE_MS);
    const abo = AppState.addEventListener('change', (s) => { if (s === 'active') tic(); });
    return () => { clearTimeout(premier); clearInterval(minuterie); abo.remove(); };
  }, [pret, session, paysIp]);

  const setLangue = useCallback(async (l: Langue) => {
    setLangueEtat(l);
    await AsyncStorage.setItem(K.langue, l);
  }, []);
  /** Efface profil et favoris de l'appareil ; un compte connecté est seulement déconnecté (ses données restent sur le compte). */
  const effacer = useCallback(async () => {
    await deconnecter();
    profilRef.current = {}; extras.current = {}; favorisRef.current = [];
    setProfilEtat({}); setFavorisEtat([]);
    await AsyncStorage.multiRemove([K.profil, K.favoris, 'ap.lettre']);   // ap.lettre : lettre d'un invité (lettre.ts, 07/10/2026)
  }, []);

  const valeur = useMemo<Etat>(() => ({ pret, profil, favoris, langue, compte, setProfil, fusionnerProfil, setFavoris, setLangue, effacer, recharger }),
    [pret, profil, favoris, langue, compte, setProfil, fusionnerProfil, setFavoris, setLangue, effacer, recharger]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useProfil(): Etat {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfil hors de ProfilProvider');
  return v;
}

/** Ce que l'application pousse vers le site (jamais le courriel) ; les champs vides ne sont pas envoyés. */
export function profilPourSite(p: Profil): Profil {
  const out: Profil = {};
  if (p.prenom) out.prenom = p.prenom;
  if (p.nom) out.nom = p.nom;
  if (p.sexe) out.sexe = p.sexe;
  if (p.naissance) out.naissance = p.naissance;
  if (p.heure) out.heure = p.heure;
  if (p.rencontre) out.rencontre = p.rencontre;
  if (p.mariage) out.mariage = p.mariage;
  if (p.naissance_lieu) out.naissance_lieu = p.naissance_lieu;
  if (p.residence) out.residence = p.residence;
  return out;
}
