// Champs de formulaire communs des outils natifs : libellé, texte, date, heure (avec « heure inconnue »), boutons, notes.
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COULEURS } from '@/theme';

export const pad = (n: number) => (n < 10 ? '0' : '') + n;
export const isoDate = (d: Date) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const isoHeure = (d: Date) => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const NATIF = Platform.OS !== 'web';
/** Remplace %s, %d, %1, %2… par les valeurs, dans l'ordre. */
export const fmt = (s: string, ...v: (string | number)[]) => {
  let i = 0;
  return String(s).replace(/%(\d)|%[sd]/g, (_m, k) => String((k ? v[+k - 1] : v[i++]) ?? ''));
};

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={F.label}>{children}</Text>;
}

export function Champ({ label, ...props }: { label?: string } & TextInputProps) {
  return (
    <>
      {label ? <Label>{label}</Label> : null}
      <TextInput style={F.entree} placeholderTextColor={COULEURS.texteMuet} {...props} />
    </>
  );
}

export function ChampDate({ label, value, onChange, langue, max, min }: { label?: string; value: string; onChange: (iso: string) => void; langue: string; max?: Date; min?: Date }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3], 12) : new Date(1990, 0, 1, 12);
  return (
    <>
      {label ? <Label>{label}</Label> : null}
      {NATIF ? (
        <DateTimePicker value={d} mode="date" display="compact" locale={langue} maximumDate={max} minimumDate={min || new Date(1900, 0, 1)}
          onChange={(_e, x) => { if (x) onChange(isoDate(x)); }} style={F.picker} />
      ) : (
        <TextInput style={F.entree} value={value} onChangeText={onChange} placeholder="AAAA-MM-JJ" placeholderTextColor={COULEURS.texteMuet} />
      )}
    </>
  );
}

export function ChampHeure({ label, inconnue, value, onChange, langue }: { label: string; inconnue: string; value: string; onChange: (h: string) => void; langue: string }) {
  const [connue, setConnue] = useState(!!value);
  const m = /^(\d{2}):(\d{2})/.exec(value);
  const d = new Date(2000, 0, 1, m ? +m[1] : 12, m ? +m[2] : 0);
  return (
    <>
      <View style={F.ligneOption}>
        <Label>{label}</Label>
        <View style={F.optionDroite}>
          <Text style={F.optionTxt}>{connue ? '' : inconnue}</Text>
          <Switch value={connue} onValueChange={(v) => { setConnue(v); if (!v) onChange(''); else if (!value) onChange('12:00'); }} trackColor={{ true: COULEURS.secondaire }} />
        </View>
      </View>
      {connue ? (NATIF ? (
        <DateTimePicker value={d} mode="time" display="compact" locale={langue} onChange={(_e, x) => { if (x) onChange(isoHeure(x)); }} style={F.picker} />
      ) : (
        <TextInput style={F.entree} value={value} onChangeText={onChange} placeholder="HH:MM" placeholderTextColor={COULEURS.texteMuet} />
      )) : null}
    </>
  );
}

export function Bouton({ titre, onPress, secondaire, disabled }: { titre: string; onPress: () => void; secondaire?: boolean; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [secondaire ? F.boutonSec : F.bouton, (pressed || disabled) && F.presse]}>
      <Text style={secondaire ? F.boutonSecTxt : F.boutonTxt}>{titre}</Text>
    </Pressable>
  );
}

export function Puce({ titre, actif, onPress }: { titre: string; actif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[F.puce, actif && F.puceActive]}>
      <Text style={[F.puceTxt, actif && F.puceTxtActive]}>{titre}</Text>
    </Pressable>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={F.note}>{children}</Text>;
}

export function Erreur({ children }: { children?: string }) {
  return children ? <Text style={F.erreur}>{children}</Text> : null;
}

/** Bandeau « renseignez votre date de naissance » avec le lien vers la fiche. */
export function Bandeau({ texte, lien, onPress }: { texte: string; lien?: string; onPress?: () => void }) {
  return (
    <View style={F.bandeau}>
      <Text style={F.bandeauTxt}>{texte}</Text>
      {lien && onPress ? <Pressable onPress={onPress}><Text style={F.bandeauLien}>{lien} →</Text></Pressable> : null}
    </View>
  );
}

export const F = StyleSheet.create({
  contenu: { padding: 16, paddingBottom: 40, backgroundColor: COULEURS.fond },
  label: { fontSize: 15, fontWeight: '600', color: COULEURS.texte, marginTop: 14, marginBottom: 6 },
  entree: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 17, color: COULEURS.texte },
  picker: { alignSelf: 'flex-start', marginLeft: -8 },
  ligneOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionDroite: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  optionTxt: { color: COULEURS.texteMuet },
  bouton: { backgroundColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 18 },
  boutonTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  boutonSec: { borderWidth: 1, borderColor: COULEURS.primaire, borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
  boutonSecTxt: { color: COULEURS.primaire, fontWeight: '600', fontSize: 15 },
  presse: { opacity: 0.7 },
  puce: { borderWidth: 1, borderColor: COULEURS.bordure, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  puceActive: { backgroundColor: COULEURS.primaire, borderColor: COULEURS.primaire },
  puceTxt: { color: COULEURS.texte, fontSize: 14 },
  puceTxtActive: { color: '#fff', fontWeight: '600' },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { color: COULEURS.texteMuet, fontSize: 12, marginTop: 8, lineHeight: 17 },
  erreur: { color: COULEURS.coeur, marginTop: 10 },
  bandeau: { backgroundColor: COULEURS.primaire, borderRadius: 12, padding: 14 },
  bandeauTxt: { color: '#fff', fontSize: 15 },
  bandeauLien: { color: '#fff', textDecorationLine: 'underline', marginTop: 8, fontWeight: '600' },
  h2: { fontSize: 20, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 20, marginBottom: 6 },
  h3: { fontSize: 16, fontWeight: '700', color: COULEURS.primaireFonce, marginTop: 12, marginBottom: 4 },
  texte: { fontSize: 15, lineHeight: 22, color: COULEURS.texte, marginBottom: 6 },
  gras: { fontWeight: '700' },
  muet: { color: COULEURS.texteMuet, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  lien: { color: COULEURS.primaire, textDecorationLine: 'underline', fontSize: 15, marginBottom: 6 },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  suggestions: { backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: COULEURS.bordure, borderRadius: 10, marginTop: 4, overflow: 'hidden' },
  suggestion: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COULEURS.bordure },
  suggestionTxt: { fontSize: 15, color: COULEURS.texte },
  encadre: { backgroundColor: COULEURS.fondDoux, borderRadius: 12, padding: 12, marginTop: 12 },
});
