export type LocalizedText = {
  fr: string;
  en: string;
};

export type CompostPoint = {
  id: string;
  name: LocalizedText;
  address: string;
  city: string;
  region: "paris" | "petite_couronne" | "grande_couronne";
  lat: number;
  lng: number;
  sourceLabel: LocalizedText;
  sourceUrl: string;
  note: LocalizedText;
};

export type CompostGuideCard = {
  icon: "home" | "users" | "map";
  title: LocalizedText;
  description: LocalizedText;
};

export type CompostRuleCard = {
  title: LocalizedText;
  items: LocalizedText[];
};

export type CompostTerritoryLink = {
  title: LocalizedText;
  description: LocalizedText;
  href: string;
};

export const COMPOST_GUIDE_CARDS: CompostGuideCard[] = [
  {
    icon: "home",
    title: { fr: "Chez soi", en: "At home" },
    description: {
      fr: "En maison: composteur de jardin. En appartement: lombricomposteur ou petit bac adapté.",
      en: "In a house: a garden composter. In an apartment: a worm composter or a small adapted bin.",
    },
  },
  {
    icon: "users",
    title: { fr: "En collectif", en: "Collectively" },
    description: {
      fr: "Cour d'immeuble, jardin partagé, association ou composteur de quartier avec permanences.",
      en: "Building courtyard, shared garden, association or neighborhood composter with opening hours.",
    },
  },
  {
    icon: "map",
    title: { fr: "Trouver un point", en: "Find a point" },
    description: {
      fr: "Utilise la carte pour repérer des points connus autour de Paris et ouvrir les cartes officielles.",
      en: "Use the map to spot known points around Paris and open the official maps.",
    },
  },
];

export const COMPOST_RULE_CARDS: CompostRuleCard[] = [
  {
    title: { fr: "Va au compost", en: "Goes to compost" },
    items: [
      {
        fr: "Épluchures de fruits et légumes",
        en: "Fruit and vegetable peels",
      },
      {
        fr: "Marc de café, thé, sachets compostables acceptés localement",
        en: "Coffee grounds, tea and locally accepted compostable bags",
      },
      {
        fr: "Fleurs fanées, petites feuilles et déchets végétaux secs",
        en: "Wilted flowers, small leaves and dry plant waste",
      },
      {
        fr: "Restes de cuisine végétaux si le site les accepte",
        en: "Plant-based kitchen scraps if the site accepts them",
      },
    ],
  },
  {
    title: { fr: "À garder à l'écart", en: "Keep out" },
    items: [
      {
        fr: "Viande, poisson, os et produits laitiers",
        en: "Meat, fish, bones and dairy",
      },
      {
        fr: "Plastique, verre, métal et emballages non compostables",
        en: "Plastic, glass, metal and non-compostable packaging",
      },
      {
        fr: "Cendres, mégots, couches et déchets dangereux",
        en: "Ash, cigarette butts, diapers and hazardous waste",
      },
      {
        fr: "Liquides en grande quantité ou sacs plastique classiques",
        en: "Large quantities of liquid or regular plastic bags",
      },
    ],
  },
];

export const COMPOST_TERRITORY_LINKS: CompostTerritoryLink[] = [
  {
    title: { fr: "Ville de Paris", en: "City of Paris" },
    description: {
      fr: "Guide compost, cartes et demandes de composteur collectif.",
      en: "Compost guide, maps and collective composter requests.",
    },
    href: "https://www.paris.fr/dossiers/composter-a-paris-20",
  },
  {
    title: { fr: "Paris Est Marne & Bois", en: "Paris Est Marne & Bois" },
    description: {
      fr: "Composteurs de quartier, composteurs de jardin et carte territoriale.",
      en: "Neighborhood composters, garden composters and territorial map.",
    },
    href: "https://www.parisestmarnebois.fr/fr/compostage",
  },
  {
    title: { fr: "Est Ensemble", en: "Est Ensemble" },
    description: {
      fr: "Carte Géo déchets et composteurs de quartier sur tout le territoire.",
      en: "Geo déchets map and neighborhood composters across the territory.",
    },
    href: "https://www.est-ensemble.fr/composter",
  },
  {
    title: { fr: "Versailles Grand Parc", en: "Versailles Grand Parc" },
    description: {
      fr: "Zones de compostage partagé et application T.R.I VGP.",
      en: "Shared composting zones and the T.R.I VGP app.",
    },
    href: "https://www.versaillesgrandparc.fr/au-quotidien/en-route-vers-le-zero-dechet/composter-ses-biodechets/le-compostage-partage",
  },
];

