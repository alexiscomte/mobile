// Pages décrites en JSON (ticket #162) : p/<langue>.json, écrit par outils/gen/app_manifeste.py, embarqué et mis à jour comme le reste
// du contenu ; rendu par l'écran générique app/fiche.tsx. Que du texte et des adresses : jamais de code.
import { jsonEmbarque } from '../embarque';

export type Segment = { texte: string; u?: string };
export type Bloc =
  | { type: 'titre'; niveau: number; texte: string; id?: string }
  | { type: 'paragraphe'; segments: Segment[] }
  | { type: 'liste'; ordonnee?: boolean; elements: Segment[][] }
  | { type: 'tableau'; entetes?: string[]; lignes: string[][] }
  | { type: 'image'; src: string; alt?: string; legende?: string; ratio?: number };
export type PageJson = { u: string; titre: string; lead?: string; maj?: string; blocs: Bloc[] };
type PaquetPages = { format: number; pages: Record<string, PageJson> };

/** La page JSON `cle` dans la langue (version en service), ou null. */
export async function pageJson(lg: string, cle: string): Promise<PageJson | null> {
  const p = await jsonEmbarque<PaquetPages>('p/' + lg + '.json');
  const page = p && p.format === 1 && p.pages ? p.pages[cle] : undefined;
  return page && Array.isArray(page.blocs) ? page : null;
}

