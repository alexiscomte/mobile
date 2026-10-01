// Plan d'entraînement callisthénique : même bibliothèque, mêmes règles et mêmes calculs que le site (assets/js/callisthenie.js,
// source outils/gen/callisthenie.js) ; textes du site (outils_txt.json, clé callisthenie, 9 langues). Garder les deux moteurs identiques.
import type { Langue } from '../i18n';
import outils from './outils_txt.json';

export type Question = { t: string; o: Record<string, string> };
export type TextesCal = {
  lang: string;
  ui: Record<string, string>;
  q: Record<string, Question> & { corps: { t: string; sexe: string; f: string; h: string; x: string; age: string; taille: string; poids: string; aide: string } };
  cat: Record<string, string>;
  ex: Record<string, [string, string]>;
  jours: string[];
  niv_nom: Record<string, string>;
  obj_nom: Record<string, string>;
  plan: Record<string, string> & { titres: Record<string, string>; ech: string[]; sem: string[]; gene: Record<string, string>; conseils: string[] };
  nut: Record<string, string> & { kcal_detail: Record<string, string>; assiette: Record<string, string>; sources: Record<string, string>; repas: string[]; menus: Record<string, string[]>; portions: Record<string, string>; sommeil: Record<string, string> };
  avert: string;
};
const TXT = (outils as unknown as { callisthenie: Record<string, TextesCal> }).callisthenie;
export const textesCal = (lg: Langue): TextesCal => TXT[lg] || TXT.en || TXT.fr;

export type Reponses = { obj?: string; niv?: string; freq?: string; duree?: string; mat?: string; gene?: string; duo?: string; regime?: string; sommeil?: string; sexe?: string; age?: number; taille?: number; poids?: number };
export const QS = ['obj', 'niv', 'freq', 'duree', 'mat', 'gene', 'duo', 'corps', 'regime', 'sommeil'] as const;

