// Profil de l'utilisateur (prénom, naissance…), favoris et langue : gardés sur l'appareil (AsyncStorage), jamais envoyés.
// Même forme que le profil du site (assets/js/espace.js, clé localStorage « ap.profil ») pour pré-remplir ses outils.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { estLangue, langueAppareil, type Langue } from './i18n';

export type Lieu = { code: string; ville?: string | null; lat?: number | null; lon?: number | null };
export type Profil = {
  prenom?: string;
  naissance?: string;        // AAAA-MM-JJ
  heure?: string;            // HH:MM
  naissance_lieu?: Lieu;
  residence?: Lieu;
  courriel?: string;
};
export type Favori = { u: string; t: string };

const K = { profil: 'ap.profil', favoris: 'ap.favoris', langue: 'ap.langue' };

type Etat = {
  pret: boolean;
  profil: Profil;
  favoris: Favori[];
  langue: Langue;
  setProfil: (p: Profil) => Promise<void>;
  fusionnerProfil: (p: Profil) => Promise<void>;
  setFavoris: (f: Favori[]) => Promise<void>;
  setLangue: (l: Langue) => Promise<void>;
  effacer: () => Promise<void>;
};

const Ctx = createContext<Etat | null>(null);

function nettoyer(p: unknown): Profil {
  if (!p || typeof p !== 'object') return {};
  const x = p as Record<string, unknown>;
  const out: Profil = {};
  if (typeof x.prenom === 'string') out.prenom = x.prenom.slice(0, 40);
  if (typeof x.naissance === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.naissance)) out.naissance = x.naissance;
  if (typeof x.heure === 'string' && /^\d{2}:\d{2}/.test(x.heure)) out.heure = x.heure.slice(0, 5);
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

function nettoyerFavoris(f: unknown): Favori[] {
  if (!Array.isArray(f)) return [];
  return f.filter((x) => x && typeof x.u === 'string').map((x) => ({ u: String(x.u), t: String(x.t || x.u) })).slice(0, 200);
}

export function ProfilProvider({ children }: { children: React.ReactNode }) {
  const [pret, setPret] = useState(false);
  const [profil, setProfilEtat] = useState<Profil>({});
  const [favoris, setFavorisEtat] = useState<Favori[]>([]);
  const [langue, setLangueEtat] = useState<Langue>('en');

  useEffect(() => {
    (async () => {
      try {
        const [p, f, l] = await AsyncStorage.multiGet([K.profil, K.favoris, K.langue]);
        setProfilEtat(nettoyer(p[1] ? JSON.parse(p[1]) : {}));
        setFavorisEtat(nettoyerFavoris(f[1] ? JSON.parse(f[1]) : []));
        const lg = l[1] && estLangue(l[1]) ? l[1] : langueAppareil(getLocales().map((x) => x.languageTag));
        setLangueEtat(lg);
      } catch {
        setLangueEtat(langueAppareil(getLocales().map((x) => x.languageTag)));
      } finally {
        setPret(true);
      }
    })();
  }, []);

  const setProfil = useCallback(async (p: Profil) => {
    const n = nettoyer(p);
    setProfilEtat(n);
    await AsyncStorage.setItem(K.profil, JSON.stringify(n));
  }, []);
  const fusionnerProfil = useCallback(async (p: Profil) => {
    const n = nettoyer(p);
    let resultat: Profil = {};
    setProfilEtat((ancien) => {
      resultat = { ...ancien, ...n };
      return resultat;
    });
    await AsyncStorage.setItem(K.profil, JSON.stringify(resultat));
  }, []);
  const setFavoris = useCallback(async (f: Favori[]) => {
    const n = nettoyerFavoris(f);
    setFavorisEtat(n);
    await AsyncStorage.setItem(K.favoris, JSON.stringify(n));
  }, []);
  const setLangue = useCallback(async (l: Langue) => {
    setLangueEtat(l);
    await AsyncStorage.setItem(K.langue, l);
  }, []);
  const effacer = useCallback(async () => {
    setProfilEtat({}); setFavorisEtat([]);
    await AsyncStorage.multiRemove([K.profil, K.favoris]);
  }, []);

  const valeur = useMemo<Etat>(() => ({ pret, profil, favoris, langue, setProfil, fusionnerProfil, setFavoris, setLangue, effacer }),
    [pret, profil, favoris, langue, setProfil, fusionnerProfil, setFavoris, setLangue, effacer]);
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
  if (p.naissance) out.naissance = p.naissance;
  if (p.heure) out.heure = p.heure;
  if (p.naissance_lieu) out.naissance_lieu = p.naissance_lieu;
  if (p.residence) out.residence = p.residence;
  return out;
}
