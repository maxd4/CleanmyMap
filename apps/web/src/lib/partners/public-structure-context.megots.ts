import type { PublicStructureContext } from "./public-structure-context";
import { PUBLIC_STRUCTURE_SOURCES } from "./public-structure-context.megots.sources";
import { PUBLIC_STRUCTURE_CONTEXTS_PART2 } from "./public-structure-context.megots.part2";
export { PUBLIC_STRUCTURE_SOURCES };

const PUBLIC_STRUCTURE_CONTEXTS_PART1: readonly PublicStructureContext[] = [
  {
    "actorId": "megothon",
    "metrics": [
      {
        "id": "2023-butts",
        "label": {
          "fr": "Mégots collectés",
          "en": "Butts collected"
        },
        "value": 1000000,
        "unit": "count",
        "period": "2023",
        "scope": "edition",
        "quality": "approximate",
        "sourceId": "megothon-editions"
      },
      {
        "id": "2023-people",
        "label": {
          "fr": "Bénévoles",
          "en": "Volunteers"
        },
        "value": 1200,
        "unit": "count",
        "period": "2023",
        "scope": "edition",
        "quality": "approximate",
        "sourceId": "megothon-editions"
      },
      {
        "id": "2024-butts",
        "label": {
          "fr": "Mégots collectés",
          "en": "Butts collected"
        },
        "value": 971028,
        "unit": "count",
        "period": "2024",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2024"
      },
      {
        "id": "2024-people",
        "label": {
          "fr": "Bénévoles",
          "en": "Volunteers"
        },
        "value": 2166,
        "unit": "count",
        "period": "2024",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2024"
      },
      {
        "id": "2024-idf",
        "label": {
          "fr": "Actions",
          "en": "Events"
        },
        "value": 19,
        "unit": "count",
        "period": "2024",
        "scope": "ile_de_france",
        "quality": "reported",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2024-paris-events",
        "label": {
          "fr": "Ramassages recensés (département 75)",
          "en": "Listed cleanups (department 75)"
        },
        "value": 6,
        "unit": "count",
        "period": "2024",
        "scope": "paris",
        "quality": "reported",
        "sourceId": "megothon-2024"
      },
      {
        "id": "2024-events",
        "label": {
          "fr": "Ramassages recensés",
          "en": "Listed cleanups"
        },
        "value": 130,
        "unit": "count",
        "period": "2024",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2024"
      },
      {
        "id": "2024-reports",
        "label": {
          "fr": "Ramassages avec bilan",
          "en": "Cleanups reporting results"
        },
        "value": 118,
        "unit": "count",
        "period": "2024",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2024"
      },
      {
        "id": "2025-butts",
        "label": {
          "fr": "Mégots collectés",
          "en": "Butts collected"
        },
        "value": 1916538,
        "unit": "count",
        "period": "2025",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2025-people",
        "label": {
          "fr": "Bénévoles",
          "en": "Volunteers"
        },
        "value": 5204,
        "unit": "count",
        "period": "2025",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2025-events",
        "label": {
          "fr": "Ramassages recensés",
          "en": "Listed cleanups"
        },
        "value": 283,
        "unit": "count",
        "period": "2025",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2025-reports",
        "label": {
          "fr": "Ramassages avec bilan",
          "en": "Cleanups reporting results"
        },
        "value": 238,
        "unit": "count",
        "period": "2025",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2025-idf",
        "label": {
          "fr": "Actions",
          "en": "Events"
        },
        "value": 40,
        "unit": "count",
        "period": "2025",
        "scope": "ile_de_france",
        "quality": "reported",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2025-valorisation",
        "label": {
          "fr": "Mégots déclarés valorisés",
          "en": "Butts reported recovered"
        },
        "value": 10,
        "unit": "percent",
        "period": "2025",
        "scope": "edition",
        "quality": "approximate",
        "sourceId": "megothon-2025"
      },
      {
        "id": "2026-butts",
        "label": {
          "fr": "Mégots collectés (annonce d'un partenaire)",
          "en": "Butts collected (partner announcement)"
        },
        "value": 1120000,
        "unit": "count",
        "period": "2026",
        "scope": "edition",
        "quality": "approximate",
        "sourceId": "megothon-2026-partner"
      },
      {
        "id": "2026-events",
        "label": {
          "fr": "Événements (annonce d'un partenaire)",
          "en": "Events (partner announcement)"
        },
        "value": 169,
        "unit": "count",
        "period": "2026",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "megothon-2026-partner"
      },
      {
        "id": "cpm-price",
        "label": {
          "fr": "Prix affiché du certificat de 1 kg",
          "en": "Advertised price of 1 kg certificate"
        },
        "value": 100,
        "unit": "eur_per_kg",
        "period": "2026",
        "scope": "offer",
        "quality": "reported",
        "sourceId": "megothon-cpm"
      },
      {
        "id": "cpm-management",
        "label": {
          "fr": "Part annoncée pour la gestion",
          "en": "Advertised management share"
        },
        "value": 20,
        "unit": "percent",
        "period": "2026",
        "scope": "offer",
        "quality": "reported",
        "sourceId": "megothon-cpm"
      }
    ],
    "limits": [
      {
        "id": "recovery-2025",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "En 2025, le bilan déclare environ 10 % de mégots valorisés au niveau national, sans ventilation matière/énergie propre à l'édition. La destination des autres mégots n'est pas établie par ce taux.",
          "en": "The 2025 national report states approximately 10% recovery, without an edition-specific material/energy breakdown. This rate does not establish the destination of the remainder."
        },
        "sourceIds": [
          "megothon-2025"
        ]
      },
      {
        "id": "residual-route",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "La FAQ 2026 prévoit un point d'apport spécialisé ou, à défaut, les ordures ménagères. Une collecte ne prouve donc pas un recyclage matière.",
          "en": "The 2026 FAQ allows a specialist drop-off or household residual waste if none is available. Collection does not prove material recycling."
        },
        "sourceIds": [
          "megothon-faq"
        ]
      },
      {
        "id": "paris-results",
        "basis": "not_established",
        "kind": "transparency",
        "text": {
          "fr": "Le bilan 2024 recense six ramassages dans le département 75, sans total parisien de mégots. Les résultats annuels locaux et le traitement final ne sont pas établis ; ne pas les déduire des bilans globaux ou franciliens.",
          "en": "The 2024 report lists six cleanups in department 75 but no Paris butt count. Annual local totals and final treatment are not established; do not infer them from edition-wide or regional totals."
        },
        "sourceIds": [
          "megothon-2025",
          "megothon-editions"
        ]
      },
      {
        "id": "cpm-proof",
        "basis": "not_established",
        "kind": "claims",
        "text": {
          "fr": "Les CPM sont une offre de financement de collecte. Le site annonce une certification et une traçabilité ; ventes effectives, audit indépendant réalisé, standard externe et prévention du double comptage restent non établis par les pages consultées. Aucun crédit ne prouve à lui seul un recyclage.",
          "en": "CPM is a collection-financing offer. The site advertises certification and traceability; actual sales, completed independent audit, external standard and double-counting prevention are not established by the reviewed pages. A credit alone does not prove recycling."
        },
        "sourceIds": [
          "megothon-cpm",
          "megothon-cgu"
        ]
      },
      {
        "id": "sponsor-budget",
        "basis": "not_established",
        "kind": "funding",
        "text": {
          "fr": "ALCOME et Trash Spotter sont remerciés dans le bilan 2025. Les montants propres au Mégothon, le budget consolidé et les versements effectifs ne sont pas établis par ce document.",
          "en": "ALCOME and Trash Spotter are acknowledged in the 2025 report. Event-specific amounts, a consolidated budget and actual transfers are not established by that report."
        },
        "sourceIds": [
          "megothon-2025",
          "alcome-partners"
        ]
      },
      {
        "id": "2026-completeness",
        "basis": "not_established",
        "kind": "transparency",
        "text": {
          "fr": "Les résultats 2026 proviennent de Mon Mégot Où Il Faut, marque d'ALCOME et partenaire de l'événement. Ce n'est pas une vérification indépendante ; bilan final complet, participants et comparabilité avec 2025 restent à confirmer.",
          "en": "The 2026 figures come from Mon Mégot Où Il Faut, an ALCOME-owned brand and event partner. This is not independent verification; the full report, participants and comparability with 2025 remain unconfirmed."
        },
        "sourceIds": [
          "megothon-2026-partner",
          "megothon-2025"
        ]
      },
      {
        "id": "operators-2025",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "Le bilan 2025 remercie Recyclop, CLOPE, Tree6clope, e.collecte, CKFD, MéGO! et Cy-Clope. Cette liste ne donne ni les tonnages par opérateur, ni les destinations des lots parisiens, ni une preuve d'implantation locale de chaque opérateur.",
          "en": "The 2025 report acknowledges Recyclop, CLOPE, Tree6clope, e.collecte, CKFD, MéGO! and Cy-Clope. This list establishes neither operator-specific tonnages, Paris batch destinations nor local presence for each operator."
        },
        "sourceIds": [
          "megothon-2025"
        ]
      },
      {
        "id": "paris-events",
        "basis": "documented",
        "kind": "transparency",
        "text": {
          "fr": "L'édition inaugurale inclut Paris en juin 2023. Les publications annoncent Châtelet le 24 mai 2025 et Bastille le 30 mai 2026. Elles ne fournissent pas de bilan local annuel complet.",
          "en": "The inaugural edition included Paris in June 2023. Publications announce Châtelet on 24 May 2025 and Bastille on 30 May 2026. They do not provide a complete annual local report."
        },
        "sourceIds": [
          "megothon-editions",
          "chatelet-2025",
          "paris-bastille-2026"
        ]
      },
      {
        "id": "collective-scope",
        "basis": "documented",
        "kind": "governance",
        "text": {
          "fr": "La page 2026 cite WCD comme partenaire fondateur et DEA, Clean Walker, Team River Clean, LOPP, The Clean Project, Wings of the Ocean et CLOPE dans le collectif national. 1 Déchet par Jour relaie l'édition 2025. Une affiliation nationale ou un relais ne prouvent pas une action parisienne ni un financement local.",
          "en": "The 2026 page lists WCD as a founding partner and DEA, Clean Walker, Team River Clean, LOPP, The Clean Project, Wings of the Ocean and CLOPE in the national collective. 1 Déchet par Jour promoted the 2025 edition. National affiliation or promotion does not establish a Paris event or local funding."
        },
        "sourceIds": [
          "megothon-collectif",
          "one-waste-2025",
          "wcd-2025"
        ]
      },
      {
        "id": "edition-geography",
        "basis": "documented",
        "kind": "claims",
        "text": {
          "fr": "Les tableaux des bilans 2024 et 2025 incluent des opérations hors de France (Montréal en 2024 ; Genève et Montréal en 2025). Les totaux publiés sont ceux des éditions, pas des totaux strictement français recalculés.",
          "en": "The 2024 and 2025 tables include events outside France (Montreal in 2024; Geneva and Montreal in 2025). Published totals are edition-wide, not recalculated France-only totals."
        },
        "sourceIds": [
          "megothon-2024",
          "megothon-2025"
        ]
      },
      {
        "id": "water-equivalence",
        "basis": "documented",
        "kind": "claims",
        "text": {
          "fr": "Le bilan 2025 communique environ 958 millions de litres d'eau épargnés pour 1,92 million de mégots ; l'offre CPM associe 10 kg à 5 000 litres. Les conventions ne sont pas démontrées compatibles. Ces équivalences ne mesurent pas une pollution réellement évitée ; ne pas les reprendre comme indicateurs d'impact CleanMyMap.",
          "en": "The 2025 report claims roughly 958 million litres spared for 1.92 million butts; the CPM offer associates 10 kg with 5,000 litres. The conventions are not shown to be compatible. These equivalents do not measure pollution actually avoided and must not become CleanMyMap impact metrics."
        },
        "sourceIds": [
          "megothon-2025",
          "megothon-cpm"
        ]
      },
      {
        "id": "cpm-accounting-proof",
        "basis": "not_established",
        "kind": "claims",
        "text": {
          "fr": "L'offre CPM revendique une traçabilité par blockchain et un usage dans le reporting d'entreprise. L'annonce ne démontre ni l'exécution du contrôle, ni l'intégrité des données d'entrée, ni une assurance indépendante, ni l'éligibilité de chaque acheteur à un traitement fiscal ou comptable. Ne pas présenter ces certificats comme une compensation ou un impact net vérifié.",
          "en": "The CPM offer advertises blockchain traceability and corporate reporting use. The offer does not establish completed controls, input data integrity, independent assurance or each buyer's tax/accounting eligibility. Do not present these certificates as verified offsets or net impact."
        },
        "sourceIds": [
          "megothon-cpm",
          "megothon-faq",
          "megothon-cgu"
        ]
      }
    ]
  },
  {
    "actorId": "world-cleanup-day-france",
    "metrics": [
      {
        "id": "wcd-budget",
        "label": {
          "fr": "Budget global de l'association",
          "en": "Association-wide budget"
        },
        "value": 211500,
        "unit": "eur",
        "period": "2024-2025",
        "scope": "organization",
        "quality": "reported",
        "sourceId": "wcd-2025"
      },
      {
        "id": "wcd-patronage",
        "label": {
          "fr": "Part des produits : mécénat financier (graphique)",
          "en": "Revenue share: financial patronage (chart)"
        },
        "value": 69,
        "unit": "percent",
        "period": "2024-2025",
        "scope": "organization",
        "quality": "reported",
        "sourceId": "wcd-2025"
      },
      {
        "id": "wcd-dues",
        "label": {
          "fr": "Dons et cotisations",
          "en": "Donations and membership dues"
        },
        "value": 9,
        "unit": "percent",
        "period": "2024-2025",
        "scope": "organization",
        "quality": "reported",
        "sourceId": "wcd-2025"
      },
      {
        "id": "wcd-public",
        "label": {
          "fr": "Subventions",
          "en": "Grants"
        },
        "value": 7,
        "unit": "percent",
        "period": "2024-2025",
        "scope": "organization",
        "quality": "reported",
        "sourceId": "wcd-2025"
      },
      {
        "id": "wcd-services",
        "label": {
          "fr": "Prestations",
          "en": "Services"
        },
        "value": 7,
        "unit": "percent",
        "period": "2024-2025",
        "scope": "organization",
        "quality": "reported",
        "sourceId": "wcd-2025"
      },
      {
        "id": "wcd-other",
        "label": {
          "fr": "Autres produits",
          "en": "Other revenue"
        },
        "value": 8,
        "unit": "percent",
        "period": "2024-2025",
        "scope": "organization",
        "quality": "reported",
        "sourceId": "wcd-2025"
      },
      {
        "id": "wcd-2024-butts",
        "label": {
          "fr": "Mégots collectés lors du World Cleanup Day",
          "en": "Butts collected during World Cleanup Day"
        },
        "value": 8000000,
        "unit": "count",
        "period": "2024",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "wcd-butts-results"
      },
      {
        "id": "wcd-2024-recovery",
        "label": {
          "fr": "Mégots déclarés valorisés lors du World Cleanup Day",
          "en": "Butts reported recovered during World Cleanup Day"
        },
        "value": 750000,
        "unit": "count",
        "period": "2024",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "wcd-butts-results"
      },
      {
        "id": "wcd-2025-butts",
        "label": {
          "fr": "Mégots collectés lors du World Cleanup Day",
          "en": "Butts collected during World Cleanup Day"
        },
        "value": 6000000,
        "unit": "count",
        "period": "2025",
        "scope": "edition",
        "quality": "reported",
        "sourceId": "wcd-butts-results"
      }
    ],
    "limits": [
      {
        "id": "wcd-tobacco",
        "basis": "documented",
        "kind": "funding",
        "text": {
          "fr": "Le rapport 2025 cite ALCOME, Trash Spotter et Citeo parmi les mécènes financiers. ALCOME relève de la REP tabac. Les montants individuels, les conditions des conventions et l'affectation au Mégothon ne sont pas établis par cette liste.",
          "en": "The 2025 report lists ALCOME, Trash Spotter and Citeo among financial patrons. ALCOME is part of tobacco producer responsibility. Individual amounts, contract conditions and allocation to Mégothon are not established by that list."
        },
        "sourceIds": [
          "wcd-2025",
          "alcome-rep"
        ]
      },
      {
        "id": "wcd-role",
        "basis": "documented",
        "kind": "governance",
        "text": {
          "fr": "Le rapport 2025 indique que WCD France cesse d'être coporteur en 2026 tout en restant partenaire. Ne pas lui attribuer le budget ou la gouvernance du Mégothon 2026.",
          "en": "The 2025 report states WCD France ceases to co-lead in 2026 while remaining a partner. Do not attribute the 2026 Mégothon budget or governance to it."
        },
        "sourceIds": [
          "wcd-2025"
        ]
      },
      {
        "id": "wcd-budget-scope",
        "basis": "documented",
        "kind": "funding",
        "text": {
          "fr": "Le graphique des produits d'exploitation du 1er avril 2024 au 31 mars 2025 indique 69 % de mécénat financier ; le texte du rapport arrondit à 70 %. Ne pas convertir des pourcentages arrondis en montants comptables exacts. Le budget concerne l'association entière, non le Mégothon.",
          "en": "The operating revenue chart for 1 April 2024 to 31 March 2025 reports 69% financial patronage; the report's text rounds this to 70%. Do not turn rounded percentages into exact accounting amounts. The budget covers the whole association, not Mégothon."
        },
        "sourceIds": [
          "wcd-2025"
        ]
      },
      {
        "id": "wcd-patrons-list",
        "basis": "documented",
        "kind": "funding",
        "text": {
          "fr": "Mécènes financiers cités dans la section consacrée au mécénat du rapport 2025 : Adeo, Adextan, Alcome, AllColibri (Décathlon et autres), Bioviva, Banque Populaire, Citeo, Cofidis, Groupe Isore, Macif (Diffuz), Mobiüs (Common Cents), Fondation Crédit Mutuel, Fondation Natixis, Kiloutou, La Poste, Lesaffre, Perles&Co, Socaps, SPIE ICS, Trash Spotter, Tunzini (groupe Vinci). Aucun montant individuel ni affectation à une action n'est fourni par cette liste.",
          "en": "Financial patrons listed in the 2025 report's patronage section: Adeo, Adextan, Alcome, AllColibri (Décathlon et autres), Bioviva, Banque Populaire, Citeo, Cofidis, Groupe Isore, Macif (Diffuz), Mobiüs (Common Cents), Fondation Crédit Mutuel, Fondation Natixis, Kiloutou, La Poste, Lesaffre, Perles&Co, Socaps, SPIE ICS, Trash Spotter, Tunzini (groupe Vinci). The list provides no individual amount or event allocation."
        },
        "sourceIds": [
          "wcd-2025"
        ]
      },
      {
        "id": "wcd-event-recovery",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "Le bilan de l'association pour le World Cleanup Day 2024 déclare 750 000 mégots valorisés sur 8 millions ramassés, sans ventilation matière/énergie. Pour 2025, la page donne 6 millions collectés mais pas de quantité valorisée. Ces résultats ne sont pas ceux du Mégothon ; ne pas les additionner sans preuve de périmètres disjoints.",
          "en": "The association's 2024 World Cleanup Day report lists 750,000 recovered out of 8 million collected, with no material/energy breakdown. For 2025 the page lists 6 million collected but no recovered quantity. These are not Mégothon results; do not add them without proof of disjoint scopes."
        },
        "sourceIds": [
          "wcd-butts-results"
        ]
      }
    ]
  },
];

export const PUBLIC_STRUCTURE_CONTEXTS: readonly PublicStructureContext[] = [
  ...PUBLIC_STRUCTURE_CONTEXTS_PART1,
  ...PUBLIC_STRUCTURE_CONTEXTS_PART2,
];
