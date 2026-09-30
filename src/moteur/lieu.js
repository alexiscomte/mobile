// Copie générée par outils/gen/app_moteurs.py depuis affection/assets/js/lieu.js — NE PAS MODIFIER ICI (modifier le site).
const w = {};
/* AffectionPlus — choix d'un lieu (pays, ville) a partir des fichiers assets/data,
   et estimation du decalage horaire (heure legale standard + heure d'ete) a une date.
   Les fichiers de villes sont charges pays par pays, seulement quand on en a besoin. */
(function (w) {
  "use strict";
  var APP = w.APP = w.APP || { list: [], byCode: {}, set: function (l) { this.list = l; for (var i = 0; i < l.length; i++) this.byCode[l[i][0]] = l[i]; this.ready = true; if (this._cb) { var c = this._cb; this._cb = []; c.forEach(function (f) { f(); }); } }, _cb: [] };
  var APV = w.APV = w.APV || { data: {}, _cb: {}, set: function (code, rows) { this.data[code] = rows; var c = this._cb[code] || []; this._cb[code] = []; c.forEach(function (f) { f(rows); }); } };

  function script(src, onerr) {
    var s = document.createElement("script"); s.src = src; s.async = true;
    if (onerr) s.onerror = onerr;
    document.head.appendChild(s);
  }
  function ready(up, cb) {
    if (APP.ready) return cb();
    APP._cb.push(cb);
    if (!APP._loading) { APP._loading = true; script(up + "assets/data/pays.js"); }
  }
  function villes(up, code, cb) {
    if (APV.data[code]) return cb(APV.data[code]);
    (APV._cb[code] = APV._cb[code] || []).push(cb);
    if (!APV["_l_" + code]) {
      APV["_l_" + code] = true;
      script(up + "assets/data/villes/" + code.toLowerCase() + ".js", function () { APV.set(code, []); });
    }
  }
  function plain(s) { return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() : s.toLowerCase(); }

  /* ---- fuseaux : decalage standard par pays, ou par longitude pour les grands pays ---- */
  var STD = {
    FR: 1, BE: 1, CH: 1, LU: 1, MC: 1, DE: 1, AT: 1, IT: 1, ES: 1, NL: 1, LI: 1, PL: 1, CZ: 1, SK: 1, HU: 1, SI: 1, HR: 1, RS: 1, BA: 1, ME: 1, MK: 1, AL: 1, XK: 1,
    DK: 1, SE: 1, NO: 1, MT: 1, AD: 1, SM: 1, VA: 1, GI: 1, GB: 0, IE: 0, PT: 0, IS: 0, FO: 0, GG: 0, GR: 2, FI: 2, EE: 2, LV: 2, LT: 2, RO: 2, BG: 2, UA: 2, MD: 2, CY: 2,
    TR: 3, BY: 3, GE: 4, AM: 4, AZ: 4, IL: 2, LB: 2, JO: 3, SY: 3, IQ: 3, SA: 3, KW: 3, BH: 3, QA: 3, AE: 4, OM: 4, YE: 3, IR: 3.5, AF: 4.5, PK: 5, IN: 5.5, LK: 5.5, NP: 5.75,
    BD: 6, BT: 6, MM: 6.5, TH: 7, VN: 7, KH: 7, LA: 7, MY: 8, SG: 8, BN: 8, PH: 8, CN: 8, HK: 8, MO: 8, TW: 8, KR: 9, KP: 9, JP: 9, NZ: 12, PG: 10, FJ: 12, TL: 9,
    MA: 1, DZ: 1, TN: 1, LY: 2, EG: 2, SD: 2, SS: 2, ET: 3, ER: 3, DJ: 3, SO: 3, KE: 3, UG: 3, TZ: 3, RW: 2, BI: 2, CG: 1, GA: 1, CM: 1, CF: 1, TD: 1, NG: 1, NE: 1, BJ: 1,
    TG: 0, GH: 0, CI: 0, BF: 0, ML: 0, SN: 0, GM: 0, GN: 0, GW: 0, SL: 0, LR: 0, MR: 0, EH: 1, CV: -1, ST: 0, GQ: 1, AO: 1, ZM: 2, ZW: 2, MW: 2, MZ: 2, BW: 2, NA: 2,
    ZA: 2, LS: 2, SZ: 2, MG: 3, MU: 4, RE: 4, SC: 4, KM: 3, YT: 3, GT: -6, BZ: -6, HN: -6, SV: -6, NI: -6, CR: -6, PA: -5, CU: -5, JM: -5, HT: -5, DO: -4, PR: -4,
    BS: -5, BB: -4, TT: -4, GD: -4, LC: -4, VC: -4, AG: -4, KN: -4, DM: -4, GP: -4, MQ: -4, GF: -3, SR: -3, GY: -4, VE: -4, CO: -5, EC: -5, PE: -5, BO: -4, PY: -4,
    UY: -3, AR: -3, CL: -4, PM: -3, PF: -10, NC: 11, KZ: 5, UZ: 5, TM: 5, TJ: 5, KG: 6, MN: 8
  };
  function std(code, lat, lon, y) {
    if (code === "US") { if (lat > 51) return -9; if (lon < -140) return -10; return lon > -85 ? -5 : lon > -102 ? -6 : lon > -115 ? -7 : -8; }
    if (code === "CA") { return lon > -57 ? -3.5 : lon > -68 ? -4 : lon > -90 ? -5 : lon > -102 ? -6 : lon > -117 ? -7 : -8; }
    if (code === "MX") { return lon > -105 ? -6 : lon > -114 ? -7 : -8; }
    if (code === "BR") { return lon < -66 ? -5 : lon < -52 ? -4 : -3; }
    if (code === "AU") { return lon < 129 ? 8 : lon < 141 ? 9.5 : 10; }
    if (code === "ID") { return lon < 115 ? 7 : lon < 127 ? 8 : 9; }
    if (code === "CD") { return lon < 23 ? 1 : 2; }
    if (code === "RU") { var z = Math.round(lon / 15); return Math.max(2, Math.min(12, z)); }
    if (code === "MA") return y >= 2019 ? 1 : 0;
    if (code === "SG" || code === "MY") return y >= 1982 ? 8 : 7.5;
    if (STD.hasOwnProperty(code)) return STD[code];
    return Math.round(lon / 15 * 2) / 2;
  }
  /* n-ieme dimanche : n=-1 dernier */
  function nthSunday(y, m, n) { /* m 1-12 ; renvoie jour du mois */
    if (n > 0) { var d = new Date(Date.UTC(y, m - 1, 1)); var off = (7 - d.getUTCDay()) % 7; return 1 + off + (n - 1) * 7; }
    var last = new Date(Date.UTC(y, m, 0)); return last.getUTCDate() - last.getUTCDay();
  }
  function between(y, m, d, m1, d1, m2, d2) { /* date locale [m1/d1, m2/d2) */
    var x = m * 100 + d, a = m1 * 100 + d1, b = m2 * 100 + d2;
    return a < b ? (x >= a && x < b) : (x >= a || x < b);
  }
  /* heure d'ete probable a une date (regles simplifiees mais datees) */
  function dst(code, lat, lon, y, m, d) {
    var EU = ["FR", "BE", "CH", "LU", "MC", "DE", "AT", "IT", "ES", "NL", "LI", "PL", "CZ", "SK", "HU", "SI", "HR", "RS", "BA", "ME", "MK", "AL", "XK", "DK", "SE", "NO", "MT", "AD", "SM", "VA", "GI", "GB", "IE", "PT", "GG", "GR", "FI", "EE", "LV", "LT", "RO", "BG", "UA", "MD", "CY", "LB"];
    if (EU.indexOf(code) >= 0) {
      var debut = { FR: 1976, BE: 1977, NL: 1977, LU: 1977, DE: 1980, AT: 1980, CH: 1981, IT: 1966, ES: 1974, PT: 1977, GB: 1916, IE: 1916, DK: 1980, SE: 1980, NO: 1980, FI: 1981, GR: 1975, PL: 1977, LI: 1981, MC: 1976 }[code] || 1981;
      if (y < debut) return false;
      if (y >= 1996) return between(y, m, d, 3, nthSunday(y, 3, -1), 10, nthSunday(y, 10, -1));
      if (code === "GB" || code === "IE") return between(y, m, d, 3, nthSunday(y, 3, -1), 10, nthSunday(y, 10, -1));
      return between(y, m, d, 3, nthSunday(y, 3, -1), 9, nthSunday(y, 9, -1));
    }
    if (code === "US" || code === "CA") {
      if (code === "US" && ((lon < -109 && lon > -115 && lat < 37 && lat > 31) || lat < 23)) return false; /* Arizona, Hawai */
      if (code === "CA" && lon < -102 && lon > -110 && lat < 60 && lat > 49) return false; /* Saskatchewan */
      if (y >= 2007) return between(y, m, d, 3, nthSunday(y, 3, 2), 11, nthSunday(y, 11, 1));
      if (y >= 1987) return between(y, m, d, 4, nthSunday(y, 4, 1), 10, nthSunday(y, 10, -1));
      if (y >= 1967) return between(y, m, d, 4, nthSunday(y, 4, -1), 10, nthSunday(y, 10, -1));
      return false;
    }
    if (code === "AU") {
      if (lon < 129) return false; /* Australie-Occidentale */
      if (lon < 141 && lat > -26) return false; /* Territoire du Nord */
      if (lon >= 138 && lat > -29) return false; /* Queensland */
      if (y < 1972) return false;
      if (y >= 2008) return between(y, m, d, 10, nthSunday(y, 10, 1), 4, nthSunday(y, 4, 1));
      return between(y, m, d, 10, nthSunday(y, 10, -1), 3, nthSunday(y, 3, -1));
    }
    if (code === "NZ") {
      if (y < 1975) return false;
      if (y >= 2007) return between(y, m, d, 9, nthSunday(y, 9, -1), 4, nthSunday(y, 4, 1));
      return between(y, m, d, 10, nthSunday(y, 10, 1), 3, nthSunday(y, 3, 3));
    }
    if (code === "IL") { if (y < 1985) return false; return between(y, m, d, 3, nthSunday(y, 3, -1) - 2, 10, nthSunday(y, 10, -1)); }
    if (code === "CL") { if (y < 1970) return false; return !between(y, m, d, 4, 7, 9, 7); }
    if (code === "PY") { return !between(y, m, d, 3, 24, 10, 1); }
    if (code === "MX") { if (y < 1996 || y > 2022) return false; return between(y, m, d, 4, nthSunday(y, 4, 1), 10, nthSunday(y, 10, -1)); }
    if (code === "BR") { if (y < 1985 || y > 2018 || lat > -15) return false; return !between(y, m, d, 2, 20, 10, 20); }
    return false;
  }
  function fuseau(code, lat, lon, y, m, d) {
    var s = std(code, lat, lon, y), e = dst(code, lat, lon, y, m, d);
    return { std: s, dst: e, total: s + (e ? 1 : 0) };
  }

  /* ---- composant : pays + ville (+ saisie manuelle lat/lon) ---- */
  var TXT = {
    fr: { pays: "Pays de naissance", ville: "Ville de naissance", aide: "Tapez les premières lettres, puis choisissez dans la liste.", aucune: "Aucune ville trouvée dans notre base pour ce pays : prenez la ville la plus proche, ou entrez les coordonnées.", manuel: "Entrer les coordonnées à la main", lat: "Latitude", lon: "Longitude", choisir: "— choisir —", chargement: "Chargement des villes…", source: "Villes : base propre complétée par GeoNames (CC BY 4.0) — toutes les villes de 1 000 habitants et plus, préfectures, sous-préfectures et chefs-lieux administratifs de chaque pays. Une ville manque ? Prenez la plus proche, ou entrez ses coordonnées." },
    en: { pays: "Country of birth", ville: "Town of birth", aide: "Type the first letters, then pick from the list.", aucune: "No town found in our database for this country: pick the nearest one, or enter coordinates.", manuel: "Enter coordinates by hand", lat: "Latitude", lon: "Longitude", choisir: "— choose —", chargement: "Loading towns…", source: "Towns: own database completed with GeoNames (CC BY 4.0) — every town of 1,000 people and more, plus county seats and administrative centres of each country. Missing town? Pick the nearest one, or enter its coordinates." },
    de: { pays: "Geburtsland", ville: "Geburtsort", aide: "Erste Buchstaben eingeben, dann aus der Liste wählen.", aucune: "Kein Ort in unserer Datenbank für dieses Land: nächstgelegenen Ort wählen oder Koordinaten eingeben.", manuel: "Koordinaten von Hand eingeben", lat: "Breitengrad", lon: "Längengrad", choisir: "— wählen —", chargement: "Orte werden geladen…", source: "Orte: eigene Datenbank, ergänzt durch GeoNames (CC BY 4.0) — alle Orte ab 1 000 Einwohnern sowie die Verwaltungssitze jedes Landes. Ort fehlt? Nächstgelegenen wählen oder Koordinaten eingeben." },
    es: { pays: "País de nacimiento", ville: "Ciudad de nacimiento", aide: "Escriba las primeras letras y elija en la lista.", aucune: "Ninguna ciudad encontrada en nuestra base para este país: elija la más cercana o introduzca las coordenadas.", manuel: "Introducir las coordenadas a mano", lat: "Latitud", lon: "Longitud", choisir: "— elegir —", chargement: "Cargando ciudades…", source: "Ciudades: base propia completada con GeoNames (CC BY 4.0) — todas las localidades de 1 000 habitantes o más, y las cabeceras administrativas de cada país. ¿Falta una ciudad? Elija la más cercana o introduzca sus coordenadas." },
    it: { pays: "Paese di nascita", ville: "Città di nascita", aide: "Digitate le prime lettere, poi scegliete nell’elenco.", aucune: "Nessuna città trovata nella nostra base per questo paese: scegliete la più vicina o inserite le coordinate.", manuel: "Inserire le coordinate a mano", lat: "Latitudine", lon: "Longitudine", choisir: "— scegliere —", chargement: "Caricamento delle città…", source: "Città: base propria completata con GeoNames (CC BY 4.0) — tutte le località di 1 000 abitanti e più, e i capoluoghi amministrativi di ogni paese. Manca una città? Scegliete la più vicina o inserite le sue coordinate." },
    pt: { pays: "País de nascimento", ville: "Cidade de nascimento", aide: "Escreva as primeiras letras e escolha na lista.", aucune: "Nenhuma cidade encontrada na nossa base para este país: escolha a mais próxima ou introduza as coordenadas.", manuel: "Introduzir as coordenadas à mão", lat: "Latitude", lon: "Longitude", choisir: "— escolher —", chargement: "A carregar as cidades…", source: "Cidades: base própria completada com GeoNames (CC BY 4.0) — todas as localidades de 1 000 habitantes ou mais, e as sedes administrativas de cada país. Falta uma cidade? Escolha a mais próxima ou introduza as suas coordenadas." },
    nl: { pays: "Geboorteland", ville: "Geboorteplaats", aide: "Typ de eerste letters en kies uit de lijst.", aucune: "Geen plaats gevonden in onze database voor dit land: kies de dichtstbijzijnde of voer de coördinaten in.", manuel: "Coördinaten met de hand invoeren", lat: "Breedtegraad", lon: "Lengtegraad", choisir: "— kiezen —", chargement: "Plaatsen worden geladen…", source: "Plaatsen: eigen database aangevuld met GeoNames (CC BY 4.0) — alle plaatsen van 1 000 inwoners en meer, en de bestuurlijke hoofdplaatsen van elk land. Ontbreekt een plaats? Kies de dichtstbijzijnde of voer de coördinaten in." },
    pl: { pays: "Kraj urodzenia", ville: "Miejsce urodzenia", aide: "Wpisz pierwsze litery i wybierz z listy.", aucune: "Brak miejscowości w naszej bazie dla tego kraju: wybierz najbliższą albo wpisz współrzędne.", manuel: "Wpisać współrzędne ręcznie", lat: "Szerokość geograficzna", lon: "Długość geograficzna", choisir: "— wybierz —", chargement: "Ładowanie miejscowości…", source: "Miejscowości: własna baza uzupełniona o GeoNames (CC BY 4.0) — wszystkie miejscowości od 1 000 mieszkańców i stolice administracyjne każdego kraju. Brakuje miejscowości? Wybierz najbliższą albo wpisz współrzędne." },
    tr: { pays: "Doğum ülkesi", ville: "Doğum yeri", aide: "İlk harfleri yazın ve listeden seçin.", aucune: "Bu ülke için veri tabanımızda yer bulunamadı: en yakınını seçin ya da koordinatları girin.", manuel: "Koordinatları elle girmek", lat: "Enlem", lon: "Boylam", choisir: "— seçin —", chargement: "Yerler yükleniyor…", source: "Yerler: GeoNames (CC BY 4.0) ile tamamlanmış kendi veri tabanımız — 1 000 ve üzeri nüfuslu bütün yerler ve her ülkenin idari merkezleri. Bir yer eksik mi? En yakınını seçin ya da koordinatları girin." },
  };
  function mount(el, o) {
    var lang = o.lang || "fr", up = o.up || "", t = TXT[lang] || TXT.fr, id = o.id || "lieu";
    var RES = { fr: ["Pays", "Ville"], en: ["Country", "Town"], de: ["Land", "Ort"], es: ["País", "Ciudad"], it: ["Paese", "Città"], pt: ["País", "Cidade"], nl: ["Land", "Plaats"], pl: ["Kraj", "Miejscowość"], tr: ["Ülke", "Şehir"] };
    var COURT = { fr: "Premières lettres…", en: "First letters…", de: "Erste Buchstaben…", es: "Primeras letras…", it: "Prime lettere…", pt: "Primeiras letras…", nl: "Eerste letters…", pl: "Pierwsze litery…", tr: "İlk harfler…" };
    var lab = o.labels || ((o.residence || o.court) ? { pays: (RES[lang] || RES.fr)[0], ville: (RES[lang] || RES.fr)[1] } : { pays: t.pays, ville: t.ville });
    el.innerHTML =
      '<div class="lieu">' +
      '<div class="lieu-row"><label for="' + id + '-pays">' + lab.pays + '</label><select id="' + id + '-pays"><option value="">' + t.choisir + '</option></select></div>' +
      /* la ville, les coordonnees et la source n'apparaissent qu'une fois le pays choisi */
      '<div class="lieu-row lieu-suite" hidden><label for="' + id + '-ville">' + lab.ville + '</label><input type="text" id="' + id + '-ville" autocomplete="off" placeholder="' + (COURT[lang] || COURT.fr) + '" title="' + t.aide + '" disabled></div>' +
      '<div class="lieu-liste" id="' + id + '-liste" hidden></div>' +
      '<p class="lieu-info lieu-suite" id="' + id + '-info" hidden></p>' +
      '<details class="lieu-manuel lieu-suite" hidden><summary>' + t.manuel + '</summary><label for="' + id + '-lat">' + t.lat + '</label><input type="number" step="0.001" min="-90" max="90" id="' + id + '-lat">' +
      '<label for="' + id + '-lon">' + t.lon + '</label><input type="number" step="0.001" min="-180" max="180" id="' + id + '-lon"></details>' +
      '<p class="lieu-source lieu-suite" hidden>' + t.source + '</p></div>';
    var sel = el.querySelector("#" + id + "-pays"), inp = el.querySelector("#" + id + "-ville"), liste = el.querySelector("#" + id + "-liste"),
        info = el.querySelector("#" + id + "-info"), latI = el.querySelector("#" + id + "-lat"), lonI = el.querySelector("#" + id + "-lon"),
        suite = el.querySelectorAll(".lieu-suite");
    function montrerSuite(oui) { for (var i = 0; i < suite.length; i++) suite[i].hidden = !oui; }
    var state = { code: "", ville: null, lat: null, lon: null };
    var col = { fr: 1, en: 2, de: 3, es: 7, it: 8, pt: 9, nl: 10, pl: 11, tr: 12 }[lang] || 1;
    function nomP(p) { return p[col] || p[1]; }
    function setCoord(lat, lon, nom) {
      state.lat = lat; state.lon = lon; state.ville = nom;
      latI.value = lat; lonI.value = lon;
      if (o.onChange) o.onChange(state);
    }
    sel.addEventListener("change", function () {
      state.code = sel.value; inp.value = ""; liste.hidden = true; state.ville = null;
      montrerSuite(!!state.code);
      if (!state.code) { inp.disabled = true; state.lat = null; state.lon = null; latI.value = ""; lonI.value = ""; info.textContent = ""; if (o.onChange) o.onChange(state); return; }
      inp.disabled = true; info.textContent = t.chargement;
      villes(up, state.code, function (rows) {
        inp.disabled = false; info.textContent = rows.length ? "" : t.aucune;
        var p = APP.byCode[state.code];
        if (p && !rows.length) setCoord(p[4], p[5], null);
        if (o.onCountry) o.onCountry(state.code);
        inp.focus();
      });
    });
    inp.addEventListener("input", function () {
      var q = plain(inp.value.trim()), rows = APV.data[state.code] || [];
      if (q.length < 1) { liste.hidden = true; return; }
      var hits = [];
      for (var i = 0; i < rows.length && hits.length < 12; i++) {
        var n = plain(rows[i][0]);
        if (n.indexOf(q) === 0 || (rows[i][4] && String(rows[i][4]).indexOf(q) === 0) || (rows[i][5] && ("|" + plain(rows[i][5])).indexOf("|" + q) >= 0)) hits.push(rows[i]);
      }
      if (hits.length < 12) for (var k = 0; k < rows.length && hits.length < 12; k++) {
        if (hits.indexOf(rows[k]) < 0 && plain(rows[k][0]).indexOf(q) > 0) hits.push(rows[k]);
      }
      liste.innerHTML = "";
      hits.forEach(function (r) {
        var b = document.createElement("button"); b.type = "button";
        var alt0 = r[5] ? String(r[5]).split("|")[0] : "";
        b.textContent = r[0] + (alt0 ? " / " + alt0 : "") + (r[4] ? " (" + r[4] + ")" : "") + (r[3] ? " · " + r[3].toLocaleString(lang) : "");
        b.addEventListener("click", function () { inp.value = r[0]; liste.hidden = true; setCoord(r[1], r[2], r[0]); });
        liste.appendChild(b);
      });
      liste.hidden = !hits.length;
    });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); var b = liste.querySelector("button"); if (b && !liste.hidden) b.click(); } });
    document.addEventListener("click", function (e) { if (!el.contains(e.target)) liste.hidden = true; });
    function manuel() { var la = parseFloat(latI.value), lo = parseFloat(lonI.value); if (!isNaN(la) && !isNaN(lo)) { state.lat = la; state.lon = lo; state.ville = null; if (o.onChange) o.onChange(state); } }
    latI.addEventListener("change", manuel); lonI.addEventListener("change", manuel);
    ready(up, function () {
      var l = APP.list.slice().sort(function (a, b) { return plain(nomP(a)).localeCompare(plain(nomP(b))); });
      var first = o.premiers || [];
      first.forEach(function (c) { var p = APP.byCode[c]; if (p) sel.appendChild(new Option(nomP(p), p[0])); });
      if (first.length) sel.appendChild(new Option("──────────", "")).disabled = true;
      l.forEach(function (p) { sel.appendChild(new Option(nomP(p), p[0])); });
      if (o.code) { sel.value = o.code; sel.dispatchEvent(new Event("change")); }
    });
    return { state: state, fuseau: function (y, m, d) { return fuseau(state.code || "", state.lat || 0, state.lon || 0, y, m, d); }, nom: function () { var p = APP.byCode[state.code]; return (state.ville ? state.ville + ", " : "") + (p ? nomP(p) : ""); } };
  }

  w.LIEU = { mount: mount, fuseau: fuseau, std: std, dst: dst, ready: ready, villes: villes, plain: plain };
})(w);
export const LIEU = w.LIEU;