type Ex = [string, number, number, 'r' | 's', string, number?];
const EX: Record<string, Ex> = {
  push_mur: ['push', 1, 0, 'r', ''], push_incl: ['push', 2, 0, 'r', ''], push_genoux: ['push', 2, 0, 'r', 'poignets'],
  push_poings: ['push', 3, 0, 'r', ''], push: ['push', 3, 0, 'r', 'poignets'], push_decl: ['push', 4, 0, 'r', 'poignets'],
  push_diamant: ['push', 4, 0, 'r', 'poignets'], push_archer: ['push', 5, 0, 'r', 'poignets'], push_pseudo: ['push', 5, 0, 'r', 'poignets dos'],
  dips_chaise: ['push', 2, 0, 'r', 'dos'], dips: ['push', 4, 2, 'r', 'dos'], pike: ['push', 3, 0, 'r', 'dos poignets'], hs_mur: ['push', 5, 0, 's', 'dos poignets'],
  row_serviette: ['pull', 1, 0, 'r', ''], row_table: ['pull', 2, 0, 'r', ''], row_table_pieds: ['pull', 3, 0, 'r', ''], superman: ['pull', 1, 0, 's', 'dos'],
  row_barre: ['pull', 2, 1, 'r', ''], hang: ['pull', 1, 1, 's', ''], scap_pull: ['pull', 2, 1, 'r', ''], neg_pull: ['pull', 3, 1, 'r', ''],
  pull_assist: ['pull', 3, 1, 'r', ''], pull: ['pull', 4, 1, 'r', ''], chin: ['pull', 4, 1, 'r', ''], pull_archer: ['pull', 5, 1, 'r', ''], row_anneaux: ['pull', 3, 2, 'r', ''],
  squat_chaise: ['legs', 1, 0, 'r', ''], squat: ['legs', 2, 0, 'r', ''], squat_tempo: ['legs', 3, 0, 'r', ''], fente_arr: ['legs', 2, 0, 'r', ''],
  bulgare: ['legs', 4, 0, 'r', 'genoux'], pistol_box: ['legs', 4, 0, 'r', 'genoux'], pistol: ['legs', 5, 0, 'r', 'genoux'], pont: ['legs', 1, 0, 'r', ''],
  pont_uni: ['legs', 3, 0, 'r', ''], mollets: ['legs', 1, 0, 'r', ''], chaise_mur: ['legs', 2, 0, 's', ''], step_up: ['legs', 2, 0, 'r', ''],
  nordic: ['legs', 5, 0, 'r', 'genoux'], squat_saut: ['legs', 4, 0, 'r', 'genoux'], sdt_uni: ['legs', 3, 0, 'r', 'dos'],
  dead_bug: ['core', 1, 0, 'r', ''], bird_dog: ['core', 1, 0, 'r', 'poignets'], planche_genoux: ['core', 1, 0, 's', ''], planche: ['core', 2, 0, 's', ''],
  planche_laterale: ['core', 2, 0, 's', ''], planche_bras: ['core', 3, 0, 's', ''], hollow: ['core', 3, 0, 's', 'dos'], releve_jambes_sol: ['core', 3, 0, 'r', 'dos'],
  releve_genoux_barre: ['core', 3, 1, 'r', ''], releve_jambes_barre: ['core', 4, 1, 'r', 'dos'], lsit: ['core', 4, 2, 's', 'poignets'], v_up: ['core', 4, 0, 'r', 'dos'],
  mountain: ['core', 2, 0, 's', 'poignets'],
  marche_rapide: ['cardio', 1, 0, 's', ''], step_jacks: ['cardio', 1, 0, 's', ''], shadow_boxe: ['cardio', 2, 0, 's', ''], jumping: ['cardio', 2, 0, 's', 'genoux'],
  montees_genoux: ['cardio', 3, 0, 's', 'genoux'], burpees_sans_saut: ['cardio', 3, 0, 's', 'poignets'], burpees: ['cardio', 4, 0, 's', 'genoux poignets'],
  corde: ['cardio', 3, 0, 's', 'genoux'], skaters: ['cardio', 3, 0, 's', 'genoux'],
  chat_vache: ['mob', 1, 0, 's', 'poignets'], figure4: ['mob', 1, 0, 's', ''], ischio: ['mob', 1, 0, 's', ''], mollets_etir: ['mob', 1, 0, 's', ''],
  epaules_mur: ['mob', 1, 0, 's', ''], fente_hanche: ['mob', 1, 0, 's', 'genoux'], rotation_thor: ['mob', 1, 0, 's', 'poignets'], sphinx: ['mob', 2, 0, 's', ''],
  chien_tete: ['mob', 2, 0, 's', 'poignets'], pigeon: ['mob', 2, 0, 's', 'genoux'], squat_profond: ['mob', 2, 0, 's', 'genoux'], enfant: ['mob', 1, 0, 's', 'genoux'],
  quatre_vingt_dix: ['mob', 2, 0, 's', 'genoux'], pec_porte: ['mob', 1, 0, 's', ''],
  duo_planche_tape: ['core', 2, 0, 's', 'poignets', 1], duo_push_tape: ['push', 3, 0, 'r', 'poignets', 1], duo_squat_dos: ['legs', 2, 0, 'r', '', 1],
  duo_tirage_serviette: ['pull', 2, 0, 'r', '', 1], duo_pull_assist: ['pull', 3, 1, 'r', '', 1], duo_sit_up: ['core', 2, 0, 'r', 'dos', 1],
  duo_brouette: ['core', 4, 0, 's', 'poignets dos', 1], duo_chaise: ['legs', 2, 0, 's', '', 1], duo_course: ['cardio', 2, 0, 's', '', 1], duo_ischio: ['mob', 1, 0, 's', '', 1],
};
const CHAINES = [['push_mur', 'push_incl', 'push_genoux', 'push', 'push_decl', 'push_diamant', 'push_archer'], ['push_incl', 'push_poings'],
  ['hang', 'scap_pull', 'neg_pull', 'pull_assist', 'pull', 'chin', 'pull_archer'], ['row_serviette', 'row_table', 'row_table_pieds'],
  ['squat_chaise', 'squat', 'squat_tempo', 'bulgare', 'pistol_box', 'pistol'], ['planche_genoux', 'planche', 'planche_bras', 'hollow'],
  ['dips_chaise', 'dips'], ['pont', 'pont_uni'], ['releve_genoux_barre', 'releve_jambes_barre'], ['step_jacks', 'jumping', 'burpees']];
const DUO_ORDRE = ['push', 'core', 'legs', 'pull', 'cardio', 'mob'];
const NIV_MAX: Record<string, number> = { debutant: 2, inter: 3, avance: 5 };
const MAT: Record<string, number> = { rien: 0, barre: 1, parc: 2 };
const JOURS: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };
const N_EX: Record<string, number> = { 15: 4, 25: 5, 40: 6, 60: 7 };
const SERIES: Record<string, number> = { 15: 2, 25: 3, 40: 3, 60: 4 };
const FINISHER: Record<string, number> = { 15: 4, 25: 6, 40: 8, 60: 10 };
const TEMPLATES: Record<string, string[]> = {
  full: ['legs', 'push', 'pull', 'core', 'legs', 'x', 'push'], haut: ['push', 'pull', 'push', 'pull', 'core', 'x', 'core'],
  bas: ['legs', 'legs', 'legs', 'core', 'legs', 'x', 'mob'], push: ['push', 'push', 'core', 'push', 'x', 'core', 'push'],
  pull: ['pull', 'pull', 'core', 'pull', 'x', 'pull', 'core'], legs: ['legs', 'legs', 'legs', 'core', 'legs', 'x', 'mob'],
  core_cardio: ['core', 'cardio', 'core', 'cardio', 'core', 'mob', 'cardio'], mob: ['mob', 'mob', 'legs', 'mob', 'core', 'mob', 'push'],
};
const REPS: Record<string, Record<string, string>> = {
  perdre: { debutant: '12-15', inter: '12-15', avance: '15-20' }, muscle: { debutant: '8-12', inter: '6-10', avance: '5-8' },
  forme: { debutant: '10-15', inter: '10-15', avance: '12-15' }, mobilite: { debutant: '8-12', inter: '8-12', avance: '8-12' },
};
const SEC: Record<string, string> = { perdre: '40', muscle: '30-45', forme: '30-40', mobilite: '30-45' };
const SEULEMENT: Record<string, string> = { push_poings: 'poignets' };

