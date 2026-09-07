// ===== AltıCiftSıfır — Config =====

const COUNTRIES = {

  sweden: {
    name: 'Sweden',
    seats: 349,
    threshold: 4.0,
    method: 'sainte_lague',       // modified Sainte-Laguë (divisor 1.2)
    seatBased: false,
    constituencies: true,
    recencyHalfLifeDays: 7,       // respond faster to the latest polls
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
      // 2021 direct-mandate winners per Wahlkreis (source: de.wikipedia.org Liste der Landtagswahlkreise);
      // SPD won 34 of 36; WK 13 went AfD (Enrico Schult), WK 24 CDU (Harry Glawe)
      winners2021: { 13: 'afd', 24: 'cdu' },
      winners2021_default: 'spd',
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

setCountry('sweden');