// ===== AltıCiftSıfır — Config =====
const COUNTRY = 'sweden';
const COUNTRY_NAME = 'Sweden';
const SEATS_TOTAL = 349;
const THRESHOLD = 4.0;

const PARTY_META = {
  S:  { name: 'Socialdemokraterna',       name_en: 'Social Democrats',  color: '#EE2020' },
  SD: { name: 'Sverigedemokraterna',       name_en: 'Sweden Democrats',  color: '#006AB5' },
  M:  { name: 'Moderaterna',              name_en: 'Moderates',         color: '#52BDEC' },
  V:  { name: 'Vänsterpartiet',           name_en: 'Left Party',        color: '#DA291C' },
  C:  { name: 'Centerpartiet',            name_en: 'Centre Party',      color: '#009933' },
  KD: { name: 'Kristdemokraterna',         name_en: 'Christian Democrats', color: '#006AB5' },
  MP: { name: 'Miljöpartiet',             name_en: 'Green Party',       color: '#87C737' },
  L:  { name: 'Liberalerna',              name_en: 'Liberals',          color: '#006AB5' },
};

const PARTY_ORDER = ['S', 'SD', 'M', 'V', 'C', 'KD', 'MP', 'L'];

const BLOCS = {
  red_green: { name: 'Red-Green', parties: ['S', 'V', 'MP', 'C'], color: '#EE2020' },
  tidö:      { name: 'Tidö',      parties: ['M', 'SD', 'KD', 'L'], color: '#006AB5' },
};

const LAST_ELECTION = {
  date: '2022-09-11',
  results: { S: 30.33, SD: 20.54, M: 19.10, V: 6.75, C: 6.71, KD: 5.34, MP: 5.10, L: 4.61 },
  seats:   { S: 107, SD: 73, M: 68, V: 24, C: 24, KD: 19, MP: 18, L: 16 },
};

const POLLSTER_MAE = {
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
};

const PARTY_LOGOS = {
  S:  'img/S.svg',
  SD: 'img/SD.svg',
  M:  'img/M.svg',
  V:  'img/V.svg',
  C:  'img/C.svg',
  KD: 'img/KD.svg',
  MP: 'img/MP.svg',
  L:  'img/L.svg',
};

// Schematic map layout: grid [col, row] per constituency id (6 cols x 7 rows)
const MAP_POS = {
  jämtland:     [1,0], västerbotten: [2,0], norrbotten:   [3,0],
  dalarna:      [0,1], gävleborg:    [2,1], västernorrland:[3,1],
  värmland:     [0,2], örebro:       [1,2], västmanland:  [2,2],
  uppsala:      [3,2], stockholm:    [4,2], stockholms_län:[5,2],
  vg_norra:     [0,3], vg_västra:    [1,3], vg_östra:     [2,3],
  södermanland: [3,3], östergötland: [4,3], gotland:      [5,3],
  göteborg:     [0,4], vg_södra:     [1,4], jönköping:    [2,4],
  kronoberg:    [3,4], kalmar:       [4,4],
  halland:      [0,5], blekinge:     [3,5], skåne_v:      [4,5],
  skåne_ne:     [5,5],
  malmö:        [4,6], skåne_s:      [5,6],
};

const MAP_REGIONS = {
  norrland: { label: 'NORRLAND', cols: [0,4], rows: [0,1] },
  svealand: { label: 'SVEALAND', cols: [0,5], rows: [2,3] },
  götaland: { label: 'GÖTALAND', cols: [0,5], rows: [4,6] },
};

// Sweden-shaped seat map: county ellipse centers (cx, cy) on a 500x660 canvas.
// Ellipse size is computed from seat count (bigger county = bigger blob).
const COUNTY_POS = {
  norrbotten:     { cx: 315, cy: 65  },
  västerbotten:   { cx: 225, cy: 95  },
  västernorrland: { cx: 280, cy: 150 },
  jämtland:       { cx: 160, cy: 135 },
  gävleborg:      { cx: 250, cy: 205 },
  dalarna:        { cx: 170, cy: 220 },
  värmland:       { cx: 130, cy: 290 },
  örebro:         { cx: 215, cy: 300 },
  västmanland:    { cx: 270, cy: 315 },
  uppsala:        { cx: 335, cy: 290 },
  stockholm:      { cx: 395, cy: 350, label: 'above' },
  stockholms_län: { cx: 425, cy: 305, label: 'above' },
  södermanland:   { cx: 310, cy: 375 },
  gotland:        { cx: 458, cy: 450, label: 'right' },
  östergötland:   { cx: 335, cy: 435 },
  vg_norra:       { cx: 130, cy: 395 },
  vg_västra:      { cx: 155, cy: 440 },
  göteborg:       { cx: 190, cy: 475 },
  vg_södra:       { cx: 175, cy: 510 },
  vg_östra:       { cx: 250, cy: 445 },
  jönköping:      { cx: 255, cy: 515 },
  kronoberg:      { cx: 225, cy: 555 },
  kalmar:         { cx: 305, cy: 525 },
  halland:        { cx: 145, cy: 555 },
  blekinge:       { cx: 285, cy: 578 },
  skåne_v:        { cx: 172, cy: 585 },
  skåne_ne:       { cx: 245, cy: 580 },
  skåne_s:        { cx: 205, cy: 593 },
  malmö:          { cx: 165, cy: 605 },
};