export const dp = (T: TextesCal) => (T.lang === 'fr' ? ' : ' : ': ');
export const fmt = (s: string, args: (string | number)[]) => { let i = 0; return String(s).replace(/%[sd]/g, () => String(args[i++])); };
export const nom = (T: TextesCal, id: string) => (T.ex[id] ? T.ex[id][0] : id);
export const consigne = (T: TextesCal, id: string) => (T.ex[id] ? T.ex[id][1] : '');

function eligible(id: string, r: Reponses): boolean {
  const e = EX[id];
  if (SEULEMENT[id] && r.gene !== SEULEMENT[id]) return false;
  return e[2] <= MAT[r.mat!] && (r.gene === 'aucun' || e[4].indexOf(r.gene!) < 0);
}
function candidats(cat: string, r: Reponses, duo: boolean, tous = false): string[] {
  const max = NIV_MAX[r.niv!]; const out: string[] = [];
  for (const id of Object.keys(EX)) {
    const e = EX[id];
    if (e[0] !== cat || !!e[5] !== duo || !eligible(id, r) || e[1] > max) continue;
    out.push(id);
  }
  out.sort((a, b) => EX[b][1] - EX[a][1] || (a < b ? -1 : 1));
  if (!out.length || duo || tous) return out;
  const top = EX[out[0]][1];
  return out.filter((id) => EX[id][1] >= top - 1);
}
function choisir(cat: string, r: Reponses, s: number, k: number, pris: string[]): string | null {
  for (const c of [candidats(cat, r, false), candidats(cat, r, false, true)]) {
    for (let i = 0; i < c.length; i++) { const id = c[(s + k + i) % c.length]; if (pris.indexOf(id) < 0) return id; }
  }
  return null;
}
function categorieX(tpl: string, r: Reponses, s: number): string {
  if (r.obj === 'perdre' || r.obj === 'forme') return 'cardio';
  if (r.obj === 'mobilite') return 'mob';
  if (tpl === 'bas' || tpl === 'legs') return 'legs';
  if (tpl === 'push' || tpl === 'pull') return tpl;
  if (tpl === 'core_cardio') return 'core';
  return s % 2 ? 'pull' : 'push';
}
function templates(r: Reponses): string[] {
  const f = parseInt(r.freq!, 10);
  if (f === 2) return ['full', 'full'];
  if (f === 3) return ['full', 'full', 'full'];
  if (f === 4) return ['haut', 'bas', 'haut', 'bas'];
  return ['push', 'pull', 'legs', 'core_cardio', r.obj === 'mobilite' ? 'mob' : 'full'];
}
function suivant(id: string, r: Reponses): string | null {
  for (const ch of CHAINES) {
    const p = ch.indexOf(id);
    if (p >= 0) { for (let j = p + 1; j < ch.length; j++) { if (eligible(ch[j], r)) return ch[j]; } }
  }
  return null;
}

export type Exo = { id: string; duo: boolean; charge: string; series: number };
export type Seance = { jour: string; titre: string; exos: Exo[]; series: number; circuit: boolean; fin: { n: number; id: string } | null; retour: string[] };
export type Plan = { seances: Seance[]; prog: [string, string][]; circuit: boolean };

