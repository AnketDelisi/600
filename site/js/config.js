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
