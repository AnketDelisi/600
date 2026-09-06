// ===== AltıCiftSıfır — Config =====

const COUNTRIES = {

  sweden: {
    name: 'Sweden',
    seats: 349,
    threshold: 4.0,
    method: 'sainte_lague',       // modified Sainte-Laguë (divisor 1.2)
    seatBased: false,
    constituencies: true,
    parties: {
      S:  { name: 'Socialdemokraterna',       name_en: 'Social Democrats',  color: '#EE2020' },
      SD: { name: 'Sverigedemokraterna',       name_en: 'Sweden Democrats',  color: '#FFCD00' },
      M:  { name: 'Moderaterna',              name_en: 'Moderates',         color: '#52BDEC' },
      V:  { name: 'Vänsterpartiet',           name_en: 'Left Party',        color: '#DA291C' },
      C:  { name: 'Centerpartiet',            name_en: 'Centre Party',      color: '#009933' },
      KD: { name: 'Kristdemokraterna',         name_en: 'Christian Democrats', color: '#003087' },
      MP: { name: 'Miljöpartiet',             name_en: 'Green Party',       color: '#87C737' },
      L:  { name: 'Liberalerna',              name_en: 'Liberals',          color: '#006AB5' },
    },
    order: ['S', 'SD', 'M', 'V', 'C', 'KD', 'MP', 'L'],
    parlOrder: ['V', 'MP', 'S', 'C', 'L', 'M', 'KD', 'SD'],
    blocs: {
      bloc1: { name: 'Red-Green', short: 'RG', parties: ['S', 'V', 'MP', 'C'], color: '#EE2020' },
      bloc2: { name: 'Tidö',      short: 'TIDÖ', parties: ['M', 'SD', 'KD', 'L'], color: '#006AB5' },
    },
    lastElection: {
      date: '2022-09-11',
      results: { S: 30.33, SD: 20.54, M: 19.10, V: 6.75, C: 6.71, KD: 5.34, MP: 5.10, L: 4.61 },
      seats:   { S: 107, SD: 73, M: 68, V: 24, C: 24, KD: 19, MP: 18, L: 16 },
    },
    pollsterMAE: {
      Sifo:         { 2022: 0.73, 2018: 1.53, 2014: 1.36, overall: 1.21 },
      Novus:        { 2022: 1.04, 2018: 1.41, 2014: 1.36, overall: 1.27 },
      SKOP:         { 2022: 1.56, 2018: 1.57, 2014: 1.21, overall: 1.45 },
      Inizio:       { 2018: 1.06, overall: 1.06 },
      Demoskop:     { 2018: 0.97, 2014: 1.50, overall: 1.23 },
      "United Minds":{ 2014: 0.95, overall: 0.95 },
      YouGov:       { 2014: 1.24, overall: 1.24 },
      Sentio:       { 2014: 1.18, overall: 1.18 },
      Infostat:     { overall: 1.30 },
      Ipsos:        { overall: 1.30 },
    },
    logos: {
      S:  'img/S.svg', SD: 'img/SD.svg', M: 'img/M.svg', V: 'img/V.svg',
      C:  'img/C.svg', KD: 'img/KD.svg', MP: 'img/MP.svg', L: 'img/L.svg',
    },
  },

  israel: {
    name: 'Israel',
    seats: 120,
    threshold: 3.25,
    method: 'dhondt',             // D'Hondt (divisors 1,2,3,...)
    seatBased: true,             // polls report seat projections
    constituencies: false,        // single national district
    parties: {
      likud:     { code: 'LK', name: 'Likud',                    name_en: 'Likud',            color: '#00A0DF' },
      together:  { code: 'TG', name: 'Together',                 name_en: 'Together',         color: '#00A650' },
      rzp:       { code: 'RZP', name: 'Religious Zionist Party',  name_en: 'Religious Zionism', color: '#FDBB2E' },
      otzma:     { code: 'OTZ', name: 'Otzma Yehudit',            name_en: 'Otzma Yehudit',    color: '#E85D26' },
      blue_white:{ code: 'BW', name: 'Blue and White',           name_en: 'Blue and White',   color: '#0072CE' },
      shas:      { code: 'SHAS', name: 'Shas',                     name_en: 'Shas',             color: '#231F20' },
      reservists:{ code: 'RSV', name: 'The Reservists',           name_en: 'The Reservists',   color: '#009688' },
      amcha:     { code: 'AMC', name: 'Amcha Yisrael',            name_en: 'Amcha Yisrael',    color: '#FF7043' },
      utj:       { code: 'UTJ', name: 'United Torah Judaism',     name_en: 'United Torah Judaism', color: '#4A4A4A' },
      yb:        { code: 'YB', name: 'Yisrael Beiteinu',         name_en: 'Yisrael Beiteinu', color: '#1B6CA8' },
      raam:      { code: 'RAAM', name: "Ra'am",                    name_en: "Ra'am",            color: '#A67C00' },
      joint_list:{ code: 'JL', name: 'Joint List',               name_en: 'Joint List',       color: '#009A44' },
      dems:      { code: 'DEM', name: 'The Democrats',            name_en: 'The Democrats',    color: '#E30613' },
      yashar:    { code: 'YASH', name: 'Yashar',                   name_en: 'Yashar',           color: '#7B3FA0' },
    },
    order: ['likud', 'together', 'rzp', 'otzma', 'blue_white', 'shas', 'reservists', 'amcha', 'utj', 'yb', 'raam', 'joint_list', 'dems', 'yashar'],
    parlOrder: ['joint_list', 'raam', 'dems', 'together', 'yashar', 'blue_white', 'yb', 'reservists', 'amcha', 'utj', 'likud', 'otzma', 'shas', 'rzp'],
    blocs: {
      bloc1: { name: 'Coalition', short: 'GOV', parties: ['likud', 'rzp', 'otzma', 'shas', 'utj'], color: '#00A0DF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['together', 'yb', 'dems', 'yashar', 'blue_white', 'raam', 'joint_list'], color: '#E30613' },
    },
    lastElection: {
      date: '2022-11-01',
      results: {
        likud: 23.41, together: 17.79, rzp: 5.4, otzma: 4.6, blue_white: 9.08,
        shas: 8.25, utj: 5.88, yb: 4.48, raam: 4.07,
        joint_list: 3.75, dems: 3.69, yashar: 0, reservists: 0, amcha: 0,
      },
      seats: {
        likud: 32, together: 24, rzp: 8, otzma: 6, blue_white: 12,
        shas: 11, utj: 7, yb: 6, raam: 5,
        joint_list: 5, dems: 4, yashar: 0, reservists: 0, amcha: 0,
      },
    },
    pollsterMAE: {
      Kantar:           { 2022: 1.27, 2021: 1.54, 2019: 1.11, overall: 1.31 },
      "Midgam R&C":     { 2022: 1.27, 2021: 1.54, 2020: 1.00, 2019: 1.11, overall: 1.23 },
      "Direct Polls":   { 2022: 1.27, 2021: 1.08, 2020: 1.00, overall: 1.12 },
      "Maagar Mochot":  { 2022: 1.45, 2021: 1.83, 2020: 1.25, 2019: 0.89, overall: 1.35 },
      "Midgam Project": { 2020: 1.00, 2019: 1.11, overall: 1.06 },
      Smith:            { 2022: 1.09, 2021: 1.54, 2020: 0.75, 2019: 0.89, overall: 1.07 },
      "Panels Politics":{ 2022: 1.09, 2021: 1.54, 2020: 1.00, 2019: 1.78, overall: 1.35 },
      "Camil Fuchs":    { 2022: 1.82, 2021: 1.54, overall: 1.68 },
      "Shvakim Panorama":{ 2019: 1.11, overall: 1.11 },
      Lazar:            { overall: 1.25 },
      "Yossi Tatika":   { overall: 1.25 },
      Filber:           { overall: 1.25 },
    },
    logos: {
      likud: 'img/il/Likud.svg', together: 'img/il/Together.svg', rzp: 'img/il/RZP.svg',
      otzma: 'img/il/Otzma.svg', blue_white: 'img/il/BW.svg', shas: 'img/il/Shas.svg',
      utj: 'img/il/UTJ.svg', yb: 'img/il/YisraelBeiteinu.svg', raam: 'img/il/Raam.svg',
      joint_list: 'img/il/JointList.svg', dems: 'img/il/Dems.svg', yashar: 'img/il/Yashar.svg',
    },
  },
saxony_anhalt: {
    name: 'Saxony-Anhalt',
    seats: 83,
    threshold: 5.0,
    method: 'hare_niemeyer',      // Hare/Niemeyer (largest remainder, quota)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single-state PR with 41 constituencies; we model nationally
    parties: {
      cdu:    { code: 'CDU',   name: 'Christlich Demokratische Union',        name_en: 'Christian Democratic Union',          color: '#6B6B6B' },
      afd:    { code: 'AfD',   name: 'Alternative für Deutschland',           name_en: 'Alternative for Germany',              color: '#40A0D8' },
      linke:  { code: 'LINKE', name: 'Die Linke',                             name_en: 'The Left',                             color: '#B60055' },
      spd:    { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany',  color: '#E3000F' },
      fdp:    { code: 'FDP',   name: 'Freie Demokratische Partei',            name_en: 'Free Democratic Party',                color: '#FFED00' },
      gruene: { code: 'GRÜNE', name: 'Bündnis 90/Die Grünen',                 name_en: 'Alliance 90/The Greens',               color: '#64A12D' },
      bsw:    { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht',             name_en: 'Sahra Wagenknecht Alliance',            color: '#8E44AD' },
    },
    order: ['afd', 'cdu', 'linke', 'spd', 'gruene', 'fdp', 'bsw'],
    parlOrder: ['linke', 'spd', 'gruene', 'bsw', 'cdu', 'fdp', 'afd'],
    blocs: {
      bloc1: { name: 'Firewall', short: 'FIRE', parties: ['cdu', 'linke', 'spd', 'fdp', 'gruene', 'bsw'], color: '#111827' },
      bloc2: { name: 'AfD',      short: 'AFD',  parties: ['afd'], color: '#40A0D8' },
    },
    // Partial PR with direct mandates: leveling seats grow the total, capped at `cap` seats (LWG LSA)
    overhang: { cap: 100, rows: 9 },
    logos: {
      cdu: 'img/de/CDU.svg', afd: 'img/de/AFD.svg', linke: 'img/de/Linke.svg',
      spd: 'img/de/SPD.svg', fdp: 'img/de/FDP.svg', gruene: 'img/de/Grune.svg', bsw: 'img/de/BSW.svg',
    },
    lastElection: {
      date: '2021-06-06',
      results: { cdu: 37.1, afd: 20.8, linke: 11.0, spd: 8.4, fdp: 6.4, gruene: 5.9, bsw: 0 },
      seats:   { cdu: 40, afd: 23, linke: 12, spd: 9, fdp: 7, gruene: 6, bsw: 0 },
    },
    map: {
      svg: 'img/saxony_anhalt.svg',
      // 41 Wahlkreise (1-41) -> Gebiet id (2021 Landkreis / kreisfreie Stadt)
      districts: {
        1:'altmark',2:'altmark',3:'stendal',4:'stendal',5:'jerichow',6:'jerichow',
        7:'boerde',8:'boerde',9:'boerde',10:'magdeburg',11:'magdeburg',12:'magdeburg',13:'magdeburg',
        14:'harz',15:'harz',16:'harz',17:'harz',18:'salzland',19:'salzland',20:'salzland',21:'salzland',
        22:'anhalt',23:'anhalt',24:'wittenberg',25:'wittenberg',26:'dessau',27:'wittenberg',28:'anhalt',
        29:'saale',30:'mansfeld',31:'mansfeld',32:'saale',33:'saale',34:'saale',
        35:'halle',36:'halle',37:'halle',38:'halle',39:'burgenland',40:'burgenland',41:'burgenland',
      },
      // 2021 Zweitstimmen (%) per Gebiet (source: de.wikipedia.org, Landtagswahl Sachsen-Anhalt 2021)
      gebiete: {
        altmark:     { cdu: 37.6, afd: 18.5, linke: 12.0, spd: 9.5, gruene: 5.0, fdp: 5.9 },
        anhalt:      { cdu: 38.8, afd: 24.1, linke: 11.3, spd: 6.8, gruene: 3.7, fdp: 5.7 },
        boerde:      { cdu: 37.4, afd: 22.3, linke: 10.2, spd: 8.8, gruene: 4.1, fdp: 6.7 },
        burgenland:  { cdu: 38.6, afd: 24.9, linke: 9.8,  spd: 7.7, gruene: 3.6, fdp: 6.2 },
        dessau:      { cdu: 40.1, afd: 18.4, linke: 10.8, spd: 8.0, gruene: 7.6, fdp: 7.0 },
        halle:       { cdu: 32.1, afd: 15.0, linke: 13.1, spd: 8.8, gruene: 13.9, fdp: 7.2 },
        harz:        { cdu: 38.3, afd: 19.3, linke: 10.9, spd: 10.3, gruene: 5.2, fdp: 6.3 },
        jerichow:    { cdu: 39.6, afd: 21.0, linke: 10.4, spd: 9.3, gruene: 4.3, fdp: 5.8 },
        magdeburg:   { cdu: 32.9, afd: 15.1, linke: 12.6, spd: 9.6, gruene: 10.8, fdp: 6.8 },
        mansfeld:    { cdu: 37.5, afd: 25.8, linke: 11.1, spd: 7.9, gruene: 2.7, fdp: 6.0 },
        saale:       { cdu: 38.1, afd: 23.8, linke: 9.6,  spd: 7.3, gruene: 4.1, fdp: 7.2 },
        salzland:    { cdu: 38.1, afd: 23.7, linke: 11.1, spd: 7.9, gruene: 3.4, fdp: 6.9 },
        stendal:     { cdu: 34.2, afd: 22.4, linke: 10.1, spd: 7.8, gruene: 4.4, fdp: 5.2 },
        wittenberg:  { cdu: 42.8, afd: 20.9, linke: 9.1,  spd: 7.1, gruene: 4.1, fdp: 5.3 },
      },
      // 2021 direct-mandate winners per Wahlkreis that differ from the CDU default (40 CDU + 1 AfD/Zeitz)
      winners2021: { 41: 'afd' },
    },
    pollsterMAE: {
      "Forschungsgruppe Wahlen": { BT2025: 0.73, BT2021: 0.90, ST2021: 2.43, overall: 1.35 },
      "Infratest dimap":         { BT2025: 1.72, BT2021: 0.82, ST2021: 3.43, overall: 1.99 },
      INSA:                      { BT2025: 0.71, BT2021: 0.97, ST2021: 3.43, overall: 1.70 },
      pollytix:                  { BT2025: 1.20, overall: 1.20 },
      Civey:                     { BT2021: 0.82, overall: 0.82 },
      YouGov:                    { BT2025: 0.60, BT2021: 1.48, overall: 1.04 },
    },
  },
};

// ===== Active country (switched at runtime) =====
let COUNTRY = 'sweden';
let COUNTRY_NAME = 'Sweden';
let SEATS_TOTAL = 349;
let THRESHOLD = 4.0;
let SEAT_METHOD = 'sainte_lague';
let HAS_CONSTITUENCIES = true;
let SEAT_BASED = false;
let PARTY_META = {};
let PARTY_ORDER = [];
let PARLIAMENT_ORDER = [];
let BLOCS = {};
let LAST_ELECTION = {};
let POLLSTER_MAE = {};
let PARTY_LOGOS = {};
let OVERHANG = null;

function setCountry(id) {
  const c = COUNTRIES[id];
  if (!c) return;
  COUNTRY = id;
  COUNTRY_NAME = c.name;
  SEATS_TOTAL = c.seats;
  THRESHOLD = c.threshold;
  SEAT_METHOD = c.method || 'sainte_lague';
  HAS_CONSTITUENCIES = !!c.constituencies;
  SEAT_BASED = !!c.seatBased;
  PARTY_META = c.parties;
  PARTY_ORDER = c.order;
  PARLIAMENT_ORDER = c.parlOrder || c.order;
  BLOCS = c.blocs;
  LAST_ELECTION = c.lastElection;
  POLLSTER_MAE = c.pollsterMAE || {};
  PARTY_LOGOS = c.logos || {};
  OVERHANG = c.overhang || null;
}

setCountry('sweden');