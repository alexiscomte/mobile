// Tests de compatibilité enregistrés (06/10/2026), même clé et même forme que le site (assets/js/compat.js, mes_compat.js) :
// AsyncStorage « ap.compat » = [{ id, m, lg, p1, p2, s, r, z, c }] ; un test supprimé reste 180 jours comme { id, m, x: 1 } pour que la
// suppression gagne sur les autres appareils (fusion par id, la version la plus récente gagne : fusionnerCompat, comme le serveur).
import AsyncStorage from '@react-native-async-storage/async-storage';

export const K_CT = 'ap.compat';
export type PersonneTest = {
  n: string; d: string; h?: string; g?: string; pays?: string; ville?: string; lat?: number; lon?: number;
  fam?: string; bpays?: string; bville?: string; blat?: number; blon?: number;   // nom de famille, lieu de naissance (06/10/2026)
};
export type TestCompat = {
  id: string; m: string; x?: number; lg?: string; p1?: PersonneTest; p2?: PersonneTest;
  s?: number | null; r?: Record<string, number>; z?: [number, number] | null; c?: [number, number] | null;
};

const plat = (s: string) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '');
/** Même couple = mêmes prénoms et mêmes dates, dans un ordre ou dans l'autre (cleTest de compat.js). */
export function cleTest(t: TestCompat): string {
  const a = plat(t.p1?.n || '') + '|' + (t.p1?.d || ''), b = plat(t.p2?.n || '') + '|' + (t.p2?.d || '');
  return [a, b].sort().join('#');
}

export function fusionnerCompat(a: unknown, b: unknown): TestCompat[] {
  const par = new Map<string, TestCompat>();
  for (const t of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])] as TestCompat[]) {
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !t.id) continue;
    const x = par.get(t.id);
    if (!x || String(t.m || '') > String(x.m || '')) par.set(t.id, t);
  }
  const limite = new Date(Date.now() - 180 * 86400000).toISOString();
  return Array.from(par.values()).filter((t) => !t.x || String(t.m || '') > limite)
    .sort((p, q) => String(q.m || '').localeCompare(String(p.m || ''))).slice(0, 100);
}

export async function lireTests(): Promise<TestCompat[]> {
  try { const a = JSON.parse((await AsyncStorage.getItem(K_CT)) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}
/** Les tests visibles (non supprimés). */
export async function testsVisibles(): Promise<TestCompat[]> {
  return (await lireTests()).filter((t) => t && !t.x && t.p1 && t.p2);
}
async function garder(a: TestCompat[]): Promise<boolean> {
  try { await AsyncStorage.setItem(K_CT, JSON.stringify(a.slice(0, 100))); return true; } catch { return false; }
}
/** Enregistre un test ; le même couple déjà enregistré est mis à jour (même id). */
export async function enregistrerTest(t: Omit<TestCompat, 'id' | 'm'>): Promise<boolean> {
  const a = await lireTests(), k = cleTest(t as TestCompat);
  const i = a.findIndex((x) => x && !x.x && x.p1 && cleTest(x) === k);
  const id = i >= 0 ? a[i].id : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  if (i >= 0) a.splice(i, 1);
  a.unshift({ ...t, id, m: new Date().toISOString() });
  return garder(a);
}
export async function supprimerTest(id: string): Promise<void> {
  await garder((await lireTests()).map((x) => (x && x.id === id ? { id, m: new Date().toISOString(), x: 1 } : x)));
}
export async function testParId(id: string): Promise<TestCompat | null> {
  return (await testsVisibles()).find((t) => t.id === id) || null;
}
