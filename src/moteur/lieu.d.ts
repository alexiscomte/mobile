// Types du module des lieux du site (assets/js/lieu.js, copié par outils/gen/app_moteurs.py) : seule la partie fuseaux horaires sert à l'application.
export const LIEU: {
  /** Décalage horaire probable d'un lieu à une date : heure légale standard, heure d'été, total (heures). */
  fuseau(code: string, lat: number, lon: number, y: number, m: number, d: number): { std: number; dst: boolean; total: number };
  std(code: string, lat: number, lon: number, y: number): number;
  dst(code: string, lat: number, lon: number, y: number, m: number, d: number): boolean;
  plain(s: string): string;
};
