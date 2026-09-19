(function(){
'use strict';
var BMV_ROOT=document.getElementById('bmv-mv');
window.__600_COUNTRY__='mecklenburg_vorpommern';
window.__600_LOCAL_ASSETS__=true;
// ===== AltıCiftSıfır — Config =====

// Cache-buster appended to party-logo <img> URLs so logo updates reach users
// without a hard refresh (script tags already carry ?v=, images did not).
const LOGO_CACHE = 'b28';

const COUNTRIES = {

  sweden: {
    name: 'Sweden',
    hidden: true,                   // archived 2026-09-14 (riksdag election 2026-09-14)
    seats: 349,
    threshold: 4.0,
    method: 'sainte_lague',       // modified Sainte-Laguë (divisor 1.2)
    seatBased: false,
    constituencies: true,
    recencyHalfLifeDays: 7,       // respond faster to the latest polls
    live: {
      // election-night proxy (Cloudflare worker) + local static fallback
      workerUrl: 'https://600-election-night.600-live.workers.dev/sweden',
      localUrl: 'data/sweden/live.json',
      // party -> id in the normalized live feed (matches valmyndigheten codes)
      mapCode: p=>p,
    },
    parties: {
      S:  { name: 'Socialdemokraterna',       name_en: 'Social Democrats',  color: '#EE2020' },
      SD: { name: 'Sverigedemokraterna',       name_en: 'Sweden Democrats',  color: '#FFCD00' },
      M:  { name: 'Moderaterna',              name_en: 'Moderates',         color: '#52BDEC' },
      V:  { name: 'Vänsterpartiet',           name_en: 'Left Party',        color: '#A6192E' },
      C:  { name: 'Centerpartiet',            name_en: 'Centre Party',      color: '#009933' },
      KD: { name: 'Kristdemokraterna',         name_en: 'Christian Democrats', color: '#003087' },
      MP: { name: 'Miljöpartiet',             name_en: 'Green Party',       color: '#87C737' },
      L:  { name: 'Liberalerna',              name_en: 'Liberals',          color: '#006AB5' },
      NYD:{ name: 'Nya Demokratin',           name_en: 'New Democracy',     color: '#FFCD00' }, // historical right-populist party (1991/1994); same yellow as SD
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
    map: {
      svg: 'img/sweden.svg',
      selector: 'label',          // paths carry inkscape:label = valkrets name
      useConstituencies: true,    // 2022 shares + MP seats per valkrets from data/sweden/constituencies.json
      // map path label -> constituency id (constituencies.json)
      districts: {
        'Stockholms kommun': 'stockholm',
        'Stockholms län': 'stockholms_län',
        'Uppsala län': 'uppsala',
        'Södermanlands län': 'södermanland',
        'Östergötlands län': 'östergötland',
        'Jönköpings län': 'jönköping',
        'Kronobergs län': 'kronoberg',
        'Kalmar län': 'kalmar',
        'Gotlands län': 'gotland',
        'Blekinge län': 'blekinge',
        'Malmö kommun': 'malmö',
        'Skåne läns västra': 'skåne_v',
        'Skåne läns södra': 'skåne_s',
        'Skåne läns norra och östra': 'skåne_ne',
        'Hallands län': 'halland',
        'Göteborgs kommun': 'göteborg',
        'Västra Götalands läns västra': 'vg_västra',
        'Västra Götalands läns norra': 'vg_norra',
        'Västra Götalands läns södra': 'vg_södra',
        'Västra Götalands läns östra': 'vg_östra',
        'Värmlands län': 'värmland',
        'Örebro län': 'örebro',
        'Västmanlands län': 'västmanland',
        'Dalarnas län': 'dalarna',
        'Gävleborgs län': 'gävleborg',
        'Västernorrlands län': 'västernorrland',
        'Jämtlands län': 'jämtland',
        'Västerbottens län': 'västerbotten',
        'Norrbottens län': 'norrbotten',
      },
      // official 2022 MP seats won per party per valkrets (fasta + utjämningsmandat;
      // source: val.se Fördelning av mandat i riksdagen 2022, bilagor 3 + 6)
      mp2022: {"Stockholms kommun":{"S":9,"M":6,"V":4,"SD":4,"MP":4,"C":3,"L":3,"KD":1},"Stockholms län":{"S":11,"M":10,"SD":8,"C":3,"V":3,"L":3,"MP":3,"KD":2},"Uppsala län":{"S":4,"M":2,"SD":2,"V":1,"C":1,"MP":1,"KD":1,"L":1},"Södermanlands län":{"S":4,"SD":2,"M":2,"C":1,"V":1,"MP":1},"Östergötlands län":{"S":5,"SD":4,"M":3,"C":1,"KD":1,"V":1,"MP":1,"L":1},"Jönköpings län":{"S":4,"SD":3,"M":2,"KD":1,"C":1,"L":1,"V":1},"Kronobergs län":{"S":2,"SD":2,"M":2},"Kalmar län":{"S":3,"SD":2,"M":2,"KD":1},"Gotlands län":{"S":1,"M":1},"Blekinge län":{"S":2,"SD":2,"M":1},"Malmö kommun":{"S":3,"M":2,"SD":2,"V":1,"MP":1,"C":1,"L":1},"Skåne läns västra":{"SD":3,"S":3,"M":2,"C":1,"L":1},"Skåne läns södra":{"S":3,"SD":3,"M":3,"C":1,"L":1,"MP":1,"KD":1,"V":1},"Skåne läns norra och östra":{"SD":4,"S":3,"M":2,"KD":1},"Hallands län":{"S":3,"SD":3,"M":2,"C":1,"KD":1,"L":1,"MP":1},"Göteborgs kommun":{"S":5,"M":3,"SD":3,"V":2,"MP":2,"C":1,"L":1,"KD":1},"Västra Götalands läns västra":{"S":3,"SD":3,"M":3,"C":1,"KD":1,"V":1,"L":1,"MP":1},"Västra Götalands läns norra":{"S":3,"SD":2,"M":2,"KD":1},"Västra Götalands läns södra":{"S":2,"SD":2,"M":2,"C":1,"KD":1},"Västra Götalands läns östra":{"S":3,"SD":2,"M":2,"KD":1,"C":1},"Värmlands län":{"S":4,"SD":2,"M":2,"C":1,"KD":1,"V":1},"Örebro län":{"S":3,"SD":2,"M":2,"C":1,"V":1,"L":1,"KD":1,"MP":1},"Västmanlands län":{"S":3,"SD":2,"M":2,"V":1},"Dalarnas län":{"S":3,"SD":3,"M":2,"C":1,"KD":1,"V":1},"Gävleborgs län":{"S":4,"SD":2,"M":2,"C":1,"KD":1,"V":1},"Västernorrlands län":{"S":4,"SD":2,"M":1,"C":1,"V":1},"Jämtlands län":{"S":2,"SD":1,"M":1},"Västerbottens län":{"S":4,"SD":1,"M":1,"V":1,"C":1,"MP":1},"Norrbottens län":{"S":4,"SD":2,"M":1,"V":1}},
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
    maeKey: '2022',                    // weight pollsters by their 2022 accuracy
    biasKey: '2022',                   // signed-bias correction from the 2022 backtest
    biasShrink: 0.5,                   // 2022 bias flipped sign in 2026 (pollsters overstated S); apply at half strength
    maeSmooth: true,                   // 1/(1+MAE) weight: Sifo was best in 2022 but weak in 2026; don't over-concentrate
    pollsterBias: {                    // bias = poll − actual (SwedishPolls, last-3 polls before 2022-09-11)
      Sifo:    { S: -0.8,  SD: 0.09, M: -2.33, V: 0.68, C: 0.19, KD: 0.79, MP: 1.03, L: 0.99 },
      Novus:   { S: -1.3,  SD: 0.39, M: -1.63, V: 0.98, C: 1.02, KD: 0.53, MP: 0.03, L: 0.42 },
      Demoskop:{ S: -0.9,  SD: -0.01, M: -0.77, V: 0.92, C: 1.12, KD: -0.01, MP: -0.13, L: 0.32 },
      Ipsos:   { S: -1.83, SD: 0.66, M: -1.37, V: 1.42, C: 0.52, KD: 0.36, MP: 0.5, L: -0.21 },
      Sentio:  { S: -4.28, SD: 1.01, M: 0.9, V: 2.65, C: -1.51, KD: 1.41, MP: -0.55, L: -0.41 },
      Infostat:{ S: -1.63, SD: 0.06, M: -1.1, V: 1.05, C: 0.79, KD: 0.56, MP: -0.3, L: 0.29 },
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
      reservists:{ code: 'RSV', name: 'The Reservists',           name_en: 'The Reservists',   color: '#D2B48C' },
      amcha:     { code: 'AMC', name: 'Amcha Yisrael',            name_en: 'Amcha Yisrael',    color: '#FF69B4' },
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
      bloc1: { name: 'Coalition', short: 'GOV', parties: ['likud', 'rzp', 'otzma', 'shas', 'utj', 'amcha'], color: '#00A0DF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['together', 'yb', 'dems', 'yashar', 'blue_white', 'raam', 'joint_list', 'reservists'], color: '#E30613' },
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
    excludePollsters: ['Filber', 'SF+ND'],   // Channel-14-affiliated polling (Shlomo Filber / Next Data): systemically pro-coalition outlier
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
    },
    surplusAgreements: [            // Bader-Ofer surplus-vote agreements (pool votes for remainder seats)
      ['joint_list', 'raam'],
      ['together', 'yb'],
      ['yashar', 'dems'],
    ],
    logos: {
      likud: 'img/il/Likud.svg', together: 'img/il/Together.svg', rzp: 'img/il/RZP.svg',
      otzma: 'img/il/Otzma.svg', blue_white: 'img/il/BW.svg', shas: 'img/il/Shas.svg',
      utj: 'img/il/UTJ.svg', yb: 'img/il/YisraelBeiteinu.svg', raam: 'img/il/Raam.svg',
      joint_list: 'img/il/JointList.svg', dems: 'img/il/Dems.svg', yashar: 'img/il/Yashar.svg',
      reservists: 'img/il/Reservists.svg', amcha: 'img/il/Amcha.svg',
    },
  },
saxony_anhalt: {
    name: 'Saxony-Anhalt',
    hidden: true,                  // archived 2026-09-12 (Landtag election 2026-09-06)
    seats: 83,
    threshold: 5.0,
    method: 'hare_niemeyer',      // Hare/Niemeyer (largest remainder, quota)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single-state PR with 41 constituencies; we model nationally
    recencyHalfLifeDays: 7,       // post-election: lean on the freshest polls
    maeKey: 'ST2026',             // weight pollsters by their 2026 LSA accuracy
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
      bloc1: { name: 'Firewall', short: 'FIRE', parties: ['cdu', 'linke', 'spd', 'fdp', 'gruene'], color: '#111827' },
      bloc2: { name: 'AfD',      short: 'AFD',  parties: ['afd'], color: '#40A0D8' },
      kingmaker: 'bsw',
      kingmakerLabel: 'BSW Kingmaker',
      kingmakerColor: '#8E44AD',
    },
    // Partial PR with direct mandates: leveling seats grow the total, capped at `cap` seats (LWG LSA)
    overhang: { cap: 100, rows: 9 },
    logos: {
      cdu: 'img/de/CDU.svg', afd: 'img/de/AFD.svg', linke: 'img/de/Linke.svg',
      spd: 'img/de/SPD.svg', fdp: 'img/de/FDP.svg', gruene: 'img/de/Grune.svg', bsw: 'img/de/BSW.svg',
    },
    lastElection: {
      date: '2026-09-06',
      // 2026 LSA official result (source: en.wikipedia.org/wiki/2026_Saxony-Anhalt_state_election)
      results: { cdu: 17.2, afd: 43.8, linke: 8.6, spd: 9.3, fdp: 2.6, gruene: 8.9, bsw: 5.3 },
      seats:   { cdu: 15, afd: 39, linke: 8, spd: 8, fdp: 0, gruene: 8, bsw: 5 },
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
      // 2021 national Zweitstimmen — the uniform-swing baseline for the projection map
      national2021: { cdu: 37.1, afd: 20.8, linke: 11.0, spd: 8.4, fdp: 6.4, gruene: 5.9, bsw: 0 },
    },
    pollsterMAE: {
      "Forschungsgruppe Wahlen": { BT2025: 0.73, BT2021: 0.90, ST2021: 2.43, ST2026: 2.63, overall: 1.35 },
      "Infratest dimap":         { BT2025: 1.72, BT2021: 0.82, ST2021: 3.43, ST2026: 3.41, overall: 1.99 },
      INSA:                      { BT2025: 0.71, BT2021: 0.97, ST2021: 3.43, ST2026: 3.16, overall: 1.70 },
      pollytix:                  { BT2025: 1.20, ST2026: 2.73, overall: 1.20 },
      Civey:                     { BT2021: 0.82, overall: 0.82 },
      YouGov:                    { BT2025: 0.60, BT2021: 1.48, overall: 1.04 },
    },
  },

  mecklenburg_vorpommern: {
    name: 'Mecklenburg-Vorpommern',
    seats: 71,
    threshold: 5.0,
    method: 'hare_niemeyer',      // Hare/Niemeyer (largest remainder, quota)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single-state PR with 36 constituencies; we model nationally
    recencyHalfLifeDays: 7,
    live: {
      // election-night proxy (Cloudflare worker) + local static fallback
      workerUrl: 'https://600-election-night.600-live.workers.dev/mecklenburg_vorpommern',
      localUrl: 'data/mecklenburg_vorpommern/live.json',
      // party -> id in the normalized live feed (state-election codes)
      mapCode: p=>p,
      // exit poll run for this state on election night (ARD)
      exitPoll: { short: 'ID', name: 'Infratest dimap' },
    },
    maeKey: 'MV2021',             // weight pollsters by their 2021 MV accuracy
    biasKey: 'MV2021',            // signed-bias correction from the MV2021 backtest
    priorAlpha: 0.05,             // last-election Dirichlet prior (5% pull toward 2021)
    trend: {                      // linear-trend extrapolation to the 2026-09-20 election
      electionDate: '2026-09-20',
      blend: 0.5,
      maxDaily: 0.3,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
    },
    pollsterBias: {               // bias = poll − actual (MV2021 backtest, last-5-polls avg)
      "Infratest dimap": { spd: -6.6, afd: -0.3, cdu: 4.3, linke: 0.9, gruene: 1.5, fdp: 0.8 },
      INSA:             { spd: -7.6, afd: 1.3,  cdu: 3.3, linke: 2.5, gruene: 1.5, fdp: 0.4 },
      "Forschungsgruppe Wahlen": { spd: -1.1, afd: -0.2, cdu: 1.2, linke: 1.1, gruene: 0.2, fdp: -0.05 },
    },
    parties: {
      spd:    { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany',  color: '#E3000F' },
      afd:    { code: 'AfD',   name: 'Alternative für Deutschland',           name_en: 'Alternative for Germany',              color: '#40A0D8' },
      cdu:    { code: 'CDU',   name: 'Christlich Demokratische Union',        name_en: 'Christian Democratic Union',          color: '#6B6B6B' },
      linke:  { code: 'LINKE', name: 'Die Linke',                             name_en: 'The Left',                             color: '#B60055' },
      gruene: { code: 'GRÜNE', name: 'Bündnis 90/Die Grünen',                 name_en: 'Alliance 90/The Greens',               color: '#64A12D' },
      fdp:    { code: 'FDP',   name: 'Freie Demokratische Partei',            name_en: 'Free Democratic Party',                color: '#FFED00' },
      bsw:    { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht',             name_en: 'Sahra Wagenknecht Alliance',            color: '#8E44AD' },
    },
    order: ['spd', 'afd', 'cdu', 'linke', 'gruene', 'fdp', 'bsw'],
    parlOrder: ['linke', 'spd', 'gruene', 'bsw', 'cdu', 'fdp', 'afd'],
    blocs: {
      bloc1: { name: 'Firewall', short: 'FIRE', parties: ['spd', 'cdu', 'linke', 'fdp', 'gruene'], color: '#111827' },
      bloc2: { name: 'AfD',      short: 'AFD',  parties: ['afd'], color: '#40A0D8' },
      kingmaker: 'bsw',
      kingmakerLabel: 'BSW Kingmaker',
      kingmakerColor: '#8E44AD',
    },
    // Leveling seats grow the base 71 up to the cap (2021 Landtag sat 79)
    overhang: { cap: 90, rows: 9 },
    logos: {
      cdu: 'img/de/CDU.svg', afd: 'img/de/AFD.svg', linke: 'img/de/Linke.svg',
      spd: 'img/de/SPD.svg', fdp: 'img/de/FDP.svg', gruene: 'img/de/Grune.svg', bsw: 'img/de/BSW.svg',
    },
    lastElection: {
      date: '2021-09-26',
      // 2021 MV official result (source: wahlen.mvnet.de)
      results: { spd: 39.6, afd: 16.7, cdu: 13.3, linke: 9.9, gruene: 6.3, fdp: 5.8, bsw: 0 },
      seats:   { spd: 34, afd: 14, cdu: 12, linke: 9, gruene: 5, fdp: 5, bsw: 0 },
    },
    map: {
      svg: 'img/mecklenburg_vorpommern.svg',
      // 36 Wahlkreise (1-36) -> Gebiet id (2021 Landkreis / kreisfreie Stadt)
      districts: {
        1:'vorpommern_greifswald', 2:'seenplatte', 3:'seenplatte',
        4:'rostock', 5:'rostock', 6:'rostock', 7:'rostock',
        8:'schwerin', 9:'schwerin',
        10:'nordwestmecklenburg',
        11:'landkreis_rostock', 12:'landkreis_rostock',
        13:'seenplatte', 14:'seenplatte',
        15:'landkreis_rostock', 16:'landkreis_rostock',
        17:'ludwigslust_parchim', 18:'ludwigslust_parchim', 19:'ludwigslust_parchim',
        20:'seenplatte', 21:'seenplatte', 22:'seenplatte',
        23:'vorpommern_ruegen', 24:'vorpommern_ruegen', 25:'vorpommern_ruegen', 26:'vorpommern_ruegen',
        27:'nordwestmecklenburg', 28:'nordwestmecklenburg',
        29:'vorpommern_greifswald', 30:'vorpommern_greifswald',
        31:'ludwigslust_parchim', 32:'ludwigslust_parchim',
        33:'vorpommern_ruegen', 34:'vorpommern_ruegen',
        35:'vorpommern_greifswald', 36:'vorpommern_greifswald',
      },
      // 2021 Zweitstimmen (%) per Gebiet (order spd/cdu/afd/linke/gruene/fdp; source: wahlen.mvnet.de)
      gebiete: {
        schwerin:            { spd: 38.2, cdu: 11.5, afd: 13.2, linke: 12.3, gruene: 9.6, fdp: 6.7 },
        rostock:             { spd: 39.1, cdu: 9.1,  afd: 10.7, linke: 13.5, gruene: 12.0, fdp: 6.3 },
        nordwestmecklenburg: { spd: 42.8, cdu: 12.6, afd: 14.7, linke: 10.1, gruene: 6.8, fdp: 5.7 },
        landkreis_rostock:   { spd: 41.5, cdu: 13.3, afd: 16.7, linke: 8.9,  gruene: 5.2, fdp: 6.3 },
        vorpommern_ruegen:   { spd: 37.1, cdu: 15.6, afd: 18.8, linke: 9.2,  gruene: 5.3, fdp: 5.6 },
        vorpommern_greifswald:{ spd: 35.7, cdu: 14.8, afd: 20.2, linke: 8.1, gruene: 6.1, fdp: 5.6 },
        seenplatte:          { spd: 39.7, cdu: 14.3, afd: 19.5, linke: 9.8,  gruene: 4.0, fdp: 5.1 },
        ludwigslust_parchim: { spd: 42.8, cdu: 13.6, afd: 16.5, linke: 9.3,  gruene: 4.0, fdp: 5.7 },
      },
      names: {
        schwerin: 'Schwerin', rostock: 'Rostock', nordwestmecklenburg: 'Nordwestmecklenburg',
        landkreis_rostock: 'Landkreis Rostock', vorpommern_ruegen: 'Vorpommern-Rügen',
        vorpommern_greifswald: 'Vorpommern-Greifswald', seenplatte: 'Mecklenburgische Seenplatte',
        ludwigslust_parchim: 'Ludwigslust-Parchim',
      },
      // per-Wahlkreis names (source: de.wikipedia.org Liste der Landtagswahlkreise)
      wkNames: {
        1:'Greifswald', 2:'Neubrandenburg I', 3:'Neubrandenburg II',
        4:'Hansestadt Rostock I', 5:'Hansestadt Rostock II', 6:'Hansestadt Rostock III', 7:'Hansestadt Rostock IV',
        8:'Schwerin I', 9:'Schwerin II', 10:'Wismar',
        11:'Landkreis Rostock I', 12:'Landkreis Rostock II',
        13:'Mecklenburgische Seenplatte I – Vorpommern-Greifswald I', 14:'Mecklenburgische Seenplatte II',
        15:'Landkreis Rostock III', 16:'Landkreis Rostock IV',
        17:'Ludwigslust-Parchim I', 18:'Ludwigslust-Parchim II', 19:'Ludwigslust-Parchim III',
        20:'Mecklenburgische Seenplatte III', 21:'Mecklenburgische Seenplatte IV', 22:'Mecklenburgische Seenplatte V',
        23:'Vorpommern-Rügen I', 24:'Vorpommern-Rügen II – Stralsund III', 25:'Vorpommern-Rügen III – Stralsund I', 26:'Stralsund II',
        27:'Nordwestmecklenburg I', 28:'Nordwestmecklenburg II',
        29:'Vorpommern-Greifswald II', 30:'Vorpommern-Greifswald III',
        31:'Ludwigslust-Parchim IV', 32:'Ludwigslust-Parchim V',
        33:'Vorpommern-Rügen IV', 34:'Vorpommern-Rügen V',
        35:'Vorpommern-Greifswald IV', 36:'Vorpommern-Greifswald V',
      },
      // 2021 direct-mandate winners per Wahlkreis (source: de.wikipedia.org Liste der Landtagswahlkreise);
      // SPD won 34 of 36; WK 13 went AfD (Enrico Schult), WK 24 CDU (Harry Glawe)
      winners2021: { 13: 'afd', 24: 'cdu' },
      winners2021_default: 'spd',
      // actual 2021 Zweitstimmen (%) per Wahlkreis (official: wahlen.mvnet.de l_wahlkreise.csv)
      wkResults: {"1":{"spd":33.5,"afd":12.4,"cdu":12.5,"linke":9.9,"gruene":14.4,"fdp":6.9},"2":{"spd":42.3,"afd":16.4,"cdu":11.5,"linke":12.8,"gruene":4.1,"fdp":5.1},"3":{"spd":40.5,"afd":16.2,"cdu":11.9,"linke":11.7,"gruene":5.6,"fdp":5.6},"4":{"spd":43.1,"afd":14.1,"cdu":9.5,"linke":12.5,"gruene":6.9,"fdp":5.3},"5":{"spd":44.6,"afd":11.8,"cdu":7.8,"linke":14.2,"gruene":7.2,"fdp":5.0},"6":{"spd":35.3,"afd":7.4,"cdu":8.8,"linke":14.7,"gruene":18.0,"fdp":6.5},"7":{"spd":36.5,"afd":10.8,"cdu":9.8,"linke":12.6,"gruene":12.9,"fdp":7.5},"8":{"spd":35.2,"afd":11.9,"cdu":12.1,"linke":12.8,"gruene":11.8,"fdp":7.3},"9":{"spd":44.3,"afd":15.7,"cdu":10.4,"linke":11.3,"gruene":5.3,"fdp":5.6},"10":{"spd":45.1,"afd":12.4,"cdu":10.4,"linke":10.5,"gruene":8.2,"fdp":5.9},"11":{"spd":41.4,"afd":15.4,"cdu":13.0,"linke":9.1,"gruene":6.0,"fdp":6.4},"12":{"spd":40.2,"afd":15.0,"cdu":13.8,"linke":9.6,"gruene":6.2,"fdp":7.2},"13":{"spd":33.7,"afd":24.0,"cdu":21.1,"linke":8.0,"gruene":2.6,"fdp":4.2},"14":{"spd":40.0,"afd":21.0,"cdu":15.9,"linke":8.5,"gruene":2.4,"fdp":5.0},"15":{"spd":40.5,"afd":19.7,"cdu":14.5,"linke":8.4,"gruene":3.5,"fdp":5.5},"16":{"spd":44.2,"afd":17.6,"cdu":11.8,"linke":8.2,"gruene":4.6,"fdp":5.5},"17":{"spd":48.1,"afd":14.3,"cdu":11.9,"linke":7.8,"gruene":4.5,"fdp":5.4},"18":{"spd":43.5,"afd":15.2,"cdu":14.8,"linke":9.1,"gruene":3.6,"fdp":6.3},"19":{"spd":41.2,"afd":17.9,"cdu":13.2,"linke":9.5,"gruene":3.7,"fdp":5.7},"20":{"spd":41.4,"afd":18.5,"cdu":13.5,"linke":9.3,"gruene":4.6,"fdp":5.5},"21":{"spd":41.4,"afd":17.5,"cdu":12.4,"linke":10.1,"gruene":5.6,"fdp":5.1},"22":{"spd":37.5,"afd":22.4,"cdu":14.5,"linke":9.0,"gruene":3.2,"fdp":5.1},"23":{"spd":40.4,"afd":17.1,"cdu":16.2,"linke":9.2,"gruene":4.6,"fdp":5.2},"24":{"spd":33.7,"afd":21.5,"cdu":20.4,"linke":8.1,"gruene":3.8,"fdp":5.1},"25":{"spd":38.0,"afd":20.7,"cdu":14.2,"linke":8.9,"gruene":4.3,"fdp":5.4},"26":{"spd":33.6,"afd":15.8,"cdu":13.6,"linke":9.0,"gruene":10.0,"fdp":7.0},"27":{"spd":42.6,"afd":13.9,"cdu":13.4,"linke":10.1,"gruene":7.3,"fdp":5.6},"28":{"spd":41.6,"afd":16.9,"cdu":13.2,"linke":9.7,"gruene":5.4,"fdp":5.7},"29":{"spd":35.6,"afd":21.3,"cdu":16.8,"linke":7.3,"gruene":4.0,"fdp":6.2},"30":{"spd":34.7,"afd":23.7,"cdu":15.5,"linke":7.4,"gruene":3.8,"fdp":5.5},"31":{"spd":40.8,"afd":18.5,"cdu":14.2,"linke":9.5,"gruene":3.4,"fdp":5.1},"32":{"spd":40.9,"afd":16.5,"cdu":13.6,"linke":10.4,"gruene":4.7,"fdp":6.0},"33":{"spd":37.1,"afd":19.7,"cdu":14.8,"linke":10.3,"gruene":4.6,"fdp":5.2},"34":{"spd":38.2,"afd":17.8,"cdu":14.8,"linke":10.1,"gruene":5.0,"fdp":6.1},"35":{"spd":39.0,"afd":23.7,"cdu":13.3,"linke":7.6,"gruene":2.1,"fdp":4.4},"36":{"spd":38.3,"afd":23.3,"cdu":16.6,"linke":7.5,"gruene":2.2,"fdp":4.0}},
      // 2021 national Zweitstimmen — uniform-swing baseline (fall back via LAST_ELECTION accordingly)
      national2021: { spd: 39.6, afd: 16.7, cdu: 13.3, linke: 9.9, gruene: 6.3, fdp: 5.8, bsw: 0 },
    },
    pollsterMAE: {
      "Forschungsgruppe Wahlen": { BT2025: 0.73, BT2021: 0.90, MV2021: 0.78, overall: 1.35 },
      "Infratest dimap":         { BT2025: 1.72, BT2021: 0.82, MV2021: 2.60, overall: 1.99 },
      INSA:                      { BT2025: 0.71, BT2021: 0.97, MV2021: 2.98, overall: 1.70 },
      Forsa:                     { BT2025: 1.00, BT2021: 1.20, B2023: 0.90,  overall: 1.05 },
    },
  },

  berlin: {
    name: 'Berlin',
    seats: 130,
    threshold: 5.0,
    method: 'hare_niemeyer',      // Hare/Niemeyer (largest remainder, quota)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single-state PR with 78 constituencies; we model nationally
    recencyHalfLifeDays: 7,
    live: {
      // election-night proxy (Cloudflare worker) + local static fallback
      workerUrl: 'https://600-election-night.600-live.workers.dev/berlin',
      localUrl: 'data/berlin/live.json',
      // party -> id in the normalized live feed (state-election codes)
      mapCode: p=>p,
      // exit poll run for this state on election night (ZDF/ARD)
      exitPoll: { short: 'FGW', name: 'Forschungsgruppe Wahlen' },
    },
    maeKey: 'B2023',              // weight pollsters by their 2023 Berlin (repeat) accuracy
    biasKey: 'B2023',             // signed-bias correction from the B2023 backtest
    biasShrink: 0.5,              // B2023 bias is large (INSA cdu +6.6pp) & single-election; halve so CDU isn't inflated ~8pp
    priorAlpha: 0.05,             // last-election Dirichlet prior (5% pull toward 2023)
    trend: {                      // linear-trend extrapolation to the 2026-09-20 election
      electionDate: '2026-09-20',
      blend: 0.5,
      maxDaily: 0.3,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
    },
    pollsterBias: {               // bias = poll − actual (B2023 backtest, last-5-polls avg)
      "Infratest dimap": { cdu: -3.4, spd: 0.6,  gruene: 0.8, linke: -0.8, afd: 1.3 },
      INSA:             { cdu: -6.6, spd: 1.8,  gruene: 1.4, linke: -0.2, afd: 0.1 },
      "Forschungsgruppe Wahlen": { cdu: -3.7, spd: 2.6, gruene: -0.9, linke: -1.2, afd: 0.9 },
    },
    parties: {
      cdu:    { code: 'CDU',   name: 'Christlich Demokratische Union',        name_en: 'Christian Democratic Union',          color: '#6B6B6B' },
      spd:    { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany',  color: '#E3000F' },
      gruene: { code: 'GRÜNE', name: 'Bündnis 90/Die Grünen',                 name_en: 'Alliance 90/The Greens',               color: '#64A12D' },
      linke:  { code: 'LINKE', name: 'Die Linke',                             name_en: 'The Left',                             color: '#B60055' },
      afd:    { code: 'AfD',   name: 'Alternative für Deutschland',           name_en: 'Alternative for Germany',              color: '#40A0D8' },
      fdp:    { code: 'FDP',   name: 'Freie Demokratische Partei',            name_en: 'Free Democratic Party',                color: '#FFED00' },
      bsw:    { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht',             name_en: 'Sahra Wagenknecht Alliance',            color: '#8E44AD' },
    },
    order: ['cdu', 'spd', 'gruene', 'linke', 'afd', 'fdp', 'bsw'],
    parlOrder: ['linke', 'spd', 'gruene', 'bsw', 'cdu', 'fdp', 'afd'],
    blocs: {
      bloc1: { name: 'Firewall', short: 'FIRE', parties: ['cdu', 'spd', 'gruene', 'linke', 'fdp'], color: '#111827' },
      bloc2: { name: 'AfD',      short: 'AFD',  parties: ['afd'], color: '#40A0D8' },
      kingmaker: 'bsw',
      kingmakerLabel: 'BSW Kingmaker',
      kingmakerColor: '#8E44AD',
    },
    // Leveling seats grow the base 130 up to the cap (2023 Abgeordnetenhaus sat 159)
    overhang: { cap: 180, rows: 12 },
    logos: {
      cdu: 'img/de/CDU.svg', afd: 'img/de/AFD.svg', linke: 'img/de/Linke.svg',
      spd: 'img/de/SPD.svg', fdp: 'img/de/FDP.svg', gruene: 'img/de/Grune.svg', bsw: 'img/de/BSW.svg',
    },
    lastElection: {
      date: '2023-02-12',
      // 2023 Berlin (repeat election) official result (source: wahlen-berlin.de)
      results: { cdu: 28.2, spd: 18.4, gruene: 18.4, linke: 12.2, afd: 9.1, fdp: 4.6, bsw: 0 },
      seats:   { cdu: 52, spd: 34, gruene: 34, linke: 22, afd: 17, fdp: 0, bsw: 0 },
    },
    map: {
      svg: 'img/berlin.svg',
      selector: 'class',     // paths selected via class="wkNNN", nr = the NNN digits
      // 78 Wahlkreise (101-107, 201-206, ... 1201-1206) -> Bezirk id per the user's polygon layer
      districts: {
        101:'mitte', 102:'mitte', 103:'mitte', 104:'mitte', 105:'mitte', 106:'mitte', 107:'mitte',
        201:'fk', 202:'fk', 203:'fk', 204:'fk', 205:'fk', 206:'fk',
        301:'pankow', 302:'pankow', 303:'pankow', 304:'pankow', 305:'pankow', 306:'pankow', 307:'pankow', 308:'pankow', 309:'pankow',
        401:'cw', 402:'cw', 403:'cw', 404:'cw', 405:'cw', 406:'cw', 407:'cw',
        501:'spandau', 502:'spandau', 503:'spandau', 504:'spandau', 505:'spandau',
        601:'sdz', 602:'sdz', 603:'sdz', 604:'sdz', 605:'sdz', 606:'sdz', 607:'sdz',
        701:'ts', 702:'ts', 703:'ts', 704:'ts', 705:'ts', 706:'ts', 707:'ts',
        801:'nk', 802:'nk', 803:'nk', 804:'nk', 805:'nk', 806:'nk',
        901:'tk', 902:'tk', 903:'tk', 904:'tk', 905:'tk', 906:'tk',
        1001:'marzahn', 1002:'marzahn', 1003:'marzahn', 1004:'marzahn', 1005:'marzahn', 1006:'marzahn',
        1101:'lichtenberg', 1102:'lichtenberg', 1103:'lichtenberg', 1104:'lichtenberg', 1105:'lichtenberg', 1106:'lichtenberg',
        1201:'reinickendorf', 1202:'reinickendorf', 1203:'reinickendorf', 1204:'reinickendorf', 1205:'reinickendorf', 1206:'reinickendorf',
      },
      // 2023 Zweitstimmen (%) per Bezirk (order spd/cdu/gruene/linke/afd/fdp; source: wahlen-berlin.de)
      gebiete: {
        mitte:       { spd: 16.6, cdu: 20.2, gruene: 27.2, linke: 15.8, afd: 5.6,  fdp: 5.1 },
        fk:          { spd: 14.6, cdu: 13.4, gruene: 33.5, linke: 21.1, afd: 3.7,  fdp: 3.3 },
        pankow:      { spd: 16.2, cdu: 21.5, gruene: 22.5, linke: 16.2, afd: 9.5,  fdp: 3.9 },
        cw:          { spd: 20.7, cdu: 30.6, gruene: 21.6, linke: 7.7,  afd: 5.3,  fdp: 7.3 },
        spandau:     { spd: 21.5, cdu: 39.1, gruene: 10.1, linke: 4.5,  afd: 11.0, fdp: 4.6 },
        sdz:         { spd: 20.2, cdu: 35.4, gruene: 18.4, linke: 5.5,  afd: 5.7,  fdp: 8.0 },
        ts:          { spd: 19.9, cdu: 31.1, gruene: 21.7, linke: 8.5,  afd: 6.3,  fdp: 4.6 },
        nk:          { spd: 21.3, cdu: 28.1, gruene: 18.5, linke: 13.1, afd: 7.5,  fdp: 3.1 },
        tk:          { spd: 18.0, cdu: 26.0, gruene: 12.2, linke: 15.9, afd: 13.9, fdp: 3.7 },
        marzahn:     { spd: 15.9, cdu: 31.8, gruene: 5.5,  linke: 14.4, afd: 19.2, fdp: 3.0 },
        lichtenberg: { spd: 16.3, cdu: 25.4, gruene: 11.7, linke: 18.6, afd: 13.8, fdp: 3.0 },
        reinickendorf:{ spd: 20.3, cdu: 40.2, gruene: 12.0, linke: 4.5,  afd: 10.0, fdp: 4.9 },
      },
      names: {
        mitte: 'Mitte', fk: 'Friedrichshain-Kreuzberg', pankow: 'Pankow', cw: 'Charlottenburg-Wilmersdorf',
        spandau: 'Spandau', sdz: 'Steglitz-Zehlendorf', ts: 'Tempelhof-Schöneberg', nk: 'Neukölln',
        tk: 'Treptow-Köpenick', marzahn: 'Marzahn-Hellersdorf', lichtenberg: 'Lichtenberg',
        reinickendorf: 'Reinickendorf',
      },
      // 2023 direct-mandate winners per Wahlkreis (78, official: wahlen-berlin.de)
      winners2021: {
        101:'gruene',102:'cdu',103:'gruene',104:'gruene',105:'cdu',106:'gruene',107:'gruene',
        201:'gruene',202:'gruene',203:'gruene',204:'linke',205:'gruene',206:'gruene',
        301:'cdu',302:'cdu',303:'gruene',304:'cdu',305:'gruene',306:'gruene',307:'gruene',308:'gruene',309:'spd',
        401:'cdu',402:'cdu',403:'gruene',404:'cdu',405:'cdu',406:'cdu',407:'cdu',
        501:'cdu',502:'cdu',503:'cdu',504:'cdu',505:'cdu',
        601:'cdu',602:'cdu',603:'cdu',604:'cdu',605:'cdu',606:'cdu',607:'cdu',
        701:'gruene',702:'gruene',703:'spd',704:'cdu',705:'cdu',706:'cdu',707:'cdu',
        801:'gruene',802:'gruene',803:'spd',804:'cdu',805:'cdu',806:'cdu',
        901:'linke',902:'spd',903:'cdu',904:'cdu',905:'cdu',906:'cdu',
        1001:'afd',1002:'cdu',1003:'afd',1004:'cdu',1005:'cdu',1006:'cdu',
        1101:'cdu',1102:'cdu',1103:'cdu',1104:'linke',1105:'linke',1106:'cdu',
        1201:'cdu',1202:'cdu',1203:'cdu',1204:'cdu',1205:'cdu',1206:'cdu',
      },
      // 2023 direct-mandate winners default (uniform-swing uses gebiete directly)
      winners2021_default: 'cdu',
      // actual 2023 Zweitstimmen (%) per Wahlkreis (official: wahlen-berlin.de)
      wkResults: {"101":{"spd":15.2,"cdu":20.6,"gruene":30.6,"linke":12.8,"afd":4.1,"fdp":8.0},"102":{"spd":17.6,"cdu":24.2,"gruene":19.5,"linke":17.6,"afd":7.1,"fdp":6.2},"103":{"spd":18.4,"cdu":22.2,"gruene":28.1,"linke":12.4,"afd":4.6,"fdp":6.1},"104":{"spd":14.7,"cdu":15.6,"gruene":34.3,"linke":16.8,"afd":4.6,"fdp":3.8},"105":{"spd":18.4,"cdu":24.1,"gruene":21.7,"linke":14.1,"afd":8.5,"fdp":3.2},"106":{"spd":14.8,"cdu":14.7,"gruene":28.7,"linke":21.5,"afd":5.4,"fdp":2.8},"107":{"spd":16.4,"cdu":17.8,"gruene":28.5,"linke":17.6,"afd":5.6,"fdp":3.5},"201":{"spd":16.1,"cdu":14.3,"gruene":37.0,"linke":17.4,"afd":2.6,"fdp":3.8},"202":{"spd":12.7,"cdu":10.2,"gruene":38.3,"linke":24.4,"afd":2.0,"fdp":2.4},"203":{"spd":15.8,"cdu":14.4,"gruene":32.9,"linke":21.6,"afd":2.9,"fdp":2.4},"204":{"spd":17.1,"cdu":18.2,"gruene":22.4,"linke":21.5,"afd":6.9,"fdp":3.6},"205":{"spd":13.5,"cdu":11.1,"gruene":33.9,"linke":21.9,"afd":4.2,"fdp":3.3},"206":{"spd":12.8,"cdu":12.2,"gruene":36.5,"linke":20.1,"afd":3.4,"fdp":4.2},"301":{"spd":16.2,"cdu":33.6,"gruene":9.4,"linke":11.0,"afd":17.0,"fdp":3.4},"302":{"spd":17.6,"cdu":29.6,"gruene":14.2,"linke":11.9,"afd":13.1,"fdp":4.4},"303":{"spd":17.1,"cdu":20.3,"gruene":23.0,"linke":16.6,"afd":9.2,"fdp":3.4},"304":{"spd":18.0,"cdu":28.9,"gruene":12.1,"linke":14.3,"afd":13.6,"fdp":3.2},"305":{"spd":17.4,"cdu":20.6,"gruene":19.6,"linke":17.6,"afd":10.4,"fdp":3.1},"306":{"spd":13.2,"cdu":12.1,"gruene":37.8,"linke":19.1,"afd":3.5,"fdp":4.3},"307":{"spd":14.9,"cdu":16.1,"gruene":27.5,"linke":18.8,"afd":7.3,"fdp":3.6},"308":{"spd":13.6,"cdu":14.4,"gruene":34.3,"linke":18.7,"afd":3.9,"fdp":5.6},"309":{"spd":17.5,"cdu":17.7,"gruene":24.6,"linke":18.0,"afd":7.9,"fdp":4.0},"401":{"spd":20.8,"cdu":27.4,"gruene":20.2,"linke":8.8,"afd":8.0,"fdp":5.4},"402":{"spd":20.6,"cdu":35.5,"gruene":18.4,"linke":5.6,"afd":5.4,"fdp":8.0},"403":{"spd":20.7,"cdu":24.1,"gruene":27.3,"linke":10.1,"afd":4.2,"fdp":6.3},"404":{"spd":20.1,"cdu":27.9,"gruene":24.2,"linke":8.2,"afd":4.7,"fdp":8.0},"405":{"spd":18.8,"cdu":39.0,"gruene":16.0,"linke":5.2,"afd":5.4,"fdp":9.9},"406":{"spd":21.6,"cdu":27.6,"gruene":24.2,"linke":8.5,"afd":4.4,"fdp":7.0},"407":{"spd":22.1,"cdu":31.9,"gruene":20.1,"linke":7.3,"afd":5.5,"fdp":6.3},"501":{"spd":22.2,"cdu":37.2,"gruene":9.6,"linke":4.8,"afd":12.2,"fdp":4.1},"502":{"spd":23.0,"cdu":33.9,"gruene":9.8,"linke":5.6,"afd":12.8,"fdp":3.8},"503":{"spd":21.2,"cdu":34.4,"gruene":12.1,"linke":5.9,"afd":10.8,"fdp":4.5},"504":{"spd":21.2,"cdu":43.9,"gruene":7.8,"linke":3.5,"afd":11.3,"fdp":4.1},"505":{"spd":20.4,"cdu":43.9,"gruene":11.2,"linke":3.3,"afd":8.5,"fdp":6.0},"601":{"spd":20.5,"cdu":28.7,"gruene":23.4,"linke":7.6,"afd":5.3,"fdp":6.5},"602":{"spd":21.6,"cdu":30.1,"gruene":20.7,"linke":7.0,"afd":6.0,"fdp":6.3},"603":{"spd":20.4,"cdu":36.8,"gruene":18.0,"linke":4.9,"afd":5.0,"fdp":8.7},"604":{"spd":21.0,"cdu":39.0,"gruene":14.8,"linke":4.7,"afd":6.6,"fdp":6.9},"605":{"spd":20.6,"cdu":38.3,"gruene":13.5,"linke":4.9,"afd":8.2,"fdp":6.3},"606":{"spd":18.8,"cdu":36.6,"gruene":19.2,"linke":5.4,"afd":4.8,"fdp":9.5},"607":{"spd":18.7,"cdu":38.4,"gruene":18.1,"linke":4.1,"afd":4.8,"fdp":10.7},"701":{"spd":19.3,"cdu":21.1,"gruene":31.1,"linke":12.3,"afd":4.0,"fdp":4.7},"702":{"spd":19.3,"cdu":17.2,"gruene":34.2,"linke":13.5,"afd":3.7,"fdp":3.7},"703":{"spd":21.9,"cdu":23.0,"gruene":30.0,"linke":9.1,"afd":4.0,"fdp":4.7},"704":{"spd":19.1,"cdu":27.8,"gruene":23.3,"linke":10.2,"afd":5.8,"fdp":3.9},"705":{"spd":20.3,"cdu":38.5,"gruene":12.1,"linke":6.4,"afd":8.7,"fdp":4.9},"706":{"spd":20.0,"cdu":45.6,"gruene":9.1,"linke":3.8,"afd":9.6,"fdp":4.8},"707":{"spd":19.2,"cdu":47.3,"gruene":9.0,"linke":3.6,"afd":8.9,"fdp":5.4},"801":{"spd":14.4,"cdu":10.3,"gruene":35.4,"linke":24.8,"afd":3.4,"fdp":1.8},"802":{"spd":14.3,"cdu":9.7,"gruene":35.8,"linke":25.7,"afd":3.4,"fdp":1.8},"803":{"spd":20.3,"cdu":20.0,"gruene":22.8,"linke":17.6,"afd":6.5,"fdp":2.5},"804":{"spd":27.5,"cdu":41.2,"gruene":5.2,"linke":4.6,"afd":10.6,"fdp":3.6},"805":{"spd":25.3,"cdu":40.3,"gruene":8.5,"linke":4.4,"afd":9.9,"fdp":4.4},"806":{"spd":25.2,"cdu":43.9,"gruene":5.6,"linke":3.6,"afd":10.8,"fdp":4.2},"901":{"spd":15.8,"cdu":18.3,"gruene":21.3,"linke":20.9,"afd":9.8,"fdp":3.1},"902":{"spd":20.4,"cdu":22.1,"gruene":12.4,"linke":16.4,"afd":13.5,"fdp":3.4},"903":{"spd":17.4,"cdu":30.6,"gruene":8.7,"linke":12.2,"afd":17.0,"fdp":3.6},"904":{"spd":17.9,"cdu":28.4,"gruene":11.1,"linke":14.5,"afd":13.9,"fdp":4.3},"905":{"spd":18.9,"cdu":27.6,"gruene":7.0,"linke":14.8,"afd":17.6,"fdp":4.1},"906":{"spd":17.8,"cdu":29.0,"gruene":12.1,"linke":16.2,"afd":12.2,"fdp":3.6},"1001":{"spd":15.0,"cdu":22.9,"gruene":3.5,"linke":16.0,"afd":28.0,"fdp":2.2},"1002":{"spd":18.1,"cdu":26.9,"gruene":4.1,"linke":17.5,"afd":20.4,"fdp":2.5},"1003":{"spd":15.0,"cdu":24.6,"gruene":4.3,"linke":14.8,"afd":25.2,"fdp":2.7},"1004":{"spd":15.7,"cdu":36.5,"gruene":6.8,"linke":14.4,"afd":14.7,"fdp":3.0},"1005":{"spd":16.2,"cdu":40.1,"gruene":7.5,"linke":11.5,"afd":13.3,"fdp":4.0},"1006":{"spd":15.3,"cdu":31.9,"gruene":5.0,"linke":14.3,"afd":20.2,"fdp":2.6},"1101":{"spd":14.0,"cdu":34.7,"gruene":4.0,"linke":14.4,"afd":20.9,"fdp":2.1},"1102":{"spd":14.9,"cdu":34.6,"gruene":6.9,"linke":15.9,"afd":15.3,"fdp":2.9},"1103":{"spd":18.5,"cdu":23.1,"gruene":9.0,"linke":19.5,"afd":14.6,"fdp":3.1},"1104":{"spd":16.8,"cdu":18.0,"gruene":17.3,"linke":21.9,"afd":10.7,"fdp":3.0},"1105":{"spd":15.9,"cdu":19.8,"gruene":15.0,"linke":20.9,"afd":12.7,"fdp":2.9},"1106":{"spd":17.2,"cdu":23.2,"gruene":16.6,"linke":18.4,"afd":9.9,"fdp":4.0},"1201":{"spd":19.3,"cdu":34.5,"gruene":12.6,"linke":8.2,"afd":11.8,"fdp":3.0},"1202":{"spd":20.5,"cdu":38.0,"gruene":9.5,"linke":5.4,"afd":13.0,"fdp":3.9},"1203":{"spd":20.7,"cdu":41.7,"gruene":12.9,"linke":3.4,"afd":8.3,"fdp":5.9},"1204":{"spd":20.7,"cdu":39.6,"gruene":12.4,"linke":4.1,"afd":9.9,"fdp":4.8},"1205":{"spd":21.8,"cdu":41.0,"gruene":6.6,"linke":3.9,"afd":14.4,"fdp":3.8},"1206":{"spd":19.0,"cdu":44.0,"gruene":15.3,"linke":3.5,"afd":6.0,"fdp":6.8}},
      // 2023 national Zweitstimmen — uniform-swing baseline (falls back to LAST_ELECTION anyway)
      national2021: { cdu: 28.2, spd: 18.4, gruene: 18.4, linke: 12.2, afd: 9.1, fdp: 4.6, bsw: 0 },
    },
    pollsterMAE: {
      "Forschungsgruppe Wahlen": { BT2025: 0.73, BT2021: 0.90, B2023: 1.86, overall: 1.35 },
      "Infratest dimap":         { BT2025: 1.72, BT2021: 0.82, B2023: 2.37, overall: 1.99 },
      INSA:                      { BT2025: 0.71, BT2021: 0.97, B2023: 2.23, overall: 1.70 },
      Forsa:                     { BT2025: 1.00, BT2021: 1.20, B2023: 0.90, overall: 1.05 },
      // BSW internal poll (Sep-2026, commissioned by the BSW Landesverband from an
      // unidentified French firm): partisan and method-unpublished, so it is
      // down-weighted to the lowest MAE of any Berlin house.
      "BSW (internal)":          { B2023: 4.0, overall: 4.0 },
    },
  },

  serbia: {
    name: 'Serbia',
    seats: 250,
    threshold: 3.0,
    method: 'dhondt',             // D'Hondt (divisors 1,2,3,...), single national district
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single national district; map shows okrug-level winners
    recencyHalfLifeDays: 7,
    parties: {
      sns:  { code: 'SNS',  name: 'Srpska napredna stranka',             name_en: 'Serbian Progressive Party',      color: '#1B4381' },
      sps:  { code: 'SPS',  name: 'Socijalistička partija Srbije',       name_en: 'Socialist Party of Serbia',      color: '#D71920' },
      srs:  { code: 'SRS',  name: 'Srpska radikalna stranka',            name_en: 'Serbian Radical Party',          color: '#1F2A6E' },
      pes:  { code: 'PES',  name: 'Platforma za evropsku Srbiju',        name_en: 'Platform for a European Serbia', color: '#C9A227' },
      nps:  { code: 'NPS',  name: 'Narodni pokret Srbije',               name_en: "People's Movement of Serbia",    color: '#1E3A8A' },
      nada: { code: 'NADA', name: 'Srpska koalicija NADA',               name_en: 'National Democratic Alternative',color: '#7A7A7A' },
      misn: { code: 'MISN', name: 'Mi – snaga naroda',                   name_en: 'We – Power of the People',       color: '#0F4C81' },
      sl:   { code: 'SL',   name: 'Studentska lista',                    name_en: 'Student List',                   color: '#A6192E' },
      // SPN (Serbia Against Violence, 2023) — dissolved coalition. Shown in
      // past-result sections only; `pastOnly` keeps it out of the forecast.
      spn:  { code: 'SPN',  name: 'Srbija protiv nasilja',               name_en: 'Serbia Against Violence',         color: '#E30613', pastOnly: true },
    },
    order: ['sns', 'sl', 'sps', 'pes', 'nps', 'nada', 'misn', 'srs', 'spn'],
    parlOrder: ['sl', 'pes', 'nps', 'sps', 'sns', 'nada', 'misn', 'srs', 'spn'],
    blocs: {
      bloc1: { name: 'Government camp', short: 'GOV', parties: ['sns', 'sps'], color: '#1B4381' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['sl', 'pes', 'nps', 'nada', 'misn', 'srs'], color: '#A6192E' },
    },
    logos: {
      sns: 'img/serbia/SNS.svg', sps: 'img/serbia/SPS.svg', srs: 'img/serbia/SRS.svg',
      pes: 'img/serbia/PES.svg', nps: 'img/serbia/NPS.svg', nada: 'img/serbia/NADA.svg',
      misn: 'img/serbia/MISN.svg', sl: 'img/serbia/SL.svg',
    },
    // Pollster MAE (mean absolute error, %-points) from final party-level polls before each election,
    // averaged over SNS / SPS / main opposition list / smaller opposition list / NADA (+SRS in 2022).
    // Source: en.wikipedia.org/wiki/Opinion_polling_for_the_2023_Serbian_parliamentary_election
    //         en.wikipedia.org/wiki/Opinion_polling_for_the_2022_Serbian_general_election
    // CRTA excluded: it only ran bloc-scenario polling before 2023 (no party-level series), so it
    // is treated as an unknown (weight 1). Note Faktor Plus reports the SPN coalition far below the
    // other houses, which drives up its 2023 MAE.
    pollsterMAE: {
      "Faktor Plus": { 2022: 4.06, 2023: 5.84, overall: 4.95 },
      NSPM:          { 2022: 2.46, 2023: 2.95, overall: 2.71 },
    },
    lastElection: {
      date: '2023-12-17',
      // 2023 Serbian parliamentary election (source: RIK / en.wikipedia.org/wiki/2023_Serbian_parliamentary_election)
      // Coalition baselines: SNS ran as "Serbia Must Not Stop"; NPS was inside SPN; PES/SL did not exist yet.
      results: { sns: 48.07, sps: 6.73, srs: 1.50, pes: 0, nps: 0, nada: 5.16, misn: 4.82, sl: 0, spn: 24.32 },
      seats:   { sns: 129, sps: 18, srs: 0, pes: 0, nps: 0, nada: 13, misn: 13, sl: 0, spn: 65 },
    },
    map: {
      svg: 'img/serbia.svg',
      // 25 okrugs (NSTJ oblast level); Kosovo okrugs excluded (no official data since 1999)
      districts: {
        1:'beograd', 2:'west_backa', 3:'south_banat', 4:'south_backa', 5:'north_banat',
        6:'north_backa', 7:'central_banat', 8:'srem', 9:'zlatibor', 10:'kolubara',
        11:'macva', 12:'moravica', 13:'pomoravlje', 14:'rasina', 15:'raska',
        16:'sumadija', 17:'bor', 18:'branicevo', 19:'zajecar', 20:'jablanica',
        21:'nisava', 22:'pirot', 23:'podunavlje', 24:'pcinja', 25:'toplica',
      },
      // 2023 vote share (%) per okrug (source: RZS dissemination database 07021101, 17 Dec 2023 election)
      gebiete: {
        beograd:      { sns: 37.48, sps: 5.19, srs: 1.21, pes: 0, nps: 0, nada: 6.31, misn: 6.58, sl: 0, spn: 34.38 },
        west_backa:   { sns: 52.29, sps: 4.96, srs: 1.96, pes: 0, nps: 0, nada: 3.57, misn: 3.94, sl: 0, spn: 19.94 },
        south_banat:  { sns: 48.74, sps: 4.91, srs: 1.52, pes: 0, nps: 0, nada: 4.25, misn: 4.77, sl: 0, spn: 25.12 },
        south_backa:  { sns: 45.32, sps: 4.58, srs: 1.92, pes: 0, nps: 0, nada: 5.33, misn: 4.68, sl: 0, spn: 27.05 },
        north_banat:  { sns: 41.97, sps: 3.97, srs: 1.11, pes: 0, nps: 0, nada: 2.45, misn: 2.44, sl: 0, spn: 14.10 },
        north_backa:  { sns: 39.39, sps: 2.71, srs: 1.08, pes: 0, nps: 0, nada: 2.33, misn: 3.09, sl: 0, spn: 17.89 },
        central_banat:{ sns: 50.56, sps: 4.83, srs: 1.77, pes: 0, nps: 0, nada: 5.00, misn: 3.59, sl: 0, spn: 21.43 },
        srem:         { sns: 55.93, sps: 5.34, srs: 2.08, pes: 0, nps: 0, nada: 4.56, misn: 4.78, sl: 0, spn: 17.79 },
        zlatibor:     { sns: 45.78, sps: 6.94, srs: 1.34, pes: 0, nps: 0, nada: 5.77, misn: 3.57, sl: 0, spn: 20.22 },
        kolubara:     { sns: 48.05, sps: 6.43, srs: 1.52, pes: 0, nps: 0, nada: 6.06, misn: 5.11, sl: 0, spn: 22.83 },
        macva:        { sns: 53.01, sps: 8.89, srs: 1.94, pes: 0, nps: 0, nada: 5.25, misn: 3.74, sl: 0, spn: 18.13 },
        moravica:     { sns: 45.56, sps: 6.26, srs: 1.28, pes: 0, nps: 0, nada: 6.31, misn: 5.67, sl: 0, spn: 23.04 },
        pomoravlje:   { sns: 49.90, sps: 14.00, srs: 1.35, pes: 0, nps: 0, nada: 4.44, misn: 4.91, sl: 0, spn: 15.65 },
        rasina:       { sns: 54.46, sps: 7.74, srs: 1.45, pes: 0, nps: 0, nada: 4.69, misn: 3.96, sl: 0, spn: 19.25 },
        raska:        { sns: 43.48, sps: 6.27, srs: 1.03, pes: 0, nps: 0, nada: 4.15, misn: 2.83, sl: 0, spn: 15.56 },
        sumadija:     { sns: 46.80, sps: 7.30, srs: 1.36, pes: 0, nps: 0, nada: 6.31, misn: 4.77, sl: 0, spn: 23.04 },
        bor:          { sns: 55.41, sps: 8.12, srs: 1.18, pes: 0, nps: 0, nada: 2.68, misn: 3.53, sl: 0, spn: 20.43 },
        branicevo:    { sns: 56.07, sps: 9.03, srs: 1.30, pes: 0, nps: 0, nada: 3.54, misn: 3.36, sl: 0, spn: 17.69 },
        zajecar:      { sns: 52.59, sps: 8.23, srs: 1.71, pes: 0, nps: 0, nada: 4.14, misn: 4.33, sl: 0, spn: 19.05 },
        jablanica:    { sns: 56.28, sps: 11.87, srs: 1.65, pes: 0, nps: 0, nada: 3.65, misn: 2.48, sl: 0, spn: 15.29 },
        nisava:       { sns: 48.04, sps: 6.66, srs: 1.45, pes: 0, nps: 0, nada: 4.77, misn: 5.10, sl: 0, spn: 24.37 },
        pirot:        { sns: 55.30, sps: 8.27, srs: 1.91, pes: 0, nps: 0, nada: 2.73, misn: 3.22, sl: 0, spn: 19.58 },
        podunavlje:   { sns: 52.27, sps: 7.18, srs: 1.39, pes: 0, nps: 0, nada: 5.96, misn: 4.99, sl: 0, spn: 18.44 },
        pcinja:       { sns: 49.49, sps: 13.05, srs: 1.24, pes: 0, nps: 0, nada: 2.85, misn: 2.38, sl: 0, spn: 10.59 },
        toplica:      { sns: 62.72, sps: 7.87, srs: 1.39, pes: 0, nps: 0, nada: 3.46, misn: 2.93, sl: 0, spn: 13.05 },
      },
      names: {
        beograd: 'Belgrade', west_backa: 'West Bačka', south_banat: 'South Banat', south_backa: 'South Bačka',
        north_banat: 'North Banat', north_backa: 'North Bačka', central_banat: 'Central Banat', srem: 'Srem',
        zlatibor: 'Zlatibor', kolubara: 'Kolubara', macva: 'Mačva', moravica: 'Moravica', pomoravlje: 'Pomoravlje',
        rasina: 'Rasina', raska: 'Raška', sumadija: 'Šumadija', bor: 'Bor', branicevo: 'Braničevo',
        zajecar: 'Zaječar', jablanica: 'Jablanica', nisava: 'Nišava', pirot: 'Pirot', podunavlje: 'Podunavlje',
        pcinja: 'Pčinja', toplica: 'Toplica',
      },
      // 2023 national vote share — uniform-swing baseline for the district map
      national2021: { sns: 48.07, sps: 6.73, srs: 1.50, pes: 0, nps: 0, nada: 5.16, misn: 4.82, sl: 0, spn: 24.32 },
    },
  },

  latvia: {
    name: 'Latvia',
    seats: 100,
    threshold: 5.0,
    method: 'sainte_lague',       // modified Sainte-Laguë (first divisor 1.4; site uses 1.2)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // 5 multi-member constituencies; we model nationally
    recencyHalfLifeDays: 7,
    parties: {
      as:  { code: 'AS',   name: 'Apvienotais saraksts',           name_en: 'United List',                color: '#FFB300' },
      sv:  { code: 'SV',   name: 'Suverēnā vara',                  name_en: 'Sovereign Power',            color: '#9575CD' },
      lpv: { code: 'LPV',  name: 'Latvija pirmajā vietā',          name_en: 'Latvia First',               color: '#800020' },
      pro: { code: 'P',    name: 'Progresīvie',                    name_en: 'The Progressives',           color: '#FF4500' },
      na:  { code: 'NA',   name: 'Nacionālā Apvienība',            name_en: 'National Alliance',          color: '#D4AF37' },
      jv:  { code: 'JV',   name: 'Jaunā Vienotība',                name_en: 'New Unity',                  color: '#8BC34A' },
      zzs: { code: 'ZZS',  name: 'Zaļo un zemnieku savienība',     name_en: 'Greens and Farmers',        color: '#1B5E20' },
      la:  { code: 'LA',   name: 'Latvijas attīstībai',            name_en: 'For Latvia\'s Development', color: '#FDD835' },
      mmn: { code: 'MMN',  name: 'Mēs mainām noteikumus',          name_en: 'We Change the Rules',       color: '#424242' },
      st:  { code: 'S!',   name: 'Stabilitātei!',                  name_en: 'For Stability!',             color: '#F57C00' },
      sc:  { code: 'SC',   name: 'Saskaņa',                        name_en: 'Harmony',                    color: '#D32F2F' },
      asl: { code: 'ASL',  name: 'Apvienība Jaunlatvieši',         name_en: 'New Latvians',               color: '#960018' },
      jkp: { code: 'JKP',  name: 'Jaunā konservatīvā partija',     name_en: 'New Conservative Party',     color: '#0D47A1' },
      lks: { code: 'LKS',  name: 'Latvijas Krievu savienība',      name_en: 'Latvian Russian Union',      color: '#1976D2' },
    },
    order: ['as', 'sv', 'lpv', 'pro', 'na', 'jv', 'zzs', 'la', 'mmn', 'st', 'sc', 'asl', 'jkp'],
    parlOrder: ['sc', 'pro', 'lks', 'as', 'zzs', 'jv', 'la', 'na', 'st', 'sv', 'lpv', 'asl', 'jkp'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['as', 'jv', 'na', 'zzs'], color: '#FFB300' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['sv', 'lpv', 'pro', 'la', 'mmn', 'st', 'sc', 'asl', 'jkp', 'lks'], color: '#D32F2F' },
    },
    logos: {
      as: 'img/lv/AS.svg', sv: 'img/lv/SV.svg', lpv: 'img/lv/LPV.svg',
      pro: 'img/lv/PRO.svg', na: 'img/lv/NA.svg', jv: 'img/lv/JV.svg',
      zzs: 'img/lv/ZZS.svg', la: 'img/lv/LA.svg', mmn: 'img/lv/MMN.svg',
      st: 'img/lv/ST.svg', sc: 'img/lv/SC.svg', asl: 'img/lv/ASL.svg',
      jkp: 'img/lv/JKP.svg', lks: 'img/lv/LKS.svg',
    },
    lastElection: {
      date: '2022-10-01',
      // 2022 Saeima official result (source: CVK / en.wikipedia.org)
      results: { as: 11.14, sv: 3.28, lpv: 6.31, pro: 6.23, na: 9.40, jv: 19.19, zzs: 12.58, la: 5.03, mmn: 0, st: 6.88, sc: 4.86, asl: 0, jkp: 0, lks: 3.67 },
      seats:   { as: 15, sv: 0, lpv: 9, pro: 10, na: 13, jv: 26, zzs: 16, la: 0, mmn: 0, st: 11, sc: 0, asl: 0, jkp: 0, lks: 0 },
    },
    map: {
      svg: 'img/latvia.svg',
      // 5 electoral districts (Saeima constituencies); numeric keys match
      // the __01..__05 path ids in latvia.svg (default selector path[id^="_"])
      districts: { 1: 'riga', 2: 'vidzeme', 3: 'latgale', 4: 'zemgale', 5: 'kurzeme' },
      // 2022 vote share (%) per constituency (source: CVK / en.wikipedia.org)
      // Parties without exact per-constituency data use estimated values
      gebiete: {
        riga:      { as: 6.91, sv: 4.0, lpv: 8.59, pro: 9.05, na: 7.14, jv: 20.59, zzs: 5.51, la: 7.0, mmn: 0, st: 9.15, sc: 6.0, asl: 0, jkp: 0, lks: 4.0 },
        vidzeme:   { as: 12.62, sv: 2.0, lpv: 5.14, pro: 5.95, na: 11.39, jv: 23.46, zzs: 12.10, la: 5.0, mmn: 0, st: 3.04, sc: 2.0, asl: 0, jkp: 0, lks: 1.0 },
        latgale:   { as: 5.12, sv: 8.0, lpv: 6.53, pro: 2.46, na: 5.78, jv: 6.97, zzs: 14.54, la: 3.0, mmn: 0, st: 18.56, sc: 12.0, asl: 0, jkp: 0, lks: 10.0 },
        zemgale:   { as: 12.42, sv: 1.5, lpv: 4.56, pro: 4.35, na: 12.16, jv: 18.75, zzs: 19.55, la: 4.0, mmn: 0, st: 3.02, sc: 1.5, asl: 0, jkp: 0, lks: 0.5 },
        kurzeme:   { as: 22.05, sv: 1.0, lpv: 4.27, pro: 4.80, na: 10.25, jv: 16.44, zzs: 21.10, la: 4.0, mmn: 0, st: 2.17, sc: 1.0, asl: 0, jkp: 0, lks: 0.5 },
      },
      names: {
        riga: 'Rīga', vidzeme: 'Vidzeme', latgale: 'Latgale', zemgale: 'Zemgale', kurzeme: 'Kurzeme',
      },
      national2021: { as: 11.14, sv: 3.28, lpv: 6.31, pro: 6.23, na: 9.40, jv: 19.19, zzs: 12.58, la: 5.03, mmn: 0, st: 6.88, sc: 4.86, asl: 0, jkp: 0, lks: 3.67 },
    },
    pollsterMAE: {
      SKDS:             { overall: 1.50 },
      'Latvijas Fakti': { overall: 1.50 },
      Gemius:           { overall: 2.00 },
    },
  },

  brazil: {
    name: 'Brazil',
    // Two-round presidential election (4 Oct 2026, runoff 25 Oct). Presidential
    // layout: hideBlocs drops the bloc/majority cards, mapOnly replaces the
    // parliament diagram with the 27-UF map. The seat engine is repurposed for
    // the federative units ("seats" = UFs a candidate leads in).
    seats: 27,
    threshold: 5.0,
    method: 'hare_niemeyer',
    seatBased: false,             // polls report first-round vote intentions (%)
    constituencies: false,        // map = 27 UFs colored by projected state winner
    recencyHalfLifeDays: 7,
    hideBlocs: true,
    mapOnly: true,
    parties: {
      lula:    { code: 'Lula',    name: 'Luiz Inácio Lula da Silva',        name_en: 'Luiz Inácio Lula da Silva',  color: '#DA251C' },
      flavio:  { code: 'Flávio',  name: 'Flávio Bolsonaro',                 name_en: 'Flávio Bolsonaro',           color: '#002776' },
      cury:    { code: 'Cury',    name: 'Augusto Cury',                     name_en: 'Augusto Cury',               color: '#F5A800' },
      caiado:  { code: 'Caiado',  name: 'Ronaldo Caiado',                   name_en: 'Ronaldo Caiado',             color: '#7B1FA2' },
      renan:   { code: 'Santos',  name: 'Renan Santos',                     name_en: 'Renan Santos',               color: '#37474F' },
      zema:    { code: 'Zema',    name: 'Romeu Zema',                       name_en: 'Romeu Zema',                 color: '#F26522' },
      margal:  { code: 'Marçal',  name: 'Pablo Marçal',                     name_en: 'Pablo Marçal',               color: '#009B3A' },
      samara:  { code: 'Samara',  name: 'Samara Martins',                   name_en: 'Samara Martins',             color: '#A50034' },
      edmilson:{ code: 'Edmilson', name: 'Edmilson Costa',                  name_en: 'Edmilson Costa',             color: '#B91C1C' },
      rui:     { code: 'Rui',     name: 'Rui Costa Pimenta',                name_en: 'Rui Costa Pimenta',          color: '#7F1D1D' },
    },
    order: ['lula', 'flavio', 'cury', 'caiado', 'renan', 'zema', 'margal', 'samara', 'edmilson', 'rui'],
    parlOrder: ['lula', 'flavio', 'cury', 'caiado', 'renan', 'zema', 'margal', 'samara', 'edmilson', 'rui'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['lula'], color: '#DA251C' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['flavio', 'cury', 'caiado', 'renan', 'zema', 'margal', 'samara', 'edmilson', 'rui'], color: '#002776' },
    },
    // 2022 first-round valid-vote shares (Lula 48.43, Jair Bolsonaro 43.20,
    // Tebet 4.16, Gomes 3.04, minor 1.17). Bolsonaro bloc mapped to Flávio.
    lastElection: {
      date: '2022-10-02',
      results: { lula: 48.43, flavio: 43.20, cury: 0, caiado: 0, renan: 0, zema: 0, margal: 0, samara: 0, edmilson: 0, rui: 0 },
      seats:   { lula: 0, flavio: 0, cury: 0, caiado: 0, renan: 0, zema: 0, margal: 0, samara: 0, edmilson: 0, rui: 0 },
    },
    // Trend extrapolation toward the first round (4 Oct 2026)
    trend: {
      electionDate: '2026-10-04',
      blend: 0.5,
      maxDaily: 0.3,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
    },
    map: {
      svg: 'img/brazil.svg',
      // path id (UF code) -> district key
      selector: 'id',
      districts: {
        TO:'to', SE:'se', SP:'sp', SC:'sc', RR:'rr', RO:'ro', RS:'rs', RN:'rn', RJ:'rj',
        PI:'pi', PE:'pe', PR:'pr', PB:'pb', PA:'pa', MG:'mg', MS:'ms', MT:'mt', MA:'ma',
        GO:'go', ES:'es', DF:'df', CE:'ce', BA:'ba', AM:'am', AP:'ap', AL:'al', AC:'ac',
      },
      // 2022 first-round valid-vote shares per UF (official TSE via Wikipedia);
      // Tebet/Gomes/minor remain as "Other". Jair Bolsonaro mapped to flavio.
      gebiete: {
        ac: { lula: 27.44, flavio: 64.95 }, al: { lula: 54.61, flavio: 38.45 },
        ap: { lula: 43.86, flavio: 46.31 }, am: { lula: 47.48, flavio: 45.44 },
        ba: { lula: 68.06, flavio: 26.31 }, ce: { lula: 64.36, flavio: 27.62 },
        es: { lula: 39.08, flavio: 54.06 }, df: { lula: 36.94, flavio: 52.74 },
        go: { lula: 38.12, flavio: 54.20 }, ma: { lula: 67.66, flavio: 27.45 },
        mt: { lula: 33.02, flavio: 61.53 }, ms: { lula: 37.42, flavio: 54.95 },
        mg: { lula: 46.43, flavio: 46.06 }, pa: { lula: 50.93, flavio: 42.09 },
        pb: { lula: 62.75, flavio: 31.44 }, pr: { lula: 34.57, flavio: 57.38 },
        pe: { lula: 63.86, flavio: 31.55 }, pi: { lula: 72.62, flavio: 21.86 },
        rj: { lula: 40.16, flavio: 52.23 }, rn: { lula: 61.42, flavio: 32.93 },
        rs: { lula: 40.11, flavio: 51.78 }, ro: { lula: 27.51, flavio: 66.25 },
        rr: { lula: 22.28, flavio: 70.85 }, sc: { lula: 28.39, flavio: 63.98 },
        sp: { lula: 40.18, flavio: 49.58 }, se: { lula: 62.80, flavio: 30.64 },
        to: { lula: 48.63, flavio: 46.06 },
      },
      names: {
        ac: 'Acre', al: 'Alagoas', ap: 'Amapá', am: 'Amazonas', ba: 'Bahia', ce: 'Ceará',
        es: 'Espírito Santo', df: 'Distrito Federal', go: 'Goiás', ma: 'Maranhão',
        mt: 'Mato Grosso', ms: 'Mato Grosso do Sul', mg: 'Minas Gerais', pa: 'Pará',
        pb: 'Paraíba', pr: 'Paraná', pe: 'Pernambuco', pi: 'Piauí', rj: 'Rio de Janeiro',
        rn: 'Rio Grande do Norte', rs: 'Rio Grande do Sul', ro: 'Rondônia', rr: 'Roraima',
        sc: 'Santa Catarina', sp: 'São Paulo', se: 'Sergipe', to: 'Tocantins',
      },
      national2021: { lula: 48.43, flavio: 43.20, cury: 0, caiado: 0, renan: 0, zema: 0, margal: 0, samara: 0, edmilson: 0, rui: 0 },
    },
    // Approximate house-quality weights (no official backtest available yet)
    pollsterMAE: {
      Datafolha:   { overall: 1.50 },
      Quaest:      { overall: 1.80 },
      'Meio/Ideia':{ overall: 2.00 },
      PoderData:   { overall: 2.20 },
      Gerp:        { overall: 2.50 },
      Nexus:       { overall: 1.80 },
      MDA:         { overall: 2.00 },
      Futura:      { overall: 2.20 },
      'Real Time': { overall: 2.20 },
      'Vox Brasil':{ overall: 2.40 },
      AtlasIntel:  { overall: 2.50 },
      Indexa:      { overall: 2.50 },
      Palver:      { overall: 2.60 },
    },
    logos: {
      lula: 'img/br/Lula.svg', flavio: 'img/br/Bolsonaro.svg', caiado: 'img/br/Caiado.svg',
      cury: 'img/br/Cury.svg', renan: 'img/br/Santos.svg', zema: 'img/br/Zema.svg',
      samara: 'img/br/Samara.svg', edmilson: 'img/br/Costa.svg',
    },
  },

  austria: {
    name: 'Austria',
    seats: 183,
    threshold: 4.0,
    method: 'dhondt',
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // PR at three levels (national/state/regional); we model nationally
    recencyHalfLifeDays: 14,
    parties: {
      fpoe:  { code: 'FPÖ',   name: 'Freedom Party of Austria',             name_en: 'Freedom Party of Austria',             color: '#0057A8' },
      oevp:  { code: 'ÖVP',   name: "Austrian People's Party",              name_en: "Austrian People's Party",              color: '#63C3D2' },
      spoe:  { code: 'SPÖ',   name: 'Social Democratic Party of Austria',    name_en: 'Social Democratic Party of Austria',    color: '#CE0000' },
      neos:  { code: 'NEOS',  name: 'NEOS – The New Austria',                name_en: 'NEOS – The New Austria',                color: '#E4118D' },
      gruene:{ code: 'GRÜNE', name: 'The Greens – The Green Alternative',    name_en: 'The Greens – The Green Alternative',    color: '#84B414' },
      kpoe:  { code: 'KPÖ',   name: 'Communist Party of Austria',            name_en: 'Communist Party of Austria',            color: '#800000' },
    },
    order: ['fpoe', 'oevp', 'spoe', 'neos', 'gruene', 'kpoe'],
    parlOrder: ['fpoe', 'oevp', 'spoe', 'neos', 'gruene', 'kpoe'],
    // Blocs = the incumbent ÖVP–SPÖ–NEOS "Ampel" coalition vs the opposition
    blocs: {
      bloc1: { name: 'Coalition', short: 'GOV', parties: ['oevp', 'spoe', 'neos'], color: '#63C3D2' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['fpoe', 'gruene', 'kpoe'], color: '#0057A8' },
    },
    lastElection: {
      date: '2024-09-29',
      // 2024 Nationalrat official result (source: en.wikipedia.org/wiki/2024_Austrian_legislative_election)
      results: { fpoe: 28.8, oevp: 26.3, spoe: 21.1, neos: 9.1, gruene: 8.2, kpoe: 2.4 },
      seats:   { fpoe: 57, oevp: 51, spoe: 41, neos: 18, gruene: 16, kpoe: 0 },
    },
    map: {
      svg: 'img/austria.svg',
      selector: 'id',          // paths carry control ids per Bundesland (the provided Inkscape map)
      districts: {
        Burgenland: 'burgenland', Carinthia: 'carinthia', LowerAustria: 'lower_austria',
        Salzburg: 'salzburg', Styria: 'styria', Tyrol: 'tyrol', UpperAustria: 'upper_austria',
        Vienna: 'vienna', Vorarlberg: 'vorarlberg',
      },
      // 2024 Nationalrat share % per Bundesland (source: en.wikipedia.org 2024 election, "Results by state")
      gebiete: {
        burgenland:     { fpoe: 28.8, oevp: 28.6, spoe: 27.0, neos: 6.5, gruene: 4.7, kpoe: 0 },
        carinthia:      { fpoe: 38.4, oevp: 20.8, spoe: 23.1, neos: 7.8, gruene: 4.7, kpoe: 0 },
        lower_austria:  { fpoe: 29.2, oevp: 29.9, spoe: 20.2, neos: 8.5, gruene: 6.7, kpoe: 0 },
        upper_austria:  { fpoe: 30.5, oevp: 26.3, spoe: 20.3, neos: 8.3, gruene: 8.4, kpoe: 0 },
        salzburg:       { fpoe: 27.7, oevp: 31.6, spoe: 16.8, neos: 9.0, gruene: 8.5, kpoe: 0 },
        styria:         { fpoe: 32.2, oevp: 27.0, spoe: 18.6, neos: 8.2, gruene: 7.6, kpoe: 0 },
        tyrol:          { fpoe: 28.7, oevp: 31.0, spoe: 15.4, neos: 10.6, gruene: 8.1, kpoe: 0 },
        vorarlberg:     { fpoe: 27.1, oevp: 29.1, spoe: 13.1, neos: 12.6, gruene: 11.4, kpoe: 0 },
        vienna:         { fpoe: 20.7, oevp: 17.4, spoe: 29.9, neos: 11.4, gruene: 12.3, kpoe: 0 },
      },
      names: {
        burgenland: 'Burgenland', carinthia: 'Carinthia', lower_austria: 'Lower Austria',
        upper_austria: 'Upper Austria', salzburg: 'Salzburg', styria: 'Styria',
        tyrol: 'Tyrol', vorarlberg: 'Vorarlberg', vienna: 'Vienna',
      },
      // national baseline for the uniform-swing projection (= 2024 result)
      national2021: { fpoe: 28.8, oevp: 26.3, spoe: 21.1, neos: 9.1, gruene: 8.2, kpoe: 2.4 },
    },
    pollsterMAE: {
      IFDD:                { AT2024: 1.06, overall: 1.06 },
      'Unique Research':   { AT2024: 1.10, overall: 1.10 },
      'Market-Lazarsfeld': { AT2024: 1.22, overall: 1.22 },
      OGM:                 { AT2024: 1.27, overall: 1.27 },
      Spectra:             { AT2024: 1.28, overall: 1.28 },
      Market:              { AT2024: 1.63, overall: 1.63 },
      INSA:                { AT2024: 1.75, overall: 1.75 },
    },
    maeKey: 'AT2024',
    logos: {
      fpoe: 'img/at/FPO.svg', oevp: 'img/at/OVP.svg', spoe: 'img/at/SPO.svg',
      neos: 'img/at/NEOS.svg', gruene: 'img/at/GRUNE.svg', kpoe: 'img/at/KPO.svg',
    },
  },
  czechia: {
    name: 'Czechia',
    seats: 200,
    threshold: 5.0,
    method: 'imperiali_hb',     // Chamber of Deputies: two-tier system (Act 189/2021) — first scrutiny LR-Imperiali per region, second scrutiny LR-Hagenbach-Bischoff nationally
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // PR across 14 regions; map colors per-okres winners (2025 list-level shares)
    recencyHalfLifeDays: 14,
    parties: {
      ano: { code: 'ANO', name: 'ANO 2011', name_en: 'ANO', color: '#261060' },
      ods: { code: 'ODS', name: 'Civic Democratic Party', name_en: 'Civic Democratic Party', color: '#034EA2' },
      kducsl: { code: 'KDU-ČSL', name: 'Christian and Democratic Union', name_en: 'Christian and Democratic Union', color: '#FFDC00' },
      top09: { code: 'TOP 09', name: 'TOP 09', name_en: 'TOP 09', color: '#993366' },
      stan: { code: 'STAN', name: 'Mayors and Independents', name_en: 'Mayors and Independents', color: '#CD0F69' },
      pirati: { code: 'Piráti', name: 'Czech Pirate Party', name_en: 'Czech Pirate Party', color: '#000000' },
      zeleni: { code: 'Zelení', name: 'Green Party', name_en: 'Green Party', color: '#00AD43' },
      spd: { code: 'SPD', name: 'Freedom and Direct Democracy', name_en: 'Freedom and Direct Democracy', color: '#6696AE' },
      svobodni: { code: 'Svobodní', name: 'Free', name_en: 'Free', color: '#009682' },
      pro: { code: 'PRO', name: 'Law, Respect, Expertise', name_en: 'Law, Respect, Expertise', color: '#009FBF' },
      trikolora: { code: 'Trikolóra', name: 'Tricolour Civic Movement', name_en: 'Tricolour Civic Movement', color: '#2738CD' },
      auto: { code: 'AUTO', name: 'Motorists for Themselves', name_en: 'Motorists for Themselves', color: '#009EE3' },
      kscm: { code: 'KSČM', name: 'Communist Party of Bohemia and Moravia', name_en: 'Communist Party of Bohemia and Moravia', color: '#C10506' },
      socdem: { code: 'SOCDEM', name: 'Social Democracy', name_en: 'Social Democracy', color: '#FF5F61' },
      prisaha: { code: 'Přísaha', name: 'Oath', name_en: 'Oath', color: '#0033FF' },
      nc: { code: 'NC', name: 'Our Czechia', name_en: 'Our Czechia', color: '#e42612' },
      spolu: { code: 'SPOLU', name: 'SPOLU (ODS, KDU-ČSL, TOP 09)', name_en: 'SPOLU (ODS, KDU-ČSL, TOP 09)', color: '#00A651', pastOnly: true },
    },
    // Poll-table column order (the 16 parties with logos) + dissolved SPOLU;
    // Not modelled (no logo; always '–' in polls): Stačilo! folds into 'Other'.
    order: ['ano', 'ods', 'kducsl', 'top09', 'stan', 'pirati', 'zeleni', 'spd', 'svobodni', 'pro', 'trikolora', 'auto', 'kscm', 'socdem', 'prisaha', 'nc', 'spolu'],
    parlOrder: ['pirati', 'zeleni', 'top09', 'stan', 'ods', 'kducsl', 'prisaha', 'kscm', 'socdem', 'nc', 'pro', 'trikolora', 'svobodni', 'auto', 'spd', 'ano', 'spolu'],
    // Incumbent ANO-led camp (ANO + SPD + Svobodní + PRO + Tricolour + Motorists) vs the pre-2025 opposition bloc (SPOLU members + STAN + Piráti + Zelení)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ano', 'spd', 'svobodni', 'pro', 'trikolora', 'auto'], color: '#261060' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['ods', 'kducsl', 'top09', 'stan', 'pirati', 'zeleni'], color: '#8497B0' },
    },
    lastElection: {
      date: '2025-10-04',
      // 2025 Chamber of Deputies. Three-member parties ran inside SPOLU (base 0);
      // Zelení ran on the Piráti list (base 0); Stačilo! 4.31% below threshold → folds to 'Other'.
      results: { ano: 34.52, ods: 0, kducsl: 0, top09: 0, stan: 11.23, pirati: 8.97, zeleni: 0, spd: 7.78, svobodni: 0, pro: 0, trikolora: 0, auto: 6.77, kscm: 0, socdem: 0, prisaha: 1.08, nc: 0, spolu: 23.36 },
      seats:   { ano: 80, ods: 0, kducsl: 0, top09: 0, stan: 22, pirati: 18, zeleni: 0, spd: 15, svobodni: 0, pro: 0, trikolora: 0, auto: 13, kscm: 0, socdem: 0, prisaha: 0, nc: 0, spolu: 52 },
    },
    map: {
      svg: 'img/Czechia.svg',
      selector: 'id',           // paths carry okres ids
      districts: {
        ceskykrumlov: 'ceskykrumlov', ceskebudejovice: 'ceskebudejovice', prachatice: 'prachatice', jindrichuvhradec: 'jindrichuvhradec',
        strakonice: 'strakonice', tabor: 'tabor', pisek: 'pisek', uherskehradiste: 'uherskehradiste',
        zlin: 'zlin', kromeriz: 'kromeriz', vsetin: 'vsetin', breclav: 'breclav',
        znojmo: 'znojmo', hodonin: 'hodonin', 'brno-venkov': 'brno-venkov', vyskov: 'vyskov',
        'brno-mesto': 'brno-mesto', blansko: 'blansko', trebic: 'trebic', jihlava: 'jihlava',
        pelhrimov: 'pelhrimov', zdarnadsazavou: 'zdarnadsazavou', havlickuvbrod: 'havlickuvbrod', klatovy: 'klatovy',
        domazlice: 'domazlice', 'plzen-jih': 'plzen-jih', tachov: 'tachov', 'plzen-mesto': 'plzen-mesto',
        rokycany: 'rokycany', 'plzen-sever': 'plzen-sever', 'frydek-mistek': 'frydek-mistek', novyjicin: 'novyjicin',
        'ostrava-mesto': 'ostrava-mesto', opava: 'opava', karvina: 'karvina', bruntal: 'bruntal',
        svitavy: 'svitavy', chrudim: 'chrudim', ustinadorlici: 'ustinadorlici', pardubice: 'pardubice',
        praha: 'praha', prostejov: 'prostejov', prerov: 'prerov', olomouc: 'olomouc',
        sumperk: 'sumperk', jesenik: 'jesenik', benesov: 'benesov', pribram: 'pribram',
        kutnahora: 'kutnahora', beroun: 'beroun', 'praha-zapad': 'praha-zapad', 'praha-vychod': 'praha-vychod',
        kolin: 'kolin', rakovnik: 'rakovnik', kladno: 'kladno', nymburk: 'nymburk',
        mladaboleslav: 'mladaboleslav', melnik: 'melnik', rychnovnadkneznou: 'rychnovnadkneznou', hradeckralove: 'hradeckralove',
        jicin: 'jicin', nachod: 'nachod', trutnov: 'trutnov', ceskalipa: 'ceskalipa',
        semily: 'semily', liberec: 'liberec', jablonecnadnisou: 'jablonecnadnisou', louny: 'louny',
        chomutov: 'chomutov', litomerice: 'litomerice', most: 'most', teplice: 'teplice',
        ustinadlabem: 'ustinadlabem', decin: 'decin', cheb: 'cheb', sokolov: 'sokolov',
        karlovyvary: 'karlovyvary',
      },
      // 2025 share % per okres, at list level (volby.cz ps2025 okres data).
      // ODS/KDU-ČSL/TOP09 were inside SPOLU; Zelení inside Piráti → they are 0 here.
      gebiete: {
        ceskykrumlov: { ano: 36.28, stan: 9.38, pirati: 6.98, spd: 8.84, auto: 7.51, prisaha: 1.11, spolu: 22.61 },
        ceskebudejovice: { ano: 31.13, stan: 11.82, pirati: 8.05, spd: 7.57, auto: 7.06, prisaha: 1.12, spolu: 26.51 },
        prachatice: { ano: 36.35, stan: 10.79, pirati: 6.93, spd: 8.17, auto: 7.33, prisaha: 0.94, spolu: 22.39 },
        jindrichuvhradec: { ano: 37.5, stan: 9.72, pirati: 6.79, spd: 8.43, auto: 6.79, prisaha: 1.53, spolu: 21.98 },
        strakonice: { ano: 38.49, stan: 10.45, pirati: 7.1, spd: 8.44, auto: 7.35, prisaha: 1.05, spolu: 20.3 },
        tabor: { ano: 34.89, stan: 11.31, pirati: 8.14, spd: 7.22, auto: 6.67, prisaha: 1.14, spolu: 23.36 },
        pisek: { ano: 36.08, stan: 9.84, pirati: 8.0, spd: 7.95, auto: 6.98, prisaha: 1.09, spolu: 23.03 },
        uherskehradiste: { ano: 34.77, stan: 10.79, pirati: 7.31, spd: 8.11, auto: 6.18, prisaha: 1.11, spolu: 24.93 },
        zlin: { ano: 33.55, stan: 10.86, pirati: 8.25, spd: 8.38, auto: 6.59, prisaha: 1.07, spolu: 25.5 },
        kromeriz: { ano: 38.66, stan: 8.36, pirati: 6.95, spd: 10.02, auto: 6.87, prisaha: 1.34, spolu: 19.96 },
        vsetin: { ano: 33.94, stan: 10.08, pirati: 7.21, spd: 8.92, auto: 7.33, prisaha: 1.01, spolu: 24.99 },
        breclav: { ano: 36.37, stan: 8.96, pirati: 7.32, spd: 7.94, auto: 6.67, prisaha: 1.77, spolu: 24.0 },
        znojmo: { ano: 44.98, stan: 7.63, pirati: 5.9, spd: 8.59, auto: 6.35, prisaha: 1.42, spolu: 18.02 },
        hodonin: { ano: 38.22, stan: 8.08, pirati: 6.51, spd: 8.81, auto: 6.02, prisaha: 1.15, spolu: 24.16 },
        'brno-venkov': { ano: 31.29, stan: 10.52, pirati: 8.13, spd: 7.23, auto: 6.75, prisaha: 1.67, spolu: 28.32 },
        vyskov: { ano: 35.76, stan: 8.35, pirati: 7.24, spd: 8.81, auto: 7.06, prisaha: 1.2, spolu: 23.9 },
        'brno-mesto': { ano: 25.17, stan: 10.54, pirati: 13.14, spd: 6.54, auto: 5.25, prisaha: 1.09, spolu: 32.79 },
        blansko: { ano: 35.04, stan: 8.59, pirati: 8.18, spd: 8.3, auto: 6.98, prisaha: 1.53, spolu: 23.97 },
        trebic: { ano: 38.8, stan: 10.84, pirati: 6.82, spd: 7.87, auto: 6.61, prisaha: 1.2, spolu: 21.16 },
        jihlava: { ano: 33.73, stan: 10.57, pirati: 7.7, spd: 8.17, auto: 7.0, prisaha: 1.31, spolu: 25.34 },
        pelhrimov: { ano: 36.07, stan: 15.66, pirati: 6.55, spd: 6.86, auto: 6.75, prisaha: 0.95, spolu: 20.84 },
        zdarnadsazavou: { ano: 34.35, stan: 12.76, pirati: 7.18, spd: 6.91, auto: 6.96, prisaha: 1.26, spolu: 24.55 },
        havlickuvbrod: { ano: 37.95, stan: 10.18, pirati: 6.88, spd: 6.57, auto: 6.61, prisaha: 1.21, spolu: 23.62 },
        klatovy: { ano: 38.5, stan: 9.43, pirati: 6.91, spd: 8.83, auto: 7.35, prisaha: 0.98, spolu: 21.21 },
        domazlice: { ano: 40.44, stan: 9.7, pirati: 6.08, spd: 10.06, auto: 7.58, prisaha: 0.99, spolu: 18.42 },
        'plzen-jih': { ano: 40.27, stan: 11.08, pirati: 6.44, spd: 9.26, auto: 7.55, prisaha: 1.11, spolu: 17.68 },
        tachov: { ano: 46.23, stan: 8.33, pirati: 6.16, spd: 10.17, auto: 7.27, prisaha: 0.94, spolu: 13.2 },
        'plzen-mesto': { ano: 30.95, stan: 11.73, pirati: 10.01, spd: 8.28, auto: 6.43, prisaha: 0.99, spolu: 26.03 },
        rokycany: { ano: 40.58, stan: 10.66, pirati: 7.24, spd: 8.23, auto: 7.17, prisaha: 0.98, spolu: 18.75 },
        'plzen-sever': { ano: 37.84, stan: 11.0, pirati: 7.45, spd: 8.75, auto: 7.81, prisaha: 1.11, spolu: 20.38 },
        'frydek-mistek': { ano: 40.03, stan: 8.76, pirati: 7.05, spd: 8.14, auto: 6.9, prisaha: 1.17, spolu: 20.31 },
        novyjicin: { ano: 38.9, stan: 8.62, pirati: 7.53, spd: 8.63, auto: 6.93, prisaha: 0.97, spolu: 19.89 },
        'ostrava-mesto': { ano: 43.03, stan: 8.99, pirati: 7.76, spd: 7.62, auto: 6.26, prisaha: 0.97, spolu: 18.07 },
        opava: { ano: 42.94, stan: 8.98, pirati: 6.56, spd: 7.1, auto: 6.79, prisaha: 0.89, spolu: 20.17 },
        karvina: { ano: 51.78, stan: 5.95, pirati: 5.73, spd: 8.63, auto: 5.84, prisaha: 0.95, spolu: 13.22 },
        bruntal: { ano: 48.32, stan: 6.74, pirati: 5.38, spd: 10.46, auto: 6.49, prisaha: 0.69, spolu: 12.95 },
        svitavy: { ano: 37.01, stan: 9.97, pirati: 7.14, spd: 7.73, auto: 7.47, prisaha: 1.15, spolu: 22.51 },
        chrudim: { ano: 38.07, stan: 10.69, pirati: 6.38, spd: 7.11, auto: 8.52, prisaha: 1.07, spolu: 21.89 },
        ustinadorlici: { ano: 32.46, stan: 11.65, pirati: 8.06, spd: 8.15, auto: 7.78, prisaha: 1.37, spolu: 23.82 },
        pardubice: { ano: 32.72, stan: 11.43, pirati: 8.62, spd: 7.63, auto: 7.43, prisaha: 1.06, spolu: 25.25 },
        praha: { ano: 19.9, stan: 13.37, pirati: 16.85, spd: 5.24, auto: 5.16, prisaha: 0.71, spolu: 33.94 },
        prostejov: { ano: 39.79, stan: 8.54, pirati: 6.32, spd: 10.43, auto: 6.45, prisaha: 1.33, spolu: 19.74 },
        prerov: { ano: 41.31, stan: 8.29, pirati: 6.34, spd: 10.13, auto: 6.97, prisaha: 1.14, spolu: 18.12 },
        olomouc: { ano: 34.9, stan: 10.59, pirati: 9.18, spd: 8.2, auto: 6.57, prisaha: 1.26, spolu: 22.58 },
        sumperk: { ano: 41.24, stan: 9.65, pirati: 6.09, spd: 9.38, auto: 6.7, prisaha: 1.07, spolu: 18.52 },
        jesenik: { ano: 42.79, stan: 6.47, pirati: 5.89, spd: 12.19, auto: 6.28, prisaha: 0.73, spolu: 18.03 },
        benesov: { ano: 35.32, stan: 12.82, pirati: 7.91, spd: 6.84, auto: 7.88, prisaha: 1.18, spolu: 21.95 },
        pribram: { ano: 35.07, stan: 12.22, pirati: 8.31, spd: 7.24, auto: 7.99, prisaha: 1.19, spolu: 21.39 },
        kutnahora: { ano: 38.41, stan: 12.55, pirati: 7.27, spd: 7.46, auto: 7.34, prisaha: 1.05, spolu: 19.4 },
        beroun: { ano: 30.09, stan: 13.19, pirati: 9.56, spd: 6.6, auto: 7.71, prisaha: 1.04, spolu: 25.47 },
        'praha-zapad': { ano: 20.32, stan: 17.23, pirati: 12.19, spd: 5.11, auto: 6.75, prisaha: 0.86, spolu: 32.8 },
        'praha-vychod': { ano: 22.95, stan: 15.66, pirati: 10.4, spd: 5.79, auto: 7.4, prisaha: 0.89, spolu: 32.15 },
        kolin: { ano: 34.69, stan: 16.29, pirati: 7.52, spd: 8.02, auto: 8.02, prisaha: 1.04, spolu: 18.17 },
        rakovnik: { ano: 38.59, stan: 10.67, pirati: 7.63, spd: 8.19, auto: 7.91, prisaha: 1.12, spolu: 18.37 },
        kladno: { ano: 34.35, stan: 11.77, pirati: 8.82, spd: 8.03, auto: 7.73, prisaha: 1.3, spolu: 21.74 },
        nymburk: { ano: 32.5, stan: 13.5, pirati: 9.2, spd: 7.48, auto: 7.83, prisaha: 1.01, spolu: 22.26 },
        mladaboleslav: { ano: 33.65, stan: 12.64, pirati: 7.57, spd: 8.2, auto: 9.08, prisaha: 1.05, spolu: 21.92 },
        melnik: { ano: 33.79, stan: 11.88, pirati: 8.69, spd: 7.86, auto: 8.32, prisaha: 1.05, spolu: 22.54 },
        rychnovnadkneznou: { ano: 34.0, stan: 10.75, pirati: 7.33, spd: 8.36, auto: 8.66, prisaha: 1.08, spolu: 23.25 },
        hradeckralove: { ano: 32.43, stan: 11.8, pirati: 8.94, spd: 6.96, auto: 7.08, prisaha: 1.21, spolu: 25.78 },
        jicin: { ano: 36.16, stan: 16.52, pirati: 6.79, spd: 7.79, auto: 7.5, prisaha: 1.06, spolu: 18.24 },
        nachod: { ano: 34.02, stan: 10.7, pirati: 8.04, spd: 7.97, auto: 7.55, prisaha: 1.03, spolu: 24.88 },
        trutnov: { ano: 32.97, stan: 12.19, pirati: 8.19, spd: 8.2, auto: 7.77, prisaha: 0.96, spolu: 23.29 },
        ceskalipa: { ano: 41.94, stan: 13.18, pirati: 6.45, spd: 9.12, auto: 7.41, prisaha: 0.92, spolu: 14.45 },
        semily: { ano: 29.78, stan: 19.12, pirati: 8.18, spd: 7.75, auto: 7.85, prisaha: 0.97, spolu: 20.31 },
        liberec: { ano: 33.67, stan: 17.09, pirati: 9.03, spd: 8.56, auto: 7.08, prisaha: 0.97, spolu: 17.84 },
        jablonecnadnisou: { ano: 31.7, stan: 15.9, pirati: 8.54, spd: 9.07, auto: 7.39, prisaha: 1.0, spolu: 20.4 },
        louny: { ano: 48.1, stan: 7.08, pirati: 5.88, spd: 9.77, auto: 6.86, prisaha: 1.07, spolu: 15.02 },
        chomutov: { ano: 46.47, stan: 9.2, pirati: 6.53, spd: 9.38, auto: 6.72, prisaha: 1.12, spolu: 14.03 },
        litomerice: { ano: 39.94, stan: 10.29, pirati: 8.08, spd: 8.23, auto: 6.99, prisaha: 1.18, spolu: 18.97 },
        most: { ano: 49.81, stan: 6.7, pirati: 6.41, spd: 9.11, auto: 6.73, prisaha: 1.09, spolu: 13.99 },
        teplice: { ano: 46.4, stan: 7.58, pirati: 7.07, spd: 9.46, auto: 6.7, prisaha: 0.97, spolu: 16.07 },
        ustinadlabem: { ano: 41.38, stan: 11.21, pirati: 8.81, spd: 8.31, auto: 6.56, prisaha: 1.44, spolu: 16.41 },
        decin: { ano: 43.74, stan: 13.86, pirati: 5.72, spd: 9.79, auto: 6.91, prisaha: 1.17, spolu: 12.88 },
        cheb: { ano: 41.87, stan: 10.26, pirati: 6.62, spd: 11.11, auto: 7.36, prisaha: 1.03, spolu: 15.31 },
        sokolov: { ano: 47.37, stan: 10.33, pirati: 5.6, spd: 9.85, auto: 7.33, prisaha: 1.11, spolu: 12.26 },
        karlovyvary: { ano: 39.38, stan: 11.9, pirati: 7.05, spd: 9.8, auto: 7.19, prisaha: 0.99, spolu: 17.79 },
      },
      names: {
        ceskykrumlov: 'Český Krumlov', ceskebudejovice: 'České Budějovice', prachatice: 'Prachatice', jindrichuvhradec: 'Jindřichův Hradec', strakonice: 'Strakonice', tabor: 'Tábor', pisek: 'Písek', uherskehradiste: 'Uherské Hradiště', zlin: 'Zlín', kromeriz: 'Kroměříž', vsetin: 'Vsetín', breclav: 'Břeclav', znojmo: 'Znojmo', hodonin: 'Hodonín', 'brno-venkov': 'Brno-venkov', vyskov: 'Vyškov', 'brno-mesto': 'Brno-město', blansko: 'Blansko', trebic: 'Třebíč', jihlava: 'Jihlava', pelhrimov: 'Pelhřimov', zdarnadsazavou: 'Žďár nad Sázavou', havlickuvbrod: 'Havlíčkův Brod', klatovy: 'Klatovy', domazlice: 'Domažlice', 'plzen-jih': 'Plzeň-jih', tachov: 'Tachov', 'plzen-mesto': 'Plzeň-město', rokycany: 'Rokycany', 'plzen-sever': 'Plzeň-sever', 'frydek-mistek': 'Frýdek-Místek', novyjicin: 'Nový Jičín', 'ostrava-mesto': 'Ostrava-město', opava: 'Opava', karvina: 'Karviná', bruntal: 'Bruntál', svitavy: 'Svitavy', chrudim: 'Chrudim', ustinadorlici: 'Ústí nad Orlicí', pardubice: 'Pardubice', praha: 'Hlavní město Praha', prostejov: 'Prostějov', prerov: 'Přerov', olomouc: 'Olomouc', sumperk: 'Šumperk', jesenik: 'Jeseník', benesov: 'Benešov', pribram: 'Příbram', kutnahora: 'Kutná Hora', beroun: 'Beroun', 'praha-zapad': 'Praha-západ', 'praha-vychod': 'Praha-východ', kolin: 'Kolín', rakovnik: 'Rakovník', kladno: 'Kladno', nymburk: 'Nymburk', mladaboleslav: 'Mladá Boleslav', melnik: 'Mělník', rychnovnadkneznou: 'Rychnov nad Kněžnou', hradeckralove: 'Hradec Králové', jicin: 'Jičín', nachod: 'Náchod', trutnov: 'Trutnov', ceskalipa: 'Česká Lípa', semily: 'Semily', liberec: 'Liberec', jablonecnadnisou: 'Jablonec nad Nisou', louny: 'Louny', chomutov: 'Chomutov', litomerice: 'Litoměřice', most: 'Most', teplice: 'Teplice', ustinadlabem: 'Ústí nad Labem', decin: 'Děčín', cheb: 'Cheb', sokolov: 'Sokolov', karlovyvary: 'Karlovy Vary',
      },
      // 2025 national result — uniform-swing baseline for the per-okres projection
      national2021: { ano: 34.52, ods: 0, kducsl: 0, top09: 0, stan: 11.23, pirati: 8.97, zeleni: 0, spd: 7.78, svobodni: 0, pro: 0, trikolora: 0, auto: 6.77, kscm: 0, socdem: 0, prisaha: 1.08, nc: 0, spolu: 23.36 },
      // Two-tier seat allocation (Act 189/2021): first scrutiny LR-Imperiali per
      // region (quota = region votes/(seats+2)), then national second scrutiny
      // LR-Hagenbach-Bischoff (quota = remainder votes/(unfilled seats+1)).
      // Region seats + 2025 list-level shares per region (volby.cz ps2025).
      regions: {
        praha: { seats: 23, votes: 636042, results: { ano: 19.83, spolu: 33.97, stan: 13.40, pirati: 16.89, spd: 5.23, auto: 5.15, prisaha: 0.71 } },
        stredocesky: { seats: 26, votes: 754016, results: { ano: 31.12, spolu: 24.32, stan: 13.72, pirati: 9.09, spd: 7.06, auto: 7.76, prisaha: 1.05 } },
        jihocesky: { seats: 12, votes: 348347, results: { ano: 34.87, spolu: 23.61, stan: 10.76, pirati: 7.59, spd: 7.93, auto: 7.04, prisaha: 1.16 } },
        plzensky: { seats: 12, votes: 302986, results: { ano: 37.31, spolu: 20.99, stan: 10.62, pirati: 7.78, spd: 8.88, auto: 7.16, prisaha: 1.01 } },
        karlovarsky: { seats: 4, votes: 135439, results: { ano: 42.49, spolu: 15.40, stan: 10.94, pirati: 6.49, spd: 10.21, auto: 7.28, prisaha: 1.04 } },
        ustecky: { seats: 13, votes: 387602, results: { ano: 44.85, spolu: 15.40, stan: 9.61, pirati: 6.96, spd: 9.13, auto: 6.79, prisaha: 1.15 } },
        liberecky: { seats: 6, votes: 230132, results: { ano: 34.40, spolu: 18.06, stan: 16.34, pirati: 8.20, spd: 8.65, auto: 7.35, prisaha: 0.97 } },
        kralovehradecky: { seats: 11, votes: 301924, results: { ano: 33.63, spolu: 23.60, stan: 12.21, pirati: 8.05, spd: 7.75, auto: 7.61, prisaha: 1.08 } },
        pardubicky: { seats: 11, votes: 285378, results: { ano: 34.61, spolu: 23.62, stan: 11.05, pirati: 7.71, spd: 7.68, auto: 7.76, prisaha: 1.16 } },
        vysocina: { seats: 11, votes: 287922, results: { ano: 36.11, spolu: 23.28, stan: 11.80, pirati: 7.07, spd: 7.32, auto: 6.80, prisaha: 1.20 } },
        jihomoravsky: { seats: 24, votes: 667622, results: { ano: 32.29, spolu: 27.24, stan: 9.63, pirati: 9.45, spd: 7.54, auto: 6.13, prisaha: 1.34 } },
        olomoucky: { seats: 13, votes: 340059, results: { ano: 38.72, spolu: 20.14, stan: 9.36, pirati: 7.33, spd: 9.43, auto: 6.64, prisaha: 1.18 } },
        zlinsky: { seats: 12, votes: 317779, results: { ano: 34.87, spolu: 24.24, stan: 10.20, pirati: 7.54, spd: 8.74, auto: 6.71, prisaha: 1.11 } },
        moravskoslezsky: { seats: 22, votes: 626469, results: { ano: 43.42, spolu: 17.98, stan: 8.37, pirati: 7.18, spd: 8.09, auto: 6.42, prisaha: 0.96 } },
      },
    },
    pollsterMAE: {
      Ipsos:  { CZ2025: 1.61, overall: 1.61 },
      Kantar: { CZ2025: 1.65, overall: 1.65 },
      STEM:   { CZ2025: 2.42, overall: 2.42 },
      Median: { CZ2025: 2.59, overall: 2.59 },
      NMS:    { CZ2025: 2.81, overall: 2.81 },
    },
    maeKey: 'CZ2025',
    logos: {
      ano: 'img/cz/ANO.svg',
      auto: 'img/cz/AUTO.svg',
      kducsl: 'img/cz/KDUCSL.svg',
      kscm: 'img/cz/KSCM.svg',
      nc: 'img/cz/NC.svg',
      ods: 'img/cz/ODS.svg',
      pirati: 'img/cz/PIRATI.svg',
      prisaha: 'img/cz/PRISAHA.svg',
      pro: 'img/cz/PRO.svg',
      socdem: 'img/cz/SOCDEM.svg',
      spd: 'img/cz/SPD.svg',
      stan: 'img/cz/STAN.svg',
      svobodni: 'img/cz/SVOBODNI.svg',
      top09: 'img/cz/TOP09.svg',
      trikolora: 'img/cz/TRIKOLORA.svg',
      zeleni: 'img/cz/ZELENI.svg',
    },
  },

  // ===== Poland (Sejm 2027) =====
  poland: {
    name: 'Poland',
    seats: 460,
    threshold: 5.0,
    method: 'dhondt',            // Sejm: PR via D'Hondt in 41 multi-member okręgi (per-okręg allocation, seatDistricts)
    seatBased: false,            // polls report vote shares (%)
    constituencies: false,       // PR across 41 okręgów; map colors per-okręg winners (2023 list-level shares)
    recencyHalfLifeDays: 14,
    parties: {
      pis: { code: 'PiS', name: 'Law and Justice', name_en: 'Law and Justice', color: '#26387C' },
      ko: { code: 'KO', name: 'Civic Coalition', name_en: 'Civic Coalition', color: '#E85D02' },
      pl2050: { code: 'PL2050', name: 'Poland 2050', name_en: 'Poland 2050', color: '#FFD700' },
      psl: { code: 'PSL', name: 'Polish People\'s Party', name_en: 'Polish People\'s Party', color: '#66CDAA' },
      lewica: { code: 'Lewica', name: 'The Left', name_en: 'The Left', color: '#E30613' },
      razem: { code: 'Razem', name: 'Together (Left)', name_en: 'Together (Left)', color: '#960018' },
      kwin: { code: 'KWiN', name: 'Confederation', name_en: 'Confederation', color: '#26222D' },
      kkp: { code: 'KKP', name: 'Confederation of the Polish Crown', name_en: 'Confederation of the Polish Crown', color: '#DAA520' },
      r: { code: 'R+', name: 'Development Plus', name_en: 'Development Plus', color: '#87CEEB' },
    },
    // Poll-table column order (2026 tables list all nine registered parties with logos)
    order: ['pis', 'ko', 'pl2050', 'psl', 'lewica', 'razem', 'kwin', 'kkp', 'r'],
    parlOrder: ['lewica', 'razem', 'ko', 'pl2050', 'psl', 'r', 'pis', 'kwin', 'kkp'],
    // Incumbent Tusk-III camp (KO + PL2050 + PSL + Lewica) vs the right-wing opposition; Razem left the coalition (unaligned)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ko', 'pl2050', 'psl', 'lewica'], color: '#E85D02' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['pis', 'kwin', 'kkp', 'r'], color: '#26387C' },
    },
    lastElection: {
      date: '2023-10-15',
      // 2023 Sejm (modelled party-level split of the Third Way / Lewica / Konfederacja alliances;
      // national literal: PiS 35.4/194, KO 30.7/157, PL2050 7.2/33, PSL 5.9/32, NL 6.5/19, Razem 2.1/7,
      // KWiN 6.3/16, KKP 0.9/2; R+ not yet founded → 0).
      results: { pis: 35.4, ko: 30.7, pl2050: 7.2, psl: 5.9, lewica: 6.5, razem: 2.1, kwin: 6.3, kkp: 0.9, r: 0 },
      seats:   { pis: 194, ko: 157, pl2050: 33, psl: 32, lewica: 19, razem: 7, kwin: 16, kkp: 2, r: 0 },
    },
    map: {
      svg: 'img/Poland.svg',
      selector: 'id',           // paths carry okręg city ids
      districts: {
        Legnica: 'Legnica', Walbrzych: 'Walbrzych', Wroclaw: 'Wroclaw', Bydgoszcz: 'Bydgoszcz', Torun: 'Torun',
        Lublin: 'Lublin', Chelm: 'Chelm', ZielonaGora: 'ZielonaGora', Lodz: 'Lodz', PiotrkowTrybunalsk: 'PiotrkowTrybunalsk',
        Sieradz: 'Sieradz', Krakow1: 'Krakow1', Krakow2: 'Krakow2', NowySacz: 'NowySacz', Tarnow: 'Tarnow',
        Plock: 'Plock', Radom: 'Radom', Siedlce: 'Siedlce', Warszawa1: 'Warszawa1', Warszawa2: 'Warszawa2',
        Opole: 'Opole', Krosno: 'Krosno', Rzeszow: 'Rzeszow', Bialystok: 'Bialystok', Gdansk: 'Gdansk',
        Slupsk: 'Slupsk', BielskoBiala1: 'BielskoBiala1', Czestochowa: 'Czestochowa', Katowice1: 'Katowice1',
        BielskoBiala2: 'BielskoBiala2', Katowice2: 'Katowice2', Katowice3: 'Katowice3', Kielce: 'Kielce',
        Elblag: 'Elblag', Olsztyn: 'Olsztyn', Kalisz: 'Kalisz', Konin: 'Konin', Pila: 'Pila', Poznan: 'Poznan',
        Koszalin: 'Koszalin', Szczecin: 'Szczecin',
      },
      // 2023 Sejm seats per okręg (official; sums to 460) — D'Hondt allocated per okręg,
      // not in one national district, so the seat projection matches the real system.
      seatDistricts: {
        Legnica: 12, Walbrzych: 8, Wroclaw: 14, Bydgoszcz: 12, Torun: 13,
        Lublin: 15, Chelm: 12, ZielonaGora: 12, Lodz: 10, PiotrkowTrybunalsk: 9,
        Sieradz: 12, Krakow1: 8, Krakow2: 14, NowySacz: 10, Tarnow: 9,
        Plock: 10, Radom: 9, Siedlce: 12, Warszawa1: 20, Warszawa2: 12,
        Opole: 12, Krosno: 11, Rzeszow: 15, Bialystok: 14, Gdansk: 12,
        Slupsk: 14, BielskoBiala1: 9, Czestochowa: 7, Katowice1: 9, BielskoBiala2: 9,
        Katowice2: 12, Katowice3: 9, Kielce: 16, Elblag: 8, Olsztyn: 10,
        Kalisz: 12, Konin: 9, Pila: 9, Poznan: 10, Koszalin: 8, Szczecin: 12,
      },
      // 2023 share % per okręg, split to modelled parties: TD (PL2050/PSL), Lewica (NL/Razem),
      // Konfederacja (KWiN/KKP) apportioned by the fictional national ratio above; R+ = 0.
      gebiete: {
        Legnica: { pis: 34.8, ko: 33.78, pl2050: 5.91, psl: 4.84, lewica: 7.19, razem: 2.32, kwin: 5.54, kkp: 0.79 },
        Walbrzych: { pis: 33.34, ko: 37.17, pl2050: 6.67, psl: 5.46, lewica: 6.03, razem: 1.95, kwin: 5.27, kkp: 0.75 },
        Wroclaw: { pis: 26.66, ko: 36.94, pl2050: 7.55, psl: 6.19, lewica: 8.58, razem: 2.77, kwin: 6.11, kkp: 0.87 },
        Bydgoszcz: { pis: 30.45, ko: 35.01, pl2050: 8.28, psl: 6.78, lewica: 7.5, razem: 2.42, kwin: 5.62, kkp: 0.8 },
        Torun: { pis: 34.06, ko: 29.52, pl2050: 8.62, psl: 7.06, lewica: 8.5, razem: 2.75, kwin: 5.57, kkp: 0.8 },
        Lublin: { pis: 45.48, ko: 20.32, pl2050: 8.72, psl: 7.15, lewica: 4.32, razem: 1.4, kwin: 7.33, kkp: 1.05 },
        Chelm: { pis: 50.75, ko: 17.4, pl2050: 7.17, psl: 5.87, lewica: 4.25, razem: 1.37, kwin: 6.82, kkp: 0.97 },
        ZielonaGora: { pis: 27.76, ko: 37.73, pl2050: 8.28, psl: 6.79, lewica: 7.01, razem: 2.26, kwin: 5.7, kkp: 0.81 },
        Lodz: { pis: 26.82, ko: 41.07, pl2050: 6.53, psl: 5.36, lewica: 9.24, razem: 2.98, kwin: 4.87, kkp: 0.7 },
        PiotrkowTrybunalsk: { pis: 46.6, ko: 21.69, pl2050: 7.55, psl: 6.18, lewica: 4.83, razem: 1.56, kwin: 6.67, kkp: 0.95 },
        Sieradz: { pis: 41.46, ko: 25.89, pl2050: 7.97, psl: 6.53, lewica: 5.84, razem: 1.89, kwin: 5.97, kkp: 0.85 },
        Krakow1: { pis: 42.86, ko: 24.24, pl2050: 8.23, psl: 6.74, lewica: 4.57, razem: 1.47, kwin: 6.89, kkp: 0.98 },
        Krakow2: { pis: 30.68, ko: 30.73, pl2050: 9.27, psl: 7.59, lewica: 8.34, razem: 2.7, kwin: 6.75, kkp: 0.96 },
        NowySacz: { pis: 53.73, ko: 16.1, pl2050: 6.36, psl: 5.22, lewica: 2.4, razem: 0.78, kwin: 7.64, kkp: 1.09 },
        Tarnow: { pis: 48.67, ko: 17.02, pl2050: 10.24, psl: 8.4, lewica: 3.02, razem: 0.98, kwin: 6.99, kkp: 1.0 },
        Plock: { pis: 44.11, ko: 22.4, pl2050: 9.38, psl: 7.69, lewica: 4.93, razem: 1.59, kwin: 5.71, kkp: 0.81 },
        Radom: { pis: 48.68, ko: 20.96, pl2050: 7.68, psl: 6.3, lewica: 4.04, razem: 1.3, kwin: 6.4, kkp: 0.91 },
        Siedlce: { pis: 48.62, ko: 18.71, pl2050: 8.52, psl: 6.99, lewica: 3.67, razem: 1.18, kwin: 7.18, kkp: 1.03 },
        Warszawa1: { pis: 20.14, ko: 43.23, pl2050: 7.28, psl: 5.97, lewica: 10.17, razem: 3.28, kwin: 5.46, kkp: 0.78 },
        Warszawa2: { pis: 31.74, ko: 35.23, pl2050: 8.28, psl: 6.78, lewica: 5.34, razem: 1.72, kwin: 6.18, kkp: 0.88 },
        Opole: { pis: 31.26, ko: 33.59, pl2050: 7.0, psl: 5.74, lewica: 5.47, razem: 1.77, kwin: 5.68, kkp: 0.81 },
        Krosno: { pis: 54.7, ko: 15.85, pl2050: 7.58, psl: 6.21, lewica: 3.38, razem: 1.09, kwin: 7.54, kkp: 1.08 },
        Rzeszow: { pis: 51.6, ko: 17.7, pl2050: 6.83, psl: 5.59, lewica: 3.68, razem: 1.19, kwin: 8.29, kkp: 1.19 },
        Bialystok: { pis: 42.39, ko: 20.84, pl2050: 10.37, psl: 8.49, lewica: 3.66, razem: 1.18, kwin: 8.57, kkp: 1.22 },
        Gdansk: { pis: 25.2, ko: 41.7, pl2050: 8.08, psl: 6.62, lewica: 7.11, razem: 2.3, kwin: 5.45, kkp: 0.78 },
        Slupsk: { pis: 29.24, ko: 37.91, pl2050: 7.47, psl: 6.12, lewica: 6.3, razem: 2.03, kwin: 6.31, kkp: 0.9 },
        BielskoBiala1: { pis: 36.71, ko: 28.67, pl2050: 8.0, psl: 6.55, lewica: 5.87, razem: 1.9, kwin: 6.86, kkp: 0.98 },
        Czestochowa: { pis: 36.35, ko: 29.11, pl2050: 8.09, psl: 6.63, lewica: 7.11, razem: 2.3, kwin: 5.74, kkp: 0.82 },
        Katowice1: { pis: 30.16, ko: 36.06, pl2050: 7.33, psl: 6.01, lewica: 6.96, razem: 2.25, kwin: 6.08, kkp: 0.87 },
        BielskoBiala2: { pis: 38.06, ko: 29.98, pl2050: 6.84, psl: 5.61, lewica: 5.17, razem: 1.67, kwin: 7.0, kkp: 1.0 },
        Katowice2: { pis: 30.88, ko: 36.79, pl2050: 7.29, psl: 5.98, lewica: 6.39, razem: 2.07, kwin: 5.86, kkp: 0.84 },
        Katowice3: { pis: 29.74, ko: 30.3, pl2050: 5.41, psl: 4.44, lewica: 16.33, razem: 5.27, kwin: 4.98, kkp: 0.71 },
        Kielce: { pis: 47.07, ko: 20.93, pl2050: 7.58, psl: 6.22, lewica: 5.16, razem: 1.67, kwin: 5.73, kkp: 0.82 },
        Elblag: { pis: 35.2, ko: 31.87, pl2050: 8.46, psl: 6.94, lewica: 6.13, razem: 1.98, kwin: 5.72, kkp: 0.82 },
        Olsztyn: { pis: 32.33, ko: 33.07, pl2050: 8.85, psl: 7.26, lewica: 6.11, razem: 1.98, kwin: 6.06, kkp: 0.87 },
        Kalisz: { pis: 35.85, ko: 28.85, pl2050: 8.88, psl: 7.28, lewica: 6.44, razem: 2.08, kwin: 6.11, kkp: 0.87 },
        Konin: { pis: 38.69, ko: 23.99, pl2050: 9.14, psl: 7.49, lewica: 7.17, razem: 2.31, kwin: 6.1, kkp: 0.87 },
        Pila: { pis: 29.11, ko: 34.87, pl2050: 9.71, psl: 7.95, lewica: 5.93, razem: 1.91, kwin: 6.01, kkp: 0.86 },
        Poznan: { pis: 19.57, ko: 44.09, pl2050: 9.09, psl: 7.45, lewica: 9.3, razem: 3.01, kwin: 5.16, kkp: 0.74 },
        Koszalin: { pis: 31.36, ko: 38.69, pl2050: 6.79, psl: 5.56, lewica: 6.59, razem: 2.13, kwin: 5.27, kkp: 0.75 },
        Szczecin: { pis: 28.79, ko: 40.13, pl2050: 6.94, psl: 5.68, lewica: 7.1, razem: 2.29, kwin: 5.2, kkp: 0.74 },
      },
      names: {
        Legnica: 'Legnica', Walbrzych: 'Wałbrzych', Wroclaw: 'Wrocław', Bydgoszcz: 'Bydgoszcz', Torun: 'Toruń',
        Lublin: 'Lublin', Chelm: 'Chełm', ZielonaGora: 'Zielona Góra', Lodz: 'Łódź', PiotrkowTrybunalsk: 'Piotrków Trybunalski',
        Sieradz: 'Sieradz', Krakow1: 'Kraków I', Krakow2: 'Kraków II', NowySacz: 'Nowy Sącz', Tarnow: 'Tarnów',
        Plock: 'Płock', Radom: 'Radom', Siedlce: 'Siedlce', Warszawa1: 'Warszawa I', Warszawa2: 'Warszawa II',
        Opole: 'Opole', Krosno: 'Krosno', Rzeszow: 'Rzeszów', Bialystok: 'Białystok', Gdansk: 'Gdańsk',
        Slupsk: 'Słupsk', BielskoBiala1: 'Bielsko-Biała I', Czestochowa: 'Częstochowa', Katowice1: 'Katowice I',
        BielskoBiala2: 'Bielsko-Biała II', Katowice2: 'Katowice II', Katowice3: 'Katowice III', Kielce: 'Kielce',
        Elblag: 'Elbląg', Olsztyn: 'Olsztyn', Kalisz: 'Kalisz', Konin: 'Konin', Pila: 'Piła', Poznan: 'Poznań',
        Koszalin: 'Koszalin', Szczecin: 'Szczecin',
      },
      // 2023 national result — uniform-swing baseline for the per-okręg projection
      national2021: { pis: 35.4, ko: 30.7, pl2050: 7.2, psl: 5.9, lewica: 6.5, razem: 2.1, kwin: 6.3, kkp: 0.9, r: 0 },
    },
    logos: {
      pis: 'img/pl/PIS.svg',
      ko: 'img/pl/KO.svg',
      pl2050: 'img/pl/PL2050.svg',
      psl: 'img/pl/PSL.svg',
      lewica: 'img/pl/Lewica.svg',
      razem: 'img/pl/Razem.svg',
      kwin: 'img/pl/KWIN.svg',
      kkp: 'img/pl/KKP.svg',
      r: 'img/pl/R.svg',
    },
  },

  netherlands: {
    name: 'Netherlands',
    seats: 150,
    threshold: 0.67,              // no legal threshold; effective ≈ 1/150 ≈ 0.67%
    method: 'dhondt',             // national D'Hondt, single national district
    seatBased: true,              // polls report seat projections
    constituencies: false,
    parties: {
      d66:      { code: 'D66',    name: 'Democrats 66',            name_en: 'Democrats 66',            color: '#00A95C' },
      pvv:      { code: 'PVV',    name: 'Party for Freedom',       name_en: 'Party for Freedom',       color: '#808080' },
      vvd:      { code: 'VVD',    name: 'People\'s Party for Freedom and Democracy', name_en: 'People\'s Party for Freedom and Democracy', color: '#23418B' },
      pro:      { code: 'PRO',    name: 'Progressive Netherlands', name_en: 'Progressive Netherlands', color: '#E30613' },
      cda:      { code: 'CDA',    name: 'Christian Democratic Appeal', name_en: 'Christian Democratic Appeal', color: '#007C48' },
      ja21:     { code: 'JA21',   name: 'JA21',                    name_en: 'JA21',                    color: '#1F2A52' },
      fvd:      { code: 'FvD',    name: 'Forum for Democracy',     name_en: 'Forum for Democracy',     color: '#800000' },
      bbb:      { code: 'BBB',    name: 'Farmer–Citizen Movement', name_en: 'Farmer–Citizen Movement', color: '#9ACD32' },
      denk:     { code: 'DENK',   name: 'DENK',                    name_en: 'DENK',                    color: '#40E0D0' },
      sgp:      { code: 'SGP',    name: 'Reformed Political Party', name_en: 'Reformed Political Party', color: '#FF7F00' },
      pvdd:     { code: 'PvdD',   name: 'Party for the Animals',   name_en: 'Party for the Animals',   color: '#00A651' },
      cu:       { code: 'CU',     name: 'Christian Union',         name_en: 'Christian Union',         color: '#00A0C6' },
      sp:       { code: 'SP',     name: 'Socialist Party',         name_en: 'Socialist Party',         color: '#E3170A' },
      fiftyplus:{ code: '50+',    name: '50PLUS',                  name_en: '50PLUS',                  color: '#800080' },
      volt:     { code: 'VOLT',   name: 'Volt',                    name_en: 'Volt',                    color: '#502379' },
    },
    order: ['d66', 'pvv', 'vvd', 'pro', 'cda', 'ja21', 'fvd', 'bbb', 'denk', 'sgp', 'pvdd', 'cu', 'sp', 'fiftyplus', 'volt'],
    parlOrder: ['sp', 'denk', 'pvdd', 'pro', 'd66', 'volt', 'cu', 'sgp', 'cda', 'fiftyplus', 'vvd', 'ja21', 'bbb', 'fvd', 'pvv'],
    // Government = Jetten cabinet (D66–VVD–CDA); everything else is opposition
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['d66', 'vvd', 'cda'], color: '#00A95C' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['pvv', 'pro', 'ja21', 'fvd', 'bbb', 'denk', 'sgp', 'pvdd', 'cu', 'sp', 'fiftyplus', 'volt'], color: '#8497B0' },
    },
    lastElection: {
      date: '2025-10-29',
      // 2025 Tweede Kamer official result gained by the 15 parties with logos.
      // Polls are reported in seats, so averages run in seat space; `results`
      // holds the actual vote shares (% of valid votes for these 15 parties)
      // for the national map swing baseline, `seats` the official outcome.
      results: {
        d66: 16.94, pvv: 16.66, vvd: 14.24, pro: 12.79, cda: 11.79,
        ja21: 5.95, fvd: 4.54, bbb: 2.65, denk: 2.37, sgp: 2.25,
        pvdd: 2.08, cu: 1.90, sp: 1.89, fiftyplus: 1.43, volt: 1.10,
      },
      seats: {
        d66: 26, pvv: 26, vvd: 22, pro: 20, cda: 18,
        ja21: 9, fvd: 7, bbb: 4, denk: 3, sgp: 3,
        pvdd: 3, cu: 3, sp: 3, fiftyplus: 2, volt: 1,
      },
    },
    map: {
      svg: 'img/Netherlands.svg',
      selector: 'id',             // paths carry control ids per province
      districts: {
        Drenthe: 'drenthe', Overijssel: 'overijssel', Gelderland: 'gelderland', Utrecht: 'utrecht',
        NorthHolland: 'north_holland', Limburg: 'limburg', Flevoland: 'flevoland', Friesland: 'friesland',
        Groningen: 'groningen', Zeeland: 'zeeland', SouthHolland: 'south_holland', NorthBrabant: 'north_brabant',
      },
      // 2025 result per province, vote % (GL/PvdA column folded into PRO)
      gebiete: {
        drenthe:       { d66: 14.0, pvv: 19.2, vvd: 14.5, pro: 11.8, cda: 12.8, ja21: 5.4, fvd: 6.2, bbb: 5.1, denk: 0.5, sgp: 1.0, pvdd: 1.4, cu: 2.4, sp: 2.3, fiftyplus: 1.8, volt: 0.7 },
        flevoland:     { d66: 13.9, pvv: 19.0, vvd: 13.7, pro: 10.7, cda: 9.4, ja21: 5.8, fvd: 6.0, bbb: 3.0, denk: 3.6, sgp: 4.5, pvdd: 1.8, cu: 2.6, sp: 1.9, fiftyplus: 1.5, volt: 0.8 },
        friesland:     { d66: 13.3, pvv: 17.2, vvd: 12.0, pro: 12.2, cda: 15.4, ja21: 5.6, fvd: 6.8, bbb: 5.0, denk: 0.4, sgp: 1.3, pvdd: 1.5, cu: 2.5, sp: 2.1, fiftyplus: 1.3, volt: 0.7 },
        gelderland:    { d66: 16.2, pvv: 15.9, vvd: 13.9, pro: 12.4, cda: 12.8, ja21: 5.8, fvd: 4.5, bbb: 3.1, denk: 1.4, sgp: 4.4, pvdd: 1.9, cu: 2.6, sp: 1.7, fiftyplus: 1.3, volt: 1.0 },
        groningen:     { d66: 16.8, pvv: 16.4, vvd: 11.2, pro: 16.6, cda: 11.1, ja21: 3.8, fvd: 5.1, bbb: 3.5, denk: 0.7, sgp: 1.1, pvdd: 2.5, cu: 3.1, sp: 4.4, fiftyplus: 1.2, volt: 1.2 },
        limburg:       { d66: 14.0, pvv: 25.6, vvd: 14.0, pro: 10.5, cda: 13.3, ja21: 6.1, fvd: 4.8, bbb: 2.6, denk: 1.2, sgp: 0.1, pvdd: 1.5, cu: 0.4, sp: 2.0, fiftyplus: 1.9, volt: 0.8 },
        north_brabant: { d66: 17.8, pvv: 19.1, vvd: 16.7, pro: 10.1, cda: 13.0, ja21: 6.7, fvd: 4.0, bbb: 2.4, denk: 1.8, sgp: 0.5, pvdd: 1.5, cu: 0.6, sp: 1.9, fiftyplus: 1.8, volt: 1.0 },
        north_holland: { d66: 20.4, pvv: 13.2, vvd: 15.3, pro: 16.7, cda: 8.1, ja21: 5.3, fvd: 4.2, bbb: 2.2, denk: 3.4, sgp: 0.4, pvdd: 3.1, cu: 1.0, sp: 2.0, fiftyplus: 1.3, volt: 1.4 },
        overijssel:    { d66: 13.8, pvv: 16.7, vvd: 13.0, pro: 9.9, cda: 15.7, ja21: 6.3, fvd: 5.3, bbb: 4.8, denk: 1.3, sgp: 3.3, pvdd: 1.3, cu: 3.4, sp: 1.7, fiftyplus: 1.3, volt: 0.9 },
        south_holland: { d66: 16.7, pvv: 16.4, vvd: 13.7, pro: 12.8, cda: 10.8, ja21: 6.6, fvd: 4.3, bbb: 1.5, denk: 4.0, sgp: 3.1, pvdd: 2.3, cu: 2.2, sp: 1.7, fiftyplus: 1.4, volt: 1.2 },
        utrecht:       { d66: 20.4, pvv: 11.9, vvd: 13.6, pro: 15.8, cda: 11.3, ja21: 5.1, fvd: 3.4, bbb: 1.6, denk: 3.2, sgp: 2.9, pvdd: 2.7, cu: 2.7, sp: 1.5, fiftyplus: 1.0, volt: 1.6 },
        zeeland:       { d66: 12.0, pvv: 17.6, vvd: 13.6, pro: 9.1, cda: 13.3, ja21: 6.1, fvd: 5.2, bbb: 3.1, denk: 0.8, sgp: 10.2, pvdd: 1.3, cu: 2.7, sp: 1.7, fiftyplus: 1.6, volt: 0.6 },
      },
      names: {
        drenthe: 'Drenthe', overijssel: 'Overijssel', gelderland: 'Gelderland', utrecht: 'Utrecht',
        north_holland: 'North Holland', limburg: 'Limburg', flevoland: 'Flevoland', friesland: 'Friesland',
        groningen: 'Groningen', zeeland: 'Zeeland', south_holland: 'South Holland', north_brabant: 'North Brabant',
      },
      // National baseline for the uniform-swing projection = 2025 result vote %
      national2021: {
        d66: 16.94, pvv: 16.66, vvd: 14.24, pro: 12.79, cda: 11.79,
        ja21: 5.95, fvd: 4.54, bbb: 2.65, denk: 2.37, sgp: 2.25,
        pvdd: 2.08, cu: 1.90, sp: 1.89, fiftyplus: 1.43, volt: 1.10,
      },
    },
    logos: {
      d66: 'img/nl/D66.svg', pvv: 'img/nl/PVV.svg', vvd: 'img/nl/VVD.svg', pro: 'img/nl/PRO.svg',
      cda: 'img/nl/CDA.svg', ja21: 'img/nl/JA21.svg', fvd: 'img/nl/FVD.svg', bbb: 'img/nl/BBB.svg',
      denk: 'img/nl/DENK.svg', sgp: 'img/nl/SGP.svg', pvdd: 'img/nl/PVDD.svg', cu: 'img/nl/CU.svg',
      sp: 'img/nl/SP.svg', fiftyplus: 'img/nl/50+.svg', volt: 'img/nl/VOLT.svg',
    },
  },

  estonia: {
    name: 'Estonia',
    seats: 101,
    threshold: 5.0,               // 5% national threshold
    method: 'dhondt',             // national D'Hondt over 12 multi-seat districts (adjustment seats)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // seat adjustment is national; map colors per 12 electoral districts
    recencyHalfLifeDays: 14,
    parties: {
      isamaa: { code: 'Isamaa', name: 'Isamaa', name_en: 'Isamaa', color: '#009CE2' },
      e200:   { code: 'E200',   name: 'Estonia 200', name_en: 'Estonia 200', color: '#2f2a95' },
      ref:    { code: 'REF',    name: 'Estonian Reform Party', name_en: 'Estonian Reform Party', color: '#FFE200' },
      ekre:   { code: 'EKRE',   name: 'Conservative People\'s Party of Estonia', name_en: 'Conservative People\'s Party of Estonia', color: '#0063AF' },
      kesk:   { code: 'KESK',   name: 'Estonian Centre Party', name_en: 'Estonian Centre Party', color: '#00AA54' },
      sde:    { code: 'SDE',    name: 'Social Democratic Party', name_en: 'Social Democratic Party', color: '#E10600' },
      vl:     { code: 'VL',     name: 'Estonian Left Party', name_en: 'Estonian Left Party', color: '#D33131' },
      koos:   { code: 'Koos',   name: 'Koos', name_en: 'Together', color: '#015AAC' },
      pp:     { code: 'Parem',  name: 'Parempoolsed', name_en: 'Parempoolsed', color: '#FA6100' },
      eer:    { code: 'EER',    name: 'Estonian Greens', name_en: 'Estonian Greens', color: '#96C93D' },
      erk:    { code: 'ERK',    name: 'Estonian Nationalists and Conservatives', name_en: 'Estonian Nationalists and Conservatives', color: '#CFA14A' },
    },
    order: ['isamaa', 'e200', 'ref', 'ekre', 'kesk', 'sde', 'vl', 'koos', 'pp', 'eer', 'erk'],
    parlOrder: ['sde', 'e200', 'ref', 'kesk', 'pp', 'ekre', 'isamaa', 'vl', 'koos', 'eer', 'erk'],
    // Government = the Reform-dominated coalition formed 2025-03-11 (Reform + Estonia 200);
    // everything else is opposition
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ref', 'e200'], color: '#FFE200' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['isamaa', 'ekre', 'kesk', 'sde', 'vl', 'koos', 'pp', 'eer', 'erk'], color: '#8497B0' },
    },
    lastElection: {
      date: '2023-03-05',
      // 2023 Riigikogu official result (source: en.wikipedia.org/wiki/2023_Estonian_parliamentary_election)
      results: { ref: 31.24, ekre: 16.05, kesk: 15.28, e200: 13.33, sde: 9.27, isamaa: 8.21, vl: 2.39, pp: 2.30, koos: 0, eer: 0.96, erk: 0 },
      seats:   { ref: 37, ekre: 17, kesk: 16, e200: 14, sde: 9, isamaa: 8, vl: 0, pp: 0, koos: 0, eer: 0, erk: 0 },
    },
    map: {
      svg: 'img/Estonia.svg',
      selector: 'id',             // paths carry control ids per electoral district (No1–No12)
      districts: {
        No1: 'district1', No2: 'district2', No3: 'district3', No4: 'district4',
        No5: 'district5', No6: 'district6', No7: 'district7', No8: 'district8',
        No9: 'district9', No10: 'district10', No11: 'district11', No12: 'district12',
      },
      // 2023 result per electoral district, vote % (source: 2023 election page "Results by constituency")
      gebiete: {
        district1:  { ref: 31.4, kesk: 20.9, ekre: 9.7, isamaa: 5.6, sde: 10.0, e200: 15.7, eer: 1.1, pp: 2.3, vl: 3.3, koos: 0, erk: 0 },
        district2:  { ref: 29.4, kesk: 29.0, ekre: 9.1, isamaa: 5.4, sde: 8.6, e200: 10.9, eer: 1.0, pp: 1.6, vl: 4.9, koos: 0, erk: 0 },
        district3:  { ref: 34.7, kesk: 18.9, ekre: 11.7, isamaa: 6.5, sde: 8.9, e200: 14.2, eer: 1.1, pp: 2.1, vl: 1.9, koos: 0, erk: 0 },
        district4:  { ref: 40.0, kesk: 10.2, ekre: 14.6, isamaa: 8.3, sde: 7.1, e200: 13.7, eer: 0.7, pp: 3.4, vl: 1.3, koos: 0, erk: 0 },
        district5:  { ref: 27.6, kesk: 11.2, ekre: 19.4, isamaa: 7.8, sde: 13.9, e200: 17.1, eer: 0.9, pp: 2.1, vl: 0, koos: 0, erk: 0 },
        district6:  { ref: 31.1, kesk: 13.4, ekre: 20.5, isamaa: 13.7, sde: 7.5, e200: 8.7, eer: 0.5, pp: 3.0, vl: 1.5, koos: 0, erk: 0 },
        district7:  { ref: 14.1, kesk: 25.8, ekre: 8.4, isamaa: 4.0, sde: 7.6, e200: 8.3, eer: 0.5, pp: 1.0, vl: 14.9, koos: 0, erk: 0 },
        district8:  { ref: 27.8, kesk: 10.2, ekre: 23.3, isamaa: 11.9, sde: 12.9, e200: 10.7, eer: 0.8, pp: 2.1, vl: 0, koos: 0, erk: 0 },
        district9:  { ref: 30.4, kesk: 9.2, ekre: 19.7, isamaa: 12.0, sde: 9.0, e200: 14.6, eer: 1.0, pp: 2.6, vl: 1.5, koos: 0, erk: 0 },
        district10: { ref: 35.9, kesk: 7.3, ekre: 14.5, isamaa: 8.6, sde: 9.9, e200: 18.4, eer: 1.7, pp: 2.0, vl: 1.6, koos: 0, erk: 0 },
        district11: { ref: 24.0, kesk: 13.4, ekre: 26.5, isamaa: 8.5, sde: 12.3, e200: 11.5, eer: 1.3, pp: 2.3, vl: 0, koos: 0, erk: 0 },
        district12: { ref: 29.5, kesk: 11.4, ekre: 26.0, isamaa: 10.0, sde: 6.7, e200: 12.8, eer: 0.8, pp: 2.2, vl: 0.7, koos: 0, erk: 0 },
      },
      names: {
        district1: 'District No. 1', district2: 'District No. 2', district3: 'District No. 3', district4: 'District No. 4',
        district5: 'District No. 5', district6: 'District No. 6', district7: 'District No. 7', district8: 'District No. 8',
        district9: 'District No. 9', district10: 'District No. 10', district11: 'District No. 11', district12: 'District No. 12',
      },
      // National baseline for the uniform-swing projection = 2023 result vote %
      national2021: { ref: 31.24, ekre: 16.05, kesk: 15.28, e200: 13.33, sde: 9.27, isamaa: 8.21, vl: 2.39, pp: 2.30, koos: 0, eer: 0.96, erk: 0 },
    },
    pollsterMAE: {
      'Kantar Emor':       { EE2023: 1.16, overall: 1.16 },
      Emor:                { EE2023: 1.16, overall: 1.16 },
      'Turu-uuringute AS': { EE2023: 2.20, overall: 2.20 },
      Norstat:             { EE2023: 2.40, overall: 2.40 },
    },
    maeKey: 'EE2023',
    logos: {
      isamaa: 'img/ee/ISAMAA.svg', e200: 'img/ee/E200.svg', ref: 'img/ee/REF.svg', ekre: 'img/ee/EKRE.svg',
      kesk: 'img/ee/KESK.svg', sde: 'img/ee/SDE.svg', vl: 'img/ee/VL.svg', koos: 'img/ee/KOOS.svg',
      pp: 'img/ee/PP.svg', eer: 'img/ee/EER.svg', erk: 'img/ee/ERK.svg',
    },
  },

  slovakia: {
    name: 'Slovakia',
    seats: 150,
    threshold: 5.0,
    method: 'hare_niemeyer',      // LR-Hagenbach-Bischoff (quota = valid votes/(150+1)); app approximates with Hare quota
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      smer:      { code: 'Smer-SD',   name: 'Direction – Social Democracy',   name_en: 'Direction – Social Democracy',   color: '#E30613' },
      ps:        { code: 'PS',        name: 'Progressive Slovakia',            name_en: 'Progressive Slovakia',            color: '#00A2E8' },
      hlas:      { code: 'Hlas-SD',   name: 'Voice – Social Democracy',        name_en: 'Voice – Social Democracy',        color: '#C71585' },
      slovensko: { code: 'Slovensko', name: 'Slovakia (OĽaNO successor)',      name_en: 'Slovakia (OĽaNO successor)',      color: '#00A86B' },
      zl:        { code: 'Za ľudí',   name: 'For the People',                  name_en: 'For the People',                  color: '#FFD700' },
      ku:        { code: 'KÚ',        name: 'Christian Union',                 name_en: 'Christian Union',                 color: '#87CEEB' },
      kdh:       { code: 'KDH',       name: 'Christian Democratic Movement',   name_en: 'Christian Democratic Movement',   color: '#4B0082' },
      sas:       { code: 'SaS',       name: 'Freedom and Solidarity',          name_en: 'Freedom and Solidarity',          color: '#8DB600' },
      sns:       { code: 'SNS',       name: 'Slovak National Party',           name_en: 'Slovak National Party',           color: '#546E7A' },
      republika: { code: 'Republika', name: 'Republic Movement',               name_en: 'Republic Movement',               color: '#B22222' },
      aliancia:  { code: 'Aliancia',  name: 'Hungarian Alliance',              name_en: 'Hungarian Alliance',              color: '#8BC34A' },
      demokrati: { code: 'Demokrati', name: 'Democrats',                       name_en: 'Democrats',                       color: '#8E44AD' },
      rodina:    { code: 'Sme rodina', name: 'We Are Family',                  name_en: 'We Are Family',                   color: '#000080' },
      lsns:      { code: 'ĽSNS',      name: "People's Party Our Slovakia",     name_en: "People's Party Our Slovakia",     color: '#228B22' },
    },
    order: ['smer', 'ps', 'hlas', 'slovensko', 'zl', 'ku', 'kdh', 'sas', 'sns', 'republika', 'aliancia', 'demokrati', 'rodina', 'lsns'],
    parlOrder: ['smer', 'hlas', 'ps', 'slovensko', 'zl', 'ku', 'kdh', 'sas', 'demokrati', 'rodina', 'sns', 'aliancia', 'republika', 'lsns'],
    // Government (Fico III coalition, Oct 2023): SMER + HLAS + SNS
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['smer', 'hlas', 'sns'], color: '#E30613' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['ps', 'slovensko', 'zl', 'ku', 'kdh', 'sas', 'republika', 'aliancia', 'demokrati', 'rodina', 'lsns'], color: '#8497B0' },
    },
    lastElection: {
      date: '2023-09-30',
      // 2023 NR election official result — volby.sk
      results: { smer: 22.95, ps: 17.96, hlas: 14.70, slovensko: 8.89, kdh: 6.82, sas: 6.32, sns: 5.62, republika: 4.75, aliancia: 4.39, demokrati: 2.93, rodina: 2.21, lsns: 1.37, zl: 0, ku: 0 },
      seats:   { smer: 42, ps: 32, hlas: 27, slovensko: 16, kdh: 12, sas: 11, sns: 10, republika: 0, aliancia: 0, demokrati: 0, rodina: 0, lsns: 0, zl: 0, ku: 0 },
    },
    map: {
      svg: 'img/Slovakia.svg',
      selector: 'id',
      districts: {
        Bratislava: 'bratislava', Trnava: 'trnava', Nitra: 'nitra', Trencin: 'trencin',
        BanskaBystrica: 'banskabystrica', Zilina: 'zilina', Presov: 'presov', Kosice: 'kosice',
      },
      // 2023 result per region, vote % — volby.sk (others/zl/ku ran in coalition → 0 as independent parties)
      gebiete: {
        bratislava:   { smer: 18.54, ps: 31.0,  hlas: 10.36, slovensko: 6.17, zl: 0, ku: 0, kdh: 4.9,  sas: 12.5, sns: 4.31, republika: 3.14, aliancia: 0.91, demokrati: 4.43, rodina: 1.78, lsns: 0.57 },
        trnava:       { smer: 22.01, ps: 17.07, hlas: 12.11, slovensko: 9.4,  zl: 0, ku: 0, kdh: 4.56, sas: 5.36, sns: 4.43, republika: 4.38, aliancia: 12.69, demokrati: 2.92, rodina: 2.19, lsns: 0.81 },
        trencin:      { smer: 29.47, ps: 16.63, hlas: 16.4,  slovensko: 5.93, zl: 0, ku: 0, kdh: 5.44, sas: 5.63, sns: 7.28, republika: 5.45, aliancia: 0.03, demokrati: 2.84, rodina: 2.22, lsns: 1.06 },
        nitra:        { smer: 25.31, ps: 14.42, hlas: 14.4,  slovensko: 7.47, zl: 0, ku: 0, kdh: 4.06, sas: 4.8,  sns: 4.51, republika: 4.46, aliancia: 13.91, demokrati: 2.19, rodina: 2.01, lsns: 0.8  },
        zilina:       { smer: 25.79, ps: 15.51, hlas: 16.04, slovensko: 6.9,  zl: 0, ku: 0, kdh: 9.38, sas: 5.56, sns: 8.11, republika: 5.61, aliancia: 0.02, demokrati: 2.8,  rodina: 2.02, lsns: 0.96 },
        banskabystrica:{ smer: 22.89, ps: 14.96, hlas: 19.76, slovensko: 7.41, zl: 0, ku: 0, kdh: 4.29, sas: 5.14, sns: 6.53, republika: 5.18, aliancia: 5.17, demokrati: 2.4,  rodina: 2.73, lsns: 1.33 },
        presov:       { smer: 22.04, ps: 10.83, hlas: 16.16, slovensko: 14.78,zl: 0, ku: 0, kdh: 14.07,sas: 4.1,  sns: 5.73, republika: 5.22, aliancia: 0.07, demokrati: 2.65, rodina: 2.36, lsns: 0.63 },
        kosice:       { smer: 21.1,  ps: 14.68, hlas: 15.08, slovensko: 13.46,zl: 0, ku: 0, kdh: 6.8,  sas: 5.74, sns: 4.38, republika: 4.97, aliancia: 5.44, demokrati: 2.98, rodina: 2.75, lsns: 0.76 },
      },
      names: {
        bratislava: 'Bratislava', trnava: 'Trnava', trencin: 'Trenčín', nitra: 'Nitra',
        zilina: 'Žilina', banskabystrica: 'Banská Bystrica', presov: 'Prešov', kosice: 'Košice',
      },
      // National baseline for uniform-swing projection = 2023 result vote %
      national2021: { smer: 22.95, ps: 17.96, hlas: 14.70, slovensko: 8.89, zl: 0, ku: 0, kdh: 6.82, sas: 6.32, sns: 5.62, republika: 4.75, aliancia: 4.39, demokrati: 2.93, rodina: 2.21, lsns: 1.37 },
    },
    pollsterMAE: {
      AKO:    { SK2023: 2.05, overall: 2.05 },
      Ipsos:  { SK2023: 2.13, overall: 2.13 },
      Focus:  { SK2023: 2.20, overall: 2.20 },
      NMS:    { SK2023: 2.50, overall: 2.50 },
    },
    maeKey: 'SK2023',
    logos: {
      smer: 'img/sk/SMER.svg', ps: 'img/sk/PS.svg', hlas: 'img/sk/HLAS.svg', slovensko: 'img/sk/SLOVENSKO.svg',
      zl: 'img/sk/ZL.svg', ku: 'img/sk/KU.svg', kdh: 'img/sk/KDH.svg', sas: 'img/sk/SAS.svg',
      sns: 'img/sk/SNS.svg', republika: 'img/sk/REPUBLIKA.svg', aliancia: 'img/sk/ALLIANCE.svg',
      demokrati: 'img/sk/DEMOCRATS.svg', rodina: 'img/sk/WEAREFAMILY.svg', lsns: 'img/sk/LSNS.svg',
    },
  },

  france: {
    name: "France",
    hidden: true,                  // archived 2026-09-12 (2027 presidential not tracked live)
    seats: 13,
    threshold: 50,
    method: "hare_niemeyer",
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 7,
    hideBlocs: true,
    mapOnly: true,
    unitLabel: {
      en: "regions",
      tr: "bölgeler"
    },
    parties: {
      arthaud: {
        code: "LO",
        name: "Nathalie Arthaud",
        name_en: "Nathalie Arthaud",
        color: "#D52121"
      },
      melenchon: {
        code: "LFI",
        name: "Jean-Luc Mélenchon",
        name_en: "Jean-Luc Mélenchon",
        color: "#7A1FA2"
      },
      roussel: {
        code: "PCF",
        name: "Fabien Roussel",
        name_en: "Fabien Roussel",
        color: "#CC2E2E"
      },
      ruffin: {
        code: "PD",
        name: "François Ruffin",
        name_en: "François Ruffin",
        color: "#00A650"
      },
      tondelier: {
        code: "EÉLV",
        name: "Marine Tondelier",
        name_en: "Marine Tondelier",
        color: "#3E9B2F"
      },
      faure: {
        code: "PS",
        name: "Olivier Faure",
        name_en: "Olivier Faure",
        color: "#E6007E"
      },
      hollande: {
        code: "PS",
        name: "François Hollande",
        name_en: "François Hollande",
        color: "#F04E98"
      },
      glucksmann: {
        code: "PP",
        name: "Raphaël Glucksmann",
        name_en: "Raphaël Glucksmann",
        color: "#00B7C6"
      },
      attal: {
        code: "RE",
        name: "Gabriel Attal",
        name_en: "Gabriel Attal",
        color: "#E7A208"
      },
      philippe: {
        code: "HOR",
        name: "Édouard Philippe",
        name_en: "Édouard Philippe",
        color: "#4A5A68"
      },
      villepin: {
        code: "UR",
        name: "Dominique de Villepin",
        name_en: "Dominique de Villepin",
        color: "#333F7F"
      },
      lisnard: {
        code: "LR",
        name: "David Lisnard",
        name_en: "David Lisnard",
        color: "#3D64A8"
      },
      wauquiez: {
        code: "LR",
        name: "Laurent Wauquiez",
        name_en: "Laurent Wauquiez",
        color: "#1E4294"
      },
      retailleau: {
        code: "LR",
        name: "Bruno Retailleau",
        name_en: "Bruno Retailleau",
        color: "#28518F"
      },
      dupont: {
        code: "DLF",
        name: "Nicolas Dupont-Aignan",
        name_en: "Nicolas Dupont-Aignan",
        color: "#CB1D46"
      },
      lepen: {
        code: "RN",
        name: "Marine Le Pen",
        name_en: "Marine Le Pen",
        color: "#041E42"
      },
      zemmour: {
        code: "REC",
        name: "Éric Zemmour",
        name_en: "Éric Zemmour",
        color: "#315E9C"
      }
    },
    order: [
      "lepen",
      "melenchon",
      "philippe",
      "attal",
      "glucksmann",
      "tondelier",
      "retailleau",
      "zemmour",
      "wauquiez",
      "hollande",
      "faure",
      "roussel",
      "ruffin",
      "dupont",
      "villepin",
      "lisnard",
      "arthaud"
    ],
    parlOrder: [
      "lepen",
      "melenchon",
      "attal",
      "philippe",
      "zemmour",
      "retailleau",
      "tondelier",
      "roussel",
      "dupont",
      "faure",
      "arthaud",
      "glucksmann",
      "wauquiez",
      "hollande",
      "ruffin",
      "villepin",
      "lisnard"
    ],
    blocs: {
      bloc1: {
        name: "Le Pen",
        short: "RN",
        parties: [
          "lepen"
        ],
        color: "#041E42"
      },
      bloc2: {
        name: "Field",
        short: "FLD",
        parties: [
          "melenchon",
          "philippe",
          "attal",
          "glucksmann",
          "tondelier",
          "retailleau",
          "zemmour",
          "wauquiez",
          "hollande",
          "faure",
          "roussel",
          "ruffin",
          "dupont",
          "villepin",
          "lisnard",
          "arthaud"
        ],
        color: "#7A1FA2"
      }
    },
    lastElection: {
      date: "2022-04-10",
      results: {
        lepen: 25.104,
        melenchon: 20.095,
        attal: 16.074,
        philippe: 10.716,
        zemmour: 6.962,
        retailleau: 4.904,
        tondelier: 4.255,
        roussel: 2.465,
        dupont: 2.194,
        faure: 1.827,
        arthaud: 0.599,
        ruffin: 0,
        hollande: 0,
        glucksmann: 0,
        villepin: 0,
        lisnard: 0,
        wauquiez: 0
      },
      seats: {
        lepen: 0,
        melenchon: 0,
        philippe: 0,
        attal: 0,
        glucksmann: 0,
        tondelier: 0,
        retailleau: 0,
        zemmour: 0,
        wauquiez: 0,
        hollande: 0,
        faure: 0,
        roussel: 0,
        ruffin: 0,
        dupont: 0,
        villepin: 0,
        lisnard: 0,
        arthaud: 0
      }
    },
    trend: {
      electionDate: "2027-04-18",
      blend: 0.5,
      maxDaily: 0.3,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3
    },
    map: {
      svg: "img/france.svg",
      selector: "id",
      districts: {
        Dep01_Ain: "01",
        Dep02_Aisne: "02",
        Dep03_Allier: "03",
        "Dep04_Alpes-de-Haute-Provence": "04",
        "Dep05_Hautes-Alpes": "05",
        "Dep06_Alpes-Maritimes": "06",
        "Dep07_Ardèche": "07",
        Dep08_Ardennes: "08",
        "Dep09_Ariège": "09",
        Dep10_Aube: "10",
        Dep11_Aude: "11",
        Dep12_Aveyron: "12",
        "Dep13_Bouches-du-Rhône": "13",
        Dep14_Calvados: "14",
        Dep15_Cantal: "15",
        Dep16_Charente: "16",
        "Dep17_Charente-Maritime": "17",
        Dep18_Cher: "18",
        "Dep19_Corrèze": "19",
        "Dep2A_Corse-du-Sud": "2A",
        "Dep2B_Haute-Corse": "2B",
        "Dep21_Côte-d-Or": "21",
        "Dep22_Côtes-d-Armor": "22",
        Dep23_Creuse: "23",
        Dep24_Dordogne: "24",
        Dep25_Doubs: "25",
        "Dep26_Drôme": "26",
        Dep27_Eure: "27",
        "Dep28_Eure-et-Loir": "28",
        "Dep29_Finistère": "29",
        Dep30_Gard: "30",
        "Dep31_Haute-Garonne": "31",
        Dep32_Gers: "32",
        Dep33_Gironde: "33",
        "Dep34_Hérault": "34",
        "Dep35_Ille-et-Vilaine": "35",
        Dep36_Indre: "36",
        "Dep37_Indre-et-Loire": "37",
        "Dep38_Isère": "38",
        Dep39_Jura: "39",
        Dep40_Landes: "40",
        "Dep41_Loir-et-Cher": "41",
        Dep42_Loire: "42",
        "Dep43_Haute-Loire": "43",
        "Dep44_Loire-Atlantique": "44",
        Dep45_Loiret: "45",
        Dep46_Lot: "46",
        "Dep47_Lot-et-Garonne": "47",
        "Dep48_Lozère": "48",
        "Dep49_Maine-et-Loire": "49",
        Dep50_Manche: "50",
        Dep51_Marne: "51",
        "Dep52_Haute-Marne": "52",
        Dep53_Mayenne: "53",
        "Dep54_Meurthe-et-Moselle": "54",
        Dep55_Meuse: "55",
        Dep56_Morbihan: "56",
        Dep57_Moselle: "57",
        "Dep58_Nièvre": "58",
        Dep59_Nord: "59",
        Dep60_Oise: "60",
        Dep61_Orne: "61",
        "Dep62_Pas-de-Calais": "62",
        "Dep63_Puy-de-Dôme": "63",
        "Dep64_Pyrénées-Atlantiques": "64",
        "Dep65_Hautes-Pyrénées": "65",
        "Dep66_Pyrénées-Orientales": "66",
        "Dep67_Bas-Rhin": "67",
        "Dep68_Haut-Rhin": "68",
        "Dep69_Rhône": "69",
        "Dep70_Haute-Saône": "70",
        "Dep71_Saône-et-Loire": "71",
        Dep72_Sarthe: "72",
        Dep73_Savoie: "73",
        "Dep74_Haute-Savoie": "74",
        n075_Paris: "75",
        "Dep76_Seine-Maritime": "76",
        "Dep77_Seine-et-Marne": "77",
        Dep78_Yvelines: "78",
        "Dep79_Deux-Sèvres": "79",
        Dep80_Somme: "80",
        Dep81_Tarn: "81",
        "Dep82_Tarn-et-Garonne": "82",
        Dep83_Var: "83",
        Dep84_Vaucluse: "84",
        "Dep85_Vendée": "85",
        Dep86_Vienne: "86",
        "Dep87_Haute-Vienne": "87",
        Dep88_Vosges: "88",
        Dep89_Yonne: "89",
        Dep90_Territoire_de_Belfort: "90",
        Dep91_Essonne: "91",
        "n092_Hauts-de-Seine": "92",
        "n093_Seine-Saint-Denis": "93",
        "n094_Val-de-Marne": "94",
        "Dep95_Val-d-Oise": "95"
      },
      gebiete: {
        "10": {
          lepen: 32.95,
          melenchon: 15.02,
          zemmour: 7.6,
          attal: 15.36,
          philippe: 10.24,
          retailleau: 5.96,
          tondelier: 3.09,
          faure: 1.15,
          roussel: 2.07,
          dupont: 2.65,
          arthaud: 0.67,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "11": {
          lepen: 30.14,
          melenchon: 19.79,
          zemmour: 8.68,
          attal: 12.174,
          philippe: 8.116,
          retailleau: 3.46,
          tondelier: 2.98,
          faure: 2.9,
          roussel: 2.65,
          dupont: 1.98,
          arthaud: 0.48,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "12": {
          lepen: 20.1,
          melenchon: 19.15,
          zemmour: 5.92,
          attal: 16.65,
          philippe: 11.1,
          retailleau: 5.84,
          tondelier: 3.95,
          faure: 2.62,
          roussel: 2.64,
          dupont: 2.03,
          arthaud: 0.52,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "13": {
          lepen: 26.25,
          melenchon: 23.59,
          zemmour: 10.77,
          attal: 13.626,
          philippe: 9.084,
          retailleau: 3.59,
          tondelier: 4.17,
          faure: 1.17,
          roussel: 2.41,
          dupont: 1.99,
          arthaud: 0.35,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "14": {
          lepen: 23.76,
          melenchon: 19.15,
          zemmour: 5.76,
          attal: 18.696,
          philippe: 12.464,
          retailleau: 4.76,
          tondelier: 5.09,
          faure: 1.77,
          roussel: 2.27,
          dupont: 2.05,
          arthaud: 0.71,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "15": {
          lepen: 24.48,
          melenchon: 14.69,
          zemmour: 5.57,
          attal: 17.052,
          philippe: 11.368,
          retailleau: 7.93,
          tondelier: 3.12,
          faure: 2.05,
          roussel: 2.83,
          dupont: 1.76,
          arthaud: 0.63,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "16": {
          lepen: 26.18,
          melenchon: 19.36,
          zemmour: 5.51,
          attal: 16.542,
          philippe: 11.028,
          retailleau: 4.33,
          tondelier: 3.92,
          faure: 2.08,
          roussel: 2.79,
          dupont: 2.26,
          arthaud: 0.68,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "17": {
          lepen: 25.32,
          melenchon: 18.18,
          zemmour: 6.18,
          attal: 17.322,
          philippe: 11.548,
          retailleau: 4.9,
          tondelier: 4.82,
          faure: 1.74,
          roussel: 2.54,
          dupont: 2.36,
          arthaud: 0.59,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "18": {
          lepen: 27.89,
          melenchon: 17.38,
          zemmour: 6.74,
          attal: 16.26,
          philippe: 10.84,
          retailleau: 5.07,
          tondelier: 3.13,
          faure: 1.61,
          roussel: 3.58,
          dupont: 2.35,
          arthaud: 0.82,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "19": {
          lepen: 22.2,
          melenchon: 19.45,
          zemmour: 5.62,
          attal: 13.938,
          philippe: 9.292,
          retailleau: 8.61,
          tondelier: 3.53,
          faure: 2.53,
          roussel: 4.41,
          dupont: 1.84,
          arthaud: 0.62,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "21": {
          lepen: 24.44,
          melenchon: 19.05,
          zemmour: 7.66,
          attal: 17.13,
          philippe: 11.42,
          retailleau: 5.07,
          tondelier: 4.76,
          faure: 1.81,
          roussel: 2.02,
          dupont: 2.29,
          arthaud: 0.63,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "22": {
          lepen: 21.79,
          melenchon: 20.26,
          zemmour: 4.73,
          attal: 18.612,
          philippe: 12.408,
          retailleau: 4.7,
          tondelier: 5.28,
          faure: 2.26,
          roussel: 3.17,
          dupont: 1.75,
          arthaud: 0.71,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "23": {
          lepen: 25.09,
          melenchon: 20.46,
          zemmour: 5.24,
          attal: 13.95,
          philippe: 9.3,
          retailleau: 6.57,
          tondelier: 2.85,
          faure: 2.45,
          roussel: 3.64,
          dupont: 2.33,
          arthaud: 0.73,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "24": {
          lepen: 25.7,
          melenchon: 20.3,
          zemmour: 6.4,
          attal: 14.244,
          philippe: 9.496,
          retailleau: 4.57,
          tondelier: 3.47,
          faure: 2.17,
          roussel: 3.59,
          dupont: 2.2,
          arthaud: 0.52,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "25": {
          lepen: 24.07,
          melenchon: 20.06,
          zemmour: 7.03,
          attal: 16.53,
          philippe: 11.02,
          retailleau: 5.45,
          tondelier: 4.72,
          faure: 1.77,
          roussel: 1.8,
          dupont: 2.81,
          arthaud: 0.75,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "26": {
          lepen: 24.22,
          melenchon: 22.39,
          zemmour: 7.55,
          attal: 14.868,
          philippe: 9.912,
          retailleau: 4.53,
          tondelier: 4.88,
          faure: 1.82,
          roussel: 2.32,
          dupont: 2.66,
          arthaud: 0.7,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "27": {
          lepen: 32.29,
          melenchon: 17.43,
          zemmour: 6.56,
          attal: 15.63,
          philippe: 10.42,
          retailleau: 4.25,
          tondelier: 3.6,
          faure: 1.26,
          roussel: 2.21,
          dupont: 2.37,
          arthaud: 0.69,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "28": {
          lepen: 28.16,
          melenchon: 18.42,
          zemmour: 6.73,
          attal: 16.326,
          philippe: 10.884,
          retailleau: 5.91,
          tondelier: 3.59,
          faure: 1.4,
          roussel: 1.94,
          dupont: 2.6,
          arthaud: 0.64,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "29": {
          lepen: 18.58,
          melenchon: 21.47,
          zemmour: 4.72,
          attal: 19.326,
          philippe: 12.884,
          retailleau: 4.89,
          tondelier: 6.12,
          faure: 2.41,
          roussel: 2.83,
          dupont: 1.58,
          arthaud: 0.67,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "30": {
          lepen: 29.34,
          melenchon: 21.46,
          zemmour: 9.29,
          attal: 12.792,
          philippe: 8.528,
          retailleau: 3.73,
          tondelier: 3.62,
          faure: 1.59,
          roussel: 2.93,
          dupont: 1.97,
          arthaud: 0.43,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "31": {
          lepen: 18.21,
          melenchon: 25.87,
          zemmour: 6.92,
          attal: 16.14,
          philippe: 10.76,
          retailleau: 3.71,
          tondelier: 5.83,
          faure: 2.69,
          roussel: 2.23,
          dupont: 1.7,
          arthaud: 0.41,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "32": {
          lepen: 22.35,
          melenchon: 18.35,
          zemmour: 7.21,
          attal: 14.934,
          philippe: 9.956,
          retailleau: 4.4,
          tondelier: 3.51,
          faure: 3.32,
          roussel: 2.69,
          dupont: 2.08,
          arthaud: 0.45,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "33": {
          lepen: 21.47,
          melenchon: 21.84,
          zemmour: 6.54,
          attal: 17.232,
          philippe: 11.488,
          retailleau: 4.21,
          tondelier: 5.23,
          faure: 2.2,
          roussel: 2.41,
          dupont: 1.76,
          arthaud: 0.41,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "34": {
          lepen: 25.95,
          melenchon: 24.24,
          zemmour: 9.04,
          attal: 13.368,
          philippe: 8.912,
          retailleau: 3.64,
          tondelier: 4.39,
          faure: 1.9,
          roussel: 2.22,
          dupont: 1.8,
          arthaud: 0.4,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "35": {
          lepen: 17.06,
          melenchon: 22.2,
          zemmour: 4.6,
          attal: 20.7,
          philippe: 13.8,
          retailleau: 4.39,
          tondelier: 7.14,
          faure: 2.34,
          roussel: 2.13,
          dupont: 1.77,
          arthaud: 0.63,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "36": {
          lepen: 28.53,
          melenchon: 17.32,
          zemmour: 6.15,
          attal: 15.618,
          philippe: 10.412,
          retailleau: 5.45,
          tondelier: 3.08,
          faure: 2.04,
          roussel: 3.06,
          dupont: 2.39,
          arthaud: 0.9,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "37": {
          lepen: 21.54,
          melenchon: 20.77,
          zemmour: 6.09,
          attal: 18.594,
          philippe: 12.396,
          retailleau: 4.97,
          tondelier: 4.96,
          faure: 1.9,
          roussel: 2.39,
          dupont: 2.22,
          arthaud: 0.68,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "38": {
          lepen: 23.03,
          melenchon: 22.83,
          zemmour: 7.06,
          attal: 16.11,
          philippe: 10.74,
          retailleau: 4.25,
          tondelier: 6.01,
          faure: 1.89,
          roussel: 2.19,
          dupont: 2.13,
          arthaud: 0.52,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "39": {
          lepen: 26.29,
          melenchon: 19.89,
          zemmour: 6.65,
          attal: 14.928,
          philippe: 9.952,
          retailleau: 5.11,
          tondelier: 4.4,
          faure: 1.81,
          roussel: 2.18,
          dupont: 2.85,
          arthaud: 0.73,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "40": {
          lepen: 22.73,
          melenchon: 17.26,
          zemmour: 6.52,
          attal: 16.152,
          philippe: 10.768,
          retailleau: 4.03,
          tondelier: 3.34,
          faure: 3.52,
          roussel: 3.17,
          dupont: 1.9,
          arthaud: 0.43,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "41": {
          lepen: 27.77,
          melenchon: 16.8,
          zemmour: 7.03,
          attal: 16.752,
          philippe: 11.168,
          retailleau: 5.3,
          tondelier: 3.93,
          faure: 1.75,
          roussel: 2.49,
          dupont: 2.45,
          arthaud: 0.69,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "42": {
          lepen: 25.33,
          melenchon: 20.25,
          zemmour: 7.44,
          attal: 16.17,
          philippe: 10.78,
          retailleau: 4.8,
          tondelier: 4.32,
          faure: 1.81,
          roussel: 2.33,
          dupont: 2.34,
          arthaud: 0.62,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "43": {
          lepen: 27.66,
          melenchon: 17.42,
          zemmour: 6.82,
          attal: 13.926,
          philippe: 9.284,
          retailleau: 6.85,
          tondelier: 4.16,
          faure: 1.78,
          roussel: 2.5,
          dupont: 2.41,
          arthaud: 0.73,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "44": {
          lepen: 16.91,
          melenchon: 23.43,
          zemmour: 5.33,
          attal: 19.188,
          philippe: 12.792,
          retailleau: 4.68,
          tondelier: 7.49,
          faure: 2.29,
          roussel: 2.38,
          dupont: 1.84,
          arthaud: 0.59,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "45": {
          lepen: 25.59,
          melenchon: 18.93,
          zemmour: 6.82,
          attal: 17.352,
          philippe: 11.568,
          retailleau: 5.39,
          tondelier: 4.29,
          faure: 1.69,
          roussel: 2.24,
          dupont: 2.29,
          arthaud: 0.58,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "46": {
          lepen: 19.58,
          melenchon: 23.71,
          zemmour: 5.6,
          attal: 14.982,
          philippe: 9.988,
          retailleau: 5.16,
          tondelier: 4.21,
          faure: 2.53,
          roussel: 3.25,
          dupont: 2.19,
          arthaud: 0.56,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "47": {
          lepen: 27.32,
          melenchon: 18.49,
          zemmour: 8.5,
          attal: 13.872,
          philippe: 9.248,
          retailleau: 4.18,
          tondelier: 3.09,
          faure: 1.82,
          roussel: 2.7,
          dupont: 2.12,
          arthaud: 0.48,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "48": {
          lepen: 22.34,
          melenchon: 19.48,
          zemmour: 6.7,
          attal: 13.71,
          philippe: 9.14,
          retailleau: 6.46,
          tondelier: 3.69,
          faure: 2.22,
          roussel: 2.86,
          dupont: 1.94,
          arthaud: 0.5,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "49": {
          lepen: 20.26,
          melenchon: 18.27,
          zemmour: 4.92,
          attal: 21.354,
          philippe: 14.236,
          retailleau: 4.88,
          tondelier: 6.03,
          faure: 1.99,
          roussel: 1.89,
          dupont: 2.13,
          arthaud: 0.7,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "50": {
          lepen: 24.53,
          melenchon: 16.5,
          zemmour: 4.92,
          attal: 19.542,
          philippe: 13.028,
          retailleau: 5.18,
          tondelier: 4.17,
          faure: 2.06,
          roussel: 2.59,
          dupont: 2.42,
          arthaud: 0.79,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "51": {
          lepen: 30.56,
          melenchon: 15.64,
          zemmour: 7.11,
          attal: 17.178,
          philippe: 11.452,
          retailleau: 5.24,
          tondelier: 3.49,
          faure: 1.29,
          roussel: 1.94,
          dupont: 2.25,
          arthaud: 0.65,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "52": {
          lepen: 36.6,
          melenchon: 14.1,
          zemmour: 6.88,
          attal: 13.998,
          philippe: 9.332,
          retailleau: 5.16,
          tondelier: 2.75,
          faure: 1.39,
          roussel: 1.95,
          dupont: 2.75,
          arthaud: 0.74,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "53": {
          lepen: 22.39,
          melenchon: 15.34,
          zemmour: 4.82,
          attal: 21.84,
          philippe: 14.56,
          retailleau: 5.53,
          tondelier: 4.75,
          faure: 2.08,
          roussel: 1.98,
          dupont: 2.31,
          arthaud: 0.76,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "54": {
          lepen: 27.49,
          melenchon: 20.89,
          zemmour: 6.65,
          attal: 16.152,
          philippe: 10.768,
          retailleau: 3.78,
          tondelier: 4.12,
          faure: 1.8,
          roussel: 2.25,
          dupont: 2.06,
          arthaud: 0.67,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "55": {
          lepen: 35.11,
          melenchon: 13.76,
          zemmour: 7.46,
          attal: 14.946,
          philippe: 9.964,
          retailleau: 4.47,
          tondelier: 3.18,
          faure: 1.51,
          roussel: 1.99,
          dupont: 2.46,
          arthaud: 0.71,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "56": {
          lepen: 22.01,
          melenchon: 18.02,
          zemmour: 5.69,
          attal: 19.608,
          philippe: 13.072,
          retailleau: 4.89,
          tondelier: 5.78,
          faure: 1.77,
          roussel: 2.47,
          dupont: 2.05,
          arthaud: 0.63,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "57": {
          lepen: 30.37,
          melenchon: 19.1,
          zemmour: 7.51,
          attal: 15.606,
          philippe: 10.404,
          retailleau: 3.68,
          tondelier: 3.61,
          faure: 1.44,
          roussel: 1.67,
          dupont: 2.41,
          arthaud: 0.67,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "58": {
          lepen: 29.2,
          melenchon: 17.72,
          zemmour: 6.56,
          attal: 15.306,
          philippe: 10.204,
          retailleau: 4.6,
          tondelier: 3.16,
          faure: 1.92,
          roussel: 3.81,
          dupont: 2.22,
          arthaud: 0.74,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "59": {
          lepen: 29.27,
          melenchon: 21.95,
          zemmour: 5.74,
          attal: 15.822,
          philippe: 10.548,
          retailleau: 3.33,
          tondelier: 3.68,
          faure: 1.43,
          roussel: 3.6,
          dupont: 1.62,
          arthaud: 0.6,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "60": {
          lepen: 32.3,
          melenchon: 19.28,
          zemmour: 7.37,
          attal: 14.58,
          philippe: 9.72,
          retailleau: 4.24,
          tondelier: 3.35,
          faure: 1.03,
          roussel: 2.2,
          dupont: 2.28,
          arthaud: 0.69,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "61": {
          lepen: 27.69,
          melenchon: 15.23,
          zemmour: 5.9,
          attal: 18.288,
          philippe: 12.192,
          retailleau: 5.85,
          tondelier: 3.65,
          faure: 1.57,
          roussel: 2.16,
          dupont: 2.53,
          arthaud: 0.8,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "62": {
          lepen: 38.68,
          melenchon: 15.77,
          zemmour: 5.16,
          attal: 14.766,
          philippe: 9.844,
          retailleau: 3.2,
          tondelier: 2.44,
          faure: 1.47,
          roussel: 3.31,
          dupont: 1.77,
          arthaud: 0.74,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "63": {
          lepen: 21.86,
          melenchon: 20.84,
          zemmour: 5.77,
          attal: 16.8,
          philippe: 11.2,
          retailleau: 4.85,
          tondelier: 4.76,
          faure: 2.3,
          roussel: 3.56,
          dupont: 1.94,
          arthaud: 0.71,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "64": {
          lepen: 17.38,
          melenchon: 18.94,
          zemmour: 6.45,
          attal: 16.68,
          philippe: 11.12,
          retailleau: 4.28,
          tondelier: 4.97,
          faure: 2.31,
          roussel: 2.53,
          dupont: 1.67,
          arthaud: 0.42,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "65": {
          lepen: 22.19,
          melenchon: 19.61,
          zemmour: 6.46,
          attal: 14.988,
          philippe: 9.992,
          retailleau: 3.38,
          tondelier: 3.61,
          faure: 2.46,
          roussel: 3.37,
          dupont: 1.79,
          arthaud: 0.47,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "66": {
          lepen: 32.74,
          melenchon: 19.2,
          zemmour: 9.23,
          attal: 12.324,
          philippe: 8.216,
          retailleau: 3.28,
          tondelier: 3.2,
          faure: 1.87,
          roussel: 2.42,
          dupont: 1.94,
          arthaud: 0.49,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "67": {
          lepen: 25.3,
          melenchon: 18.22,
          zemmour: 7.02,
          attal: 18.42,
          philippe: 12.28,
          retailleau: 4.3,
          tondelier: 4.95,
          faure: 1.45,
          roussel: 1.22,
          dupont: 2.95,
          arthaud: 0.64,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "68": {
          lepen: 27.77,
          melenchon: 17.2,
          zemmour: 7.86,
          attal: 16.71,
          philippe: 11.14,
          retailleau: 4.15,
          tondelier: 4.92,
          faure: 1.27,
          roussel: 1.21,
          dupont: 3.57,
          arthaud: 0.59,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "69": {
          lepen: 16.55,
          melenchon: 25.2,
          zemmour: 8.16,
          attal: 18.366,
          philippe: 12.244,
          retailleau: 5.53,
          tondelier: 5.71,
          faure: 1.75,
          roussel: 1.75,
          dupont: 1.81,
          arthaud: 0.42,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "70": {
          lepen: 34.6,
          melenchon: 15.65,
          zemmour: 7.18,
          attal: 13.452,
          philippe: 8.968,
          retailleau: 5.01,
          tondelier: 3.18,
          faure: 1.74,
          roussel: 2.1,
          dupont: 2.7,
          arthaud: 0.87,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "71": {
          lepen: 27.39,
          melenchon: 17.49,
          zemmour: 6.91,
          attal: 16.566,
          philippe: 11.044,
          retailleau: 5.08,
          tondelier: 3.59,
          faure: 2.02,
          roussel: 2.48,
          dupont: 2.59,
          arthaud: 0.66,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "72": {
          lepen: 27.68,
          melenchon: 18.26,
          zemmour: 5.46,
          attal: 16.944,
          philippe: 11.296,
          retailleau: 5.36,
          tondelier: 4.56,
          faure: 1.82,
          roussel: 2.33,
          dupont: 2.19,
          arthaud: 0.72,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "73": {
          lepen: 23.03,
          melenchon: 20.24,
          zemmour: 7.32,
          attal: 15.756,
          philippe: 10.504,
          retailleau: 5.52,
          tondelier: 6.35,
          faure: 1.79,
          roussel: 2.25,
          dupont: 2.72,
          arthaud: 0.49,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "74": {
          lepen: 20.54,
          melenchon: 18.28,
          zemmour: 7.81,
          attal: 18.318,
          philippe: 12.212,
          retailleau: 5.23,
          tondelier: 7.01,
          faure: 1.55,
          roussel: 1.4,
          dupont: 3.32,
          arthaud: 0.44,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "75": {
          lepen: 5.54,
          melenchon: 30.08,
          zemmour: 8.16,
          attal: 21.204,
          philippe: 14.136,
          retailleau: 6.59,
          tondelier: 7.61,
          faure: 2.17,
          roussel: 1.64,
          dupont: 0.91,
          arthaud: 0.27,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "76": {
          lepen: 27.65,
          melenchon: 21.17,
          zemmour: 5.19,
          attal: 16.77,
          philippe: 11.18,
          retailleau: 3.78,
          tondelier: 3.85,
          faure: 1.73,
          roussel: 3.09,
          dupont: 1.92,
          arthaud: 0.69,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "77": {
          lepen: 23.57,
          melenchon: 25.86,
          zemmour: 7.25,
          attal: 15,
          philippe: 10,
          retailleau: 5.57,
          tondelier: 4.04,
          faure: 1.19,
          roussel: 1.94,
          dupont: 2.28,
          arthaud: 0.52,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "78": {
          lepen: 13.77,
          melenchon: 22.89,
          zemmour: 8.74,
          attal: 20.046,
          philippe: 13.364,
          retailleau: 8.32,
          tondelier: 5.49,
          faure: 1.23,
          roussel: 1.59,
          dupont: 1.78,
          arthaud: 0.38,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "79": {
          lepen: 23.05,
          melenchon: 18.83,
          zemmour: 4.23,
          attal: 19.758,
          philippe: 13.172,
          retailleau: 4.45,
          tondelier: 4.85,
          faure: 2.09,
          roussel: 2.18,
          dupont: 2.18,
          arthaud: 0.79,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "80": {
          lepen: 32.81,
          melenchon: 17.51,
          zemmour: 5.65,
          attal: 16.674,
          philippe: 11.116,
          retailleau: 3.81,
          tondelier: 2.69,
          faure: 1.25,
          roussel: 2.58,
          dupont: 1.88,
          arthaud: 0.84,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "81": {
          lepen: 24.6,
          melenchon: 21.07,
          zemmour: 6.95,
          attal: 14.076,
          philippe: 9.384,
          retailleau: 4.36,
          tondelier: 3.78,
          faure: 2.53,
          roussel: 2.31,
          dupont: 2.23,
          arthaud: 0.51,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "82": {
          lepen: 28.93,
          melenchon: 19.12,
          zemmour: 8.07,
          attal: 13.056,
          philippe: 8.704,
          retailleau: 4.11,
          tondelier: 3.32,
          faure: 2.1,
          roussel: 2.49,
          dupont: 2.34,
          arthaud: 0.47,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "83": {
          lepen: 30.61,
          melenchon: 14.91,
          zemmour: 13.25,
          attal: 14.262,
          philippe: 9.508,
          retailleau: 4.73,
          tondelier: 3.51,
          faure: 0.95,
          roussel: 1.78,
          dupont: 2.55,
          arthaud: 0.35,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "84": {
          lepen: 29.43,
          melenchon: 20.75,
          zemmour: 10.03,
          attal: 13.206,
          philippe: 8.804,
          retailleau: 3.92,
          tondelier: 3.99,
          faure: 1.24,
          roussel: 2.05,
          dupont: 2.27,
          arthaud: 0.41,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "85": {
          lepen: 23.18,
          melenchon: 14.42,
          zemmour: 6.11,
          attal: 21.384,
          philippe: 14.256,
          retailleau: 5.37,
          tondelier: 4.71,
          faure: 1.73,
          roussel: 1.94,
          dupont: 2.3,
          arthaud: 0.63,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "86": {
          lepen: 23.4,
          melenchon: 21.22,
          zemmour: 5.15,
          attal: 17.568,
          philippe: 11.712,
          retailleau: 4.3,
          tondelier: 4.63,
          faure: 1.96,
          roussel: 2.77,
          dupont: 2.2,
          arthaud: 0.74,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "87": {
          lepen: 22.44,
          melenchon: 21.34,
          zemmour: 5.34,
          attal: 16.314,
          philippe: 10.876,
          retailleau: 4.72,
          tondelier: 3.9,
          faure: 2.8,
          roussel: 3.97,
          dupont: 1.76,
          arthaud: 0.72,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "88": {
          lepen: 32.22,
          melenchon: 16.04,
          zemmour: 6.47,
          attal: 15.15,
          philippe: 10.1,
          retailleau: 4.59,
          tondelier: 3.71,
          faure: 1.53,
          roussel: 1.89,
          dupont: 3.02,
          arthaud: 0.77,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "89": {
          lepen: 31.25,
          melenchon: 17.9,
          zemmour: 7.33,
          attal: 14.484,
          philippe: 9.656,
          retailleau: 5.28,
          tondelier: 3.35,
          faure: 1.3,
          roussel: 2.28,
          dupont: 2.6,
          arthaud: 0.68,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "90": {
          lepen: 27.37,
          melenchon: 20.96,
          zemmour: 8.02,
          attal: 14.442,
          philippe: 9.628,
          retailleau: 4.77,
          tondelier: 4.02,
          faure: 1.51,
          roussel: 2.13,
          dupont: 2.61,
          arthaud: 0.8,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "91": {
          lepen: 17.79,
          melenchon: 28.12,
          zemmour: 6.6,
          attal: 16.59,
          philippe: 11.06,
          retailleau: 5.55,
          tondelier: 4.97,
          faure: 1.34,
          roussel: 2.27,
          dupont: 2.56,
          arthaud: 0.48,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "92": {
          lepen: 8.37,
          melenchon: 25.77,
          zemmour: 8.1,
          attal: 22.266,
          philippe: 14.844,
          retailleau: 8.03,
          tondelier: 6.08,
          faure: 1.36,
          roussel: 1.7,
          dupont: 1.26,
          arthaud: 0.3,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "93": {
          lepen: 11.88,
          melenchon: 49.09,
          zemmour: 5.15,
          attal: 12.162,
          philippe: 8.108,
          retailleau: 3.22,
          tondelier: 3.56,
          faure: 1.08,
          roussel: 2.14,
          dupont: 1.16,
          arthaud: 0.51,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "94": {
          lepen: 11.82,
          melenchon: 32.67,
          zemmour: 7.37,
          attal: 17.46,
          philippe: 11.64,
          retailleau: 5.52,
          tondelier: 5.42,
          faure: 1.4,
          roussel: 2.54,
          dupont: 1.59,
          arthaud: 0.43,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "95": {
          lepen: 17.2,
          melenchon: 33.17,
          zemmour: 7.09,
          attal: 15.654,
          philippe: 10.436,
          retailleau: 4.99,
          tondelier: 3.91,
          faure: 1.15,
          roussel: 1.9,
          dupont: 1.7,
          arthaud: 0.45,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "01": {
          lepen: 26.05,
          melenchon: 17.37,
          zemmour: 8.27,
          attal: 16.614,
          philippe: 11.076,
          retailleau: 5.28,
          tondelier: 4.76,
          faure: 1.69,
          roussel: 1.78,
          dupont: 2.7,
          arthaud: 0.5,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "02": {
          lepen: 39.25,
          melenchon: 15.49,
          zemmour: 6.87,
          attal: 13.254,
          philippe: 8.836,
          retailleau: 4.11,
          tondelier: 2.66,
          faure: 1.12,
          roussel: 2.24,
          dupont: 2.18,
          arthaud: 0.77,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "03": {
          lepen: 27.06,
          melenchon: 16.68,
          zemmour: 6.65,
          attal: 16.038,
          philippe: 10.692,
          retailleau: 5.55,
          tondelier: 3.22,
          faure: 1.76,
          roussel: 4.37,
          dupont: 2.27,
          arthaud: 0.73,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "04": {
          lepen: 26.9,
          melenchon: 22.61,
          zemmour: 8.2,
          attal: 12.906,
          philippe: 8.604,
          retailleau: 3.97,
          tondelier: 4.09,
          faure: 1.44,
          roussel: 2.81,
          dupont: 2.59,
          arthaud: 0.52,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "05": {
          lepen: 22.84,
          melenchon: 22.87,
          zemmour: 7.15,
          attal: 14.268,
          philippe: 9.512,
          retailleau: 5.23,
          tondelier: 5.81,
          faure: 1.69,
          roussel: 2.23,
          dupont: 2.48,
          arthaud: 0.5,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "06": {
          lepen: 26.64,
          melenchon: 16.57,
          zemmour: 13.99,
          attal: 14.994,
          philippe: 9.996,
          retailleau: 5.59,
          tondelier: 4.18,
          faure: 0.97,
          roussel: 1.59,
          dupont: 2.38,
          arthaud: 0.29,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "07": {
          lepen: 25.18,
          melenchon: 21.75,
          zemmour: 7.21,
          attal: 13.818,
          philippe: 9.212,
          retailleau: 4.85,
          tondelier: 4.34,
          faure: 2.13,
          roussel: 2.9,
          dupont: 2.5,
          arthaud: 0.62,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "08": {
          lepen: 36.02,
          melenchon: 16.64,
          zemmour: 6.55,
          attal: 14.184,
          philippe: 9.456,
          retailleau: 4.15,
          tondelier: 2.57,
          faure: 1.3,
          roussel: 2.25,
          dupont: 2.21,
          arthaud: 0.81,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "09": {
          lepen: 23.94,
          melenchon: 26.07,
          zemmour: 6.35,
          attal: 11.826,
          philippe: 7.884,
          retailleau: 2.97,
          tondelier: 3.29,
          faure: 3.5,
          roussel: 2.95,
          dupont: 1.77,
          arthaud: 0.45,
          ruffin: 0,
          hollande: 0,
          glucksmann: 0,
          villepin: 0,
          lisnard: 0,
          wauquiez: 0
        },
        "2A": {
          attal: 18.76,
          lepen: 29.22,
          melenchon: 13.56,
          zemmour: 13.37,
          glucksmann: 5.48,
          tondelier: 3.29,
          hollande: 9.8,
          roussel: 2.69,
          dupont: 1.77,
          faure: 0.91,
          ruffin: 0.88,
          arthaud: 0.29
        },
        "2B": {
          attal: 17.54,
          lepen: 28.02,
          melenchon: 13.2,
          zemmour: 12.3,
          glucksmann: 7.08,
          tondelier: 3.21,
          hollande: 10.96,
          roussel: 3.42,
          dupont: 1.75,
          faure: 1.22,
          ruffin: 0.97,
          arthaud: 0.33
        }
      },
      names: {
        "10": "Aube",
        "11": "Aude",
        "12": "Aveyron",
        "13": "Bouches-du-Rhône",
        "14": "Calvados",
        "15": "Cantal",
        "16": "Charente",
        "17": "Charente-Maritime",
        "18": "Cher",
        "19": "Corrèze",
        "21": "Côte-d'Or",
        "22": "Côtes-d'Armor",
        "23": "Creuse",
        "24": "Dordogne",
        "25": "Doubs",
        "26": "Drôme",
        "27": "Eure",
        "28": "Eure-et-Loir",
        "29": "Finistère",
        "30": "Gard",
        "31": "Haute-Garonne",
        "32": "Gers",
        "33": "Gironde",
        "34": "Hérault",
        "35": "Ille-et-Vilaine",
        "36": "Indre",
        "37": "Indre-et-Loire",
        "38": "Isère",
        "39": "Jura",
        "40": "Landes",
        "41": "Loir-et-Cher",
        "42": "Loire",
        "43": "Haute-Loire",
        "44": "Loire-Atlantique",
        "45": "Loiret",
        "46": "Lot",
        "47": "Lot-et-Garonne",
        "48": "Lozère",
        "49": "Maine-et-Loire",
        "50": "Manche",
        "51": "Marne",
        "52": "Haute-Marne",
        "53": "Mayenne",
        "54": "Meurthe-et-Moselle",
        "55": "Meuse",
        "56": "Morbihan",
        "57": "Moselle",
        "58": "Nièvre",
        "59": "Nord",
        "60": "Oise",
        "61": "Orne",
        "62": "Pas-de-Calais",
        "63": "Puy-de-Dôme",
        "64": "Pyrénées-Atlantiques",
        "65": "Hautes-Pyrénées",
        "66": "Pyrénées-Orientales",
        "67": "Bas-Rhin",
        "68": "Haut-Rhin",
        "69": "Rhône",
        "70": "Haute-Saône",
        "71": "Saône-et-Loire",
        "72": "Sarthe",
        "73": "Savoie",
        "74": "Haute-Savoie",
        "75": "Paris",
        "76": "Seine-Maritime",
        "77": "Seine-et-Marne",
        "78": "Yvelines",
        "79": "Deux-Sèvres",
        "80": "Somme",
        "81": "Tarn",
        "82": "Tarn-et-Garonne",
        "83": "Var",
        "84": "Vaucluse",
        "85": "Vendée",
        "86": "Vienne",
        "87": "Haute-Vienne",
        "88": "Vosges",
        "89": "Yonne",
        "90": "Territoire de Belfort",
        "91": "Essonne",
        "92": "Hauts-de-Seine",
        "93": "Seine-Saint-Denis",
        "94": "Val-de-Marne",
        "95": "Val-d'Oise",
        "01": "Ain",
        "02": "Aisne",
        "03": "Allier",
        "04": "Alpes-de-Haute-Provence",
        "05": "Hautes-Alpes",
        "06": "Alpes-Maritimes",
        "07": "Ardèche",
        "08": "Ardennes",
        "09": "Ariège",
        "2A": "Corse-du-Sud",
        "2B": "Haute-Corse"
      },
      national2021: {
        lepen: 25.104,
        melenchon: 20.095,
        attal: 16.074,
        philippe: 10.716,
        zemmour: 6.962,
        retailleau: 4.904,
        tondelier: 4.255,
        roussel: 2.465,
        dupont: 2.194,
        faure: 1.827,
        arthaud: 0.599,
        ruffin: 0,
        hollande: 0,
        glucksmann: 0,
        villepin: 0,
        lisnard: 0,
        wauquiez: 0
      }
    },
    pollsterMAE: {
      OpinionWay: 1.7,
      Ipsos: 1.7,
      Elabe: 1.8,
      Ifop: 1.9,
      Odoxa: 2.2,
      BVA: 2,
      "Harris Interactive": 2.2,
      Verian: 2.2,
      Cluster17: 2.3
    },
    logos: {
      arthaud: "img/fr/LO.svg",
      melenchon: "img/fr/LFI.svg",
      roussel: "img/fr/PCF.svg",
      ruffin: "img/fr/NE.svg",
      tondelier: "img/fr/PP.svg",
      faure: "img/fr/PS.svg",
      hollande: "img/fr/LaFranceHumaniste.svg",
      glucksmann: "img/fr/PP.svg",
      attal: "img/fr/RE.svg",
      philippe: "img/fr/Horizons.svg",
      villepin: "img/fr/LE.svg",
      lisnard: "img/fr/LR.svg",
      wauquiez: "img/fr/LR.svg",
      retailleau: "img/fr/LR.svg",
      dupont: "img/fr/DLF.svg",
      lepen: "img/fr/RN.svg",
      zemmour: "img/fr/REC.svg"
    }
  },
};

// ===== Active country (switched at runtime) =====
let COUNTRY = 'berlin';
let COUNTRY_NAME = 'Berlin';
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
let RECENCY_HALF_LIFE = 14;
let MAE_KEY = 'overall';
let BIAS_KEY = null;          // signed-bias correction key (e.g. 'MV2021'): pollster bias from backtest
let POLLSTER_BIAS = {};       // pollster -> {party: signed bias} where bias = poll − actual
let BIAS_SHRINK = 1.0;        // apply only fraction of the signed bias (0..1): Sweden 2026 showed single-election bias can flip sign, so shrink toward 0
let MAE_SMOOTH = false;       // weight pollsters by 1/(1+MAE) instead of 1/MAE (less concentration on one pollster)
let EXCLUDE_POLLSTERS = [];   // pollster names dropped from the average entirely (e.g. Channel-14-affiliated polls)
let SURPLUS_AGREEMENTS = [];  // [partyA, partyB] cartels pooled for Bader-Ofer remainder-seat allocation
let PRIOR_ALPHA = 0;          // last-election Dirichlet prior weight (0 = off)
let TREND_CONF = null;        // {electionDate, blend, maxDaily, windowDays, minPolls} linear-trend extrapolation
let HIDE_BLOCS = false;       // presidential-style layout: no bloc cards / majority card
let MAP_ONLY = false;         // no parliament diagram: seat card shows only the district map

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
  RECENCY_HALF_LIFE = c.recencyHalfLifeDays || 14;
  MAE_KEY = c.maeKey || 'overall';
  BIAS_KEY = c.biasKey || null;
  POLLSTER_BIAS = (c.biasKey && c.pollsterBias) ? c.pollsterBias : {};
  BIAS_SHRINK = (c.biasShrink!==undefined) ? c.biasShrink : 1.0;
  MAE_SMOOTH = !!c.maeSmooth;
  EXCLUDE_POLLSTERS = c.excludePollsters || [];
  SURPLUS_AGREEMENTS = c.surplusAgreements || [];
  PRIOR_ALPHA = (c.priorAlpha!==undefined) ? c.priorAlpha : 0;
  TREND_CONF = c.trend || null;
  HIDE_BLOCS = !!c.hideBlocs;
  MAP_ONLY = !!c.mapOnly;
}

// Sub-page / archive wrapper: a country can be pinned via window.__600_COUNTRY__
const BOOT_COUNTRY=(typeof window!=='undefined'&&window.__600_COUNTRY__&&COUNTRIES[window.__600_COUNTRY__])?window.__600_COUNTRY__:'berlin';

setCountry(BOOT_COUNTRY);
// ===== Parliament seat layouts (parliamentarch geometry) =====
// viewBox 0 0 w h ; cx,cy = arch center (for wedge ordering)
const PARLIAMENT_SEATS = {
  sweden: {
    w: 360, h: 185, cx: 180.0, cy: 180.0,
    seats: [
      [9.67, 175.39, 3.22],
      [18.88, 175.39, 3.22],
      [28.1, 175.39, 3.68],
      [37.31, 175.39, 3.68],
      [46.53, 175.39, 3.68],
      [55.74, 175.39, 3.68],
      [64.96, 175.39, 3.68],
      [74.18, 175.39, 3.68],
      [83.4, 175.39, 3.68],
      [92.62, 175.39, 3.68],
      [10.36, 163.98, 3.68],
      [19.65, 163.59, 3.68],
      [28.9, 163.72, 3.68],
      [38.15, 163.87, 3.68],
      [47.44, 163.71, 3.68],
      [56.71, 163.88, 3.68],
      [66.03, 163.7, 3.68],
      [75.31, 163.9, 3.68],
      [11.82, 152.64, 3.68],
      [84.68, 163.69, 3.68],
      [21.29, 151.86, 3.68],
      [30.6, 152.14, 3.68],
      [94.09, 163.42, 3.68],
      [39.92, 152.45, 3.68],
      [49.38, 152.15, 3.68],
      [58.74, 152.51, 3.68],
      [14.03, 141.42, 3.68],
      [68.28, 152.17, 3.68],
      [23.78, 140.3, 3.68],
      [33.19, 140.73, 3.68],
      [77.68, 152.6, 3.68],
      [42.61, 141.21, 3.68],
      [87.36, 152.22, 3.68],
      [16.99, 130.38, 3.68],
      [52.33, 140.81, 3.68],
      [61.81, 141.37, 3.68],
      [27.12, 128.94, 3.68],
      [97.18, 151.76, 3.68],
      [36.65, 129.55, 3.68],
      [71.7, 140.94, 3.68],
      [46.2, 130.22, 3.68],
      [20.69, 119.55, 3.68],
      [81.28, 141.62, 3.22],
      [56.26, 129.76, 3.68],
      [31.28, 117.86, 3.68],
      [65.91, 130.57, 3.68],
      [91.43, 141.17, 3.68],
      [40.95, 118.67, 3.68],
      [25.1, 109.01, 3.68],
      [50.66, 119.56, 3.68],
      [76.24, 130.11, 3.68],
      [101.86, 140.63, 3.68],
      [36.24, 107.12, 3.68],
      [61.14, 119.11, 3.68],
      [86.04, 131.1, 3.68],
      [46.08, 108.15, 3.68],
      [30.21, 98.78, 3.68],
      [70.99, 120.19, 3.68],
      [55.97, 109.3, 3.68],
      [96.81, 130.69, 3.68],
      [41.97, 96.76, 3.68],
      [81.86, 119.8, 3.68],
      [66.93, 108.92, 3.68],
      [35.99, 88.91, 3.68],
      [52.01, 98.06, 3.68],
      [91.92, 121.16, 3.68],
      [77.01, 110.33, 3.68],
      [62.1, 99.5, 3.68],
      [108.02, 130.25, 3.68],
      [48.45, 86.86, 3.68],
      [42.43, 79.46, 3.68],
      [58.7, 88.45, 3.68],
      [73.6, 99.28, 3.68],
      [88.51, 110.11, 3.68],
      [103.42, 120.94, 3.68],
      [69.0, 90.22, 3.68],
      [83.92, 101.07, 3.68],
      [55.64, 77.46, 3.68],
      [98.85, 111.92, 3.68],
      [49.48, 70.46, 3.68],
      [66.1, 79.39, 3.68],
      [81.09, 90.26, 3.68],
      [115.54, 120.82, 3.68],
      [96.1, 101.15, 3.68],
      [76.62, 81.54, 3.68],
      [63.5, 68.61, 3.68],
      [57.12, 61.95, 3.68],
      [111.16, 112.07, 3.68],
      [91.66, 92.49, 3.68],
      [74.18, 70.92, 3.68],
      [106.75, 103.49, 3.68],
      [89.34, 81.94, 3.68],
      [65.32, 53.98, 3.68],
      [71.98, 60.36, 3.68],
      [84.93, 73.5, 3.68],
      [104.57, 93.02, 3.68],
      [100.17, 84.67, 3.68],
      [82.89, 63.1, 3.68],
      [124.3, 112.52, 3.68],
      [74.03, 46.57, 3.68],
      [119.93, 104.21, 3.68],
      [81.05, 52.76, 3.68],
      [98.28, 74.36, 3.68],
      [115.51, 95.97, 3.68],
      [93.85, 66.16, 3.68],
      [92.17, 55.98, 3.68],
      [113.83, 85.79, 3.68],
      [109.36, 77.67, 3.68],
      [83.21, 39.76, 3.68],
      [90.66, 45.84, 3.68],
      [107.86, 67.61, 3.68],
      [103.34, 59.56, 3.68],
      [134.11, 105.5, 3.68],
      [129.59, 97.47, 3.68],
      [125.05, 89.45, 3.68],
      [101.97, 49.59, 3.68],
      [92.84, 33.59, 3.68],
      [100.74, 39.65, 3.68],
      [119.16, 71.56, 3.68],
      [123.77, 79.53, 3.68],
      [113.33, 53.76, 3.68],
      [117.99, 61.72, 3.68],
      [102.85, 28.07, 3.68],
      [112.24, 43.97, 3.68],
      [111.25, 34.21, 3.68],
      [135.23, 84.0, 3.68],
      [139.99, 91.95, 3.68],
      [129.49, 66.38, 3.68],
      [144.8, 99.89, 3.68],
      [134.3, 74.33, 3.68],
      [123.76, 48.78, 3.68],
      [113.22, 23.24, 3.68],
      [128.6, 56.73, 3.68],
      [122.91, 39.16, 3.68],
      [122.13, 29.56, 3.68],
      [123.88, 19.11, 3.68],
      [145.95, 79.7, 3.68],
      [140.26, 62.18, 3.68],
      [134.56, 44.66, 3.68],
      [133.91, 35.18, 3.68],
      [139.61, 52.7, 3.68],
      [145.3, 70.22, 3.68],
      [150.99, 87.74, 3.68],
      [133.33, 25.72, 3.68],
      [156.15, 95.81, 3.68],
      [134.8, 15.71, 3.68],
      [145.66, 41.43, 3.68],
      [151.36, 59.0, 3.68],
      [145.19, 32.07, 3.68],
      [144.77, 22.71, 3.68],
      [150.92, 49.65, 3.68],
      [157.07, 76.59, 3.68],
      [156.66, 67.26, 3.68],
      [145.92, 13.05, 3.68],
      [162.42, 84.9, 3.68],
      [156.98, 39.1, 3.68],
      [156.68, 29.83, 3.68],
      [156.41, 20.55, 3.68],
      [162.72, 56.86, 3.68],
      [167.96, 93.33, 3.68],
      [157.19, 11.14, 3.68],
      [162.46, 47.6, 3.68],
      [168.47, 74.71, 3.68],
      [168.27, 65.47, 3.68],
      [168.45, 37.7, 3.68],
      [168.31, 28.48, 3.68],
      [168.17, 19.25, 3.68],
      [168.57, 9.99, 3.68],
      [174.11, 83.47, 3.68],
      [174.22, 55.79, 3.68],
      [174.14, 46.58, 3.68],
      [180.0, 37.24, 3.68],
      [180.0, 92.5, 3.68],
      [180.0, 74.08, 3.68],
      [180.0, 64.87, 3.68],
      [180.0, 9.61, 3.68],
      [180.0, 28.03, 3.68],
      [180.0, 18.82, 3.68],
      [185.86, 46.58, 3.68],
      [185.78, 55.79, 3.68],
      [185.89, 83.47, 3.68],
      [191.43, 9.99, 3.68],
      [191.83, 19.25, 3.68],
      [191.69, 28.48, 3.68],
      [191.55, 37.7, 3.68],
      [191.73, 65.47, 3.68],
      [191.53, 74.71, 3.68],
      [197.54, 47.6, 3.68],
      [202.81, 11.14, 3.68],
      [192.04, 93.33, 3.68],
      [197.28, 56.86, 3.68],
      [203.59, 20.55, 3.68],
      [203.32, 29.83, 3.68],
      [203.02, 39.1, 3.68],
      [197.58, 84.9, 3.68],
      [214.08, 13.05, 3.68],
      [203.34, 67.26, 3.68],
      [202.93, 76.59, 3.68],
      [209.08, 49.65, 3.68],
      [215.23, 22.71, 3.68],
      [214.81, 32.07, 3.68],
      [208.64, 59.0, 3.68],
      [214.34, 41.43, 3.68],
      [225.2, 15.71, 3.68],
      [203.85, 95.81, 3.68],
      [226.67, 25.72, 3.68],
      [209.01, 87.74, 3.68],
      [214.7, 70.22, 3.68],
      [220.39, 52.7, 3.68],
      [226.09, 35.18, 3.68],
      [225.44, 44.66, 3.68],
      [219.74, 62.18, 3.68],
      [214.05, 79.7, 3.68],
      [236.12, 19.11, 3.68],
      [237.87, 29.56, 3.68],
      [237.09, 39.16, 3.68],
      [231.4, 56.73, 3.68],
      [246.78, 23.24, 3.68],
      [236.24, 48.78, 3.68],
      [225.7, 74.33, 3.68],
      [215.2, 99.89, 3.68],
      [230.51, 66.38, 3.68],
      [220.01, 91.95, 3.68],
      [224.77, 84.0, 3.68],
      [248.75, 34.21, 3.68],
      [247.76, 43.97, 3.68],
      [257.15, 28.07, 3.68],
      [242.01, 61.72, 3.68],
      [246.67, 53.76, 3.68],
      [236.23, 79.53, 3.68],
      [240.84, 71.56, 3.68],
      [259.26, 39.65, 3.68],
      [267.16, 33.59, 3.68],
      [258.03, 49.59, 3.68],
      [234.95, 89.45, 3.68],
      [230.41, 97.47, 3.68],
      [225.89, 105.5, 3.68],
      [256.66, 59.56, 3.68],
      [252.14, 67.61, 3.68],
      [269.34, 45.84, 3.68],
      [276.79, 39.76, 3.68],
      [250.64, 77.67, 3.68],
      [246.17, 85.79, 3.68],
      [267.83, 55.98, 3.68],
      [266.15, 66.16, 3.68],
      [244.49, 95.97, 3.68],
      [261.72, 74.36, 3.68],
      [278.95, 52.76, 3.68],
      [240.07, 104.21, 3.68],
      [285.97, 46.57, 3.68],
      [235.7, 112.52, 3.68],
      [277.11, 63.1, 3.68],
      [259.83, 84.67, 3.68],
      [255.43, 93.02, 3.68],
      [275.07, 73.5, 3.68],
      [288.02, 60.36, 3.22],
      [294.68, 53.98, 3.22],
      [270.66, 81.94, 3.68],
      [253.25, 103.49, 3.68],
      [285.82, 70.92, 3.68],
      [268.34, 92.49, 3.68],
      [248.84, 112.07, 3.68],
      [302.88, 61.95, 3.68],
      [296.5, 68.61, 3.68],
      [283.38, 81.54, 3.68],
      [263.9, 101.15, 3.68],
      [244.46, 120.82, 3.68],
      [278.91, 90.26, 3.68],
      [293.9, 79.39, 3.68],
      [310.52, 70.46, 3.68],
      [261.15, 111.92, 3.68],
      [304.36, 77.46, 3.68],
      [276.08, 101.07, 3.68],
      [291.0, 90.22, 3.68],
      [256.58, 120.94, 3.68],
      [271.49, 110.11, 3.68],
      [286.4, 99.28, 3.22],
      [301.3, 88.45, 3.68],
      [317.57, 79.46, 3.68],
      [311.55, 86.86, 3.68],
      [251.98, 130.25, 3.68],
      [297.9, 99.5, 3.68],
      [282.99, 110.33, 3.68],
      [268.08, 121.16, 3.68],
      [307.99, 98.06, 3.68],
      [324.01, 88.91, 3.68],
      [293.07, 108.92, 3.68],
      [278.14, 119.8, 3.68],
      [318.03, 96.76, 3.68],
      [263.19, 130.69, 3.68],
      [304.03, 109.3, 3.68],
      [289.01, 120.19, 3.68],
      [329.79, 98.78, 3.68],
      [313.92, 108.15, 3.68],
      [273.96, 131.1, 3.68],
      [298.86, 119.11, 3.68],
      [323.76, 107.12, 3.68],
      [258.14, 140.63, 3.68],
      [283.76, 130.11, 3.68],
      [309.34, 119.56, 3.68],
      [334.9, 109.01, 3.68],
      [319.05, 118.67, 3.68],
      [268.57, 141.17, 3.68],
      [294.09, 130.57, 3.68],
      [328.72, 117.86, 3.68],
      [303.74, 129.76, 3.68],
      [278.72, 141.62, 3.68],
      [339.31, 119.55, 3.68],
      [313.8, 130.22, 3.68],
      [288.3, 140.94, 3.68],
      [323.35, 129.55, 3.68],
      [262.82, 151.76, 3.68],
      [332.88, 128.94, 3.68],
      [298.19, 141.37, 3.68],
      [307.67, 140.81, 3.68],
      [343.01, 130.38, 3.68],
      [272.64, 152.22, 3.68],
      [317.39, 141.21, 3.68],
      [282.32, 152.6, 3.68],
      [326.81, 140.73, 3.68],
      [336.22, 140.3, 3.68],
      [291.72, 152.17, 3.68],
      [345.97, 141.42, 3.68],
      [301.26, 152.51, 3.68],
      [310.62, 152.15, 3.68],
      [320.08, 152.45, 3.68],
      [265.91, 163.42, 3.68],
      [329.4, 152.14, 3.68],
      [338.71, 151.86, 3.68],
      [275.32, 163.69, 3.68],
      [348.18, 152.64, 3.68],
      [284.69, 163.9, 3.68],
      [293.97, 163.7, 3.68],
      [303.29, 163.88, 3.68],
      [312.56, 163.71, 3.68],
      [321.85, 163.87, 3.68],
      [331.1, 163.72, 3.68],
      [340.35, 163.59, 3.68],
      [349.64, 163.98, 3.68],
      [267.38, 175.39, 3.68],
      [276.6, 175.39, 3.68],
      [285.82, 175.39, 3.68],
      [295.04, 175.39, 3.68],
      [304.26, 175.39, 3.68],
      [313.47, 175.39, 3.68],
      [322.69, 175.39, 3.68],
      [331.9, 175.39, 3.68],
      [341.12, 175.39, 3.17],
      [350.33, 175.39, 3.17],
    ],
  },
  israel: {
    w: 270, h: 240, cx: 135.0, cy: 136.0,
    seats: [
      [135.0, 40.0, 6.7],
      [135.0, 56.0, 6.7],
      [135.0, 24.0, 6.7],
      [135.0, 8.0, 6.7],
      [151.0, 42.0, 6.7],
      [151.0, 58.0, 6.7],
      [151.0, 26.0, 6.7],
      [151.0, 10.0, 6.7],
      [167.0, 44.0, 6.7],
      [167.0, 60.0, 6.7],
      [167.0, 28.0, 6.7],
      [167.0, 12.0, 6.7],
      [183.0, 46.0, 6.7],
      [183.0, 62.0, 6.7],
      [183.0, 30.0, 6.7],
      [183.0, 14.0, 6.7],
      [199.0, 48.0, 6.7],
      [199.0, 32.0, 6.7],
      [199.0, 16.0, 6.7],
      [215.0, 34.0, 6.7],
      [215.0, 18.0, 6.7],
      [231.0, 20.0, 6.7],
      [119.0, 42.0, 6.7],
      [119.0, 58.0, 6.7],
      [119.0, 26.0, 6.7],
      [119.0, 10.0, 6.7],
      [103.0, 44.0, 6.7],
      [103.0, 60.0, 6.7],
      [103.0, 28.0, 6.7],
      [103.0, 12.0, 6.7],
      [87.0, 46.0, 6.7],
      [87.0, 62.0, 6.7],
      [87.0, 30.0, 6.7],
      [87.0, 14.0, 6.7],
      [71.0, 48.0, 6.7],
      [71.0, 32.0, 6.7],
      [71.0, 16.0, 6.7],
      [55.0, 34.0, 6.7],
      [55.0, 18.0, 6.7],
      [39.0, 20.0, 6.7],
      [230.0, 136.0, 6.7],
      [214.0, 136.0, 6.7],
      [246.0, 136.0, 6.7],
      [262.0, 136.0, 6.7],
      [228.0, 152.0, 6.7],
      [212.0, 152.0, 6.7],
      [244.0, 152.0, 6.7],
      [260.0, 152.0, 6.7],
      [226.0, 168.0, 6.7],
      [210.0, 168.0, 6.7],
      [242.0, 168.0, 6.7],
      [258.0, 168.0, 6.7],
      [224.0, 184.0, 6.7],
      [208.0, 184.0, 6.7],
      [240.0, 184.0, 6.7],
      [256.0, 184.0, 6.7],
      [222.0, 200.0, 6.7],
      [238.0, 200.0, 6.7],
      [254.0, 200.0, 6.7],
      [236.0, 216.0, 6.7],
      [252.0, 216.0, 6.7],
      [250.0, 232.0, 6.7],
      [228.0, 120.0, 6.7],
      [212.0, 120.0, 6.7],
      [244.0, 120.0, 6.7],
      [260.0, 120.0, 6.7],
      [226.0, 104.0, 6.7],
      [210.0, 104.0, 6.7],
      [242.0, 104.0, 6.7],
      [258.0, 104.0, 6.7],
      [224.0, 88.0, 6.7],
      [208.0, 88.0, 6.7],
      [240.0, 88.0, 6.7],
      [256.0, 88.0, 6.7],
      [222.0, 72.0, 6.7],
      [238.0, 72.0, 6.7],
      [254.0, 72.0, 6.7],
      [236.0, 56.0, 6.7],
      [252.0, 56.0, 6.7],
      [250.0, 40.0, 6.7],
      [40.0, 136.0, 6.7],
      [56.0, 136.0, 6.7],
      [24.0, 136.0, 6.7],
      [8.0, 136.0, 6.7],
      [42.0, 152.0, 6.7],
      [58.0, 152.0, 6.7],
      [26.0, 152.0, 6.7],
      [10.0, 152.0, 6.7],
      [44.0, 168.0, 6.7],
      [60.0, 168.0, 6.7],
      [28.0, 168.0, 6.7],
      [12.0, 168.0, 6.7],
      [46.0, 184.0, 6.7],
      [62.0, 184.0, 6.7],
      [30.0, 184.0, 6.7],
      [14.0, 184.0, 6.7],
      [48.0, 200.0, 6.7],
      [32.0, 200.0, 6.7],
      [16.0, 200.0, 6.7],
      [34.0, 216.0, 6.7],
      [18.0, 216.0, 6.7],
      [20.0, 232.0, 6.7],
      [42.0, 120.0, 6.7],
      [58.0, 120.0, 6.7],
      [26.0, 120.0, 6.7],
      [10.0, 120.0, 6.7],
      [44.0, 104.0, 6.7],
      [60.0, 104.0, 6.7],
      [28.0, 104.0, 6.7],
      [12.0, 104.0, 6.7],
      [46.0, 88.0, 6.7],
      [62.0, 88.0, 6.7],
      [30.0, 88.0, 6.7],
      [14.0, 88.0, 6.7],
      [48.0, 72.0, 6.7],
      [32.0, 72.0, 6.7],
      [16.0, 72.0, 6.7],
      [34.0, 56.0, 6.7],
      [18.0, 56.0, 6.7],
      [20.0, 40.0, 6.7],
    ],
  },
  saxony_anhalt: {
    w: 360, h: 185, cx: 180.0, cy: 180.0,
    seats: [
      [9.67, 175.39, 5.5],
      [46.53, 175.39, 5.5],
      [83.40, 175.39, 5.5],
      [38.15, 163.87, 5.5],
      [75.31, 163.90, 5.5],
      [30.60, 152.14, 5.5],
      [58.74, 152.51, 5.5],
      [77.68, 152.60, 5.5],
      [52.33, 140.81, 5.5],
      [36.65, 129.55, 5.5],
      [81.28, 141.62, 5.5],
      [40.95, 118.67, 5.5],
      [101.86, 140.63, 5.5],
      [46.08, 108.15, 5.5],
      [96.81, 130.69, 5.5],
      [52.01, 98.06, 5.5],
      [108.02, 130.25, 5.5],
      [73.60, 99.28, 5.5],
      [83.92, 101.07, 5.5],
      [81.09, 90.26, 5.5],
      [63.50, 68.61, 5.5],
      [74.18, 70.92, 5.5],
      [71.98, 60.36, 5.5],
      [124.30, 112.52, 5.5],
      [98.28, 74.36, 5.5],
      [113.83, 85.79, 5.5],
      [107.86, 67.61, 5.5],
      [101.97, 49.59, 5.5],
      [123.77, 79.53, 5.5],
      [112.24, 43.97, 5.5],
      [129.49, 66.38, 5.5],
      [128.60, 56.73, 5.5],
      [145.95, 79.70, 5.5],
      [139.61, 52.70, 5.5],
      [156.15, 95.81, 5.5],
      [144.77, 22.71, 5.5],
      [145.92, 13.05, 5.5],
      [156.41, 20.55, 5.5],
      [162.46, 47.60, 5.5],
      [168.17, 19.25, 5.5],
      [174.14, 46.58, 5.5],
      [180.00, 64.87, 5.5],
      [185.86, 46.58, 5.5],
      [191.83, 19.25, 5.5],
      [197.54, 47.60, 5.5],
      [203.59, 20.55, 5.5],
      [214.08, 13.05, 5.5],
      [215.23, 22.71, 5.5],
      [203.85, 95.81, 5.5],
      [220.39, 52.70, 5.5],
      [214.05, 79.70, 5.5],
      [231.40, 56.73, 5.5],
      [230.51, 66.38, 5.5],
      [247.76, 43.97, 5.5],
      [236.23, 79.53, 5.5],
      [258.03, 49.59, 5.5],
      [252.14, 67.61, 5.5],
      [246.17, 85.79, 5.5],
      [261.72, 74.36, 5.5],
      [235.70, 112.52, 5.5],
      [288.02, 60.36, 5.5],
      [285.82, 70.92, 5.5],
      [296.50, 68.61, 5.5],
      [278.91, 90.26, 5.5],
      [276.08, 101.07, 5.5],
      [286.40, 99.28, 5.5],
      [251.98, 130.25, 5.5],
      [307.99, 98.06, 5.5],
      [263.19, 130.69, 5.5],
      [313.92, 108.15, 5.5],
      [258.14, 140.63, 5.5],
      [319.05, 118.67, 5.5],
      [278.72, 141.62, 5.5],
      [323.35, 129.55, 5.5],
      [307.67, 140.81, 5.5],
      [282.32, 152.60, 5.5],
      [301.26, 152.51, 5.5],
      [329.40, 152.14, 5.5],
      [284.69, 163.90, 5.5],
      [321.85, 163.87, 5.5],
      [276.60, 175.39, 5.5],
      [313.47, 175.39, 5.5],
      [350.33, 175.39, 5.5],
    ],
  },
    saxony_anhalt_ovh: {
    w: 360, h: 185, cx: 180.0, cy: 180.0,
    seats: [
      [9.67, 175.39, 5.5],
      [28.10, 175.39, 5.5],
      [55.74, 175.39, 5.5],
      [74.18, 175.39, 5.5],
      [10.36, 163.98, 5.5],
      [28.90, 163.72, 5.5],
      [56.71, 163.88, 5.5],
      [75.31, 163.90, 5.5],
      [21.29, 151.86, 5.5],
      [94.09, 163.42, 5.5],
      [58.74, 152.51, 5.5],
      [68.28, 152.17, 5.5],
      [77.68, 152.60, 5.5],
      [87.36, 152.22, 5.5],
      [61.81, 141.37, 5.5],
      [97.18, 151.76, 5.5],
      [46.20, 130.22, 5.5],
      [81.28, 141.62, 5.5],
      [65.91, 130.57, 5.5],
      [40.95, 118.67, 5.5],
      [76.24, 130.11, 5.5],
      [36.24, 107.12, 5.5],
      [46.08, 108.15, 5.5],
      [70.99, 120.19, 5.5],
      [41.97, 96.76, 5.5],
      [66.93, 108.92, 5.5],
      [91.92, 121.16, 5.5],
      [62.10, 99.50, 5.5],
      [42.43, 79.46, 5.5],
      [73.60, 99.28, 5.5],
      [69.00, 90.22, 5.5],
      [55.64, 77.46, 5.5],
      [66.10, 79.39, 5.5],
      [115.54, 120.82, 5.5],
      [63.50, 68.61, 5.5],
      [111.16, 112.07, 5.5],
      [106.75, 103.49, 5.5],
      [65.32, 53.98, 5.5],
      [104.57, 93.02, 5.5],
      [82.89, 63.10, 5.5],
      [119.93, 104.21, 5.5],
      [98.28, 74.36, 5.5],
      [92.17, 55.98, 5.5],
      [109.36, 77.67, 5.5],
      [107.86, 67.61, 5.5],
      [134.11, 105.50, 5.5],
      [101.97, 49.59, 5.5],
      [100.74, 39.65, 5.5],
      [113.33, 53.76, 5.5],
      [102.85, 28.07, 5.5],
      [135.23, 84.00, 5.5],
      [129.49, 66.38, 5.5],
      [123.76, 48.78, 5.5],
      [128.60, 56.73, 5.5],
      [123.88, 19.11, 5.5],
      [140.26, 62.18, 5.5],
      [139.61, 52.70, 5.5],
      [150.99, 87.74, 5.5],
      [134.80, 15.71, 5.5],
      [151.36, 59.00, 5.5],
      [150.92, 49.65, 5.5],
      [156.66, 67.26, 5.5],
      [156.98, 39.10, 5.5],
      [156.41, 20.55, 5.5],
      [157.19, 11.14, 5.5],
      [168.47, 74.71, 5.5],
      [168.31, 28.48, 5.5],
      [168.57, 9.99, 5.5],
      [174.14, 46.58, 5.5],
      [180.00, 92.50, 5.5],
      [180.00, 9.61, 5.5],
      [180.00, 18.82, 5.5],
      [185.89, 83.47, 5.5],
      [191.83, 19.25, 5.5],
      [191.73, 65.47, 5.5],
      [197.54, 47.60, 5.5],
      [197.28, 56.86, 5.5],
      [203.32, 29.83, 5.5],
      [214.08, 13.05, 5.5],
      [202.93, 76.59, 5.5],
      [214.81, 32.07, 5.5],
      [214.34, 41.43, 5.5],
      [226.67, 25.72, 5.5],
      [214.70, 70.22, 5.5],
      [225.44, 44.66, 5.5],
      [214.05, 79.70, 5.5],
      [237.09, 39.16, 5.5],
      [246.78, 23.24, 5.5],
      [215.20, 99.89, 5.5],
      [220.01, 91.95, 5.5],
      [247.76, 43.97, 5.5],
      [242.01, 61.72, 5.5],
      [240.84, 71.56, 5.5],
      [267.16, 33.59, 5.5],
      [230.41, 97.47, 5.5],
      [256.66, 59.56, 5.5],
      [276.79, 39.76, 5.5],
      [246.17, 85.79, 5.5],
      [244.49, 95.97, 5.5],
      [278.95, 52.76, 5.5],
      [235.70, 112.52, 5.5],
      [259.83, 84.67, 5.5],
      [288.02, 60.36, 5.5],
      [270.66, 81.94, 5.5],
      [268.34, 92.49, 5.5],
      [302.88, 61.95, 5.5],
      [263.90, 101.15, 5.5],
      [278.91, 90.26, 5.5],
      [261.15, 111.92, 5.5],
      [276.08, 101.07, 5.5],
      [271.49, 110.11, 5.5],
      [301.30, 88.45, 5.5],
      [251.98, 130.25, 5.5],
      [282.99, 110.33, 5.5],
      [324.01, 88.91, 5.5],
      [278.14, 119.80, 5.5],
      [304.03, 109.30, 5.5],
      [329.79, 98.78, 5.5],
      [298.86, 119.11, 5.5],
      [258.14, 140.63, 5.5],
      [334.90, 109.01, 5.5],
      [268.57, 141.17, 5.5],
      [303.74, 129.76, 5.5],
      [339.31, 119.55, 5.5],
      [323.35, 129.55, 5.5],
      [332.88, 128.94, 5.5],
      [343.01, 130.38, 5.5],
      [317.39, 141.21, 5.5],
      [336.22, 140.30, 5.5],
      [345.97, 141.42, 5.5],
      [320.08, 152.45, 5.5],
      [329.40, 152.14, 5.5],
      [348.18, 152.64, 5.5],
      [293.97, 163.70, 5.5],
      [321.85, 163.87, 5.5],
      [340.35, 163.59, 5.5],
      [276.60, 175.39, 5.5],
      [295.04, 175.39, 5.5],
      [322.69, 175.39, 5.5],
      [341.12, 175.39, 5.5],
    ],
  },
};

// ===== Runtime arch generation (canonical ParliamentArch geometry) =====
// Port of the getSeatCenters algorithm from @parliamentarch/core
// (https://github.com/Gouvernathor/ParliamentArch-TS), the geometry used by
// the Wikimedia toolforge parliamentdiagram generator. BSD 3-Clause (c)
// Gouvernathor and contributors. Used for parliaments without a supplied
// layout or when a supplied layout is too small.
function generateArchLayout(nSeats, opts){
  opts=opts||{};
  const halfWidth=opts.halfWidth||180, cx=opts.cx||180, cy=opts.cy||180;
  const spanAngle=opts.spanAngle||180, minNRows=opts.minNRows||0;
  function nRows(n){
    let r=1;
    while(rowsFromNRows(r).reduce((a,b)=>a+b,0)<n) r++;
    return r;
  }
  function rowsFromNRows(n){
    const th=1/(2*n-1), rad=Math.PI*spanAngle/180;
    const out=[];
    for(let r=0;r<n;r++) out.push(Math.floor(rad*(0.5+r*th)/th));
    return out;
  }
  const nRowsTot=Math.max(minNRows, nRows(nSeats));
  const rowThickness=1/(2*nRowsTot-1);
  const maxSeatRadius=rowThickness/2;
  const spanMargin=(1-spanAngle/180)*Math.PI/2;
  const maxed=rowsFromNRows(nRowsTot);
  const fillingRatio=nSeats/maxed.reduce((a,b)=>a+b,0);
  const seats=[];
  for(let row=0;row<nRowsTot;row++){
    let rowSeats=(row===nRowsTot-1)?(nSeats-seats.length):Math.round(fillingRatio*maxed[row]);
    const pxr=(0.5+row*rowThickness)*halfWidth;
    const pxrSeat=maxSeatRadius*halfWidth;
    if(rowSeats===1){
      seats.push([cx, cy-pxr, pxrSeat]);
    }else{
      const angleMargin=Math.asin(maxSeatRadius/(0.5+row*rowThickness))+spanMargin;
      const step=(Math.PI-2*angleMargin)/(rowSeats-1);
      for(let s=0;s<rowSeats;s++){
        const a=angleMargin+s*step;
        seats.push([cx+pxr*Math.cos(a), cy-pxr*Math.sin(a), pxrSeat]);
      }
    }
  }
  return {w:halfWidth*2, h:185, cx:cx, cy:cy, seats:seats};
}

// ===== AltıCiftSıfır — App =====
(function(){
'use strict';

/* ---------- helpers ---------- */
const $=s=>BMV_ROOT.querySelector('#'+s);
// Base path for data/ assets:
//   /600/               -> ''          (Pages root)
//   /600/site/          -> '../'       (local dev under site/)
//   /600/<country>/     -> '../'       (country sub-page wrapper)
//   /600/archive/<slug>/-> '../../'    (frozen archive snapshot)
const dataBase=()=>{
  // Archive snapshots carry their own js/css/img/data locally
  if(typeof window!=='undefined'&&window.__600_LOCAL_ASSETS__) return '';
  // Derive base from where app.js was loaded: <base>js/app.js
  // Works for /600/, /600/sweden/, /sweden/, /site/... and archives.
  const s=document.querySelector('script[src*="app.js"]');
  if(s){
    let src=s.getAttribute('src')||'';
    if(src.startsWith('./')) src=src.slice(2);
    const i=src.lastIndexOf('js/app.js');
    if(i>0) return src.slice(0,i);
  }
  // Fallback: pathname depth
  const p=window.location.pathname;
  if(p.includes('/site/')) return '../';
  const segs=p.split('/').filter(s=>s);
  const last=segs[segs.length-1]||'';
  if(last==='index.html') segs.pop();
  const depth=segs.length;
  if(depth<=1) return '';
  return '../'.repeat(depth-1);
};
const isPinnedCountry=()=>true;

/* ---------- language ---------- */
let LANG='en';
try{ LANG=localStorage.getItem('600_lang')||'en'; }catch(e){}
const t=(en,tr)=>(LANG==='tr'&&tr!=null?tr:en);
let T={};
function setLang(){
  T={
    tabs:{polls:t('POLLS','ANKETLER'),forecast:t('FORECAST','TAHMİN'),history:t('HISTORY','GEÇMİŞ'),live:t('LIVE','CANLI'),methodology:t('METHODOLOGY','YÖNTEM')},
    main:t('MAIN','ANA'),
    country:t('COUNTRY','ÜLKE'), filters:t('FILTERS','FİLTRELER'), timeRange:t('TIME RANGE','ZAMAN ARALIĞI'),
    pollster:t('POLLSTER','ANKET'), allPollsters:t('All pollsters','Tüm anketler'),
    last7:t('Last 7 days','Son 7 gün'),last14:t('Last 14 days','Son 14 gün'),last30:t('Last 30 days','Son 30 gün'),
    last60:t('Last 60 days','Son 60 gün'),last90:t('Last 90 days','Son 90 gün'),allPolls:t('All polls','Tüm anketler'),
    info:t('INFO','BİLGİ'), seats:t('seats','sandalye'), threshold:t('threshold','eşik'),
    pollAvg:t('NATIONAL POLL AVERAGE','ULUSAL ANKET ORTALAMASI'), trend:t('POLL TREND','ANKET TRENDİ'),
    seatProjection:t('SEAT PROJECTION','SANDALYE TAHMİNİ'), individualPolls:t('INDIVIDUAL POLLS','BİREYSEL ANKETLER'),
    constituencySeats:t('CONSTITUENCY SEATS','BÖLGE SANDALYELERİ'), districtMap:t('DISTRICT MAP','BÖLGE HARİTASI'),
    history:t('HISTORY','GEÇMİŞ'),
    projection:t('PROJECTION','TAHMİN'), result:t('RESULT','SONUÇ'), map:t('MAP','HARİTA'), blocs:t('BLOCS','BLOKLAR'),
    liveVs:t('LIVE vs VALU vs FORECAST','CANLI vs ÇIKIŞ ANKETİ vs TAHMİN'),
    seatsLive:t('SEATS (LIVE)','SANDALYELER (CANLI)'),
    liveMap:t('VALKRETS LIVE MAP','CANLI BÖLGE HARİTASI'),
    counted:t('districts counted','bölge sayıldı'), turnout:t('turnout','katılım'), updated:t('updated','güncellendi'),
    swing:t('vs 2022','2022 farkı'),
    ifHeldToday:t('IF THE ELECTION WERE HELD TODAY','SEÇİM BUGÜN OLSAYDI'),
    probabilities:t('PROBABILITIES','OLASILIKLAR'), majority:t('MAJORITY','ÇOĞUNLUK'),
    largestParty:t('LARGEST PARTY','EN BÜYÜK PARTİ'), voteShare:t('VOTE SHARE','OY ORANI'),
    seatDistribution:t('SEAT DISTRIBUTION','SANDALYE DAĞILIMI'),
    election:t('ELECTION','SEÇİMİ'),
    pollAverage:t('Poll Average','Anket Ortalaması'),
    twoRound:t('two-round presidential','iki turlu başkanlık seçimi'),
    coloredBy:t('colored by','renklendirilen'),
  };
}
setLang();
function applyLang(){
  BMV_ROOT.querySelectorAll('.tab-trigger').forEach(b=>{
    const tab=b.dataset.tab;
    if(T.tabs[tab]!=null&&b.textContent!==T.tabs[tab]) b.textContent=T.tabs[tab];
  });
  BMV_ROOT.querySelectorAll('.tab-social').forEach(a=>{
    const txt=a.textContent.trim();
    if(txt==='MAIN'||txt==='ANA') a.textContent=T.main;
    else if(txt==='ARCHIVE'||txt==='ARŞİV') a.textContent=t('ARCHIVE','ARŞİV');
  });
}
function toggleLang(){
  LANG=(LANG==='tr')?'en':'tr';
  try{localStorage.setItem('600_lang',LANG)}catch(e){}
  setLang();
  applyLang();
  const btn=$('lang-toggle');
  if(btn){btn.textContent=(LANG==='tr')?'EN':'TR';btn.title=(LANG==='tr')?'Switch to English':'Türkçeye geç';}
  // re-render current tab
  const active=BMV_ROOT.querySelector('.tab-trigger[data-active="true"]');
  const tabId=active?active.dataset.tab:'polls';
  const pane=$('pane-'+tabId);
  if(!pane) return;
  if(tabId==='polls') renderPollsTab();
  else if(tabId==='forecast') renderForecast(pane);
  else if(tabId==='live') renderLive(pane);
  else if(tabId==='history') renderHistory(pane);
  else if(tabId==='methodology') renderMethodology(pane);
}
function injectLangToggle(){
  const nav=$('segnav');
  if(!nav) return;
  const btn=document.createElement('button');
  btn.className='tab-social lang-toggle';
  btn.id='lang-toggle';
  btn.textContent=(LANG==='tr')?'EN':'TR';
  btn.title=(LANG==='tr')?'Switch to English':'Türkçeye geç';
  btn.addEventListener('click',toggleLang);
  const group=nav.querySelector('.segnav-right');
  if(group) group.appendChild(btn);
  else nav.appendChild(btn);
  applyLang();
}
document.addEventListener('DOMContentLoaded',()=>{injectLangToggle();});
const fmt=(v,d=1)=>v.toFixed(d);
const pct=(v,d=1)=>fmt(v,d)+'%';
const valDisp=(v,d=1)=>SEAT_BASED?String(Math.ceil(v)):fmt(v,d)+'%';
const partyCode=pid=>(PARTY_META[pid]&&PARTY_META[pid].code)?PARTY_META[pid].code:pid;

// Label for the sub-national units (MAP_ONLY countries can override; default "federative units")
const unitLabel=()=>{
  const c=COUNTRIES[COUNTRY];
  if(c&&c.unitLabel) return c.unitLabel[LANG]||c.unitLabel.en||c.unitLabel;
  return t('federative units','federal birim');
};
const methodName=()=>{
  if(SEAT_METHOD==='dhondt') return "D'Hondt";
  if(SEAT_METHOD==='hare_niemeyer') return 'Hare/Niemeyer';
  if(SEAT_METHOD==='imperiali_hb') return 'Imperiali + Hagenbach-Bischoff';
  return 'modified Sainte-Laguë';
};
const methodNameShort=()=>{
  if(SEAT_METHOD==='dhondt') return "D'Hondt";
  if(SEAT_METHOD==='hare_niemeyer') return 'Hare/Niemeyer';
  if(SEAT_METHOD==='imperiali_hb') return 'Imperiali/H-B';
  return 'Sainte-Laguë';
};
function methodSentence(){
  const nD=MAP_CONF()&&MAP_CONF().seatDistricts?Object.keys(MAP_CONF().seatDistricts).length:0;
  if(SEAT_METHOD==='dhondt') return nD?`the <strong>D'Hondt</strong> method in ${nD} multi-member constituencies`:"the <strong>D'Hondt</strong> method in a single national district";
  if(SEAT_METHOD==='hare_niemeyer') return "the <strong>Hare/Niemeyer</strong> method (largest remainder, Hare quota = votes ÷ seats) in a single national district";
  if(SEAT_METHOD==='imperiali_hb') return "the <strong>Imperiali quota</strong> (votes ÷ (seats+2)) in each of the 14 regions, then a <strong>national second scrutiny</strong> by Hagenbach-Bischoff (remainder votes ÷ (unfilled seats+1))";
  return "<strong>modified Sainte-Laguë</strong> (divisor 1.2)";
}

/* ---------- tab switching ---------- */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.tab-trigger');
  if(!btn) return;
  switchTab(btn);
});
// ARIA tabs: arrow keys move between tab triggers (left/right), Home/End.
function switchTab(btn){
  if(!btn) return;
  BMV_ROOT.querySelectorAll('.tab-trigger').forEach(b=>b.dataset.active='false');
  btn.dataset.active='true';
  const tabId=btn.dataset.tab;
  BMV_ROOT.querySelectorAll('.tab-pane').forEach(p=>{p.style.display='none';p.classList.remove('active');p.setAttribute('aria-hidden','true')});
  const pane=$('pane-'+tabId);
  if(pane){pane.style.display='block';pane.classList.add('active');pane.setAttribute('aria-hidden','false');if(tabId==='forecast'){renderForecast(pane);pane.dataset.loaded='1'}if(tabId==='live'&&!pane.dataset.loaded){renderLive(pane);pane.dataset.loaded='1'}if(tabId==='history'&&!pane.dataset.loaded){renderHistory(pane);pane.dataset.loaded='1'}if(tabId==='methodology'&&!pane.dataset.loaded){renderMethodology(pane);pane.dataset.loaded='1'}}
}
document.addEventListener('keydown',e=>{
  if(!e.target.closest||!e.target.closest('.tab-trigger')) return;
  const tabs=Array.from(BMV_ROOT.querySelectorAll('.tab-trigger'));
  const idx=tabs.indexOf(e.target);
  if(idx<0) return;
  let next=null;
  if(e.key==='ArrowRight') next=tabs[(idx+1)%tabs.length];
  else if(e.key==='ArrowLeft') next=tabs[(idx-1+tabs.length)%tabs.length];
  else if(e.key==='Home') next=tabs[0];
  else if(e.key==='End') next=tabs[tabs.length-1];
  if(next){e.preventDefault();next.focus();switchTab(next);}
});

/* ---------- load constituency data ---------- */
let CONSTITUENCIES=null;

async function loadConstituencies(){
  CONSTITUENCIES=null;
  if(!HAS_CONSTITUENCIES) return;
  try{
    const base=dataBase();
    const resp=await fetch(base+'data/'+COUNTRY+'/constituencies.json');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    CONSTITUENCIES=await resp.json();
  }catch(e){
    console.error('Failed to load constituencies:',e);
    CONSTITUENCIES=[];
  }
}

/* ---------- constituency seat allocator ---------- */
function allocateConstituencySeats(votes, constituency){
  const seats=constituency.seats;
  const results=constituency.results_2022;
  // Shift 2022 results by (poll_avg - 2022_national) per party
  const shifted={};
  for(const pid of PARTY_ORDER){
    const pollVal=votes[pid]||0;
    const lastVal=results[pid]||0;
    shifted[pid]=Math.max(0,lastVal+(pollVal-(LAST_ELECTION.results[pid]||0)));
  }
  const total=Object.values(shifted).reduce((a,b)=>a+b,0);
  if(total===0) return {};
  const pctShifted={};
  for(const pid of PARTY_ORDER) pctShifted[pid]=(shifted[pid]/total)*100;
  // Swedish rule: >=4% nationally OR >=12% in the constituency
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD||pctShifted[p]>=12);
  const totalValid=valid.reduce((s,p)=>s+pctShifted[p],0);
  if(totalValid===0) return {};
  const divisors=[1.2];
  for(let i=1;i<=seats;i++) divisors.push(2*i+1);
  const q=[];
  valid.forEach(p=>{for(let d=0;d<divisors.length;d++)q.push({party:p,q:pctShifted[p]/divisors[d]})});
  q.sort((a,b)=>b.q-a.q);
  const seatAlloc={};valid.forEach(p=>{seatAlloc[p]=0});
  for(let i=0;i<seats&&i<q.length;i++)seatAlloc[q[i].party]++;
  return seatAlloc;
}

function allocateConstituencySeats2022(c){
  const r=c.results_2022||{};
  const votes={};
  for(const p of PARTY_ORDER) votes[p]=r[p]||0;
  return allocateConstituencySeats(votes,c);
}

/* ---------- constituency results table ---------- */
function constituencyTableHtml(votes, opts){
  opts=opts||{};
  const cList=CONSTITUENCIES.constituencies;
  const title=opts.title||'CONSTITUENCY SEATS';
  const note=opts.note||'';
  const showDelta=opts.showDelta!==false;

  let totalSeatsAll={};PARTY_ORDER.forEach(p=>{totalSeatsAll[p]=0});
  let rows='';
  const sorted=cList.slice().sort((a,b)=>b.seats-a.seats);
  let lastTotals=null;
  if(showDelta){
    lastTotals={};PARTY_ORDER.forEach(p=>{lastTotals[p]=0});
    cList.forEach(c=>{
      const sa22=allocateConstituencySeats2022(c);
      PARTY_ORDER.forEach(p=>{lastTotals[p]+=sa22[p]||0});
    });
  }
  for(const c of sorted){
    const sa=allocateConstituencySeats(votes,c);
    PARTY_ORDER.forEach(p=>{totalSeatsAll[p]+=sa[p]||0});
    let seatCells='';
    for(const p of PARTY_ORDER){
      const s=sa[p]||0;
      const color=PARTY_META[p]?PARTY_META[p].color:'#888';
      seatCells+=`<td class="num c" style="color:${s>0?color:'var(--c-rule)'};font-weight:${s>0?'700':'400'}">${s||'—'}</td>`;
    }
    rows+=`<tr>
      <td style="font-weight:700">${c.name}</td>
      <td class="num c">${c.seats}</td>
      ${seatCells}
    </tr>`;
  }
  let totalCells='';
  for(const p of PARTY_ORDER){
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    totalCells+=`<td class="num c" style="font-weight:900;color:${color}">${totalSeatsAll[p]}</td>`;
  }
  const constSeats=cList.reduce((s,c)=>s+c.seats,0);
  rows+=`<tr style="border-top:3px solid var(--c-edge);font-weight:900">
    <td>TOTAL</td><td class="num c">${constSeats}</td>${totalCells}</tr>`;
  if(lastTotals){
    let deltaCells='';
    for(const p of PARTY_ORDER){
      const d=totalSeatsAll[p]-(lastTotals[p]||0);
      const color=d>0?'#0B9E17':d<0?'var(--c-accent)':'var(--c-text-muted)';
      deltaCells+=`<td class="num c" style="color:${color};font-weight:900">${d>0?'+'+d:d}</td>`;
    }
    rows+=`<tr class="delta-row">
      <td>Δ vs 2022</td><td></td>${deltaCells}</tr>`;
  }

  let head='';
  PARTY_ORDER.forEach(p=>{head+=`<th class="c">${p}</th>`});
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${title}</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>Constituency</th><th class="c">Seats</th>${head}
    </tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      Per-constituency Sainte-Laguë (4% / 12% rule)${note?' · '+note:''}
    </div></div>`;
}

function renderConstituencyTable(avg){
  if(!CONSTITUENCIES||CONSTITUENCIES.length===0) return '';
  const votes=PARL_MODE==='proj'?avg:LAST_ELECTION.results;
  const by2022=PARL_MODE==='2022';
  return constituencyTableHtml(votes,{
    title:`${T.constituencySeats} (${by2022?'2022 '+T.result:T.projection})`,
    showDelta:!by2022,
    note:by2022?'2022 actual vote shares':'2022 results shifted by (poll avg − 2022 national)'
  });
}

/* ---------- load data ---------- */
let POLLS=[], META={};
let SCRAPED_AT=null;   // ISO timestamp of the last poll scrape (data health)
let ARCHIVE_MODE=false; // replicate the frozen archive snapshot's weighting math

async function loadData(){
  try{
    // Detect base: local dev (site/ subdir) vs Pages (root)
    const base=dataBase();
    const [pollsResp, metaResp]=await Promise.all([
      fetch(base+'data/'+COUNTRY+'/polls.json'),
      fetch(base+'data/'+COUNTRY+'/meta.json')
    ]);
    const pollsJson=await pollsResp.json();
    const metaJson=await metaResp.json();
    POLLS=(pollsJson.polls||[]).filter(p=>!EXCLUDE_POLLSTERS.includes(p.pollster));
    SCRAPED_AT=pollsJson.scraped_at||null;
    META=metaJson;
  }catch(e){
    console.error('Failed to load data:',e);
  }
}

// Data-health label: how long ago the poll data was scraped, with a freshness
// color (green <12h, amber <48h, red older).
function dataHealthLabel(){
  if(!SCRAPED_AT) return {txt:t('scrape time unknown','kazıma zamanı bilinmiyor'),col:'var(--c-text-muted)'};
  const ageH=(Date.now()-new Date(SCRAPED_AT).getTime())/3.6e6;
  const fmt=ageH<1?Math.round(ageH*60)+'m':Math.round(ageH)+'h';
  const col=ageH<12?'#0B9E17':(ageH<48?'#E0A800':'var(--c-accent)');
  return {txt:t('polls scraped','anketler kazındı')+' '+fmt+' '+t('ago','önce'),col};
}

/* ---------- average calculator ---------- */
function pollsterWeight(pollster){
  const mae=POLLSTER_MAE[pollster];
  if(!mae) return 1;
  // Archive-mode uses the snapshot's MAE key (overall) exactly as frozen
  const key=ARCHIVE_MODE?'overall':MAE_KEY;
  const v=mae[key]||mae.overall;
  if(!v) return 1;
  // Smooth 1/(1+MAE) weight: dampens over-concentration on the single best
  // pollster of one past election (Sweden 2026: Sifo was best in 2022 but
  // only mediocre in 2026, and the sharp inverse weight magnified its miss).
  return MAE_SMOOTH?1/(1+v):1/v;
}

// Exponential time decay: polls halve in weight every RECENCY_HALF_LIFE days
function recencyWeight(dateStr){
  const ageDays=(Date.now()-new Date(dateStr).getTime())/(1000*60*60*24);
  if(ageDays<=0) return 1;
  return Math.pow(0.5, ageDays/RECENCY_HALF_LIFE);
}

function weightedAverage(polls, party, noBias){
  let wSum=0, wTotal=0;
  for(const p of polls){
    if(p.votes[party]===undefined) continue;
    // Archive-mode replicates the frozen snapshot's math (no n-cap, no bias)
    // so the live FCST column matches the archive page exactly.
    const n=ARCHIVE_MODE?(p.n||1000):Math.min(1500, p.n||1000);
    const pw=pollsterWeight(p.pollster);
    const rw=recencyWeight(p.date);
    const w=n*pw*rw;
    // seat-based polls report seats only for above-threshold parties;
    // renormalize each poll to sum to SEATS_TOTAL so the average is on a
    // common scale (missing below-threshold seats are treated as 'Others')
    let v=p.votes[party];
    // signed-bias correction: bias = poll − actual (from per-election backtest);
    // subtract it so pollster's systematic error is removed. BIAS_SHRINK (0..1)
    // damps this: a single-election bias can flip sign across elections (Sweden
    // 2022 said pollsters understated S, 2026 every pollster overstated it), so
    // full-strength correction can actively hurt — shrink toward 0.
    if(!noBias && !ARCHIVE_MODE && BIAS_KEY && POLLSTER_BIAS[p.pollster] && POLLSTER_BIAS[p.pollster][party]!==undefined){
      v-=BIAS_SHRINK*POLLSTER_BIAS[p.pollster][party];
    }
    if(SEAT_BASED){
      const raw=Object.values(p.votes).reduce((a,b)=>a+b,0);
      if(raw>0) v*=SEATS_TOTAL/raw;
    }
    wSum+=v*w;
    wTotal+=w;
  }
  return wTotal>0?wSum/wTotal:null;
}

// Linear-trend extrapolation: fit each party's recent polls (recency-weighted
// least squares on time), project the slope forward to the election date, capped
// at maxDaily points/day so the model cannot run away in the final stretch.
// The slope is damped as the election approaches (return-to-mean): a full
// linear projection overestimates late momentum, so the projected move is
// multiplied by horizon/(horizon + DAMP_DAYS) — near the election the
// projection converges back toward today's value.
function trendExtrapolation(polls, party){
  if(!TREND_CONF) return null;
  const election=new Date(TREND_CONF.electionDate).getTime();
  const now=Date.now();
  const horizon=(election-now)/(1000*60*60*24);  // days until election
  if(!(horizon>0)||horizon>TREND_CONF.windowDays) return null;
  // fitDays = how many days of polls the slope regression uses. A short window
  // (≈14d) catches sudden late trends; a long one (e.g. 120d) dilutes them with
  // months of stale data (Sweden 2026: L surged ~2→5pp in the final week but the
  // 4-month-fit model kept it near the 4% threshold). Defaults to windowDays.
  const fitDays=TREND_CONF.fitDays||TREND_CONF.windowDays;
  const cutoff=now-fitDays*1000*60*60*24;
  const recent=polls.filter(p=>p.votes[party]!==undefined&&new Date(p.date).getTime()>=cutoff);
  if(recent.length<TREND_CONF.minPolls) return null;
  let sw=0,swt=0,swtt=0,swv=0,swtv=0;
  for(const p of recent){
    const t=(now-new Date(p.date).getTime())/(1000*60*60*24); // days ago
    let w=Math.pow(0.5,t/RECENCY_HALF_LIFE);
    // Weight by the same pollster accuracy + sample cap as the average, so a
    // low-quality outlier (e.g. a partisan internal poll down-weighted to a
    // high MAE) cannot hijack the slope. Berlin 2026: the BSW-internal poll
    // (CDU 13.5 vs ~20 elsewhere) entered the trend at full strength and its
    // single point flipped the CDU projection upward.
    w*=pollsterWeight(p.pollster);
    w*=Math.min(1500, p.n||1000);
    sw+=w; swt+=w*t; swtt+=w*t*t; swv+=w*(p.votes[party]||0); swtv+=w*t*(p.votes[party]||0);
  }
  const den=sw*swtt-swt*swt;
  if(Math.abs(den)<1e-9) return null;
  const slope=(sw*swtv-swt*swv)/den;      // % per day as time moves backward
  const inter=(swv*swtt-swtv*swt)/den;    // value at t=0 (today)
  const dampDays=TREND_CONF.dampDays||7;  // slope-halving horizon
  const damp=horizon/(horizon+dampDays);  // 1 far out, -> 0 at election day
  let proj=inter-slope*horizon*damp;      // extrapolate forward, damped
  const cap=TREND_CONF.maxDaily*horizon;
  proj=Math.max(inter-cap,Math.min(inter+cap,proj));
  return Math.max(0,proj);
}

function computeAverages(polls, raw){
  const avg={};
  for(const pid of PARTY_ORDER){
    avg[pid]=weightedAverage(polls, pid, raw);
  }
  // last-election Dirichlet prior: pull the average toward the most recent
  // election outcome so a thin poll set cannot drift arbitrarily far
  if(!raw && PRIOR_ALPHA>0&&LAST_ELECTION.results){
    for(const pid of PARTY_ORDER){
      if(avg[pid]===null) continue;
      const prior=LAST_ELECTION.results[pid]!==undefined?LAST_ELECTION.results[pid]:0;
      avg[pid]=(1-PRIOR_ALPHA)*avg[pid]+PRIOR_ALPHA*prior;
    }
  }
  // linear-trend extrapolation toward the election date
  if(!raw && TREND_CONF){
    for(const pid of PARTY_ORDER){
      const ext=trendExtrapolation(polls, pid);
      if(ext!==null&&avg[pid]!==null){
        avg[pid]=(1-TREND_CONF.blend)*avg[pid]+TREND_CONF.blend*ext;
      }
    }
  }
  if(SEAT_BASED){
    const total=Object.values(avg).reduce((a,b)=>a+(b||0),0);
    if(total>0){
      for(const pid of PARTY_ORDER) if(avg[pid]!==null) avg[pid]=avg[pid]*SEATS_TOTAL/total;
    }
  }
  return avg;
}

/* ---------- date helpers ---------- */
function daysAgo(dateStr){
  const d=new Date(dateStr);
  const now=new Date();
  return Math.floor((now-d)/(1000*60*60*24));
}

function recentPolls(polls, days){
  const cutoff=new Date();
  cutoff.setDate(cutoff.getDate()-days);
  return polls.filter(p=>new Date(p.date)>=cutoff);
}

// Momentum = recent-average minus baseline-average (in pp or seats), so a party
// that is suddenly surging (like L in Sweden 2026) shows it. Uses raw poll
// values so the arrow reflects the polls themselves, not the smoothed model.
function partyMomentum(polls, party, recentDays, baseDays){
  recentDays=recentDays||14; baseDays=baseDays||30;
  const now=Date.now();
  const recent=polls.filter(p=>p.votes[party]!==undefined&&now-new Date(p.date).getTime()<=recentDays*864e5);
  const base=polls.filter(p=>p.votes[party]!==undefined&&now-new Date(p.date).getTime()<=baseDays*864e5);
  const avg=a=>a.length?mean(a):null;
  const r=avg(recent.map(p=>p.votes[party]));
  const b=avg(base.map(p=>p.votes[party]));
  if(r===null||b===null) return null;
  return r-b;
}


/* ---------- render country nav (Europe Elects-style flag card) ---------- */
function renderCountryNav(){
  const nav=$('country-nav');
  if(!nav) return;
  const ids=Object.keys(COUNTRIES).filter(id=>!COUNTRIES[id].hidden)
    .sort((a,b)=>COUNTRIES[a].name.localeCompare(COUNTRIES[b].name));
  nav.innerHTML=ids.map(id=>{
    const c=COUNTRIES[id];
    const active=id===COUNTRY;
    return `<button class="cnav-item${active?' active':''}" data-cnav="${id}" title="${c.name}" aria-pressed="${active}">
      <img src="${dataBase()}img/flags/${id}.svg" alt="" loading="lazy" width="22" height="16">
      <span class="cnav-name">${c.name}</span>
    </button>`;
  }).join('');
  nav.querySelectorAll('.cnav-item').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const id=btn.dataset.cnav;
      if(id!==COUNTRY&&window._600) window._600.setCountry(id);
    });
  });
}

/* ---------- render sidebar (single card, top-left) ---------- */
function renderSidebar(prevDays, prevPollster){
  const c=$('sidebar-content');
  if(!c) return;
  prevDays=prevDays||'30';
  prevPollster=prevPollster||'';
  let html='';

  // Country selector (hidden on pinned sub-pages / archives)
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.country}</div></div>
    ${isPinnedCountry()
      ?`<div class="sb-hint" style="font-weight:900;letter-spacing:0.8px">${COUNTRY_NAME}</div>`
      :`<div class="sb-hint" style="font-weight:900;letter-spacing:0.8px">${COUNTRY_NAME}</div>`}
    <div class="sb-hint">${MAP_ONLY?`${SEATS_TOTAL} ${unitLabel()} · ${T.twoRound} · ${TREND_CONF?TREND_CONF.electionDate:''}`:`${seatsDesc()} ${T.seats} · ${methodName()} · ${THRESHOLD}% ${T.threshold}`}</div></div>`;

  // Filters
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.filters}</div></div>
    <label class="sb-hint" style="margin-bottom:4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${T.timeRange}</label>
    <select class="sb-select" id="filter-days" onchange="window._600.applyFilters()">
      <option value="7"${prevDays==='7'?' selected':''}>${T.last7}</option>
      <option value="14"${prevDays==='14'?' selected':''}>${T.last14}</option>
      <option value="30"${prevDays==='30'?' selected':''}>${T.last30}</option>
      <option value="60"${prevDays==='60'?' selected':''}>${T.last60}</option>
      <option value="90"${prevDays==='90'?' selected':''}>${T.last90}</option>
      <option value="9999"${prevDays==='9999'?' selected':''}>${T.allPolls}</option>
    </select>
    <label class="sb-hint" style="margin:10px 0 4px;display:block;font-weight:900;letter-spacing:0.8px;color:var(--c-text-muted)">${T.pollster}</label>
    <select class="sb-select" id="filter-pollster" onchange="window._600.applyFilters()">
      <option value="">${T.allPollsters}</option>
    </select></div>`;

  // Last election
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${LAST_ELECTION.date.slice(0,4)} ${T.result}</div></div>
    <div class="sb-last-election" id="sb-election"></div></div>`;

  // Info
  const health=dataHealthLabel();
  html+=`<div class="sb-section"><div class="sb-kicker"><div class="bar"></div><div class="t">${T.info}</div></div>
    <div class="sb-hint">${t('Data','Veri')}: Wikipedia${COUNTRY==='sweden'?' + SwedishPolls (CC0)':''}<br>${MAP_ONLY?`${SEATS_TOTAL} ${unitLabel()} · ${T.twoRound}`:`${seatsDesc()} ${T.seats} · ${methodNameShort()} · ${THRESHOLD}% ${T.threshold}`}<br>${t('Next election','Sonraki seçim')}: ${META.election_date||LAST_ELECTION.date}<br><span style="font-weight:900;color:${health.col}">◆ ${health.txt}</span></div></div>`;

  c.innerHTML=html;

  // Populate pollster filter
  const pollsters=[...new Set(POLLS.map(p=>p.pollster))].sort();
  const sel=$('filter-pollster');
  pollsters.forEach(ps=>{
    const opt=document.createElement('option');
    opt.value=ps; opt.textContent=ps;
    if(ps===prevPollster) opt.selected=true;
    sel.appendChild(opt);
  });

  // Last election
  renderLastElection();
}

function renderLastElection(){
  const c=$('sb-election');
  if(!c) return;
  let html='';
  const list=PARTY_ORDER.slice();
  for(const pid in PARTY_META){
    if(PARTY_META[pid].pastOnly&&LAST_ELECTION.results[pid]!==undefined&&list.indexOf(pid)<0) list.push(pid);
  }
  const sorted=list.slice().sort((a,b)=>(LAST_ELECTION.results[b]||0)-(LAST_ELECTION.results[a]||0));
  for(const pid of sorted){
    const pct_val=LAST_ELECTION.results[pid];
    if(pct_val===undefined) continue;
    const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
    html+=`<div class="sb-le-row">
      <div class="sb-le-dot" style="background:${color}"></div>
      <div class="sb-le-name">${partyCode(pid)}</div>
      <div class="sb-le-pct">${pct(pct_val)}</div>
    </div>`;
  }
  c.innerHTML=html;
}

/* ---------- render hero ---------- */
// Brazil: runoff-forward hero — head-to-head poll average plus the two-round
// election path (first round -> runoff), built from the weighted runoff polls.
function brazilRunoffHero(avg, filteredPolls){
  const ro=runoffForecast(avg, filteredPolls, null);
  if(!ro) return renderHeroGeneric(avg, filteredPolls);
  const cA=PARTY_META[ro.a]?PARTY_META[ro.a].color:'#888';
  const cB=PARTY_META[ro.b]?PARTY_META[ro.b].color:'#888';
  const h2a=ro.winA/3000, h2b=1-h2a;
  const barA=(v)=>Math.max(2,v*100);
  const d1=META.election_date||'2026-10-04';
  const d2=META.election_date_runoff||'2026-10-25';
  return `<div class="hero hero-brazil">
    <div class="hero-title">${COUNTRY_NAME} — ${t('PRESIDENTIAL · TWO ROUNDS','BAŞKANLIK · İKİ TUR')}</div>
    <div class="hero-date">${d1} ${t('first round','birinci tur')} → ${d2} ${t('runoff','ikinci tur')} · ${ro.roN} ${t('head-to-head polls','başa baş anket')}</div>
    <div class="bz-runoff">
      <div class="bz-cand" style="--bz-c:${cA}">
        <span class="bz-code">${partyCode(ro.a)}</span>
        <span class="bz-pct">${fmt(ro.aN,1)}%</span>
        <div class="bz-bar"><div class="bz-fill" style="width:${barA(ro.aN/100)}%;background:${cA}"></div></div>
        <span class="bz-sub">${t('WINS RUNOFF','İKİNCİ TURU KAZANIR')} <b>${pct100(h2a)}</b></span>
      </div>
      <div class="bz-vs">vs</div>
      <div class="bz-cand" style="--bz-c:${cB}">
        <span class="bz-code">${partyCode(ro.b)}</span>
        <span class="bz-pct">${fmt(ro.bN,1)}%</span>
        <div class="bz-bar"><div class="bz-fill" style="width:${barA(ro.bN/100)}%;background:${cB}"></div></div>
        <span class="bz-sub">${t('WINS RUNOFF','İKİNCİ TURU KAZANIR')} <b>${pct100(h2b)}</b></span>
      </div>
    </div>
    <div class="bz-path">
      <span>${t('ELECTION PATH','SEÇİM YOLU')}: ${partyCode(ro.a)} ${pct100((ro.winA/3000))} ${t('first-round win','ilk tur zaferi')}</span>
      <span>·</span>
      <span>${partyCode(ro.b)} ${pct100(1-ro.winA/3000)} ${t('would go to runoff','ikinci tura gider')}</span>
    </div>
  </div>`;
}

function renderHero(avg, filteredPolls){
  if(COUNTRY==='brazil') return brazilRunoffHero(avg, filteredPolls);
  return renderHeroGeneric(avg, filteredPolls);
}
function renderHeroGeneric(avg, filteredPolls){
  const latest=filteredPolls[0];
  const days=latest?daysAgo(latest.date):'—';
  const latestStr=latest?latest.date:'—';
  const topParty=PARTY_ORDER.slice().sort((a,b)=>(avg[b]||0)-(avg[a]||0))[0];
  const topPct=avg[topParty]||0;
  const color=PARTY_META[topParty]?PARTY_META[topParty].color:'#888';

  const logoSrc=PARTY_LOGOS[topParty]||'';
  const b=dataBase();
  return `<div class="hero">
    <div class="hero-title">${COUNTRY_NAME} — ${T.pollAverage}</div>
    <div class="hero-date">${filteredPolls.length} ${t('polls','anket')} · ${t('latest','son')}: ${latestStr} (${days}d ${t('ago','önce')}) · ${t('sample-size + pollster accuracy + recency weighted','örneklem + anketçi doğruluğu + güncellik ağırlıklı')}</div>
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
      <div style="width:36px;height:36px;border:2px solid var(--c-edge);box-shadow:var(--shadow-md);background:${color};display:flex;align-items:center;justify-content:center;overflow:hidden">
        ${logoSrc?`<img src="${b}${logoSrc}?v=${LOGO_CACHE}" alt="${topParty}" style="width:28px;height:28px;object-fit:contain">`:`<span style="color:#fff;font-weight:900;font-size:12px">${topParty}</span>`}
      </div>
      <div>
        <span style="font-size:28px;font-weight:900;font-variant-numeric:tabular-nums;font-family:var(--font-mono)">${valDisp(topPct)}</span>
        <span style="font-size:13px;font-weight:700;color:var(--c-text-muted);margin-left:4px">leading</span>
      </div>
    </div>
  </div>`;
}

/* ---------- render party bars ---------- */
function renderPartyBars(avg){
  const maxPct=Math.max(...Object.values(avg).filter(v=>v!==null),1);
  const seats=allocateSeatsTotal(avg, SEATS_TOTAL);
  const order=PARTY_ORDER.slice().sort((a,b)=>(avg[b]||0)-(avg[a]||0));
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.pollAvg}</div></div>
    <div class="bar-header"><span class="bh-logo"></span><span class="bh-party">${t('PARTY','PARTİ')}</span><span class="bh-bar"></span><span class="bh-pct">${SEAT_BASED?'SEATS':'%'}</span><span class="bh-delta">Δ</span>${SEAT_BASED||MAP_ONLY?'':'<span class="bh-seats">SEATS</span>'}</div>`;

  for(const pid of order){
    const val=avg[pid];
    if(val===null||val===undefined) continue;
    const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
    const barWidth=Math.max(1,(val/maxPct)*100);
    const last2022=SEAT_BASED?(LAST_ELECTION.seats[pid]||0):(LAST_ELECTION.results[pid]||0);
    const delta=(SEAT_BASED?Math.ceil(val):val)-last2022;
    const deltaStr=delta>0?`+${SEAT_BASED?Math.round(delta):fmt(delta)}`:SEAT_BASED?String(Math.round(delta)):fmt(delta);
    const deltaColor=delta>0?'#0B9E17':delta<0?'var(--c-accent)':'var(--c-text-muted)';
    const mpSeats=SEAT_BASED?Math.ceil(val):(seats[pid]||0);

    html+=`<div class="party-row">
      <div class="party-logo" style="background:${color}">
        ${PARTY_LOGOS[pid]?`<img src="${dataBase()}${PARTY_LOGOS[pid]}?v=${LOGO_CACHE}" alt="${pid}" style="width:24px;height:24px;object-fit:contain">`:`<span>${HIDE_BLOCS?partyCode(pid).replace(/[^A-Za-z0-9]/g,'').slice(0,2).toUpperCase():partyCode(pid)}</span>`}
      </div>
      <div class="party-name">${partyCode(pid)}</div>
      <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:${color}"></div></div>
      <div class="party-pct">${valDisp(val)}</div>
      <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
      ${SEAT_BASED||MAP_ONLY?'':`<div class="party-seats" style="color:${color}">${mpSeats}</div>`}
    </div>`;
  }
  // Others: the vote share not covered by the modelled parties (minority lists etc.)
  if(!SEAT_BASED){
    const othersNow=Math.max(0,100-PARTY_ORDER.reduce((a,p)=>a+(avg[p]||0),0));
    if(othersNow>0.05){
      const othersLast=Math.max(0,100-PARTY_ORDER.reduce((a,p)=>a+(LAST_ELECTION.results[p]||0),0));
      const barWidth=Math.max(1,(othersNow/maxPct)*100);
      const delta=othersNow-othersLast;
      const deltaStr=delta>0?`+${fmt(delta)}`:fmt(delta);
      const deltaColor=delta>0?'#0B9E17':delta<0?'var(--c-accent)':'var(--c-text-muted)';
      html+=`<div class="party-row">
        <div class="party-logo" style="background:#9CA3AF"><span style="color:#1F2937">OTH</span></div>
        <div class="party-name">Other</div>
        <div class="party-bar"><div class="fill" style="width:${barWidth}%;background:#9CA3AF"></div></div>
        <div class="party-pct">${fmt(othersNow)}%</div>
        <div class="party-delta" style="color:${deltaColor}">${deltaStr}</div>
        ${SEAT_BASED||MAP_ONLY?'':'<div class="party-seats" style="color:#9CA3AF">0</div>'}
      </div>`;
    }
  }
  if(BLOCS.bloc1&&BLOCS.bloc2&&!HIDE_BLOCS) html+=`<div class="pollavg-blocs">${renderBlocs(avg)}</div>`;
  html+=`</div>`;
  return html;
}

/* ---------- render bloc summary ---------- */
function blocSeats(rg,td){
  const others=Math.max(0,SEATS_TOTAL-rg-td);
  const parts=[rg,td,others];
  const base=parts.map(Math.floor);
  const rem=parts.map((p,i)=>p-base[i]);
  let left=SEATS_TOTAL-base.reduce((a,b)=>a+b,0);
  while(left>0){
    let bi=-1;
    for(let i=0;i<3;i++) if(bi<0||rem[i]>rem[bi]) bi=i;
    rem[bi]=-1; base[bi]++; left--;
  }
  return {gov:base[0],opp:base[1],other:base[2]};
}
function renderBlocs(avg){
  const rg=BLOCS.bloc1.parties.reduce((s,p)=>s+(avg[p]||0),0);
  const td=BLOCS.bloc2.parties.reduce((s,p)=>s+(avg[p]||0),0);
  const rgDisp=SEAT_BASED?blocSeats(rg,td).gov:valDisp(rg);
  const tdDisp=SEAT_BASED?blocSeats(rg,td).opp:valDisp(td);
  return `<div class="bloc-row">
    <div class="bloc-card" style="border-left:6px solid ${BLOCS.bloc1.color}">
      <div class="bloc-name">${BLOCS.bloc1.name}</div>
      <div class="bloc-pct" style="color:${BLOCS.bloc1.color}">${rgDisp}</div>
      <div class="bloc-parties">${BLOCS.bloc1.parties.map(partyCode).join(' + ')}</div>
    </div>
    <div class="bloc-card" style="border-left:6px solid ${BLOCS.bloc2.color}">
      <div class="bloc-name">${BLOCS.bloc2.name}</div>
      <div class="bloc-pct" style="color:${BLOCS.bloc2.color}">${tdDisp}</div>
      <div class="bloc-parties">${BLOCS.bloc2.parties.map(partyCode).join(' + ')}</div>
    </div>
  </div>`;
}

/* ---------- render trend chart (canvas) ---------- */
const CHART_STATE={};

// LOESS (locally estimated scatterplot smoothing): tricube-weighted local
// regression in the x-domain (day timestamps). Unlike a fixed-half-life moving
// average it adapts to the local data density, so it follows sudden trends
// (Sweden 2026: L surged ~2->5pp in the final week) without lagging.
// bandwidthDays is the tricube kernel half-width in days.
function loessSmooth(xs, ys, xsEval, bandwidthDays){
  const n=xs.length;
  if(!n) return ys.slice();
  const bw=(bandwidthDays||14)*864e5;
  const out=ys.map((y,i)=>{
    const x0=xsEval[i];
    let num=0,den=0;
    for(let j=0;j<n;j++){
      if(ys[j]===null) continue;
      const d=Math.abs(xs[j]-x0);
      if(d>=bw) continue;
      const w=Math.pow(1-Math.pow(d/bw,3),3);
      num+=w*ys[j]; den+=w;
    }
    return den>0?num/den:null;
  });
  return out;
}

function renderTrendChart(canvas, polls){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth;
  const H=wrap.clientHeight||320;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);

  // Collect data points: group by date, average
  const byDate={};
  polls.forEach(p=>{
    if(!byDate[p.date]) byDate[p.date]={};
    for(const pid of PARTY_ORDER){
      if(p.votes[pid]!==undefined){
        if(!byDate[p.date][pid]) byDate[p.date][pid]=[];
        byDate[p.date][pid].push(p.votes[pid]);
      }
    }
  });

  const dates=Object.keys(byDate).sort();
  const pad={top:20,right:60,bottom:40,left:50};
  const cw=W-pad.left-pad.right;
  const ch=H-pad.top-pad.bottom;

  if(dates.length<2){
    ctx.fillStyle='#64748B';ctx.font='12px Atlas Grotesk,sans-serif';ctx.textAlign='center';
    ctx.fillText('Need at least 2 dates for a chart',W/2,H/2);
    return;
  }

  // Build series (placeholder parties like SPN never appear). Each series
  // carries the raw date-averaged points plus a LOESS smooth; the LOESS curve
  // is what gets drawn so the trend follows real movement instead of a lagging
  // fixed-window average.
  const datesT=dates.map(d=>new Date(d).getTime());
  const series=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly)).map(pid=>{
    const points=dates.map(d=>{
      const vals=byDate[d][pid];
      if(!vals||!vals.length) return null;
      return vals.reduce((a,b)=>a+b,0)/vals.length;
    });
    // LOESS over the day axis: tricube local regression with a ~14-day kernel.
    const smooth=loessSmooth(datesT, points, datesT, 14);
    return {pid, points, smooth, color:PARTY_META[pid]?PARTY_META[pid].color:'#888'};
  });

  // Find y range (data-driven, no clipping; cap at 55 for sanity)
  let yMin=Infinity,yMax=-Infinity;
  series.forEach(s=>s.points.forEach(v=>{if(v!==null){yMin=Math.min(yMin,v);yMax=Math.max(yMax,v)}}));
  if(!isFinite(yMin)){yMin=0;yMax=45}
  yMin=Math.floor(Math.max(0,yMin-3));
  yMax=Math.ceil(Math.min(55,yMax+3));

  CHART_STATE.ctx=ctx; CHART_STATE.W=W; CHART_STATE.H=H;
  CHART_STATE.pad=pad; CHART_STATE.dates=dates; CHART_STATE.series=series;
  CHART_STATE.yMin=yMin; CHART_STATE.yMax=yMax; CHART_STATE.byDate=byDate;
  CHART_STATE.cw=cw; CHART_STATE.ch=ch; CHART_STATE.wrap=wrap;
  CHART_STATE.polls=polls;

  drawChartBase();

  // Tooltip element
  let tip=wrap.querySelector('.chart-tooltip');
  if(!tip){
    tip=document.createElement('div');
    tip.className='chart-tooltip';
    wrap.appendChild(tip);
  }
  CHART_STATE.tip=tip;

  wrap.onmousemove=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left;
    const idx=Math.round((mx-pad.left)/cw*(dates.length-1));
    if(idx<0||idx>=dates.length){drawChartBase();tip.classList.remove('visible');return}
    drawChartBase(idx);
    const date=dates[idx];
    let rows='';
    for(const pid of PARTY_ORDER){
      const vals=byDate[date][pid];
      if(!vals||!vals.length) continue;
      const v=vals.reduce((a,b)=>a+b,0)/vals.length;
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      rows+=`<div class="ct-row"><span class="ct-dot" style="background:${color}"></span><span class="ct-label">${pid}</span><span class="ct-val">${SEAT_BASED?String(Math.round(v)):v.toFixed(1)+'%'}</span></div>`;
    }
    tip.innerHTML=`<div class="ct-date">${date}</div>${rows}`;
    tip.classList.add('visible');
    // position tooltip next to cursor, clamped inside the chart wrap
    const tw=tip.offsetWidth||150;
    const th=tip.offsetHeight||120;
    let tx=e.clientX-r.left+16;
    if(tx+tw>W-4) tx=e.clientX-r.left-tw-16;
    let ty=e.clientY-r.top+12;
    if(ty+th>H-4) ty=e.clientY-r.top-th-12;
    tip.style.left=Math.max(4,Math.min(W-tw-4,tx))+'px';
    tip.style.top=Math.max(4,Math.min(H-th-4,ty))+'px';
  };
  wrap.onmouseleave=()=>{
    drawChartBase();
    if(tip) tip.classList.remove('visible');
  };
}

function drawChartBase(hoverIdx){
  const s=CHART_STATE;
  const {ctx,W,H,pad,dates,series,yMin,yMax,cw,ch}=s;
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  // Grid
  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  const yTicks=5;
  for(let i=0;i<=yTicks;i++){
    const y=pad.top+ch*(i/yTicks);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const val=yMax-(yMax-yMin)*(i/yTicks);
    ctx.fillStyle='#64748B';ctx.font='10px Source Code Pro,monospace';ctx.textAlign='right';
    ctx.fillText(SEAT_BASED?String(Math.round(val)):pct(val),pad.left-6,y+3);
  }

  // X labels
  const xStep=Math.max(1,Math.floor(dates.length/8));
  ctx.fillStyle='#64748B';ctx.font='10px Source Code Pro,monospace';ctx.textAlign='center';
  for(let i=0;i<dates.length;i+=xStep){
    const x=pad.left+(i/(dates.length-1))*cw;
    ctx.fillText(dates[i].slice(5),x,H-pad.bottom+16);
  }

  // Lines
  series.forEach(ser=>{
    ctx.beginPath();
    ctx.strokeStyle=ser.color;
    ctx.lineWidth=2;
    let started=false;
    ser.smooth.forEach((v,i)=>{
      if(v===null) return;
      const x=pad.left+(i/(dates.length-1))*cw;
      const y=pad.top+ch*(1-(v-yMin)/(yMax-yMin));
      if(!started){ctx.moveTo(x,y);started=true}else ctx.lineTo(x,y);
    });
    ctx.stroke();
  });

  // End labels
  series.forEach(ser=>{
    const lastIdx=ser.points.length-1;
    let lastVal=null;
    for(let i=lastIdx;i>=0;i--){if(ser.points[i]!==null){lastVal=ser.points[i];break}}
    if(lastVal===null) return;
    const x=W-pad.right+4;
    const y=pad.top+ch*(1-(lastVal-yMin)/(yMax-yMin));
    ctx.fillStyle=ser.color;ctx.font='bold 10px Source Code Pro,monospace';ctx.textAlign='left';
    ctx.fillText(partyCode(ser.pid),x,y+3);
  });

  // Trend projection markers: dashed from the last point to the value the
  // recency-weighted linear fit extrapolates at election day (top parties only)
  if(s.polls&&TREND_CONF){
    const election=new Date(TREND_CONF.electionDate).getTime();
    const horizon=(election-Date.now())/(1000*60*60*24);
    if(horizon>0&&horizon<=TREND_CONF.windowDays){
      const cands=[];
      series.forEach(ser=>{
        let lastVal=null,lastIdx=-1;
        for(let i=ser.points.length-1;i>=0;i--){if(ser.points[i]!==null){lastVal=ser.points[i];lastIdx=i;break}}
        if(lastVal===null) return;
        cands.push({ser,lastVal,lastIdx});
      });
      cands.sort((a,b)=>b.lastVal-a.lastVal);
      cands.slice(0,4).forEach(c=>{
        const ext=trendExtrapolation(s.polls,c.ser.pid);
        if(ext===null) return;
        const x0=pad.left+(c.lastIdx/(dates.length-1))*cw;
        const y0=pad.top+ch*(1-(c.lastVal-yMin)/(yMax-yMin));
        const xe=W-pad.right+2;
        const ye=Math.max(pad.top+2,pad.top+ch*(1-(Math.min(ext,yMax)-yMin)/(yMax-yMin)));
        ctx.strokeStyle=c.ser.color;ctx.lineWidth=1;
        ctx.setLineDash([3,3]);
        ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(xe,ye);ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.fillStyle='#fff';ctx.strokeStyle=c.ser.color;
        ctx.moveTo(xe-3.5,ye);ctx.lineTo(xe,ye-3.5);ctx.lineTo(xe+3.5,ye);ctx.lineTo(xe,ye+3.5);ctx.closePath();
        ctx.fill();ctx.stroke();
      });
    }
  }

  // Hover overlay: guide line + dots
  if(hoverIdx!==undefined&&hoverIdx>=0&&hoverIdx<dates.length){
    const x=pad.left+(hoverIdx/(dates.length-1))*cw;
    ctx.strokeStyle='#111827';ctx.lineWidth=1;
    ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.moveTo(x,pad.top);ctx.lineTo(x,H-pad.bottom);ctx.stroke();
    ctx.setLineDash([]);
    series.forEach(ser=>{
      const v=ser.points[hoverIdx];
      if(v===null) return;
      const y=pad.top+ch*(1-(v-yMin)/(yMax-yMin));
      ctx.beginPath();
      ctx.fillStyle=ser.color;
      ctx.strokeStyle='#111827';ctx.lineWidth=1;
      ctx.arc(x,y,3.5,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    });
  }
}

/* ---------- render individual polls table ---------- */
// Relative pollster accuracy per country: weight = 1/MAE, normalized so the
// country's best pollster scores 1.0 (5 stars). Returns {pollster: 0..1}.
function relativePollsterRatings(){
  const mae=POLLSTER_MAE||{};
  const keys=Object.keys(mae);
  if(!keys.length) return {};
  let maxW=0;
  const w={};
  keys.forEach(k=>{
    const v=mae[k][MAE_KEY]||mae[k].overall;
    w[k]=v?1/v:0;
    if(w[k]>maxW) maxW=w[k];
  });
  const out={};
  keys.forEach(k=>{out[k]=maxW>0?w[k]/maxW:0});
  return out;
}

function renderPollsTable(polls){
  const ratings=relativePollsterRatings();
  let html=`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.individualPolls}</div></div>
    <div style="overflow-x:auto">
    <table class="polls-table compact-table"><thead><tr>
      <th>${t('Date','Tarih')}</th><th>${t('Pollster','Anket')}</th>
      <th class="c" title="${t('Pollster accuracy vs the best in this country (weight = 1/MAE)','Anketçi doğruluğu, ülkedeki en iyiye göre (ağırlık = 1/MAE)')}">${t('RATE','PUAN')}</th>
      <th class="c">${t('Lead','Fark')}</th>`;
  const active=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  active.forEach(p=>{html+=`<th class="c">${partyCode(p)}</th>`});
  html+=`</tr></thead><tbody>`;

  polls.slice(0,60).forEach(p=>{
    // Leader + margin
    const sorted=active.slice().sort((a,b)=>(p.votes[b]||0)-(p.votes[a]||0));
    const leadP=sorted[0], leadV=p.votes[leadP]||0;
    const secondV=p.votes[sorted[1]]||0;
    const margin=leadV-secondV;
    const leadColor=PARTY_META[leadP]?PARTY_META[leadP].color:'#888';

    // relative rating of this poll's pollster
    const rr=ratings[p.pollster];
    const maeV=POLLSTER_MAE[p.pollster];
    const rateTxt=rr===undefined
      ?'—'
      :'★★★★★'.slice(0,Math.max(1,Math.round(rr*5)));
    const rateTitle=maeV?`${t('accuracy vs best','en iyiye göre doğruluk')}: ${(rr*100).toFixed(0)}% · MAE ${fmt(maeV[MAE_KEY]||maeV.overall,2)}`:'';
    const rateColor=rr===undefined?'var(--c-rule)':(rr>=0.85?'#0B9E17':(rr>=0.6?'#E0A800':'var(--c-text-muted)'));

    html+=`<tr><td>${p.date.slice(5)}</td><td>${p.pollster}</td>
      <td class="num c ps-rate" title="${rateTitle}" style="color:${rateColor}">${rateTxt}</td>
      <td class="num c" style="color:${leadColor};font-weight:700">${partyCode(leadP)} +${SEAT_BASED?String(Math.round(margin)):fmt(margin)}</td>`;
    active.forEach(pid=>{
      const v=p.votes[pid];
      const color=PARTY_META[pid]?PARTY_META[pid].color:'#888';
      const isTop=pid===leadP;
      html+=`<td class="num c" style="color:${v!==undefined?color:'var(--c-rule)'};font-weight:${isTop?'900':'400'};background:${isTop?color+'22':''}">${v!==undefined?(SEAT_BASED?Math.round(v):pct(v)):'—'}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</tbody></table></div>
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
      ${t('Lead = margin between the two largest parties · RATE = pollster accuracy relative to the best in this country','Fark = en büyük iki parti arasındaki marj · PUAN = anketçinin ülkedeki en iyiye göre doğruluğu')}
    </div></div>`;
  return html;
}

/* ---------- render state depth (Brazil) ---------- */
// 27 UFs -> region, for the regional breakdown card. Keys match conf.gebiete (lowercase).
const BRAZIL_REGIONS={
  ac:'Norte',am:'Norte',ap:'Norte',pa:'Norte',ro:'Norte',rr:'Norte',to:'Norte',
  al:'Nordeste',ba:'Nordeste',ce:'Nordeste',ma:'Nordeste',pb:'Nordeste',pe:'Nordeste',pi:'Nordeste',rn:'Nordeste',se:'Nordeste',
  df:'Centro-Oeste',go:'Centro-Oeste',mt:'Centro-Oeste',ms:'Centro-Oeste',
  es:'Sudeste',mg:'Sudeste',rj:'Sudeste',sp:'Sudeste',
  pr:'Sul',rs:'Sul',sc:'Sul',
};
function renderStateDepth(avg){
  if(COUNTRY!=='brazil') return '';
  const conf=MAP_CONF();
  if(!conf||!conf.gebiete) return '';
  const nat=conf.national2021||LAST_ELECTION.results;
  // projected per-state winner via uniform swing on the 2022 baseline
  const stateWinners={};
  Object.keys(conf.gebiete).forEach(uf=>{
    const base=conf.gebiete[uf];
    let best=null,bv=-1;
    for(const p of PARTY_ORDER){
      const past=base[p]||0;
      const swing=(avg[p]!==undefined)?((avg[p]||0)-(nat[p]||0)):0;
      const now=Math.max(0,past+swing);
      if(now>bv){bv=now;best=p}
    }
    stateWinners[uf]=best;
  });
  const leadCount={};
  Object.values(stateWinners).forEach(p=>{leadCount[p]=(leadCount[p]||0)+1});
  const regionRows=[];
  const regions=['Norte','Nordeste','Centro-Oeste','Sudeste','Sul'];
  regions.forEach(reg=>{
    const ufs=Object.keys(conf.gebiete).filter(uf=>BRAZIL_REGIONS[uf]===reg);
    if(!ufs.length) return;
    const win=ufs.map(uf=>stateWinners[uf]);
    const counts={};
    win.forEach(p=>{counts[p]=(counts[p]||0)+1});
    const lead=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
    const leadCol=PARTY_META[lead]?PARTY_META[lead].color:'#888';
    regionRows.push(`<div class="bz-reg-row">
      <span class="bz-reg-name">${reg}</span>
      <div class="bz-reg-bars">${Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).map(p=>{
        const col=PARTY_META[p]?PARTY_META[p].color:'#888';
        return `<span class="bz-reg-dot" style="background:${col}" title="${partyCode(p)} ${counts[p]}">${counts[p]}</span>`;
      }).join('')||'—'}</div>
      <span class="bz-reg-lead" style="color:${leadCol}">${partyCode(lead)}</span>
    </div>`);
  });
  const topCands=Object.keys(leadCount).sort((a,b)=>leadCount[b]-leadCount[a]).slice(0,4);
  const cards=topCands.map(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const n=leadCount[p];
    return `<div class="bz-state-card">
      <span class="bz-state-code" style="background:${col}">${partyCode(p)}</span>
      <span class="bz-state-num">${n}</span>
      <span class="bz-state-lbl">${t('states','eyalet')}</span>
    </div>`;
  }).join('');
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('STATES — PROJECTED WINNERS','EYALETLER — TAHMİNİ KAZANANLAR')}</div></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">${cards}</div>
    <div class="bz-regions">
      <div class="bz-reg-hd"><span>${t('REGION','BÖLGE')}</span><span>${t('WINNERS','KAZANANLAR')}</span><span>${t('LEAD','LİDER')}</span></div>
      ${regionRows.join('')}
    </div>
    <div style="font-size:10px;color:var(--c-text-muted);margin-top:6px">${t('Per-state winner = 2022 baseline shifted by the national poll swing (uniform swing).','Eyalet kazananı = ulusal anket farkıyla kaydırılan 2022 tabanı (tekdüze salınım).')}</div>
  </div>`;
}

/* ---------- render parliament ---------- */
let PARL_MODE='proj';    // 'proj' or '2022'
let PARL_VIEW='seats';   // 'seats' or 'map'
let FC_MODE='proj';      // forecast district map: 'proj' or 'res'
let MAP_COLOR='party';   // district map coloring: 'party' or 'bloc' (Sweden)

function normalizeTo(src, total){
  // direct seat counts (2022 RESULT for seat-based countries), scaled to total
  const out={};
  let sum=0;
  PARTY_ORDER.forEach(p=>{out[p]=src[p]||0; sum+=out[p]});
  if(sum===0) return out;
  const k=total/sum;
  if(Math.abs(k-1)>0.001){
    PARTY_ORDER.forEach(p=>{out[p]=Math.round(out[p]*k)});
    let s=PARTY_ORDER.reduce((a,p)=>a+out[p],0);
    if(s!==total) out[PARTY_ORDER[0]]+=(total-s);
  }
  return out;
}

function seatParliament(avg, total){
  // Seat-based countries: round the seat averages (largest remainder).
  // Every party that appears in the average (avg>0) is given seats so that
  // small/listed parties stay visible on the parliament diagram.
  const fl={},frs=[];
  let sum=0;
  PARTY_ORDER.forEach(p=>{
    const m=avg[p]||0;
    if(!(m>0)){fl[p]=0;return}
    const f=Math.floor(m);
    fl[p]=f;frs.push([m-f,p]);sum+=f;
  });
  let left=total-sum;
  frs.sort((a,b)=>b[0]-a[0]);
  for(let i=0;i<left&&i<frs.length;i++)fl[frs[i][1]]++;
  return fl;
}

function seatsDesc(){
  return OVERHANG?(SEATS_TOTAL+'\u2013'+OVERHANG.cap):String(SEATS_TOTAL);
}

/* ---------- overhang / leveling seats (partial PR, e.g. Saxony-Anhalt) ---------- */
function directFromProjection(votes){
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  const conf=MAP_CONF();
  if(!conf||!conf.districts) return out;
  Object.keys(conf.districts).forEach(nr=>{
    const w=districtWinnerProjection(parseInt(nr,10),votes);
    if(w) out[w]++;
  });
  return out;
}

function overhangSeats(votes, totalBase, direct, cap){
  // Leveling seats: grow the house (re-running Hare/Niemeyer each step) until
  // every party that won direct mandates holds at least its direct share; the
  // total is capped at `cap` seats per the electoral law.
  cap=cap||totalBase;
  const hare=(total)=>{
    const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
    const totalVotes=valid.reduce((a,p)=>a+(votes[p]||0),0);
    const quota=totalVotes/total;
    const out={}; const rems=[]; let given=0;
    valid.forEach(p=>{
      const q=(votes[p]||0)/quota, fl=Math.floor(q);
      out[p]=fl; given+=fl; rems.push([q-fl,p]);
    });
    let left=total-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) out[rems[i][1]]++;
    return out;
  };
  let total=totalBase;
  for(let it=0;it<200;it++){
    const seats=hare(total);
    let deficit=0;
    PARTY_ORDER.forEach(p=>{const d=direct[p]||0; if(seats[p]<d) deficit+=d-seats[p]});
    if(deficit<=0) return seats;
    if(total===cap) break;
    total=Math.min(total+deficit,cap);
  }
  const s=hare(total);
  PARTY_ORDER.forEach(p=>{if(s[p]<(direct[p]||0)) s[p]=direct[p]||0});
  return s;
}

function renderParliament(avg){
  let seats;
  if(OVERHANG){
    seats=PARL_MODE==='proj'
      ?overhangSeats(avg,SEATS_TOTAL,directFromProjection(avg),OVERHANG.cap)
      :(()=>{const s={};PARTY_ORDER.forEach(p=>{s[p]=LAST_ELECTION.seats?LAST_ELECTION.seats[p]||0:0});return s})();
  }else{
    seats=SEAT_BASED
      ?(PARL_MODE==='proj'?seatParliament(avg,SEATS_TOTAL):normalizeTo(LAST_ELECTION.seats,SEATS_TOTAL))
      :(PARL_MODE==='proj'?allocateSeatsTotal(avg,SEATS_TOTAL)
        :(LAST_ELECTION.seats?(()=>{const s={};PARTY_ORDER.forEach(p=>{s[p]=LAST_ELECTION.seats[p]||0});return s})()
          :allocateSeatsN(LAST_ELECTION.results,SEATS_TOTAL)));
  }
  // Unmodelled parties (e.g. Serbia's minority lists): in the last-election view,
  // fill the chamber up to the statutory size with an "Other" wedge.
  if(PARL_MODE!=='proj'&&!OVERHANG){
    const sum=PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0);
    const other=SEATS_TOTAL-sum;
    if(other>0) seats.other=other;
  }
  const seatsTotal=Object.values(seats).reduce((a,b)=>a+(b||0),0);
  const mapConf=MAP_CONF();
  const showMap=MAP_ONLY||(PARL_VIEW==='map'&&mapConf);
  const btnRow=`<div class="map-toggle-row" style="justify-content:flex-end">
      <button class="map-toggle-btn parl-btn${PARL_MODE==='proj'?' active':''}" data-parlmode="proj">${T.projection}</button>
      <button class="map-toggle-btn parl-btn${PARL_MODE==='2022'?' active':''}" data-parlmode="2022">${LAST_ELECTION.date.slice(0,4)} ${T.result}</button>
      ${mapConf&&!MAP_ONLY?`<button class="map-toggle-btn parl-btn${showMap?' active':''}" data-parlview="map">${T.map}</button>`:''}
      ${mapConf&&mapConf.useConstituencies&&BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn map-color-btn${MAP_COLOR==='bloc'?' active':''}" data-mapcolor="bloc">${T.blocs}</button>`:''}
      ${mapConf&&showMap?`<button class="shot-btn" id="map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>`:''}
      ${!showMap&&!MAP_ONLY?`<button class="shot-btn" id="parl-shot-btn" title="Download parliament diagram as PNG">${CAM_ICON}</button>`:''}
    </div>`;
  const box=showMap
    ?'<div class="parliament-box" id="map-box"></div>'
    :`<div class="parliament-box" id="parl-box">${buildParliamentSVG(seats)}</div>`;
  const cap=showMap
    ?(MAP_ONLY
      ?`${SEATS_TOTAL} ${unitLabel()} · ${T.coloredBy} ${t('projected winner','tahmini kazanan')}`
      :`${seatsTotal} ${T.seats} · ${methodName()} · ${THRESHOLD}% ${T.threshold} · ${t('map','harita')} = ${mapConf?Object.keys(mapConf.districts).length:''} ${t('constituencies','bölge')}, ${T.coloredBy} ${(MAP_COLOR==='bloc'&&mapConf.useConstituencies)?t('leading bloc','önde giden blok'):t('district winner','bölge kazananı')}`)
    :`${seatsTotal} ${T.seats} · ${methodName()} · ${THRESHOLD}% ${T.threshold}`;
  return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${MAP_ONLY?T.map:T.seatProjection}</div></div>
    ${btnRow}
    ${box}
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
      ${cap}
    </div></div>`;
}

/* ---------- district map (Germany / Sweden) ---------- */
function MAP_CONF(){ return (COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].map)||null; }

function constituencyById(id){
  if(!CONSTITUENCIES||!CONSTITUENCIES.constituencies) return null;
  return CONSTITUENCIES.constituencies.find(c=>c.id===String(id))||null;
}

// Actual direct-mandate winner of the previous election for a Wahlkreis /
// valkrets, with the state default as fallback
// Shares of a district under a given national avg: uniform swing from the
// district's previous-election baseline; returns per-party {party: {past, now}}.
// When resultMode is true, returns the actual previous election per-district
// results (past === now) so the map shows that election's result.
function districtShares(nr, avg, resultMode){
  const conf=MAP_CONF();
  let base;
  if(conf.useConstituencies){
    const c=constituencyById(nr);
    if(!c) return null;
    base=c.results_2022||{};
  }else if(conf.wkResults&&conf.wkResults[String(nr)]){
    base=conf.wkResults[String(nr)];
  }else{
    const gArr=conf.districts?conf.districts[String(nr)]:null;
    if(!gArr) return null;
    base=conf.gebiete[gArr];
  }
  const nat=conf.national2021||LAST_ELECTION.results;
  const out={};
  let sum=0;
  for(const p of PARTY_ORDER){
    const past=base[p]||0;
    let now;
    if(PARTY_META[p]&&PARTY_META[p].pastOnly){
      // dissolved alliances: shown in the 2023 result view, never projected
      now=resultMode?past:0;
    }else{
      const swing=(!resultMode&&avg&&avg[p]!==undefined)?((avg[p]||0)-(nat[p]||0)):0;
      now=Math.max(0,past+swing);
    }
    out[p]={past, now};
    sum+=now;
  }
  // Okrug baselines cover only the modelled parties (unmodelled lists made up
  // the remainder), so renormalize projected shares to the polls' own total for
  // the modelled parties (e.g. ~97.6%) — the leftover stays visible as "Other".
  // (Result mode keeps the official 2023 numbers untouched.)
  let pastSum=0;
  for(const p of PARTY_ORDER) pastSum+=out[p].past||0;
  const rem=Math.max(0,100-pastSum);
  if(!resultMode){
    let target=0;
    for(const p of PARTY_ORDER){
      if(!(PARTY_META[p]&&PARTY_META[p].pastOnly)&&avg&&avg[p]!==undefined&&avg[p]!==null) target+=avg[p];
    }
    if(!(target>0)||target>100) target=100;
    if(sum>0&&Math.abs(sum-target)>0.01){
      const k=target/sum;
      for(const p of PARTY_ORDER) out[p].now*=k;
    }
    out.other={past:rem, now:Math.max(0,100-target)};
  }else{
    out.other={past:rem, now:rem};
  }
  return out;
}

// MP seats a party holds from a district (Sweden only):
// - result mode: official 2022 per-constituency seats (mp2022, fasta + utjämningsmandat)
// - projection mode: Sainte-Laguë allocation of the constituency's fasta seats
//   from the current poll avg, honoring the 4% national / 12% valkrets rule
function districtPartySeats(nr, party, avg, resultMode){
  const conf=MAP_CONF();
  if(!conf.useConstituencies) return null;
  if(resultMode){
    const lbl=Object.keys(conf.districts).find(k=>conf.districts[k]===String(nr));
    if(lbl&&conf.mp2022&&conf.mp2022[lbl]) return conf.mp2022[lbl][party]||0;
    return 0;
  }
  const c=constituencyById(nr);
  if(!c||!avg) return null;
  const alloc=allocateConstituencySeats(avg,c);
  return alloc[party]||0;
}

function districtWinnerProjection(nr, avg){
  const shares=districtShares(nr, avg, false);
  if(!shares) return null;
  let best=null,bestV=-1;
  for(const p of PARTY_ORDER){
    if(shares[p].now>bestV){bestV=shares[p].now;best=p}
  }
  return best;
}

// Winner of the previous election in a district: explicit winners map wins,
// else argmax of the official per-district results (wkResults / results_2022)
function districtResultWinner(nr){
  const conf=MAP_CONF();
  if(conf.winners2021&&conf.winners2021[String(nr)]) return conf.winners2021[String(nr)];
  const shares=districtShares(nr, null, true);
  if(!shares) return null;
  let best=null,bestV=-1;
  for(const p of PARTY_ORDER){
    if(shares[p].past>bestV){bestV=shares[p].past;best=p}
  }
  return best;
}

// Bloc totals of a district: sum each bloc's member parties' shares
// returns {bloc1:{past,now}, bloc2:{past,now}}
function districtBlocTotals(shares){
  const out={};
  for(const bk of ['bloc1','bloc2']){
    const b=BLOCS[bk];
    if(!b) continue;
    let past=0,now=0;
    for(const p of b.parties){
      if(shares[p]){past+=shares[p].past;now+=shares[p].now}
    }
    out[bk]={past,now};
  }
  return out;
}

// Leading bloc of a district under given totals
function leadingBloc(blocTotals, key){
  const a=blocTotals.bloc1?blocTotals.bloc1[key]:0;
  const b=blocTotals.bloc2?blocTotals.bloc2[key]:0;
  return a>=b?'bloc1':'bloc2';
}

let MAP_CACHE={};
// Seat-based countries (NL/IL): poll averages are in seats, but the election
// map works on vote shares. Approximate the vote share that would yield a
// party's seat count under D'Hondt as the seat-midpoint s+0.5 against the
// scaled house size (SEATS_TOTAL + 0.5*n_seated), so seated parties sum to 100.
function seatAvgToVotes(avg){
  const seated=PARTY_ORDER.filter(p=>avg[p]>0);
  const den=SEATS_TOTAL+0.5*seated.length;
  const out={};
  for(const p of PARTY_ORDER) out[p]=avg[p]>0?(avg[p]+0.5)/den*100:0;
  return out;
}
async function renderMap(avg){
  const box=$('map-box');
  if(!box) return;
  if(SEAT_BASED && PARL_MODE==='proj' && avg) avg=seatAvgToVotes(avg);
  await renderMapInto(box, avg, PARL_MODE!=='proj');
}

async function renderMapInto(box, avg, resultMode){
  const conf=MAP_CONF();
  if(!conf) return;
  if(!MAP_CACHE[conf.svg]){
    try{
      const resp=await fetch(dataBase()+conf.svg);
      if(!resp.ok) throw new Error('HTTP '+resp.status);
      MAP_CACHE[conf.svg]=await resp.text();
    }catch(e){
      box.innerHTML='<div style="text-align:center;color:var(--c-text-muted);padding:20px;font-size:12px">District map failed to load.</div>';
      return;
    }
  }
  const holder=document.createElement('div');
  // Sweden: paths carry inkscape:label (namespaced attr, lost in innerHTML parse) — normalize to data-label
  const raw=MAP_CACHE[conf.svg];
  holder.innerHTML=conf.selector==='label'?raw.replace(/inkscape:label=/g,'data-label='):raw;
  const svg=holder.querySelector('svg');
  if(!svg){box.innerHTML='';return}
  let selector;
  if(conf.selector==='class') selector='path[class^="wk"]';
  else if(conf.selector==='label') selector='path[data-label]';
  else if(conf.selector==='id') selector='path[id]';
  else selector='path[id^="_"]';
  const paths=svg.querySelectorAll(selector);
  const tooltip=document.createElement('div');
  tooltip.className='map-tip';
  box.style.position='relative';
  box.appendChild(tooltip);
  // District display name: explicit wkNames (MV), Bezirk + number (Berlin class),
  // map label (Sweden), else gebiet name
  const districtMeta=(nr,lbl)=>{
    if(conf.useConstituencies){
      return {gArr:nr, name:lbl||(constituencyById(nr)?constituencyById(nr).name:String(nr))};
    }
    const gArr=conf.districts[String(nr)];
    const baseName=conf.names&&conf.names[gArr]?conf.names[gArr]:gArr;
    let name=baseName;
    if(conf.wkNames&&conf.wkNames[String(nr)]) name=conf.wkNames[String(nr)];
    else if(conf.selector==='class'&&gArr) name=`${baseName} ${nr%100}`;
    return {gArr, name};
  };
  paths.forEach(ph=>{
    let nr=null;
    if(conf.selector==='class'){
      const m=/wk(\d+)/.exec(ph.getAttribute('class')||'');
      if(m) nr=parseInt(m[1],10);
    }else if(conf.selector==='label'){
      const lbl=ph.getAttribute('data-label');
      if(lbl&&conf.districts[lbl]) nr=conf.districts[lbl];
    }else if(conf.selector==='id'){
      const id=ph.getAttribute('id');
      if(id&&conf.districts[id]) nr=id;
    }else{
      nr=parseInt(ph.id.slice(1),10);
    }
    if(!nr) return;
    const shares=districtShares(nr, avg, resultMode);
    if(!shares) return;
    const blocMode=MAP_COLOR==='bloc'&&BLOCS.bloc1&&BLOCS.bloc2;
    const blocTotals=blocMode?districtBlocTotals(shares):null;
    // RESULT mode: official per-district winners (winners2021 map / wkResults
    // argmax / per-constituency 2022), else the uniform-swing projection.
    // Bloc mode colors by the leading bloc instead.
    let winner;
    if(blocMode){
      winner=leadingBloc(blocTotals,resultMode?'past':'now');
    }else{
      winner=resultMode
        ?(districtResultWinner(nr)||districtWinnerProjection(nr,LAST_ELECTION.results))
        :districtWinnerProjection(nr,avg);
    }
    if(!winner) return;
    const color=blocMode?(BLOCS[winner]?BLOCS[winner].color:'#888'):(PARTY_META[winner]?PARTY_META[winner].color:'#888');
    ph.style.fill=color;
    if(!ph.getAttribute('style')||ph.getAttribute('style').indexOf('stroke')<0){
      ph.style.stroke='#ffffff';
    }
    ph.style.cursor='pointer';
    ph.style.transition='opacity .15s ease';
    const meta=districtMeta(nr, conf.selector==='label'?ph.getAttribute('data-label'):null);
    ph.addEventListener('mouseenter',()=>{
      ph.style.opacity='0.65';
      if(blocMode){
        const pastBloc=leadingBloc(blocTotals,'past');
        const nowBloc=leadingBloc(blocTotals,'now');
        const blocRows=['bloc1','bloc2'].map(bk=>{
          const b=BLOCS[bk];
          const t=blocTotals[bk];
          const delta=t.now-t.past;
          const col=b?b.color:'#888';
          const barW=Math.max(2,Math.min(100,t.now));
          return `<div class="map-tip-row">
            <span class="map-tip-code" style="color:${col}">${b?b.name:'?'}</span>
            <div class="map-tip-track"><div class="map-tip-fill" style="width:${barW}%;background:${col}"></div></div>
            <span class="map-tip-now">${pct(t.now)}</span>
            <span class="map-tip-delta ${delta>0.05?'up':(delta<-0.05?'down':'flat')}">${delta>0.05?'▲':(delta<-0.05?'▼':'')}${Math.abs(delta)<0.05?'':pct(Math.abs(delta))}</span>
          </div>`;
        }).join('');
        const pbCol=BLOCS[pastBloc]?BLOCS[pastBloc].color:'#888';
        const nbCol=BLOCS[nowBloc]?BLOCS[nowBloc].color:'#888';
        tooltip.innerHTML=`<div class="map-tip-head">
          <div class="map-tip-title">${conf.useConstituencies?'':(conf.selector==='id'?'':'WK '+nr+' · ')}${meta.name}</div>
          <div class="map-tip-compare">
            <span class="map-tip-past"><i style="background:${pbCol}"></i>${LAST_ELECTION.date.slice(0,4)} ${BLOCS[pastBloc]?BLOCS[pastBloc].short||BLOCS[pastBloc].name:''}</span>
            <span class="map-tip-arrow">→</span>
            <span class="map-tip-nowlab"><i style="background:${nbCol}"></i>${resultMode?'RESULT':(BLOCS[nowBloc]?BLOCS[nowBloc].short||BLOCS[nowBloc].name:'')}</span>
          </div>
        </div>
        ${blocRows}`;
        tooltip.style.display='block';
        return;
      }
      const pastWinner=districtResultWinner(nr)||districtWinnerProjection(nr,LAST_ELECTION.results);
      const nowWinner=resultMode?pastWinner:districtWinnerProjection(nr,avg);
      // Result mode: order rows by the official seat outcome (so a dissolved-but-large
  // list like SPN sits above smaller parties); otherwise by projected share.
  // Dissolved alliances (pastOnly) appear in the 2023 result view only.
      const sortKey=(p)=> (resultMode&&LAST_ELECTION.seats)?(LAST_ELECTION.seats[p]||0):shares[p].now;
      let rows=PARTY_ORDER.slice().filter(p=>!((PARTY_META[p]||{}).pastOnly&&!resultMode)).sort((a,b)=> (sortKey(b)-sortKey(a)) || (shares[b].now-shares[a].now)).map(p=>{
        const s=shares[p];
        const delta=s.now-s.past;
        const col=PARTY_META[p]?PARTY_META[p].color:'#888';
        const barW=Math.max(2,Math.min(100,s.now));
        const pSeats=districtPartySeats(nr,p,avg,resultMode);
        const pill=pSeats!==null&&pSeats>0?`<span class="map-tip-pill">${pSeats}</span>`:'';
        return `<div class="map-tip-row">
          <span class="map-tip-code" style="color:${col}">${partyCode(p)}${pill}</span>
          <div class="map-tip-track"><div class="map-tip-fill" style="width:${barW}%;background:${col}"></div></div>
          <span class="map-tip-now">${pct(s.now)}</span>
          <span class="map-tip-delta ${delta>0.05?'up':(delta<-0.05?'down':'flat')}">${delta>0.05?'▲':(delta<-0.05?'▼':'')}${Math.abs(delta)<0.05?'':pct(Math.abs(delta))}</span>
        </div>`;
      }).join('');
      // unmodelled 2023 lists (remainder), past column only
      if(shares.other&&shares.other.past>0.05){
        const o=shares.other;
        const od=o.now-o.past;
        rows+=`<div class="map-tip-row">
          <span class="map-tip-code" style="color:#9CA3AF">Other</span>
          <div class="map-tip-track"><div class="map-tip-fill" style="width:${Math.max(2,Math.min(100,o.now))}%;background:#9CA3AF"></div></div>
          <span class="map-tip-now">${pct(o.now)}</span>
          <span class="map-tip-delta ${od>0.05?'up':(od<-0.05?'down':'flat')}">${od>0.05?'▲':(od<-0.05?'▼':'')}${Math.abs(od)<0.05?'':pct(Math.abs(od))}</span>
        </div>`;
      }
      const pwCol=PARTY_META[pastWinner]?PARTY_META[pastWinner].color:'#888';
      const nwCol=PARTY_META[nowWinner]?PARTY_META[nowWinner].color:'#888';
      tooltip.innerHTML=`<div class="map-tip-head">
          <div class="map-tip-title">${conf.useConstituencies?'':(conf.selector==='id'?'':'WK '+nr+' · ')}${meta.name}</div>
          <div class="map-tip-compare">
            <span class="map-tip-past"><i style="background:${pwCol}"></i>${LAST_ELECTION.date.slice(0,4)} ${partyCode(pastWinner)}</span>
            <span class="map-tip-arrow">→</span>
            <span class="map-tip-nowlab"><i style="background:${nwCol}"></i>${resultMode?'RESULT':partyCode(nowWinner)}</span>
          </div>
        </div>
        ${rows}`;
      tooltip.style.display='block';
    });
    ph.addEventListener('mouseleave',()=>{
      ph.style.opacity='';
      tooltip.style.display='none';
    });
  });
  svg.addEventListener('mousemove',e=>{
    const rect=box.getBoundingClientRect();
    const tipW=tooltip.offsetWidth||220;
    const tipH=tooltip.offsetHeight||140;
    const x=e.clientX-rect.left, y=e.clientY-rect.top;
    let left=Math.max(4,Math.min(x+14,rect.width-tipW-4));
    let top=Math.max(4,Math.min(y+14,rect.height-tipH-4));
    tooltip.style.left=left+'px';
    tooltip.style.top=top+'px';
  });
  svg.setAttribute('viewBox', svg.getAttribute('viewBox')||'0 0 894 1140');
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width='100%';
  svg.style.height='auto';
  svg.style.display='block';
  box.innerHTML='';
  box.appendChild(svg);
  box.appendChild(tooltip);
}

/* ---------- screenshot capture ---------- */
const CAM_ICON=`<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

function downloadPng(dataUrl, name){
  const a=document.createElement('a');
  a.href=dataUrl;
  a.download=name;
  a.click();
}// Map: render the SVG at its viewBox size (x2 for sharpness) onto a transparent
// canvas — content-sized, no padding, no background
async function captureMapPng(svg, filename){
  if(!svg) return;
  const vb=svg.viewBox?svg.viewBox.baseVal:null;
  const w=vb&&vb.width?Math.round(vb.width):800;
  const h=vb&&vb.height?Math.round(vb.height):900;
  const scale=2;
  const xml=new XMLSerializer().serializeToString(svg);
  const svgUrl='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
  const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=svgUrl});
  const canvas=document.createElement('canvas');
  canvas.width=w*scale; canvas.height=h*scale;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  downloadPng(canvas.toDataURL('image/png'), filename);
}

// Chart: composite the (transparent) canvas over the card background so the
// exported PNG keeps the graph's background, sized to the canvas content
function captureChartPng(canvas, filename){
  if(!canvas) return;
  const card=canvas.closest('.card');
  const bg=card?getComputedStyle(card).backgroundColor:'#FFFFFF';
  const out=document.createElement('canvas');
  out.width=canvas.width; out.height=canvas.height;
  const ctx=out.getContext('2d');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,out.width,out.height);
  ctx.drawImage(canvas,0,0);
  downloadPng(out.toDataURL('image/png'), filename);
}

// Infographic: minimal shareable forecast card, drawn at 2x from the SAME
// values renderForecast already computed (medVotes/detSeats/lead*) so the PNG
// matches the on-screen forecast card exactly.
async function renderForecastInfographic(avg, sim, opts){
  const W=1120, H=1560, S=2;
  const canvas=document.createElement('canvas');
  canvas.width=W*S; canvas.height=H*S;
  const ctx=canvas.getContext('2d');
  ctx.scale(S,S);
  const meta=(PARTY_META||{});
  ctx.fillStyle='#ffffff';
  ctx.fillRect(0,0,W,H);
  const label=opts.title||COUNTRY_NAME+' '+(((META&&META.election_date)||(TREND_CONF&&TREND_CONF.electionDate))||'').slice(0,4)||new Date().getFullYear();
  const method=(opts.methodName||methodNameShort());
  // header
  ctx.fillStyle=opts.leadColor||'#0b6e99';
  ctx.fillRect(0,0,W,10);
  ctx.fillStyle='#111';
  ctx.font='600 52px "Archivo Narrow",Archivo,Arial,sans-serif';
  ctx.textBaseline='top';
  ctx.fillText(label.toUpperCase(),60,52);
  ctx.fillStyle='#888';
  ctx.font='30px "Archivo Narrow",Archivo,Arial,sans-serif';
  ctx.fillText('FORECAST',W-60-ctx.measureText('FORECAST').width,52+S);
  // headline
  const outcome=(opts.leadOutcome||'').toUpperCase();
  ctx.fillStyle=opts.leadColor||'#111';
  ctx.font='700 128px "Archivo Narrow",Archivo,Arial,sans-serif';
  ctx.textBaseline='alphabetic';
  ctx.fillText(outcome,60,340);
  ctx.fillStyle='#111';
  ctx.fillText((opts.leadPct!==undefined?opts.leadPct.toFixed(1)+'%':''),60+ctx.measureText(outcome).width+28,340);
  // party rows
  const fOrder=opts.fOrder||Object.keys(avg).sort((a,b)=>avg[b]-avg[a]);
  let y=470;
  const rows=fOrder.filter(p=>{if(avg[p]==null)return false; const m=opts.onlyParties&&!opts.onlyParties.includes(p); return !m;});
  const maxV=Math.max(...rows.map(p=>avg[p]));
  ctx.font='34px "Archivo Narrow",Archivo,Arial,sans-serif';
  for(const p of rows){
    const c=meta[p]&&meta[p].color?meta[p].color:{berlin:'#0b6e99',mv:'#8a5a1f'}[COUNTRY]||'#0b6e99';
    const vShare=opts.medVotes&&opts.medVotes[p]!=null?opts.medVotes[p]:avg[p];
    const seats=opts.detSeats&&opts.detSeats[p]!=null?opts.detSeats[p]:null;
    const barW=Math.max(8,(W-360)*(vShare/maxV));
    ctx.fillText((meta[p]&&meta[p].short||p).toUpperCase(),60,y+8);
    ctx.fillStyle=c;
    ctx.fillRect(300,y,barW,34);
    ctx.fillStyle=(p==='linie'&&COUNTRY==='berlin')?c:'#fff';
    ctx.fillText(vShare.toFixed(1)+'%',318,y+4);
    ctx.fillStyle='#111';
    const right=seats!=null?seats+' '+T.seats:'';
    ctx.fillText(right,W-60-ctx.measureText(right).width,y+8);
    y+=64;
  }
  // footer
  ctx.strokeStyle='#e3e3e3';
  ctx.moveTo(60,y);
  ctx.lineTo(W-60,y);
  ctx.stroke();
  ctx.fillStyle='#777';
  ctx.font='26px "Archivo Narrow",Archivo,Arial,sans-serif';
  const footer=`${sim&&sim.nSims?sim.nSims.toLocaleString():''} ${t('simulations','simülasyon')} · ${method} · ${opts.sigmaDesc||''} · ${t('seeded, reproducible','seeded, tekrarlanabilir')}`.trim();
  ctx.fillText(footer,W/2-ctx.measureText(footer).width/2,y+30);
  return canvas;
}

function captureBoxMap(boxId, filename){
  const box=$(boxId);
  if(!box) return;
  const svg=box.querySelector('svg');
  if(!svg) return;
  captureMapPng(svg, filename);
}

function allocateSeatsN(votes, totalSeats){
  const validParties=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
  const totalVotes=validParties.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalVotes===0) return {};
  const seats={};
  validParties.forEach(p=>{seats[p]=0});

  // Hare/Niemeyer (largest remainder): floor(votes/quota), then by fraction
  if(SEAT_METHOD==='hare_niemeyer'){
    const quota=totalVotes/totalSeats;
    const rems=[];
    let given=0;
    validParties.forEach(p=>{
      const q=(votes[p]||0)/quota;
      const fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    let left=totalSeats-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    return seats;
  }

  // Modified Sainte-Laguë (1.2, 3, 5, ...) or D'Hondt (1, 2, 3, ...)
  // Israeli Bader-Ofer: surplus-vote agreement cartels pool their votes for
  // the remainder allocation, then split seats within the pair by D'Hondt.
  if(SEAT_METHOD==='dhondt'&&SURPLUS_AGREEMENTS.length){
    return allocateSeatsBaderOfer(votes, totalSeats);
  }
  const divisors=[];
  for(let i=1;i<=totalSeats;i++){
    divisors.push(SEAT_METHOD==='dhondt'?i:(i===1?1.2:2*i-1));
  }

  const quota=[];
  validParties.forEach(p=>{
    for(let d=0;d<divisors.length;d++){
      quota.push({party:p, q:(votes[p]||0)/divisors[d]});
    }
  });
  quota.sort((a,b)=>b.q-a.q);
  for(let i=0;i<totalSeats&&i<quota.length;i++){
    seats[quota[i].party]++;
  }
  return seats;
}

// Bader-Ofer (Israeli D'Hondt + surplus-vote agreements): qualifying lists get
// their Hare-quota seats first; the leftover seats are then allocated among
// cartels (each surplus-agreement pair pools its votes, lists without an
// agreement are their own cartel) by D'Hondt on the cartel's next quotient;
// finally each multi-party cartel's won seats are split back between its
// members by D'Hondt on each member's next quotient.
function allocateSeatsBaderOfer(votes, totalSeats, threshold){
  if(threshold===undefined) threshold=THRESHOLD;
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=threshold);
  const seats={};
  valid.forEach(p=>{seats[p]=0});
  const totalVotes=valid.reduce((s,p)=>s+(votes[p]||0),0);
  if(totalVotes===0) return seats;
  const quota=totalVotes/totalSeats;

  // Stage 1: Hare-quota seats per qualifying list.
  const qSeats={}; let given=0;
  valid.forEach(p=>{
    qSeats[p]=Math.floor((votes[p]||0)/quota);
    seats[p]=qSeats[p]; given+=qSeats[p];
  });
  let left=totalSeats-given;
  if(left<=0) return seats;

  // Build cartels: agreement pairs that BOTH passed the threshold pool their
  // votes; a pair where one list failed the threshold is treated as unsigned.
  const cartels=[];
  const inCartel=new Set();
  for(const pair of SURPLUS_AGREEMENTS){
    const [a,b]=pair;
    if(!valid.includes(a)||!valid.includes(b)) continue;
    cartels.push({members:[a,b], votes:(votes[a]||0)+(votes[b]||0), q:qSeats[a]+qSeats[b], split:[0,0]});
    inCartel.add(a); inCartel.add(b);
  }
  valid.forEach(p=>{if(!inCartel.has(p)) cartels.push({members:[p], votes:(votes[p]||0), q:qSeats[p], split:[0]})});

  // Stage 2: allocate the remaining seats among cartels by D'Hondt (divisor =
  // cartel's current seats+1, starting from its Hare quota seats).
  for(let i=0;i<left;i++){
    let best=-1,bestQ=-1;
    for(let ci=0;ci<cartels.length;ci++){
      const c=cartels[ci];
      const q=c.votes/(c.q+c.split.reduce((a,b)=>a+b,0)+1);
      if(q>bestQ){bestQ=q;best=ci}
    }
    cartels[best].split[0]++;  // award the seat to the cartel
  }

  // Stage 3: split each multi-party cartel's won seats back among its members
  // by D'Hondt on each member's next quotient (divisor = member seats+1, from
  // its Hare quota seats).
  const out={}; valid.forEach(p=>{out[p]=0});
  for(const c of cartels){
    if(c.members.length===1){out[c.members[0]]=c.q+c.split[0];continue}
    const mw=[0,0];
    for(let i=0;i<c.split[0];i++){
      let best=-1,bestQ=-1;
      for(let mi=0;mi<c.members.length;mi++){
        const p=c.members[mi];
        const q=(votes[p]||0)/(qSeats[p]+mw[mi]+1);
        if(q>bestQ){bestQ=q;best=mi}
      }
      mw[best]++;
    }
    c.members.forEach((p,mi)=>{out[p]=qSeats[p]+mw[mi]});
  }
  return out;
}

// Per-okręg D'Hondt (Poland): each of the 41 okręgi allocates its own seat
// count among nationally-qualifying parties (≥5% national threshold) from the
// district's projected shares — the real Sejm system, not one national district.
function allocateSeatsByDistrict(avg){
  const conf=MAP_CONF();
  if(!conf||!conf.seatDistricts) return null;
  const out={};
  PARTY_ORDER.forEach(p=>{out[p]=0});
  for(const nr of Object.keys(conf.seatDistricts)){
    const seatsN=conf.seatDistricts[nr];
    const shares=districtShares(nr, avg, false);
    if(!shares) continue;
    const votes={};
    PARTY_ORDER.forEach(p=>{votes[p]=shares[p]?shares[p].now:0});
    const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>0&&(avg[p]||0)>=THRESHOLD);
    if(!valid.length) continue;
    const quo=[];
    valid.forEach(p=>{for(let d=1;d<=seatsN;d++) quo.push({p,q:votes[p]/d})});
    quo.sort((a,b)=>b.q-a.q);
    for(let i=0;i<seatsN&&i<quo.length;i++) out[quo[i].p]++;
  }
  return out;
}

// Czech Chamber of Deputies (Act 189/2021): two scrutinies.
// First: LR-Imperiali per region (quota = region votes/(seats+2); integer quota,
// over-allocation trimmed from the smallest remainders per §48(4)).
// Second: national LR-Hagenbach-Bischoff over the remainder votes
// (quota = sum remainders/(unfilled seats+1); leftover seats by largest remainder).
function allocateSeatsCzechia(avg){
  const conf=MAP_CONF();
  if(!conf||!conf.regions) return null;
  const nat=conf.national2021||LAST_ELECTION.results;
  const valid=PARTY_ORDER.filter(p=>(avg[p]||0)>=THRESHOLD);
  const out={}; PARTY_ORDER.forEach(p=>{out[p]=0});
  if(!valid.length) return out;

  // Region votes: 2025 regional shares shifted by the national swing, scaled to
  // the region's absolute valid-vote count (so the national second scrutiny weights
  // regions by size, as the law does), then LR-Imperiali per region.
  const remainders={}; valid.forEach(p=>{remainders[p]=0});
  let unfilled=0;
  for(const rid of Object.keys(conf.regions)){
    const r=conf.regions[rid];
    const votes={}; let sum=0;
    for(const p of valid){
      votes[p]=Math.max(0,(r.results[p]||0)+((avg[p]||0)-(nat[p]||0)))*(r.votes||100)/100;
      sum+=votes[p];
    }
    if(!(sum>0)){ unfilled+=r.seats; continue; }

    // First scrutiny: Imperiali quota (integer)
    const quota=Math.floor(sum/(r.seats+2))||1;
    const alloc={}; const rems=[];
    let given=0;
    valid.forEach(p=>{
      const q=Math.floor(votes[p]/quota);
      alloc[p]=q; given+=q;
      rems.push([votes[p]-q*quota, p]);
    });
    if(given>r.seats){
      rems.sort((a,b)=>a[0]-b[0]);   // smallest remainders lose seats first
      for(let i=0;i<rems.length&&given>r.seats;i++){
        const p=rems[i][1];
        if(alloc[p]>0){ alloc[p]--; given--; }
      }
    }
    if(given<r.seats) unfilled+=r.seats-given;
    valid.forEach(p=>{
      // Remainder votes transfer to the second scrutiny (all votes if no seat won)
      remainders[p]+=votes[p]-quota*alloc[p];
      out[p]+=alloc[p];
    });
  }

  // Second scrutiny: Hagenbach-Bischoff quota nationally
  if(unfilled>0){
    const totalRem=valid.reduce((s,p)=>s+remainders[p],0);
    if(totalRem>0){
      const quota=Math.floor(totalRem/(unfilled+1))||1;
      const alloc={}; const rems=[];
      let given=0;
      valid.forEach(p=>{
        const q=Math.floor(remainders[p]/quota);
        alloc[p]=q; given+=q;
        rems.push([remainders[p]-q*quota, p]);
      });
      rems.sort((a,b)=>b[0]-a[0]);   // leftover by largest remainder
      for(let i=0;i<rems.length&&given<unfilled;i++){
        alloc[rems[i][1]]++; given++;
      }
      valid.forEach(p=>{out[p]+=alloc[p]});
    }
  }
  return out;
}

// Seat allocation for a projection: per-okręg D'Hondt when the country defines
// seatDistricts (Poland), else the national-district allocation.
function allocateSeatsTotal(avg, total){
  return allocateSeatsCzechia(avg)||allocateSeatsByDistrict(avg)||allocateSeatsN(avg,total);
}

function buildParliamentSVG(seats){
  const total=Object.values(seats).reduce((a,b)=>a+b,0);
  if(total===0) return '<svg viewBox="0 0 10 10"></svg>';

  // Parties as wedges filled from the left in spectrum order.
  const assigned=[];
  PARLIAMENT_ORDER.forEach(p=>{
    const n=seats[p]||0;
    for(let i=0;i<n;i++) assigned.push(p);
  });
  // Unmodelled remainder ("Other") wedge at the right edge.
  const otherN=seats.other||0;
  for(let i=0;i<otherN;i++) assigned.push('other');

  let layout=PARLIAMENT_SEATS[COUNTRY];
  if(OVERHANG){
    // Leveling-seat chambers (e.g. Saxony-Anhalt) have a variable size; draw
    // the canonical arch generated for the exact seat count, with enough rows
    // to match the real chamber's density.
    layout=null;
  } else if(layout && layout.seats && layout.seats.length<assigned.length){
    layout=PARLIAMENT_SEATS[COUNTRY+'_ovh']||layout;
  }
  if(!layout || !layout.seats || layout.seats.length<assigned.length){
    // No supplied blank chamber (or it is too small): generate the canonical
    // Wikimedia arch geometry at runtime so any seat count can be drawn.
    layout=generateArchLayout(assigned.length,{minNRows:(OVERHANG&&OVERHANG.rows)||0});
  }
  // Real chamber geometry (parliamentarch SVG). Order the fixed seat
  // positions around the arch center from left to right so each party
  // fills a contiguous wedge; majority axis at the top, total at the base.
    const pts=layout.seats.map((s,i)=>({
      angle:Math.atan2(layout.cx-s[0], layout.cy-s[1]),
      r:Math.hypot(s[0]-layout.cx, s[1]-layout.cy),
      x:s[0], y:s[1], rr:s[2], i,
    }));
    pts.sort((a,b)=>(a.angle-b.angle)||(b.r-a.r)).reverse();

    let minY=Infinity, maxY=-Infinity;
    pts.forEach(p=>{ if(p.y<minY)minY=p.y; if(p.y>maxY)maxY=p.y; });
    const topSeat=pts.find(p=>p.y===minY)||pts[0];
    const botSeat=pts.find(p=>p.y===maxY)||pts[0];
    const topR=topSeat?topSeat.rr:4, botR=botSeat?botSeat.rr:4;

    const majority=Math.floor(total/2)+1;
    const padTop=Math.max(8,Math.round(26-minY));
    const labelY=minY-topR-3;
    const lineTop=labelY+4;
    const lineBot=minY+(maxY-minY)*0.55;
    const totalFs=layout.h<=200?20:26;
    const capH=Math.ceil(totalFs*0.72), descH=Math.ceil(totalFs*0.2)+2;
    const padBottom=padTop+capH+descH+4;
    const totalY=layout.h+capH+2;

    let svg=`<svg viewBox="0 ${-padTop} ${layout.w} ${layout.h+padBottom}" xmlns="http://www.w3.org/2000/svg">`;
    svg+=`<text x="${layout.cx}" y="${fmt(labelY,1)}" text-anchor="middle" font-size="10" font-weight="800" letter-spacing="1" fill="#111827" font-family="Source Code Pro,monospace">MAJORITY ${majority}</text>`;
    svg+=`<line x1="${layout.cx}" y1="${fmt(lineTop,1)}" x2="${layout.cx}" y2="${fmt(lineBot,1)}" stroke="#111827" stroke-width="1" stroke-dasharray="3,3" opacity="0.25"/>`;
    for(let i=0;i<assigned.length&&i<pts.length;i++){
      const party=assigned[i];
      const col=party==='other'?'#9CA3AF':(PARTY_META[party]?PARTY_META[party].color:'#888');
      svg+=`<circle cx="${fmt(pts[i].x,2)}" cy="${fmt(pts[i].y,2)}" r="${fmt(pts[i].rr,2)}" fill="${col}"/>`;
    }
    svg+=`<text x="${layout.cx}" y="${fmt(totalY,1)}" text-anchor="middle" font-size="${totalFs}" font-weight="900" fill="#111827" font-family="Source Code Pro,monospace">${total}</text>`;
    svg+=`</svg>`;
    return svg;
}

function bindParlToggles(avg){
  const pane=$('pane-polls');
  if(!pane) return;
  pane.querySelectorAll('.parl-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.parlmode) PARL_MODE=btn.dataset.parlmode;
      if(btn.dataset.parlview) PARL_VIEW=(PARL_VIEW==='map')?'seats':'map';
      if(btn.dataset.mapcolor) MAP_COLOR=(MAP_COLOR==='bloc')?'party':'bloc';
      renderPollsTab();
    });
  });
  const mapShot=$('map-shot-btn');
  if(mapShot){
    mapShot.addEventListener('click',()=>{
      captureBoxMap('map-box', COUNTRY+'-map.png');
    });
  }
  const parlShot=$('parl-shot-btn');
  if(parlShot){
    parlShot.addEventListener('click',()=>{
      captureBoxMap('parl-box', COUNTRY+'-parliament.png');
    });
  }
  const trendShot=$('trend-shot-btn');
  if(trendShot){
    trendShot.addEventListener('click',()=>{
      captureChartPng($('trend-canvas'), COUNTRY+'-poll-trend.png');
    });
  }
  if(MAP_ONLY||PARL_VIEW==='map') renderMap(avg);
}

/* ---------- forecast: fast Sainte-Laguë ---------- */
function allocateSeatsFast(votes, total){
  if(OVERHANG){
    return overhangSeats(votes,total,directFromProjection(votes),OVERHANG.cap);
  }
  const czechia=allocateSeatsCzechia(votes);
  if(czechia) return czechia;
  const byDistrict=allocateSeatsByDistrict(votes);
  if(byDistrict) return byDistrict;
  const valid=PARTY_ORDER.filter(p=>(votes[p]||0)>=THRESHOLD);
  if(!valid.length) return {};
  const seats={};valid.forEach(p=>{seats[p]=0});

  // Hare/Niemeyer (largest remainder) for the Monte Carlo draws
  if(SEAT_METHOD==='hare_niemeyer'){
    const totalVotes=valid.reduce((a,p)=>a+(votes[p]||0),0);
    if(totalVotes===0) return seats;
    const quota=totalVotes/total;
    const rems=[];
    let given=0;
    valid.forEach(p=>{
      const q=(votes[p]||0)/quota;
      const fl=Math.floor(q);
      seats[p]=fl; given+=fl;
      rems.push([q-fl,p]);
    });
    let left=total-given;
    rems.sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++) seats[rems[i][1]]++;
    return seats;
  }

  const quo={};
  valid.forEach(p=>{quo[p]=SEAT_METHOD==='dhondt'?(votes[p]||0):(votes[p]||0)/1.2});
  // Israeli Bader-Ofer: surplus-vote agreement cartels pool votes for remainder seats
  if(SEAT_METHOD==='dhondt'&&SURPLUS_AGREEMENTS.length){
    return allocateSeatsBaderOfer(votes, total);
  }
  for(let i=0;i<total;i++){
    let best=valid[0];
    for(const p of valid){if(quo[p]>quo[best])best=p}
    seats[best]++;
    quo[best]=SEAT_METHOD==='dhondt'?(votes[best]||0)/(seats[best]+1):(votes[best]||0)/(2*seats[best]+1);
  }
  return seats;
}

/* ---------- forecast: Monte Carlo simulation ---------- */
// Dirichlet concentration: alpha_p = avg_p(%) * K. sd(share) = sqrt(s(1-s)/(K*sum(avg)+1)).
// K calibrated to the empirically measured pollster error: the MAE of final
// poll averages across 2014/2018/2022 was ~1.2-1.5pp. K=11 gives sigma ~1.4pp
// for a 30% party (with the election 9 days away, late swings are limited).
const FORECAST_K=11;

// Seeded PRNG (mulberry32) so the forecast is deterministic/static for a given dataset
function mulberry32(seed){
  let a=seed>>>0;
  return function(){
    a|=0;a=(a+0x6D2B79F5)|0;
    let t=Math.imul(a^(a>>>15),1|a);
    t=(t+Math.imul(t^(t>>>7),61|t))^t;
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function hashStr(s){
  let h=5381;
  for(let i=0;i<s.length;i++){h=((h<<5)+h+s.charCodeAt(i))>>>0}
  return h;
}
let fcRand=Math.random;
const FC_CACHE={};
const RUNOFF_CACHE={};

// Dirichlet concentration K is calibrated for a rich poll sample; with few
// polls the estimate is less certain, so K shrinks (never below 30%).
function effectiveK(nPolls, base){
  if(!nPolls||nPolls<=0) return base;
  return base*Math.max(0.3, Math.min(1, nPolls/12));
}

function forecastSigma(avg, nPolls){
  const sumA=PARTY_ORDER.reduce((a,p)=>a+Math.max(0.5,(avg[p]||0)),0)*effectiveK(nPolls,FORECAST_K);
  const dirichlet=Math.sqrt(0.3*0.7/(sumA+1))*100;
  // Correlated bloc swing adds roughly FORECAST_SWING/2 to a party's sd (the
  // swing moves each bloc by ±σ; a party inside a bloc of share s sees about
  // s·σ/mean(bloc)). Approximate the total: sqrt(dirichlet^2 + (swing·0.5)^2).
  return Math.sqrt(dirichlet*dirichlet+Math.pow(FORECAST_SWING*0.5,2));
}

function gammaSample(alpha){
  // Marsaglia-Tsang (alpha > 1)
  const d=alpha-1/3, c=1/Math.sqrt(9*d);
  for(let i=0;i<20;i++){
    const z=Math.sqrt(-2*Math.log(fcRand()))*(fcRand()<0.5?-1:1);  // full standard normal
    const y=Math.pow(1+c*z,3);
    if(y>0){
      const u=fcRand();
      if(u<1-0.0331*Math.pow(z,4)||Math.log(u)<0.5*z*z+d*(1-y+Math.log(y))) return d*y;
    }
  }
  return d;
}

const FORECAST_K_SEATS=3.5;  // Dirichlet concentration for seat shares
// Correlated (bloc) swing: the dominant polling-error mode is a systematic
// shift between the two blocs (late swings, differential turnout). Each
// simulation draws one bloc-level swing (σ≈2pp) and moves both blocs in
// opposite directions, preserving within-bloc proportions. The Dirichlet
// per-party noise alone misses this correlation and understates uncertainty.
const FORECAST_SWING=2.0;
// Apply a common bloc swing to a shares vector. Returns a new object.
function applyNationalSwing(simVotes){
  if(ARCHIVE_MODE) return simVotes;   // frozen snapshot predates the swing
  const b1=BLOCS&&BLOCS.bloc1, b2=BLOCS&&BLOCS.bloc2;
  if(!b1||!b2||!b1.parties||!b2.parties) return simVotes;
  const t1=b1.parties.reduce((a,p)=>a+(simVotes[p]||0),0);
  const t2=b2.parties.reduce((a,p)=>a+(simVotes[p]||0),0);
  if(!(t1>0)||!(t2>0)) return simVotes;
  const delta=gaussianSample(fcRand)*FORECAST_SWING;
  const f1=Math.max(0.05,1+delta/t1);   // bloc1 gains delta
  const f2=Math.max(0.05,1-delta/t2);   // bloc2 loses delta
  const out={};
  let sum=0;
  for(const p in simVotes){
    const v=simVotes[p]||0;
    let w=v;
    if(b1.parties.includes(p)) w=v*f1;
    else if(b2.parties.includes(p)) w=v*f2;
    out[p]=Math.max(0,w);
    sum+=out[p];
  }
  if(sum>0){for(const p in out) out[p]=100*out[p]/sum}
  return out;
}

function runSeatForecast(avg, nSims, nPolls){
  const thSeats=THRESHOLD/100*SEATS_TOTAL;
  const maj={rg:0,td:0,hung:0,km:0};
  const largest={};
  const seatsBy={};
  const votesBy={};
  PARTY_ORDER.forEach(p=>{seatsBy[p]=[];votesBy[p]=[]});
  const alpha=PARTY_ORDER.map(p=>Math.max(0.2,(avg[p]||0)*effectiveK(nPolls,FORECAST_K_SEATS)));
  for(let s=0;s<nSims;s++){
    const draws=alpha.map(a=>gammaSample(a));
    const totalD=draws.reduce((a,b)=>a+b,0);
    let simVotes={};
    PARTY_ORDER.forEach((p,i)=>{simVotes[p]=100*draws[i]/totalD});
    simVotes=applyNationalSwing(simVotes);
    // seats = share * 120, threshold applied, adjusted to sum 120
    let seats={};
    if(SEAT_METHOD==='dhondt'&&SURPLUS_AGREEMENTS.length){
      // Bader-Ofer with surplus-vote agreement cartels (votes in seat units)
      const raw={};
      PARTY_ORDER.forEach(p=>{raw[p]=simVotes[p]/100*SEATS_TOTAL});
      seats=allocateSeatsBaderOfer(raw, SEATS_TOTAL, thSeats);
      PARTY_ORDER.forEach(p=>{if(seats[p]===undefined)seats[p]=0});
    }else{
    const valid=[];
    PARTY_ORDER.forEach(p=>{
      const raw=simVotes[p]/100*SEATS_TOTAL;
      if(raw>=thSeats){seats[p]=Math.floor(raw);valid.push(p)}
      else seats[p]=0;
    });
    let used=valid.reduce((a,p)=>a+seats[p],0);
    let left=SEATS_TOTAL-used;
    const rems=valid.map(p=>[simVotes[p]/100*SEATS_TOTAL-seats[p],p]).sort((a,b)=>b[0]-a[0]);
    for(let i=0;i<left&&i<rems.length;i++)seats[rems[i][1]]++;
    }
    const MAJ_TH=Math.floor(SEATS_TOTAL/2)+1;
    const KM=BLOCS.kingmaker;
    const kmActive=!!(KM&&!BLOCS.bloc1.parties.includes(KM)&&!BLOCS.bloc2.parties.includes(KM));
    const kmS=kmActive?(seats[KM]||0):0;
    const rg=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const td=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
    if(rg>=MAJ_TH)maj.rg++;
    else if(td>=MAJ_TH)maj.td++;
    else if(kmActive&&(rg+kmS>=MAJ_TH||td+kmS>=MAJ_TH))maj.km++;
    else maj.hung++;
    let top=PARTY_ORDER[0],topN=(seats[PARTY_ORDER[0]]||0);
    for(const p of PARTY_ORDER){if((seats[p]||0)>topN){topN=seats[p];top=p}}
    largest[top]=(largest[top]||0)+1;
    PARTY_ORDER.forEach(p=>{seatsBy[p].push(seats[p]||0);votesBy[p].push(simVotes[p])});
  }
  return summarize(seatsBy,votesBy,largest,maj,nSims);
}

function runForecast(avg, nSims, nPolls){
  if(SEAT_BASED) return runSeatForecast(avg, nSims, nPolls);
  const K=effectiveK(nPolls,FORECAST_K);
  const maj={rg:0,td:0,hung:0,km:0};
  const largest={};
  const top2={};
  const win50={};
  const elected={};
  const seatsBy={};
  const votesBy={};
  PARTY_ORDER.forEach(p=>{seatsBy[p]=[];votesBy[p]=[]});
  const comboCount={};
  const alpha=PARTY_ORDER.map(p=>Math.max(0.5,(avg[p]||0)*K));
  // Two-round setup (Brazil): weighted runoff-pair average, computed once.
  const roSetup=MAP_ONLY?runoffSetup():null;
  const roSigma=roSetup?forecastSigma({[roSetup.a]:roSetup.aN,[roSetup.b]:roSetup.bN}, roSetup.roN):0;
  for(let s=0;s<nSims;s++){
    const draws=alpha.map(a=>gammaSample(a));
    const totalD=draws.reduce((a,b)=>a+b,0);
    let simVotes={};
    PARTY_ORDER.forEach((p,i)=>{simVotes[p]=100*draws[i]/totalD});
    simVotes=applyNationalSwing(simVotes);
    const seats=allocateSeatsFast(simVotes,SEATS_TOTAL);
    const rg=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const td=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
    const simTotal=PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0);
    const MAJ_TH=Math.floor(simTotal/2)+1;
    const KM=BLOCS.kingmaker;
    const kmActive=!!(KM&&!BLOCS.bloc1.parties.includes(KM)&&!BLOCS.bloc2.parties.includes(KM));
    const kmS=kmActive?(seats[KM]||0):0;
    if(rg>=MAJ_TH)maj.rg++;
    else if(td>=MAJ_TH)maj.td++;
    else if(kmActive&&(rg+kmS>=MAJ_TH||td+kmS>=MAJ_TH))maj.km++;
    else maj.hung++;
    let top=PARTY_ORDER[0],topN=HIDE_BLOCS?(simVotes[PARTY_ORDER[0]]||0):(seats[PARTY_ORDER[0]]||0);
    for(const p of PARTY_ORDER){
      const v=HIDE_BLOCS?(simVotes[p]||0):(seats[p]||0);
      if(v>topN){topN=v;top=p}
    }
    largest[top]=(largest[top]||0)+1;
    const srt=PARTY_ORDER.slice().sort((a,b)=>(simVotes[b]||0)-(simVotes[a]||0));
    for(let i=0;i<2&&i<srt.length;i++) top2[srt[i]]=(top2[srt[i]]||0)+1;
    if((simVotes[srt[0]]||0)>=50){
      win50[srt[0]]=(win50[srt[0]]||0)+1;
      elected[srt[0]]=(elected[srt[0]]||0)+1;
    }else if(roSetup&&roSetup.a&&roSetup.b){
      // Joint two-round draw: the runoff outcome is correlated with round 1 —
      // each candidate's runoff share starts from the runoff-poll average plus
      // their round-1 residual vs the round-1 average (shrunk), plus noise.
      const a=roSetup.a, b=roSetup.b;
      const r1AvgA=avg[a]||0, r1AvgB=avg[b]||0;
      const resA=(simVotes[a]||0)-r1AvgA, resB=(simVotes[b]||0)-r1AvgB;
      const shrink=0.5;                       // residual carry-over into runoff
      const da=roSetup.aN+resA*shrink+gaussianSample(fcRand)*roSigma;
      const db=roSetup.bN+resB*shrink+gaussianSample(fcRand)*roSigma;
      const winner=da>=db?a:b;
      elected[winner]=(elected[winner]||0)+1;
    }
    PARTY_ORDER.forEach(p=>{seatsBy[p].push(seats[p]||0);votesBy[p].push(simVotes[p])});
    comboCount[PARTY_ORDER.map(p=>seats[p]||0).join(',')]=(comboCount[PARTY_ORDER.map(p=>seats[p]||0).join(',')]||0)+1;
  }
  return summarize(seatsBy,votesBy,largest,maj,nSims,comboCount,top2,win50,elected);
}

// Weighted runoff-pair average from runoff polls (no simulation, no cache):
// returns {a, b, aN, bN, roN} for the top-2 runoff pair, or null.
function runoffSetup(){
  const roPolls=(POLLS||[]).filter(p=>p.runoff&&typeof p.runoff==='object'&&Object.keys(p.runoff).length);
  if(roPolls.length<2) return null;
  const freq={};
  roPolls.forEach(p=>Object.keys(p.runoff).forEach(c=>{freq[c]=(freq[c]||0)+1}));
  const pair=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,2);
  if(pair.length<2) return null;
  const a=pair[0], b=pair[1];
  const wa=weightedAvgRunoff(roPolls,a), wb=weightedAvgRunoff(roPolls,b);
  if(wa===null||wb===null) return null;
  const tot=wa+wb;
  return {a,b,aN:100*wa/tot,bN:100*wb/tot,roN:roPolls.length};
}

function summarize(seatsBy,votesBy,largest,maj,nSims,comboCount,top2,win50,elected){
  const means={},medians={},modes={};
  PARTY_ORDER.forEach(p=>{
    const arr=seatsBy[p];
    means[p]=arr.reduce((a,b)=>a+b,0)/arr.length;
    const sorted=arr.slice().sort((a,b)=>a-b);
    medians[p]=sorted[Math.floor(arr.length/2)];
    const c={};let best=arr[0],bc=0;
    arr.forEach(v=>{c[v]=(c[v]||0)+1;if(c[v]>bc){bc=c[v];best=v}});
    modes[p]=best;
  });
  let modalKey=null,modalN=0;
  if(comboCount){
    for(const k in comboCount){if(comboCount[k]>modalN){modalN=comboCount[k];modalKey=k}}
  }
  const modal={};
  if(modalKey){
    PARTY_ORDER.forEach((p,i)=>{modal[p]=parseInt(modalKey.split(',')[i],10)});
  }
  return {maj,largest,seatsBy,votesBy,means,medians,modes,modal,modalN,nSims,top2:top2||{},win50:win50||{},elected:elected||{}};
}

function deterministicSeats(medians, means, total){
  // Deterministic projection from MEDIAN seats: parties whose median is 0
  // (usually below the threshold) are left at 0. Sum is adjusted to the
  // total using only parties present in the median outcome.
  const s={};
  PARTY_ORDER.forEach(p=>{s[p]=medians[p]||0});
  let sum=PARTY_ORDER.reduce((a,p)=>a+s[p],0);
  const eligible=PARTY_ORDER.filter(p=>s[p]>0);
  if(sum<total&&eligible.length){
    const order=eligible.slice().sort((a,b)=>(means[b]-medians[b])-(means[a]-medians[a]));
    let i=0;
    while(sum<total){s[order[i%order.length]]++;sum++;i++}
  }else if(sum>total&&eligible.length){
    const order=eligible.slice().sort((a,b)=>(medians[b]-means[b])-(medians[a]-means[a]));
    let i=0;
    while(sum>total){if(s[order[i%order.length]]>0){s[order[i%order.length]]--;sum--}i++}
  }
  return s;
}

function pct100(x){return (x*100).toFixed(1)+'%'}

/* ---------- second-round runoff forecast (two-round presidential) ---------- */
function gaussianSample(rng){
  let u1=0;do{u1=rng()}while(u1<=1e-9);
  const u2=rng()||1e-9;
  return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
}

function weightedAvgRunoff(polls, cand){
  let wSum=0,wTotal=0;
  for(const p of polls){
    const v=p.runoff[cand];
    if(v===undefined) continue;
    const w=(p.n||1000)*pollsterWeight(p.pollster)*recencyWeight(p.date);
    wSum+=v*w; wTotal+=w;
  }
  return wTotal>0?wSum/wTotal:null;
}

// Head-to-head runoff forecast from polls that carry a "runoff" pair.
// Averages are recency-weighted, renormalized to the two candidates, then
// simulated head-to-head with the same national polling error scale.
function runoffForecast(avg, filtered, sim){
  const roPolls=filtered.filter(p=>p.runoff&&typeof p.runoff==='object'&&Object.keys(p.runoff).length);
  if(roPolls.length<2) return null;
  // memoize: the runoff sim is deterministic (seeded) and only depends on the
  // runoff poll set, so cache by date+count+headline values
  const cacheKey=roPolls.map(p=>p.date+':'+p.pollster).join('|');
  if(RUNOFF_CACHE[cacheKey]) return RUNOFF_CACHE[cacheKey];
  const freq={};
  roPolls.forEach(p=>Object.keys(p.runoff).forEach(c=>{freq[c]=(freq[c]||0)+1}));
  const pair=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,2);
  if(pair.length<2) return null;
  const a=pair[0], b=pair[1];
  const wa=weightedAvgRunoff(roPolls,a), wb=weightedAvgRunoff(roPolls,b);
  if(wa===null||wb===null) return null;
  const tot=wa+wb;
  const aN=100*wa/tot, bN=100*wb/tot;
  const rng=mulberry32(hashStr((POLLS[0]?POLLS[0].date:'')+'|runoff|'+roPolls.length));
  const sigma=forecastSigma({[a]:aN,[b]:bN}, roPolls.length);
  let winA=0;
  for(let s=0;s<3000;s++){
    if(aN+gaussianSample(rng)*sigma > bN+gaussianSample(rng)*sigma) winA++;
  }
  const res={a,b,aN,bN,winA,roN:roPolls.length,sigma,roPolls};
  RUNOFF_CACHE[cacheKey]=res;
  return res;
}

// First-round threshold card (two-round presidential): each candidate's chance
// of winning outright in round 1 (>=50% of valid votes, sim.win50) vs being
// forced to a runoff (reaches top-2 but no majority).
function firstRoundCard(sim){
  if(!sim||!sim.win50) return '';
  const fOrder=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  const rows=fOrder.map(p=>{
    const w1=(sim.win50[p]||0)/sim.nSims;
    const top2=(sim.top2[p]||0)/sim.nSims;
    const runoff=Math.max(0,top2-w1);
    return {p, w1, runoff, top2, color:PARTY_META[p]?PARTY_META[p].color:'#888'};
  }).sort((a,b)=>(b.w1+b.runoff)-(a.w1+a.runoff)).slice(0,4);
  const barRow=(label,color,v)=>`<div class="fc-row">
    <span class="fc-row-label" style="color:${color}">${label}</span>
    <div class="fc-row-bar"><div class="fc-row-fill" style="width:${(v*100).toFixed(1)}%;background:${color}"></div></div>
    <span class="fc-row-val">${pct100(v)}</span>
  </div>`;
  return `<div class="card">
    <div class="card-head"><div class="bar"></div><div class="t">${t('FIRST ROUND — MAJORITY','BİRİNCİ TUR — ÇOĞUNLUK')}</div></div>
    <div class="fc-seathead fc-seathead-hd"><span>${t('WINS ROUND 1','1. TURU KAZANIR')}</span><span></span><span>P</span></div>
    ${rows.map(r=>barRow(partyCode(r.p),r.color,r.w1)).join('')}
    <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('REACHES A RUNOFF','İKİNCİ TURA KALIR')}</span><span></span><span>P</span></div>
    ${rows.map(r=>barRow(partyCode(r.p),r.color,r.runoff)).join('')}
    <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px">
      ${t('A candidate is elected in round 1 with a majority of valid votes (≥50%); otherwise the top two face a runoff.','Bir aday birinci turda geçerli oyların çoğunluğunu (≥%50) alırsa seçilir; aksi halde ilk iki aday ikinci turda karşılaşır.')}
    </div>
  </div>`;
}

/* ---------- forecast tab ---------- */
function renderForecast(pane){
  const daysVal=parseInt($('filter-days').value)||30;
  const pollsterVal=$('filter-pollster')?$('filter-pollster').value:'';
  let filtered=recentPolls(POLLS,daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  const avg=computeAverages(filtered);
  if(!filtered.length||Object.values(avg).every(v=>v===null)){
    pane.innerHTML=`<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">FORECAST</div></div><div class="method-text" style="padding:16px"><p>No polls in the selected range.</p></div></div></div>`;
    return;
  }

  // Deterministic + static: seeded simulation, cached per filter state
  const seedKey=(POLLS[0]?POLLS[0].date:'')+'|'+daysVal+'|'+pollsterVal+'|'+filtered.length;
  let sim=FC_CACHE[seedKey];
  if(!sim){
    fcRand=mulberry32(hashStr(seedKey));
    sim=runForecast(avg,3000,filtered.length);
    FC_CACHE[seedKey]=sim;
  }
  const fOrder=PARTY_ORDER.filter(p=>!(PARTY_META[p]&&PARTY_META[p].pastOnly));
  const maj=sim.maj;
  const majTotal=sim.nSims;
  const kmDefined=!!BLOCS.kingmaker;
  const KM_COLOR=BLOCS.kingmakerColor||'#F59E0B';
  const rgP=maj.rg/majTotal, tdP=maj.td/majTotal, hungP=maj.hung/majTotal, kmP=kmDefined?((maj.km||0)/majTotal):0;
  const expectedSeats=Math.round(fOrder.reduce((a,p)=>a+mean(sim.seatsBy[p]),0));
  const MAJ=Math.floor(expectedSeats/2)+1;

  // --- Deterministic: median-based parliament ---
  const detSeats=deterministicSeats(sim.medians,sim.means,OVERHANG?expectedSeats:SEATS_TOTAL);
  let cmpRows='';
  const cmpOrder=fOrder.slice().sort((a,b)=>sim.means[b]-sim.means[a]);
  cmpOrder.forEach(p=>{
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    cmpRows+=`<tr>
      <td style="font-weight:700;color:${color}">${partyCode(p)}</td>
      <td class="num c" style="font-weight:900">${detSeats[p]}</td>
      <td class="num c">${sim.medians[p]}</td>
      <td class="num c">${sim.modes[p]}</td>
    </tr>`;
  });

  // --- Constituency results (median national vote shares) ---
  const medVotes={};
  fOrder.forEach(p=>{
    const arr=sim.votesBy[p].slice().sort((a,b)=>a-b);
    medVotes[p]=arr[Math.floor(arr.length/2)];
  });

  // Second-round runoff card (two-round presidential only)
  let runoffHtml='';
  const rDateNote=META.election_date_runoff?' ('+META.election_date_runoff+')':'';
  if(MAP_ONLY){
    const ro=runoffForecast(avg, filtered, sim);
    if(ro){
      const cA=PARTY_META[ro.a]?PARTY_META[ro.a].color:'#888';
      const cB=PARTY_META[ro.b]?PARTY_META[ro.b].color:'#888';
      const h2a=ro.winA/3000, h2b=1-h2a;
      const reachA=(sim.top2[ro.a]||0)/sim.nSims, reachB=(sim.top2[ro.b]||0)/sim.nSims;
      const w1A=(sim.win50[ro.a]||0)/sim.nSims, w1B=(sim.win50[ro.b]||0)/sim.nSims;
      // Joint two-round sim: P(elected) comes directly from the correlated
      // round-1 -> runoff simulation (fallback: the independent formula).
      const eleA=(sim.elected&&sim.elected[ro.a]!==undefined)?(sim.elected[ro.a]/sim.nSims):(w1A+Math.max(0,reachA-w1A)*h2a);
      const eleB=(sim.elected&&sim.elected[ro.b]!==undefined)?(sim.elected[ro.b]/sim.nSims):(w1B+Math.max(0,reachB-w1B)*h2b);
      const row=(label,color,p)=>`<div class="fc-row">
        <span class="fc-row-label" style="color:${color}">${label}</span>
        <div class="fc-row-bar"><div class="fc-row-fill" style="width:${(p*100).toFixed(1)}%;background:${color}"></div></div>
        <span class="fc-row-val">${pct100(p)}</span>
      </div>`;
      runoffHtml=`<div class="card">
        <div class="card-head"><div class="bar"></div><div class="t">${t('SECOND ROUND — RUNOFF','İKİNCİ TUR')}</div></div>
        <div style="font-size:11px;color:var(--c-text-muted);margin-bottom:8px">
          ${t('Head-to-head from','Başa baş anketlerinden')} ${ro.roN} ${t('runoff polls','ikinci tur anketi')} · σ≈${fmt(ro.sigma,1)}pp · ${partyCode(ro.a)} ${fmt(ro.aN,1)}% / ${partyCode(ro.b)} ${fmt(ro.bN,1)}%
        </div>
        <div class="fc-seathead fc-seathead-hd"><span>${t('WINS THE RUNOFF','İKİNCİ TURU KAZANIR')}</span><span></span><span>P</span></div>
        ${row(partyCode(ro.a),cA,h2a)}
        ${row(partyCode(ro.b),cB,h2b)}
        <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('REACHES THE RUNOFF','İKİNCİ TURA KALIR')}</span><span></span><span>P</span></div>
        ${row(partyCode(ro.a),cA,reachA)}
        ${row(partyCode(ro.b),cB,reachB)}
        <div class="fc-seathead fc-seathead-hd" style="margin-top:10px"><span>${t('ELECTED PRESIDENT','CUMHURBAŞKANI SEÇİLİR')}</span><span></span><span>P</span></div>
        ${row(partyCode(ro.a),cA,eleA)}
        ${row(partyCode(ro.b),cB,eleB)}
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px">
          ${t('Two-round system: a candidate is elected with a majority of valid votes in the first round; otherwise the top two face a runoff two weeks later'+(META.election_date_runoff?rDateNote:'')+'. P(elected) = round-1 majority + reach-the-runoff × head-to-head win.','İki turlu sistem: aday birinci turda geçerli oyların çoğunluğunu alırsa seçilir; aksi halde ilk iki aday iki hafta sonra ikinci turda karşılaşır'+(META.election_date_runoff?rDateNote:'')+'. Seçilme olasılığı = birinci turda çoğunluk + ikinci tura kalma × ikinci tur kazanma.')}
        </div>
      </div>`;
    }
  }

  const constHtml=CONSTITUENCIES&&CONSTITUENCIES.constituencies&&CONSTITUENCIES.constituencies.length?
    constituencyTableHtml(medVotes,{
      title:'CONSTITUENCIES',
      showDelta:true,
      note:'allocated from the forecast’s median national vote shares'
    }):'';

  // --- Probabilities ---
  const majorityBar=`<div class="fc-majbar">
    <div class="fc-majseg" style="width:${(rgP*100).toFixed(1)}%;background:${BLOCS.bloc1.color}"></div>
    <div class="fc-majseg" style="width:${(tdP*100).toFixed(1)}%;background:${BLOCS.bloc2.color}"></div>
    ${kmDefined?`<div class="fc-majseg" style="width:${(kmP*100).toFixed(1)}%;background:${KM_COLOR}"></div>`:''}
    <div class="fc-majseg" style="width:${(hungP*100).toFixed(1)}%;background:#9CA3AF"></div>
  </div>`;

  let largestRows='';
  const largestSorted=fOrder.slice().sort((a,b)=>(sim.largest[b]||0)-(sim.largest[a]||0));
  const maxL=Math.max(...Object.values(sim.largest),1);
  largestSorted.forEach(p=>{
    const n=sim.largest[p]||0;
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    largestRows+=`<div class="fc-row">
      <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
      <div class="fc-row-bar"><div class="fc-row-fill" style="width:${(n/maxL*100).toFixed(1)}%;background:${color}"></div></div>
      <span class="fc-row-val">${pct100(n/sim.nSims)}</span>
    </div>`;
  });

  let voteRows='';
  const voteOrder=fOrder.slice().sort((a,b)=>mean(sim.votesBy[b])-mean(sim.votesBy[a]));
  const vsMax=SEAT_BASED?60:50;
  const vsThresh=SEAT_BASED?THRESHOLD/100*SEATS_TOTAL:THRESHOLD;
  voteOrder.forEach(p=>{
    const arr=sim.votesBy[p];
    const mu=SEAT_BASED?mean(arr)/100*SEATS_TOTAL:mean(arr);
    const lo=SEAT_BASED?percentile(arr,5)/100*SEATS_TOTAL:percentile(arr,5);
    const hi=SEAT_BASED?percentile(arr,95)/100*SEATS_TOTAL:percentile(arr,95);
    const thresh=arr.filter(v=>(SEAT_BASED?v/100*SEATS_TOTAL:v)>=vsThresh).length/arr.length;
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    const barW=Math.min(100,mu/vsMax*100);
    // Momentum: recent-14d vs last-30d raw average, shown as ▲/▼ with the delta.
    const mom=partyMomentum(POLLS,p,14,30);
    const momHtml=mom===null?'':(mom>0
      ?`<span class="fc-mom up" title="14-day trend vs 30-day">▲ +${fmt(mom,1)}</span>`
      :`<span class="fc-mom down" title="14-day trend vs 30-day">▼ ${fmt(mom,1)}</span>`);
    let note='';
    if(thresh>=0.5){
      if(thresh<0.995) note=`<div class="fc-note">${partyCode(p)} is below the threshold in ${pct100(1-thresh)} of sims</div>`;
    }else if(thresh>0.005){
      note=`<div class="fc-note">${partyCode(p)} crosses the threshold in ${pct100(thresh)} of sims</div>`;
    }
    voteRows+=`<div class="fc-voterow">
      <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
      ${momHtml}
      <div class="fc-row-bar fc-votebar"><div class="fc-row-fill" style="width:${barW}%;background:${color}"></div><div class="fc-thresh" style="left:${(vsThresh/vsMax*100).toFixed(1)}%"></div></div>
      <span class="fc-vote-val">${fmt(mu,1)}${SEAT_BASED?'':'%'}</span>
      <span class="fc-vote-int">${fmt(lo,1)}–${fmt(hi,1)}</span>
      ${note}
    </div>`;
  });

  let seatRows='';
  const seatOrder=fOrder.slice().sort((a,b)=>{
    const ma=mean(sim.seatsBy[a]), mb=mean(sim.seatsBy[b]);
    return mb-ma;
  });
  const MAX_BUCKETS=25;
  seatOrder.forEach(p=>{
    const arr=sim.seatsBy[p];
    const mu=mean(arr);
    const lo=percentile(arr,5), hi=percentile(arr,95);
    const color=PARTY_META[p]?PARTY_META[p].color:'#888';
    const span=Math.max(1,hi-lo);
    const bW=Math.max(1,Math.ceil(span/MAX_BUCKETS));
    const buckets=new Array(Math.ceil(350/bW)).fill(0);
    arr.forEach(v=>{buckets[Math.floor(v/bW)]++});
    const maxB=Math.max(...buckets,1);
    let hist='';
    buckets.forEach((c,i)=>{
      const h=Math.round(c/maxB*36);
      hist+=`<div class="fc-hist-col" style="height:${Math.max(1,h)}px;background:${color};opacity:${0.35+0.65*(c/maxB)}"></div>`;
    });
    const inParliament=mu>0.5;
    seatRows+=`<div class="fc-seatrow">
      <div class="fc-seathead">
        <span class="fc-row-label" style="color:${color}">${partyCode(p)}</span>
        <span class="fc-seat-mean">${fmt(mu,0)}</span>
        <span class="fc-seat-int">${lo}–${hi}</span>
      </div>
      <div class="fc-hist">${hist}</div>
      ${inParliament?'':'<div class="fc-note">likely below the '+THRESHOLD+'% threshold</div>'}
    </div>`;
  });

  let leadCands;
  if(HIDE_BLOCS){
    leadCands=fOrder.slice().sort((a,b)=>(sim.largest[b]||0)-(sim.largest[a]||0))
      .map(p=>({n:partyCode(p),c:PARTY_META[p]?PARTY_META[p].color:'#888',p:(sim.largest[p]||0)/sim.nSims}));
  }else{
    leadCands=[{n:BLOCS.bloc1.name,c:BLOCS.bloc1.color,p:rgP},{n:BLOCS.bloc2.name,c:BLOCS.bloc2.color,p:tdP}];
    if(kmDefined)leadCands.push({n:BLOCS.kingmakerLabel||'Kingmaker',c:KM_COLOR,p:kmP});
    leadCands.sort((a,b)=>b.p-a.p);
  }
  const leadOutcome=leadCands[0].n, leadColor=leadCands[0].c, leadPct=leadCands[0].p*100;

  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${T.tabs.forecast} — ${COUNTRY_NAME} ${(((META&&META.election_date)||(TREND_CONF&&TREND_CONF.electionDate))||'').slice(0,4)||new Date().getFullYear()}</div>
      <button class="shot-btn" id="fc-forecast-shot-btn" title="${t('Download forecast image as PNG','Tahmin görselini PNG olarak indir')}" style="margin-left:auto;align-self:center">${CAM_ICON}</button>
      <div class="fc-headline">
        <span class="fc-headline-label" style="color:${leadColor}">${leadOutcome} ${HIDE_BLOCS?t('to win','kazanacak'):t('majority','çoğunluk')}</span>
        <span class="fc-headline-num">${leadPct.toFixed(1)}%</span>
      </div>
      <div class="hero-date">${sim.nSims.toLocaleString()} ${t('simulations','simülasyon')} · ${t('national polling error','ulusal anket hatası')} (σ≈${SEAT_BASED?fmt(2.2,1)+' seats':fmt(forecastSigma(avg,filtered.length),1)+'pp'}) · ${MAP_ONLY?`${SEATS_TOTAL} ${unitLabel()} · ${t('first round','ilk tur')} ${TREND_CONF?TREND_CONF.electionDate:''}`:`${methodNameShort()} · ${seatsDesc()} ${T.seats} · ${THRESHOLD}% ${T.threshold}`} · seeded, reproducible</div>
    </div>

    ${MAP_ONLY?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.ifHeldToday}</div>
      <button class="shot-btn" id="fc-parl-shot-btn" style="margin-left:auto" title="Download parliament diagram as PNG">${CAM_ICON}</button>
      </div>
      ${MAP_ONLY?'':`<div class="parliament-box" id="fc-parl-box">${buildParliamentSVG(detSeats)}</div>`}
      <div style="overflow-x:auto">
      <table class="polls-table compact-table"><thead><tr>
        <th>${t('Party','Parti')}</th><th class="c">${T.seats}</th><th class="c">Median</th><th class="c">Mode</th>
      </tr></thead><tbody>${cmpRows}</tbody></table></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">
        ${t('Deterministic projection from the median of the simulations (parties whose median is 0 are left out)','Simülasyonların medyanından deterministik tahmin (medyanı 0 olan partiler hariç)')}
      </div>
    </div>`}

    ${MAP_CONF()?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.districtMap}</div></div>
      <div class="map-toggle-row" style="justify-content:flex-end">
        <button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='proj'?' active':''}" data-fcmode="proj">${T.projection}</button>
        <button class="map-toggle-btn parl-btn fc-map-btn${FC_MODE==='res'?' active':''}" data-fcmode="res">${LAST_ELECTION.date.slice(0,4)} ${T.result}</button>
        ${MAP_CONF().useConstituencies&&BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn fc-map-color-btn${MAP_COLOR==='bloc'?' active':''}" data-mapcolor="bloc">${T.blocs}</button>`:''}
        <button class="shot-btn" id="fc-map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>
      </div>
      <div class="parliament-box" id="fc-map-box"></div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:8px;text-align:center">
        District winners from the forecast's median national vote shares · hover a district for the past/forecast comparison
      </div>
    </div>`:''}

    ${MAP_ONLY?firstRoundCard(sim):''}
    ${runoffHtml}

    ${constHtml}

    <div class="fc-section"><div class="bar"></div>${T.probabilities}</div>

    ${HIDE_BLOCS?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.majority}</div></div>
      ${majorityBar}
      <div class="fc-majlegend">
        <span><span class="fc-dot" style="background:${BLOCS.bloc1.color}"></span>${BLOCS.bloc1.name} ${pct100(rgP)}</span>
        <span><span class="fc-dot" style="background:${BLOCS.bloc2.color}"></span>${BLOCS.bloc2.name} ${pct100(tdP)}</span>
        ${kmDefined?`<span><span class="fc-dot" style="background:${KM_COLOR}"></span>${BLOCS.kingmakerLabel||'Kingmaker'} ${pct100(kmP)}</span>`:''}
        <span><span class="fc-dot" style="background:#9CA3AF"></span>No majority ${pct100(hungP)}</span>
      </div>
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Chance of a ${MAJ}-seat majority</div>
    </div>`}

    <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.largestParty}</div></div>
      ${largestRows}
    </div>

    ${SEAT_BASED?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.voteShare}</div></div>
      <div class="fc-votehd"><span></span><span></span><span>EXP</span><span>90% INT</span></div>
      ${voteRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected vote share from simulations · dashed line = ${THRESHOLD}% threshold</div>
    </div>`}

    ${MAP_ONLY?'':`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatDistribution}</div></div>
      <div class="fc-seathead fc-seathead-hd"><span></span><span>EXP</span><span>90% INT</span></div>
      ${seatRows}
      <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px">Expected seats = mean of simulations · 90% interval = 5th–95th percentile</div>
    </div>`}
  </div>`;
  const fcParlShot=$('fc-parl-shot-btn');
  if(fcParlShot){
    fcParlShot.addEventListener('click',()=>{
      captureBoxMap('fc-parl-box', COUNTRY+'-forecast-parliament.png');
    });
  }
  const fcInfShot=$('fc-forecast-shot-btn');
  if(fcInfShot){
    fcInfShot.addEventListener('click',async()=>{
      const canvas=await renderForecastInfographic(avg, sim, {
        title:COUNTRY_NAME+' '+(((META&&META.election_date)||(TREND_CONF&&TREND_CONF.electionDate))||'').slice(0,4)||new Date().getFullYear(),
        methodName:methodNameShort(),
        sigmaDesc:SEAT_BASED?fmt(2.2,1)+' '+T.seats:fmt(forecastSigma(avg,filtered.length),1)+'pp',
        leadColor:leadColor, leadOutcome:leadOutcome, leadPct:leadPct,
        fOrder:fOrder, onlyParties:null, medVotes:medVotes, detSeats:detSeats
      });
      downloadPng(canvas.toDataURL('image/png'), COUNTRY+'-forecast.png');
    });
  }
  if(MAP_CONF()){
    const fcBox=$('fc-map-box');
    if(fcBox){
      const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:medVotes;
      renderMapInto(fcBox, fcAvg, FC_MODE==='res');
    }
    pane.querySelectorAll('.fc-map-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        FC_MODE=btn.dataset.fcmode;
        pane.querySelectorAll('.fc-map-btn').forEach(b=>b.classList.toggle('active',b===btn));
        const fcBox=$('fc-map-box');
        if(fcBox){
          const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:medVotes;
          renderMapInto(fcBox, fcAvg, FC_MODE==='res');
        }
      });
    });
    pane.querySelectorAll('.fc-map-color-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        MAP_COLOR=(MAP_COLOR==='bloc')?'party':'bloc';
        pane.querySelectorAll('.fc-map-color-btn').forEach(b=>b.classList.toggle('active',b===btn));
        const fcBox=$('fc-map-box');
        if(fcBox){
          const fcAvg=FC_MODE==='res'?LAST_ELECTION.results:medVotes;
          renderMapInto(fcBox, fcAvg, FC_MODE==='res');
        }
      });
    });
    const fcShot=$('fc-map-shot-btn');
    if(fcShot){
      fcShot.addEventListener('click',()=>{
        captureBoxMap('fc-map-box', COUNTRY+'-forecast-map.png');
      });
    }
  }
}

/* ---------- live tab (election night) ---------- */
let LIVE_DATA=null;
let LIVE_LOADING=false;
let LIVE_INTERVAL=null;

async function loadValu(){
  try{
    const resp=await fetch(dataBase()+'data/'+COUNTRY+'/valu.json');
    if(!resp.ok) return null;
    const j=await resp.json();
    return j&&j.parties?j.parties:null;
  }catch(e){return null}
}

async function loadNovus(){
  try{
    const resp=await fetch(dataBase()+'data/'+COUNTRY+'/novus.json');
    if(!resp.ok) return null;
    const j=await resp.json();
    return j&&j.parties?j.parties:null;
  }catch(e){return null}
}

async function loadLive(){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  if(!conf) return null;
  if(LIVE_LOADING) return LIVE_DATA;
  LIVE_LOADING=true;
  const urls=[conf.workerUrl, dataBase()+conf.localUrl].filter(Boolean);
  for(const u of urls){
    try{
      const resp=await fetch(u);
      if(!resp.ok) continue;
      const j=await resp.json();
      LIVE_DATA=j;
      LIVE_LOADING=false;
      return j;
    }catch(e){}
  }
  LIVE_LOADING=false;
  return null;
}

// Frozen pre-election forecast: the archive snapshot's poll set (e.g.
// archive/sweden-2026/), used as the election-night "final forecast" reference.
let ARCHIVE_FORECAST_CACHE={};
async function loadArchivedForecast(){
  if(ARCHIVE_FORECAST_CACHE[COUNTRY]!==undefined) return ARCHIVE_FORECAST_CACHE[COUNTRY];
  const slug=COUNTRY+'-2026';
  try{
    const resp=await fetch(dataBase()+'archive/'+slug+'/data/'+COUNTRY+'/polls.json');
    if(!resp.ok) throw new Error('HTTP '+resp.status);
    const j=await resp.json();
    ARCHIVE_FORECAST_CACHE[COUNTRY]=j.polls||null;
    return ARCHIVE_FORECAST_CACHE[COUNTRY];
  }catch(e){
    ARCHIVE_FORECAST_CACHE[COUNTRY]=null;
    return null;
  }
}

function livePartyMap(){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  const map={};
  const mk=conf&&conf.mapCode?conf.mapCode:(p=>p);
  for(const p of PARTY_ORDER) map[mk(p)]=p;
  return map;
}

// four-way comparison rows: live % vs exit poll(s) vs forecast avg.
// Sweden shows both SVT Valu + TV4/Novus; German states show their own
// configured exit poll (FGW / Infratest dimap).
function liveCompareRows(live, valu, novus, avg){
  const map=livePartyMap();
  const conf=(COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live)||{};
  const ep=conf.exitPoll;
  const exitCols=ep
    ? [{lab:ep.short, src: valu}, {lab:'FCST', src: avg}]
    : [{lab:'VALU', src: valu}, {lab:'NOVU', src: novus}, {lab:'FCST', src: avg}];
  const liveParties=live&&live.national&&live.national.parties||[];
  const liveBy={};
  liveParties.forEach(p=>{const k=map[p.code];if(k)liveBy[k]={pct:p.pct,votes:p.votes}});
  const rows=PARTY_ORDER.slice().sort((a,b)=>{
    const la=liveBy[a]?liveBy[a].pct:0;
    const lb=liveBy[b]?liveBy[b].pct:0;
    return lb-la;
  }).map(p=>{
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    const lv=liveBy[p];
    const lvPct=lv?lv.pct:null;
    const maxV=Math.max(lvPct||0,(valu&&valu[p])||0,(novus&&novus[p])||0,(avg&&avg[p])||0,35);
    const cells=exitCols.map(({lab,src})=>{
      const v=src&&src[p]!=null?src[p]:null;
      const w=v!=null?Math.max(2,Math.min(100,v/maxV*100)):0;
      return `<div class="lv-cell">
        <div class="lv-track"><div class="lv-fill" style="width:${w}%;background:${col}"></div></div>
        <span class="lv-val">${v!=null?pct(v):'—'}</span>
        <span class="lv-lab">${lab}</span>
      </div>`;
    }).join('');
    const swing=lvPct!=null&&LAST_ELECTION.results[p]!=null?lvPct-LAST_ELECTION.results[p]:null;
    return `<div class="lv-row">
      <span class="lv-code" style="color:${col}">${partyCode(p)}</span>
      ${cells}
      <span class="lv-swing ${swing>0.05?'up':(swing<-0.05?'down':'flat')}">${swing==null?'—':((swing>0?'+':'')+pct(swing))}</span>
    </div>`;
  }).join('');
  return rows;
}

function renderLive(pane){
  const conf=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live;
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${T.tabs.live} — ${COUNTRY_NAME}</div>
      <div class="hero-date">Election night · loading official count…</div>
    </div>
  </div>`;
loadLive().then(live=>{
    return Promise.all([loadValu(), loadNovus()]).then(([valu, novus])=>{
    // Placeholder guard: the local live.json is a 2022 snapshot used only as an
    // offline fallback. If that's what we got, don't present 2022 numbers as
    // tonight's result — render the exit polls/forecast with LIVE shown as "—"
    // and a waiting banner instead of the official count.
    const isPlaceholder=live&&live.election==='val2022'&&live.source==='valmyndigheten'&&!live.updated;
    if(isPlaceholder&&COUNTRY==='sweden') live=null;
    const waitingLive=isPlaceholder&&COUNTRY==='sweden';
    return loadArchivedForecast().then(archPollSet=>{
    // Forecast reference: the frozen pre-election archive snapshot when
    // available (Sweden), else the live poll set — so the "final forecast"
    // column shows what the model predicted before election night. Uses the
    // SIMULATION expected vote share (like the forecast tab's EXP column),
    // not the raw poll average.
    let avg=computeAverages(recentPolls(archPollSet||POLLS,60));
    const archPolls=archPollSet||POLLS;
    const archFiltered=recentPolls(archPolls,30);   // match the archive page's default window
    ARCHIVE_MODE=!!archPollSet;   // match the archive's frozen weighting math
    const archAvg=computeAverages(archFiltered);
    ARCHIVE_MODE=false;
    if(archFiltered.length){
      try{
        fcRand=mulberry32(hashStr((archPolls[0]?archPolls[0].date:'')+'|live-fcst|30|'));
        const archSim=runForecast(archAvg,3000,archFiltered.length);
        // expected VOTE SHARE from the simulation (normalized to 100%), exactly
        // like the forecast tab's EXP column
        const simAvg={};
        PARTY_ORDER.forEach(p=>{simAvg[p]=mean(archSim.votesBy[p])});
        avg=simAvg;
      }catch(e){}
    }
    const nat=live&&live.national;
    const counted=nat?nat.counted:0;
    const totalD=nat?nat.totalDistricts:0;
    const countedPct=totalD?Math.round(counted/totalD*100):0;
    const turnout=nat&&nat.turnout!=null?nat.turnout:null;
    const updated=nat&&nat.updatedAt||(live&&live.updated)||'';
    // the worker stamps updated as a raw epoch number; format it for display
    const updatedDisp=(typeof updated==='number')
      ?new Date(updated).toLocaleString(LANG==='tr'?'tr-TR':'sv-SE',{hour:'2-digit',minute:'2-digit'})
      :updated;
    const rows=liveCompareRows(live, valu, novus, avg);

    // seat projection: prefer live official seats (only if they cover most of the
// chamber — at partial counts Valmyndigheten may not publish per-valkrets
// seats yet), else allocate from national pct
let seats=null;
    const map=livePartyMap();
    let vkSeats=null;
    if(live&&live.valkretsar){
      vkSeats={};
      live.valkretsar.filter(Boolean).forEach(v=>{
        (v.seats||[]).forEach(s=>{const k=map[s.code];if(k)vkSeats[k]=(vkSeats[k]||0)+s.seats});
      });
      const vkTotal=PARTY_ORDER.reduce((a,p)=>a+(vkSeats[p]||0),0);
      if(vkTotal<SEATS_TOTAL*0.9) vkSeats=null;   // incomplete -> fall back
    }
    if(vkSeats){
      seats=vkSeats;
    }else if(live&&live.national&&live.national.parties){
      const votes={};
      live.national.parties.forEach(p=>{const k=map[p.code];if(k)votes[k]=p.pct!=null?p.pct:0});
      seats=allocateSeatsFast(votes,SEATS_TOTAL);
    }
    const seatsTotal=seats?PARTY_ORDER.reduce((a,p)=>a+(seats[p]||0),0):0;
    const parlSvg=seats&&seatsTotal?buildParliamentSVG(seats):'';

    const ep=(COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live&&COUNTRIES[COUNTRY].live.exitPoll)||null;
    const epNote=ep?` · ${t('Exit poll','Çıkış anketi')}: ${ep.short} (${ep.name})`:'';
    const heroLine=waitingLive
      ?`${t('Election night · waiting for the official count…','Seçim gecesi · resmi sayım bekleniyor…')}${epNote}`
      :`${countedPct}% ${t('of','')} ${totalD} ${T.counted} · ${T.turnout} ${turnout!=null?pct(turnout):'—'} · ${T.updated} ${updatedDisp||'—'}${epNote}`;

    // --- majority banner: single full-width bar (RG left / Tidö right) ---
    let majBanner='';
    if(seats&&seatsTotal&&BLOCS.bloc1&&BLOCS.bloc2){
      const b1Seats=BLOCS.bloc1.parties.reduce((a,p)=>a+(seats[p]||0),0);
      const b2Seats=BLOCS.bloc2.parties.reduce((a,p)=>a+(seats[p]||0),0);
      const majNeed=Math.floor(SEATS_TOTAL/2)+1;
      const b1Lead=b1Seats>=majNeed, b2Lead=b2Seats>=majNeed;
      const w1=Math.max(0.5,b1Seats/SEATS_TOTAL*100);   // RG share of the bar
      const w2=Math.max(0.5,b2Seats/SEATS_TOTAL*100);   // Tidö share (right-anchored)
      const thPos=majNeed/SEATS_TOTAL*100;              // majority threshold position
      const c1=BLOCS.bloc1.color||'#C83737';
      const c2=BLOCS.bloc2.color||'#2E6EA8';
      majBanner=`<div class="lv-majbanner">
        <div class="lv-maj-hd">
          <span style="color:${c1}">${BLOCS.bloc1.name} <b>${b1Seats}</b>${b1Lead?' · '+t('MAJ','ÇOĞ'):''}</span>
          <span class="lv-maj-th">${t('MAJORITY','ÇOĞUNLUK')} ${majNeed} / ${SEATS_TOTAL}</span>
          <span style="color:${c2}">${BLOCS.bloc2.name} <b>${b2Seats}</b>${b2Lead?' · '+t('MAJ','ÇOĞ'):''}</span>
        </div>
        <div class="lv-single-bar">
          <div class="lv-single-fill" style="width:${w1}%;background:${c1}"></div>
          <div class="lv-single-gap"></div>
          <div class="lv-single-fill" style="width:${w2}%;background:${c2}"></div>
          <div class="lv-single-th" style="left:${thPos}%"></div>
        </div>
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:var(--c-text-muted);text-transform:uppercase;margin-top:6px">${SEATS_TOTAL} ${t('seats','sandalye')} · ${majNeed} ${t('needed to govern','hükümet için gerekli')}</div>
      </div>`;
    }

    pane.innerHTML=`<div class="tab-pane-inner">
      <div class="hero fc-hero">
        <div class="hero-title">${T.tabs.live} — ${COUNTRY_NAME}</div>
        <div class="hero-date">${heroLine}</div>
      </div>

      ${majBanner}

      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.liveVs}</div></div>
        <div style="display:flex;gap:8px;align-items:center;padding:0 2px 4px;font-size:9px;font-weight:900;letter-spacing:1px;color:var(--c-text-muted)">
          <span style="width:44px"></span><span style="flex:1">${t('Official count','Resmi sayım')}</span>${(()=>{const ep=COUNTRIES[COUNTRY]&&COUNTRIES[COUNTRY].live&&COUNTRIES[COUNTRY].live.exitPoll;return ep?`<span style="flex:1">${t('Exit poll','Çıkış anketi')} (${ep.short})</span>`:`<span style="flex:1">${t('Exit poll (Valu)','Çıkış anketi (Valu)')}</span><span style="flex:1">${t('Exit poll (Novus)','Çıkış anketi (Novus)')}</span>`})()}<span style="flex:1">${t('Final forecast','Son tahmin')}</span><span style="width:60px;text-align:right">${T.swing}</span>
        </div>
        ${rows}
      </div>

      ${parlSvg?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.seatsLive}</div>
        <button class="shot-btn" id="lv-parl-shot-btn" style="margin-left:auto" title="Download parliament diagram as PNG">${CAM_ICON}</button>
        </div>
        <div class="parliament-box" id="live-parl-box">${parlSvg}</div>
        <div style="font-size:11px;color:var(--c-text-muted);margin-top:6px;text-align:center">${seatsTotal} seats · live allocation</div>
      </div>`:''}

      ${live&&live.valkretsar?`<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.liveMap}</div></div>
        <div class="map-toggle-row" style="justify-content:flex-end">
          <button class="map-toggle-btn parl-btn lv-map-btn active" data-lvmode="live">${T.tabs.live}</button>
          <button class="map-toggle-btn parl-btn lv-map-btn" data-lvmode="res">2022 ${T.result}</button>
          ${BLOCS.bloc1&&BLOCS.bloc2?`<button class="map-toggle-btn parl-btn lv-map-color-btn" data-lvcolor="bloc">${T.blocs}</button>`:''}
          <button class="shot-btn" id="lv-map-shot-btn" title="Download map as PNG">${CAM_ICON}</button>
        </div>
        <div class="parliament-box" id="live-map-box"></div>
      </div>`:''}

      ${(()=>{const calls=liveCalls(live);if(!calls||!calls.called.length)return '';const rows=calls.called.map(c=>`<div class="lv-call-row">
        <span class="lv-call-name">${c.name}</span>
        <span class="lv-call-dot" style="background:${c.color}"></span>
        <span class="lv-call-win" style="color:${c.color}">${partyCode(c.winner)}</span>
        <span class="lv-call-pct">${Math.round(c.countedPct)}%</span>
      </div>`).join('');return `<div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('CALLED DISTRICTS','SONUÇLANAN BÖLGELER')}</div>
        <span style="margin-left:auto;font-size:11px;font-weight:900;color:var(--c-text-muted)">${calls.calledCount}/${calls.total}</span>
      </div>
      <div class="lv-calls">${rows}</div>
      <div style="font-size:10px;color:var(--c-text-muted);margin-top:6px">${t('A district is called once ≥95% of its precincts report.','Bir bölge, sandıklarının ≥%95\'i sayıldığında sonuçlanmış sayılır.')}</div>
      </div>`;})()}
    </div>`;
    bindLiveMap(live);
    const shot=$('lv-map-shot-btn');
    if(shot) shot.addEventListener('click',()=>captureBoxMap('live-map-box', COUNTRY+'-live-map.png'));
    const lvParlShot=$('lv-parl-shot-btn');
    if(lvParlShot) lvParlShot.addEventListener('click',()=>captureBoxMap('live-parl-box', COUNTRY+'-live-parliament.png'));
    // auto-refresh every 30s while the LIVE tab is visible
    if(LIVE_INTERVAL) clearInterval(LIVE_INTERVAL);
    LIVE_INTERVAL=setInterval(()=>{
      const p=$('pane-live');
      if(!p||p.style.display==='none') return;
      LIVE_DATA=null;
      loadLive().then(nl=>{
        if(nl) renderLive(p);
      });
    },30000);
    });
    });
  });
}

function bindLiveMap(live){
  const box=$('live-map-box');
  if(!box) return;
  // build per-valkrets avg-shaped shares from live data and render
  const render=()=>{
    const mode=BMV_ROOT.querySelector('.lv-map-btn.active')?BMV_ROOT.querySelector('.lv-map-btn.active').dataset.lvmode:'live';
    renderLiveMapInto(box, live, mode);
  };
  BMV_ROOT.querySelectorAll('.lv-map-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      BMV_ROOT.querySelectorAll('.lv-map-btn').forEach(x=>x.classList.toggle('active',x===b));
      render();
    });
  });
  const colorBtn=BMV_ROOT.querySelector('.lv-map-color-btn');
  if(colorBtn){
    colorBtn.classList.toggle('active',MAP_COLOR==='bloc');
    colorBtn.addEventListener('click',()=>{
      const on=colorBtn.classList.toggle('active');
      MAP_COLOR=on?'bloc':'party';
      render();
    });
  }
  render();
}

// Called districts: a valkrets is "called" once >=95% of its districts report.
// Returns {called:[{name,winner,color,countedPct}], total, calledCount}.
function liveCalls(live){
  const conf=MAP_CONF();
  if(!live||!live.valkretsar||!conf) return null;
  const map=livePartyMap();
  const cList=(CONSTITUENCIES&&CONSTITUENCIES.constituencies)||[];
  const calls=[];
  live.valkretsar.forEach((v,i)=>{
    if(!v||!v.parties||!v.totalDistricts) return;
    const countedPct=v.counted/v.totalDistricts*100;
    if(countedPct<95) return;
    let best=null,bv=-1;
    v.parties.forEach(p=>{const k=map[p.code];if(k&&(p.pct||0)>bv){bv=p.pct;best=k}});
    if(!best) return;
    const name=cList[i]?cList[i].name:('Valkrets '+String(i+1).padStart(2,'0'));
    calls.push({name,winner:best,color:PARTY_META[best]?PARTY_META[best].color:'#888',countedPct});
  });
  calls.sort((a,b)=>a.name.localeCompare(b.name));
  return {called:calls,total:live.valkretsar.length,calledCount:calls.length};
}

// map for live valkrets data: reuses districtShares machinery but replaces base
// with live per-valkrets parties. We build a pseudo-avg so districtWinnerProjection works.
function renderLiveMapInto(box, live, mode){
  const conf=MAP_CONF();
  if(!conf) return;
  if(!conf.useConstituencies) return; // live map only for Sweden-style constituency maps
  if(mode!=='live'){
    // 2022 RESULT: use the normal machinery (constituencies.json results_2022)
    return renderMapInto(box, LAST_ELECTION.results, true);
  }
  const map=livePartyMap();
  // live valkretsar are ordered RD_01..RD_29; map index -> constituency id via
  // CONSTITUENCIES order (which matches Valmyndigheten's valkrets numbering)
  const cList=(CONSTITUENCIES&&CONSTITUENCIES.constituencies)||[];
  const vkShares={};
  (live&&live.valkretsar||[]).forEach((v,i)=>{
    if(!v||!v.parties) return;
    const cid=cList[i]?cList[i].id:String(i+1).padStart(2,'0');
    const s={};
    v.parties.forEach(p=>{
      const k=map[p.code];
      if(k){
        const past=LAST_ELECTION.results[k]!=null?LAST_ELECTION.results[k]:0;
        s[k]={past,now:p.pct!=null?p.pct:0};
      }
    });
    vkShares[cid]=s;
  });
  renderMapIntoWithShares(box, LAST_ELECTION.results, false, vkShares);
}

function renderMapIntoWithShares(box, avg, resultMode, vkShares){
  // Reuse renderMapInto but inject per-district shares for Sweden live data.
  // Implemented by temporarily swapping districtShares, calling renderMapInto, restoring.
  const orig=districtShares;
  districtShares=(nr,a,rm)=>{
    const id=String(nr);
    if(vkShares&&vkShares[id]) return vkShares[id];
    return orig(nr,a,rm);
  };
  return renderMapInto(box, avg, resultMode).finally(()=>{districtShares=orig});
}

/* ---------- history tab ---------- */
let HISTORY_DATA=null;
let HISTORY_LOADING=false;

async function loadHistory(){
  if(HISTORY_LOADING) return HISTORY_DATA;
  HISTORY_LOADING=true;
  try{
    const resp=await fetch(dataBase()+'data/'+COUNTRY+'/history.json');
    if(!resp.ok){HISTORY_LOADING=false;return null}
    HISTORY_DATA=await resp.json();
    HISTORY_LOADING=false;
    return HISTORY_DATA;
  }catch(e){HISTORY_LOADING=false;return null}
}

function renderHistory(pane){
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="hero fc-hero">
      <div class="hero-title">${T.tabs.history} — ${COUNTRY_NAME}</div>
      <div class="hero-date">${t('Party vote shares, seats and turnout over time · hover a point for details','Oy oranları, sandalyeler ve katılım yıllara göre · ayrıntılar için üzerine gelin')} · ${LAST_ELECTION.date.slice(0,4)}</div>
    </div>
  </div>`;
  loadHistory().then(hist=>{
    if(!hist||!hist.elections||!hist.elections.length){
      pane.innerHTML=`<div class="tab-pane-inner"><div class="card"><div class="card-head"><div class="bar"></div><div class="t">${T.history}</div></div><div class="method-text" style="padding:16px"><p>${t('No historical data available for','Bu ülke için geçmiş veri yok')} ${COUNTRY_NAME}.</p></div></div></div>`;
      return;
    }
    pane.innerHTML=`<div class="tab-pane-inner">
      <div class="hero fc-hero">
        <div class="hero-title">${T.tabs.history} — ${COUNTRY_NAME}</div>
        <div class="hero-date">${t('Party vote shares, seats and turnout over time · hover a point for details','Oy oranları, sandalyeler ve katılım yıllara göre · ayrıntılar için üzerine gelin')} · ${LAST_ELECTION.date.slice(0,4)}</div>
      </div>
      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('PARTY VOTE SHARE OVER TIME','PARTİ OY ORANLARI (YILLARA GÖRE)')}</div>
        <button class="shot-btn" id="hist-votes-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap" style="position:relative"><canvas id="hist-votes-canvas"></canvas></div></div>
      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('PARTY SEATS OVER TIME','PARTİ SANDALYELERİ (YILLARA GÖRE)')}</div>
        <button class="shot-btn" id="hist-seats-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap" style="position:relative"><canvas id="hist-seats-canvas"></canvas></div></div>
      <div class="card"><div class="card-head"><div class="bar"></div><div class="t">${t('TURNOUT OVER TIME','KATILIM (YILLARA GÖRE)')}</div>
        <button class="shot-btn" id="hist-turnout-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap" style="position:relative"><canvas id="hist-turnout-canvas"></canvas></div></div>
    </div>`;
    requestAnimationFrame(()=>{
      const vc=$('hist-votes-canvas');
      if(vc) drawHistoryLine(vc, hist, 'votes');
      const sc=$('hist-seats-canvas');
      if(sc) drawHistoryLine(sc, hist, 'seats');
      const tc=$('hist-turnout-canvas');
      if(tc) drawHistoryTurnout(tc, hist);
      const vs=$('hist-votes-shot-btn');
      if(vs) vs.addEventListener('click',()=>captureChartPng($('hist-votes-canvas'),COUNTRY+'-history-votes.png'));
      const ss=$('hist-seats-shot-btn');
      if(ss) ss.addEventListener('click',()=>captureChartPng($('hist-seats-canvas'),COUNTRY+'-history-seats.png'));
      const ts=$('hist-turnout-shot-btn');
      if(ts) ts.addEventListener('click',()=>captureChartPng($('hist-turnout-canvas'),COUNTRY+'-history-turnout.png'));
    });
  });

}

/* ---------- history line charts ---------- */
// draws multi-party line chart (votes % or seats) across election years
function drawHistoryLine(canvas, hist, mode){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth||600;
  const H=wrap.clientHeight||260;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  const elec=hist.elections||[];
  // elections with data for this mode
  const valid=elec.filter(e=>mode==='votes'?(e.results&&Object.keys(e.results).length):(e.seats&&Object.keys(e.seats).length));
  if(valid.length<2) return;
  const years=valid.map(e=>e.year);

  // parties to stack: present in >=2 elections, in PARTY_ORDER
  const count={};
  valid.forEach(e=>{
    const src=mode==='votes'?e.results:(e.seats||{});
    Object.keys(src).forEach(p=>{count[p]=(count[p]||0)+1});
  });
  const parties=Object.keys(count).filter(p=>count[p]>=2).sort((a,b)=>PARLIAMENT_ORDER.indexOf(a)-PARLIAMENT_ORDER.indexOf(b));
  // NYD (historical right-populist party, 1991/1994) sits between SD and KD in
  // the stack, matching SD's far-right position in the parliament diagram.
  const NYD='NYD';
  if(parties.includes('SD')&&parties.includes('KD')&&parties.includes(NYD)){
    parties.splice(parties.indexOf(NYD),1);
    parties.splice(parties.indexOf('SD'),0,NYD);
  }

  // per-year values (0 when missing) and the total cap (100 for %, seat total for seats)
  const valOf=(e,p)=>{const src=mode==='votes'?e.results:(e.seats||{});const v=src[p];return (v==null||isNaN(v))?0:v};
  const caps=valid.map(e=>{
    if(mode==='votes') return 100;
    const tot=Object.values(e.seats||{}).reduce((a,b)=>a+b,0);
    return tot||0;
  });
  const mat=parties.map(p=>valid.map((e,i)=>valOf(e,p)));

  const pad={top:16,right:50,bottom:30,left:44};
  const cw=W-pad.left-pad.right, ch=H-pad.top-pad.bottom;
  const yMax=Math.max(...caps, mode==='votes'?100:349);
  const yMin=0;
  const xFor=i=>pad.left+(i/(valid.length-1))*cw;
  const yFor=v=>pad.top+ch*(1-(v-yMin)/(yMax-yMin));

  // grid + y labels
  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  const yTicks=4;
  for(let i=0;i<=yTicks;i++){
    const y=pad.top+ch*(i/yTicks);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const v=yMax-(yMax-yMin)*(i/yTicks);
    ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='right';
    ctx.fillText(String(Math.round(v)),pad.left-4,y+3);
  }
  ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='center';
  const xStep=Math.max(1,Math.floor(years.length/8));
  for(let i=0;i<years.length;i+=xStep){
    ctx.fillText(String(years[i]),xFor(i),H-pad.bottom+12);
  }

  // stacked area: parties in order bottom-to-top, with an "others" remainder band on top
  // cumulative tops per band
  const bandVals=mat.map(col=>col.slice());
  const others=valid.map((e,i)=>Math.max(0,caps[i]-parties.reduce((a,p,k)=>a+mat[k][i],0)));
  bandVals.push(others);
  // cumulative top for each band (bands drawn bottom-up; last band is "others")
  const cumTop=bandVals.map((col,bi)=>{
    const out=col.slice();
    for(let j=0;j<bi;j++) out[j]+= (j===0?0:0); // placeholder; recompute below
    return out;
  });
  // recompute properly: cumTop[b][i] = sum of bandVals[0..b][i]
  for(let b=0;b<bandVals.length;b++){
    for(let i=0;i<valid.length;i++){
      cumTop[b][i]=(b===0?0:cumTop[b-1][i])+bandVals[b][i];
    }
  }

  // draw bands bottom-up (party 0 first ... others last on top)
  const colors=[...parties.map(p=>PARTY_META[p]?PARTY_META[p].color:'#888'), '#C9CDD4'];
  for(let b=0;b<bandVals.length;b++){
    if(bandVals[b].every(v=>v===0)) continue;
    ctx.beginPath();
    for(let i=0;i<valid.length;i++){
      const x=xFor(i), y=yFor(cumTop[b][i]);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    for(let i=valid.length-1;i>=0;i--){
      const x=xFor(i), yb=yFor(b===0?0:cumTop[b-1][i]);
      ctx.lineTo(x,yb);
    }
    ctx.closePath();
    ctx.fillStyle=colors[b];
    ctx.fill();
  }

  // separators between bands (crisp edges)
  ctx.lineWidth=1;
  for(let b=0;b<bandVals.length-1;b++){
    if(bandVals[b].every(v=>v===0)) continue;
    ctx.strokeStyle='rgba(255,255,255,0.5)';
    ctx.beginPath();
    for(let i=0;i<valid.length;i++){
      const x=xFor(i), y=yFor(cumTop[b][i]);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
  }

  // right-edge labels per party band (NYD is deliberately unlabeled)
  const last=valid.length-1;
  parties.forEach((p,k)=>{
    if(p===NYD) return;
    const top=cumTop[k][last], bot=(k===0?0:cumTop[k-1][last]);
    const midY=yFor((top+bot)/2);
    const col=PARTY_META[p]?PARTY_META[p].color:'#888';
    ctx.fillStyle=col;ctx.font='800 9px '+(getComputedStyle(document.body).fontFamily||'sans-serif');
    ctx.textAlign='left';
    ctx.fillText(partyCode(p),xFor(last)+5,midY+3);
  });

  // ---- hover tooltip ----
  let tip=wrap.querySelector('.hist-tip');
  if(!tip){
    tip=document.createElement('div');
    tip.className='map-tip hist-tip';
    wrap.appendChild(tip);
  }
  wrap.onmousemove=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left;
    const idx=Math.round((mx-pad.left)/cw*(valid.length-1));
    if(idx<0||idx>=valid.length){tip.style.display='none';return}
    const ev2=valid[idx];
    const src=mode==='votes'?ev2.results:(ev2.seats||{});
    const sortedP=parties.slice().sort((a,b)=>(src[b]||0)-(src[a]||0)).filter(p=>src[p]!=null&&!isNaN(src[p])&&(src[p]||0)>0);
    if(!sortedP.length){tip.style.display='none';return}
    const rows=sortedP.map(p=>{
      const col=PARTY_META[p]?PARTY_META[p].color:'#888';
      const val=mode==='seats'?String(Math.round(src[p])):pct(src[p]);
      return `<div class="map-tip-row"><span class="map-tip-code" style="color:${col}">${partyCode(p)}</span><span class="map-tip-now">${val}</span></div>`;
    }).join('');
    tip.innerHTML=`<div class="map-tip-head"><div class="map-tip-title">${ev2.year} ${T.election}</div></div>${rows}`;
    const tipW=tip.offsetWidth||170, tipH=tip.offsetHeight||120;
    let left=Math.max(4,Math.min(mx+14,r.width-tipW-4));
    let top=Math.max(4,Math.min(e.clientY-r.top+14,r.height-tipH-4));
    tip.style.left=left+'px';
    tip.style.top=top+'px';
    tip.style.display='block';
  };
  wrap.onmouseleave=()=>{tip.style.display='none'};
}

// turnout line chart
function drawHistoryTurnout(canvas, hist){
  const ctx=canvas.getContext('2d');
  const wrap=canvas.parentElement;
  const W=wrap.clientWidth||600;
  const H=wrap.clientHeight||200;
  canvas.width=W*2; canvas.height=H*2;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);

  const elec=(hist.elections||[]).filter(e=>e.turnout!=null);
  if(elec.length<2) return;
  const years=elec.map(e=>e.year);
  const pad={top:16,right:16,bottom:30,left:44};
  const cw=W-pad.left-pad.right, ch=H-pad.top-pad.bottom;
  const yMin=40,yMax=100;

  ctx.strokeStyle='#E2E8F0';ctx.lineWidth=0.5;
  for(let i=0;i<=4;i++){
    const y=pad.top+ch*(i/4);
    ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(W-pad.right,y);ctx.stroke();
    const v=yMax-(yMax-yMin)*(i/4);
    ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='right';
    ctx.fillText(v+'%',pad.left-4,y+3);
  }
  ctx.fillStyle='#64748B';ctx.font='9px Source Code Pro,monospace';ctx.textAlign='center';
  const xStep=Math.max(1,Math.floor(years.length/8));
  for(let i=0;i<years.length;i+=xStep){
    const x=pad.left+(i/(years.length-1))*cw;
    ctx.fillText(String(years[i]),x,H-pad.bottom+12);
  }
  const xFor=i=>pad.left+(i/(years.length-1))*cw;
  const yFor=v=>pad.top+ch*(1-(v-yMin)/(yMax-yMin));

  ctx.beginPath();
  ctx.strokeStyle='#111827';ctx.lineWidth=2;
  elec.forEach((e,i)=>{
    const x=xFor(i),y=yFor(e.turnout);
    if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  });
  ctx.stroke();
  elec.forEach((e,i)=>{
    ctx.beginPath();ctx.arc(xFor(i),yFor(e.turnout),2,0,Math.PI*2);ctx.fillStyle='#111827';ctx.fill();
  });

  // ---- hover tooltip ----
  let tip=wrap.querySelector('.hist-tip');
  if(!tip){
    tip=document.createElement('div');
    tip.className='map-tip hist-tip';
    wrap.appendChild(tip);
  }
  wrap.onmousemove=e=>{
    const r=canvas.getBoundingClientRect();
    const mx=e.clientX-r.left;
    const idx=Math.round((mx-pad.left)/cw*(elec.length-1));
    if(idx<0||idx>=elec.length){tip.style.display='none';return}
    const ev2=elec[idx];
    tip.innerHTML=`<div class="map-tip-head"><div class="map-tip-title">${ev2.year} ${T.election}</div>
      <div class="map-tip-row"><span class="map-tip-code">${t('Turnout','Katılım')}</span><span class="map-tip-now">${pct(ev2.turnout)}</span></div></div>`;
    const tipW=tip.offsetWidth||170, tipH=tip.offsetHeight||70;
    let left=Math.max(4,Math.min(mx+14,r.width-tipW-4));
    let top=Math.max(4,Math.min(e.clientY-r.top+14,r.height-tipH-4));
    tip.style.left=left+'px';
    tip.style.top=top+'px';
    tip.style.display='block';
  };
  wrap.onmouseleave=()=>{tip.style.display='none'};
}

function mean(arr){
  return arr.reduce((a,b)=>a+b,0)/arr.length;
}

function percentile(arr,p){
  const s=arr.slice().sort((a,b)=>a-b);
  const idx=Math.min(s.length-1,Math.floor(p/100*s.length));
  return s[idx];
}

/* ---------- methodology tab ---------- */
function renderMethodology(pane){
  const maeElections=[...new Set(Object.values(POLLSTER_MAE).flatMap(d=>Object.keys(d).filter(k=>k!=='overall')))].sort();
  const defaultMAE=SEAT_BASED?'1.25 seats':'1.30';
  const unit=SEAT_BASED?'seats':'%';
  pane.innerHTML=`<div class="tab-pane-inner">
    <div class="card">
      <div class="card-head"><div class="bar"></div><div class="t">${T.methodology}</div></div>
      <div class="method-text">
        <h3>${t('Data Sources','Veri Kaynakları')}</h3>
        <p>Polls are collected from the following sources:</p>
        <ul>
          <li><strong>Wikipedia</strong> — aggregated from publicly available polling tables. Primary source.</li>
          ${COUNTRY==='sweden'?'<li><strong>SwedishPolls</strong> (CC0) — GitHub repository maintained by Magnus&nbsp;M瑞典Polls with standardized Swedish polling data since 1944.</li>':''}
        </ul>
        <p>Duplicate polls (same pollster + same date) are deduplicated, with Wikipedia data taking priority.</p>

        <h3>${T.pollAverage}</h3>
        <p>The national poll average uses a <strong>triple-weighted mean</strong> combining sample size, pollster accuracy and recency:</p>
        <span class="formula">weight_i = n_i × (1 / MAE_pollster) × 0.5^(age_days / ${RECENCY_HALF_LIFE})</span>
        <span class="formula">avg(party) = Σ(vote_i × weight_i) / Σ(weight_i)</span>
        <p>where <em>n_i</em> is the sample size, <em>MAE_pollster</em> is the mean absolute error of the pollster across the last ${maeElections.length} elections (${maeElections.join(', ')}) and <em>age_days</em> is the age of the poll in days. Polls halve in weight every ${RECENCY_HALF_LIFE} days, so recent polls dominate. Pollsters with only 1-2 elections of data are assigned a default MAE of ${defaultMAE}.</p>
        ${BIAS_KEY?`<p><strong>Bias correction.</strong> Each pollster's systematic error measured in the ${BIAS_KEY} backtest (their average signed deviation from the actual result) is subtracted from their polls before weighting, removing house effects.</p>`:''}
        ${PRIOR_ALPHA>0?`<p><strong>Prior anchor.</strong> The average is blended ${(PRIOR_ALPHA*100).toFixed(0)}% toward the ${LAST_ELECTION.date.slice(0,4)} result, so a thin or volatile poll set cannot drift arbitrarily far from the known electorate.</p>`:''}
        ${TREND_CONF?`<p><strong>Trend extrapolation.</strong> A recency-weighted linear fit over the last ${TREND_CONF.windowDays} days is projected forward to the election date (${TREND_CONF.electionDate}) and blended ${(TREND_CONF.blend*100).toFixed(0)}% into the average, capped at ${TREND_CONF.maxDaily} point/day of movement.</p>`:''}

        <h3>${t('Pollster Accuracy (MAE)','Anketçi Doğruluğu (MAE)')}</h3>
        <p>Each pollster's accuracy is measured by averaging their error across the last 5 polls before each of the most recent elections. The MAE is the mean absolute deviation across the main parties in ${unit}:</p>
        <table class="polls-table" style="margin:8px 0"><thead><tr><th>Pollster</th><th>Elections</th><th>MAE</th></tr></thead><tbody>
        ${Object.entries(POLLSTER_MAE).sort((a,b)=>a[1].overall-b[1].overall).map(([ps,d])=>{
          const eCount=Object.keys(d).filter(k=>k!=='overall').length;
          return `<tr><td>${ps}</td><td class="num">${eCount}</td><td class="num" style="font-weight:700">${d.overall.toFixed(2)} ${unit}</td></tr>`;
        }).join('')}
        </tbody></table>

        ${MAP_ONLY?`<h3>${t('Two-round system','İki turlu seçim')}</h3>
        <p>${COUNTRY_NAME} elects its president in a two-round system: a candidate wins outright with a <strong>majority of valid votes</strong> on ${TREND_CONF?TREND_CONF.electionDate:'election day'}; otherwise the top two candidates face a runoff two weeks later. The map shows the <strong>${SEATS_TOTAL} ${unitLabel()}</strong> colored by projected winner from the poll average.</p>`:`
        <h3>${t('Seat Projection','Sandalye Tahmini')}</h3>
        <p>${COUNTRY_NAME} elects a base parliament of <strong>${SEATS_TOTAL} seats</strong>${HAS_CONSTITUENCIES?' — 310 constituency seats across 29 constituencies plus 39 leveling seats':''} via ${methodSentence()}, with a <strong>${THRESHOLD}% electoral threshold</strong>.${OVERHANG?` When a party wins more direct mandates than its proportional share, leveling seats (Überhang-/Ausgleichsmandate) grow the parliament until proportions hold — capped at <strong>${OVERHANG.cap} seats</strong>: the most recent Landtag sat ${PARTY_ORDER.reduce((a,p)=>a+(LAST_ELECTION.seats?LAST_ELECTION.seats[p]||0:0),0)} seats.`:''}</p>
        <p>The parliament diagram shows all ${seatsDesc()} seats allocated nationally from the poll average. It follows the classic Wikimedia parliament-diagram layout: rows of the arch hold every party as a wedge, with the total seat count in the center. Chambers with a supplied floor plan use it; all others are laid out automatically with the canonical ParliamentArch geometry, so any seat count renders without a template.</p>`}

        ${HIDE_BLOCS?'':`<h3>${t('Bloc Totals','Blok Toplamları')}</h3>
        <p>The <strong>${BLOCS.bloc1.name}</strong> bloc includes ${BLOCS.bloc1.parties.join(', ')}. The <strong>${BLOCS.bloc2.name}</strong> bloc includes ${BLOCS.bloc2.parties.join(', ')}.</p>`}

        <h3>${t('Last Updated','Son Güncelleme')}</h3>
        <p>Data is scraped automatically from Wikipedia${COUNTRY==='sweden'?' and SwedishPolls':''}. The site is updated daily via GitHub Actions.</p>
      </div>
    </div></div>`;
}

/* ---------- main render ---------- */
function renderPollsTab(){
  const pane=$('pane-polls');
  const daysEl=$('filter-days');
  const daysVal=daysEl?(parseInt(daysEl.value)||30):30;
  const pollsterEl=$('filter-pollster');
  const pollsterVal=pollsterEl?pollsterEl.value:'';

  let filtered=recentPolls(POLLS, daysVal);
  if(pollsterVal) filtered=filtered.filter(p=>p.pollster===pollsterVal);
  filtered.sort((a,b)=>new Date(b.date)-new Date(a.date));

  const avg=computeAverages(filtered);
  const rawAvg=computeAverages(filtered, true);

  let html=`<div class="tab-pane-inner">`;
  // Top row: side card beside hero + poll trend
  html+=`<div class="page-top">
    <div class="card side-card"><div id="sidebar-content"></div></div>
    <div class="page-top-main">
      ${renderHero(avg, filtered)}
      <div class="card" style="height:100%"><div class="card-head"><div class="bar"></div><div class="t">${T.trend}</div>
        <button class="shot-btn" id="trend-shot-btn" style="margin-left:auto" title="Download chart as PNG">${CAM_ICON}</button></div>
        <div class="chart-wrap"><canvas id="trend-canvas"></canvas></div>
        ${TREND_CONF?`<div style="font-size:10px;color:var(--c-text-muted);padding:6px 12px 8px">◆ ${t('dashed diamond = value extrapolated to election day','kesikli elmas = seçim gününe yansıtılan değer')} (${TREND_CONF.electionDate})</div>`:''}
    </div>
    </div>
  </div>`;

  // Seat projection / district map (full width)
  html+=renderParliament(avg);

  // National poll average + blocs
  html+=renderPartyBars(rawAvg);

  // Brazil: state-depth cards under the map (state winners + regions)
  html+=renderStateDepth(avg);

  html+=renderConstituencyTable(avg);
  html+=renderPollsTable(filtered);
  html+=`</div>`;
  pane.innerHTML=html;

  renderSidebar(String(daysVal), pollsterVal);

  // Draw chart after DOM update
  requestAnimationFrame(()=>{
    const canvas=$('trend-canvas');
    if(canvas) renderTrendChart(canvas, filtered);
    fitSideCard();
  });
  bindParlToggles(avg);
}

// Match the side card height to the hero+trend column so it spans the same
// vertical range (starts at the poll-average hero, ends at the poll trend).
function fitSideCard(){
  const main=BMV_ROOT.querySelector('.page-top-main');
  const sc=BMV_ROOT.querySelector('.side-card');
  if(main&&sc) sc.style.height=main.offsetHeight+'px';
}

/* ---------- public API ---------- */
window._600={
  applyFilters(){
    const active=BMV_ROOT.querySelector('.tab-trigger[data-active="true"]');
    const tabId=active?active.dataset.tab:'polls';
    if(tabId==='polls'){renderPollsTab();return}
    const pane=$('pane-'+tabId);
    if(!pane) return;
    if(tabId==='forecast'){renderForecast(pane)}
    else if(tabId==='live'){renderLive(pane)}
    else if(tabId==='history'){renderHistory(pane)}
    else if(tabId==='methodology'){renderMethodology(pane)}
  },
  setCountry(id){
    if(!COUNTRIES[id]||id===COUNTRY) return;
    setCountry(id);
    for(const k in FC_CACHE) delete FC_CACHE[k];
    for(const k in RUNOFF_CACHE) delete RUNOFF_CACHE[k];
PARL_MODE='proj';
    PARL_VIEW='seats';
    FC_MODE='proj';
    MAP_COLOR='party';
    if(LIVE_INTERVAL){clearInterval(LIVE_INTERVAL);LIVE_INTERVAL=null}
    BMV_ROOT.querySelectorAll('.tab-trigger').forEach(b=>{b.dataset.active='false';delete b.dataset.loaded});
    BMV_ROOT.querySelectorAll('.tab-pane').forEach(p=>{delete p.dataset.loaded});
    const pollsBtn=BMV_ROOT.querySelector('[data-tab="polls"]');
    if(pollsBtn) pollsBtn.dataset.active='true';
    applyTheme(); updateSocialMeta();
    renderCountryNav();
    loadData().then(()=>loadConstituencies()).then(()=>{
      renderPollsTab();
    });
  }
};

/* ---------- boot ---------- */
// ARIA wiring: tablist/tab/tabpanel roles + aria-selected/aria-controls.
function wireAria(){
  const nav=BMV_ROOT.querySelector('#segnav');
  if(!nav) return;
  nav.setAttribute('role','tablist');
  nav.setAttribute('aria-label','Sections');
  BMV_ROOT.querySelectorAll('.tab-trigger').forEach(b=>{
    const tabId=b.dataset.tab;
    b.setAttribute('role','tab');
    b.setAttribute('aria-selected', b.dataset.active==='true'?'true':'false');
    b.setAttribute('aria-controls','pane-'+tabId);
    b.setAttribute('id','tab-'+tabId);
    const pane=BMV_ROOT.querySelector('#pane-'+tabId);
    if(pane){pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby','tab-'+tabId);pane.setAttribute('aria-hidden',pane.classList.contains('active')?'false':'true');}
  });
  // dynamic panes (map boxes etc.) re-render — keep aria-state consistent
  const obs=new MutationObserver(()=>{
    BMV_ROOT.querySelectorAll('.tab-trigger').forEach(b=>{
      b.setAttribute('aria-selected', b.dataset.active==='true'?'true':'false');
    });
  });
  obs.observe(nav,{subtree:true,attributes:true,attributeFilter:['data-active']});
}

// Per-country theme: Brazil gets a green/yellow identity (flag accent).
// Social share meta: og:/twitter: cards reflect the current country + election.
function updateSocialMeta(){
  // remove any previously-created social metas (idempotent re-runs)
  document.querySelectorAll('meta[data-social]').forEach(m=>m.remove());
  const title=COUNTRY_NAME+' — '+t('Election Polls & Forecast','Seçim Anketleri ve Tahmini')+' | AltıCiftSıfır';
  const desc=t('Live seat projection, poll averages, forecast simulations and district maps for','Canlı sandalye tahmini, anket ortalamaları, tahmin simülasyonları ve bölge haritaları:')+' '+COUNTRY_NAME+(META.election_date?(' · '+t('next election','sonraki seçim')+' '+META.election_date):'');
  const url=location.origin+location.pathname;
  const set=(sel,attr,val)=>{
    const prop=sel.match(/\[([a-z]+)="([^"]+)"\]/);
    let el=document.querySelector(sel);
    if(!el){
      el=document.createElement('meta');
      if(prop) el.setAttribute(prop[1],prop[2]);
      el.setAttribute('data-social','1');
      document.head.appendChild(el);
    }
    el.setAttribute(attr,val);
  };
  set('meta[property="og:title"]','content',title);
  set('meta[property="og:description"]','content',desc);
  set('meta[property="og:url"]','content',url);
  set('meta[property="og:type"]','content','website');
  set('meta[property="og:site_name"]','content','AltıCiftSıfır — 600');
  set('meta[name="twitter:card"]','content','summary');
  set('meta[name="twitter:title"]','content',title);
  set('meta[name="twitter:description"]','content',desc);
}
function applyTheme(){
  const isBrazil=COUNTRY==='brazil';
  document.body.classList.toggle('theme-brazil', isBrazil);
  const nav=BMV_ROOT.querySelector('#segnav');
  if(nav) nav.style.borderTopColor=isBrazil?'var(--br-accent)':'';
  const pane=BMV_ROOT.querySelector('#pane-polls');
  if(pane&&isBrazil){
    // restyle live accent-driven bits via a class on the app shell
  }
}
loadData().then(()=>loadConstituencies()).then(()=>{
  wireAria();
  applyTheme(); updateSocialMeta();
  renderCountryNav();
  renderPollsTab();
});
window.addEventListener('resize',()=>{fitSideCard();});

})();

var __api=window._600;
window.__600_BMV__=window.__600_BMV__||[];
if(__api&&__api.applyFilters)window.__600_BMV__.push(__api);
window._600={applyFilters:function(){(window.__600_BMV__||[]).forEach(function(a){try{a.applyFilters()}catch(e){}});}};
})();
