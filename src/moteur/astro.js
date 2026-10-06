// Copie générée par outils/gen/app_moteurs.py depuis affection/assets/js/astro.js — NE PAS MODIFIER ICI (modifier le site).
const w = {};
/* AffectionPlus — moteur astronomique leger (positions tropicales), sans dependance.
   Precision : Soleil ~0,01 deg, Lune ~0,05 deg, planetes ~1 deg (elements kepleriens
   approximatifs 1800-2050), ascendant/MC a la minute d'heure pres. Suffisant pour
   les signes et les degres affiches ; ce n'est pas un logiciel d'ephemerides. */
(function (w) {
  "use strict";
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function norm(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function sin(d) { return Math.sin(d * D2R); }
  function cos(d) { return Math.cos(d * D2R); }

  /* jour julien pour une date/heure en temps universel */
  function jd(y, m, d, h) {
    h = h || 0;
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + h / 24;
  }
  function jdFromDate(dt) { return dt.getTime() / 86400000 + 2440587.5; }
  function jdToDate(j) { return new Date((j - 2440587.5) * 86400000); }
  function T(j) { return (j - 2451545.0) / 36525; }

  function obliquity(j) {
    var t = T(j);
    return 23.4392911 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
  }
  function gmst(j) {
    var t = T(j);
    return norm(280.46061837 + 360.98564736629 * (j - 2451545.0) + 0.000387933 * t * t - t * t * t / 38710000);
  }

  /* Soleil : longitude apparente (Meeus ch. 25) */
  function sunLon(j) {
    var t = T(j);
    var L0 = norm(280.46646 + 36000.76983 * t + 0.0003032 * t * t);
    var M = norm(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
    var C = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(M) + (0.019993 - 0.000101 * t) * sin(2 * M) + 0.000289 * sin(3 * M);
    var om = 125.04 - 1934.136 * t;
    return norm(L0 + C - 0.00569 - 0.00478 * sin(om));
  }

  /* Lune : longitude (Meeus ch. 47, termes principaux) */
  var LT = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116],
    [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758],
    [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
    [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
    [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036], [2, 0, 2, 0, 3994],
    [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
    [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048],
    [2, 0, 1, -2, -1773], [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
    [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
    [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537], [4, -1, 0, 0, 520], [1, 0, -2, 0, -487],
    [2, 1, 0, -2, -399], [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330],
    [2, -1, 2, 0, 327], [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294]
  ];
  function moonLon(j) {
    var t = T(j);
    var Lp = norm(218.3164477 + 481267.88123421 * t - 0.0015786 * t * t + t * t * t / 538841 - t * t * t * t / 65194000);
    var D = norm(297.8501921 + 445267.1114034 * t - 0.0018819 * t * t + t * t * t / 545868 - t * t * t * t / 113065000);
    var M = norm(357.5291092 + 35999.0502909 * t - 0.0001536 * t * t + t * t * t / 24490000);
    var Mp = norm(134.9633964 + 477198.8675055 * t + 0.0087414 * t * t + t * t * t / 69699 - t * t * t * t / 14712000);
    var F = norm(93.2720950 + 483202.0175233 * t - 0.0036539 * t * t - t * t * t / 3526000 + t * t * t * t / 863310000);
    var E = 1 - 0.002516 * t - 0.0000074 * t * t;
    var s = 0;
    for (var i = 0; i < LT.length; i++) {
      var r = LT[i], c = r[4];
      if (r[1] === 1 || r[1] === -1) c *= E;
      if (r[1] === 2 || r[1] === -2) c *= E * E;
      s += c * sin(r[0] * D + r[1] * M + r[2] * Mp + r[3] * F);
    }
    var A1 = 119.75 + 131.849 * t, A2 = 53.09 + 479264.290 * t;
    s += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
    return norm(Lp + s / 1e6);
  }

  /* Planetes : elements kepleriens approximatifs (Standish, 1800-2050), ecliptique J2000 */
  var EL = {
    mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794],
    uranus:  [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, -0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589],
    neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664],
    pluto:   [39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684, -0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]
  };
  function helio(name, j) {
    var e = EL[name], t = T(j);
    var a = e[0] + e[6] * t, ec = e[1] + e[7] * t, I = e[2] + e[8] * t, L = e[3] + e[9] * t, wb = e[4] + e[10] * t, O = e[5] + e[11] * t;
    var om = wb - O, M = L - wb;
    M = ((M + 180) % 360 + 360) % 360 - 180;
    var Ed = M + (ec * R2D) * sin(M), dE;
    for (var k = 0; k < 30; k++) {
      var dM = M - (Ed - (ec * R2D) * sin(Ed));
      dE = dM / (1 - ec * cos(Ed));
      Ed += dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    var xp = a * (cos(Ed) - ec), yp = a * Math.sqrt(1 - ec * ec) * sin(Ed);
    var cw = cos(om), sw = sin(om), cO = cos(O), sO = sin(O), cI = cos(I), sI = sin(I);
    return {
      x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      z: (sw * sI) * xp + (cw * sI) * yp
    };
  }
  function planetLon(name, j) {
    var p = helio(name, j), e = helio("earth", j);
    var lon = Math.atan2(p.y - e.y, p.x - e.x) * R2D;
    return norm(lon + 1.3969713 * T(j)); /* precession : ecliptique J2000 -> ecliptique de la date */
  }
  function retrograde(name, j) {
    var a = planetLon(name, j - 0.5), b = planetLon(name, j + 0.5);
    var d = ((b - a + 540) % 360) - 180;
    return d < 0;
  }

  /* ascendant et milieu du ciel (lon est positif vers l'est) */
  function angles(j, lat, lon) {
    var eps = obliquity(j), ramc = norm(gmst(j) + lon);
    var asc = norm(Math.atan2(cos(ramc), -(sin(ramc) * cos(eps) + Math.tan(lat * D2R) * sin(eps))) * R2D);
    var mc = norm(Math.atan2(sin(ramc), cos(ramc) * cos(eps)) * R2D);
    return { asc: asc, mc: mc, ramc: ramc, eps: eps };
  }

  function sign(lon) { return Math.floor(norm(lon) / 30); }
  function degIn(lon) { return norm(lon) % 30; }
  function fmtDeg(lon) {
    var d = degIn(lon), g = Math.floor(d), m = Math.floor((d - g) * 60);
    return g + "°" + (m < 10 ? "0" : "") + m + "'";
  }
  function house(lon, asc) { return Math.floor(norm(lon - asc) / 30) + 1; }

  /* phases de la Lune */
  function phase(j) {
    var d = norm(moonLon(j) - sunLon(j));
    var illum = (1 - cos(d)) / 2;
    var idx = Math.floor(((d + 22.5) % 360) / 45);
    return { angle: d, illum: illum, idx: idx, waxing: d < 180 };
  }
  function nextPhase(j, target) {
    var jj = j, step = 1;
    function f(x) { return ((moonLon(x) - sunLon(x) - target) % 360 + 540) % 360 - 180; }
    var prev = f(jj);
    for (var k = 0; k < 40; k++) {
      jj += step; var cur = f(jj);
      if (prev < 0 && cur >= 0 && cur - prev < 180) {
        var lo = jj - step, hi = jj;
        for (var q = 0; q < 30; q++) { var mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
        return (lo + hi) / 2;
      }
      prev = cur;
    }
    return null;
  }

  /* signe chinois : nouvel an = nouvelle lune entre le 21 janvier et le 20 fevrier (heure de Pekin) */
  function chineseNewYear(y) {
    var j0 = jd(y, 1, 20, 16); /* 21 janvier 0h a Pekin = 20 janvier 16h UT */
    var nm = nextPhase(j0 - 1, 0);
    if (nm === null) return jd(y, 2, 4, 0);
    return Math.floor(nm + 8 / 24 + 0.5) - 0.5; /* minuit, date locale chinoise */
  }
  function chinese(y, m, d) {
    var j = jd(y, m, d, 12), cy = y;
    if (j < chineseNewYear(y)) cy = y - 1;
    return { year: cy, animal: ((cy - 4) % 12 + 12) % 12, element: Math.floor((((cy - 4) % 10) + 10) % 10 / 2), yang: ((cy - 4) % 2 + 2) % 2 === 0 };
  }

  var ASPECTS = [[0, 8, "conj"], [180, 8, "opp"], [120, 6, "tri"], [90, 6, "sq"], [60, 4, "sex"]];
  function aspect(a, b) {
    var d = Math.abs(((a - b) % 360 + 540) % 360 - 180);   /* separation 0..180 (06/10/2026 : « d = 180 - d » inversait conjonction/opposition et sextile/trigone) */
    for (var i = 0; i < ASPECTS.length; i++) {
      var orb = Math.abs(d - ASPECTS[i][0]);
      if (orb <= ASPECTS[i][1]) return { type: ASPECTS[i][2], orb: orb, exact: ASPECTS[i][0] };
    }
    return null;
  }

  var PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"];
  function chart(j, lat, lon) {
    var out = { jd: j, planets: {}, order: PLANETS.slice() };
    out.planets.sun = { lon: sunLon(j), retro: false };
    out.planets.moon = { lon: moonLon(j), retro: false };
    for (var i = 2; i < PLANETS.length; i++) {
      out.planets[PLANETS[i]] = { lon: planetLon(PLANETS[i], j), retro: retrograde(PLANETS[i], j) };
    }
    if (typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon)) {
      var an = angles(j, lat, lon);
      out.asc = an.asc; out.mc = an.mc;
      for (var k in out.planets) out.planets[k].house = house(out.planets[k].lon, an.asc);
    }
    out.aspects = [];
    for (var a = 0; a < PLANETS.length; a++) for (var b = a + 1; b < PLANETS.length; b++) {
      var asp = aspect(out.planets[PLANETS[a]].lon, out.planets[PLANETS[b]].lon);
      if (asp) out.aspects.push({ a: PLANETS[a], b: PLANETS[b], type: asp.type, orb: asp.orb });
    }
    return out;
  }

  w.ASTRO = { jd: jd, jdFromDate: jdFromDate, jdToDate: jdToDate, sunLon: sunLon, moonLon: moonLon, planetLon: planetLon,
    retrograde: retrograde, angles: angles, sign: sign, degIn: degIn, fmtDeg: fmtDeg, house: house, phase: phase,
    nextPhase: nextPhase, chineseNewYear: chineseNewYear, chinese: chinese, aspect: aspect, chart: chart,
    obliquity: obliquity, gmst: gmst, norm: norm, PLANETS: PLANETS };
})(w);
export const ASTRO = w.ASTRO;
