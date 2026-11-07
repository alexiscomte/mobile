import React from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

// La même carte, ses filtres et la grille ; aucun achat web dans cette vue.
export function CitiesArticle({ country, lang }: { country: string; lang: string }) {
  if (!/^(?:[A-Z]{2}|CA-QC)$/.test(country) || !/^[a-z]{2}$/.test(lang)) return null;
  const uri = 'https://affectionplus.com/assets/cities/embed.html?country=' + country + '&lang=' + lang;
  return <View style={{ height: 980, marginVertical: 12 }}><WebView source={{ uri }}
    style={{ flex: 1 }} originWhitelist={['https://affectionplus.com']}
    onShouldStartLoadWithRequest={(r) => r.url === uri || r.url === 'about:blank'}
    sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} /></View>;
}
