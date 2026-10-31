// ===== AltıCiftSıfır — Config =====

// Cache-buster appended to party-logo <img> URLs so logo updates reach users
// without a hard refresh (script tags already carry ?v=, images did not).
const LOGO_CACHE = '20261005c279';

const COUNTRIES = {

  sweden: {
    name: 'Sweden',
    name_tr: 'İsveç',
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
      S:  { name: 'Socialdemokraterna',       name_en: 'Social Democrats',  color: '#ED1B34', ideology: "Social democracy, Pro-Europeanism"},
      SD: { name: 'Sverigedemokraterna',       name_en: 'Sweden Democrats',  color: '#FEDF09', ideology: "National conservatism, Right-wing populism, Euroscepticism"},
      M:  { name: 'Moderaterna',              name_en: 'Moderates',         color: '#019CDB', ideology: "Liberal conservatism"},
      V:  { name: 'Vänsterpartiet',           name_en: 'Left Party',        color: '#B00000', ideology: "Socialism, Feminism, Eco-socialism"},
      C:  { name: 'Centerpartiet',            name_en: 'Centre Party',      color: '#114838', ideology: "Liberalism (Swedish), Agrarianism (Nordic)"},
      KD: { name: 'Kristdemokraterna',         name_en: 'Christian Democrats', color: '#231977', ideology: "Christian democracy, Conservatism (Swedish), Social conservatism"},
      MP: { name: 'Miljöpartiet',             name_en: 'Green Party',       color: '#2B912C', ideology: "Green politics, Ecofeminism"},
      L:  { name: 'Liberalerna',              name_en: 'Liberals',          color: '#006AB3', ideology: "Social liberalism, Liberalism"},
      NYD:{ name: 'Nya Demokratin',           name_en: 'New Democracy',     color: '#FFCD00', ideology: "Right-wing populism, National liberalism, National conservatism"}, // historical right-populist party (1991/1994); same yellow as SD
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
    name_tr: 'İsrail',
    seats: 120,
    threshold: 3.25,
    method: 'dhondt',             // D'Hondt (divisors 1,2,3,...)
    seatBased: true,             // polls report seat projections
    constituencies: false,        // single national district
    parties: {
      likud:     { code: 'LK', name: 'Likud',                    name_en: 'Likud',            color: '#1F5AA5', ideology: "Conservatism (Israeli), National conservatism, Economic liberalism"},
      together:  { code: 'TG', name: 'Together',                 name_en: 'Together',         color: '#2A2A78', ideology: "Liberal Zionism, Social liberalism"},
      rzp:       { code: 'RZP-Zehut', name: 'Religious Zionist Party',  name_en: 'Religious Zionism', color: '#4F9298', ideology: "Religious Zionism, National conservatism"},
      otzma:     { code: 'OTZ', name: 'Otzma Yehudit',            name_en: 'Otzma Yehudit',    color: '#FF4500', ideology: "Kahanism, Ultranationalism, Anti-Arab racism"},
      blue_white:{ code: 'BW', name: 'Blue and White',           name_en: 'Blue and White',   color: '#0DAAFF', ideology: "Liberalism (Israeli), Liberal Zionism"},
      shas:      { code: 'SHAS', name: 'Shas',                     name_en: 'Shas',             color: '#000000', ideology: "Populism, Social conservatism, Religious conservatism"},
      reservists:{ code: 'RSV-NEP', name: 'The Reservists',           name_en: 'The Reservists',   color: '#68692C', ideology: "Zionism, Centrism"},
      amcha:     { code: 'AMC', name: 'Amcha Yisrael',            name_en: 'Amcha Yisrael',    color: '#8F36BF', ideology: "Zionism, National conservatism"},
      utj:       { code: 'UTJ', name: 'United Torah Judaism',     name_en: 'United Torah Judaism', color: '#003366', ideology: "Haredi Judaism, Religious conservatism"},
      yb:        { code: 'YB', name: 'Yisrael Beiteinu',         name_en: 'Yisrael Beiteinu', color: '#23C2EB', ideology: "National conservatism, Revisionist Zionism"},
      raam:      { code: 'RAAM', name: "Ra'am",                    name_en: "Ra'am",            color: '#15793D', ideology: "Islamism, Arab minority interests"},
      joint_list:{ code: 'JL', name: 'Joint List',               name_en: 'Joint List',       color: '#01B2AC', ideology: "Arab nationalism, Secularism, Socialism"},
      dems:      { code: 'DEM', name: 'The Democrats',            name_en: 'The Democrats',    color: '#2A38D7', ideology: "Social democracy, Liberal Zionism"},
      yashar:    { code: 'YASH', name: 'Yashar',                   name_en: 'Yashar',           color: '#62B9F2', ideology: "Liberal Zionism"},
    },
    order: ['likud', 'together', 'rzp', 'otzma', 'blue_white', 'shas', 'reservists', 'amcha', 'utj', 'yb', 'raam', 'joint_list', 'dems', 'yashar'],
    parlOrder: ['joint_list', 'raam', 'dems', 'together', 'yashar', 'blue_white', 'yb', 'reservists', 'amcha', 'utj', 'likud', 'otzma', 'shas', 'rzp'],
    blocs: {
      bloc1: { name: 'Coalition', short: 'GOV', parties: ['likud', 'rzp', 'otzma', 'shas', 'utj', 'amcha'], color: '#00A0DF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['together', 'yb', 'dems', 'yashar', 'blue_white'], color: '#E30613' },
      bloc3: { name: 'Arab parties', short: 'ARAB', parties: ['raam', 'joint_list'], color: '#2E7D32' },
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
    map: {
      svg: 'img/israel.svg',
      selector: 'id',
      maxHeight: 600,               // ~1:3 aspect: cap the rendered height
      districts: {
              "north": "north",
              "haifa": "haifa",
              "jerusalem": "jerusalem",
              "central": "central",
              "tel_aviv": "tel_aviv",
              "south": "south"
      },
      names: {
              "north": "Northern District",
              "haifa": "Haifa",
              "jerusalem": "Jerusalem",
              "central": "Central District",
              "tel_aviv": "Tel Aviv",
              "south": "Southern District"
      },
      // 2022 vote shares per district (Central Elections Committee, Knesset 25)
      gebiete: {
              "north": {
                      "likud": 17.55,
                      "together": 11.36,
                      "rzp": 3.52,
                      "otzma": 3.0,
                      "blue_white": 6.67,
                      "shas": 4.97,
                      "utj": 1.76,
                      "yb": 4.07,
                      "raam": 11.98,
                      "joint_list": 15.78,
                      "dems": 3.26,
                      "yashar": 0.0,
                      "reservists": 0.0,
                      "amcha": 0.0
              },
              "haifa": {
                      "likud": 23.71,
                      "together": 22.27,
                      "rzp": 3.76,
                      "otzma": 3.2,
                      "blue_white": 9.5,
                      "shas": 5.49,
                      "utj": 3.05,
                      "yb": 6.22,
                      "raam": 3.42,
                      "joint_list": 4.78,
                      "dems": 4.17,
                      "yashar": 0.0,
                      "reservists": 0.0,
                      "amcha": 0.0
              },
              "jerusalem": {
                      "likud": 19.64,
                      "together": 7.08,
                      "rzp": 9.54,
                      "otzma": 8.13,
                      "blue_white": 5.19,
                      "shas": 16.82,
                      "utj": 22.27,
                      "yb": 1.77,
                      "raam": 0.45,
                      "joint_list": 0.83,
                      "dems": 2.19,
                      "yashar": 0.0,
                      "reservists": 0.0,
                      "amcha": 0.0
              },
              "central": {
                      "likud": 26.61,
                      "together": 22.45,
                      "rzp": 6.36,
                      "otzma": 5.41,
                      "blue_white": 11.06,
                      "shas": 6.55,
                      "utj": 1.87,
                      "yb": 4.13,
                      "raam": 2.23,
                      "joint_list": 2.2,
                      "dems": 3.54,
                      "yashar": 0.0,
                      "reservists": 0.0,
                      "amcha": 0.0
              },
              "tel_aviv": {
                      "likud": 23.64,
                      "together": 20.76,
                      "rzp": 4.1,
                      "otzma": 3.49,
                      "blue_white": 9.61,
                      "shas": 12.25,
                      "utj": 12.87,
                      "yb": 4.14,
                      "raam": 0.06,
                      "joint_list": 0.18,
                      "dems": 3.79,
                      "yashar": 0.0,
                      "reservists": 0.0,
                      "amcha": 0.0
              },
              "south": {
                      "likud": 31.47,
                      "together": 12.22,
                      "rzp": 6.71,
                      "otzma": 5.71,
                      "blue_white": 7.38,
                      "shas": 11.48,
                      "utj": 5.37,
                      "yb": 6.71,
                      "raam": 5.13,
                      "joint_list": 0.92,
                      "dems": 2.07,
                      "yashar": 0.0,
                      "reservists": 0.0,
                      "amcha": 0.0
              }
      },
      // national baseline for the uniform-swing projection (= 2022 result)
      national2021: {
              "likud": 24.38,
              "together": 16.79,
              "rzp": 5.88,
              "otzma": 5.01,
              "blue_white": 8.67,
              "shas": 9.14,
              "utj": 6.75,
              "yb": 4.4,
              "raam": 3.76,
              "joint_list": 3.86,
              "dems": 3.17,
              "yashar": 0.0,
              "reservists": 0.0,
              "amcha": 0.0
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
    hidden: true,                 // hidden from the country nav
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
      // exit polls run for this state on election night (ARD + ZDF)
      exitPoll: [
        { short: 'FGW', name: 'Forschungsgruppe Wahlen' },
        { short: 'ID', name: 'Infratest dimap' },
      ],
    },
    maeKey: 'MV2021',             // weight pollsters by their 2021 MV accuracy
    biasKey: 'MV2021',            // signed-bias correction from the MV2021 backtest
    priorAlpha: 0.05,             // last-election Dirichlet prior (5% pull toward 2021)
    pollsterBias: {               // bias = poll − actual (MV2021 backtest, last-5-polls avg)
      "Infratest dimap": { spd: -6.6, afd: -0.3, cdu: 4.3, linke: 0.9, gruene: 1.5, fdp: 0.8 },
      INSA:             { spd: -7.6, afd: 1.3,  cdu: 3.3, linke: 2.5, gruene: 1.5, fdp: 0.4 },
      "Forschungsgruppe Wahlen": { spd: -1.1, afd: -0.2, cdu: 1.2, linke: 1.1, gruene: 0.2, fdp: -0.05 },
    },
    parties: {
      spd:    { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany',  color: '#E3000F', ideology: "Social democracy"},
      afd:    { code: 'AfD',   name: 'Alternative für Deutschland',           name_en: 'Alternative for Germany',              color: '#00A2DE', ideology: "Right-wing populism, National conservatism, Euroscepticism"},
      cdu:    { code: 'CDU',   name: 'Christlich Demokratische Union',        name_en: 'Christian Democratic Union',          color: '#151518', ideology: "Conservatism (German), Christian democracy"},
      linke:  { code: 'LINKE', name: 'Die Linke',                             name_en: 'The Left',                             color: '#BE3075', ideology: "Democratic socialism"},
      gruene: { code: 'GRÜNE', name: 'Bündnis 90/Die Grünen',                 name_en: 'Alliance 90/The Greens',               color: '#409A3C', ideology: "Green politics, Social liberalism"},
      fdp:    { code: 'FDP',   name: 'Freie Demokratische Partei',            name_en: 'Free Democratic Party',                color: '#FFED00', ideology: "Liberalism, Economic liberalism"},
      bsw:    { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht',             name_en: 'Sahra Wagenknecht Alliance',            color: '#792351', ideology: "Left-conservatism, Left-wing populism"},
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
    map: {},
    pollsterMAE: {
      "Forschungsgruppe Wahlen": { BT2025: 0.73, BT2021: 0.90, MV2021: 0.78, overall: 1.35 },
      "Infratest dimap":         { BT2025: 1.72, BT2021: 0.82, MV2021: 2.60, overall: 1.99 },
      INSA:                      { BT2025: 0.71, BT2021: 0.97, MV2021: 2.98, overall: 1.70 },
      Forsa:                     { BT2025: 1.00, BT2021: 1.20, B2023: 0.90,  overall: 1.05 },
    },
  },

  berlin: {
    name: 'Berlin',
    hidden: true,                 // hidden from the country nav
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
      // exit polls run for this state on election night (ZDF + ARD)
      exitPoll: [
        { short: 'FGW', name: 'Forschungsgruppe Wahlen' },
        { short: 'ID', name: 'Infratest dimap' },
      ],
    },
    maeKey: 'B2023',              // weight pollsters by their 2023 Berlin (repeat) accuracy
    biasKey: 'B2023',             // signed-bias correction from the B2023 backtest
    biasShrink: 0.5,              // B2023 bias is large (INSA cdu +6.6pp) & single-election; halve so CDU isn't inflated ~8pp
    priorAlpha: 0.05,             // last-election Dirichlet prior (5% pull toward 2023)
    pollsterBias: {               // bias = poll − actual (B2023 backtest, last-5-polls avg)
      "Infratest dimap": { cdu: -3.4, spd: 0.6,  gruene: 0.8, linke: -0.8, afd: 1.3 },
      INSA:             { cdu: -6.6, spd: 1.8,  gruene: 1.4, linke: -0.2, afd: 0.1 },
      "Forschungsgruppe Wahlen": { cdu: -3.7, spd: 2.6, gruene: -0.9, linke: -1.2, afd: 0.9 },
    },
    parties: {
      cdu:    { code: 'CDU',   name: 'Christlich Demokratische Union',        name_en: 'Christian Democratic Union',          color: '#151518', ideology: "Conservatism (German), Christian democracy"},
      spd:    { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany',  color: '#E3000F', ideology: "Social democracy"},
      gruene: { code: 'GRÜNE', name: 'Bündnis 90/Die Grünen',                 name_en: 'Alliance 90/The Greens',               color: '#409A3C', ideology: "Green politics, Social liberalism"},
      linke:  { code: 'LINKE', name: 'Die Linke',                             name_en: 'The Left',                             color: '#BE3075', ideology: "Democratic socialism"},
      afd:    { code: 'AfD',   name: 'Alternative für Deutschland',           name_en: 'Alternative for Germany',              color: '#00A2DE', ideology: "Right-wing populism, National conservatism, Euroscepticism"},
      fdp:    { code: 'FDP',   name: 'Freie Demokratische Partei',            name_en: 'Free Democratic Party',                color: '#FFED00', ideology: "Liberalism, Economic liberalism"},
      bsw:    { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht',             name_en: 'Sahra Wagenknecht Alliance',            color: '#792351', ideology: "Left-conservatism, Left-wing populism"},
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
    map: {},
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
    name_tr: 'Sırbistan',
    seats: 250,
    threshold: 3.0,
    method: 'dhondt',             // D'Hondt (divisors 1,2,3,...), single national district
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // single national district; map shows okrug-level winners
    recencyHalfLifeDays: 7,
    // trend extrapolation to the 2026-10-25 election; 30-day fit window
    // because polling is sparse (3 polls in the last 30 days); momentum is a
    // nudge, not the driver (anchored mean, 0.15pp/day cap, 10-day damping)
    parties: {
      sns:  { code: 'AV-US', name: 'Aleksandar Vučić – United Serbia',  name_en: 'Aleksandar Vučić – United Serbia', color: '#242970', ideology: "Populism"},
      sps:  { code: 'SPS',  name: 'Socijalistička partija Srbije',       name_en: 'Socialist Party of Serbia',      color: '#EB1B23', ideology: "Social democracy, Populism"},
      pes:  { code: 'PES',  name: 'Platforma za evropsku Srbiju',        name_en: 'Platform for a European Serbia', color: '#C9A227', ideology: "Pro-Europeanism"},
      nada: { code: 'NADA', name: 'Srpska koalicija NADA',               name_en: 'National Democratic Alternative',color: '#616264', ideology: "National conservatism, Euroscepticism, Monarchism"},
      misn: { code: 'MISN', name: 'Mi – snaga naroda',                   name_en: 'We – Power of the People',       color: '#1B3160', ideology: "Right-wing populism, National conservatism"},
      sl:   { code: 'SL',   name: 'Studentska lista',                    name_en: 'Student List',                   color: '#A81A32', ideology: "Reformism" },
      // national-minority lists (exempt from the 3% threshold, art. 81);
      // they have no polling, so they hold their 2023 national shares
      vmsz: { code: 'VMSZ', name: 'Savez vojvođanskih Mađara',           name_en: 'Alliance of Vojvodina Hungarians', color: '#00732B', ideology: "Hungarian minority interests, Regionalism"},
      spp:  { code: 'SPP',  name: 'Stranka pravde i pomirenja',          name_en: 'Justice and Reconciliation Party', color: '#16321B', ideology: "Bosniak minority interests, Conservatism"},
      sda:  { code: 'SDA',  name: 'Stranka demokratske akcije Sandžaka', name_en: 'Party of Democratic Action of Sandžak', color: '#069443', ideology: "Bosniak minority interests, Bosniak nationalism"},
      rs:   { code: 'RS',   name: 'Ruska stranka',                       name_en: 'Russian Party',                  color: '#0D3B66', ideology: "Russian minority politics, Serbian nationalism"},
      sdp:  { code: 'SDP',  name: 'Socijaldemokratska partija',          name_en: 'Social Democratic Party',        color: '#FF004F', ideology: "Social democracy"},
      kshlp: { code: 'KShLP', name: 'Koalicija Albanaca Preševske doline', name_en: 'Albanian Coalition of Preševo Valley', color: '#0081CC', ideology: "Regionalism, Albanian minority interests"},
      // SPN (Serbia Against Violence, 2023) — dissolved coalition. Shown in
      // past-result sections only; `pastOnly` keeps it out of the forecast.
      spn:  { code: 'SPN',  name: 'Srbija protiv nasilja',               name_en: 'Serbia Against Violence',         color: '#F22C27', pastOnly: true, ideology: "Pro-Europeanism, Big tent, Anti-corruption"},
    },
    order: ['sns', 'sl', 'sps', 'pes', 'nada', 'misn', 'vmsz', 'spp', 'sda', 'rs', 'sdp', 'kshlp', 'spn'],
    parlOrder: ['sl', 'pes', 'sps', 'sns', 'nada', 'misn', 'vmsz', 'spp', 'sda', 'rs', 'sdp', 'kshlp', 'spn'],
    // minority lists (Serbia art. 81): exempt from the 3% threshold
    minorityParties: ['vmsz', 'spp', 'sda', 'rs', 'kshlp'],
    blocs: {
      bloc1: { name: 'Government camp', short: 'GOV', parties: ['sns', 'sps', 'vmsz', 'rs'], color: '#1B4381' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['sl', 'pes', 'nada', 'misn', 'spp', 'sda', 'sdp', 'kshlp'], color: '#A6192E' },
    },
    logos: {
      sns: 'img/serbia/SNS.svg', sps: 'img/serbia/SPS.svg',
      pes: 'img/serbia/PES.svg', nada: 'img/serbia/NADA.svg', misn: 'img/serbia/MISN.svg',
      sl: 'img/serbia/SL.svg', vmsz: 'img/serbia/VMSZ.svg', spp: 'img/serbia/SPP.svg',
      sda: 'img/serbia/SDA.svg', rs: 'img/serbia/RS.svg', sdp: 'img/serbia/SDP.svg',
      kshlp: 'img/serbia/KSHLP.svg', spn: 'img/serbia/SPN.svg',
    },
    // Pollster MAE (mean absolute error, %-points) from final party-level polls before each election,
    // averaged over SNS / SPS / main opposition list / smaller opposition list / NADA.
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
      results: { sns: 48.07, sps: 6.73, pes: 0, nada: 5.16, misn: 4.82, sl: 0, spn: 24.32, vmsz: 1.74, spp: 0.78, sda: 0.59, rs: 0.31, sdp: 0, kshlp: 0.36 },
      seats:   { sns: 129, sps: 18, pes: 0, nada: 13, misn: 13, sl: 0, spn: 65, vmsz: 6, spp: 2, sda: 2, rs: 1, sdp: 0, kshlp: 1 },
    },
    map: {},
    map2: {},
  },

  latvia: {
    name: 'Latvia',
    name_tr: 'Letonya',
    hidden: true,                 // election held 2026-10-03; hidden from the nav
    seats: 100,
    threshold: 5.0,
    method: 'sainte_lague',       // modified Sainte-Laguë (first divisor 1.4; site uses 1.2)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // 5 multi-member constituencies; we model nationally
    recencyHalfLifeDays: 7,
    // trend extrapolation to the 2026-10-03 election; the fit window keeps it
    // inert when the recent polls are too sparse (0 polls in the last 14 days)
    parties: {
      as:  { code: 'AS',   name: 'Apvienotais saraksts',           name_en: 'United List',                color: '#FFAC01', ideology: "Regionalism, Green conservatism"},
      sv:  { code: 'SV',   name: 'Suverēnā vara',                  name_en: 'Sovereign Power',            color: '#6767AB', ideology: "Christian right, Russian minority politics"},
      lpv: { code: 'LPV',  name: 'Latvija pirmajā vietā',          name_en: 'Latvia First',               color: '#A8343C', ideology: "National conservatism, Right-wing populism, Christian nationalism"},
      pro: { code: 'P',    name: 'Progresīvie',                    name_en: 'The Progressives',           color: '#E64632', ideology: "Social democracy, Green politics, Pro-Europeanism"},
      na:  { code: 'NA',   name: 'Nacionālā Apvienība',            name_en: 'National Alliance',          color: '#932330', ideology: "National conservatism, Economic liberalism, Soft Euroscepticism"},
      jv:  { code: 'JV',   name: 'Jaunā Vienotība',                name_en: 'New Unity',                  color: '#6AB647', ideology: "Liberalism (Latvian), Liberal conservatism, Civic nationalism"},
      zzs: { code: 'ZZS',  name: 'Zaļo un zemnieku savienība',     name_en: 'Greens and Farmers',        color: '#02723A', ideology: "Agrarianism, Green conservatism, Economic nationalism"},
      la:  { code: 'LA',   name: 'Latvijas attīstībai',            name_en: 'For Latvia\'s Development', color: '#FFDD00', ideology: "Ethnic nationalism, National conservatism, Antiglobalism"},
      mmn: { code: 'MMN',  name: 'Mēs mainām noteikumus',          name_en: 'We Change the Rules',       color: '#19191E', ideology: "Anti-immigration"},
      st:  { code: 'S!',   name: 'Stabilitātei!',                  name_en: 'For Stability!',             color: '#F08418', ideology: "Populism, Russian minority politics, Euroscepticism"},
      sc:  { code: 'SC',   name: 'Saskaņa',                        name_en: 'Harmony',                    color: '#D32F2F', ideology: "Social democracy, Russian minority politics"},
      asl: { code: 'ASL',  name: 'Apvienība Jaunlatvieši',         name_en: 'New Latvians',               color: '#960018', ideology: "Conservatism, Right-wing populism, Protectionism"},
      jkp: { code: 'JKP',  name: 'Jaunā konservatīvā partija',     name_en: 'New Conservative Party',     color: '#182956', ideology: "Liberal conservatism"},
      lks: { code: 'LKS',  name: 'Latvijas Krievu savienība',      name_en: 'Latvian Russian Union',      color: '#3560A9', ideology: "Russian minority politics, Russian nationalism"},
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
    map: {},
    map2: {},
    pollsterMAE: {
      SKDS:             { overall: 1.50 },
      'Latvijas Fakti': { overall: 1.50 },
      Gemius:           { overall: 2.00 },
    },
  },

  brazil: {
    name: 'Brazil',
    name_tr: 'Brezilya',
    // actual first-round result (4 Oct 2026, official): neither
    // candidate passed 50%, confirming the Lula-Flavio runoff;
    // the final poll average had Lula ~1 point ahead, the result
    // was Flavio +1.8 - shown in the hero for honesty
    firstRoundResult: { flavio: 47.03, lula: 45.16, cury: 2.89,
                        caiado: 2.18, renan: 2.24, zema: 0.27 },
    // Two-round presidential election (4 Oct 2026, runoff 25 Oct). Presidential
    // layout: hideBlocs drops the bloc/majority cards, mapOnly replaces the
    // parliament diagram with the 27-UF map. The seat engine is repurposed for
    // the federative units ("seats" = UFs a candidate leads in).
    runoffOnly: true,
    seats: 27,
    threshold: 5.0,
    method: 'hare_niemeyer',
    seatBased: false,             // polls report first-round vote intentions (%)
    constituencies: false,        // map = 27 UFs colored by projected state winner
    recencyHalfLifeDays: 7,
    hideBlocs: true,
    mapOnly: true,
    // candidate colors = the nominating party's color (en.wikipedia
    // Module:Political party): PT, PL, Avante, PSD, Missão, Novo, PRTB, UP,
    // PCB, PCO
    parties: {
      lula:    { code: 'Lula',    name: 'Luiz Inácio Lula da Silva',        name_en: 'Luiz Inácio Lula da Silva',  color: '#E20E28', ideology: "Social democracy, Left-wing populism"},
      flavio:  { code: 'Flávio',  name: 'Flávio Bolsonaro',                 name_en: 'Flávio Bolsonaro',           color: '#015AAA', ideology: "National conservatism, Right-wing populism"},
      cury:    { code: 'Cury',    name: 'Augusto Cury',                     name_en: 'Augusto Cury',               color: '#088F8F', ideology: "Centrism, Liberalism"},
      caiado:  { code: 'Caiado',  name: 'Ronaldo Caiado',                   name_en: 'Ronaldo Caiado',             color: '#FFA500', ideology: "Economic liberalism, Big tent"},
      renan:   { code: 'Santos',  name: 'Renan Santos',                     name_en: 'Renan Santos',               color: '#FDBF35', ideology: "Conservative liberalism, Social conservatism, National liberalism"},
      zema:    { code: 'Zema',    name: 'Romeu Zema',                       name_en: 'Romeu Zema',                 color: '#F3701B', ideology: "Conservative liberalism, Libertarianism"},
      margal:  { code: 'Marçal',  name: 'Pablo Marçal',                     name_en: 'Pablo Marçal',               color: '#2CB53F', ideology: "Brazilian nationalism, Conservatism, Social conservatism"},
      samara:  { code: 'Samara',  name: 'Samara Martins',                   name_en: 'Samara Martins',             color: '#000000', ideology: "Socialism"},
      edmilson:{ code: 'Edmilson', name: 'Edmilson Costa',                  name_en: 'Edmilson Costa',             color: '#FF0000', ideology: "Communism"},
      rui:     { code: 'Rui',     name: 'Rui Costa Pimenta',                name_en: 'Rui Costa Pimenta',          color: '#BB0000', ideology: "Communism, Marxism, Trotskyism"},
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
      runoff2022: {
        "ac": {
          "lula": 29.7,
          "flavio": 70.3
        },
        "al": {
          "lula": 58.68,
          "flavio": 41.32
        },
        "ap": {
          "lula": 48.64,
          "flavio": 51.36
        },
        "am": {
          "lula": 51.1,
          "flavio": 48.9
        },
        "ba": {
          "lula": 72.12,
          "flavio": 27.88
        },
        "ce": {
          "lula": 69.97,
          "flavio": 30.03
        },
        "es": {
          "lula": 41.96,
          "flavio": 58.04
        },
        "df": {
          "lula": 41.19,
          "flavio": 58.81
        },
        "go": {
          "lula": 41.29,
          "flavio": 58.71
        },
        "ma": {
          "lula": 71.14,
          "flavio": 28.86
        },
        "mt": {
          "lula": 34.92,
          "flavio": 65.08
        },
        "ms": {
          "lula": 40.51,
          "flavio": 59.49
        },
        "mg": {
          "lula": 50.2,
          "flavio": 49.8
        },
        "pa": {
          "lula": 54.75,
          "flavio": 45.25
        },
        "pb": {
          "lula": 66.62,
          "flavio": 33.38
        },
        "pr": {
          "lula": 37.6,
          "flavio": 62.4
        },
        "pe": {
          "lula": 66.93,
          "flavio": 33.07
        },
        "pi": {
          "lula": 76.86,
          "flavio": 23.14
        },
        "rj": {
          "lula": 43.47,
          "flavio": 56.53
        },
        "rn": {
          "lula": 65.1,
          "flavio": 34.9
        },
        "rs": {
          "lula": 43.65,
          "flavio": 56.35
        },
        "ro": {
          "lula": 29.34,
          "flavio": 70.66
        },
        "rr": {
          "lula": 23.92,
          "flavio": 76.08
        },
        "sc": {
          "lula": 30.73,
          "flavio": 69.27
        },
        "sp": {
          "lula": 44.76,
          "flavio": 55.24
        },
        "se": {
          "lula": 67.21,
          "flavio": 32.79
        },
        "to": {
          "lula": 51.36,
          "flavio": 48.64
        }
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
      // 2026 first-round results by federative unit (official),
    // two-way normalised against Flavio; the runoff map anchors
    // here and swings with the national head-to-head average
    // 2026 first-round results by federative unit (official),
    // two-way normalised against Flavio; the runoff map anchors
    // here and swings with the national head-to-head average
    runoff2026: {
          "ac": {
                "lula": 30.8,
                "flavio": 69.2
          },
          "al": {
                "lula": 57.5,
                "flavio": 42.5
          },
          "ap": {
                "lula": 50.0,
                "flavio": 50.0
          },
          "am": {
                "lula": 51.7,
                "flavio": 48.3
          },
          "ba": {
                "lula": 69.9,
                "flavio": 30.1
          },
          "ce": {
                "lula": 66.9,
                "flavio": 33.1
          },
          "es": {
                "lula": 40.8,
                "flavio": 59.2
          },
          "df": {
                "lula": 42.6,
                "flavio": 57.4
          },
          "go": {
                "lula": 36.7,
                "flavio": 63.3
          },
          "ma": {
                "lula": 67.4,
                "flavio": 32.6
          },
          "mt": {
                "lula": 30.9,
                "flavio": 69.1
          },
          "ms": {
                "lula": 37.2,
                "flavio": 62.8
          },
          "mg": {
                "lula": 47.3,
                "flavio": 52.7
          },
          "pa": {
                "lula": 52.9,
                "flavio": 47.1
          },
          "pb": {
                "lula": 65.0,
                "flavio": 35.0
          },
          "pr": {
                "lula": 34.2,
                "flavio": 65.8
          },
          "pe": {
                "lula": 67.2,
                "flavio": 32.8
          },
          "pi": {
                "lula": 74.7,
                "flavio": 25.3
          },
          "rj": {
                "lula": 42.6,
                "flavio": 57.4
          },
          "rn": {
                "lula": 63.2,
                "flavio": 36.8
          },
          "rs": {
                "lula": 39.1,
                "flavio": 60.9
          },
          "ro": {
                "lula": 27.7,
                "flavio": 72.3
          },
          "rr": {
                "lula": 24.3,
                "flavio": 75.7
          },
          "sc": {
                "lula": 27.3,
                "flavio": 72.7
          },
          "sp": {
                "lula": 42.4,
                "flavio": 57.6
          },
          "se": {
                "lula": 67.2,
                "flavio": 32.8
          },
          "to": {
                "lula": 46.3,
                "flavio": 53.7
          }
    },
    nationalRunoff: {"lula": 49.0, "flavio": 51.0},   // 2026 round-1 two-way (45.2 / 47.0): the runoff map anchor
    // runoff2026 (per-state round-1 results) is filled by
    // scraper/build_brazil_round1.py once Wikipedia completes its
    // table; until then the map falls back to the 2022 baselines
    },
    // Approximate house-quality weights (no official backtest available yet)
    pollsterMAE: {
      Datafolha:   { overall: 1.50 },
      Quaest:      { overall: 1.80 },
      Ideia:       { overall: 2.00 },
      Ipec:        { overall: 1.70 },
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
      'Paraná Pesquisas': { overall: 2.20 },
      Veritá:      { overall: 2.60 },
    },
    logos: {
      lula: 'img/br/Lula.svg', flavio: 'img/br/Bolsonaro.svg', caiado: 'img/br/Caiado.svg',
      cury: 'img/br/Cury.svg', renan: 'img/br/Santos.svg', zema: 'img/br/Zema.svg',
      samara: 'img/br/Samara.svg', edmilson: 'img/br/Costa.svg',
    },
  },

  austria: {
    name: 'Austria',
    name_tr: 'Avusturya',
    seats: 183,
    threshold: 4.0,
    method: 'dhondt',
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // PR at three levels (national/state/regional); we model nationally
    recencyHalfLifeDays: 14,
    parties: {
      fpoe:  { code: 'FPÖ',   name: 'Freedom Party of Austria',             name_en: 'Freedom Party of Austria',             color: '#0056A2', ideology: "National conservatism, Right-wing populism"},
      oevp:  { code: 'ÖVP',   name: "Austrian People's Party",              name_en: "Austrian People's Party",              color: '#63C3D0', ideology: "Christian democracy, Conservatism"},
      spoe:  { code: 'SPÖ',   name: 'Social Democratic Party of Austria',    name_en: 'Social Democratic Party of Austria',    color: '#E42712', ideology: "Social democracy"},
      neos:  { code: 'NEOS',  name: 'NEOS – The New Austria',                name_en: 'NEOS – The New Austria',                color: '#CB1667', ideology: "Liberalism"},
      gruene:{ code: 'GRÜNE', name: 'The Greens – The Green Alternative',    name_en: 'The Greens – The Green Alternative',    color: '#87B529', ideology: "Green politics, Social liberalism"},
      kpoe:  { code: 'KPÖ',   name: 'Communist Party of Austria',            name_en: 'Communist Party of Austria',            color: '#AA0000', ideology: "Communism, Socialism, Marxism"},
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
    map: {},
    map2: {},
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
    name_tr: 'Çekya',
    seats: 200,
    threshold: 5.0,
    method: 'imperiali_hb',     // Chamber of Deputies: two-tier system (Act 189/2021) — first scrutiny LR-Imperiali per region, second scrutiny LR-Hagenbach-Bischoff nationally
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // PR across 14 regions; map colors per-okres winners (2025 list-level shares)
    recencyHalfLifeDays: 14,
    parties: {
      ano: { code: 'ANO', name: 'ANO 2011', name_en: 'ANO', color: '#261060', ideology: "Right-wing populism"},
      ods: { code: 'ODS', name: 'Civic Democratic Party', name_en: 'Civic Democratic Party', color: '#034EA2', ideology: "Conservatism"},
      kducsl: { code: 'KDU-ČSL', name: 'Christian and Democratic Union', name_en: 'Christian and Democratic Union', color: '#FFCB03', ideology: "Christian democracy, Social conservatism"},
      top09: { code: 'TOP 09', name: 'TOP 09', name_en: 'TOP 09', color: '#993366', ideology: "Liberal conservatism, Liberalism, Christian democracy"},
      stan: { code: 'STAN', name: 'Mayors and Independents', name_en: 'Mayors and Independents', color: '#CD0F69', ideology: "Localism, Liberalism, Pro-Europeanism"},
      pirati: { code: 'Piráti', name: 'Czech Pirate Party', name_en: 'Czech Pirate Party', color: '#000000', ideology: "Pirate politics, Liberalism, Social liberalism"},
      zeleni: { code: 'Zelení', name: 'Green Party', name_en: 'Green Party', color: '#00AD43', ideology: "Green politics, Progressivism, Eco-socialism"},
      spd: { code: 'SPD', name: 'Freedom and Direct Democracy', name_en: 'Freedom and Direct Democracy', color: '#6696AE', ideology: "Nationalism, Neo-fascism, Right-wing populism"},
      svobodni: { code: 'Svobodní', name: 'Free', name_en: 'Free', color: '#009682', ideology: "Libertarianism, Right-wing populism, Euroscepticism"},
      pro: { code: 'PRO', name: 'Law, Respect, Expertise', name_en: 'Law, Respect, Expertise', color: '#009FBF', ideology: "National conservatism, Right-wing populism"},
      trikolora: { code: 'Trikolóra', name: 'Tricolour Civic Movement', name_en: 'Tricolour Civic Movement', color: '#2738CD', ideology: "Conservatism"},
      auto: { code: 'AUTO', name: 'Motorists for Themselves', name_en: 'Motorists for Themselves', color: '#009EE3', ideology: "Right-wing populism, National conservatism, Anti-environmentalism"},
      kscm: { code: 'KSČM', name: 'Communist Party of Bohemia and Moravia', name_en: 'Communist Party of Bohemia and Moravia', color: '#C10506', ideology: "Communism, Anti-capitalism, Euroscepticism"},
      socdem: { code: 'SOCDEM', name: 'Social Democracy', name_en: 'Social Democracy', color: '#FF5F61', ideology: "Social democracy, Left-wing populism"},
      prisaha: { code: 'Přísaha', name: 'Oath', name_en: 'Oath', color: '#0033FF', ideology: "Populism, Anti-corruption"},
      nc: { code: 'NC', name: 'Our Czechia', name_en: 'Our Czechia', color: '#FD3307', ideology: "Liberal conservatism, Pro-Europeanism"},
      spolu: { code: 'SPOLU', name: 'SPOLU (ODS, KDU-ČSL, TOP 09)', name_en: 'Spolu (Czech political alliance)', color: '#00EA29', pastOnly: true, ideology: "Liberal conservatism, Christian democracy"},
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
    map: {},
      map2: {
      "svg": "img/Czechia_regions.svg",
      "selector": "id",
      "districts": {
            "praha": "praha",
            "stredocesky": "stredocesky",
            "jihocesky": "jihocesky",
            "plzensky": "plzensky",
            "karlovarsky": "karlovarsky",
            "ustecky": "ustecky",
            "liberecky": "liberecky",
            "kralovehradecky": "kralovehradecky",
            "pardubicky": "pardubicky",
            "vysocina": "vysocina",
            "jihomoravsky": "jihomoravsky",
            "olomoucky": "olomoucky",
            "zlinsky": "zlinsky",
            "moravskoslezsky": "moravskoslezsky"
      },
      "gebiete": {
            "praha": {
                  "ano": 19.83,
                  "spolu": 33.97,
                  "stan": 13.4,
                  "pirati": 16.89,
                  "spd": 5.23,
                  "auto": 5.15,
                  "prisaha": 0.71
            },
            "stredocesky": {
                  "ano": 31.12,
                  "spolu": 24.32,
                  "stan": 13.72,
                  "pirati": 9.09,
                  "spd": 7.06,
                  "auto": 7.76,
                  "prisaha": 1.05
            },
            "jihocesky": {
                  "ano": 34.87,
                  "spolu": 23.61,
                  "stan": 10.76,
                  "pirati": 7.59,
                  "spd": 7.93,
                  "auto": 7.04,
                  "prisaha": 1.16
            },
            "plzensky": {
                  "ano": 37.31,
                  "spolu": 20.99,
                  "stan": 10.62,
                  "pirati": 7.78,
                  "spd": 8.88,
                  "auto": 7.16,
                  "prisaha": 1.01
            },
            "karlovarsky": {
                  "ano": 42.49,
                  "spolu": 15.4,
                  "stan": 10.94,
                  "pirati": 6.49,
                  "spd": 10.21,
                  "auto": 7.28,
                  "prisaha": 1.04
            },
            "ustecky": {
                  "ano": 44.85,
                  "spolu": 15.4,
                  "stan": 9.61,
                  "pirati": 6.96,
                  "spd": 9.13,
                  "auto": 6.79,
                  "prisaha": 1.15
            },
            "liberecky": {
                  "ano": 34.4,
                  "spolu": 18.06,
                  "stan": 16.34,
                  "pirati": 8.2,
                  "spd": 8.65,
                  "auto": 7.35,
                  "prisaha": 0.97
            },
            "kralovehradecky": {
                  "ano": 33.63,
                  "spolu": 23.6,
                  "stan": 12.21,
                  "pirati": 8.05,
                  "spd": 7.75,
                  "auto": 7.61,
                  "prisaha": 1.08
            },
            "pardubicky": {
                  "ano": 34.61,
                  "spolu": 23.62,
                  "stan": 11.05,
                  "pirati": 7.71,
                  "spd": 7.68,
                  "auto": 7.76,
                  "prisaha": 1.16
            },
            "vysocina": {
                  "ano": 36.11,
                  "spolu": 23.28,
                  "stan": 11.8,
                  "pirati": 7.07,
                  "spd": 7.32,
                  "auto": 6.8,
                  "prisaha": 1.2
            },
            "jihomoravsky": {
                  "ano": 32.29,
                  "spolu": 27.24,
                  "stan": 9.63,
                  "pirati": 9.45,
                  "spd": 7.54,
                  "auto": 6.13,
                  "prisaha": 1.34
            },
            "olomoucky": {
                  "ano": 38.72,
                  "spolu": 20.14,
                  "stan": 9.36,
                  "pirati": 7.33,
                  "spd": 9.43,
                  "auto": 6.64,
                  "prisaha": 1.18
            },
            "zlinsky": {
                  "ano": 34.87,
                  "spolu": 24.24,
                  "stan": 10.2,
                  "pirati": 7.54,
                  "spd": 8.74,
                  "auto": 6.71,
                  "prisaha": 1.11
            },
            "moravskoslezsky": {
                  "ano": 43.42,
                  "spolu": 17.98,
                  "stan": 8.37,
                  "pirati": 7.18,
                  "spd": 8.09,
                  "auto": 6.42,
                  "prisaha": 0.96
            }
      },
      "names": {
            "praha": "Praha",
            "stredocesky": "Středočeský kraj",
            "jihocesky": "Jihočeský kraj",
            "plzensky": "Plzeňský kraj",
            "karlovarsky": "Karlovarský kraj",
            "ustecky": "Ústecký kraj",
            "liberecky": "Liberecký kraj",
            "kralovehradecky": "Královéhradecký kraj",
            "pardubicky": "Pardubický kraj",
            "vysocina": "Vysočina",
            "jihomoravsky": "Jihomoravský kraj",
            "olomoucky": "Olomoucký kraj",
            "zlinsky": "Zlínský kraj",
            "moravskoslezsky": "Moravskoslezský kraj"
      },
      // seat circles: the 14 kraje elect their seats in the first scrutiny
      // (LR-Imperiali, quota votes/(seats+2)); seats come from conf.regions
      "seatDots": { "method": "imperiali" },
      "label": "kraje (14)"
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
      zeleni: 'img/cz/ZELENI.svg', spolu: 'img/cz/SPOLU.svg',
    },
  },

  // ===== Poland (Sejm 2027) =====
  poland: {
    name: 'Poland',
    name_tr: 'Polonya',
    seats: 460,
    threshold: 5.0,
    method: 'dhondt',            // Sejm: PR via D'Hondt in 41 multi-member okręgi (per-okręg allocation, seatDistricts)
    seatBased: false,            // polls report vote shares (%)
    constituencies: false,       // PR across 41 okręgów; map colors per-okręg winners (2023 list-level shares)
    recencyHalfLifeDays: 14,
    parties: {
      pis: { code: 'PiS', name: 'Law and Justice', name_en: 'Law and Justice', color: '#263778', ideology: "National conservatism, Paternalistic conservatism, Right-wing populism"},
      ko: { code: 'KO', name: 'Civic Coalition', name_en: 'Civic Coalition', color: '#F68F2D', ideology: "Liberal conservatism, Christian democracy, Pro-Europeanism"},
      pl2050: { code: 'PL2050', name: 'Poland 2050', name_en: 'Poland 2050', color: '#FAC300', ideology: "Liberal conservatism, Christian democracy, Social conservatism"},
      psl: { code: 'PSL', name: 'Polish People\'s Party', name_en: 'Polish People\'s Party', color: '#1BB100', ideology: "Conservatism, Christian democracy, Social conservatism"},
      lewica: { code: 'Lewica', name: 'The Left', name_en: 'The Left', color: '#AC145A', ideology: "Social democracy, Social liberalism, Pro-Europeanism"},
      razem: { code: 'Razem', name: 'Together (Left)', name_en: 'Together (Polish political party)', color: '#870F57', ideology: "Democratic socialism, Left-wing populism"},
      kwin: { code: 'KWiN', name: 'Confederation', name_en: 'Confederation', color: '#122746', ideology: "Polish nationalism, Sanationism, Anti-communism"},
      kkp: { code: 'KKP', name: 'Confederation of the Polish Crown', name_en: 'Confederation of the Polish Crown', color: '#A37919', ideology: "Ultranationalism, Ultraconservatism, Hard Euroscepticism"},
      r: { code: 'R+', name: 'Development Plus', name_en: 'Development Plus', color: '#87CEEB', ideology: "Christian democracy, Conservatism, Pro-Europeanism"},
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
      results: {
              "pis": 35.38,
              "ko": 30.7,
              "pl2050": 7.92,
              "psl": 6.49,
              "lewica": 6.51,
              "razem": 2.1,
              "kwin": 6.27,
              "kkp": 0.9,
              "r": 0.0
      },
      seats:   { pis: 194, ko: 157, pl2050: 33, psl: 32, lewica: 19, razem: 7, kwin: 16, kkp: 2, r: 0 },
    },
    map: {},
      map2: {
      "svg": "img/poland_voivodeships.svg",
      "selector": "id",
      "districts": {
            "dolnoslaskie": "dolnoslaskie",
            "kujawsko_pomorskie": "kujawsko_pomorskie",
            "lubelskie": "lubelskie",
            "lubuskie": "lubuskie",
            "lodzkie": "lodzkie",
            "malopolskie": "malopolskie",
            "mazowieckie": "mazowieckie",
            "opolskie": "opolskie",
            "podkarpackie": "podkarpackie",
            "podlaskie": "podlaskie",
            "pomorskie": "pomorskie",
            "slaskie": "slaskie",
            "swietokrzyskie": "swietokrzyskie",
            "warminsko_mazurskie": "warminsko_mazurskie",
            "wielkopolskie": "wielkopolskie",
            "zachodniopomorskie": "zachodniopomorskie"
      },
      "gebiete": {
            "dolnoslaskie": {
                  "pis": 30.56,
                  "ko": 36.0,
                  "pl2050": 6.86,
                  "psl": 5.62,
                  "lewica": 7.63,
                  "razem": 2.46,
                  "kwin": 5.76,
                  "kkp": 0.82,
                  "r": 0.0
            },
            "kujawsko_pomorskie": {
                  "pis": 32.27,
                  "ko": 32.26,
                  "pl2050": 8.45,
                  "psl": 6.92,
                  "lewica": 8.0,
                  "razem": 2.58,
                  "kwin": 5.59,
                  "kkp": 0.8,
                  "r": 0.0
            },
            "lubelskie": {
                  "pis": 47.66,
                  "ko": 19.11,
                  "pl2050": 8.08,
                  "psl": 6.62,
                  "lewica": 4.29,
                  "razem": 1.39,
                  "kwin": 7.12,
                  "kkp": 1.02,
                  "r": 0.0
            },
            "lubuskie": {
                  "pis": 27.76,
                  "ko": 37.73,
                  "pl2050": 8.28,
                  "psl": 6.79,
                  "lewica": 7.0,
                  "razem": 2.26,
                  "kwin": 5.7,
                  "kkp": 0.81,
                  "r": 0.0
            },
            "lodzkie": {
                  "pis": 38.11,
                  "ko": 29.69,
                  "pl2050": 7.38,
                  "psl": 6.04,
                  "lewica": 6.67,
                  "razem": 2.15,
                  "kwin": 5.81,
                  "kkp": 0.83,
                  "r": 0.0
            },
            "malopolskie": {
                  "pis": 41.72,
                  "ko": 23.49,
                  "pl2050": 8.64,
                  "psl": 7.08,
                  "lewica": 5.24,
                  "razem": 1.69,
                  "kwin": 7.02,
                  "kkp": 1.0,
                  "r": 0.0
            },
            "mazowieckie": {
                  "pis": 32.22,
                  "ko": 33.69,
                  "pl2050": 7.97,
                  "psl": 6.53,
                  "lewica": 7.12,
                  "razem": 2.3,
                  "kwin": 6.39,
                  "kkp": 0.91,
                  "r": 0.0
            },
            "opolskie": {
                  "pis": 31.26,
                  "ko": 33.59,
                  "pl2050": 7.0,
                  "psl": 5.74,
                  "lewica": 5.47,
                  "razem": 1.77,
                  "kwin": 5.68,
                  "kkp": 0.81,
                  "r": 0.0
            },
            "podkarpackie": {
                  "pis": 52.83,
                  "ko": 16.97,
                  "pl2050": 7.12,
                  "psl": 5.84,
                  "lewica": 3.56,
                  "razem": 1.15,
                  "kwin": 7.99,
                  "kkp": 1.14,
                  "r": 0.0
            },
            "podlaskie": {
                  "pis": 42.39,
                  "ko": 20.84,
                  "pl2050": 10.37,
                  "psl": 8.49,
                  "lewica": 3.66,
                  "razem": 1.18,
                  "kwin": 8.57,
                  "kkp": 1.22,
                  "r": 0.0
            },
            "pomorskie": {
                  "pis": 27.33,
                  "ko": 39.71,
                  "pl2050": 7.76,
                  "psl": 6.36,
                  "lewica": 6.68,
                  "razem": 2.16,
                  "kwin": 5.9,
                  "kkp": 0.84,
                  "r": 0.0
            },
            "slaskie": {
                  "pis": 33.5,
                  "ko": 32.11,
                  "pl2050": 7.17,
                  "psl": 5.88,
                  "lewica": 7.83,
                  "razem": 2.53,
                  "kwin": 6.1,
                  "kkp": 0.87,
                  "r": 0.0
            },
            "swietokrzyskie": {
                  "pis": 47.07,
                  "ko": 20.93,
                  "pl2050": 7.59,
                  "psl": 6.22,
                  "lewica": 5.17,
                  "razem": 1.67,
                  "kwin": 5.73,
                  "kkp": 0.82,
                  "r": 0.0
            },
            "warminsko_mazurskie": {
                  "pis": 33.57,
                  "ko": 32.55,
                  "pl2050": 8.69,
                  "psl": 7.12,
                  "lewica": 6.12,
                  "razem": 1.98,
                  "kwin": 5.92,
                  "kkp": 0.85,
                  "r": 0.0
            },
            "wielkopolskie": {
                  "pis": 30.12,
                  "ko": 33.61,
                  "pl2050": 9.17,
                  "psl": 7.52,
                  "lewica": 7.35,
                  "razem": 2.38,
                  "kwin": 5.8,
                  "kkp": 0.83,
                  "r": 0.0
            },
            "zachodniopomorskie": {
                  "pis": 29.73,
                  "ko": 39.6,
                  "pl2050": 6.88,
                  "psl": 5.64,
                  "lewica": 6.91,
                  "razem": 2.23,
                  "kwin": 5.22,
                  "kkp": 0.75,
                  "r": 0.0
            }
      },
      "names": {
            "dolnoslaskie": "Dolnośląskie",
            "kujawsko_pomorskie": "Kujawsko-Pomorskie",
            "lubelskie": "Lubelskie",
            "lubuskie": "Lubuskie",
            "lodzkie": "Łódzkie",
            "malopolskie": "Małopolskie",
            "mazowieckie": "Mazowieckie",
            "opolskie": "Opolskie",
            "podkarpackie": "Podkarpackie",
            "podlaskie": "Podlaskie",
            "pomorskie": "Pomorskie",
            "slaskie": "Śląskie",
            "swietokrzyskie": "Świętokrzyskie",
            "warminsko_mazurskie": "Warmińsko-Mazurskie",
            "wielkopolskie": "Wielkopolskie",
            "zachodniopomorskie": "Zachodniopomorskie"
      },
      "label": "województwa (16)"
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
    name_tr: 'Hollanda',
    seats: 150,
    threshold: 0.67,              // no legal threshold; effective ≈ 1/150 ≈ 0.67%
    method: 'dhondt',             // national D'Hondt, single national district
    seatBased: true,              // polls report seat projections
    constituencies: false,
    parties: {
      d66:      { code: 'D66',    name: 'Democrats 66',            name_en: 'Democrats 66',            color: '#00AE41', ideology: "Social liberalism, Progressivism"},
      pvv:      { code: 'PVV',    name: 'Party for Freedom',       name_en: 'Party for Freedom',       color: '#0B2F65', ideology: "Nationalism, Right-wing populism, Euroscepticism"},
      vvd:      { code: 'VVD',    name: 'People\'s Party for Freedom and Democracy', name_en: 'People\'s Party for Freedom and Democracy', color: '#0A2CCA', ideology: "Conservative liberalism, Liberalism"},
      pro:      { code: 'PRO',    name: 'Progressive Netherlands', name_en: 'Progressive Netherlands', color: '#E30613', ideology: "Social democracy"},
      cda:      { code: 'CDA',    name: 'Christian Democratic Appeal', name_en: 'Christian Democratic Appeal', color: '#1F9359', ideology: "Christian democracy, Conservatism"},
      ja21:     { code: 'JA21',   name: 'JA21',                    name_en: 'JA21',                    color: '#263573', ideology: "Right-wing populism, Conservative liberalism, Fortuynism"},
      fvd:      { code: 'FvD',    name: 'Forum for Democracy',     name_en: 'Forum for Democracy',     color: '#841818', ideology: "National conservatism, Right-wing populism, Neo-fascism"},
      bbb:      { code: 'BBB',    name: 'Farmer–Citizen Movement', name_en: 'Farmer–Citizen Movement', color: '#94C11F', ideology: "Agrarianism, Right-wing populism"},
      denk:     { code: 'DENK',   name: 'DENK',                    name_en: 'DENK',                    color: '#00B7B2', ideology: "Social democracy, Social conservatism, Minority interests"},
      sgp:      { code: 'SGP',    name: 'Reformed Political Party', name_en: 'Reformed Political Party', color: '#EA5B0B', ideology: "Christian right, Social conservatism, Theocracy"},
      pvdd:     { code: 'PvdD',   name: 'Party for the Animals',   name_en: 'Party for the Animals',   color: '#006B2D', ideology: "Animal rights, Animal welfare, Anti-capitalism"},
      cu:       { code: 'CU',     name: 'Christian Union',         name_en: 'Christian Union',         color: '#00A7EB', ideology: "Christian democracy, Social conservatism"},
      sp:       { code: 'SP',     name: 'Socialist Party',         name_en: 'Socialist Party',         color: '#DC241F', ideology: "Democratic socialism, Left-wing populism, Social democracy"},
      fiftyplus:{ code: '50+',    name: '50PLUS',                  name_en: '50PLUS',                  color: '#800080', ideology: "Pensioners' interests, Populism"},
      volt:     { code: 'VOLT',   name: 'Volt',                    name_en: 'Volt',                    color: '#502379', ideology: "European federalism, Pan-Europeanism, Progressivism"},
    },
    order: ['d66', 'pvv', 'vvd', 'pro', 'cda', 'ja21', 'fvd', 'bbb', 'denk', 'sgp', 'pvdd', 'cu', 'sp', 'fiftyplus', 'volt'],
    parlOrder: ['sp', 'denk', 'pvdd', 'pro', 'd66', 'volt', 'cu', 'sgp', 'cda', 'fiftyplus', 'vvd', 'ja21', 'bbb', 'fvd', 'pvv'],
    // Government = Jetten cabinet (D66–VVD–CDA); everything else is opposition
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['d66', 'vvd', 'cda'], color: '#00A95C' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['pvv', 'pro', 'ja21', 'fvd', 'bbb', 'denk', 'sgp', 'pvdd', 'cu', 'sp', 'fiftyplus', 'volt'], color: '#8497B0' },
    },
    coalitions: [
      { name: 'PVV + VVD + BBB + JA21', parties: ['pvv','vvd','bbb','ja21'] },
      { name: 'PRO + VVD + D66 + CDA + CU + Volt', parties: ['pro','vvd','d66','cda','cu','volt'] },
      { name: 'PVV + PRO', parties: ['pvv','pro'] },
    ],
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
    map: {},
    map2: {},
    logos: {
      d66: 'img/nl/D66.svg', pvv: 'img/nl/PVV.svg', vvd: 'img/nl/VVD.svg', pro: 'img/nl/PRO.svg',
      cda: 'img/nl/CDA.svg', ja21: 'img/nl/JA21.svg', fvd: 'img/nl/FVD.svg', bbb: 'img/nl/BBB.svg',
      denk: 'img/nl/DENK.svg', sgp: 'img/nl/SGP.svg', pvdd: 'img/nl/PVDD.svg', cu: 'img/nl/CU.svg',
      sp: 'img/nl/SP.svg', fiftyplus: 'img/nl/50+.svg', volt: 'img/nl/VOLT.svg',
    },
  },

  estonia: {
    name: 'Estonia',
    name_tr: 'Estonya',
    seats: 101,
    threshold: 5.0,               // 5% national threshold
    method: 'dhondt',             // national D'Hondt over 12 multi-seat districts (adjustment seats)
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // seat adjustment is national; map colors per 12 electoral districts
    recencyHalfLifeDays: 14,
    parties: {
      isamaa: { code: 'Isamaa', name: 'Isamaa', name_en: 'Isamaa', color: '#009CE2', ideology: "National conservatism, Christian democracy, Economic liberalism"},
      e200:   { code: 'E200',   name: 'Estonia 200', name_en: 'Estonia 200', color: '#06778D', ideology: "Liberalism (Estonian), Economic liberalism, Pro-Europeanism"},
      ref:    { code: 'REF',    name: 'Estonian Reform Party', name_en: 'Estonian Reform Party', color: '#FFE200', ideology: "Liberalism (Estonian), Conservative liberalism"},
      ekre:   { code: 'EKRE',   name: 'Conservative People\'s Party of Estonia', name_en: 'Conservative People\'s Party of Estonia', color: '#0063AF', ideology: "Estonian nationalism, Social conservatism, Right-wing populism"},
      kesk:   { code: 'KESK',   name: 'Estonian Centre Party', name_en: 'Estonian Centre Party', color: '#007557', ideology: "Centrism, Liberalism"},
      sde:    { code: 'SDE',    name: 'Social Democratic Party', name_en: 'Social Democratic Party', color: '#FF3300', ideology: "Social democracy, Pro-Europeanism"},
      vl:     { code: 'VL',     name: 'Estonian Left Party', name_en: 'Estonian Left Party', color: '#D33131', ideology: "Democratic socialism"},
      koos:   { code: 'Koos',   name: 'Koos', name_en: 'Together', color: '#015AAC', ideology: "Social conservatism, Russian minority politics, Russophilia"},
      pp:     { code: 'Parem',  name: 'Parempoolsed', name_en: 'Parempoolsed', color: '#FA6100', ideology: "Economic liberalism, Right-libertarianism, Pro-Europeanism"},
      eer:    { code: 'EER',    name: 'Estonian Greens', name_en: 'Estonian Greens', color: '#96C93D', ideology: "Green politics, Social liberalism"},
      erk:    { code: 'ERK',    name: 'Estonian Nationalists and Conservatives', name_en: 'Estonian Nationalists and Conservatives', color: '#CFA14A', ideology: "Estonian nationalism, National conservatism"},
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
    map: {},
      map2: {
      "svg": "img/estonia_counties.svg",
      "selector": "id",
      "districts": {
            "harju": "harju",
            "rapla": "rapla",
            "hiiu": "hiiu",
            "laane": "laane",
            "saare": "saare",
            "laane_viru": "laane_viru",
            "ida_viru": "ida_viru",
            "jarva": "jarva",
            "viljandi": "viljandi",
            "jogeva": "jogeva",
            "tartu": "tartu",
            "polva": "polva",
            "valga": "valga",
            "voru": "voru",
            "parnu": "parnu"
      },
      "gebiete": {
            "harju": {
                  "isamaa": 6.35,
                  "e200": 13.65,
                  "ref": 35.04,
                  "ekre": 10.57,
                  "kesk": 19.36,
                  "sde": 8.42,
                  "vl": 2.89,
                  "koos": 0.0,
                  "pp": 2.47,
                  "eer": 0.95,
                  "erk": 0.0
            },
            "rapla": {
                  "isamaa": 11.72,
                  "e200": 12.25,
                  "ref": 30.5,
                  "ekre": 22.75,
                  "kesk": 10.97,
                  "sde": 6.95,
                  "vl": 0.27,
                  "koos": 0.0,
                  "pp": 2.8,
                  "eer": 0.57,
                  "erk": 0.0
            },
            "hiiu": {
                  "isamaa": 7.4,
                  "e200": 14.58,
                  "ref": 29.32,
                  "ekre": 12.77,
                  "kesk": 11.1,
                  "sde": 21.88,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 2.24,
                  "eer": 0.7,
                  "erk": 0.0
            },
            "laane": {
                  "isamaa": 6.63,
                  "e200": 18.59,
                  "ref": 26.93,
                  "ekre": 20.57,
                  "kesk": 14.59,
                  "sde": 9.71,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 1.96,
                  "eer": 1.04,
                  "erk": 0.0
            },
            "saare": {
                  "isamaa": 8.74,
                  "e200": 17.16,
                  "ref": 27.64,
                  "ekre": 20.17,
                  "kesk": 9.57,
                  "sde": 13.82,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 2.09,
                  "eer": 0.79,
                  "erk": 0.0
            },
            "laane_viru": {
                  "isamaa": 13.85,
                  "e200": 8.71,
                  "ref": 31.16,
                  "ekre": 20.11,
                  "kesk": 13.52,
                  "sde": 7.47,
                  "vl": 1.48,
                  "koos": 0.0,
                  "pp": 3.0,
                  "eer": 0.52,
                  "erk": 0.0
            },
            "ida_viru": {
                  "isamaa": 3.95,
                  "e200": 8.27,
                  "ref": 14.02,
                  "ekre": 8.27,
                  "kesk": 25.94,
                  "sde": 7.59,
                  "vl": 14.95,
                  "koos": 0.0,
                  "pp": 0.93,
                  "eer": 0.46,
                  "erk": 0.0
            },
            "jarva": {
                  "isamaa": 10.75,
                  "e200": 8.79,
                  "ref": 30.42,
                  "ekre": 23.55,
                  "kesk": 11.14,
                  "sde": 12.03,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 2.19,
                  "eer": 0.83,
                  "erk": 0.0
            },
            "viljandi": {
                  "isamaa": 12.58,
                  "e200": 11.96,
                  "ref": 26.31,
                  "ekre": 22.71,
                  "kesk": 9.81,
                  "sde": 13.61,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 1.98,
                  "eer": 0.71,
                  "erk": 0.0
            },
            "jogeva": {
                  "isamaa": 17.04,
                  "e200": 11.22,
                  "ref": 24.93,
                  "ekre": 21.02,
                  "kesk": 14.09,
                  "sde": 6.62,
                  "vl": 2.16,
                  "koos": 0.0,
                  "pp": 2.16,
                  "eer": 0.77,
                  "erk": 0.0
            },
            "tartu": {
                  "isamaa": 9.09,
                  "e200": 17.7,
                  "ref": 34.76,
                  "ekre": 16.0,
                  "kesk": 7.26,
                  "sde": 9.97,
                  "vl": 1.48,
                  "koos": 0.0,
                  "pp": 2.31,
                  "eer": 1.45,
                  "erk": 0.0
            },
            "polva": {
                  "isamaa": 8.85,
                  "e200": 13.03,
                  "ref": 23.96,
                  "ekre": 26.85,
                  "kesk": 14.99,
                  "sde": 9.41,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 1.64,
                  "eer": 1.02,
                  "erk": 0.0
            },
            "valga": {
                  "isamaa": 8.4,
                  "e200": 10.27,
                  "ref": 29.26,
                  "ekre": 22.22,
                  "kesk": 17.39,
                  "sde": 7.98,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 3.03,
                  "eer": 1.08,
                  "erk": 0.0
            },
            "voru": {
                  "isamaa": 8.48,
                  "e200": 11.33,
                  "ref": 20.39,
                  "ekre": 28.72,
                  "kesk": 9.91,
                  "sde": 17.32,
                  "vl": 0.0,
                  "koos": 0.0,
                  "pp": 2.22,
                  "eer": 1.48,
                  "erk": 0.0
            },
            "parnu": {
                  "isamaa": 10.06,
                  "e200": 12.83,
                  "ref": 29.43,
                  "ekre": 25.78,
                  "kesk": 11.58,
                  "sde": 6.72,
                  "vl": 0.65,
                  "koos": 0.0,
                  "pp": 2.17,
                  "eer": 0.77,
                  "erk": 0.0
            }
      },
      "names": {
            "harju": "Harju",
            "rapla": "Rapla",
            "hiiu": "Hiiu",
            "laane": "Lääne",
            "saare": "Saare",
            "laane_viru": "Lääne-Viru",
            "ida_viru": "Ida-Viru",
            "jarva": "Järva",
            "viljandi": "Viljandi",
            "jogeva": "Jõgeva",
            "tartu": "Tartu",
            "polva": "Põlva",
            "valga": "Valga",
            "voru": "Võru",
            "parnu": "Pärnu"
      },
      "label": "maakonnad (15)"
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
    name_tr: 'Slovakya',
    seats: 150,
    threshold: 5.0,
    method: 'hare_niemeyer',      // LR-Hagenbach-Bischoff (quota = valid votes/(150+1)); app approximates with Hare quota
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      smer:      { code: 'Smer-SD',   name: 'Direction – Social Democracy',   name_en: 'Direction – Social Democracy',   color: '#D82222', ideology: "Social democracy, Left-wing populism, Left-wing nationalism"},
      ps:        { code: 'PS',        name: 'Progressive Slovakia',            name_en: 'Progressive Slovakia',            color: '#00BDFF', ideology: "Social liberalism, Liberalism, Pro-Europeanism"},
      hlas:      { code: 'Hlas-SD',   name: 'Voice – Social Democracy',        name_en: 'Voice – Social Democracy',        color: '#830F38', ideology: "Social democracy, Left-wing populism, Left-wing nationalism"},
      slovensko: { code: 'Slovensko', name: 'Slovakia (OĽaNO successor)',      name_en: 'Ordinary People and Independent Personalities',      color: '#B2C933', ideology: "Populism, National conservatism"},
      zl:        { code: 'Za ľudí',   name: 'For the People',                  name_en: 'For the People',                  color: '#FDBB12', ideology: "Liberal conservatism, Pro-Europeanism"},
      ku:        { code: 'KÚ',        name: 'Christian Union',                 name_en: 'Christian Union',                 color: '#04B2E8', ideology: "Christian right, National conservatism, Social conservatism"},
      kdh:       { code: 'KDH',       name: 'Christian Democratic Movement',   name_en: 'Christian Democratic Movement',   color: '#173A70', ideology: "Christian democracy, Social conservatism"},
      sas:       { code: 'SaS',       name: 'Freedom and Solidarity',          name_en: 'Freedom and Solidarity',          color: '#A7CF35', ideology: "Right-libertarianism, Classical liberalism, Conservative liberalism"},
      sns:       { code: 'SNS',       name: 'Slovak National Party',           name_en: 'Slovak National Party',           color: '#253A79', ideology: "Ultranationalism, National conservatism, Right-wing populism"},
      republika: { code: 'Republika', name: 'Republic Movement',               name_en: 'Republic Movement',               color: '#B22222', ideology: "Neo-fascism, National conservatism, Right-wing populism"},
      aliancia:  { code: 'Aliancia',  name: 'Hungarian Alliance',              name_en: 'Hungarian Alliance',              color: '#8BC34A', ideology: "Hungarian minority interests, Hungarian nationalism, National conservatism"},
      demokrati: { code: 'Demokrati', name: 'Democrats',                       name_en: 'Democrats',                       color: '#50168E', ideology: "Liberal conservatism, Pro-Europeanism"},
      rodina:    { code: 'Sme rodina', name: 'We Are Family',                  name_en: 'We Are Family',                   color: '#0B3F95', ideology: "National conservatism, Right-wing populism"},
      lsns:      { code: 'ĽSNS',      name: "People's Party Our Slovakia",     name_en: "People's Party Our Slovakia",     color: '#005222', ideology: "Ultranationalism, Neo-fascism"},
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
    map: {},
    map2: {},
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
    name_tr: 'Fransa',
    // Live again 2026-10-11 (scrape_france.py). The 2027 field is UNSETTLED:
    // the first-round polls test alternative hypothetical fields (19-33
    // columns across periods, the same pollster/date in several scenario
    // rows). Each candidate's series is averaged over the polls that tested
    // them; unmodelled names fold into Other. Department baselines inherit
    // the 2022 geography (Macron split 60/40 Attal/Philippe, Pecresse ->
    // Retailleau, Jadot -> Tondelier, Hidalgo -> Faure).
    seats: 96,                    // 96 metropolitan departments (the map units)
    threshold: 50,
    method: "hare_niemeyer",
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 7,
    defaultDays: 90,              // the runoff pairs are sparse; 90d keeps 4-5
    // the only model with an unsettled field: polls test alternative
    // candidate combinations, so the polls tab offers the field selector
    // (scenario chips). Every other model polls a settled field.
    fieldSelector: true,
    hideBlocs: true,
    mapOnly: true,
    unitLabel: {
      en: "departments",
      tr: "iller"
    },
    parties: {
      arthaud: {
        code: "Arthaud",
        name: "Nathalie Arthaud",
        name_en: "Nathalie Arthaud",
        color: "#AA0000"
, ideology: "Trotskyism, Communism"},
      melenchon: {
        code: "Mélenchon",
        name: "Jean-Luc Mélenchon",
        name_en: "Jean-Luc Mélenchon",
        color: "#56277E"
, ideology: "Left-wing populism, Democratic socialism"},
      roussel: {
        code: "Roussel",
        name: "Fabien Roussel",
        name_en: "Fabien Roussel",
        color: "#E4002A"
, ideology: "Communism"},
      ruffin: {
        code: "Ruffin",
        name: "François Ruffin",
        name_en: "François Ruffin",
        color: "#F13C46"
, ideology: "Left-wing populism, Social democracy"},
      tondelier: {
        code: "Tondelier",
        name: "Marine Tondelier",
        name_en: "Marine Tondelier",
        color: "#79b41d"
, ideology: "Green politics"},
      faure: {
        code: "Faure",
        name: "Olivier Faure",
        name_en: "Olivier Faure",
        color: "#E3265B"
, ideology: "Social democracy"},
      hollande: {
        code: "Hollande",
        name: "François Hollande",
        name_en: "François Hollande",
        color: "#E3265B"
, ideology: "Social democracy"},
      glucksmann: {
        code: "Glucksmann",
        name: "Raphaël Glucksmann",
        name_en: "Raphaël Glucksmann",
        color: "#FFF100"
, ideology: "Social democracy, Pro-Europeanism"},
      attal: {
        code: "Attal",
        name: "Gabriel Attal",
        name_en: "Gabriel Attal",
        color: "#FFD600"
, ideology: "Liberalism, Pro-Europeanism"},
      philippe: {
        code: "Philippe",
        name: "Édouard Philippe",
        name_en: "Édouard Philippe",
        color: "#0000BA"
, ideology: "Liberal conservatism"},
      villepin: {
        code: "Villepin",
        name: "Dominique de Villepin",
        name_en: "Dominique de Villepin",
        color: "#687CD5"
, ideology: "Gaullism, Conservatism"},
      lisnard: {
        code: "Lisnard",
        name: "David Lisnard",
        name_en: "David Lisnard",
        color: "#0043B0"
, ideology: "Liberal conservatism"},
      wauquiez: {
        code: "Wauquiez",
        name: "Laurent Wauquiez",
        name_en: "Laurent Wauquiez",
        color: "#0043B0"
, ideology: "Conservatism, Gaullism"},
      maurel: {
        code: "Maurel",
        name: "Emmanuel Maurel",
        name_en: "Emmanuel Maurel",
        color: "#D53150", ideology: "Left-wing euroscepticism, Socialism"},
      royal: {
        code: "Royal",
        name: "Ségolène Royal",
        name_en: "Ségolène Royal",
        color: "#E3265B", ideology: "Social democracy"},
      bouamrane: {
        code: "Bouamrane",
        name: "Karim Bouamrane",
        name_en: "Karim Bouamrane",
        color: "#E3265B", ideology: "Social democracy"},
      guedj: {
        code: "Guedj",
        name: "Jérôme Guedj",
        name_en: "Jérôme Guedj",
        color: "#E3265B", ideology: "Social democracy"},
      lemaire: {
        code: "Le Maire",
        name: "Bruno Le Maire",
        name_en: "Bruno Le Maire",
        color: "#FFD600", ideology: "Liberal conservatism, Gaullism"},
      bertrand: {
        code: "Bertrand",
        name: "Xavier Bertrand",
        name_en: "Xavier Bertrand",
        color: "#0043B0", ideology: "Liberal conservatism, Gaullism"},
      knafo: {
        code: "Knafo",
        name: "Sarah Knafo",
        name_en: "Sarah Knafo",
        color: "#170066", ideology: "National conservatism, Right-wing populism"},
      // the true 2022 candidates who are not 2027 aspirants (pastOnly:
      // shown in the 2022 result sections, never projected) - their colors
      // come from the page's 2022 re-run table
      macron: {
        code: "Macron",
        name: "Emmanuel Macron",
        name_en: "Emmanuel Macron",
        color: "#FFD600", pastOnly: true, ideology: "Liberalism, Pro-Europeanism"},
      pecresse: {
        code: "Pécresse",
        name: "Valérie Pécresse",
        name_en: "Valérie Pécresse",
        color: "#0043B0", pastOnly: true, ideology: "Liberal conservatism, Gaullism"},
      jadot: {
        code: "Jadot",
        name: "Yannick Jadot",
        name_en: "Yannick Jadot",
        color: "#79b41d", pastOnly: true, ideology: "Green politics"},
      hidalgo: {
        code: "Hidalgo",
        name: "Anne Hidalgo",
        name_en: "Anne Hidalgo",
        color: "#E3265B", pastOnly: true, ideology: "Social democracy"},
      lassalle: {
        code: "Lassalle",
        name: "Jean Lassalle",
        name_en: "Jean Lassalle",
        color: "#034EA1", pastOnly: true, ideology: "Ruralism, Regionalism"},
      poutou: {
        code: "Poutou",
        name: "Philippe Poutou",
        name_en: "Philippe Poutou",
        color: "#C0081F", pastOnly: true, ideology: "Trotskyism, Anti-capitalism"},
      retailleau: {
        code: "Retailleau",
        name: "Bruno Retailleau",
        name_en: "Bruno Retailleau",
        color: "#0043B0"
, ideology: "Conservatism, National conservatism"},
      dupont: {
        code: "Dupont-Aignan",
        name: "Nicolas Dupont-Aignan",
        name_en: "Nicolas Dupont-Aignan",
        color: "#0087CD"
, ideology: "National conservatism, Euroscepticism"},
      lepen: {
        code: "Le Pen",
        name: "Marine Le Pen",
        name_en: "Marine Le Pen",
        color: "#254671"
, ideology: "National conservatism, Right-wing populism"},
      zemmour: {
        code: "Zemmour",
        name: "Éric Zemmour",
        name_en: "Éric Zemmour",
        color: "#170066"
, ideology: "National conservatism, Euroscepticism"}
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
      "arthaud",
      "maurel",
      "royal",
      "bouamrane",
      "guedj",
      "lemaire",
      "bertrand",
      "knafo"
    ],
    parlOrder: [
      "lepen",
      "melenchon",
      "attal",
      "philippe",
      "zemmour",
      "knafo",
      "retailleau",
      "lemaire",
      "bertrand",
      "tondelier",
      "roussel",
      "maurel",
      "dupont",
      "faure",
      "royal",
      "bouamrane",
      "guedj",
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
          "arthaud",
          "maurel",
          "royal",
          "bouamrane",
          "guedj",
          "lemaire",
          "bertrand",
          "knafo"
        ],
        color: "#7A1FA2"
      }
    },
    lastElection: {
      date: "2022-04-10",
      // the TRUE official 2022 first-round result (Ministry of the
      // Interior), with the actual candidates - Macron 27.85, Pecresse,
      // Jadot, Hidalgo, Lassalle, Poutou included as pastOnly entries.
      // The MODEL's swing anchor is the mapped version in map.national2021
      // (Macron split 60/40 Attal/Philippe etc., matching the department
      // baselines); this block is the historical display.
      results: {
        macron: 27.85,
        lepen: 23.15,
        melenchon: 21.95,
        zemmour: 7.07,
        pecresse: 4.78,
        jadot: 4.63,
        lassalle: 3.13,
        roussel: 2.28,
        dupont: 2.06,
        hidalgo: 1.75,
        poutou: 0.77,
        arthaud: 0.56,
        attal: 0,
        philippe: 0,
        retailleau: 0,
        tondelier: 0,
        faure: 0,
        ruffin: 0,
        hollande: 0,
        glucksmann: 0,
        villepin: 0,
        lisnard: 0,
        wauquiez: 0,
        maurel: 0,
        royal: 0,
        bouamrane: 0,
        guedj: 0,
        lemaire: 0,
        bertrand: 0,
        knafo: 0
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
    map: {},
    pollsterMAE: {
      // nested per-pollster shape like every other country (a flat number
      // here crashed the polls table: maeV[MAE_KEY]/maeV.overall on a number
      // is undefined -> fmt(undefined).toFixed threw)
      OpinionWay:           { overall: 1.7 },
      Ipsos:                { overall: 1.7 },
      Elabe:                { overall: 1.8 },
      Ifop:                 { overall: 1.9 },
      Odoxa:                { overall: 2.2 },
      BVA:                  { overall: 2.0 },
      'Harris Interactive': { overall: 2.2 },
      Verian:               { overall: 2.2 },
      Cluster17:            { overall: 2.3 },
    },
    logos: {
      arthaud: "img/fr/LO.svg",
      melenchon: "img/fr/LFI.svg",
      roussel: "img/fr/PCF.svg",
      ruffin: "img/fr/D.svg",
      tondelier: "img/fr/LE.svg",
      faure: "img/fr/PS.svg",
      royal: "img/fr/PS.svg",
      bouamrane: "img/fr/PS.svg",
      guedj: "img/fr/PS.svg",
      hollande: "img/fr/LaFranceHumaniste.svg",
      glucksmann: "img/fr/PP.svg",
      attal: "img/fr/RE.svg",
      lemaire: "img/fr/RE.svg",
      philippe: "img/fr/Horizons.svg",
      lisnard: "img/fr/NE.svg",
      wauquiez: "img/fr/LR.svg",
      retailleau: "img/fr/LR.svg",
      bertrand: "img/fr/LR.svg",
      dupont: "img/fr/DLF.svg",
      lepen: "img/fr/RN.svg",
      knafo: "img/fr/REC.svg",
      zemmour: "img/fr/REC.svg",
      macron: "img/fr/RE.svg",
      pecresse: "img/fr/LR.svg",
      jadot: "img/fr/LE.svg",
      hidalgo: "img/fr/PS.svg",
    }
  },
  germany: {
    name: 'Germany',
    name_tr: 'Almanya',
    seats: 630,
    threshold: 5.0,
    method: 'sainte_lague_standard', // Sainte-Laguë/Schepers (divisors 1, 3, 5, …)
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // 299 direct mandates (Erststimme)
    constituencyRule: 'fptp',     // winner-takes-all, no 12% rule
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
      cdu:  { code: 'CDU/CSU', name: 'Christlich Demokratische Union / Christlich-Soziale Union', name_en: 'Christian Democratic Union / Christian Social Union', color: '#151518', ideology: "Conservatism (German), Christian democracy"},
      spd:  { code: 'SPD',   name: 'Sozialdemokratische Partei Deutschlands', name_en: 'Social Democratic Party of Germany', color: '#E3000F', ideology: "Social democracy"},
      gruene:{ code: 'GRÜNE', name: 'Bündnis 90/Die Grünen', name_en: 'Alliance 90/The Greens', color: '#409A3C', ideology: "Green politics, Social liberalism"},
      linke:{ code: 'LINKE', name: 'Die Linke', name_en: 'The Left', color: '#BE3075', ideology: "Democratic socialism, Socialism"},
      afd:  { code: 'AfD',   name: 'Alternative für Deutschland', name_en: 'Alternative for Germany', color: '#00A2DE', ideology: "Right-wing populism, National conservatism, Euroscepticism"},
      fdp:  { code: 'FDP',   name: 'Freie Demokratische Partei', name_en: 'Free Democratic Party', color: '#FFED00', ideology: "Liberalism (German)"},
      fw:   { code: 'FW',   name: 'Freie Wähler', name_en: 'Free Voters', color: '#F7A800', ideology: "Regionalism, Localism, Conservative liberalism"},
      bsw:  { code: 'BSW',   name: 'Bündnis Sahra Wagenknecht', name_en: 'Sahra Wagenknecht Alliance', color: '#792351', ideology: "Left-conservatism, Left-wing populism"},
      ssw:  { code: 'SSW',   name: 'South Schleswig Voters\' Association', name_en: 'South Schleswig Voters\' Association', color: '#003C8F', ideology: "Regionalism, Danish minority interests"},
    },
    // the SSW (Danish minority) is exempt from the 5% threshold
    minorityParties: ['ssw'],
    order: ['cdu', 'afd', 'spd', 'gruene', 'linke', 'bsw', 'fdp', 'fw', 'ssw'],
    parlOrder: ['linke', 'spd', 'gruene', 'bsw', 'cdu', 'fdp', 'fw', 'afd', 'ssw'],
    // Firewall = everyone but the AfD; BSW as kingmaker (like the state models)
    blocs: {
      bloc1: { name: 'Firewall', short: 'FIRE', parties: ['cdu', 'spd', 'gruene', 'linke', 'fdp'], color: '#111827' },
      bloc2: { name: 'AfD', short: 'AFD', parties: ['afd'], color: '#40A0D8' },
      kingmaker: 'bsw', kingmakerLabel: 'BSW Kingmaker', kingmakerColor: '#8E44AD',
    },
    coalitions: [
      { name: 'CDU/CSU + SPD', parties: ['cdu','spd'] },
      { name: 'CDU/CSU + Grüne', parties: ['cdu','gruene'] },
      { name: 'CDU/CSU + AfD', parties: ['cdu','afd'] },
      { name: 'SPD + Grüne + Linke', parties: ['spd','gruene','linke'] },
    ],
    lastElection: {
      date: '2025-02-23',
      // 2025 Bundestag official result (Zweitstimme %, Union = CDU + CSU)
      results: {
              "cdu": 28.52,
              "spd": 16.41,
              "gruene": 11.61,
              "linke": 8.77,
              "afd": 20.8,
              "fdp": 4.33,
              "bsw": 4.98,
              "ssw": 0.2
      , fw: 1.55},
      seats: {
              "cdu": 208,
              "afd": 152,
              "spd": 120,
              "gruene": 85,
              "linke": 64,
              "bsw": 0,
              "fdp": 0,
              "ssw": 1
      , fw: 0},
    },
    map: {},
    map2: {},
    pollsterMAE: {
      "INSA": {
            "BT2025": 0.91,
            "overall": 0.91
      },
      "Wahlkreisprognose": {
            "BT2025": 1.18,
            "overall": 1.18
      },
      "Ipsos": {
            "BT2025": 1.35,
            "overall": 1.35
      },
      "Forschungsgruppe Wahlen": {
            "BT2025": 1.3,
            "overall": 1.3
      },
      "Forsa": {
            "BT2025": 1.28,
            "overall": 1.28
      },
      "YouGov": {
            "BT2025": 0.92,
            "overall": 0.92
      },
      "Allensbach": {
            "BT2025": 1.87,
            "overall": 1.87
      },
      "GMS": {
            "BT2025": 2.19,
            "overall": 2.19
      },
      "YouGov ( MRP )": {
            "BT2025": 0.89,
            "overall": 0.89
      },
      "Cluster 17": {
            "BT2025": 1.08,
            "overall": 1.08
      },
      "Infratest dimap": {
            "BT2025": 1.89,
            "overall": 1.89
      },
      "Pollytix": {
            "BT2025": 1.32,
            "overall": 1.32
      },
      "YouGov (MRP)": {
            "BT2025": 1.47,
            "overall": 1.47
      },
      "Democracy Institute": {
            "BT2025": 2.0,
            "overall": 2.0
      },
      "Verian": {
            "BT2025": 2.16,
            "overall": 2.16
      },
      "Kantar": {
            "BT2025": 2.04,
            "overall": 2.04
      },
      "Civey": {
            "BT2025": 4.46,
            "overall": 4.46
      },
      "pollytix": {
            "BT2025": 4.96,
            "overall": 4.96
      }
},
    maeKey: 'BT2025',
    logos: {
      cdu: 'img/de/Union.svg', spd: 'img/de/SPD.svg', gruene: 'img/de/Grune.svg',
      linke: 'img/de/Linke.svg', afd: 'img/de/AFD.svg', fdp: 'img/de/FDP.svg',
      bsw: 'img/de/BSW.svg', fw: 'img/de/FW.svg', ssw: 'img/de/SSW.svg',
    },
  },
  spain: {
    name: 'Spain',
    seats: 350,
    threshold: 3.0,               // 3% in each constituency
    method: 'dhondt',             // D'Hondt in each of the 52 constituencies
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      pp:     { code: 'PP',      name: 'Partido Popular',                    name_en: 'People\'s Party',                      color: '#1D84CE', ideology: "Conservatism, Christian democracy" },
      psoe:   { code: 'PSOE',    name: 'Partido Socialista Obrero Español',  name_en: 'Spanish Socialist Workers\' Party',    color: '#E30713', ideology: "Social democracy" },
      vox:    { code: 'VOX',     name: 'Vox',                                name_en: 'Vox',                                   color: '#63BE21', ideology: "Right-wing populism, National conservatism" },
      sumar:  { code: 'FA',      name: 'Frente Amplio',                     name_en: 'Broad Front',                           color: '#F05501', ideology: "Democratic socialism, Left-wing populism" },
      erc:    { code: 'ERC',     name: 'Esquerra Republicana de Catalunya',  name_en: 'Republican Left of Catalonia',          color: '#FFB232', ideology: "Catalan independence, Social democracy" },
      junts:  { code: 'JUNTS',   name: 'Junts per Catalunya',                name_en: 'Together for Catalonia',                color: '#00B0B9', ideology: "Catalan independence, Conservatism" },
      bildu:  { code: 'EH BILDU',name: 'Euskal Herria Bildu',                name_en: 'Basque Country Gather',                 color: '#79BF43', ideology: "Basque independence, Left-wing nationalism" },
      pnv:    { code: 'EAJ-PNV', name: 'Euzko Alderdi Jeltzalea',            name_en: 'Basque Nationalist Party',              color: '#008000', ideology: "Basque nationalism, Christian democracy" },
      bng:    { code: 'BNG',     name: 'Bloque Nacionalista Galego',         name_en: 'Galician Nationalist Bloc',             color: '#6CA5D0', ideology: "Galician nationalism, Left-wing" },
      cc:     { code: 'CC',      name: 'Coalición Canaria',                  name_en: 'Canarian Coalition',                    color: '#FFCC00', ideology: "Canarian nationalism, Regionalism" },
      upn:    { code: 'UPN',     name: 'Unión del Pueblo Navarro',           name_en: 'Navarrese People\'s Union',            color: '#1B4F9C', ideology: "Navarrese regionalism, Christian democracy" },
      aa:     { code: 'AA',      name: 'Adelante Andalucía',                 name_en: 'Forward Andalusia',                     color: '#24C87E', ideology: "Andalusian nationalism, Left-wing" },
      podemos:{ code: 'PODEMOS', name: 'Podemos',                            name_en: 'Podemos',                               color: '#9269F5', ideology: "Left-wing populism, Democratic socialism" },
      salf:   { code: 'SALF',    name: 'Se Acabó La Fiesta',                 name_en: 'The Party Is Over',                     color: '#785A46', ideology: "Right-wing populism, Ultraconservatism" },
      ac:     { code: 'AC',      name: 'Aliança Catalana',                   name_en: 'Catalan Alliance',                      color: '#064A81', ideology: "Catalan independence, Right-wing populism" },
      compromis: { code: 'Compromís', name: 'Compromís',        name_en: 'Compromís',              color: '#F58220', ideology: "Valencian nationalism, Progressivism"},
      d21:       { code: 'D21',   name: 'Democracia para el Siglo XXI', name_en: 'Democracy for the 21st Century', color: '#EB6109', ideology: "Liberalism, Centrism"},
    },
    order: ['pp', 'psoe', 'vox', 'sumar', 'erc', 'junts', 'bildu', 'pnv', 'bng', 'cc', 'upn', 'aa', 'podemos', 'salf', 'ac', 'compromis', 'd21'],
    parlOrder: ['bildu', 'erc', 'aa', 'podemos', 'sumar', 'compromis', 'psoe', 'junts', 'pnv', 'bng', 'cc', 'upn', 'pp', 'd21', 'ac', 'vox', 'salf'],
    // 2023 investiture majority (PSOE+Sumar and the regional allies) vs the right
    blocs: {
      bloc1: { name: 'Government bloc', short: 'GOV', parties: ['psoe', 'sumar', 'podemos', 'erc', 'junts', 'bildu', 'pnv', 'bng', 'cc', 'aa'], color: '#A6192E' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['pp', 'vox', 'salf', 'ac', 'upn'], color: '#1B4F9C' },
    },
    upper: { label: 'Senate', seats: 208, block: true,
             seatsByDistrict: { balears: 5, palmas: 5, tenerife: 6,
                                ceuta: 2, melilla: 2 } },
    senate: {
          "svg": "img/spain_senate.svg",
          "blockVote": true,
          "seatDistricts": {"coruna": 4, "lugo": 4, "ourense": 4, "pontevedra": 4, "asturias": 4, "cantabria": 4, "alava": 4, "gipuzkoa": 4, "bizkaia": 4, "navarra": 4, "rioja": 4, "huesca": 4, "teruel": 4, "zaragoza": 4, "madrid": 4, "avila": 4, "burgos": 4, "leon": 4, "palencia": 4, "salamanca": 4, "segovia": 4, "soria": 4, "valladolid": 4, "zamora": 4, "albacete": 4, "ciudad_real": 4, "cuenca": 4, "guadalajara": 4, "toledo": 4, "badajoz": 4, "caceres": 4, "barcelona": 4, "girona": 4, "lleida": 4, "tarragona": 4, "alicante": 4, "castellon": 4, "valencia": 4, "eivissa_formentera": 1, "mallorca": 3, "menorca": 1, "almeria": 4, "cadiz": 4, "cordoba": 4, "granada": 4, "huelva": 4, "jaen": 4, "malaga": 4, "sevilla": 4, "murcia": 4, "ceuta": 2, "melilla": 2, "gran_canaria": 3, "tenerife": 3, "el_hierro": 1, "fuerteventura": 1, "la_gomera": 1, "la_palma": 1, "lanzarote": 1},
          "alliances": [
            { "provinces": ["coruna", "lugo", "ourense", "pontevedra", "asturias", "cantabria", "alava", "gipuzkoa", "bizkaia", "navarra", "rioja", "huesca", "teruel", "zaragoza", "madrid", "avila", "burgos", "leon", "palencia", "salamanca", "segovia", "soria", "valladolid", "zamora", "albacete", "ciudad_real", "cuenca", "guadalajara", "toledo", "badajoz", "caceres", "alicante", "castellon", "valencia", "almeria", "cadiz", "cordoba", "granada", "huelva", "jaen", "malaga", "sevilla", "murcia", "ceuta", "melilla", "la_gomera"], "parties": ["psoe", "sumar"] },
            { "provinces": ["barcelona", "girona", "lleida", "tarragona", "alava", "gipuzkoa", "bizkaia", "navarra"], "parties": ["erc", "bildu"], "name": "ERC-EHB" },
            { "provinces": ["navarra"], "parties": ["pp", "upn"], "name": "UPN" },
            { "provinces": ["gran_canaria", "tenerife", "el_hierro", "fuerteventura", "la_gomera", "la_palma", "lanzarote"], "parties": ["sumar", "podemos"] }
          ],
          "selector": "id",
          "districts": {
                "coruna": "coruna",
                "lugo": "lugo",
                "ourense": "ourense",
                "pontevedra": "pontevedra",
                "asturias": "asturias",
                "cantabria": "cantabria",
                "alava": "alava",
                "gipuzkoa": "gipuzkoa",
                "bizkaia": "bizkaia",
                "navarra": "navarra",
                "rioja": "rioja",
                "huesca": "huesca",
                "teruel": "teruel",
                "zaragoza": "zaragoza",
                "madrid": "madrid",
                "avila": "avila",
                "burgos": "burgos",
                "leon": "leon",
                "palencia": "palencia",
                "salamanca": "salamanca",
                "segovia": "segovia",
                "soria": "soria",
                "valladolid": "valladolid",
                "zamora": "zamora",
                "albacete": "albacete",
                "ciudad_real": "ciudad_real",
                "cuenca": "cuenca",
                "guadalajara": "guadalajara",
                "toledo": "toledo",
                "badajoz": "badajoz",
                "caceres": "caceres",
                "barcelona": "barcelona",
                "girona": "girona",
                "lleida": "lleida",
                "tarragona": "tarragona",
                "alicante": "alicante",
                "castellon": "castellon",
                "valencia": "valencia",
                "eivissa_formentera": "eivissa_formentera",
                "mallorca": "mallorca",
                "menorca": "menorca",
                "almeria": "almeria",
                "cadiz": "cadiz",
                "cordoba": "cordoba",
                "granada": "granada",
                "huelva": "huelva",
                "jaen": "jaen",
                "malaga": "malaga",
                "sevilla": "sevilla",
                "murcia": "murcia",
                "ceuta": "ceuta",
                "melilla": "melilla",
                "gran_canaria": "gran_canaria",
                "tenerife": "tenerife",
                "el_hierro": "el_hierro",
                "fuerteventura": "fuerteventura",
                "la_gomera": "la_gomera",
                "la_palma": "la_palma",
                "lanzarote": "lanzarote"
          },
          "gebiete": {
                "coruna": {
                      "pp": 43.13,
                      "psoe": 28.17,
                      "vox": 5.08,
                      "sumar": 12.19,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 9.98,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "lugo": {
                      "pp": 50.24,
                      "psoe": 30.3,
                      "vox": 4.35,
                      "sumar": 5.18,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 8.66,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "ourense": {
                      "pp": 50.02,
                      "psoe": 30.08,
                      "vox": 4.87,
                      "sumar": 5.46,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 8.22,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "pontevedra": {
                      "pp": 39.72,
                      "psoe": 31.36,
                      "vox": 4.81,
                      "sumar": 13.19,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 9.39,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "asturias": {
                      "pp": 35.65,
                      "psoe": 34.34,
                      "vox": 12.49,
                      "sumar": 14.85,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "cantabria": {
                      "pp": 42.08,
                      "psoe": 33.3,
                      "vox": 14.06,
                      "sumar": 8.49,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "alava": {
                      "pp": 17.87,
                      "psoe": 27.66,
                      "vox": 3.89,
                      "sumar": 12.75,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 19.51,
                      "pnv": 16.6,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "gipuzkoa": {
                      "pp": 8.69,
                      "psoe": 23.29,
                      "vox": 2.09,
                      "sumar": 10.64,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 31.15,
                      "pnv": 22.58,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "bizkaia": {
                      "pp": 11.57,
                      "psoe": 25.82,
                      "vox": 2.64,
                      "sumar": 10.92,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 20.64,
                      "pnv": 26.93,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "navarra": {
                      "pp": 16.71,
                      "psoe": 27.37,
                      "vox": 5.7,
                      "sumar": 12.85,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 17.25,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 15.27,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "rioja": {
                      "pp": 45.64,
                      "psoe": 35.68,
                      "vox": 9.77,
                      "sumar": 6.57,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "huesca": {
                      "pp": 38.19,
                      "psoe": 33.62,
                      "vox": 12.64,
                      "sumar": 11.49,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "teruel": {
                      "pp": 35.02,
                      "psoe": 29.28,
                      "vox": 13.08,
                      "sumar": 5.44,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "zaragoza": {
                      "pp": 36.01,
                      "psoe": 30.82,
                      "vox": 15.3,
                      "sumar": 13.48,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "madrid": {
                      "pp": 40.55,
                      "psoe": 27.84,
                      "vox": 14.03,
                      "sumar": 15.46,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "avila": {
                      "pp": 43.25,
                      "psoe": 27.39,
                      "vox": 15.38,
                      "sumar": 5.13,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "burgos": {
                      "pp": 40.64,
                      "psoe": 34.45,
                      "vox": 12.77,
                      "sumar": 8.64,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "leon": {
                      "pp": 36.92,
                      "psoe": 33.64,
                      "vox": 12.88,
                      "sumar": 6.75,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "palencia": {
                      "pp": 41.98,
                      "psoe": 34.67,
                      "vox": 12.9,
                      "sumar": 6.06,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "salamanca": {
                      "pp": 46.87,
                      "psoe": 30.49,
                      "vox": 14.67,
                      "sumar": 5.53,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "segovia": {
                      "pp": 45.02,
                      "psoe": 30.6,
                      "vox": 14.12,
                      "sumar": 8.05,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "soria": {
                      "pp": 37.22,
                      "psoe": 29.48,
                      "vox": 9.81,
                      "sumar": 3.37,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "valladolid": {
                      "pp": 40.84,
                      "psoe": 32.75,
                      "vox": 15.16,
                      "sumar": 8.87,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "zamora": {
                      "pp": 44.67,
                      "psoe": 32.49,
                      "vox": 13.2,
                      "sumar": 5.65,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "albacete": {
                      "pp": 39.92,
                      "psoe": 34.51,
                      "vox": 16.61,
                      "sumar": 7.16,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "ciudad_real": {
                      "pp": 40.54,
                      "psoe": 35.37,
                      "vox": 16.27,
                      "sumar": 6.15,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "cuenca": {
                      "pp": 39.76,
                      "psoe": 37.37,
                      "vox": 15.55,
                      "sumar": 5.56,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "guadalajara": {
                      "pp": 36.33,
                      "psoe": 32.98,
                      "vox": 19.25,
                      "sumar": 9.16,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "toledo": {
                      "pp": 37.84,
                      "psoe": 32.56,
                      "vox": 19.64,
                      "sumar": 8.23,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "badajoz": {
                      "pp": 37.82,
                      "psoe": 39.21,
                      "vox": 13.66,
                      "sumar": 6.84,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "caceres": {
                      "pp": 38.0,
                      "psoe": 38.88,
                      "vox": 13.6,
                      "sumar": 6.93,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "barcelona": {
                      "pp": 13.78,
                      "psoe": 35.7,
                      "vox": 7.56,
                      "sumar": 15.22,
                      "erc": 12.32,
                      "junts": 9.68,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 3.77
                },
                "girona": {
                      "pp": 9.7,
                      "psoe": 28.93,
                      "vox": 7.03,
                      "sumar": 10.94,
                      "erc": 14.72,
                      "junts": 19.58,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 3.77
                },
                "lleida": {
                      "pp": 12.84,
                      "psoe": 29.49,
                      "vox": 6.81,
                      "sumar": 7.89,
                      "erc": 18.6,
                      "junts": 18.01,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 3.77
                },
                "tarragona": {
                      "pp": 13.87,
                      "psoe": 32.91,
                      "vox": 10.34,
                      "sumar": 11.34,
                      "erc": 15.07,
                      "junts": 11.08,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 3.77
                },
                "alicante": {
                      "pp": 36.73,
                      "psoe": 32.0,
                      "vox": 16.25,
                      "sumar": 12.88,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "castellon": {
                      "pp": 35.17,
                      "psoe": 32.65,
                      "vox": 15.88,
                      "sumar": 14.35,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "valencia": {
                      "pp": 33.64,
                      "psoe": 32.1,
                      "vox": 15.21,
                      "sumar": 16.9,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "eivissa_formentera": {
                      "pp": 35.63,
                      "psoe": 30.16,
                      "vox": 15.21,
                      "sumar": 16.59,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "mallorca": {
                      "pp": 35.63,
                      "psoe": 30.16,
                      "vox": 15.21,
                      "sumar": 16.59,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "menorca": {
                      "pp": 35.63,
                      "psoe": 30.16,
                      "vox": 15.21,
                      "sumar": 16.59,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "almeria": {
                      "pp": 40.94,
                      "psoe": 29.04,
                      "vox": 21.28,
                      "sumar": 6.69,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "cadiz": {
                      "pp": 34.8,
                      "psoe": 33.15,
                      "vox": 15.18,
                      "sumar": 12.89,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "cordoba": {
                      "pp": 37.89,
                      "psoe": 32.12,
                      "vox": 13.94,
                      "sumar": 13.73,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "granada": {
                      "pp": 36.99,
                      "psoe": 32.98,
                      "vox": 16.12,
                      "sumar": 11.65,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "huelva": {
                      "pp": 36.43,
                      "psoe": 35.95,
                      "vox": 14.63,
                      "sumar": 10.42,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "jaen": {
                      "pp": 37.32,
                      "psoe": 36.29,
                      "vox": 14.75,
                      "sumar": 7.99,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "malaga": {
                      "pp": 38.31,
                      "psoe": 30.34,
                      "vox": 16.46,
                      "sumar": 12.26,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "sevilla": {
                      "pp": 33.38,
                      "psoe": 36.6,
                      "vox": 13.32,
                      "sumar": 14.04,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 4.58,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "murcia": {
                      "pp": 41.18,
                      "psoe": 25.3,
                      "vox": 21.81,
                      "sumar": 9.57,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "ceuta": {
                      "pp": 38.77,
                      "psoe": 34.01,
                      "vox": 23.26,
                      "sumar": 2.46,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "melilla": {
                      "pp": 49.16,
                      "psoe": 25.39,
                      "vox": 15.94,
                      "sumar": 3.02,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 0.0,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "gran_canaria": {
                      "pp": 25.85,
                      "psoe": 33.19,
                      "vox": 14.61,
                      "sumar": 10.27,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 6.34,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "tenerife": {
                      "pp": 35.35,
                      "psoe": 33.49,
                      "vox": 0.0,
                      "sumar": 10.85,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 16.75,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "el_hierro": {
                      "pp": 35.35,
                      "psoe": 33.49,
                      "vox": 0.0,
                      "sumar": 10.85,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 16.75,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "fuerteventura": {
                      "pp": 25.85,
                      "psoe": 33.19,
                      "vox": 14.61,
                      "sumar": 10.27,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 6.34,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "la_gomera": {
                      "pp": 35.35,
                      "psoe": 33.49,
                      "vox": 0.0,
                      "sumar": 10.85,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 16.75,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "la_palma": {
                      "pp": 35.35,
                      "psoe": 33.49,
                      "vox": 0.0,
                      "sumar": 10.85,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 16.75,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                },
                "lanzarote": {
                      "pp": 25.85,
                      "psoe": 33.19,
                      "vox": 14.61,
                      "sumar": 10.27,
                      "erc": 0.0,
                      "junts": 0.0,
                      "bildu": 0.0,
                      "pnv": 0.0,
                      "bng": 0.0,
                      "cc": 6.34,
                      "upn": 0.0,
                      "aa": 0.0,
                      "podemos": 0.0,
                      "salf": 0.0,
                      "ac": 0.0
                }
          },
          "regionOf": {
                "coruna": "galicia",
                "lugo": "galicia",
                "ourense": "galicia",
                "pontevedra": "galicia",
                "asturias": "asturias",
                "cantabria": "cantabria",
                "alava": "pais_vasco",
                "gipuzkoa": "pais_vasco",
                "bizkaia": "pais_vasco",
                "navarra": "navarra",
                "rioja": "rioja",
                "huesca": "aragon",
                "teruel": "aragon",
                "zaragoza": "aragon",
                "madrid": "madrid",
                "avila": "castilla_y_leon",
                "burgos": "castilla_y_leon",
                "leon": "castilla_y_leon",
                "palencia": "castilla_y_leon",
                "salamanca": "castilla_y_leon",
                "segovia": "castilla_y_leon",
                "soria": "castilla_y_leon",
                "valladolid": "castilla_y_leon",
                "zamora": "castilla_y_leon",
                "albacete": "castilla_la_mancha",
                "ciudad_real": "castilla_la_mancha",
                "cuenca": "castilla_la_mancha",
                "guadalajara": "castilla_la_mancha",
                "toledo": "castilla_la_mancha",
                "badajoz": "extremadura",
                "caceres": "extremadura",
                "barcelona": "cataluna",
                "girona": "cataluna",
                "lleida": "cataluna",
                "tarragona": "cataluna",
                "alicante": "valenciana",
                "castellon": "valenciana",
                "valencia": "valenciana",
                "eivissa_formentera": "balears",
                "mallorca": "balears",
                "menorca": "balears",
                "almeria": "andalucia",
                "cadiz": "andalucia",
                "cordoba": "andalucia",
                "granada": "andalucia",
                "huelva": "andalucia",
                "jaen": "andalucia",
                "malaga": "andalucia",
                "sevilla": "andalucia",
                "murcia": "murcia",
                "ceuta": "ceuta",
                "melilla": "melilla",
                "gran_canaria": "canarias",
                "tenerife": "canarias",
                "el_hierro": "canarias",
                "fuerteventura": "canarias",
                "la_gomera": "canarias",
                "la_palma": "canarias",
                "lanzarote": "canarias"
          },
          "label": "Senate districts (59)",
          "partyNames": { "psoe": "SDP" },
          "partyColors": { "psoe": "#FF4D00" },
          "partyLogos": { "psoe": "img/es/SDP.svg" },
          "national2021": {
                "pp": 33.06,
                "psoe": 31.68,
                "vox": 12.38,
                "sumar": 12.33,
                "erc": 1.89,
                "junts": 1.6,
                "bildu": 1.36,
                "pnv": 1.12,
                "bng": 0.62,
                "cc": 0.47,
                "upn": 0.21,
                "aa": 0.83,
                "podemos": 0.0,
                "salf": 0.0,
                "ac": 0.58, "compromis": 0, "d21": 0 }
    },
    lastElection: {
      date: '2023-07-23',
      // 2023 general election official result (Congress; Sumar includes Podemos)
      results: {
              "pp": 33.06,
              "psoe": 31.68,
              "vox": 12.38,
              "sumar": 12.33,
              "erc": 1.89,
              "junts": 1.6,
              "bildu": 1.36,
              "pnv": 1.12,
              "bng": 0.62,
              "cc": 0.47,
              "upn": 0.21,
              "aa": 0.83,
              "podemos": 0.0,
              "ac": 0.58
      },
      seats: {
              "pp": 137,
              "psoe": 121,
              "vox": 33,
              "sumar": 31,
              "erc": 7,
              "junts": 7,
              "bildu": 6,
              "pnv": 5,
              "bng": 1,
              "cc": 1,
              "upn": 1
      },
    },
    map: {},
    pollsterMAE: {},
    maeKey: 'ES2023',
    logos: { compromis: 'img/es/COMPROMIS.svg', d21: 'img/es/D21.svg',
      pp: 'img/es/PP.svg', psoe: 'img/es/PSOE.svg', vox: 'img/es/VOX.svg',
      sumar: 'img/es/SUMAR.svg', erc: 'img/es/ERC.svg', junts: 'img/es/JUNTS.svg',
      bildu: 'img/es/EHBildu.svg', pnv: 'img/es/EAJPNV.svg', bng: 'img/es/BNG.svg',
      cc: 'img/es/CC.svg', upn: 'img/es/UPN.svg', aa: 'img/es/AA.svg',
      podemos: 'img/es/PODEMOS.svg', salf: 'img/es/SALF.svg', ac: 'img/es/AC.svg',
    },
  },
  greece: {
    name: 'Greece',
    name_tr: 'Yunanistan',
    seats: 300,
    threshold: 3.0,
    method: 'hare_niemeyer',      // proportional part: Hare quota + remainders
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      nd:     { code: 'ND',      name: 'New Democracy',                    name_en: 'New Democracy',                    color: '#1B5CC7', ideology: "Liberal conservatism, Christian democracy"},
      syriza: { code: 'SYRIZA',  name: 'Coalition of the Radical Left',    name_en: 'Coalition of the Radical Left',    color: '#EE808F', ideology: "Social democracy, Progressivism"},
      pasok:  { code: 'PASOK',   name: 'PASOK – Movement for Change',      name_en: 'PASOK – Movement for Change',      color: '#01783D', ideology: "Social democracy, Pro-Europeanism, Social liberalism"},
      kke:    { code: 'KKE',     name: 'Communist Party of Greece',        name_en: 'Communist Party of Greece',        color: '#E30301', ideology: "Communism, Marxism-Leninism, Social conservatism"},
      sp:     { code: 'SP',      name: 'Spartans',                         name_en: 'Spartans',                         color: '#E9B460', ideology: "Neo-fascism, Ultranationalism, Ultraconservatism", pastOnly: true },
      se:      { code: 'SE',      name: 'Spartans Successor',                          name_en: 'Spartans Successor',                          color: '#1C2971',                          ideology: "Ultranationalism, Right-wing populism" },
      el:     { code: 'EL',      name: 'Greek Solution',                   name_en: 'Greek Solution',                   color: '#6BB6E6', ideology: "Ultranationalism, National conservatism, Right-wing populism"},
      niki:   { code: 'NIKI',    name: 'Victory',                          name_en: 'Victory',                          color: '#910048', ideology: "Ultraconservatism, National conservatism"},
      pe:     { code: 'PE',      name: 'Course of Freedom',                name_en: 'Course of Freedom',                color: '#9F1897', ideology: "Left-wing nationalism, Sovereigntism, Anti-austerity"},
      m25:    { code: 'M25',     name: 'MeRA25',                           name_en: 'MeRA25',                           color: '#EF3F24', ideology: "Anti-austerity, Syndicalism, Market socialism"},
      fl:     { code: 'FL',      name: 'Voice of Reason',                  name_en: 'Voice of Reason',                  color: '#020C6A', ideology: "Ultranationalism, Ultraconservatism, Euroscepticism"},
      na:     { code: 'NA',      name: 'New Left',                         name_en: 'New Left',                         color: '#E11B22', ideology: "Democratic socialism"},
      dpk:    { code: 'DPK',     name: 'Movement for Democracy',           name_en: 'Movement for Democracy',           color: '#531BA0', ideology: "Pan-Europeanism, Post-capitalism, Progressivism"},
      elpida: { code: 'ELPIDA',  name: 'Hope for Democracy',               name_en: 'Hope for Democracy',               color: '#E0B959', ideology: "Centrism, Anti-corruption, Social justice"},
      elas:   { code: 'ELAS',    name: 'Greek Left Alliance',              name_en: 'Greek Left Alliance',              color: '#A40044', ideology: "Social democracy, Progressivism"},
    },
    order: ['nd', 'syriza', 'pasok', 'kke', 'sp', 'se', 'el', 'niki', 'pe', 'm25', 'fl', 'na', 'dpk', 'elpida', 'elas'],
    parlOrder: ['kke', 'elas', 'na', 'syriza', 'pe', 'm25', 'dpk', 'pasok', 'elpida', 'nd', 'fl', 'el', 'niki', 'sp', 'se'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['nd'], color: '#0D5EAF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['syriza', 'pasok', 'kke', 'sp', 'el', 'niki', 'pe', 'm25', 'fl', 'na', 'dpk', 'elpida', 'elas'], color: '#C4262E' },
    },
    lastElection: {
      date: '2023-06-25',
      // June 2023 official result (bonus law: ND 40.56% -> 50 bonus seats)
      results: {
              "nd": 40.56,
              "syriza": 17.83,
              "pasok": 11.84,
              "kke": 7.69,
              "sp": 4.68,
              "el": 4.44,
              "niki": 3.69,
              "pe": 3.17,
              "m25": 2.5,
              "fl": 0,
              "na": 0,
              "dpk": 0,
              "elpida": 0,
              "elas": 0
      },
      seats: {
              "nd": 158,
              "syriza": 47,
              "pasok": 32,
              "kke": 21,
              "sp": 12,
              "el": 12,
              "niki": 10,
              "pe": 8,
              "m25": 0,
              "fl": 0,
              "na": 0,
              "dpk": 0,
              "elpida": 0,
              "elas": 0
      },
    },
    map: {},    pollsterMAE: {},
    maeKey: 'GR2023',
    logos: {
      nd: 'img/gr/ND.svg', syriza: 'img/gr/SYRIZA.svg', pasok: 'img/gr/PASOK.svg',
      kke: 'img/gr/KKE.svg', sp: 'img/gr/SP.svg', se: 'img/gr/SE.svg', el: 'img/gr/EL.svg',
      niki: 'img/gr/NIKI.svg', pe: 'img/gr/PE.svg', m25: 'img/gr/M25.svg',
      fl: 'img/gr/FL.svg', na: 'img/gr/NA.svg', dpk: 'img/gr/DPK.svg',
      elpida: 'img/gr/ELPIDA.svg', elas: 'img/gr/ELAS.svg',
    },
  },
  italy: {
    name: 'Italy',
    name_tr: 'İtalya',
    seats: 400,
    threshold: 3.0,
    method: 'dhondt',             // national PR pool (Rosatellum)
    mixedFptp: true,              // legacy: the 2022 collegio map layer (Stabilicum allocates proportionally)
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // 147 FPTP districts (single-member)
    constituencyRule: 'fptp',
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
      fdi:  { code: 'FdI',   name: 'Fratelli d\'Italia',            name_en: 'Brothers of Italy',             color: '#03386A', ideology: "National conservatism, Right-wing populism, Post-fascism"},
      pd:   { code: 'PD',    name: 'Partito Democratico',           name_en: 'Democratic Party',              color: '#EF1C27', ideology: "Social democracy"},
      m5s:  { code: 'M5S',   name: 'Movimento 5 Stelle',            name_en: 'Five Star Movement',            color: '#FFEB3B', ideology: "Populism, Green politics"},
      lega: { code: 'Lega',  name: 'Lega per Salvini Premier',      name_en: 'League for Salvini Premier',    color: '#008000', ideology: "Right-wing populism, Regionalism, Federalism"},
      fi:   { code: 'FI',    name: 'Forza Italia',                  name_en: 'Forza Italia',                  color: '#0087DC', ideology: "Liberal conservatism, Christian democracy, Populism"},
      a:    { code: 'A',     name: 'Azione',                        name_en: 'Action',                        color: '#0039AA', ideology: "Liberal socialism, Social liberalism, Radicalism"},
      iv:   { code: 'IV',    name: 'Italia Viva',                   name_en: 'Italia Viva',                   color: '#D6418C', ideology: "Liberalism (Italy)"},
      avs:  { code: 'AVS',   name: 'Alleanza Verdi e Sinistra',     name_en: 'Greens and Left Alliance',      color: '#BE3457', ideology: "Democratic socialism, Green politics"},
      e:    { code: '+E',    name: '+Europa',                       name_en: 'More Europe',                   color: '#0073B9', ideology: "Liberalism (Italian), Pro-Europeanism"},
      nm:   { code: 'NM',    name: 'Noi Moderati',                  name_en: 'Us Moderates',                  color: '#43528F', ideology: "Liberal conservatism, Christian democracy"},
      svp:  { code: 'SVP',   name: 'Südtiroler Volkspartei',         name_en: 'South Tyrolean People\'s Party', color: '#231F20', ideology: "Regionalism, Christian democracy"},
      scn:       { code: 'ScN',   name: 'Sud chiama Nord',              name_en: 'South calls North',             color: '#F2AB14', ideology: "Regionalism, Populism"},
      uv:        { code: 'UV',    name: 'Union Valdôtaine',             name_en: 'Valdostan Union',               color: '#5EABD1', ideology: "Regionalism, Autonomism"},
      fn:   { code: 'FN',    name: 'Futuro Nazionale',              name_en: 'National Future',               color: '#20293D', ideology: "Ultranationalism, Ultraconservatism, Right-wing populism"},
    },
    order: ['fdi', 'pd', 'm5s', 'lega', 'fi', 'a', 'iv', 'avs', 'e', 'nm', 'fn', 'scn', 'svp', 'uv'],
    // Senate: same ballot, Rosatellum with 74 single-member + 126
    // regional-list seats. Modelled by scaling the Chamber's collegio
    // win-rate to 74 and allocating 126 proportionally - the Senate's own
    // boundaries and regional lists differ, so the card labels it an
    // approximation.
    // Senate's own 74 single-member districts (d.lgs.
    // 177/2020) + 126 PR seats - built by
    // scraper/build_italy_senate.py.
    senate: {
          "svg": "img/italy_senate.svg",
          "selector": "id",
          "districts": {
                "100001": "100001",
                "10001": "10001",
                "10002": "10002",
                "10003": "10003",
                "10004": "10004",
                "10005": "10005",
                "110001": "110001",
                "110002": "110002",
                "120001": "120001",
                "120002": "120002",
                "120003": "120003",
                "120004": "120004",
                "120005": "120005",
                "120006": "120006",
                "130001": "130001",
                "140001": "140001",
                "150001": "150001",
                "150002": "150002",
                "150003": "150003",
                "150004": "150004",
                "150005": "150005",
                "150006": "150006",
                "150007": "150007",
                "160001": "160001",
                "160002": "160002",
                "160003": "160003",
                "160004": "160004",
                "160005": "160005",
                "170001": "170001",
                "180001": "180001",
                "180002": "180002",
                "190001": "190001",
                "190002": "190002",
                "190003": "190003",
                "190004": "190004",
                "190005": "190005",
                "190006": "190006",
                "200001": "200001",
                "200002": "200002",
                "20001": "20001",
                "30001": "30001",
                "30002": "30002",
                "30003": "30003",
                "30004": "30004",
                "30005": "30005",
                "30006": "30006",
                "30007": "30007",
                "30008": "30008",
                "30009": "30009",
                "30010": "30010",
                "30011": "30011",
                "40001": "40001",
                "40002": "40002",
                "40003": "40003",
                "40004": "40004",
                "40005": "40005",
                "40006": "40006",
                "50001": "50001",
                "50002": "50002",
                "50003": "50003",
                "50004": "50004",
                "50005": "50005",
                "60001": "60001",
                "70001": "70001",
                "70002": "70002",
                "80001": "80001",
                "80002": "80002",
                "80003": "80003",
                "80004": "80004",
                "80005": "80005",
                "90001": "90001",
                "90002": "90002",
                "90003": "90003",
                "90004": "90004"
          },
          "winners2021": {
                "100001": "fdi",
                "10001": "pd",
                "10002": "fdi",
                "10003": "fdi",
                "10004": "fdi",
                "10005": "fdi",
                "110001": "fdi",
                "110002": "fdi",
                "120001": "fdi",
                "120002": "fdi",
                "120003": "fdi",
                "120004": "fdi",
                "120005": "fdi",
                "120006": "fdi",
                "130001": "fdi",
                "140001": "fdi",
                "150001": "fdi",
                "150002": "fdi",
                "150003": "fdi",
                "150004": "other",
                "150005": "other",
                "150006": "other",
                "150007": "other",
                "160001": "fdi",
                "160002": "fdi",
                "160003": "fdi",
                "160004": "fdi",
                "160005": "fdi",
                "170001": "fdi",
                "180001": "fdi",
                "180002": "fdi",
                "190001": "other",
                "190002": "fdi",
                "190003": "fdi",
                "190004": "fdi",
                "190005": "fdi",
                "190006": "other",
                "200001": "fdi",
                "200002": "fdi",
                "20001": "uv",
                "30001": "fdi",
                "30002": "fdi",
                "30003": "pd",
                "30004": "fdi",
                "30005": "fdi",
                "30006": "fdi",
                "30007": "fdi",
                "30008": "fdi",
                "30009": "fdi",
                "30010": "fdi",
                "30011": "fdi",
                "40001": "other",
                "40002": "other",
                "40003": "other",
                "40004": "other",
                "40005": "other",
                "40006": "other",
                "50001": "fdi",
                "50002": "fdi",
                "50003": "fdi",
                "50004": "fdi",
                "50005": "fdi",
                "60001": "fdi",
                "70001": "fdi",
                "70002": "fdi",
                "80001": "fdi",
                "80002": "pd",
                "80003": "pd",
                "80004": "fdi",
                "80005": "fdi",
                "90001": "fdi",
                "90002": "fdi",
                "90003": "fdi",
                "90004": "pd"
          },
          "regionOf": {
                "100001": "umbria",
                "10001": "piemonte",
                "10002": "piemonte",
                "10003": "piemonte",
                "10004": "piemonte",
                "10005": "piemonte",
                "110001": "marche",
                "110002": "marche",
                "120001": "lazio",
                "120002": "lazio",
                "120003": "lazio",
                "120004": "lazio",
                "120005": "lazio",
                "120006": "lazio",
                "130001": "abruzzo",
                "140001": "molise",
                "150001": "campania",
                "150002": "campania",
                "150003": "campania",
                "150004": "campania",
                "150005": "campania",
                "150006": "campania",
                "150007": "campania",
                "160001": "puglia",
                "160002": "puglia",
                "160003": "puglia",
                "160004": "puglia",
                "160005": "puglia",
                "170001": "basilicata",
                "180001": "calabria",
                "180002": "calabria",
                "190001": "sicilia",
                "190002": "sicilia",
                "190003": "sicilia",
                "190004": "sicilia",
                "190005": "sicilia",
                "190006": "sicilia",
                "200001": "sardegna",
                "200002": "sardegna",
                "20001": "valle_d_aosta",
                "30001": "lombardia",
                "30002": "lombardia",
                "30003": "lombardia",
                "30004": "lombardia",
                "30005": "lombardia",
                "30006": "lombardia",
                "30007": "lombardia",
                "30008": "lombardia",
                "30009": "lombardia",
                "30010": "lombardia",
                "30011": "lombardia",
                "40001": "trentino_alto_adige",
                "40002": "trentino_alto_adige",
                "40003": "trentino_alto_adige",
                "40004": "trentino_alto_adige",
                "40005": "trentino_alto_adige",
                "40006": "trentino_alto_adige",
                "50001": "veneto",
                "50002": "veneto",
                "50003": "veneto",
                "50004": "veneto",
                "50005": "veneto",
                "60001": "friuli_venezia_giulia",
                "70001": "liguria",
                "70002": "liguria",
                "80001": "emilia_romagna",
                "80002": "emilia_romagna",
                "80003": "emilia_romagna",
                "80004": "emilia_romagna",
                "80005": "emilia_romagna",
                "90001": "toscana",
                "90002": "toscana",
                "90003": "toscana",
                "90004": "toscana"
          },
          "useConstituencies": true,
          "senateStore": true,
          "national2021": {
                "fdi": 26.0,
                "pd": 18.93,
                "m5s": 15.55,
                "lega": 8.84,
                "fi": 8.27,
                "a": 4.42,
                "iv": 3.31,
                "avs": 3.53,
                "e": 2.94,
                "nm": 0.9,
                "fn": 0.0,
                "svp": 0, "scn": 1.1, "uv": 0.1
          },
          "label": "Senate districts (74)"
    },
    upper: { label: 'Senate', seats: 200, fptp: 74 },
    // Stabilicum (L. 180/2026, in force 24 Oct 2026): proportional with the
    // 3%/10% thresholds and a FIXED 70-deputy / 35-senator bonus for the
    // list or coalition at or above 42% in both chambers, capped 220/113
    stabilicum: { bonus: 70, cap: 220, minBonus: 42, coalitionThreshold: 10, senateBonus: 35, senateCap: 113 },
    // FN has no 2022 geography of its own: borrow a 50/50 mix of the FdI and
    // Lega regional patterns (Vannacci ex-Lega, FdI-leaning electorate)
    swingProxy: { fn: [['fdi', 0.5], ['lega', 0.5]] },
    parlOrder: ['avs', 'pd', 'm5s', 'a', 'iv', 'e', 'nm', 'fi', 'lega', 'fdi', 'fn', 'scn', 'svp', 'uv'],
    // coalitions: every member's votes count toward the Stabilicum 42% bonus
    blocs: {
      bloc1: { name: 'Centre-right coalition', short: 'CDX', parties: ['fdi', 'lega', 'fi', 'nm', 'scn'], color: '#1B4F9C' },
      bloc2: { name: 'Centre-left coalition',  short: 'CSX', parties: ['pd', 'm5s', 'avs', 'iv', 'e'], color: '#E4002B' },
    },
    lastElection: {
      date: '2022-09-25',
      // 2022 general election, Chamber of Deputies (official)
      results: {
              "fdi": 25.98,
              "lega": 8.79,
              "fi": 8.11,
              "nm": 0.9,
              "pd": 19.04,
              "avs": 3.64,
              "e": 2.83,
              "m5s": 15.43,
              "a": 4.45,
              "iv": 3.33,
              "svp": 0.3
      },
      seats: {
              "fdi": 119,
              "pd": 69,
              "m5s": 52,
              "lega": 66,
              "fi": 45,
              "a": 12,
              "iv": 9,
              "avs": 12,
              "e": 2,
              "nm": 7,
              "fn": 0,
              "svp": 3
      },
    },
    map: {},
    map2: {},
    pollsterMAE: {},
    maeKey: 'IT2022',
    logos: {
      fdi: 'img/it/FDI.svg', pd: 'img/it/PD.svg', m5s: 'img/it/M5S.svg',
      lega: 'img/it/LEGA.svg', fi: 'img/it/FI.svg', a: 'img/it/A.svg',
      iv: 'img/it/IV.svg', avs: 'img/it/AVS.svg', e: 'img/it/E.svg',
      nm: 'img/it/NM.svg', fn: 'img/it/FN.svg',     svp: 'img/it/SVP.svg', scn: 'img/it/SCN.svg', uv: 'img/it/UV.svg',
    },
  },
  jp: {
    name: 'Japan',
    name_tr: 'Japonya',
    seats: 465,                   // 289 single-member districts + 176 PR in 11 blocs
    threshold: 0.0,               // no PR threshold
    method: 'dhondt',             // PR tier: D'Hondt in each of the 11 blocs
    seatBased: false,
    constituencies: false,        // the district tier reads the map's winnerDistricts
    recencyHalfLifeDays: 30,
    defaultDays: 90,              // the voting-intention tables are monthly
    parties: {
      ldp:     { code: 'LDP',     name: '\u81ea\u7531\u6c11\u4e3b\u515a', name_en: 'Liberal Democratic Party (Japan)', color: '#D7003A', ideology: "Conservatism, Japanese nationalism" },
      cra:     { code: 'DRP',     name: '民主改革の会', name_en: 'Democratic Reform Party (Japan, 2026)', color: '#106DAE', ideology: "Social liberalism, Centrism" },
      ishin:   { code: 'Ishin',   name: '\u65e5\u672c\u7dad\u65b0\u306e\u4f1a', name_en: 'Japan Innovation Party', color: '#B8CE43', ideology: "Conservatism, Right-wing populism, Economic liberalism" },
      dpfp:    { code: 'DPFP',    name: '\u56fd\u6c11\u6c11\u4e3b\u515a', name_en: 'Democratic Party For the People', color: '#FFBA00', ideology: "Conservatism, Populism" },
      sansei:  { code: 'Sansei',  name: '参政党', name_en: 'Sanseitō', color: '#EE7300', ideology: "Social conservatism, Right-wing populism" },
      mirai:   { code: 'Mirai',   name: '\u30c1\u30fc\u30e0\u307f\u3089\u3044', name_en: 'Team Mirai', color: '#84E6D5', ideology: "Centrism, Progressivism" },
      jcp:     { code: 'JCP',     name: '\u65e5\u672c\u5171\u7523\u515a', name_en: 'Japanese Communist Party', color: '#CC0099', ideology: "Communism, Democratic socialism" },
      reiwa:   { code: 'Life',    name: 'いのちの党', name_en: 'Party of Life (Japan)', color: '#ED008C', ideology: "Left-wing populism, Progressivism" },
      cdp:     { code: 'CDP',     name: '\u7acb\u61b2\u6c11\u4e3b\u515a', name_en: 'Constitutional Democratic Party of Japan', color: '#004098', ideology: "Social liberalism, Social democracy" },
      komei:   { code: 'Komei',   name: '\u516c\u660e\u515a', name_en: 'Komeito', color: '#F95580', ideology: "Buddhist democracy, Social conservatism" },
      cpj:     { code: 'CPJ',     name: '\u65e5\u672c\u4fdd\u5b88\u515a', name_en: 'Conservative Party of Japan', color: '#0A82DC', ideology: "National conservatism, Right-wing populism" },
      sdp:     { code: 'SDP',     name: '\u793e\u4f1a\u6c11\u4e3b\u515a', name_en: 'Social Democratic Party (Japan)', color: '#3D9BE7', ideology: "Social democracy, Democratic socialism" },
    },
    order: ['ldp', 'cra', 'ishin', 'dpfp', 'sansei', 'mirai', 'jcp', 'reiwa', 'cdp', 'komei', 'cpj', 'sdp'],
    parlOrder: ['jcp', 'reiwa', 'sdp', 'cdp', 'cra', 'dpfp', 'mirai', 'komei', 'ldp', 'ishin', 'sansei', 'cpj'],
    // LDP won 316 of 465 (a two-thirds majority) in the February 2026 snap
    // election and governs alone
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ldp'], color: '#C70015' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['cra', 'ishin', 'dpfp', 'sansei', 'mirai', 'jcp', 'reiwa', 'cdp', 'komei', 'cpj', 'sdp'], color: '#1B4FA0' },
    },
    coalitions: [
      { name: 'LDP', parties: ['ldp'] },
      { name: 'LDP + Ishin', parties: ['ldp', 'ishin'] },
      { name: 'LDP + Komei + Ishin', parties: ['ldp', 'komei', 'ishin'] },
      { name: 'CRA + DPFP + CDP + Reiwa + SDP + JCP', parties: ['cra', 'dpfp', 'cdp', 'reiwa', 'sdp', 'jcp'] },
    ],
    lastElection: {
      date: '2026-02-08',
      // national PR shares; the smaller parties' 2026 PR shares are not in
      // the sources (they won no bloc seats)
      results: { ldp: 36.72, cra: 18.23, dpfp: 9.73, ishin: 8.63, sansei: 7.44, mirai: 6.66, jcp: 4.40, reiwa: 2.92, cdp: 0, komei: 0, cpj: 0, sdp: 0 },
      seats:   { ldp: 316, cra: 49, ishin: 36, dpfp: 28, sansei: 15, mirai: 11, jcp: 4, reiwa: 1 },
    },
    map: {},
    pollsterMAE: {
      "Kyodo News": { JP2030: 2.9, overall: 2.9 },
      "Senkyo.com/JX": { JP2030: 1.31, overall: 1.31 }
    },
    maeKey: 'JP2030',
    logos: {
      ldp: 'img/jp/LDP.svg', cra: 'img/jp/DRP.svg', ishin: 'img/jp/ISHIN.svg',
      dpfp: 'img/jp/DPFP.svg', sansei: 'img/jp/SANSEITO.svg', mirai: 'img/jp/MIRAI.svg',
      jcp: 'img/jp/JCP.svg', reiwa: 'img/jp/LIFE.svg', cdp: 'img/jp/CDP.svg',
      komei: 'img/jp/KOMEITO.svg', cpj: 'img/jp/CPJ.svg', sdp: 'img/jp/SDP.svg',
    },
  },

  kr: {
    name: 'South Korea',
    name_tr: 'Güney Kore',
    seats: 300,                   // 254 single-member districts + 46 national PR
    threshold: 3.0,               // proportional tier threshold (2024: 3%)
    // PR tier: national D'Hondt. The real 2024 system was semi-linked
    // (junyeondonghyeong) with satellite lists; the 46 seats are modelled as
    // a plain national pool and the satellites are folded into their parents
    // (Democratic Alliance 14 -> DPK, People Future Party 18 -> PPP).
    method: 'dhondt',
    seatBased: false,
    constituencies: false,        // the district tier reads the map's winnerDistricts
    recencyHalfLifeDays: 30,
    defaultDays: 90,              // the support tables are dense but bursty
    parties: {
      dpk:  { code: 'DPK',  name: '더불어민주당', name_en: 'Democratic Party (South Korea)', color: '#152484', ideology: "Liberalism, Social liberalism" },
      ppp:  { code: 'PPP',  name: '국민의힘', name_en: 'People Power Party', color: '#E61E2B', ideology: "Conservatism, Right-wing populism" },
      rkp:  { code: 'RKP',  name: '조국혁신당', name_en: 'Rebuilding Korea Party', color: '#2773BA', ideology: "Liberalism, Progressivism" },
      pp:   { code: 'PP',   name: '진보당', name_en: 'Progressive Party (South Korea)', color: '#D6001C', ideology: "Progressivism, Democratic socialism" },
      rp:   { code: 'RP',   name: '개혁신당', name_en: 'Reform Party (South Korea)', color: '#ED6C00', ideology: "Conservatism, Economic liberalism" },
      nfp:  { code: 'NFP',  name: '새로운미래민주당', name_en: 'New Future Democratic Party', color: '#45BABD', ideology: "Centrist reformism, Liberalism" },
      bip:  { code: 'BIP',  name: '기본소득당', name_en: 'Basic Income Party', color: '#00D2C3', ideology: "Universal basic income, Progressivism" },
      sdp:  { code: 'SDP',  name: '사회민주당', name_en: 'Social Democratic Party (South Korea)', color: '#F58400', ideology: "Social democracy" },
    },
    order: ['dpk', 'ppp', 'rkp', 'rp', 'pp', 'nfp', 'bip', 'sdp'],
    parlOrder: ['pp', 'sdp', 'bip', 'rkp', 'dpk', 'nfp', 'rp', 'ppp'],
    // the DPK holds the presidency and the assembly majority; per the source
    // article every other party sits in opposition
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['dpk'], color: '#152484' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['ppp', 'rkp', 'pp', 'rp', 'nfp', 'bip', 'sdp'], color: '#E61E2B' },
    },
    coalitions: [
      { name: 'DPK', parties: ['dpk'] },
      { name: 'DPK + RKP + PP', parties: ['dpk', 'rkp', 'pp'] },
      { name: 'PPP', parties: ['ppp'] },
      { name: 'PPP + RP', parties: ['ppp', 'rp'] },
    ],
    lastElection: {
      date: '2024-04-10',
      // national proportional (regional) vote shares; PP and BIP/SDP ran no
      // 2024 PR list of their own (their members sat on the Democratic
      // Alliance list), so their PR anchor is 0
      results: { dpk: 26.70, ppp: 36.67, rkp: 24.25, rp: 3.62, pp: 0, nfp: 1.71, bip: 0, sdp: 0 },
      // final seats with the satellites folded in (sums to 300)
      seats:   { dpk: 175, ppp: 108, rkp: 12, rp: 3, pp: 1, nfp: 1, bip: 0, sdp: 0 },
    },
    map: {},
    pollsterMAE: {
      "Embrain Public / YTN": { KR2028: 5.65, overall: 5.65 },
      "Embrain Public, KStat Research, Korea Research, Hankook Research": { KR2028: 5.5, overall: 5.5 },
      "Everyresearch / NewsSpirit": { KR2028: 3.9, overall: 3.9 },
      "Flower Research": { KR2028: 3.83, overall: 3.83 },
      "Gallup Korea": { KR2028: 2.44, overall: 2.44 },
      "Gallup Korea / Seoul Economic Daily": { KR2028: 4.61, overall: 4.61 },
      "Gongjung / Dailian": { KR2028: 3.68, overall: 3.68 },
      "Gongjung / Fntoday, The Public": { KR2028: 3.36, overall: 3.36 },
      "Hankook Research / KBS": { KR2028: 4.57, overall: 4.57 },
      "Jowon C&I / Straight News": { KR2028: 4.14, overall: 4.14 },
      "JowonC&I / Straight News": { KR2028: 3.26, overall: 3.26 },
      "Korea Research / MBC": { KR2028: 4.46, overall: 4.46 },
      "Media Research / Newspim": { KR2028: 2.97, overall: 2.97 },
      "Media Tomato / News Tomato": { KR2028: 3.56, overall: 3.56 },
      "Meta Voice / JTBC": { KR2028: 5.73, overall: 5.73 },
      "Metrix / Yonhap News": { KR2028: 6.07, overall: 6.07 },
      "Realmeter / EKN": { KR2028: 4.52, overall: 4.52 },
      "Research view": { KR2028: 4.24, overall: 4.24 },
      "Rnsearch": { KR2028: 2.51, overall: 2.51 },
      "Rnsearch / Asia Today": { KR2028: 2.57, overall: 2.57 }
    },
    maeKey: 'KR2028',
    logos: {
      dpk: 'img/kr/DPK.svg', ppp: 'img/kr/PPP.svg', rkp: 'img/kr/RKP.svg',
      pp: 'img/kr/PP.svg', rp: 'img/kr/RP.svg', bip: 'img/kr/BIP.svg',
      sdp: 'img/kr/SDP.svg',
    },
  },

  hr: {
    name: 'Croatia',
    name_tr: 'Hırvatistan',
    seats: 151,                   // 140 (10 districts x 14) + 3 diaspora + 8 minorities
    threshold: 5.0,               // 5% per electoral district
    districtThreshold: true,      // the threshold applies in each district
    method: 'dhondt',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 30,
    defaultDays: 90,
    // the 8 minority seats are structurally reserved (SDSS 3 + 5 others);
    // modelled as a fixed Other allocation
    reservedSeats: { other: 8 },
    parties: {
      hdz:    { code: 'HDZ',    name: 'Hrvatska demokratska zajednica', name_en: 'Croatian Democratic Union', color: '#005BAA', ideology: "Conservatism, Christian democracy" },
      sdp:    { code: 'SDP',    name: 'Socijaldemokratska partija Hrvatske', name_en: 'Social Democratic Party of Croatia', color: '#ED1C24', ideology: "Social democracy, Social liberalism" },
      mozemo: { code: 'Možemo!', name: 'Možemo!', name_en: 'We Can! (Croatia)', color: '#C3D746', ideology: "Green politics, Eco-socialism, Progressivism" },
      most:   { code: 'MOST',   name: 'Most', name_en: 'The Bridge (Croatia)', color: '#E85726', ideology: "Social conservatism, Christian democracy" },
      dp:     { code: 'DP',     name: 'Domovinski pokret', name_en: 'Homeland Movement (Croatia)', color: '#A5A5A5', ideology: "Croatian nationalism, Right-wing populism" },
      drito:  { code: 'Drito',  name: 'Drito', name_en: 'Drito (political party)', color: '#2C8C8C', ideology: "Centrism, Anti-corruption" },
      hsu:    { code: 'HSU',    name: 'Hrvatska stranka umirovljenika', name_en: 'Croatian Party of Pensioners', color: '#004B88', ideology: "Pensioners' interests, Social liberalism" },
      hs:     { code: 'HS',     name: 'Hrvatski suverenisti', name_en: 'Croatian Sovereignists', color: '#033E7C', ideology: "National conservatism, Sovereigntism" },
      centar: { code: 'Centar', name: 'Centar', name_en: 'Centre (Croatian political party)', color: '#2D7AB0', ideology: "Social liberalism, Centrism" },
      domino: { code: 'DOMiNO', name: 'Dom i nacionalno okupljanje', name_en: 'Home and National Rally', color: '#17194C', ideology: "Croatian nationalism, Right-wing populism" },
      ids:    { code: 'IDS',    name: 'Istarski demokratski sabor', name_en: 'Istrian Democratic Assembly', color: '#0CB14B', ideology: "Istrian regionalism, Social liberalism" },
      fokus:  { code: 'Fokus',  name: 'Fokus', name_en: 'Focus (Croatian political party)', color: '#05AACB', ideology: "Classical liberalism, Liberalism" },
      hss:    { code: 'HSS',    name: 'Hrvatska seljačka stranka', name_en: 'Croatian Peasant Party', color: '#02B14B', ideology: "Agrarianism, Christian democracy" },
      hns:    { code: 'HNS',    name: 'Hrvatska narodna stranka – liberalni demokrati', name_en: "Croatian People's Party – Liberal Democrats", color: '#FF931E', ideology: "Social liberalism, Pro-Europeanism" },
      nps:    { code: 'NPS',    name: 'Neovisna platforma Sjever', name_en: 'Independent Platform of the North', color: '#2C9180', ideology: "Regionalism, Centrism" },
      pip:    { code: 'PiP',    name: 'Pravo i Pravda', name_en: 'Law and Justice (Croatia)', color: '#203D71', ideology: "Croatian nationalism, Right-wing populism" },
      rf:     { code: 'RF',     name: 'Radnička fronta', name_en: "Workers' Front (Croatia)", color: '#CC0000', ideology: "Democratic socialism, Left-wing populism" },
    },
    order: ['hdz', 'sdp', 'mozemo', 'most', 'dp', 'drito', 'hsu', 'hs', 'centar', 'domino', 'ids', 'fokus', 'hss', 'hns', 'nps', 'pip', 'rf'],
    parlOrder: ['rf', 'sdp', 'mozemo', 'hsu', 'hns', 'hss', 'centar', 'ids', 'nps', 'drito', 'fokus', 'most', 'hdz', 'hs', 'dp', 'domino', 'pip'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['hdz', 'dp'], color: '#2E5DA3' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['sdp', 'mozemo', 'most', 'drito', 'hsu', 'hs', 'centar', 'domino', 'ids', 'fokus', 'hss', 'hns', 'nps', 'pip', 'rf'], color: '#ED1C24' },
    },
    coalitions: [
      { name: 'HDZ + DP', parties: ['hdz', 'dp'] },
      { name: 'HDZ + DP + MOST', parties: ['hdz', 'dp', 'most'] },
      { name: 'SDP + Možemo + Centar + HSS', parties: ['sdp', 'mozemo', 'centar', 'hss'] },
      { name: 'SDP + Možemo + MOST', parties: ['sdp', 'mozemo', 'most'] },
    ],
    lastElection: {
      date: '2024-04-17',
      // national shares of the 2024 coalition lists attributed to their lead
      // parties (Rivers of Justice -> SDP, Our Croatia -> NPS/IDS)
      results: { hdz: 34.4, sdp: 25.4, dp: 9.6, mozemo: 9.1, most: 8.0, nps: 1.22, ids: 2.25, fokus: 2.3 },
      seats:   { hdz: 61, sdp: 42, dp: 14, most: 11, mozemo: 10, nps: 2, ids: 2, fokus: 1 },
    },
    map: {
      svg: 'img/croatia.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // The 10 electoral districts I-X (Commons 2024 map, unlabeled paths
      // identified against the official composition; the 2024 fills confirm
      // III/VIII Rivers of Justice, the rest HDZ). Per-district D'Hondt with
      // the 5% threshold applied inside each district (districtThreshold);
      // baselines are the 2024 coalition shares mapped to their lead parties
      // (Rivers of Justice -> SDP, Our Croatia -> NPS in III / IDS in VIII).
      // The XI diaspora (3 seats) is a modelled district without a shape;
      // the 8 minority seats are reservedSeats.
      districts: {"i": "i", "ii": "ii", "iii": "iii", "iv": "iv", "v": "v", "vi": "vi", "vii": "vii", "viii": "viii", "ix": "ix", "x": "x", "xi": "xi"},
      seatDistricts: {"i": 14, "ii": 14, "iii": 14, "iv": 14, "v": 14, "vi": 14, "vii": 14, "viii": 14, "ix": 14, "x": 14, "xi": 3},
      names: {"i": "I", "ii": "II", "iii": "III", "iv": "IV", "v": "V", "vi": "VI", "vii": "VII", "viii": "VIII", "ix": "IX", "x": "X", "xi": "Diaspora (XI)"},
      gebiete: {"i": {"hdz": 27.65, "sdp": 24.37, "dp": 9.29, "most": 7.34, "mozemo": 19.87, "ourcroatia": 0.9, "fokus": 3.4}, "ii": {"hdz": 35.3, "sdp": 24.8, "dp": 11.1, "most": 9.1, "mozemo": 8.6, "ourcroatia": 1.2, "fokus": 2.8}, "iii": {"hdz": 27.6, "sdp": 36.8, "dp": 5.1, "most": 3.8, "mozemo": 6.2, "nps": 12.2, "fokus": 0.9}, "iv": {"hdz": 41.8, "sdp": 25.2, "dp": 13.1, "most": 6.0, "mozemo": 5.5, "ourcroatia": 1.0, "fokus": 1.0}, "v": {"hdz": 42.8, "sdp": 19.6, "dp": 17.4, "most": 8.5, "mozemo": 3.6, "ourcroatia": 0.4, "fokus": 1.0}, "vi": {"hdz": 24.8, "sdp": 23.8, "dp": 8.7, "most": 9.5, "mozemo": 18.1, "ourcroatia": 0.6, "fokus": 7.8}, "vii": {"hdz": 41.3, "sdp": 25.4, "dp": 8.6, "most": 6.6, "mozemo": 6.9, "ourcroatia": 1.0, "fokus": 1.6}, "viii": {"hdz": 21.3, "sdp": 33.4, "dp": 4.0, "most": 5.7, "mozemo": 10.2, "ids": 15.9, "fokus": 1.9}, "ix": {"hdz": 39.7, "sdp": 19.4, "dp": 10.6, "most": 12.1, "mozemo": 4.4, "ourcroatia": 0.9, "fokus": 1.0}, "x": {"hdz": 37.0, "sdp": 25.5, "dp": 10.8, "most": 11.5, "mozemo": 5.3, "ourcroatia": 0.5, "fokus": 0.5}, "xi": {"hdz": 79.5, "most": 6.6, "mozemo": 3.0, "fokus": 0.5}},
      national2021: {"hdz": 34.4, "sdp": 25.4, "dp": 9.6, "most": 8.0, "mozemo": 9.1, "nps": 1.22, "fokus": 2.3, "ids": 2.25},
    },
    pollsterMAE: {
      "2x1 komunikacije": { HR2028: 3.47, overall: 3.47 },
      "Ipsos": { HR2028: 3.11, overall: 3.11 },
      "Promocija Plus": { HR2028: 3.44, overall: 3.44 },
      "Promocija plus": { HR2028: 2.82, overall: 2.82 }
    },
    maeKey: 'HR2028',
    logos: {
      hdz: 'img/hr/HDZ.svg', sdp: 'img/hr/SDP.svg', mozemo: 'img/hr/MOZEMO.svg',
      most: 'img/hr/MOST.svg', dp: 'img/hr/DP.svg', drito: 'img/hr/DRITO.svg',
      hsu: 'img/hr/HSU.svg', hs: 'img/hr/HS.svg', centar: 'img/hr/CENTAR.svg',
      domino: 'img/hr/DOMINO.svg', ids: 'img/hr/IDS.svg', fokus: 'img/hr/FOKUS.svg',
      hss: 'img/hr/HSS.svg', hns: 'img/hr/HNS.svg', nps: 'img/hr/NPS.svg',
      pip: 'img/hr/PIP.svg', rf: 'img/hr/RF.svg',
    },
  },

  is: {
    name: 'Iceland',
    name_tr: 'İzlanda',
    seats: 63,                    // 54 district (6 constituencies) + 9 leveling
    threshold: 5.0,               // 5% for leveling seats (district tier: none)
    method: 'dhondt',             // district tier D'Hondt; leveling by quotient continuation
    levelingSeats: 9,             // the 9 equalisation seats (5% threshold)
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 30,
    defaultDays: 90,
    parties: {
      s: { code: 'S', name: 'Samfylkingin', name_en: 'Social Democratic Alliance', color: '#ED1400', ideology: "Social democracy, Pro-Europeanism" },
      d: { code: 'D', name: 'Sjálfstæðisflokkurinn', name_en: 'Independence Party (Iceland)', color: '#00ADEF', ideology: "Conservatism, Liberal conservatism" },
      c: { code: 'C', name: 'Viðreisn', name_en: 'Viðreisn', color: '#FF7D14', ideology: "Liberalism, Pro-Europeanism" },
      f: { code: 'F', name: 'Flokkur fólksins', name_en: "People's Party (Iceland)", color: '#FFCA3E', ideology: "Populism, Pensioners' interests" },
      m: { code: 'M', name: 'Miðflokkurinn', name_en: 'Centre Party (Iceland)', color: '#141F6E', ideology: "Right-wing populism, Conservatism" },
      b: { code: 'B', name: 'Framsóknarflokkurinn', name_en: 'Progressive Party (Iceland)', color: '#9ACD66', ideology: "Agrarianism, Liberalism" },
      j: { code: 'J', name: 'Sósíalistaflokkur Íslands', name_en: 'Icelandic Socialist Party', color: '#B22222', ideology: "Democratic socialism, Eco-socialism" },
      p: { code: 'P', name: 'Píratar', name_en: 'Pirate Party (Iceland)', color: '#976DFF', ideology: "Pirate politics, Direct democracy" },
      v: { code: 'V', name: 'Vinstrihreyfingin – grænt framboð', name_en: 'Left-Green Movement', color: '#00B878', ideology: "Eco-socialism, Democratic socialism" },
    },
    order: ['s', 'd', 'c', 'f', 'm', 'b', 'j', 'p', 'v'],
    parlOrder: ['j', 'v', 'p', 's', 'b', 'c', 'f', 'm', 'd'],
    // the Kristrún Frostadóttir government formed after the 2024 election:
    // Social Democratic Alliance + Viðreisn + People's Party
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['s', 'c', 'f'], color: '#E2062A' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['d', 'm', 'b', 'j', 'p', 'v'], color: '#0C46A0' },
    },
    coalitions: [
      { name: 'S + C + F', parties: ['s', 'c', 'f'] },
      { name: 'S + V + P + J', parties: ['s', 'v', 'p', 'j'] },
      { name: 'D + M + B', parties: ['d', 'm', 'b'] },
      { name: 'S + C + D + F', parties: ['s', 'c', 'd', 'f'] },
    ],
    lastElection: {
      date: '2024-11-30',
      results: { s: 20.75, d: 19.36, c: 15.82, f: 13.78, m: 12.10, b: 7.80, j: 3.96, p: 3.02, v: 2.34 },
      seats:   { s: 15, d: 14, c: 11, f: 10, m: 8, b: 5 },
    },
    map: {
      svg: 'img/iceland.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the 6 constituencies (Commons 2017 map, the six grey paths
      // identified by rendering; boundaries unchanged). District tier:
      // D'Hondt, no threshold; the 9 leveling seats go by quotient
      // continuation (votes/(seats+1)) to parties at or above 5% - the
      // real 2024 method, reproduced exactly at the anchor.
      districts: {"ne": "ne", "rn": "rn", "nw": "nw", "rs": "rs", "s": "s", "sw": "sw"},
      seatDistricts: {"rn": 9, "rs": 9, "sw": 12, "nw": 6, "ne": 9, "s": 9},
      names: {"ne": "Northeast", "rn": "Reykjavík North", "nw": "Northwest", "rs": "Reykjavík South", "s": "South", "sw": "Southwest"},
      gebiete: {"ne": {"s": 21.3, "d": 15.0, "c": 9.4, "f": 14.3, "m": 15.7, "b": 14.2, "j": 3.8, "p": 1.8, "v": 3.8}, "rn": {"s": 26.1, "d": 17.4, "c": 16.3, "f": 11.9, "m": 8.9, "b": 4.0, "j": 5.9, "p": 5.4, "v": 2.9}, "nw": {"s": 15.9, "d": 18.0, "c": 12.6, "f": 16.7, "m": 14.8, "b": 13.3, "j": 3.4, "p": 1.8, "v": 2.7}, "rs": {"s": 22.9, "d": 17.6, "c": 17.7, "f": 13.5, "m": 10.5, "b": 4.4, "j": 5.6, "p": 3.9, "v": 2.9}, "s": {"s": 17.3, "d": 19.6, "c": 11.2, "f": 20.0, "m": 13.6, "b": 12.0, "j": 2.4, "p": 1.3, "v": 1.3}, "sw": {"s": 19.3, "d": 23.4, "c": 20.1, "f": 11.0, "m": 12.0, "b": 5.9, "j": 2.8, "p": 2.8, "v": 1.5}},
      national2021: {"s": 20.75, "d": 19.36, "c": 15.82, "f": 13.78, "m": 12.1, "b": 7.8, "j": 3.96, "p": 3.02, "v": 2.34},
          // previous-election base (30 Sep 2021, en.wikipedia
          // per-constituency table; scraper/build_is_base.py):
          // the projection blends 0.75 * 2024 + 0.25 * 2021
          // geography, result views stay pure 2024. J
          // (Socialist Party) has no 2021 column and holds its
          // 2024 baseline.
          prevGebiete: {"rn": {"d": 20.9, "b": 12.3, "v": 15.9, "s": 12.6, "f": 7.7, "p": 12.8, "c": 7.7, "m": 3.5}, "rs": {"d": 22.8, "b": 11.5, "v": 14.7, "s": 13.3, "f": 8.9, "p": 10.9, "c": 8.6, "m": 4.1}, "sw": {"d": 30.2, "b": 14.5, "v": 12.1, "s": 8.1, "f": 7.6, "p": 8.3, "c": 11.4, "m": 4.5}, "nw": {"d": 22.5, "b": 25.8, "v": 11.5, "s": 6.9, "f": 8.8, "p": 6.3, "c": 6.2, "m": 7.4}, "ne": {"d": 18.5, "b": 25.6, "v": 12.9, "s": 10.5, "f": 8.6, "p": 5.3, "c": 5.4, "m": 8.9}, "s": {"d": 24.6, "b": 23.9, "v": 7.4, "s": 7.6, "f": 12.9, "p": 5.6, "c": 6.2, "m": 7.4}},
          prevNational: {"d": 24.38, "b": 17.27, "v": 12.57, "s": 9.93, "f": 8.85, "p": 8.63, "c": 8.33, "m": 5.45},
          baseBlend: 0.75,
    },
    pollsterMAE: {
      "Gallup": { IS2028: 2.24, overall: 2.24 },
      "Maskína": { IS2028: 2.25, overall: 2.25 },
      "Prósent": { IS2028: 2.51, overall: 2.51 }
    },
    maeKey: 'IS2028',
    logos: {
      s: 'img/is/S.svg', d: 'img/is/D.svg', c: 'img/is/C.svg',
      f: 'img/is/F.svg', m: 'img/is/M.svg', b: 'img/is/B.svg',
      j: 'img/is/J.svg', p: 'img/is/P.svg', v: 'img/is/V.svg',
    },
  },

  si: {
    name: 'Slovenia',
    name_tr: 'Slovenya',
    seats: 90,                    // 88 (8 constituencies x 11) + 2 minority
    threshold: 4.0,               // 4% national threshold
    method: 'dhondt',             // per-constituency D'Hondt (11 each)
    seatBased: false,
    constituencies: false,
    hideConstituencyTable: true,  // per-constituency table hidden by request
    recencyHalfLifeDays: 30,
    defaultDays: 90,
    // the Italian and Hungarian minority seats are reserved
    reservedSeats: { other: 2 },
    parties: {
      gs:  { code: 'GS', name: 'Gibanje Svoboda', name_en: 'Freedom Movement (Slovenia)', color: '#00569D', ideology: "Social liberalism, Pro-Europeanism" },
      sds: { code: 'SDS', name: 'Slovenska demokratska stranka', name_en: 'Slovenian Democratic Party', color: '#FCDC00', ideology: "National conservatism, Right-wing populism" },
      nsf: { code: 'NSF', name: 'NSi + SLS + FOKUS', name_en: 'NSi, SLS, FOKUS', color: '#0099C7', ideology: "Christian democracy, Agrarianism" },
      sd:  { code: 'SD', name: 'Socialni demokrati', name_en: 'Social Democrats (Slovenia)', color: '#E3000F', ideology: "Social democracy, Pro-Europeanism" },
      dem: { code: 'DEM', name: 'Demokrati Anžeta Logarja', name_en: 'Democrats (Slovenia)', color: '#09115E', ideology: "Conservative liberalism, Centrism" },
      l:   { code: 'L', name: 'Levica', name_en: 'The Left (Slovenia)', color: '#E82C25', ideology: "Democratic socialism, Eco-socialism" },
      v:   { code: 'V', name: 'Vesna – zelena stranka', name_en: 'Vesna – Green Party', color: '#00A65E', ideology: "Green politics, Eco-socialism" },
      res: { code: 'RES', name: 'Resni.ca', name_en: 'Resni.ca', color: '#7C5199', ideology: "Right-wing populism, Anti-lockdown" },
      pvp: { code: 'PVP', name: 'Prerod', name_en: 'Prerod', color: '#6E288F', ideology: "National conservatism, Sovereigntism" },
      pir: { code: 'PIR', name: 'Piratska stranka', name_en: 'Pirate Party (Slovenia)', color: '#F68F35', ideology: "Pirate politics, Direct democracy" },
      sns: { code: 'SNS', name: 'Slovenska nacionalna stranka', name_en: 'Slovenian National Party', color: '#221F1F', ideology: "Ultranationalism, Right-wing populism" },
      mi:  { code: 'MI!', name: 'Mi, socialisti!', name_en: 'We, Socialists!', color: '#EE4323', ideology: "Socialism, Left-wing populism" },
    },
    order: ['gs', 'sds', 'nsf', 'sd', 'dem', 'l', 'v', 'res', 'pvp', 'pir', 'sns', 'mi'],
    parlOrder: ['mi', 'l', 'v', 'sd', 'gs', 'pir', 'res', 'pvp', 'nsf', 'dem', 'sns', 'sds'],
    // the incumbent GS-led government at the time of the March 2026 election
    // the SDS-led government formed after the March 2026 election:
    // SDS + NSi/SLS/FOKUS + Democrats + Resni.ca (48 seats)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['sds', 'nsf', 'dem', 'res'], color: '#FCDC00' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['gs', 'sd', 'l', 'v', 'pvp', 'pir', 'sns', 'mi'], color: '#00569D' },
    },
    coalitions: [
      { name: 'SDS + NSF + DEM + RES', parties: ['sds', 'nsf', 'dem', 'res'] },
      { name: 'SDS + NSF + DEM + RES + SNS', parties: ['sds', 'nsf', 'dem', 'res', 'sns'] },
      { name: 'GS + SD + L + V', parties: ['gs', 'sd', 'l', 'v'] },
      { name: 'GS + SDS', parties: ['gs', 'sds'] },
    ],
    lastElection: {
      date: '2026-03-22',
      // Levica + Vesna ran as one list (5.69); its share is on the Levica key
      results: { gs: 28.66, sds: 27.88, nsf: 9.26, sd: 6.71, dem: 6.69, l: 5.69, res: 5.49, pir: 2.36, sns: 2.24, mi: 0.48, v: 0, pvp: 0 },
      seats:   { gs: 29, sds: 28, nsf: 9, sd: 6, dem: 6, l: 5, res: 5 },
    },
    map: {
      svg: 'img/slovenia.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the 8 official volilne enote (GURS RPE VDV_VE layer). Per-
      // constituency D'Hondt, 11 seats each, with the 4% threshold applied
      // nationally (districtThreshold off); the 2 minority seats are
      // reservedSeats.
      districts: {"celje": "celje", "kranj": "kranj", "ljubljana_bezigrad": "ljubljana_bezigrad", "ljubljana_center": "ljubljana_center", "maribor": "maribor", "novo_mesto": "novo_mesto", "postojna": "postojna", "ptuj": "ptuj"},
      seatDistricts: {"celje": 11, "kranj": 11, "ljubljana_bezigrad": 11, "ljubljana_center": 11, "maribor": 11, "novo_mesto": 11, "postojna": 11, "ptuj": 11},
      nationalRemainders: true,
      names: {"celje": "Celje", "kranj": "Kranj", "ljubljana_bezigrad": "Ljubljana Bežigrad", "ljubljana_center": "Ljubljana Center", "maribor": "Maribor", "novo_mesto": "Novo mesto", "postojna": "Postojna", "ptuj": "Ptuj"},
      gebiete: {"celje": {"gs": 26.36, "sds": 31.6, "nsf": 10.39, "sd": 7.62, "dem": 6.81, "l": 4.11, "res": 5.14}, "kranj": {"gs": 26.1, "sds": 27.71, "nsf": 11.18, "sd": 5.35, "dem": 6.64, "l": 5.87, "res": 7.04}, "ljubljana_bezigrad": {"gs": 29.18, "sds": 25.93, "nsf": 8.65, "sd": 5.87, "dem": 6.73, "l": 6.97, "res": 5.28}, "ljubljana_center": {"gs": 29.12, "sds": 23.64, "nsf": 8.74, "sd": 6.21, "dem": 7.3, "l": 9.53, "res": 4.66}, "maribor": {"gs": 28.33, "sds": 30.83, "nsf": 7.1, "sd": 6.8, "dem": 7.03, "l": 4.65, "res": 5.87}, "novo_mesto": {"gs": 27.74, "sds": 29.42, "nsf": 10.27, "sd": 8.15, "dem": 6.13, "l": 3.95, "res": 4.75}, "postojna": {"gs": 34.74, "sds": 22.55, "nsf": 9.13, "sd": 7.39, "dem": 5.64, "l": 5.97, "res": 4.92}, "ptuj": {"gs": 27.8, "sds": 32.71, "nsf": 8.64, "sd": 6.36, "dem": 7.18, "l": 3.09, "res": 6.61}},
      national2021: {"gs": 28.66, "sds": 27.88, "nsf": 9.26, "sd": 6.71, "dem": 6.69, "l": 5.69, "res": 5.49, "pir": 2.36, "sns": 2.24, "mi": 0.48},
    },
    pollsterMAE: {
      "IJEK": { SI2030: 2.95, overall: 2.95 },
      "Mediana": { SI2030: 1.67, overall: 1.67 },
      "Ninamedia": { SI2030: 1.55, overall: 1.55 },
      "Parsifal": { SI2030: 2.36, overall: 2.36 },
      "Valicon": { SI2030: 2.62, overall: 2.62 }
    },
    maeKey: 'SI2030',
    logos: {
      gs: 'img/si/GS.svg', sds: 'img/si/SDS.svg', nsf: 'img/si/NSF.svg',
      sd: 'img/si/SD.svg', dem: 'img/si/DEM.svg', l: 'img/si/L.svg',
      v: 'img/si/V.svg', res: 'img/si/RES.svg', pvp: 'img/si/PVP.svg',
      pir: 'img/si/PIR.svg', sns: 'img/si/SNS.svg', mi: 'img/si/MI.svg',
    },
  },

  bc: {
    name: 'British Columbia',
    name_tr: 'Britanya Kolumbiyası',
    seats: 93,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 93 single-member ridings
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 93 ridings
    constituencyRule: 'fptp',
    hideBlocs: true,              // no governing/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-10-24 election: momentum is a nudge,
    // not the driver - anchored at the recent poll mean, total move capped
    // at 0.15pp/day (3.2pp over the 21-day horizon), damped and blended at
    // 0.4; the old loose caps moved NDP ~+8pp / ~+29 seats on a noisy slope
    trend: {
      electionDate: '2026-10-24',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from Template:Canadian party colour (en.wikipedia)
    parties: {
      bcndp: { code: 'BCNDP',   name: 'British Columbia New Democratic Party', name_en: 'British Columbia New Democratic Party', color: '#F4A460', ideology: "Social democracy"},
      cpbc:  { code: 'CPBC',   name: 'Conservative Party of British Columbia', name_en: 'Conservative Party of British Columbia', color: '#004AAD', ideology: "Conservatism, Right-wing populism"},
      gpbc:  { code: 'GPBC', name: 'Green Party of British Columbia', name_en: 'Green Party of British Columbia', color: '#99C955', ideology: "Green politics"},
      cbc:   { code: 'CBC', name: 'CentreBC',  name_en: 'CentreBC', color: '#EE2D30', ideology: "Fiscal conservatism, Conservative liberalism"},
      onbc:  { code: '1BC',    name: 'OneBC',     name_en: 'OneBC',    color: '#C49B50', ideology: "Right-wing populism, Social conservatism"},
      ind:   { code: 'IND',    name: 'Independent', name_en: 'Independent', color: '#6B7280', ideology: "Conservatism, Right-wing populism"},
    },
    order: ['bcndp', 'cpbc', 'gpbc', 'cbc', 'onbc', 'ind'],
    parlOrder: ['bcndp', 'gpbc', 'cbc', 'onbc', 'cpbc', 'ind'],
    // governing party vs the rest (majority = 47 seats)
    blocs: {
      bloc1: { name: 'BC NDP',     short: 'NDP', parties: ['bcndp'], color: '#F4A460' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['cpbc', 'gpbc', 'cbc', 'onbc'], color: '#004AAD' },
    },
    coalitions: [
      { name: 'NDP + Green', parties: ['bcndp','gpbc'] },
      { name: 'Conservatives alone', parties: ['cpbc'] },
      { name: 'NDP + Green + OneBC', parties: ['bcndp','gpbc','onbc'] },
    ],
    lastElection: {
      date: '2024-10-19',
      // 2024 general election (Elections BC): NDP 47, Con 44, Green 2
      results: { bcndp: 44.86, cpbc: 43.28, gpbc: 8.24, cbc: 0, onbc: 0 },
      seats:   { bcndp: 47, cpbc: 44, gpbc: 2, cbc: 0, onbc: 0 },
    },
    map: {},
    pollsterMAE: {
      "Abacus Data": { BC2024: 5.08, overall: 5.08 },
      "Angus Reid": { BC2024: 4.06, overall: 4.06 },
      "Counsel Public Affairs": { BC2024: 2.81, overall: 2.81 },
      "Ipsos": { BC2024: 1.68, overall: 1.68 },
      "Leger": { BC2024: 1.6, overall: 1.6 },
      "Liaison Strategies": { BC2024: 4.02, overall: 4.02 },
      "Mainstreet Research": { BC2024: 2.95, overall: 2.95 },
      "Pallas Data": { BC2024: 2.73, overall: 2.73 },
      "Pollara": { BC2024: 3.57, overall: 3.57 },
      "Research Co.": { BC2024: 1.9, overall: 1.9 }
    },
    maeKey: 'BC2024',
    logos: {
      bcndp: 'img/bc/BCNDP.svg', cpbc: 'img/bc/CPBC.svg',
      gpbc: 'img/bc/GPBC.svg', cbc: 'img/bc/CBC.svg', onbc: 'img/bc/1BC.svg',
    },
  },

  ontario: {
    name: 'Ontario',
    seats: 124,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 124 single-member ridings
    constituencyRule: 'fptp',
    constituencies: true,         // the map is the 124 ridings
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
      pc: { code: 'PC', name: 'Progressive Conservative', name_en: 'Progressive Conservative', color: '#1A4782', ideology: "Conservatism, Populism"},
      olp: { code: 'OLP', name: 'Ontario Liberal Party', name_en: 'Ontario Liberal Party', color: '#D71920', ideology: "Liberalism, Social liberalism"},
      ndp: { code: 'NDP', name: 'Ontario New Democratic Party', name_en: 'Ontario New Democratic Party', color: '#F58220', ideology: "Social democracy, Democratic socialism"},
      gpo: { code: 'GPO', name: 'Green Party of Ontario', name_en: 'Green Party of Ontario', color: '#6AB023', ideology: "Green politics, Progressivism"},
      nb: { code: 'NB', name: 'New Blue Party', name_en: 'New Blue Party', color: '#02478D', ideology: "Right-wing populism, Social conservatism"},
      ont: { code: 'ONT', name: 'Ontario Party', name_en: 'Ontario Party', color: '#0B2B52', ideology: "Right-wing populism, Libertarianism"},
      ind:   { code: 'IND', name: 'Independent', name_en: 'Independent', color: '#6B7280', ideology: "Independent"},
    },
    order: ['pc', 'olp', 'ndp', 'gpo', 'nb', 'ont', 'ind'],
    parlOrder: ['ndp', 'gpo', 'olp', 'ont', 'nb', 'pc', 'ind'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['pc'], color: '#1A4782' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['olp', 'ndp', 'gpo', 'nb', 'ont'], color: '#D71920' },
    },
    lastElection: {
      date: '2025-02-27',
      // 2025 general election (Elections Ontario)
      results: {"pc": 42.97, "olp": 29.95, "ndp": 18.55, "gpo": 4.83, "nb": 0.51, "ont": 0.42, "ind": 1.98},
      seats: {"pc": 80, "ndp": 27, "olp": 14, "gpo": 2, "nb": 0, "ont": 0, "ind": 1},
    },
    map: {},
    pollsterMAE: {},
    maeKey: 'ON2029',
    logos: { pc: 'img/ont/PC.svg', olp: 'img/ont/OLP.svg', ndp: 'img/ont/NDP.svg', gpo: 'img/ont/GPO.svg', nb: 'img/ont/NB.svg', ont: 'img/ont/ONT.svg' },
  },

  alberta: {
    name: 'Alberta',
    seats: 87,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 87 single-member ridings
    constituencyRule: 'fptp',
    constituencies: true,         // the map is the 87 ridings
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
      ucp: { code: 'UCP', name: 'United Conservative Party', name_en: 'United Conservative Party', color: '#1A4C8B', ideology: "Conservatism, Right-wing populism"},
      ndp: { code: 'NDP', name: 'Alberta New Democratic Party', name_en: 'Alberta New Democratic Party', color: '#F58220', ideology: "Social democracy, Progressivism"},
      grn: { code: 'GRN', name: 'Green Party of Alberta', name_en: 'Green Party of Alberta', color: '#6AB023', ideology: "Green politics, Progressivism"},
      lib: { code: 'LIB', name: 'Alberta Liberal Party', name_en: 'Alberta Liberal Party', color: '#D71920', ideology: "Liberalism, Social liberalism"},
      tory: { code: 'TORY', name: 'Progressive Conservative', name_en: 'Progressive Conservative', color: '#1F4E79', ideology: "Progressive conservatism, Red Toryism"},
      wlc: { code: 'WLC', name: 'Wildrose Loyalty Coalition', name_en: 'Wildrose Loyalty Coalition', color: '#14532D', ideology: "Right-wing populism, Alberta separatism"},
      wip: { code: 'WIP', name: 'Wildrose Independence Party', name_en: 'Wildrose Independence Party', color: '#0F8753', ideology: "Alberta separatism, Right-wing populism"},
      rpa: { code: 'RPA', name: 'Reform Party of Alberta', name_en: 'Reform Party of Alberta', color: '#6B4C9A', ideology: "Right-wing populism, Populism"},
    },
    order: ['ucp', 'ndp', 'grn', 'lib', 'tory', 'wlc', 'wip', 'rpa'],
    parlOrder: ['ndp', 'grn', 'lib', 'rpa', 'tory', 'wlc', 'wip', 'ucp'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ucp'], color: '#1A4C8B' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['ndp', 'grn', 'lib', 'tory', 'wlc', 'wip', 'rpa'], color: '#F58220' },
    },
    lastElection: {
      date: '2023-05-29',
      // 2023 general election (Elections Alberta)
      results: {"ucp": 52.63, "ndp": 44.05, "grn": 0.76, "tory": 0.71, "lib": 0.24, "wlc": 0.24, "wip": 0.05, "rpa": 0.01},
      seats: {"ucp": 49, "ndp": 38, "grn": 0, "tory": 0, "lib": 0, "wlc": 0, "wip": 0, "rpa": 0},
    },
    map: {},
    pollsterMAE: {},
    maeKey: 'AB2027',
    logos: { ucp: 'img/alb/UCP.svg', ndp: 'img/alb/NDP.svg', grn: 'img/alb/GPA.svg', lib: 'img/alb/LIB.svg', tory: 'img/alb/TORY.svg', wlc: 'img/alb/WLC.svg', wip: 'img/alb/WIP.svg', rpa: 'img/alb/RPA.svg' },
  },

  canada: {
    name: 'Canada',
    name_tr: 'Kanada',
    seats: 343,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 343 single-member ridings
    constituencyRule: 'fptp',
    constituencies: true,         // the map is the 343 ridings
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    parties: {
      lpc: { code: 'LPC', name: 'Liberal Party of Canada', name_en: 'Liberal Party of Canada', color: '#EA6D6A', ideology: "Liberalism, Centrism"},
      cpc: { code: 'CPC', name: 'Conservative Party of Canada', name_en: 'Conservative Party of Canada', color: '#6495ED', ideology: "Conservatism, Right-wing populism"},
      bq: { code: 'BQ', name: 'Bloc Québécois', name_en: 'Bloc Québécois', color: '#87CEFA', ideology: "Quebec nationalism, Social democracy"},
      ndp: { code: 'NDP', name: 'New Democratic Party', name_en: 'New Democratic Party', color: '#F4A460', ideology: "Social democracy, Democratic socialism"},
      gpc: { code: 'GPC', name: 'Green Party of Canada', name_en: 'Green Party of Canada', color: '#99C955', ideology: "Green politics, Progressivism"},
      ppc: { code: 'PPC', name: 'People\'s Party of Canada', name_en: 'People\'s Party of Canada', color: '#6f5d9a', ideology: "Right-wing populism, Libertarianism"},
      other: { code: 'OTH', name: 'Independents and minor parties', name_en: 'Independents and minor parties', color: '#DCDCDC', ideology: "Independents and minor parties"},
    },
    order: ['lpc', 'cpc', 'bq', 'ndp', 'gpc', 'ppc', 'other'],
    parlOrder: ['ndp', 'gpc', 'bq', 'ppc', 'other', 'cpc', 'lpc'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['lpc'], color: '#EA6D6A' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['cpc', 'bq', 'ndp', 'gpc', 'ppc', 'other'], color: '#6495ED' },
    },
    lastElection: {
      date: '2025-04-28',
      // 2025 general election (Elections Canada)
      results: {"lpc": 43.76, "cpc": 41.31, "bq": 6.29, "ndp": 6.29, "gpc": 1.22, "ppc": 0.7, "other": 0.44},
      seats: {"lpc": 169, "cpc": 144, "bq": 22, "ndp": 7, "gpc": 1, "ppc": 0, "other": 0},
    },
    map: {},
    pollsterMAE: {},
    maeKey: 'CA2029',
    logos: { lpc: 'img/ca/LPC.svg', cpc: 'img/ca/CPC.svg', bq: 'img/ca/BQ.svg', ndp: 'img/ca/NDP.svg', gpc: 'img/ca/GPC.svg', ppc: 'img/ca/PPC.svg' },
  },

  turkey: {
    name: 'Turkey',
    name_tr: 'T\u00fcrkiye',
    seats: 600,
    threshold: 7.0,               // 7% national threshold (2022 change)
    method: 'dhondt',             // D'Hondt per electoral district
    seatBased: false,             // polls report vote shares (%)
    constituencies: false,        // the 600 seats are allocated per district
    recencyHalfLifeDays: 7,
    parties: {
      akp: { code: 'AKP', name: 'Adalet ve Kalkınma Partisi', name_en: 'Adalet ve Kalkınma Partisi', color: '#fda000', ideology: "Right-wing populism"},
      chp: { code: 'CHP', name: 'Cumhuriyet Halk Partisi', name_en: 'Cumhuriyet Halk Partisi', color: '#F08080', ideology: "Social liberalism"},
      mhp: { code: 'MHP', name: 'Milliyetçi Hareket Partisi', name_en: 'Milliyetçi Hareket Partisi', color: '#C83737', ideology: "Turkish-Islamic Synthesis"},
      iyi: { code: 'İYİ', name: 'İYİ Parti', name_en: 'İYİ Parti', color: '#3db5e6', ideology: "Nationalism, Liberal conservatism"},
      dem: { code: 'DEM', name: 'Halkların Eşitlik ve Demokrasi Partisi', name_en: 'Halkların Eşitlik ve Demokrasi Partisi', color: '#734B9C', ideology: "Kurdish nationalism, Democratic socialism"},
      yrp: { code: 'YRP', name: 'Yeniden Refah Partisi', name_en: 'Yeniden Refah Partisi', color: '#2E8B57', ideology: "Erbakanism"},
      zp: { code: 'ZP', name: 'Zafer Partisi', name_en: 'Zafer Partisi', color: '#373736', ideology: "Ultranationalism"},
      tip: { code: 'TİP', name: 'Türkiye İşçi Partisi', name_en: 'Türkiye İşçi Partisi', color: '#BE0A11', ideology: "Left-wing populism"},
      a: { code: 'A', name: 'Anahtar Parti', name_en: 'Anahtar Parti', color: '#192B4F', ideology: "Turkish-Islamic Synthesis"},
      yep: { code: 'YENİ', name: 'Yeni Parti', name_en: 'Yeni Parti', color: '#ED1C24', ideology: "Social democracy, Kemalism"},
      saadet: { code: 'SAADET', name: 'Saadet Partisi', name_en: 'Saadet Partisi', color: '#FF2E84', ideology: "Erbakanism"},
      bbp: { code: 'BBP', name: 'Büyük Birlik Partisi', name_en: 'Büyük Birlik Partisi', color: '#CC5252', ideology: "Turkish-Islamic Synthesis"},
    },
    order: ['akp', 'chp', 'mhp', 'iyi', 'dem', 'yrp', 'zp', 'tip', 'a', 'yep', 'saadet', 'bbp'],
    parlOrder: ['tip', 'dem', 'yep', 'chp', 'iyi', 'zp', 'saadet', 'a', 'yrp', 'akp', 'bbp', 'mhp'],
    // the ittifak structure (2028 state): an alliance's total counts for
    // the 7% threshold (so MHP/BBP/TİP take seats below it); the seat
    // allocation itself is plain per-district D'Hondt, party by party.
    // YRP left the Cumhur and İYİ runs alone (no Millet).
    alliances: {
      cumhur: ['akp', 'mhp', 'bbp'],
      emek: ['dem', 'tip'],
    },
    blocs: {
      bloc1: { name: 'Government camp', short: 'GOV', parties: ['akp', 'mhp', 'bbp'], color: '#fda000' },
      bloc2: { name: 'Opposition',      short: 'OPP', parties: ['chp', 'iyi', 'dem', 'yrp', 'zp', 'tip', 'a', 'yep', 'saadet'], color: '#ED1C24' },
    },
    logos: {
akp: 'img/tr/AKP.svg', chp: 'img/tr/CHP.svg', mhp: 'img/tr/MHP.svg', iyi: 'img/tr/IYI.svg', dem: 'img/tr/DEM.svg', yrp: 'img/tr/YRP.svg', zp: 'img/tr/ZAFER.svg', tip: 'img/tr/TIP.svg', a: 'img/tr/A.svg', yep: 'img/tr/YENI.svg', saadet: 'img/tr/SAADET.svg', bbp: 'img/tr/BBP.svg'
    },
    pollsterMAE: {},
    maeKey: 'TR2028',
    lastElection: {
      date: '2023-05-14',
      // 2023 general election (YSK); YSP is the DEM vehicle, YRP/TIP ran
      // inside the Cumhur/Emek lists (their seats split out here)
      results: {"akp": 35.62, "chp": 25.35, "mhp": 10.07, "iyi": 9.69, "dem": 8.82, "yrp": 2.81, "zp": 2.23, "tip": 1.73, "bbp": 0.97, "a": 0, "yep": 0, "saadet": 0},
      seats: {"akp": 268, "chp": 169, "mhp": 50, "iyi": 43, "dem": 61, "yrp": 5, "tip": 4, "bbp": 0, "zp": 0, "a": 0, "yep": 0, "saadet": 0},
    },
    map: {},
    map2: { svg: 'img/turkey.svg', label_tr: 'İLÇE HARİTASI', label_en: 'DISTRICTS', layerCount: 976 },
  },

  qc: {
    name: 'Quebec',
    hidden: true, // 2026 election held 2026-10-05; hidden from the nav
    seats: 127,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 127 single-member ridings
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 127 ridings
    constituencyRule: 'fptp',
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-10-05 election: momentum is a nudge,
    // not the driver (anchored at the recent poll mean, 0.15pp/day cap,
    // 10-day damping, blend 0.4); with 2 days left the damped move is tiny
    trend: {
      electionDate: '2026-10-05',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from the en.wikipedia party infoboxes
    parties: {
      caq:  { code: 'CAQ',  name: 'Coalition Avenir Québec',           name_en: 'Coalition Avenir Québec',           color: '#1E90FF', ideology: "Quebec nationalism, Quebec federalism (Autonomism), Conservatism (Canadian)"},
      plq:  { code: 'PLQ',  name: 'Parti libéral du Québec',           name_en: 'Quebec Liberal Party',              color: '#F08080', ideology: "Liberalism, Canadian federalism"},
      pq:   { code: 'PQ',   name: 'Parti québécois',                   name_en: 'Parti Québécois',                   color: '#004C9D', ideology: "Quebec nationalism, Quebec sovereigntism, Social democracy"},
      qs:   { code: 'QS',   name: 'Québec solidaire',                  name_en: 'Québec solidaire',                  color: '#FF8040', ideology: "Democratic socialism, Environmentalism, Quebec sovereigntism"},
      pcq:  { code: 'PCQ',  name: 'Parti conservateur du Québec',      name_en: 'Conservative Party of Quebec',      color: '#313E6B', ideology: "Conservatism (Canadian), Economic liberalism"},
      ind:  { code: 'IND',  name: 'Independent',                       name_en: 'Independent',                       color: '#6B7280', ideology: "Liberalism, Canadian federalism"},
    },
    order: ['caq', 'plq', 'pq', 'qs', 'pcq', 'ind'],
    parlOrder: ['qs', 'pq', 'plq', 'caq', 'pcq', 'ind'],
    // incumbent CAQ vs the rest (cards hidden)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['caq'], color: '#1E90FF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['plq', 'pq', 'qs', 'pcq'], color: '#E30613' },
    },
    lastElection: {
      date: '2022-10-03',
      // 2022 general election (Élections Québec, official)
      results: {
              "caq": 40.98,
              "plq": 14.37,
              "qs": 15.43,
              "pq": 14.61,
              "pcq": 12.91
      },
      seats: {
              "caq": 90,
              "plq": 21,
              "qs": 11,
              "pq": 3,
              "pcq": 0
      },
    },
    map: {},
    pollsterMAE: {
      "Angus Reid": { QC2022: 3.95, overall: 3.95 },
      "EKOS": { QC2022: 6.83, overall: 6.83 },
      "Forum": { QC2022: 3.98, overall: 3.98 },
      "Innovative Research Group": { QC2022: 8.47, overall: 8.47 },
      "Leger": { QC2022: 5.9, overall: 5.9 },
      "Léger": { QC2022: 2.07, overall: 2.07 },
      "Mainstreet": { QC2022: 2.15, overall: 2.15 },
      "Research Co.": { QC2022: 2.35, overall: 2.35 },
      "Synopsis Recherche": { QC2022: 3.44, overall: 3.44 }
    },
    maeKey: 'QC2022',
    logos: {
      caq: 'img/qc/CAQ.svg', plq: 'img/qc/PLQ.svg', pq: 'img/qc/PQ.svg',
      qs: 'img/qc/QS.svg', pcq: 'img/qc/PCQ.svg',
    },
  },

  hu: {
    name: 'Hungary',
    name_tr: 'Macaristan',
    seats: 199,
    threshold: 5.0,
    method: 'dhondt',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      tisza:  { code: 'TISZA',  name: 'Tisza Párt', name_en: 'Tisza Party', color: '#88E8FF', ideology: "Conservatism, Populism, Pro-Europeanism"},
      fidesz: { code: 'FIDESZ', name: 'Fidesz–KDNP', name_en: 'Fidesz–KDNP', color: '#FF6A00', ideology: "Christian nationalism, Illiberalism, Authoritarianism"},
      mh:     { code: 'MH',     name: 'Mi Hazánk Mozgalom', name_en: 'Our Homeland Movement', color: '#688D1B', ideology: "Ultranationalism, Hungarian irredentism, Right-wing populism"},
      dk:     { code: 'DK',     name: 'Demokratikus Koalíció', name_en: 'Democratic Coalition', color: '#2A61A4', ideology: "Social democracy, Social liberalism, Progressivism"},
      mkkp:   { code: 'MKKP',   name: 'Magyar Kétfarkú Kutya Párt', name_en: 'Hungarian Two-Tailed Dog Party', color: '#808080', ideology: "Political satire, Anti-establishment"},
    },
    order: ['tisza', 'fidesz', 'mh', 'dk', 'mkkp'],
    parlOrder: ['dk', 'mkkp', 'tisza', 'mh', 'fidesz'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['tisza'], color: '#88E8FF' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['fidesz', 'mh', 'dk', 'mkkp'], color: '#FF6A00' },
    },
    lastElection: {
      date: '2026-04-12',
      results: {"tisza": 53.18, "fidesz": 38.61, "mh": 5.63, "dk": 1.1, "mkkp": 0.82},
      seats: {"tisza": 141, "fidesz": 52, "mh": 6, "dk": 0, "mkkp": 0},
    },
    map: {},
    // the real 106 single-member constituencies (NVI boundaries), with their
    // exact 2026 party shares - the allocator uses them for the SMD winners,
    // the map toggle displays them
    map2: {},
    pollsterMAE: {},
    maeKey: 'HU2026',
    logos: {
      tisza: 'img/hu/TISZA.svg', fidesz: 'img/hu/FIDESZ.svg',
      mh: 'img/hu/MH.svg', dk: 'img/hu/DK.svg', mkkp: 'img/hu/MKKP.svg',
    },
  },

  argentina: {
    name: 'Argentina',
    name_tr: 'Arjantin',
    // presidential two-round: the map units are the 24 districts (23
    // provinces + the City of Buenos Aires). The 2027 field is a set of
    // declared/potential candidacies - the polls test alternative fields,
    // so the field selector is on. The 2023 geography is mapped onto the
    // 2027 field: Milei/Massa/Schiaretti/Bregman are in it themselves,
    // Bullrich (JxC) -> Macri (PRO), and the other PJ-FP alternatives
    // (Kicillof, Kirchner) inherit the Massa geography (the result view
    // folds them back to the true 2023 candidates via resultMerge).
    seats: 24,                    // 24 map units (departments of the map)
    threshold: 50,
    method: 'hare_niemeyer',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    defaultDays: 90,
    fieldSelector: true,
    hideBlocs: true,
    mapOnly: true,
    unitLabel: {
      en: 'districts',
      tr: 'bölge'
    },
    parties: {
      milei: { code: 'Milei', name: 'Javier Milei', name_en: 'Javier Milei', color: '#6C4C99', ideology: "Libertarianism, Right-wing populism"},
      kicillof: { code: 'Kicillof', name: 'Axel Kicillof', name_en: 'Axel Kicillof', color: '#318CE7', ideology: "Peronism, Kirchnerism"},
      kirchner: { code: 'Kirchner', name: 'Máximo Kirchner', name_en: 'Máximo Kirchner', color: '#318CE7', ideology: "Kirchnerism, Peronism"},
      massa: { code: 'Massa', name: 'Sergio Massa', name_en: 'Sergio Massa', color: '#0E3C61', ideology: "Peronism, Federal Peronism"},
      grabois: { code: 'Grabois', name: 'Juan Grabois', name_en: 'Juan Grabois', color: '#17A0DA', ideology: "Left-wing Peronism, Social justice"},
      macri: { code: 'Macri', name: 'Mauricio Macri', name_en: 'Mauricio Macri', color: '#FFD700', ideology: "Liberal conservatism, Republicanism"},
      villarruel: { code: 'Villarruel', name: 'Victoria Villarruel', name_en: 'Victoria Villarruel', color: '#192B6B', ideology: "National conservatism, Right-wing populism"},
      schiaretti: { code: 'Schiaretti', name: 'Juan Schiaretti', name_en: 'Juan Schiaretti', color: '#27AE60', ideology: "Federal Peronism, Regionalism"},
      bregman: { code: 'Bregman', name: 'Myriam Bregman', name_en: 'Myriam Bregman', color: '#F65058', ideology: "Trotskyism, Socialism of the left"},
      moreno: { code: 'Moreno', name: 'Guillermo Moreno', name_en: 'Guillermo Moreno', color: '#00ADEF', ideology: "Nationalism, Peronism"},
      gebel: { code: 'Gebel', name: 'Gebel', name_en: 'Gebel', color: '#9CA3AF', ideology: "Independent"},
      bullrich: { code: 'Bullrich', name: 'Patricia Bullrich', name_en: 'Patricia Bullrich', color: '#FFD700', pastOnly: true, ideology: "Liberal conservatism, Republicanism"},
    },
    order: ['milei', 'kicillof', 'kirchner', 'massa', 'grabois', 'macri', 'villarruel', 'schiaretti', 'bregman', 'moreno', 'gebel', 'bullrich'],
    parlOrder: ['bregman', 'kirchner', 'massa', 'kicillof', 'grabois', 'moreno', 'schiaretti', 'macri', 'gebel', 'villarruel', 'milei', 'bullrich'],
    blocs: {
      bloc1: { name: 'Milei', short: 'LLA', parties: ['milei'], color: '#6C4C99' },
      bloc2: { name: 'Field', short: 'FLD', parties: ['kicillof', 'kirchner', 'massa', 'grabois', 'macri', 'villarruel', 'schiaretti', 'bregman', 'moreno', 'gebel'], color: '#318CE7' },
    },
    lastElection: {
      date: '2023-10-22',
      // the TRUE 2023 first round (Massa 36.69, Milei 29.99, Bullrich
      // 23.83, Schiaretti 6.78, Bregman 2.70); the 2027-only candidates
      // read 0. Milei won the runoff 55.69/44.31
      results: {"massa": 36.69, "milei": 29.99, "bullrich": 23.83, "schiaretti": 6.78, "bregman": 2.7, "kicillof": 0, "kirchner": 0, "grabois": 0, "macri": 0, "villarruel": 0, "moreno": 0, "gebel": 0},
      seats: { milei: 1 },
    },
    map: {
      svg: 'img/argentina.svg',
      selector: 'id',
      districts: {"buenos_aires": "buenos_aires", "buenos_aires_city": "buenos_aires_city", "catamarca": "catamarca", "chaco": "chaco", "chubut": "chubut", "cordoba": "cordoba", "corrientes": "corrientes", "entre_rios": "entre_rios", "formosa": "formosa", "jujuy": "jujuy", "la_pampa": "la_pampa", "la_rioja": "la_rioja", "mendoza": "mendoza", "misiones": "misiones", "neuquen": "neuquen", "rio_negro": "rio_negro", "salta": "salta", "san_juan": "san_juan", "san_luis": "san_luis", "santa_cruz": "santa_cruz", "santa_fe": "santa_fe", "santiago_del_estero": "santiago_del_estero", "tierra_del_fuego": "tierra_del_fuego", "tucuman": "tucuman"},
      gebiete: {"buenos_aires": {"milei": 25.73, "macri": 24.05, "schiaretti": 3.7, "bregman": 3.57, "massa": 21.48, "kicillof": 10.74, "kirchner": 10.74}, "buenos_aires_city": {"milei": 19.98, "macri": 41.23, "schiaretti": 3.07, "bregman": 3.53, "massa": 16.09, "kicillof": 8.04, "kirchner": 8.04}, "catamarca": {"milei": 32.03, "macri": 17.13, "schiaretti": 6.44, "bregman": 1.58, "massa": 21.41, "kicillof": 10.71, "kirchner": 10.71}, "chaco": {"milei": 27.82, "macri": 24.1, "schiaretti": 3.62, "bregman": 0.78, "massa": 21.84, "kicillof": 10.92, "kirchner": 10.92}, "chubut": {"milei": 35.13, "macri": 20.57, "schiaretti": 7.7, "bregman": 4.38, "massa": 16.11, "kicillof": 8.05, "kirchner": 8.05}, "cordoba": {"milei": 33.58, "macri": 22.63, "schiaretti": 28.98, "bregman": 1.39, "massa": 6.71, "kicillof": 3.35, "kirchner": 3.35}, "corrientes": {"milei": 26.87, "macri": 32.13, "schiaretti": 2.73, "bregman": 1.06, "massa": 18.61, "kicillof": 9.3, "kirchner": 9.3}, "entre_rios": {"milei": 29.74, "macri": 30.03, "schiaretti": 5.36, "bregman": 1.56, "massa": 16.66, "kicillof": 8.33, "kirchner": 8.33}, "formosa": {"milei": 29.06, "macri": 15.38, "schiaretti": 2.44, "bregman": 0.81, "massa": 26.16, "kicillof": 13.08, "kirchner": 13.08}, "jujuy": {"milei": 37.35, "macri": 19.96, "schiaretti": 6.79, "bregman": 3.54, "massa": 16.18, "kicillof": 8.09, "kirchner": 8.09}, "la_pampa": {"milei": 33.51, "macri": 21.9, "schiaretti": 7.44, "bregman": 2.29, "massa": 17.43, "kicillof": 8.71, "kirchner": 8.71}, "la_rioja": {"milei": 37.63, "macri": 11.8, "schiaretti": 8.51, "bregman": 0.92, "massa": 20.57, "kicillof": 10.29, "kirchner": 10.29}, "mendoza": {"milei": 42.38, "macri": 25.82, "schiaretti": 4.32, "bregman": 3.47, "massa": 12.01, "kicillof": 6.0, "kirchner": 6.0}, "misiones": {"milei": 42.19, "macri": 14.39, "schiaretti": 4.1, "bregman": 1.4, "massa": 18.96, "kicillof": 9.48, "kirchner": 9.48}, "neuquen": {"milei": 36.74, "macri": 20.56, "schiaretti": 5.95, "bregman": 4.99, "massa": 15.88, "kicillof": 7.94, "kirchner": 7.94}, "rio_negro": {"milei": 33.76, "macri": 18.13, "schiaretti": 6.25, "bregman": 4.01, "massa": 18.93, "kicillof": 9.46, "kirchner": 9.46}, "salta": {"milei": 40.27, "macri": 13.8, "schiaretti": 6.18, "bregman": 1.75, "massa": 19.0, "kicillof": 9.5, "kirchner": 9.5}, "san_juan": {"milei": 35.08, "macri": 23.2, "schiaretti": 6.17, "bregman": 2.23, "massa": 16.65, "kicillof": 8.32, "kirchner": 8.32}, "san_luis": {"milei": 43.33, "macri": 20.91, "schiaretti": 6.24, "bregman": 2.19, "massa": 13.66, "kicillof": 6.83, "kirchner": 6.83}, "santa_cruz": {"milei": 36.3, "macri": 16.41, "schiaretti": 6.6, "bregman": 2.9, "massa": 18.89, "kicillof": 9.45, "kirchner": 9.45}, "santa_fe": {"milei": 32.52, "macri": 26.88, "schiaretti": 9.02, "bregman": 1.89, "massa": 14.85, "kicillof": 7.42, "kirchner": 7.42}, "santiago_del_estero": {"milei": 22.84, "macri": 8.01, "schiaretti": 2.13, "bregman": 1.25, "massa": 32.88, "kicillof": 16.44, "kirchner": 16.44}, "tierra_del_fuego": {"milei": 33.82, "macri": 14.99, "schiaretti": 9.12, "bregman": 3.86, "massa": 19.1, "kicillof": 9.55, "kirchner": 9.55}, "tucuman": {"milei": 35.0, "macri": 14.64, "schiaretti": 3.99, "bregman": 1.44, "massa": 22.46, "kicillof": 11.23, "kirchner": 11.23}},
      national2021: {"milei": 29.99, "macri": 23.83, "schiaretti": 6.78, "bregman": 2.7, "massa": 18.34, "kicillof": 9.17, "kirchner": 9.17},
      // result views show the 2023 candidates as they ran: the inherited
      // 2027 candidates fold back into them
      resultMerge: { kicillof: 'massa', kirchner: 'massa', macri: 'bullrich' },
      // the 2023 runoff baselines per district (Milei vs Massa); the app
      // looks up runoff2026/2023/2022 and remaps when the pairing differs
      runoff2023: {"buenos_aires": {"milei": 49.24, "massa": 50.76}, "buenos_aires_city": {"milei": 57.25, "massa": 42.75}, "catamarca": {"milei": 52.81, "massa": 47.19}, "chaco": {"milei": 49.81, "massa": 50.19}, "chubut": {"milei": 59.07, "massa": 40.93}, "cordoba": {"milei": 74.05, "massa": 25.95}, "corrientes": {"milei": 53.16, "massa": 46.84}, "entre_rios": {"milei": 61.47, "massa": 38.53}, "formosa": {"milei": 43.27, "massa": 56.73}, "jujuy": {"milei": 58.14, "massa": 41.86}, "la_pampa": {"milei": 57.28, "massa": 42.72}, "la_rioja": {"milei": 53.73, "massa": 46.27}, "mendoza": {"milei": 71.17, "massa": 28.83}, "misiones": {"milei": 56.72, "massa": 43.28}, "neuquen": {"milei": 60.43, "massa": 39.57}, "rio_negro": {"milei": 54.22, "massa": 45.78}, "salta": {"milei": 57.67, "massa": 42.33}, "san_juan": {"milei": 60.71, "massa": 39.29}, "san_luis": {"milei": 67.98, "massa": 32.02}, "santa_cruz": {"milei": 58.0, "massa": 42.0}, "santa_fe": {"milei": 62.83, "massa": 37.17}, "santiago_del_estero": {"milei": 31.49, "massa": 68.51}, "tierra_del_fuego": {"milei": 53.32, "massa": 46.68}, "tucuman": {"milei": 51.98, "massa": 48.02}},
      nationalRunoff: {"milei": 55.69, "massa": 44.31},
    },
    pollsterMAE: {},
    maeKey: 'AR2027',
    logos: { milei: 'img/ar/LLA.svg', kicillof: 'img/ar/PJ.svg', kirchner: 'img/ar/PJ.svg', massa: 'img/ar/FR.svg', moreno: 'img/ar/PYV.svg', grabois: 'img/ar/PG.svg', macri: 'img/ar/PRO.svg', schiaretti: 'img/ar/PU.svg', bregman: 'img/ar/FITU.svg', villarruel: 'img/ar/PD.svg' },
  },

  bgpres: {
    name: 'Bulgaria (presidential)',
    name_tr: 'Bulgaristan (başkanlık)',
    unitLabel: { en: 'provinces', tr: 'vilayet' },
    seats: 1,
    threshold: 0,
    seatBased: false,
    mapOnly: true,
    hideBlocs: true,
    recencyHalfLifeDays: 14,
    election_date: '2026-10-25',
    election_date_runoff: '2026-11-01',
    firstRoundDate: '2026-10-25',
    firstRoundResult: {"iotova": 34.759, "gyurov": 31.952, "kostadinov": 12.545, "vasilev": 4.608, "mihaylov": 3.787, "hristanov": 2.393},
    runoffAnchor: 0.8,
    runoffEndorsement: { candidate: 'gyurov', delta: 1.5, lo: 0.5, hi: 2.5,
      source: 'GERB/SDS endorsement (30 Oct)' },
    // Transfer prior from the eliminated first-round candidates. Shares are
    // of each candidate's first-round vote; the remainder abstains/blank.
    runoffTransferWeight: 0.4,
    runoffTransfers: {
      kostadinov: { iotova: 0.65, gyurov: 0.10 },
      vasilev:    { iotova: 0.10, gyurov: 0.65 },
      mihaylov:   { iotova: 0.65, gyurov: 0.10 },
      hristanov:  { iotova: 0.25, gyurov: 0.55 },
      others:     { iotova: 0.40, gyurov: 0.40 },
    },
    runoffOnly: true,
    parties: {
      iotova:     { code: 'IOTOVA', name: 'Iliana Iotova', name_en: 'Iliana Iotova', color: '#DB0F28' },
      gyurov:     { code: 'GYUROV', name: 'Andrey Gyurov', name_en: 'Andrey Gyurov', color: '#4200FF' },
      kostadinov: { code: 'KOST.', name: 'Kostadin Kostadinov', name_en: 'Kostadin Kostadinov', color: '#C09F62', ideology: "Ultranationalism, National conservatism, Right-wing populism"},
      vasilev:    { code: 'VASILEV', name: 'Radostin Vasilev', name_en: 'Radostin Vasilev', color: '#1A2C44', ideology: "Liberalism, Anti-corruption, Pro-Europeanism"},
      mihaylov:   { code: 'MIHAYLOV', name: 'Ivelin Mihaylov', name_en: 'Ivelin Mihaylov', color: '#AC2225', ideology: "Bulgarian nationalism, Populism"},
      hristanov:  { code: 'HRIST.', name: 'Ivan Hristanov', name_en: 'Ivan Hristanov', color: '#c0cc66', ideology: "Liberalism, Anti-corruption, Pro-Europeanism"},
      radev:      { code: 'RADEV', name: 'Rumen Radev', name_en: 'Rumen Radev', color: '#DB0F28', pastOnly: true, ideology: "Left-wing populism, Left-wing nationalism, Social conservatism"},
      gerdzhikov: { code: 'GERDZH.', name: 'Anastas Gerdzhikov', name_en: 'Anastas Gerdzhikov', color: '#7B93C9', pastOnly: true, ideology: "Conservatism, Populism, Pro-Europeanism"},
      karadayi:   { code: 'KARAD.', name: 'Mustafa Karadayi', name_en: 'Mustafa Karadayi', color: '#0065B7', pastOnly: true, ideology: "Turkish minority interests, Liberal conservatism"},
      panov:      { code: 'PANOV', name: 'Lozan Panov', name_en: 'Lozan Panov', color: '#004A80', pastOnly: true, ideology: "Liberal conservatism, Conservative liberalism, Liberalism (Bulgarian)"},
      nota:       { code: 'NOTA', name: 'None of the above', name_en: 'None of the above', color: '#9CA3AF', unallocated: true },
    },
    order: ['iotova', 'gyurov', 'kostadinov', 'vasilev', 'mihaylov', 'hristanov', 'radev', 'gerdzhikov', 'karadayi', 'panov', 'nota'],
    parlOrder: ['panov', 'karadayi', 'gerdzhikov', 'radev', 'hristanov', 'vasilev', 'gyurov', 'iotova', 'mihaylov', 'kostadinov', 'nota'],
    blocs: {
      bloc1: { name: 'Iotova', short: 'IOT', parties: ['iotova'], color: '#DB0F28' },
      bloc2: { name: 'Gyurov', short: 'GYU', parties: ['gyurov'], color: '#4200FF' },
    },
    lastElection: {
      date: '2021-11-21',
      // the 2021 first round as it happened (Radev 49.42 with Iotova as
      // his running mate, Gerdzhikov 22.83, Karadayi 11.57 for DPS, Panov
      // 3.68 for DB, Kostadinov 3.92); the 2026 candidates did not stand
      results: { radev: 49.42, gerdzhikov: 22.83, karadayi: 11.57, kostadinov: 3.92, panov: 3.68, nota: 2.3, iotova: 0, gyurov: 0, vasilev: 0, mihaylov: 0, hristanov: 0 },
      seats: { radev: 1, gerdzhikov: 0, karadayi: 0, kostadinov: 0, panov: 0, iotova: 0, gyurov: 0, vasilev: 0, mihaylov: 0, hristanov: 0 },
    },
    map: {},
    map2: {},
    pollsterMAE: {},
    maeKey: 'BGPRES2026',
    logos: {
      iotova: 'img/bg/BSP.svg', gyurov: 'img/bg/PPDB.svg',
      kostadinov: 'img/bg/VAZ.svg', vasilev: 'img/bg/MECH.svg',
      mihaylov: 'img/bg/VELI.svg', hristanov: 'img/bg/Edinenie.svg',
      radev: 'img/bg/PB.svg', gerdzhikov: 'img/bg/PPDB.svg',
      karadayi: 'img/bg/DPS.svg', panov: 'img/bg/DB.svg',
    },
  },

  bg: {
    name: 'Bulgaria',
    name_tr: 'Bulgaristan',
    unitLabel: { en: 'provinces', tr: 'vilayet' },
    seats: 240,
    threshold: 4.0,
    method: 'hare_niemeyer',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      pb:   { code: 'PB',   name: 'Progressive Bulgaria', name_en: 'Progressive Bulgaria', color: '#034A3F', ideology: "Left-wing populism, Left-wing nationalism, Social conservatism"},
      gerb: { code: 'GERB', name: 'GERB–SDS', name_en: 'GERB–SDS', color: '#0054A6', ideology: "Conservatism, Populism, Pro-Europeanism"},
      pp:   { code: 'PP',   name: 'We Continue the Change', name_en: 'We Continue the Change', color: '#FFC300', ideology: "Liberalism"},
      db:   { code: 'DB',   name: 'Democratic Bulgaria', name_en: 'Democratic Bulgaria', color: '#004A80', ideology: "Liberal conservatism, Conservative liberalism, Liberalism (Bulgarian)"},
      dps:  { code: 'DPS',  name: 'Movement for Rights and Freedoms', name_en: 'Movement for Rights and Freedoms', color: '#0065B7', ideology: "Turkish minority interests, Liberal conservatism"},
      vaz:  { code: 'VAZ',  name: 'Vazrazhdane', name_en: 'Vazrazhdane', color: '#C09F62', ideology: "Ultranationalism, National conservatism, Right-wing populism"},
      mech: { code: 'MECH', name: 'MECH', name_en: 'Moral, Unity, Honour', color: '#1A2C44', ideology: "Bulgarian nationalism, Right-wing populism, Social conservatism"},
      veli: { code: 'VEL',  name: 'Velichie', name_en: 'Greatness', color: '#AC2225', ideology: "Populism, National conservatism"},
      bsp:  { code: 'BSP',  name: 'BSP – United Left', name_en: 'BSP – United Left', color: '#DB0F28', ideology: "Social democracy, Left-wing populism"},
      aps:  { code: 'APS',  name: 'Alliance for Rights and Freedoms', name_en: 'Alliance for Rights and Freedoms', color: '#C55AD3', ideology: "Turkish minority interests, Liberalism"},
      ppdb: { code: 'PPDB', name: 'PP–DB', name_en: 'PP–DB', color: '#4200FF', pastOnly: true, ideology: "Liberalism, Anti-corruption, Pro-Europeanism"},
      nota: { code: 'NOTA', name: 'None of the above', name_en: 'None of the above', color: '#9CA3AF', unallocated: true },
    },
    order: ['pb', 'gerb', 'pp', 'db', 'dps', 'vaz', 'mech', 'veli', 'bsp', 'aps', 'ppdb', 'nota'],
    parlOrder: ['bsp', 'aps', 'dps', 'pp', 'db', 'pb', 'mech', 'vaz', 'gerb', 'veli', 'ppdb', 'nota'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['pb'], color: '#034A3F' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['gerb', 'pp', 'db', 'dps', 'vaz', 'mech', 'veli', 'bsp', 'aps'], color: '#0054A6' },
    },
    lastElection: {
      date: '2026-04-19',
      // PP-DB ran as one list in 2026 (37 seats); the two parties sit
      // separately in the current parliament and in the polls
      results: {"pb": 43.9, "gerb": 13.2, "pp": 0, "db": 0, "dps": 7.0, "vaz": 4.2, "mech": 3.2, "veli": 3.1, "bsp": 3.0, "aps": 1.5, "ppdb": 12.4, "nota": 1.5},
      seats: {"pb": 131, "gerb": 39, "pp": 0, "db": 0, "dps": 21, "vaz": 12, "mech": 0, "veli": 0, "bsp": 0, "aps": 0, "ppdb": 37},
    },
    map: {},
    map2: {},
    pollsterMAE: {},
    maeKey: 'BG2026',
    logos: {
      pb: 'img/bg/PB.svg', gerb: 'img/bg/GERB.svg', pp: 'img/bg/PP.svg',
      db: 'img/bg/DB.svg', dps: 'img/bg/DPS.svg', vaz: 'img/bg/VAZ.svg',
      mech: 'img/bg/MECH.svg', veli: 'img/bg/VELI.svg',
      bsp: 'img/bg/BSP.svg', aps: 'img/bg/APS.svg', ppdb: 'img/bg/PPDB.svg',
    },
  },

  lt: {
    name: 'Lithuania',
    name_tr: 'Litvanya',
    seats: 141,                   // 71 single-member districts + 70 PR
    threshold: 5.0,               // 5% national for the 70 PR seats (7% for coalitions, not modelled)
    method: 'hare_niemeyer',      // PR tier: largest remainder, Hare quota
    seatBased: false,
    constituencies: false,        // the district tier reads the map's winnerDistricts, not a store
    districtRunoff: true,         // district races are two-round; projected by round-1 plurality
    recencyHalfLifeDays: 30,      // Spinter/Baltijos tyrimai publish monthly
    parties: {
      lsdp:    { code: 'LSDP',    name: 'Lietuvos socialdemokrat\u0173 partija', name_en: 'Social Democratic Party of Lithuania', color: '#E10514', ideology: "Social democracy" },
      tslkd:   { code: 'TS-LKD',  name: 'T\u0117vyn\u0117s s\u0105junga\u2013Lietuvos krik\u0161\u010dionys demokratai', name_en: 'Homeland Union', color: '#3359A3', ideology: "Christian democracy, Liberal conservatism" },
      na:      { code: 'NA',      name: 'Nemuno au\u0161ra', name_en: 'Dawn of Nemunas', color: '#F25D23', ideology: "Right-wing populism, Anti-establishment" },
      dsvl:    { code: 'DSVL',    name: 'Demokrat\u0173 s\u0105junga \u201eVardan Lietuvos\u201c', name_en: 'Union of Democrats "For Lithuania"', color: '#001C53', ideology: "Third Way, Green conservatism" },
      ls:      { code: 'LS',      name: 'Liberal\u0173 s\u0105j\u016bdis', name_en: "Liberals' Movement (Lithuania)", color: '#FF9300', ideology: "Classical liberalism" },
      lvzs:    { code: 'LV\u017dS',   name: 'Lietuvos valstie\u010di\u0173 ir \u017eali\u0173j\u0173 s\u0105junga', name_en: 'Lithuanian Farmers and Greens Union', color: '#00A54F', ideology: "Agrarianism, Green conservatism" },
      lp:      { code: 'LP',      name: 'Laisv\u0117s partija', name_en: 'Freedom Party (Lithuania)', color: '#E852CC', ideology: "Liberalism" },
      llrakss: { code: 'LLRA-K\u0160S', name: 'Lietuvos lenk\u0173 rinkim\u0173 akcija\u2013Krik\u0161\u010dioni\u0161k\u0173 \u0161eim\u0173 s\u0105junga', name_en: 'Electoral Action of Poles in Lithuania \u2013 Christian Families Alliance', color: '#781323', ideology: "Christian democracy, Polish minority interest" },
      ns:      { code: 'NS',      name: 'Nacionalinis susivienijimas', name_en: 'National Alliance (Lithuania)', color: '#BB2212', ideology: "Lithuanian nationalism" },
      dp:      { code: 'DP',      name: 'Darbo partija', name_en: 'Labour Party (Lithuania)', color: '#1D578C', ideology: "Populism" },
      lrp:     { code: 'LRP',     name: 'Lietuvos region\u0173 partija', name_en: 'Lithuanian Regions Party', color: '#FFCC00', ideology: "Social democracy, Regionalism, Social conservatism" },
      lzp:     { code: 'L\u017dP',    name: 'Lietuvos \u017eali\u0173j\u0173 partija', name_en: 'Lithuanian Green Party', color: '#00B183', ideology: "Green liberalism, Pro-Europeanism" },
      tts:     { code: 'TTS',     name: 'Tautos ir teisingumo s\u0105junga (centristai, tautininkai)', name_en: 'People and Justice Union', color: '#013861', ideology: "National conservatism, Euroscepticism" },
      cds:     { code: 'CDS',     name: 'Centro de\u0161in\u0117s s\u0105junga', name_en: 'Center-Right Union', color: '#4A6FA5', ideology: "Conservative liberalism, National liberalism, Soft Euroscepticism" },
      lv:      { code: 'LV',      name: 'Lietuva \u2013 vis\u0173', name_en: 'Lithuania \u2013 For Everyone', color: '#8B5E3C', ideology: "Lithuanian diaspora interests" },
    },
    order: ['lsdp', 'tslkd', 'na', 'dsvl', 'ls', 'lvzs', 'lp', 'llrakss', 'ns', 'dp', 'lrp', 'lzp', 'tts', 'cds', 'lv'],
    parlOrder: ['dp', 'lzp', 'lvzs', 'lsdp', 'dsvl', 'lrp', 'ls', 'lp', 'lv', 'cds', 'llrakss', 'tslkd', 'tts', 'na', 'ns'],
    // the Sinkevicius cabinet (July 2026): LSDP + DSVL + LVZS + LLRA-KSS
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['lsdp', 'dsvl', 'lvzs', 'llrakss'], color: '#E10514' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['tslkd', 'na', 'ls', 'lp', 'ns', 'dp', 'lrp', 'lzp', 'tts', 'cds', 'lv'], color: '#2F6CD1' },
    },
    coalitions: [
      { name: 'LSDP + DSVL + LV\u017dS + LLRA-K\u0160S', parties: ['lsdp', 'dsvl', 'lvzs', 'llrakss'] },
      { name: 'LSDP + DSVL + LV\u017dS + LLRA-K\u0160S + NA', parties: ['lsdp', 'dsvl', 'lvzs', 'llrakss', 'na'] },
      { name: 'TS-LKD + LS + LP', parties: ['tslkd', 'ls', 'lp'] },
      { name: 'TS-LKD + NA + LS + LP', parties: ['tslkd', 'na', 'ls', 'lp'] },
    ],
    lastElection: {
      date: '2024-10-13',
      results: { lsdp: 19.70, tslkd: 18.35, na: 15.26, dsvl: 9.40, ls: 7.85, lvzs: 7.16, lp: 4.62, llrakss: 3.96, ns: 2.93, dp: 2.24, lrp: 1.93, lzp: 1.72, tts: 1.41, cds: 0, lv: 0 },
      seats:   { lsdp: 52, tslkd: 28, na: 20, dsvl: 14, ls: 12, lvzs: 8, llrakss: 3, ns: 1, tts: 1 },
    },
    map: {},
    pollsterMAE: {
      "Baltijos tyrimai": { LT2028: 3.01, overall: 3.01 },
      "Open Agency/Norstat": { LT2028: 3.34, overall: 3.34 },
      "Spinter tyrimai": { LT2028: 2.24, overall: 2.24 },
      "Spinter tyrimai [ link removed ]": { LT2028: 2.64, overall: 2.64 },
      "Vilmorus": { LT2028: 3.85, overall: 3.85 },
      "Vilmorus [ link removed ]": { LT2028: 4.2, overall: 4.2 }
    },
    maeKey: 'LT2028',
    logos: {
      lsdp: 'img/lt/LSDP.svg', tslkd: 'img/lt/TSLKD.svg', na: 'img/lt/PPNA.svg',
      dsvl: 'img/lt/DSVL.svg', ls: 'img/lt/LS.svg', lvzs: 'img/lt/LVZS.svg',
      lp: 'img/lt/LP.svg', llrakss: 'img/lt/LLRAKSS.svg', ns: 'img/lt/NS.svg',
      dp: 'img/lt/DP.svg', lrp: 'img/lt/LRP.svg', lzp: 'img/lt/LZP.svg',
      tts: 'img/lt/TTS.svg', cds: 'img/lt/CDS.svg', lv: 'img/lt/PLV.svg',
    },
  },

  md: {
    name: 'Moldova',
    seats: 101,
    threshold: 5.0,
    method: 'dhondt',             // national closed-list PR, D'Hondt
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    defaultDays: 2026,            // sparse source: quarterly polls since 2025
    parties: {
      pas:  { code: 'PAS',  name: 'Partidul Acțiune și Solidaritate', name_en: 'Party of Action and Solidarity', color: '#FFDD00', ideology: "Liberalism (Moldovan), Pro-Europeanism"},
      psrm: { code: 'PSRM', name: 'Partidul Socialiștilor din Republica Moldova', name_en: 'Party of Socialists of the Republic of Moldova', color: '#9C162E', ideology: "Democratic socialism, Socialism, Social conservatism"},
      pcrm: { code: 'PCRM', name: 'Partidul Comuniștilor din Republica Moldova', name_en: 'Party of Communists of the Republic of Moldova', color: '#C00302', ideology: "Communism, Marxism–Leninism, Left-conservatism"},
      pvm:  { code: 'PVM',  name: 'Partidul Viitorul Moldovei', name_en: 'Future of Moldova Party', color: '#FF7900', ideology: "Left-wing populism, Left-wing nationalism, Russophilia"},
      prim: { code: 'PRIM', name: 'Partidul Inima Moldovei', name_en: 'Heart of Moldova Party', color: '#0046AE', ideology: "Democratic socialism, Socialism, Social conservatism"},
      man:  { code: 'MAN',  name: 'Mișcarea Alternativa Națională', name_en: 'National Alternative Movement', color: '#0F7B61', ideology: "Social democracy, Pro-Europeanism"},
      pdcm: { code: 'PDCM', name: 'Partidul Dezvoltării și Consolidării Moldovei', name_en: 'Party of Development and Consolidation of Moldova', color: '#71004B', ideology: "Christian democracy, Pro-Europeanism"},
      pacc: { code: 'PAC–CC', name: 'Partidul Acțiunea Comună – Congresul Civic', name_en: 'Common Action Party – Civil Congress', color: '#EF7F1A', ideology: "Democratic socialism, Progressivism, Social justice"},
      pn:   { code: 'PN',   name: 'Partidul Nostru', name_en: 'Our Party', color: '#2680FA', ideology: "Left-wing populism, Social conservatism, Moldovenism"},
      ppda: { code: 'PPDA', name: 'Partidul Democrația Acasă', name_en: 'Democracy at Home Party', color: '#24247A', ideology: "Right-wing populism, Moldovan–Romanian unionism, Pro-Europeanism"},
      psde: { code: 'PSDE', name: 'Partidul Social Democrat European', name_en: 'European Social Democratic Party', color: '#D93029', ideology: "Social democracy, Left-wing populism, Pro-Europeanism"},
      bep:  { code: 'BEP',  name: 'Blocul Electoral Patriotic', name_en: 'Patriotic Electoral Bloc', color: '#BA1906', pastOnly: true, ideology: "Russophilia, Euroscepticism"},
      ba:   { code: 'BA',   name: 'Blocul Alternativ', name_en: 'Alternative Bloc', color: '#026D59', pastOnly: true, ideology: "Social democracy, Anti-corruption"},
    },
    order: ['pas', 'psrm', 'pcrm', 'pvm', 'prim', 'man', 'pdcm', 'pacc', 'pn', 'ppda', 'psde', 'bep', 'ba'],
    parlOrder: ['pcrm', 'psrm', 'bep', 'pdcm', 'psde', 'pacc', 'pas', 'ppda', 'prim', 'man', 'ba', 'pn'],
    // Government vs Opposition (the site convention: the forecast's majority
    // simulation needs a two-bloc structure; Moldova has no formal blocs)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['pas'], color: '#FFDD00' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['psrm', 'pcrm', 'pn', 'ppda', 'man', 'pdcm', 'prim', 'pvm', 'pacc', 'psde'], color: '#9C162E' },
    },
    lastElection: {
      date: '2025-09-28',
      // the 2025 blocs: BEP (PSRM/PCRM) and Alternative (MAN/PDCM/PRIM);
      // both dissolved, the components run separately in the polls
      results: {"pas": 50.2, "psrm": 0, "pcrm": 0, "pvm": 0, "prim": 0, "man": 0, "pdcm": 0, "pacc": 0, "pn": 6.2, "ppda": 5.62, "psde": 0.95, "bep": 24.2, "ba": 7.96},
      seats: {"pas": 55, "psrm": 0, "pcrm": 0, "pvm": 0, "prim": 0, "man": 0, "pdcm": 0, "pacc": 0, "pn": 6, "ppda": 6, "psde": 0, "bep": 26, "ba": 8},
    },
    map: {
      svg: 'img/moldova.svg',
      selector: 'id',
      swingMethod: 'geometric',
      // the 5% threshold is national, not per district
      districtThreshold: false,
      districts: {"anenii_noi": "anenii_noi", "balti": "balti", "basarabeasca": "basarabeasca", "bender": "bender", "briceni": "briceni", "cahul": "cahul", "calarasi": "calarasi", "cantemir": "cantemir", "causeni": "causeni", "chisinau": "chisinau", "cimislia": "cimislia", "criuleni": "criuleni", "donduseni": "donduseni", "drochia": "drochia", "dubasari": "dubasari", "edinet": "edinet", "falesti": "falesti", "floresti": "floresti", "gagauzia": "gagauzia", "glodeni": "glodeni", "hincesti": "hincesti", "ialoveni": "ialoveni", "leova": "leova", "nisporeni": "nisporeni", "ocnita": "ocnita", "orhei": "orhei", "rezina": "rezina", "riscani": "riscani", "singerei": "singerei", "soldanesti": "soldanesti", "soroca": "soroca", "stefan_voda": "stefan_voda", "straseni": "straseni", "taraclia": "taraclia", "telenesti": "telenesti", "transnistria": "transnistria", "ungheni": "ungheni"},
      names: {"anenii_noi": "Anenii Noi", "balti": "Bălți", "basarabeasca": "Basarabeasca", "bender": "Bender", "briceni": "Briceni", "cahul": "Cahul", "calarasi": "Calarasi", "cantemir": "Cantemir", "causeni": "Causeni", "chisinau": "Chișinău", "cimislia": "Cimislia", "criuleni": "Criuleni", "donduseni": "Donduseni", "drochia": "Drochia", "dubasari": "Dubasari", "edinet": "Edinet", "falesti": "Falesti", "floresti": "Floresti", "gagauzia": "UTA Gagauzia", "glodeni": "Glodeni", "hincesti": "Hincesti", "ialoveni": "Ialoveni", "leova": "Leova", "nisporeni": "Nisporeni", "ocnita": "Ocnita", "orhei": "Orhei", "rezina": "Rezina", "riscani": "Riscani", "singerei": "Singerei", "soldanesti": "Soldanesti", "soroca": "Soroca", "stefan_voda": "Stefan Voda", "straseni": "Straseni", "taraclia": "Taraclia", "telenesti": "Telenesti", "transnistria": "Left Bank", "ungheni": "Ungheni"},
      gebiete: {"anenii_noi": {"pas": 47.27, "bep": 25.72, "ba": 7.93, "pn": 5.56, "ppda": 8.02}, "balti": {"pas": 26.57, "bep": 41.51, "ba": 10.98, "pn": 14.53, "ppda": 1.87}, "basarabeasca": {"pas": 35.75, "bep": 42.24, "ba": 6.72, "pn": 4.32, "ppda": 7.05}, "bender": {"pas": 29.89, "bep": 51.02, "ba": 8.91, "pn": 2.92, "ppda": 2.36}, "briceni": {"pas": 27.01, "bep": 48.48, "ba": 6.79, "pn": 6.18, "ppda": 5.36}, "cahul": {"pas": 44.35, "bep": 28.3, "ba": 8.44, "pn": 3.86, "ppda": 9.78}, "calarasi": {"pas": 59.36, "bep": 16.19, "ba": 4.72, "pn": 5.64, "ppda": 7.33}, "cantemir": {"pas": 52.81, "bep": 20.17, "ba": 5.91, "pn": 6.04, "ppda": 9.73}, "causeni": {"pas": 49.54, "bep": 22.99, "ba": 4.29, "pn": 4.59, "ppda": 12.25}, "chisinau": {"pas": 52.68, "bep": 21.26, "ba": 14.48, "pn": 4.12, "ppda": 2.49}, "cimislia": {"pas": 51.05, "bep": 20.79, "ba": 8.04, "pn": 4.48, "ppda": 9.94}, "criuleni": {"pas": 58.62, "bep": 14.35, "ba": 5.59, "pn": 5.58, "ppda": 7.48}, "donduseni": {"pas": 25.25, "bep": 48.12, "ba": 7.24, "pn": 7.17, "ppda": 5.89}, "drochia": {"pas": 31.74, "bep": 29.85, "ba": 8.39, "pn": 17.4, "ppda": 5.96}, "dubasari": {"pas": 39.94, "bep": 31.29, "ba": 10.91, "pn": 6.55, "ppda": 5.65}, "edinet": {"pas": 27.51, "bep": 42.51, "ba": 8.89, "pn": 5.43, "ppda": 6.28}, "falesti": {"pas": 30.53, "bep": 27.58, "ba": 5.36, "pn": 23.43, "ppda": 4.54}, "floresti": {"pas": 37.68, "bep": 28.6, "ba": 8.07, "pn": 9.74, "ppda": 6.89}, "gagauzia": {"pas": 3.19, "bep": 82.35, "ba": 11.47, "pn": 0.7, "ppda": 0.31}, "glodeni": {"pas": 31.37, "bep": 31.09, "ba": 14.66, "pn": 13.0, "ppda": 5.19}, "hincesti": {"pas": 58.02, "bep": 13.85, "ba": 5.92, "pn": 5.04, "ppda": 9.89}, "ialoveni": {"pas": 65.57, "bep": 8.62, "ba": 5.88, "pn": 4.4, "ppda": 8.17}, "leova": {"pas": 47.32, "bep": 20.72, "ba": 4.55, "pn": 4.09, "ppda": 10.02}, "nisporeni": {"pas": 57.56, "bep": 11.07, "ba": 4.7, "pn": 7.25, "ppda": 8.79}, "ocnita": {"pas": 20.67, "bep": 52.22, "ba": 8.59, "pn": 4.96, "ppda": 5.8}, "orhei": {"pas": 47.43, "bep": 23.87, "ba": 7.04, "pn": 4.02, "ppda": 9.5}, "rezina": {"pas": 47.01, "bep": 23.1, "ba": 6.19, "pn": 5.45, "ppda": 9.79}, "riscani": {"pas": 29.95, "bep": 40.46, "ba": 6.8, "pn": 11.29, "ppda": 4.95}, "singerei": {"pas": 43.05, "bep": 27.3, "ba": 5.49, "pn": 10.71, "ppda": 7.4}, "soldanesti": {"pas": 39.79, "bep": 25.57, "ba": 4.17, "pn": 7.73, "ppda": 12.13}, "soroca": {"pas": 37.79, "bep": 35.49, "ba": 5.27, "pn": 8.52, "ppda": 6.93}, "stefan_voda": {"pas": 47.02, "bep": 23.71, "ba": 4.55, "pn": 4.83, "ppda": 10.1}, "straseni": {"pas": 63.12, "bep": 12.97, "ba": 4.58, "pn": 6.4, "ppda": 6.7}, "taraclia": {"pas": 6.1, "bep": 79.51, "ba": 10.51, "pn": 0.69, "ppda": 0.72}, "telenesti": {"pas": 56.93, "bep": 14.25, "ba": 4.08, "pn": 4.56, "ppda": 9.93}, "transnistria": {"pas": 29.89, "bep": 51.02, "ba": 8.91, "pn": 2.92, "ppda": 2.36}, "ungheni": {"pas": 42.83, "bep": 24.35, "ba": 5.17, "pn": 9.4, "ppda": 8.65}},
      national2021: {"pas": 50.2, "bep": 24.2, "ba": 7.96, "pn": 6.2, "ppda": 5.62},
      // the dissolved blocs' successors inherit the bloc geography
      swingProxy: { psrm: 'bep', pcrm: 'bep', man: 'ba', pdcm: 'ba', prim: 'ba' },
    },
    pollsterMAE: {},
    maeKey: 'MD2029',
    logos: {
      pas: 'img/md/PAS.svg', psrm: 'img/md/PSRM.svg', pcrm: 'img/md/PCRM.svg',
      pvm: 'img/md/PVM.svg', prim: 'img/md/PRIM.svg', man: 'img/md/MAN.svg',
      pdcm: 'img/md/PDCM.svg', pacc: 'img/md/PACCC.svg', pn: 'img/md/PN.svg',
      ppda: 'img/md/PPDA.svg', psde: 'img/md/PSDE.svg',
    },
  },
  ro: {
    name: 'Romania',
    name_tr: 'Romanya',
    seats: 331,
    threshold: 5.0,               // parties; 8/9/10% for alliances
    method: 'hare_niemeyer',      // per-constituency Hare/Niemeyer
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 21,      // pollsters publish monthly
    defaultDays: 90,
    // the 19 deputies of the recognised national minorities are reserved
    // (they are not in the polling tables and always hold their seats)
    reservedSeats: { min: 19 },
    parties: {
      psd:   { code: 'PSD',   name: 'Partidul Social Democrat', name_en: 'Social Democratic Party', color: '#EF3340', ideology: "Social democracy, Social conservatism"},
      aur:   { code: 'AUR',   name: 'Alian\u021ba pentru Unirea Rom\u00e2nilor', name_en: 'Alliance for the Union of Romanians', color: '#FCB21F', ideology: "Conservatism, Christian right, Right-wing populism"},
      pnl:   { code: 'PNL',   name: 'Partidul Na\u021bional Liberal', name_en: 'National Liberal Party', color: '#FDE000', ideology: "Liberal conservatism, Christian democracy, Economic liberalism"},
      usr:   { code: 'USR',   name: 'Uniunea Salva\u021bi Rom\u00e2nia', name_en: 'Save Romania Union', color: '#002A59', ideology: "Liberalism (Romanian), Pro-Europeanism, Anti-corruption"},
      sos:   { code: 'SOS',   name: 'S.O.S. Rom\u00e2nia', name_en: 'S.O.S. Romania', color: '#4DA9DA', ideology: "Romanian ultranationalism, Social conservatism, Right-wing populism"},
      pot:   { code: 'POT',   name: 'Partidul Oamenilor Tineri', name_en: 'Party of Young People', color: '#330099', ideology: "Romanian nationalism, Right-wing populism, Euroscepticism"},
      udmr:  { code: 'UDMR',  name: 'Uniunea Democrat\u0103 Maghiar\u0103 din Rom\u00e2nia', name_en: 'Democratic Union of Hungarians in Romania', color: '#00833E', ideology: "Hungarian minority interests, Regionalism"},
      pmp:   { code: 'PMP',   name: 'Partidul Mi\u0219carea Popular\u0103', name_en: "People's Movement Party", color: '#A7CF35', ideology: "Christian democracy, Liberal conservatism"},
      fd:    { code: 'FD',    name: 'For\u021ba Dreptei', name_en: 'Force of the Right', color: '#08510A', ideology: "Liberal conservatism, Christian democracy, Pro-Europeanism"},
      reper: { code: 'REPER', name: 'Re\u00eennoim Proiectul European al Rom\u00e2niei', name_en: "Renewing Romania's European Project", color: '#C40075', ideology: "Liberalism, Pro-Europeanism"},
      sens:  { code: 'SENS',  name: 'Partidul S\u0103n\u0103tate, Educa\u021bie, Natur\u0103, Sustenabilitate', name_en: 'Health Education Nature Sustainability Party', color: '#A2DA5A', ideology: "Progressivism, Green politics"},
      min:   { code: 'MIN',   name: 'Minorit\u0103\u021bi na\u021bionale', name_en: 'National minorities', color: '#9CA3AF', pastOnly: true, ideology: "National minority interests, Christian democracy"},
    },
    order: ['psd', 'aur', 'pnl', 'usr', 'sos', 'pot', 'udmr', 'pmp', 'fd', 'reper', 'sens', 'min'],
    parlOrder: ['psd', 'min', 'udmr', 'pnl', 'reper', 'sens', 'usr', 'fd', 'pmp', 'aur', 'sos', 'pot'],
    // October 2026 Niculescu cabinet: PSD is the only party in cabinet (with
    // non-partisan ministers); PNL, UDMR and the national-minority group
    // support it externally. USR, AUR, SOS, POT and the rest are opposition.
    incumbent: 'psd',
    blocs: {
      bloc1: { name: 'Government + support', short: 'GOV', parties: ['psd', 'pnl', 'udmr', 'min'], color: '#EF3340' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['usr', 'aur', 'sos', 'pot', 'pmp', 'fd', 'reper', 'sens'], color: '#FCB21F' },
    },
    lastElection: {
      date: '2024-12-01',
      // 19 minority deputies are reserved outside the party allocation
      results: {"psd": 21.96, "aur": 18.01, "pnl": 13.2, "usr": 12.4, "sos": 7.36, "pot": 6.46, "udmr": 6.33, "pmp": 2.05, "fd": 1.88, "reper": 1.37, "sens": 2.99, "min": 0},
      seats: {"psd": 86, "aur": 63, "pnl": 49, "usr": 40, "sos": 28, "pot": 24, "udmr": 22, "min": 19, "pmp": 0, "fd": 0, "reper": 0, "sens": 0},
    },
    map: {},
    pollsterMAE: {},
    maeKey: 'RO2028',
    logos: {
      psd: 'img/ro/PSD.svg', aur: 'img/ro/AUR.svg', pnl: 'img/ro/PNL.svg',
      usr: 'img/ro/USR.svg', sos: 'img/ro/SOS.svg', pot: 'img/ro/POT.svg',
      udmr: 'img/ro/UDMR.svg', pmp: 'img/ro/PMP.svg', fd: 'img/ro/FD.svg',
      reper: 'img/ro/REPER.svg', sens: 'img/ro/SENS.svg',
    },
  },
  dk: {
    name: 'Denmark',
    name_tr: 'Danimarka',
    seats: 179,                   // 175 in Denmark proper + 4 North Atlantic
    threshold: 2.0,
    method: 'sainte_lague_standard',   // unmodified Sainte-Lague levelling
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,      // Voxmeter publishes weekly
    // the four North Atlantic mandates (2 Faroe Islands + 2 Greenland) are
    // separate elections, not in the Danish polls
    reservedSeats: { na: 4 },
    parties: {
      s:   { code: 'S',   name: 'Socialdemokratiet', name_en: 'Social Democrats (Denmark)', color: '#C82518', ideology: "Social democracy, Left-conservatism"},
      sf:  { code: 'SF',  name: 'Socialistisk Folkeparti', name_en: 'Green Left (Denmark)', color: '#EB94D1', ideology: "Democratic socialism, Green politics, Popular socialism"},
      v:   { code: 'V',   name: 'Venstre', name_en: 'Venstre (Denmark)', color: '#01438E', ideology: "Conservative liberalism, Agrarianism (Nordic)"},
      la:  { code: 'LA',  name: 'Liberal Alliance', name_en: 'Liberal Alliance (Denmark)', color: '#3FB2BE', ideology: "Classical liberalism, Right-libertarianism"},
      df:  { code: 'DF',  name: 'Dansk Folkeparti', name_en: "Danish People's Party", color: '#FCD03B', ideology: "Right-wing populism, National conservatism, Euroscepticism"},
      m:   { code: 'M',   name: 'Moderaterne', name_en: 'Moderates (Denmark)', color: '#B48CD2', ideology: "Conservative liberalism, Agrarianism"},
      kf:  { code: 'KF',  name: 'Det Konservative Folkeparti', name_en: "Conservative People's Party (Denmark)", color: '#6B9249', ideology: "Conservatism, Liberal conservatism"},
      el:  { code: 'EL',  name: 'Enhedslisten', name_en: 'Red–Green Alliance (Denmark)', color: '#F7660D', ideology: "Socialism, Eco-socialism, Environmentalism"},
      rv:  { code: 'RV',  name: 'Radikale Venstre', name_en: 'Danish Social Liberal Party', color: '#733280', ideology: "Social liberalism, Green politics"},
      dd:  { code: 'DD',  name: 'Danmarksdemokraterne', name_en: 'Denmark Democrats', color: '#668DD1', ideology: "National conservatism, Right-wing populism"},
      alt: { code: 'ALT', name: 'Alternativet', name_en: 'The Alternative (Denmark)', color: '#18942D', ideology: "Green politics, Social liberalism"},
      bp:  { code: 'BP',  name: 'Borgernes Parti', name_en: "Citizens' Party (Denmark)", color: '#2B72FD', ideology: "Right-wing populism, National conservatism" },
      na:  { code: 'NA',  name: 'Nordatlantiske mandater', name_en: 'North Atlantic mandates', color: '#9CA3AF', pastOnly: true },
    },
    order: ['s', 'sf', 'v', 'la', 'df', 'm', 'kf', 'el', 'rv', 'dd', 'alt', 'bp', 'na'],
    parlOrder: ['el', 'sf', 'alt', 'rv', 's', 'm', 'kf', 'la', 'v', 'dd', 'df', 'bp', 'na'],
    // the source polling table's own groupings: Government (A, B, F, M),
    // Supporting (O, A-ring), Opposition (C, H, I, O, V, AE)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['s', 'rv', 'sf', 'm'], color: '#C82518' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['kf', 'bp', 'la', 'df', 'v', 'dd'], color: '#01438E' },
      bloc3: { name: 'Supporting', short: 'SUP', parties: ['el', 'alt'], color: '#F7660D' },
    },
    coalitions: [
      { name: 'S + SF + M + RV', parties: ['s','sf','m','rv'] },
      { name: 'S + SF + M + RV + EL + ALT', parties: ['s','sf','m','rv','el','alt'] },
      { name: 'V + LA + KF + DD + DF + BP', parties: ['v','la','kf','dd','df','bp'] },
    ],
    lastElection: {
      date: '2026-03-24',
      // the 4 North Atlantic mandates are elected separately
      results: {"s": 21.84, "sf": 11.58, "v": 10.14, "la": 9.37, "df": 9.10, "m": 7.70, "kf": 7.59, "el": 6.34, "rv": 5.81, "dd": 5.75, "alt": 2.57, "bp": 2.13, "na": 0},
      seats: {"s": 38, "sf": 20, "v": 18, "la": 16, "df": 16, "m": 14, "kf": 13, "el": 11, "rv": 10, "dd": 10, "alt": 5, "bp": 4, "na": 4},
    },
    map: {},
    map2: {},
    pollsterMAE: {},
    maeKey: 'DK2030',
    logos: {
      s: 'img/dk/S.svg', sf: 'img/dk/SF.svg', v: 'img/dk/V.svg',
      la: 'img/dk/LA.svg', df: 'img/dk/DF.svg', m: 'img/dk/M.svg',
      kf: 'img/dk/C.svg', el: 'img/dk/EL.svg', rv: 'img/dk/RV.svg',
      dd: 'img/dk/DD.svg', alt: 'img/dk/ALT.svg', bp: 'img/dk/BP.svg',
    },
  },
  fi: {
    name: 'Finland',
    name_tr: 'Finlandiya',
    seats: 200,
    threshold: 0.0,               // no national threshold (district-level)
    method: 'dhondt',             // per-district D'Hondt
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 21,
    defaultDays: 90,
    parties: {
      kok:   { code: 'KOK',  name: 'Kansallinen Kokoomus', name_en: 'National Coalition Party', color: '#006288', ideology: "Liberal conservatism, Pro-Europeanism"},
      ps:    { code: 'PS',   name: 'Perussuomalaiset', name_en: 'Finns Party', color: '#FFDE55', ideology: "National conservatism, Right-wing populism, Euroscepticism"},
      sdp:   { code: 'SDP',  name: 'Suomen Sosialidemokraattinen Puolue', name_en: 'Social Democratic Party of Finland', color: '#F54B4B', ideology: "Social democracy"},
      kesk:  { code: 'KESK', name: 'Suomen Keskusta', name_en: 'Centre Party (Finland)', color: '#3AAD2E', ideology: "Agrarianism (Nordic), Liberalism"},
      vihr:  { code: 'VIHR', name: 'Vihreä liitto', name_en: 'Green League', color: '#006845', ideology: "Green politics"},
      vas:   { code: 'VAS',  name: 'Vasemmistoliitto', name_en: 'Left Alliance (Finland)', color: '#F00A64', ideology: "Democratic socialism, Eco-socialism"},
      sfp:   { code: 'SFP',  name: 'Svenska folkpartiet', name_en: "Swedish People's Party of Finland", color: '#FFDD93', ideology: "Swedish minority interests, Social liberalism"},
      kd:    { code: 'KD',   name: 'Kristillisdemokraatit', name_en: 'Christian Democrats (Finland)', color: '#2B67C9', ideology: "Christian democracy, Social conservatism"},
      liik:  { code: 'LIIK', name: 'Liike Nyt', name_en: 'Movement Now', color: '#AE2375', ideology: "Economic liberalism, Pro-Europeanism"},
      aland: { code: 'Å',   name: 'För Åland', name_en: 'For Åland', color: '#9CA3AF', ideology: "Liberalism"},
    },
    order: ['kok', 'ps', 'sdp', 'kesk', 'vas', 'vihr', 'sfp', 'kd', 'liik', 'aland'],
    parlOrder: ['vas', 'vihr', 'sdp', 'sfp', 'kesk', 'kd', 'kok', 'liik', 'ps', 'aland'],
    // the source polling table's own groupings: Government KOK+PS+SFP+KD
    // (the Orpo cabinet) vs the opposition
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['kok', 'ps', 'sfp', 'kd'], color: '#006288' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['sdp', 'kesk', 'vas', 'vihr', 'liik'], color: '#F54B4B' },
    },
    lastElection: {
      date: '2023-04-02',
      results: {"kok": 20.82, "ps": 20.06, "sdp": 19.95, "kesk": 11.29, "vihr": 7.04, "vas": 7.06, "sfp": 4.31, "kd": 4.22, "liik": 2.42, "aland": 0.37},
      seats: {"kok": 48, "ps": 46, "sdp": 43, "kesk": 23, "vihr": 13, "vas": 11, "sfp": 9, "kd": 5, "liik": 1, "aland": 1},
    },
    map: {
      svg: 'img/finland.svg',
      selector: 'id',
      swingMethod: 'geometric',
      districtThreshold: false,
      districts: {"ahvenanmaa": "ahvenanmaa", "hame": "hame", "helsinki": "helsinki", "kaakkois_suomi": "kaakkois_suomi", "keski_suomi": "keski_suomi", "lappi": "lappi", "oulu": "oulu", "pirkanmaa": "pirkanmaa", "satakunta": "satakunta", "savo_karjala": "savo_karjala", "uusimaa": "uusimaa", "vaasa": "vaasa", "varsinais_suomi": "varsinais_suomi"},
      names: {"ahvenanmaa": "Ahvenanmaa", "hame": "Häme", "helsinki": "Helsinki", "kaakkois_suomi": "Kaakkois-Suomi", "keski_suomi": "Keski-Suomi", "lappi": "Lappi", "oulu": "Oulu", "pirkanmaa": "Pirkanmaa", "satakunta": "Satakunta", "savo_karjala": "Savo-Karjala", "uusimaa": "Uusimaa", "vaasa": "Vaasa", "varsinais_suomi": "Varsinais-Suomi"},
      seatDistricts: {"ahvenanmaa": 1, "hame": 14, "helsinki": 23, "kaakkois_suomi": 15, "keski_suomi": 10, "lappi": 6, "oulu": 18, "pirkanmaa": 20, "satakunta": 8, "savo_karjala": 15, "uusimaa": 37, "vaasa": 16, "varsinais_suomi": 17},
      gebiete: {"ahvenanmaa": {"kok": 0.0, "ps": 0.0, "sdp": 0.0, "kesk": 0.0, "vihr": 0.0, "vas": 0.0, "sfp": 0.0, "kd": 0.0, "liik": 0.0, "aland": 85.57}, "hame": {"kok": 21.5, "ps": 24.42, "sdp": 23.71, "kesk": 8.64, "vihr": 4.74, "vas": 5.87, "sfp": 0.27, "kd": 5.52, "liik": 3.14, "aland": 0.0}, "helsinki": {"kok": 26.41, "ps": 11.29, "sdp": 20.93, "kesk": 1.57, "vihr": 15.31, "vas": 11.8, "sfp": 5.07, "kd": 1.9, "liik": 2.3, "aland": 0.0}, "kaakkois_suomi": {"kok": 21.96, "ps": 22.76, "sdp": 23.67, "kesk": 13.59, "vihr": 5.13, "vas": 3.75, "sfp": 0.21, "kd": 3.51, "liik": 3.51, "aland": 0.0}, "keski_suomi": {"kok": 16.26, "ps": 20.46, "sdp": 22.81, "kesk": 17.74, "vihr": 7.62, "vas": 6.52, "sfp": 0.12, "kd": 5.29, "liik": 1.33, "aland": 0.0}, "lappi": {"kok": 12.23, "ps": 26.76, "sdp": 18.06, "kesk": 24.84, "vihr": 3.46, "vas": 9.94, "sfp": 0.3, "kd": 1.1, "liik": 0.65, "aland": 0.0}, "oulu": {"kok": 14.99, "ps": 25.47, "sdp": 13.75, "kesk": 25.04, "vihr": 5.03, "vas": 9.44, "sfp": 0.19, "kd": 2.75, "liik": 1.07, "aland": 0.0}, "pirkanmaa": {"kok": 21.47, "ps": 20.16, "sdp": 25.85, "kesk": 7.1, "vihr": 7.5, "vas": 6.87, "sfp": 0.3, "kd": 5.46, "liik": 2.55, "aland": 0.0}, "satakunta": {"kok": 17.04, "ps": 26.65, "sdp": 24.6, "kesk": 13.91, "vihr": 2.7, "vas": 8.28, "sfp": 0.35, "kd": 3.21, "liik": 1.75, "aland": 0.0}, "savo_karjala": {"kok": 16.35, "ps": 20.04, "sdp": 19.12, "kesk": 19.7, "vihr": 5.66, "vas": 5.47, "sfp": 0.06, "kd": 9.82, "liik": 2.09, "aland": 0.0}, "uusimaa": {"kok": 26.21, "ps": 18.17, "sdp": 19.88, "kesk": 4.77, "vihr": 7.64, "vas": 4.56, "sfp": 8.66, "kd": 3.49, "liik": 3.73, "aland": 0.0}, "vaasa": {"kok": 14.22, "ps": 21.27, "sdp": 11.74, "kesk": 17.93, "vihr": 2.73, "vas": 2.42, "sfp": 19.27, "kd": 6.93, "liik": 1.5, "aland": 0.0}, "varsinais_suomi": {"kok": 23.02, "ps": 19.98, "sdp": 18.13, "kesk": 8.4, "vihr": 6.96, "vas": 11.55, "sfp": 4.96, "kd": 2.82, "liik": 2.35, "aland": 0.0}},
      national2021: {"kok": 20.82, "ps": 20.06, "sdp": 19.95, "kesk": 11.29, "vihr": 7.04, "vas": 7.06, "sfp": 4.31, "kd": 4.22, "liik": 2.42, "aland": 0.37},
    },
    pollsterMAE: {},
    maeKey: 'FI2027',
    logos: {
      kok: 'img/fi/KOK.svg', ps: 'img/fi/PS.svg', sdp: 'img/fi/SDP.svg',
      kesk: 'img/fi/KESK.svg', vihr: 'img/fi/VIHR.svg', vas: 'img/fi/VAS.svg',
      sfp: 'img/fi/SFP.svg', kd: 'img/fi/KD.svg', liik: 'img/fi/LIIK.svg',
    },
  },
  no: {
    name: 'Norway',
    name_tr: 'Norveç',
    seats: 169,                   // 150 district seats + 19 leveling seats
    threshold: 4.0,               // 4% national for the leveling seats
    method: 'sainte_lague',       // modified Sainte-Lague, first divisor 1.4
    seatBased: false,
    constituencies: false,        // the two-tier allocator reads the map's seatDistricts
    levelingSeats: 19,
    recencyHalfLifeDays: 14,
    parties: {
      ap:  { code: 'Ap',  name: 'Arbeiderpartiet', name_en: 'Labour Party (Norway)', color: '#E11926', ideology: "Social democracy, Pro-Europeanism" },
      frp: { code: 'FrP', name: 'Fremskrittspartiet', name_en: 'Progress Party (Norway)', color: '#004F80', ideology: "National conservatism, Right-libertarianism, Right-wing populism" },
      h:   { code: 'H',   name: 'Høyre', name_en: 'Conservative Party (Norway)', color: '#87ADD7', ideology: "Liberal conservatism, Pro-Europeanism" },
      sv:  { code: 'SV',  name: 'Sosialistisk Venstreparti', name_en: 'Socialist Left Party (Norway)', color: '#B5317C', ideology: "Socialism, Democratic socialism, Eco-socialism" },
      sp:  { code: 'Sp',  name: 'Senterpartiet', name_en: 'Centre Party (Norway)', color: '#00843D', ideology: "Agrarianism (Nordic), Economic nationalism" },
      r:   { code: 'R',   name: 'Rødt', name_en: 'Red Party (Norway)', color: '#871212', ideology: "Communism, Anti-capitalism, Socialism, Democratic socialism, Marxism" },
      mdg: { code: 'MDG', name: 'Miljøpartiet De Grønne', name_en: 'Green Party (Norway)', color: '#6A9325', ideology: "Green politics, Pro-Europeanism" },
      krf: { code: 'KrF', name: 'Kristelig Folkeparti', name_en: 'Christian Democratic Party (Norway)', color: '#FDED34', ideology: "Christian democracy, Social conservatism" },
      v:   { code: 'V',   name: 'Venstre', name_en: 'Liberal Party (Norway)', color: '#006666', ideology: "Liberalism (Norwegian), Social liberalism, Green liberalism" },
    },
    order: ['r', 'sv', 'mdg', 'ap', 'sp', 'v', 'krf', 'h', 'frp'],
    parlOrder: ['r', 'sv', 'mdg', 'ap', 'sp', 'v', 'krf', 'h', 'frp'],
    // the source polling table's own grouping: Red (R, SV, MDG, Ap, Sp) vs
    // Blue (V, KrF, H, FrP); Ap governs alone since the 2025 election,
    // supported on budgets by the red-green parties
    incumbent: 'ap',             // Ap governs alone; bloc1 is the wider red-green camp
    blocs: {
      bloc1: { name: 'Red–green', short: 'RED', parties: ['r', 'sv', 'mdg', 'ap', 'sp'], color: '#C8102E' },
      bloc2: { name: 'Blue', short: 'BLU', parties: ['v', 'krf', 'h', 'frp'], color: '#0057B8' },
    },
    coalitions: [
      { name: 'Ap + Sp + SV', parties: ['ap', 'sp', 'sv'] },
      { name: 'Ap + Sp + SV + R + MDG', parties: ['ap', 'sp', 'sv', 'r', 'mdg'] },
      { name: 'H + FrP + V + KrF', parties: ['h', 'frp', 'v', 'krf'] },
      { name: 'H + FrP + V', parties: ['h', 'frp', 'v'] },
    ],
    lastElection: {
      date: '2025-09-08',
      results: { ap: 28.02, frp: 23.85, h: 14.65, sv: 5.63, sp: 5.59, r: 5.32, mdg: 4.74, krf: 4.20, v: 3.69 },
      seats:   { ap: 53, frp: 47, h: 24, sv: 9, sp: 9, r: 9, mdg: 8, krf: 7, v: 3 },
    },
    map: {},
    map2: {},
    pollsterMAE: {},
    maeKey: 'NO2029',
    logos: {
      ap: 'img/no/AP.svg', frp: 'img/no/FRP.svg', h: 'img/no/H.svg',
      sv: 'img/no/SV.svg', sp: 'img/no/SP.svg', r: 'img/no/R.svg',
      mdg: 'img/no/MDG.svg', krf: 'img/no/KRF.svg', v: 'img/no/V.svg',
    },
  },

  pt: {
    name: 'Portugal',
    name_tr: 'Portekiz',
    seats: 230,
    threshold: 0,
    method: 'dhondt',
    seatBased: false,
    constituencies: false,
    recencyHalfLifeDays: 14,
    parties: {
      ad:    { code: 'AD',    name: 'Aliança Democrática', name_en: 'Democratic Alliance', color: '#3777BC', ideology: "Liberal conservatism, Christian democracy"},
      ps:    { code: 'PS',    name: 'Partido Socialista', name_en: 'Socialist Party (Portugal)', color: '#FF66FF', ideology: "Social democracy"},
      ch:    { code: 'CH',    name: 'Chega', name_en: 'Chega', color: '#222256', ideology: "National conservatism, Right-wing populism, Social conservatism"},
      il:    { code: 'IL',    name: 'Iniciativa Liberal', name_en: 'Liberal Initiative', color: '#00ADEF', ideology: "Liberalism (Portuguese), Libertarianism"},
      livre: { code: 'L',     name: 'LIVRE', name_en: 'LIVRE', color: '#C2D216', ideology: "Green politics, Libertarian socialism, Liberal socialism"},
      cdu:   { code: 'CDU',   name: 'CDU (PCP-PEV)', name_en: 'Unitary Democratic Coalition', color: '#FF0000', ideology: "Communism, Eco-socialism, Social conservatism"},
      be:    { code: 'BE',    name: 'Bloco de Esquerda', name_en: 'Left Bloc', color: '#8B0000', ideology: "Democratic socialism, Left-wing populism, Anti-capitalism"},
      pan:   { code: 'PAN',   name: 'Pessoas–Animais–Natureza', name_en: 'People Animals Nature', color: '#008080', ideology: "Environmentalism, Animal rights, Ecofeminism"},
      jpp:   { code: 'JPP',   name: 'Juntos Pelo Povo', name_en: 'Together for the People', color: '#00A28B', ideology: "Regionalism, Social liberalism"},
    },
    order: ['ad', 'ps', 'ch', 'il', 'livre', 'cdu', 'be', 'pan', 'jpp'],
    parlOrder: ['cdu', 'be', 'livre', 'pan', 'jpp', 'ps', 'ad', 'il', 'ch'],
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['ad'], color: '#3777BC' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['ps', 'ch', 'il', 'livre', 'cdu', 'be', 'pan', 'jpp'], color: '#E63946' },
    },
    coalitions: [
      { name: 'AD + IL', parties: ['ad','il'] },
      { name: 'PS + BE + CDU + Livre', parties: ['ps','be','cdu','livre'] },
    ],
    lastElection: {
      date: '2025-05-18',
      results: {"ad": 31.78, "ps": 22.83, "ch": 22.76, "il": 5.36, "livre": 4.07, "cdu": 2.91, "be": 1.99, "pan": 1.38, "jpp": 0.33},
      seats: {"ad": 91, "ps": 58, "ch": 60, "il": 9, "cdu": 3, "be": 1, "livre": 6, "pan": 1, "jpp": 1},
    },
    map: {},
    map2: {},
    pollsterMAE: {},
    maeKey: 'PT2025',
    logos: {
      ad: 'img/pt/AD.svg', ps: 'img/pt/PS.svg', ch: 'img/pt/CH.svg',
      il: 'img/pt/IL.svg', livre: 'img/pt/LIVRE.svg', cdu: 'img/pt/CDU.svg',
      be: 'img/pt/BE.svg', pan: 'img/pt/PAN.svg', jpp: 'img/pt/JPP.svg',
    },
  },

  uk: {
    name: 'United Kingdom',
    name_tr: 'Birleşik Krallık',
    seats: 650,
    threshold: 0,                 // no threshold (first-past-the-post)
    method: 'fptp',               // winner-takes-all in 650 single-member seats
    seatBased: false,             // polls report vote shares (%)
    constituencies: true,         // the map is the 650 constituencies
    constituencyRule: 'fptp',
    hideBlocs: true,              // no government/opposition bloc cards
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // colours from the en.wikipedia party infoboxes
    parties: {
      lab:  { code: 'LAB',  name: 'Labour Party',             name_en: 'Labour Party',             color: '#E41C3E', ideology: "Social democracy"},
      con:  { code: 'CON',  name: 'Conservative Party',       name_en: 'Conservative Party',       color: '#0087DC', ideology: "Conservatism, British unionism"},
      ref:  { code: 'REF',  name: 'Reform UK',                name_en: 'Reform UK',                color: '#1EB8D0', ideology: "Right-wing populism, Hard Euroscepticism"},
      lib:  { code: 'LD',   name: 'Liberal Democrats',        name_en: 'Liberal Democrats',        color: '#FAA61A', ideology: "Liberalism, Social liberalism, Pro-Europeanism"},
      grn:  { code: 'GRN',  name: 'Green Party',              name_en: 'Green Party',              color: '#02A95B', ideology: "Green politics"},
      snp:  { code: 'SNP',  name: 'Scottish National Party',  name_en: 'Scottish National Party',  color: '#FDF38E', ideology: "Scottish nationalism, Scottish independence, Social democracy"},
      plc:  { code: 'PC',   name: 'Plaid Cymru',              name_en: 'Plaid Cymru',              color: '#008672', ideology: "Welsh nationalism, Welsh independence, Social democracy"},
      res:  { code: 'RES',  name: 'Restore Britain',          name_en: 'Restore Britain',          color: '#051D3F', ideology: "Ethnic nationalism"},
      sf:   { code: 'SF',   name: 'Sinn Féin',                name_en: 'Sinn Féin',                color: '#326760', ideology: "Irish republicanism, Democratic socialism, Left-wing nationalism"},
      dup:  { code: 'DUP',  name: 'Democratic Unionist Party', name_en: 'Democratic Unionist Party', color: '#D46A4C', ideology: "British unionism, British nationalism, Ulster loyalism"},
      sdlp: { code: 'SDLP', name: 'Social Democratic and Labour Party', name_en: 'Social Democratic and Labour Party', color: '#2AA82C', ideology: "Social democracy, Irish reunification, Irish nationalism"},
      apni: { code: 'APNI', name: 'Alliance Party of Northern Ireland', name_en: 'Alliance Party of Northern Ireland', color: '#F6CB2F', ideology: "Liberalism, Social liberalism, Nonsectarianism"},
      uup:  { code: 'UUP',  name: 'Ulster Unionist Party',    name_en: 'Ulster Unionist Party',    color: '#48A5EE', ideology: "British unionism, Conservatism (British)"},
      tuv:  { code: 'TUV',  name: 'Traditional Unionist Voice', name_en: 'Traditional Unionist Voice', color: '#201863', ideology: "British unionism, National conservatism, Social conservatism"},
      spk:  { code: 'SPK',  name: 'Speaker',                  name_en: 'Speaker',                  color: '#333333' },
      ind:  { code: 'IND',  name: 'Independent',              name_en: 'Independent',              color: '#9CA3AF' },
      yp:   { code: 'YP',   name: 'Your Party',               name_en: 'Your Party',               color: '#FF3131', ideology: "Socialism"},
    },
    order: ['lab', 'ref', 'con', 'lib', 'grn', 'res', 'snp', 'plc',
            'sf', 'dup', 'sdlp', 'apni', 'uup', 'tuv', 'spk', 'ind', 'yp'],
    parlOrder: ['grn', 'snp', 'plc', 'sf', 'sdlp', 'lab', 'lib', 'apni',
                'uup', 'con', 'dup', 'tuv', 'ref', 'res', 'yp', 'ind', 'spk'],
    // governing party vs the rest (majority = 326)
    blocs: {
      bloc1: { name: 'Government', short: 'GOV', parties: ['lab'], color: '#E41C3E' },
      bloc2: { name: 'Opposition', short: 'OPP', parties: ['con', 'ref', 'lib', 'grn', 'snp', 'plc', 'res', 'sf', 'dup', 'sdlp', 'apni', 'uup', 'tuv', 'spk', 'ind', 'yp'], color: '#0087DC' },
    },
    coalitions: [
      { name: 'LAB + LIB', parties: ['lab','lib'] },
      { name: 'LAB + GRN + SNP + PLC + LIB', parties: ['lab','grn','snp','plc','lib'] },
      { name: 'CON + REF', parties: ['con','ref'] },
    ],
    lastElection: {
      date: '2024-07-04',
      // 2024 general election (House of Commons Library, official)
      results: {
              "lab": 33.7,
              "con": 23.7,
              "ref": 14.24,
              "lib": 12.22,
              "grn": 6.75,
              "snp": 2.52,
              "plc": 0.68,
              "res": 0.05,
              "sf": 0.73,
              "dup": 0.6,
              "sdlp": 0.3,
              "apni": 0.41,
              "uup": 0.33,
              "tuv": 0.17,
              "spk": 0.09,
              "ind": 0.26,
              "yp": 0.08,
              "other": 3.18
      },
      seats: {
              "lab": 411,
              "con": 121,
              "ref": 4,
              "lib": 72,
              "grn": 4,
              "snp": 9,
              "plc": 4,
              "res": 1,
              "sf": 7,
              "dup": 5,
              "sdlp": 2,
              "apni": 1,
              "uup": 1,
              "tuv": 1,
              "spk": 1,
              "ind": 5,
              "yp": 1,
              "other": 0
      },
    },
    map: {},
    pollsterMAE: {
      "BMG": { UK2024: 2.51, overall: 2.51 },
      "Deltapoll": { UK2024: 3.0, overall: 3.0 },
      "FindOutNow/Electoral Calculus (MRP)": { UK2024: 3.37, overall: 3.37 },
      "Focaldata": { UK2024: 2.87, overall: 2.87 },
      "Focaldata (MRP)": { UK2024: 2.03, overall: 2.03 },
      "Ipsos": { UK2024: 3.36, overall: 3.36 },
      "JL Partners": { UK2024: 2.15, overall: 2.15 },
      "Labour Together": { UK2024: 3.55, overall: 3.55 },
      "Lord Ashcroft": { UK2024: 3.41, overall: 3.41 },
      "More in Common": { UK2024: 1.79, overall: 1.79 },
      "More in Common (MRP)": { UK2024: 3.23, overall: 3.23 },
      "Norstat": { UK2024: 2.27, overall: 2.27 },
      "Opinium": { UK2024: 2.2, overall: 2.2 },
      "PeoplePolling": { UK2024: 3.57, overall: 3.57 },
      "Redfield & Wilton": { UK2024: 3.27, overall: 3.27 },
      "Savanta": { UK2024: 2.48, overall: 2.48 },
      "Survation": { UK2024: 2.3, overall: 2.3 },
      "Survation (MRP)": { UK2024: 2.91, overall: 2.91 },
      "Techne": { UK2024: 3.08, overall: 3.08 },
      "Techne Archived 12 January 2025 at the Wayback Machine": { UK2024: 2.78, overall: 2.78 },
      "Techne Archived 13 April 2024 at the Wayback Machine": { UK2024: 2.8, overall: 2.8 },
      "Techne Archived 22 May 2024 at the Wayback Machine": { UK2024: 2.8, overall: 2.8 },
      "Techne Archived 23 May 2024 at the Wayback Machine": { UK2024: 3.13, overall: 3.13 },
      "Verian": { UK2024: 1.98, overall: 1.98 },
      "We Think": { UK2024: 2.68, overall: 2.68 },
      "Whitestone Insight": { UK2024: 2.79, overall: 2.79 },
      "YouGov": { UK2024: 2.29, overall: 2.29 },
      "YouGov (MRP)": { UK2024: 2.06, overall: 2.06 }
    },
    maeKey: 'UK2024',
    // NI parties have no polling in the GB/UK tables: their averages stay
    // null and their seats hold the 2024 baseline (local dynamics decide)
    logos: {
      lab: 'img/uk/LAB.svg', con: 'img/uk/CONS.svg', ref: 'img/uk/REF.svg',
      lib: 'img/uk/LIB.svg', grn: 'img/uk/GRN.svg', snp: 'img/uk/SNP.svg',
      plc: 'img/uk/PLC.svg', res: 'img/uk/RES.svg', sf: 'img/uk/SF.svg',
      dup: 'img/uk/DUP.svg', sdlp: 'img/uk/SDLP.svg',
      apni: 'img/uk/APNI.svg', uup: 'img/uk/UUP.svg', tuv: 'img/uk/TUV.svg',
    },
  },

  nz: {
    name: 'New Zealand',
    name_tr: 'Yeni Zelanda',
    seats: 120,
    threshold: 5.0,               // 5% or one electorate (MMP)
    method: 'sainte_lague_standard', // Sainte-Lague/Schepers, national party vote
    seatBased: false,             // polls report party-vote shares (%)
    constituencies: true,         // the map is the 72 electorates
    constituencyRule: 'fptp',     // 72 electorate seats (65 general + 7 Maori)
    hideBlocs: true,
    hideConstituencyTable: true,
    recencyHalfLifeDays: 14,
    // trend extrapolation to the 2026-11-07 election: fresh campaign polls
    // (weekly trackers); momentum is a nudge, not the driver
    trend: {
      electionDate: '2026-11-07',
      blend: 0.4,
      maxDaily: 0.15,
      windowDays: 120,
      fitDays: 14,
      minPolls: 3,
      dampDays: 10,
    },
    // colours from the en.wikipedia party infoboxes
    parties: {
      nat: { code: 'NAT', name: 'New Zealand National Party', name_en: 'New Zealand National Party', color: '#00529F', ideology: "Conservatism, Liberalism"},
      lab: { code: 'LAB', name: 'New Zealand Labour Party',   name_en: 'New Zealand Labour Party',   color: '#D82A20', ideology: "Social democracy"},
      grn: { code: 'GRN', name: 'Green Party of Aotearoa New Zealand', name_en: 'Green Party of Aotearoa New Zealand', color: '#098137', ideology: "Green politics, Social democracy"},
      act: { code: 'ACT', name: 'ACT New Zealand',            name_en: 'ACT New Zealand',            color: '#FDE401', ideology: "Classical liberalism, Right-libertarianism, Conservatism"},
      nzf: { code: 'NZF', name: 'New Zealand First',          name_en: 'New Zealand First',          color: '#000000', ideology: "Right-wing populism, Nationalism, Social conservatism"},
      tpm: { code: 'TPM', name: 'Te Pati Maori',              name_en: 'Te Pati Maori',              color: '#B2001A', ideology: "Māori rights, Tino rangatiratanga, Progressivism"},
      opp: { code: 'OPP', name: 'The Opportunities Party',    name_en: 'The Opportunities Party',    color: '#09B598', ideology: "Centrism, Radical centrism"},
    },
    order: ['nat', 'lab', 'grn', 'act', 'nzf', 'tpm', 'opp'],
    parlOrder: ['grn', 'tpm', 'lab', 'opp', 'nat', 'act', 'nzf'],
    // right bloc (2023 government) vs the left bloc; the sim's correlated
    // swing moves the two blocs in opposite directions
    blocs: {
      bloc1: { name: 'National-ACT-NZ First', short: 'RIGHT', parties: ['nat', 'act', 'nzf'], color: '#00529F' },
      bloc2: { name: 'Labour-Green-Maori', short: 'LEFT', parties: ['lab', 'grn', 'tpm', 'opp'], color: '#D82A20' },
    },
    coalitions: [
      { name: 'NAT + ACT + NZF', parties: ['nat','act','nzf'] },
      { name: 'LAB + GRN + TPM', parties: ['lab','grn','tpm'] },
      { name: 'NAT + ACT', parties: ['nat','act'] },
    ],
    // leveling seats: Te Pati Maori's overhang grows the house past 120
    // (fixed: the overhang is computed on the 120-seat house, as in the
    // Electoral Act, not iteratively like the German leveling states)
    overhang: { cap: 125, rows: 10, fixed: true },
    lastElection: {
      date: '2023-10-14',
      // 2023 general election (official): party vote and seats (122 total)
      results: {
              "nat": 38.07,
              "lab": 26.91,
              "grn": 11.64,
              "act": 8.64,
              "nzf": 6.07,
              "tpm": 3.08,
              "opp": 2.24
      },
      seats: {
              "nat": 48,
              "lab": 34,
              "grn": 15,
              "act": 11,
              "nzf": 8,
              "tpm": 6
      },
    },
    map: {},
    pollsterMAE: {
      "1 News–Kantar Public": { NZ2023: 2.81, overall: 2.81 },
      "1 News–Verian": { NZ2023: 1.09, overall: 1.09 },
      "Guardian Essential": { NZ2023: 1.85, overall: 1.85 },
      "Horizon Research": { NZ2023: 3.61, overall: 3.61 },
      "Labour–Talbot Mills": { NZ2023: 6.53, overall: 6.53 },
      "Newshub–Reid Research": { NZ2023: 1.71, overall: 1.71 },
      "Roy Morgan": { NZ2023: 3.05, overall: 3.05 },
      "Talbot Mills": { NZ2023: 1.63, overall: 1.63 },
      "Taxpayers' Union–Curia": { NZ2023: 2.56, overall: 2.56 }
    },
    maeKey: 'NZ2023',
    logos: {
      nat: 'img/nz/NAT.svg', lab: 'img/nz/LAB.svg', grn: 'img/nz/GRN.svg',
      act: 'img/nz/ACT.svg', nzf: 'img/nz/NZF.svg', tpm: 'img/nz/TPM.svg',
      opp: 'img/nz/OPP.svg',
    },
  },
};

// ===== Active country (switched at runtime) =====
let COUNTRY = 'israel';
let COUNTRY_NAME = 'Israel';
let SEATS_TOTAL = 349;
let THRESHOLD = 4.0;
let SEAT_METHOD = 'sainte_lague';
let HAS_CONSTITUENCIES = true;
let CONSTITUENCY_RULE = 'standard';
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
CONSTITUENCY_RULE = c.constituencyRule || 'standard';
  SEAT_BASED = !!c.seatBased;
  PARTY_META = c.parties;
  PARTY_ORDER = c.order;
  PARLIAMENT_ORDER = c.parlOrder || c.order;
  BLOCS = c.blocs || {};   // a country without blocs (Moldova) must not crash the render
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
  if (typeof updateUrl === 'function') updateUrl();
}

// Sub-page / archive wrapper: a country can be pinned via window.__600_COUNTRY__;
// otherwise ?c=<id> wins over the default (URL routing)
const BOOT_URL_C=(typeof location!=='undefined'&&typeof URLSearchParams!=='undefined'&&location.search)?new URLSearchParams(location.search).get('c'):null;
const BOOT_COUNTRY=(typeof window!=='undefined'&&window.__600_COUNTRY__&&COUNTRIES[window.__600_COUNTRY__])?window.__600_COUNTRY__:((BOOT_URL_C&&COUNTRIES[BOOT_URL_C])?BOOT_URL_C:'israel');

setCountry(BOOT_COUNTRY);