// Stylized Sweden outline (rough silhouette behind the county blobs)
const SWEDEN_OUTLINE = 'M 215 30 L 385 42 L 430 95 L 448 165 L 418 255 L 442 330 L 402 420 L 428 500 L 385 555 L 330 595 L 285 618 L 245 632 L 200 625 L 150 610 L 120 585 L 95 500 L 62 400 L 50 300 L 68 205 L 108 125 L 150 68 L 182 36 Z';

// Mosaic cartogram: one tile per seat, 310 tiles arranged in the shape of
// Sweden. Each county is drawn with EXACTLY its fixed seat count of tiles.
// Keys: n=norrbotten b=västerbotten r=västernorrland j=jämtland g=gävleborg
// d=dalarna v=värmland o=örebro t=västmanland u=uppsala s=södermanland
// k=stockholm l=stockholms_län i=gotland e=östergötland N=vg_norra V=vg_västra
// G=göteborg S=vg_södra E=vg_östra h=halland p=jönköping c=kronoberg
// a=kalmar f=blekinge X=skåne_v Y=skåne_ne Z=skåne_s M=malmö
const MOSAIC_KEYS = {
  n:'norrbotten', b:'västerbotten', r:'västernorrland', j:'jämtland',
  g:'gävleborg', d:'dalarna', v:'värmland', o:'örebro', t:'västmanland',
  u:'uppsala', s:'södermanland', k:'stockholm', l:'stockholms_län',
  i:'gotland', e:'östergötland', N:'vg_norra', V:'vg_västra', G:'göteborg',
  S:'vg_södra', E:'vg_östra', h:'halland', p:'jönköping', c:'kronoberg',
  a:'kalmar', f:'blekinge', X:'skåne_v', Y:'skåne_ne', Z:'skåne_s', M:'malmö',
};

const MOSAIC_GRID = [
  '.............n................',
  '............n.n...............',
  '................n.............',
  '..........r....n.n............',
  '............rjn...............',
  '............j.nj..............',
  '........r.....j.b.....b.......',
  '.......r...t...bb....b.b......',
  '..........tttt....g...bb......',
  '............t....gggg.........',
  '.........r.........g..........',
  '.......rrr.tt.........gg......',
  '....S............dd...........',
  '...SS.ooo........d...d........',
  '.....S.o.o.o........d.........',
  '.........ooo...vvv............',
  '..S............v...v......g...',
  '..S...............vv.....d....',
  '....SG......E...........d.....',
  '.G..........E.E.E.............',
  '.G.N.N.N......EEE........dd...',
  '...NNNNN................v.....',
  '...........V.V.V.V...E..v.....',
  'GGGGG.G....V.VVV.......V......',
  'GGG.G.G.............V..V......',
  '...........hhhhhh.....YY......',
  'G.G........hhhh....YY.YY......',
  'G..................YY.YY......',
  '..........ZZZ.................',
  '..........ZZZZ................',
  'Z.Z................MM.MM......',
  'Z.Z.Z.....XXXX.....MM.MM......',
  '...........XXX........MM......',
  'ccc...X................e......',
  'ccc...X......ifff......e......',
  '.............i.f.f...e..e.....',
  '....aaaa.a...............e....',
  '...a.a.a......eeee.......uu...',
  '.........l..e.e.e......u..u...',
  '.....ppp....ee...............l',
  '..p...ppp.........uu.....ll...',
  '..p............u.u.u......ll.k',
  '.........lpp.k.uuu............',
  '.......s.k.p..k.....l.........',
  '...ss.sss........ll..l........',
  '....s.....l.l..l.ll...........',
  '.......lll.ll...l.....l.......',
  '.....s...l.........l.l........',
  '.....sl.....l....llll...k.....',
  '..........l.ll....l...kk.k....',
  '.......l...l...kk....k.k......',
  '........ll....k.k...k.k.......',
  '............k..k..............',
  '...........kkk................',
  '..........k....kkk............',
  '................k.............',
  '............k.k...............',
  '.............k................',
];
