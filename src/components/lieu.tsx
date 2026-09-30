// Choix d'un lieu : pays (liste du site) puis ville (villes du pays lues sur le site), avec suggestions — même rôle que lieu.js.
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Champ, F } from '@/components/form';
import type { Langue } from '@/i18n';
import { chercherPays, chercherVille, listePays, villes, type PaysInfo, type Ville } from '@/moteur/lieux';

export type LieuChoisi = { code: string; nomPays: string; lat: number; lon: number; ville: string | null };

type Props = { langue: Langue; valeur: LieuChoisi | null; onChange: (l: LieuChoisi | null) => void; labelPays: string; labelVille: string };

export function ChoixLieu({ langue, valeur, onChange, labelPays, labelVille }: Props) {
  const PAYS = useMemo(() => listePays(langue), [langue]);
  const [pays, setPays] = useState<PaysInfo | null>(() => (valeur ? PAYS.find((p) => p.code === valeur.code) || null : null));
  const [qPays, setQPays] = useState(pays ? pays.nom : '');
  const [qVille, setQVille] = useState(valeur && valeur.ville ? valeur.ville : '');
  const [villeOk, setVilleOk] = useState(!!(valeur && valeur.ville));
  const [liste, setListe] = useState<Ville[]>([]);

  useEffect(() => {
    let actif = true;
    setListe([]);
    if (pays) villes(pays.code).then((l) => { if (actif) setListe(l); }, () => {});
    return () => { actif = false; };
  }, [pays]);
  const sugPays = useMemo(() => (pays && qPays === pays.nom ? [] : chercherPays(PAYS, qPays)), [PAYS, qPays, pays]);
  const sugVille = useMemo(() => (villeOk ? [] : chercherVille(liste, qVille)), [liste, qVille, villeOk]);

  const choisirPays = (p: PaysInfo) => { setPays(p); setQPays(p.nom); setQVille(''); setVilleOk(false); onChange({ code: p.code, nomPays: p.nom, lat: p.lat, lon: p.lon, ville: null }); };
  const choisirVille = (v: Ville) => { if (!pays) return; setQVille(v.nom); setVilleOk(true); onChange({ code: pays.code, nomPays: pays.nom, lat: v.lat, lon: v.lon, ville: v.nom }); };

  return (
    <View>
      <Champ label={labelPays} value={qPays} onChangeText={(v) => { setQPays(v); setPays(null); setQVille(''); setVilleOk(false); onChange(null); }} autoCorrect={false} />
      {sugPays.length ? (
        <View style={F.suggestions}>
          {sugPays.map((p) => <Pressable key={p.code} style={F.suggestion} onPress={() => choisirPays(p)}><Text style={F.suggestionTxt}>{p.nom}</Text></Pressable>)}
        </View>
      ) : null}
      <Champ label={labelVille} value={qVille} onChangeText={(v) => { setQVille(v); if (villeOk && pays) { setVilleOk(false); onChange({ code: pays.code, nomPays: pays.nom, lat: pays.lat, lon: pays.lon, ville: null }); } }} editable={!!pays} autoCorrect={false} />
      {sugVille.length ? (
        <View style={F.suggestions}>
          {sugVille.map((v) => (
            <Pressable key={v.nom + v.lat} style={F.suggestion} onPress={() => choisirVille(v)}>
              <Text style={F.suggestionTxt}>{v.nom}{v.cp ? ' (' + v.cp + ')' : ''}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
