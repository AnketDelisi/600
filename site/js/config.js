// ===== AltıCiftSıfır — Config =====

// Cache-buster appended to party-logo <img> URLs so logo updates reach users
// without a hard refresh (script tags already carry ?v=, images did not).
const LOGO_CACHE = 'b22';

const COUNTRIES = {

  sweden: {
    name: 'Sweden',
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
      bloc1: { name: 'Coalition', short: 'GOV', parties: ['likud', 'rzp', 'otzma', 'shas', 'utj'], color: '#00A0DF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['together', 'yb', 'dems', 'yashar', 'blue_white', 'raam', 'joint_list', 'reservists', 'amcha'], color: '#E30613' },
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
      reservists: 'img/il/Reservists.svg', amcha: 'img/il/Amcha.svg',
    },
  },
saxony_anhalt: {
    name: 'Saxony-Anhalt',
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
    maeKey: 'MV2021',             // weight pollsters by their 2021 MV accuracy
    biasKey: 'MV2021',            // signed-bias correction from the MV2021 backtest
    priorAlpha: 0.05,             // last-election Dirichlet prior (5% pull toward 2021)
    trend: {                      // linear-trend extrapolation to the 2026-09-20 election
      electionDate: '2026-09-20',
      blend: 0.5,
      maxDaily: 0.3,
      windowDays: 120,
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
    maeKey: 'B2023',              // weight pollsters by their 2023 Berlin (repeat) accuracy
    biasKey: 'B2023',             // signed-bias correction from the B2023 backtest
    priorAlpha: 0.05,             // last-election Dirichlet prior (5% pull toward 2023)
    trend: {                      // linear-trend extrapolation to the 2026-09-20 election
      electionDate: '2026-09-20',
      blend: 0.5,
      maxDaily: 0.3,
      windowDays: 120,
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
      spn:  { code: 'SPN',  name: 'Srbija protiv nasilja',               name_en: 'Serbia Against Violence',         color: '#7BAFD4', pastOnly: true },
    },
    order: ['sns', 'sl', 'sps', 'pes', 'nps', 'nada', 'misn', 'srs'],
    parlOrder: ['sl', 'pes', 'nps', 'sps', 'sns', 'nada', 'misn', 'srs'],
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
let RECENCY_HALF_LIFE = 14;
let MAE_KEY = 'overall';
let BIAS_KEY = null;          // signed-bias correction key (e.g. 'MV2021'): pollster bias from backtest
let POLLSTER_BIAS = {};       // pollster -> {party: signed bias} where bias = poll − actual
let PRIOR_ALPHA = 0;          // last-election Dirichlet prior weight (0 = off)
let TREND_CONF = null;        // {electionDate, blend, maxDaily, windowDays, minPolls} linear-trend extrapolation

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
  PRIOR_ALPHA = (c.priorAlpha!==undefined) ? c.priorAlpha : 0;
  TREND_CONF = c.trend || null;
}

// Sub-page / archive wrapper: a country can be pinned via window.__600_COUNTRY__
const BOOT_COUNTRY=(typeof window!=='undefined'&&window.__600_COUNTRY__&&COUNTRIES[window.__600_COUNTRY__])?window.__600_COUNTRY__:'sweden';

setCountry(BOOT_COUNTRY);