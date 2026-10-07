// Protection anti-robot invisible de l'appli (07/10/2026 nuit, cahier specs/anti-robot-0710.md), comme assets/js/robot.js du site :
// GET api/robot/defi -> { algorithm, challenge, maxnumber, salt, signature } (défi signé par le serveur, valable 10 min) ; l'appli cherche
// le nombre n tel que SHA-256(salt + n) = challenge (15 000 essais en moyenne), par lots de 50 empreintes calculées en natif (expo-crypto),
// puis joint à l'envoi le champ `altcha` = base64(JSON { algorithm, challenge, number, salt, signature }). Une preuve ne sert qu'une fois.
// Envoi concerné dans l'appli : l'inscription à la lettre sans compte (lettre.ts). compte.ts n'envoie plus de demande de code (la connexion
// par code n'est plus proposée) ; « Créer un compte » et « Mot de passe oublié » se font sur les écrans du service commun, ouverts dans la
// session web de l'appli, dont le script calcule lui-même la preuve.
// Textes d'échec : ui.json « robot » (textes de robot.js du site, exportés par app_moteurs.py).
import * as Crypto from 'expo-crypto';

import { SITE } from './site';

export type Defi = { algorithm: string; challenge: string; maxnumber: number; salt: string; signature: string };
export type ErreurRobot = 'reseau' | 'trop' | 'calcul';
const LOT = 50;                        // empreintes demandées ensemble (comme le site)
const AGE_MAX = 8 * 60 * 1000;         // une preuve préparée plus vieille que 8 min est recalculée (le défi vaut 10 min)
const DELAI_MS = 15000;

function octets(s: string): Uint8Array<ArrayBuffer> {        // ArrayBuffer (pas Shared…) : type BufferSource attendu par digest
  const u = new Uint8Array(new ArrayBuffer(s.length));
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
  return u;
}
function hexOctets(h: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/.test(h)) return null;
  const u = new Uint8Array(32);
  for (let i = 0; i < 32; i++) u[i] = parseInt(h.substr(i * 2, 2), 16);
  return u;
}
function pareil(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** base64 d'une chaîne ASCII (la preuve n'a que des caractères ASCII), sans dépendre de btoa. */
export function base64(s: string): string {
  let o = '';
  for (let i = 0; i < s.length; i += 3) {
    const a = s.charCodeAt(i) & 255;
    const b = i + 1 < s.length ? s.charCodeAt(i + 1) & 255 : -1;
    const c = i + 2 < s.length ? s.charCodeAt(i + 2) & 255 : -1;
    const n = (a << 16) | ((b < 0 ? 0 : b) << 8) | (c < 0 ? 0 : c);
    o += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (b < 0 ? '=' : B64[(n >> 6) & 63]) + (c < 0 ? '=' : B64[n & 63]);
  }
  return o;
}

/** Nombre n tel que SHA-256(salt + n) = challenge, cherché de 0 à maxnumber par lots (empreintes natives). */
export async function chercher(d: Defi): Promise<number> {
  const cible = hexOctets(String(d.challenge || ''));
  const sel = String(d.salt || '');
  const max = Math.min(Math.max(Math.floor(Number(d.maxnumber) || 0), 0), 2000000);
  if (!cible || d.algorithm !== 'SHA-256' || !/^[!-~]+$/.test(sel)) throw new Error('calcul');
  for (let n = 0; n <= max; n += LOT) {
    const fin = Math.min(n + LOT, max + 1);
    const lot: Promise<ArrayBuffer>[] = [];
    for (let i = n; i < fin; i++) lot.push(Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, octets(sel + i)));
    const h = await Promise.all(lot);
    for (let k = 0; k < h.length; k++) if (pareil(new Uint8Array(h[k]), cible)) return n + k;
  }
  throw new Error('calcul');
}

async function obtenirDefi(): Promise<Defi> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const minuterie = ctrl ? setTimeout(() => ctrl.abort(), DELAI_MS) : null;
  try {
    const r = await fetch(SITE + 'api/robot/defi', { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined } as RequestInit);
    if (r.status === 429) throw new Error('trop');
    if (r.status !== 200) throw new Error('reseau');
    const j = (await r.json()) as Defi;
    if (!j || typeof j.challenge !== 'string' || typeof j.salt !== 'string') throw new Error('reseau');
    return j;
  } catch (e) {
    throw e instanceof Error && e.message === 'trop' ? e : new Error('reseau');
  } finally {
    if (minuterie) clearTimeout(minuterie);
  }
}

type Resultat = { altcha?: string; erreur?: ErreurRobot };
async function calculer(): Promise<Resultat> {
  let d: Defi;
  try { d = await obtenirDefi(); } catch (e) { return { erreur: (e as Error).message === 'trop' ? 'trop' : 'reseau' }; }
  try {
    const n = await chercher(d);
    return { altcha: base64(JSON.stringify({ algorithm: 'SHA-256', challenge: d.challenge, number: n, salt: d.salt, signature: d.signature })) };
  } catch {
    return { erreur: 'calcul' };
  }
}

let prete: { p: Promise<Resultat>; t: number } | null = null;
/** Calcul d'avance (écran du formulaire affiché) : la preuve sera prête quand on enverra. */
export function preparerRobot(): void {
  if (!prete || Date.now() - prete.t > AGE_MAX) prete = { p: calculer(), t: Date.now() };
}
/** Preuve pour UN envoi (celle préparée si elle est récente et réussie), ou l'erreur ; le prochain envoi en calculera une autre. */
export async function preuveRobot(): Promise<Resultat> {
  const x = prete && Date.now() - prete.t <= AGE_MAX ? prete : null;
  prete = null;
  if (x) {
    const r = await x.p;
    if (r.altcha) return r;
  }
  return calculer();
}