export function plan(r: Reponses, T: TextesCal): Plan {
  const tpl = templates(r), n = N_EX[r.duree!];
  const series = SERIES[r.duree!] + (r.niv === 'avance' && parseInt(r.duree!, 10) >= 40 ? 1 : 0);
  const circuit = r.obj === 'perdre' || (r.obj === 'forme' && parseInt(r.duree!, 10) <= 25);
  const jours = JOURS[parseInt(r.freq!, 10)], seances: Seance[] = [], prog: [string, string][] = [], vus: Record<string, 1> = {};
  const mobs = candidats('mob', r, false).concat(['figure4', 'ischio', 'mollets_etir', 'epaules_mur', 'pec_porte'].filter((id) => eligible(id, r)));
  for (let s = 0; s < tpl.length; s++) {
    let slots = TEMPLATES[tpl[s]].slice(0, n);
    if (r.obj === 'mobilite' && tpl[s] !== 'mob') slots = ['mob'].concat(slots.slice(0, n - 1));
    const pris: string[] = []; const exos: { id: string; cat: string; duo: boolean }[] = [];
    for (let k = 0; k < slots.length; k++) {
      let cat = slots[k];
      if (cat === 'x') cat = categorieX(tpl[s], r, s);
      const id = choisir(cat, r, s, k, pris);
      if (!id) continue;
      pris.push(id); exos.push({ id, cat, duo: false });
    }
    if (r.duo === 'duo') {
      for (let d = 0; d < DUO_ORDRE.length; d++) {
        const dc = DUO_ORDRE[(s + d) % DUO_ORDRE.length], cands = candidats(dc, r, true);
        let pos = -1;
        for (let q = exos.length - 1; q >= 0; q--) { if (exos[q].cat === dc) { pos = q; break; } }
        if (pos >= 0 && cands.length) { exos[pos] = { id: cands[s % cands.length], cat: dc, duo: true }; break; }
      }
    }
    const lignes: Exo[] = [];
    for (const e of exos) {
      const ex = EX[e.id];
      const charge = ex[3] === 's' ? (ex[0] === 'mob' ? '30-45' : SEC[r.obj!]) + ' ' + T.ui.s : REPS[r.obj!][r.niv!] + ' ' + T.ui.reps;
      lignes.push({ id: e.id, duo: e.duo, charge, series: ex[0] === 'mob' ? Math.min(2, series) : series });
      if (!e.duo && !vus[e.id]) { const sv = suivant(e.id, r); if (sv) prog.push([e.id, sv]); vus[e.id] = 1; }
    }
    let fin: Seance['fin'] = null;
    if ((r.obj === 'perdre' || r.obj === 'forme') && tpl[s] !== 'core_cardio') {
      const cc = candidats('cardio', r, false);
      if (cc.length) fin = { n: FINISHER[r.duree!], id: cc[s % cc.length] };
    }
    const retour: string[] = [];
    for (let m = 0; m < 3 && mobs.length; m++) { const mid = mobs[(s + m) % mobs.length]; if (retour.indexOf(mid) < 0) retour.push(mid); }
    seances.push({ jour: T.jours[jours[s]], titre: T.plan.titres[tpl[s]], exos: lignes, series, circuit, fin, retour });
  }
  return { seances, prog, circuit };
}

export type Nutrition = { regime: string; sommeil: string; bande: string; kcal: number | null; cible?: number; prot?: number; gkg_txt?: string; eau?: [string, string] };

export function nutrition(r: Reponses, T: TextesCal): Nutrition {
  const o: Nutrition = { regime: r.regime!, sommeil: r.sommeil!, bande: 'moyen', kcal: null };
  const p = Number(r.poids), t = Number(r.taille), a = Number(r.age);
  if (r.sexe && p && t && a) {
    const bmr = 10 * p + 6.25 * t - 5 * a + (r.sexe === 'h' ? 5 : r.sexe === 'f' ? -161 : -78);
    const af = ({ 2: 1.4, 3: 1.5, 4: 1.6, 5: 1.7 } as Record<number, number>)[parseInt(r.freq!, 10)] + (parseInt(r.duree!, 10) >= 40 ? 0.05 : 0);
    const dep = bmr * af; let cible = dep;
    if (r.obj === 'perdre') cible = Math.max(dep - 400, r.sexe === 'f' ? 1400 : 1600);
    if (r.obj === 'muscle') cible = dep + 250;
    const gkg = ({ perdre: 2, muscle: 1.8, forme: 1.6, mobilite: 1.4 } as Record<string, number>)[r.obj!];
    const dec = T.ui.dec || ',';
    o.kcal = Math.round(dep / 50) * 50; o.cible = Math.round(cible / 50) * 50;
    o.prot = Math.min(Math.round(p * gkg), 200); o.gkg_txt = String(gkg).replace('.', dec);
    o.eau = [(p * 0.03).toFixed(1).replace('.', dec), (p * 0.035).toFixed(1).replace('.', dec)];
    o.bande = o.cible < 1800 ? 'bas' : o.cible < 2400 ? 'moyen' : 'haut';
  }
  return o;
}

/** Texte du repos d'une séance (clé de TX.plan). */
export const reposCle = (circuit: boolean, obj: string) => (circuit ? 'repos_circuit' : obj === 'muscle' ? 'repos_muscle' : obj === 'mobilite' ? 'repos_mob' : 'repos_forme');