export const COMPOST_POINTS: CompostPoint[] = [
  {
    id: "paris-5e-bazeilles",
    name: {
      fr: "Composteur de quartier - rue de Bazeilles",
      en: "Neighborhood composter - Rue de Bazeilles",
    },
    address: "2 rue de Bazeilles",
    city: "Paris 5e",
    region: "paris",
    lat: 48.8390673,
    lng: 2.3500499,
    sourceLabel: {
      fr: "Mairie du 5e",
      en: "Paris 5th district hall",
    },
    sourceUrl: "https://mairie05.paris.fr/pages/que-faire-de-mes-biodechets-30593",
    note: {
      fr: "Point de quartier repéré dans l'arrondissement.",
      en: "Neighborhood point listed in the district.",
    },
  },
  {
    id: "paris-5e-saint-medard",
    name: {
      fr: "Composteur de quartier - rue Saint-Médard",
      en: "Neighborhood composter - Rue Saint-Médard",
    },
    address: "14 rue Saint-Médard",
    city: "Paris 5e",
    region: "paris",
    lat: 48.8437321,
    lng: 2.3500938,
    sourceLabel: {
      fr: "Mairie du 5e",
      en: "Paris 5th district hall",
    },
    sourceUrl: "https://mairie05.paris.fr/pages/que-faire-de-mes-biodechets-30593",
    note: {
      fr: "Autre point de quartier mentionné par la mairie.",
      en: "Another neighborhood point mentioned by the district hall.",
    },
  },
  {
    id: "paris-14e-coty",
    name: {
      fr: "Compost Avenue René-Coty",
      en: "Compost - Avenue René Coty",
    },
    address: "9-11 avenue René Coty",
    city: "Paris 14e",
    region: "paris",
    lat: 48.8258345,
    lng: 2.3357017,
    sourceLabel: {
      fr: "Mairie du 14e",
      en: "Paris 14th district hall",
    },
    sourceUrl: "https://mairie14.paris.fr/pages/les-points-de-compostage-dans-le-14e-11104",
    note: {
      fr: "Un des points de compostage de proximité du 14e.",
      en: "One of the district's local composting points.",
    },
  },
  {
    id: "paris-14e-observatoire",
    name: {
      fr: "Compost de l'Observatoire",
      en: "Observatory compost point",
    },
    address: "55 avenue de l'Observatoire",
    city: "Paris 14e",
    region: "paris",
    lat: 48.839437,
    lng: 2.3366216,
    sourceLabel: {
      fr: "Mairie du 14e",
      en: "Paris 14th district hall",
    },
    sourceUrl: "https://mairie14.paris.fr/pages/les-points-de-compostage-dans-le-14e-11104",
    note: {
      fr: "Point de quartier repéré par la mairie du 14e.",
      en: "Neighborhood point listed by the 14th district hall.",
    },
  },
  {
    id: "paris-19e-ourcq",
    name: {
      fr: "Composteur de quartier - Ourcq",
      en: "Neighborhood composter - Ourcq",
    },
    address: "2 bis rue de l'Ourcq",
    city: "Paris 19e",
    region: "paris",
    lat: 48.8877647,
    lng: 2.3851363,
    sourceLabel: {
      fr: "Mairie du 19e",
      en: "Paris 19th district hall",
    },
    sourceUrl: "https://mairie19.paris.fr/pages/composter-ses-dechets-alimentaires-dans-le-19e-arrondissement-27333",
    note: {
      fr: "Point de quartier avec gestion associative.",
      en: "Neighborhood point managed with an association.",
    },
  },
  {
    id: "paris-19e-francis-ponge",
    name: {
      fr: "Composteur de quartier - Square Hérold",
      en: "Neighborhood composter - Square Hérold",
    },
    address: "11 rue Francis-Ponge",
    city: "Paris 19e",
    region: "paris",
    lat: 48.8822066,
    lng: 2.3946935,
    sourceLabel: {
      fr: "Mairie du 19e",
      en: "Paris 19th district hall",
    },
    sourceUrl: "https://mairie19.paris.fr/pages/composter-ses-dechets-alimentaires-dans-le-19e-arrondissement-27333",
    note: {
      fr: "Repère de quartier supplémentaire dans le 19e.",
      en: "Additional neighborhood reference point in the 19th.",
    },
  },
  {
    id: "est-ensemble-noisy-le-sec",
    name: {
      fr: "Composteur de quartier - Merlan",
      en: "Neighborhood composter - Merlan",
    },
    address: "82 rue de Merlan",
    city: "Noisy-le-Sec",
    region: "petite_couronne",
    lat: 48.8911736,
    lng: 2.4665792,
    sourceLabel: {
      fr: "Est Ensemble",
      en: "Est Ensemble",
    },
    sourceUrl: "https://www.est-ensemble.fr/composter",
    note: {
      fr: "Site de compostage partagé sur le territoire Est Ensemble.",
      en: "Shared composting site in the Est Ensemble area.",
    },
  },
  {
    id: "est-ensemble-bobigny",
    name: {
      fr: "Composteur de quartier - stade Henri-Wallon",
      en: "Neighborhood composter - Henri Wallon stadium",
    },
    address: "Avenue du Président Salvador Allende",
    city: "Bobigny",
    region: "petite_couronne",
    lat: 48.902427,
    lng: 2.4433054,
    sourceLabel: {
      fr: "Est Ensemble",
      en: "Est Ensemble",
    },
    sourceUrl: "https://www.est-ensemble.fr/composter",
    note: {
      fr: "Point historique de compostage de quartier à Bobigny.",
      en: "Historic neighborhood compost point in Bobigny.",
    },
  },
  {
    id: "est-ensemble-bondy",
    name: {
      fr: "Composteur de quartier - place François Mitterrand",
      en: "Neighborhood composter - François Mitterrand square",
    },
    address: "Square François Mitterrand",
    city: "Bondy",
    region: "petite_couronne",
    lat: 48.9015175,
    lng: 2.4795224,
    sourceLabel: {
      fr: "Est Ensemble",
      en: "Est Ensemble",
    },
    sourceUrl: "https://www.est-ensemble.fr/composter",
    note: {
      fr: "Point de compostage de quartier sur le territoire Est Ensemble.",
      en: "Neighborhood compost point in the Est Ensemble territory.",
    },
  },
  {
    id: "est-ensemble-montreuil",
    name: {
      fr: "Composteur de quartier - place Jules Verne",
      en: "Neighborhood composter - Jules Verne square",
    },
    address: "Place Jules Verne",
    city: "Montreuil",
    region: "petite_couronne",
    lat: 48.8708876,
    lng: 2.4605144,
    sourceLabel: {
      fr: "Est Ensemble",
      en: "Est Ensemble",
    },
    sourceUrl: "https://www.est-ensemble.fr/composter",
    note: {
      fr: "Point de quartier géré avec l'association locale.",
      en: "Neighborhood point managed with a local association.",
    },
  },
  {
    id: "versailles-balbi",
    name: {
      fr: "Zone de compostage partagé - Parc Balbi",
      en: "Shared composting zone - Parc Balbi",
    },
    address: "12 rue du Maréchal Joffre",
    city: "Versailles",
    region: "grande_couronne",
    lat: 48.7958238,
    lng: 2.1217436,
    sourceLabel: {
      fr: "Versailles Grand Parc",
      en: "Versailles Grand Parc",
    },
    sourceUrl: "https://www.versaillesgrandparc.fr/au-quotidien/en-route-vers-le-zero-dechet/composter-ses-biodechets/le-compostage-partage",
    note: {
      fr: "Zone de compostage partagé annoncée à Versailles.",
      en: "Shared composting zone announced in Versailles.",
    },
  },
];
