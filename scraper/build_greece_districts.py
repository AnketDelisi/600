import json
import os
import re
import sys

sys.path.insert(0, r'C:\Users\deneme\Desktop\600\scraper')
import build_map_svg as bm

CACHE = r'C:\Users\deneme\Desktop\600\scraper\.cache'
ROOT = r'C:\Users\deneme\Desktop\600'

COMPO = {
    'ATA': ['Athens'],
    'AB1': ['Agia Paraskevi', 'Dionysos', 'Filothei-Psychiko', 'Chalandri',
            'Irakleio', 'Kifisia', 'Lykovrysi-Pefki', 'Marousi',
            'Metamorfosi', 'Nea Ionia', 'Papagou-Cholargos', 'Penteli', 'Filadelfeia-Chalkidona', 'Galatsi', 'Kaisariani',
            'Vrilissia'],
    'AB2': ['Agia Varvara', 'Agioi Anargyroi-Kamatero', 'Egaleo', 'Ilion',
            'Peristeri', 'Petroupoli', 'Haidari'],
    'AB3': ['Agios Dimitrios', 'Alimos', 'Dafni-Ymittos',
            'Elliniko-Argyroupoli', 'Glyfada', 'Ilioupoli', 'Kallithea',
            'Moschato-Tavros', 'Nea Smyrni', 'Palaio Faliro', 'Vyronas',
            'Zografou'],
    'PIA': ['Keratsini-Drapetsona', 'Korydallos',
            'Nikaia-Agios Ioannis Rentis', 'Perama', 'Pireas'],
    'PIB': ['Aegina', 'Agistri', 'Kythira', 'Poros', 'Salamina', 'Spetses',
            'Troizinia-Methana', 'Ydra'],
    'EAT': ['Acharnes', 'Kropia', 'Lavreotiki', 'Marathon',
            'Markopoulo Mesogaias', 'Oropos', 'Paiania', 'Pallini',
            'Rafina-Pikermi', 'Saronikos', 'Spata-Artemida',
            'Vari-Voula-Vouliagmeni'],
    'WAA': ['Aspropyrgos', 'Elefsina', 'Mandra-Eidyllia', 'Megara', 'Fyli'],
    'THA': ['Ampelokipoi-Menemeni', 'Kordelio-Evosmos', 'Neapoli-Sykies',
            'Pavlos Melas', 'Thessaloniki'],
    'THB': ['Chalkidona', 'Delta', 'Kalamaria', 'Lagkadas', 'Oraiokastro',
            'Pylaia-Chortiatis', 'Thermaikos', 'Thermi', 'Volvi'],
    'CHA': ['Aristotelis', 'Kassandra', 'Nea Propontida', 'Polygyros',
            'Sithonia', 'Mount Anthos'],
    'ACH': ['Aigialeia', 'Erymanthos', 'Kalavryta', 'Patras', 'West Achaea'],
    'AIT': ['Agrinio', 'Aktio-Vonitsa', 'Amfilochia', 'Missolonghi',
            'Nafpaktia', 'Thermo', 'Xiromero'],
    'ARC': ['Gortynia', 'Megalopolis', 'North Kynouria', 'South Kynouria',
            'Tripoli'],
    'ARL': ['Argos-Mykines', 'Epidaurus', 'Ermionida', 'Nafplio'],
    'ART': ['Arta', 'Central Tzoumerka', 'Georgios Karaiskakis',
            'Nikolaos Skoufas'],
    'BOE': ['Aliartos', 'Distomo-Arachova-Antikyra', 'Livadeia', 'Orchomenus',
            'Tanagra', 'Thebes'],
    'CFU': ['Corfu', 'Paxos'],
    'CHI': ['Chios', 'Oinousses', 'Psara'],
    'CHN': ['Apokoronas', 'Chania', 'Gavdos', 'Kantanos-Selino', 'Kissamos',
            'Platanias', 'Sfakia'],
    'CTH': ['Corinth', 'Loutraki-Agioi Theodoroi', 'Nemea', 'Sikyona',
            'Velo-Vocha', 'Xylokastro-Evrostina'],
    'CYC': ['Amorgos', 'Anafi', 'Andros', 'Antiparos', 'Folegandros', 'Iiton',
            'Kea', 'Kimolos', 'Kithnos', 'Milos', 'Mikonos',
            'Naxos and Lesser Cyclades', 'Paros', 'Santorini', 'Serifos',
            'Sifnos', 'Sikinos', 'Syros', 'Tinos'],
    'DOD': ['Agathonisi', 'Astypalaia', 'Halki', 'Kalymnos', 'Karpathos',
            'Kasos', 'Kastellorizo', 'Kos', 'Leipsoi', 'Leros', 'Nisyros',
            'Patmos', 'Rhodes', 'Symi', 'Tilos'],
    'DRM': ['Doxatou', 'Dramas', 'Kato Nevrokopiou', 'Paranestiou',
            'Prosotsanis'],
    'EUB': ['Chalcis', 'Dirfys-Messapia', 'Eretria', 'Istiaia-Aidipsos',
            'Karystos', 'Kymi-Aliveri', 'Mantoudi-Limni-Agia Anna', 'Skyros'],
    'EVT': ['Agrafa', 'Karpenisi'],                       # Evrytania
    'EVR': ['Alexandroupolis', 'Didymoteichou', 'Orestiadas', 'Samothrakis',
            'Soufliou'],                                   # Evros
    'FLO': ['Amyntaio', 'Florina', 'Prespes'],
    'FOK': ['Delphi', 'Dorida'],
    'FTH': ['Amfikleia-Elateia', 'Domokos', 'Lamia', 'Lokroi', 'Makrakomi',
            'Molos-Agios Konstantinos', 'Stylida'],
    'GRE': ['Deskati', 'Grevena'],
    'HRA': ['Archanes-Asterousia', 'Faistos', 'Gortyn', 'Heraklion',
            'Hersonissos', 'Malevizi', 'Minoa Pediada', 'Viannos'],
    'ILI': ['Andravida-Kyllini', 'Andritsaina-Krestena', 'Ilida', 'Olympia',
            'Pineios', 'Pyrgos', 'Zacharo'],
    'IMA': ['Alexandria', 'Naousa', 'Veria'],
    'IOA': ['Dodoni', 'Ioannina', 'Konitsa', 'Metsovo', 'Pogoni', 'Zagori',
            'Zitsa', 'North Tzoumerka'],
    'KAR': ['Argithea', 'Karditsa', 'Lake Plastiras', 'Mouzaki', 'Palamas',
            'Sofades'],
    'KAS': ['Kastoria', 'Nestorio', 'Orestida'],
    'KAV': ['Kavalas', 'Nestou', 'Pangeou', 'Thassou'],
    'KEF': ['Cephalonia', 'Ithaca'],
    'KIL': ['Kilkis', 'Paionia'],
    'KOZ': ['Eordaia', 'Kozani', 'Servia-Velventos', 'Voio'],
    'LAC': ['East Mani', 'Elafonisos', 'Evrotas', 'Monemvasia', 'Sparta',
            'West Mani'],
    'LAS': ['Agios Nikolaos', 'Ierapetra', 'Lasithi Plateau', 'Sitia'],
    'LEF': ['Lefkada', 'Meganisi'],
    'LES': ['Lesbos', 'Lemnos', 'Agios Efstratios'],
    'LRS': ['Agia', 'Elassona', 'Farsala', 'Kileler', 'Larissa', 'Tempi',
            'Tyrnavos'],
    'MAG': ['Almyros', 'Rigas Feraios', 'South Pelion', 'Volos',
            'Zagora-Mouresi', 'Alonnisos', 'Skiathos', 'Skopelos'],
    'MES': ['Kalamata', 'Messini', 'Oichalia', 'Pylos-Nestoras', 'Trifylia'],
    'PER': ['Dion-Olympus', 'Katerini', 'Pydna - Kolindros'],   # Pieria
    'PLA': ['Almopia', 'Edessa', 'Pella', 'Skydra'],            # Pella
    'PRE': ['Parga', 'Preveza', 'Ziros'],
    'RET': ['Agios Vasileios', 'Amari', 'Mylopotamos', 'Rethymno'],
    'ROD': ['Arrianon', 'Iasmou', 'Komotinis', 'Maronias-Sapon'],
    'SAM': ['Samos', 'Ikaria', 'Fournoi Korseon'],
    'SER': ['Amphipolis', 'Emmanouil Pappas', 'Irakleia', 'Nea Zichni',
            'Serres', 'Sintiki', 'Visaltia'],
    'THE': ['Filiates', 'Igoumenitsa', 'Souli'],                # Thesprotia
    'TRI': ['Farkadona', 'Meteora', 'Pyli', 'Trikala'],
    'XAN': ['Avdiron', 'Mykis', 'Topirou', 'Xanthis'],
    'ZAN': ['Zakynthos'],
}

gj = json.load(open(os.path.join(CACHE, 'gb_grc_adm3.geojson'),
                    encoding='utf8'))
by_name = {}
for f in gj['features']:
    by_name.setdefault(f['properties']['shapeName'], []).append(f)

placed = {}
for code, names in COMPO.items():
    for n in names:
        placed.setdefault(n, []).append(code)
err = []
for n in by_name:
    if n not in placed:
        err.append(n)
    elif len(placed[n]) > 1:
        err.append('DUP ' + n)
print('unassigned/dup:', err)
assert not err, 'fix the mapping'

from shapely.geometry import shape, mapping
from shapely.ops import unary_union

feats = []
for code, names in COMPO.items():
    geoms = []
    for n in names:
        for f in by_name[n]:
            geoms.append(shape(f['geometry']))
    u = unary_union([g.buffer(0.0005) for g in geoms]).buffer(-0.0005)
    feats.append({'type': 'Feature',
                  'properties': {'id': code.lower()},
                  'geometry': mapping(u)})
print('constituencies built:', len(feats))
out_gj = os.path.join(CACHE, 'gr_constituencies.geojson')
json.dump({'type': 'FeatureCollection', 'features': feats},
          open(out_gj, 'w', encoding='utf8'))
OUT = os.path.join(ROOT, 'img', 'greece_constituencies.svg')
bm.main.__wrapped__ if False else None
sys.argv = ['build_map_svg.py', '--geojson', out_gj, '--name-field', 'id',
            '--fold', '--attr', 'id', '--no-prefix', '--out', OUT,
            '--attribution', 'Geometri: geoBoundaries (CC-BY 4.0)', '--force']
bm.main()
print('svg written')
# ---- Athens (Attica) inset: the dense cluster magnified, bottom-left ----
AT_IDS = ['ata', 'ab1', 'ab2', 'ab3', 'pia', 'pib', 'eat', 'waa']
at_feats = [f for f in feats if f['properties']['id'] in AT_IDS]
at_gj = os.path.join(CACHE, 'gr_attica.geojson')
json.dump({'type': 'FeatureCollection', 'features': at_feats},
          open(at_gj, 'w', encoding='utf8'))
at_svg = os.path.join(CACHE, 'gr_attica.svg')
sys.argv = ['build_map_svg.py', '--geojson', at_gj, '--name-field', 'id',
            '--fold', '--attr', 'id', '--no-prefix', '--out', at_svg,
            '--attribution', '', '--force']
bm.main()
bm.add_inset(OUT, at_svg, AT_IDS, 190, (28, 660))
print('athens inset added')

