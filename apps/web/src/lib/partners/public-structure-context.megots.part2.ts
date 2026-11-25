import type { PublicStructureContext } from "./public-structure-context";

export const PUBLIC_STRUCTURE_CONTEXTS_PART2: readonly PublicStructureContext[] = [
  {
    "actorId": "asso-megots-alcome",
    "metrics": [
      {
        "id": "support-rate",
        "label": {
          "fr": "Barème communes de 50 000 habitants et plus",
          "en": "Rate for municipalities of at least 50,000 inhabitants"
        },
        "value": 2.08,
        "unit": "eur_per_person_year",
        "period": "2026",
        "scope": "offer",
        "quality": "reported",
        "sourceId": "alcome-support"
      },
      {
        "id": "pickup-threshold",
        "label": {
          "fr": "Seuil d'enlèvement annoncé pour communes sous contrat",
          "en": "Advertised collection threshold for contracted municipalities"
        },
        "value": 100,
        "unit": "kg",
        "period": "2026",
        "scope": "offer",
        "quality": "reported",
        "sourceId": "alcome-support"
      }
    ],
    "limits": [
      {
        "id": "rep-governance",
        "basis": "documented",
        "kind": "governance",
        "text": {
          "fr": "Éco-organisme agréé de la REP tabac, financé par les producteurs. Sa page de gouvernance indique que son président nommé en mars 2026 représentait auparavant British American Tobacco France au conseil d'administration.",
          "en": "Accredited tobacco producer responsibility organization financed by producers. Its governance page states that its president appointed in March 2026 previously represented British American Tobacco France on the board."
        },
        "sourceIds": [
          "alcome-rep",
          "alcome-governance"
        ]
      },
      {
        "id": "cnct-critique",
        "basis": "attributed_critique",
        "kind": "governance",
        "text": {
          "fr": "Le CNCT dénonce un risque de légitimation de l'industrie du tabac et qualifie le dispositif de greenwashing. Avec Surfrider Foundation Europe, il demande une gouvernance indépendante des fabricants. Ce sont des positions publiques attribuées, pas une décision judiciaire ni une qualification des bénéficiaires.",
          "en": "CNCT criticizes the scheme as greenwashing and a risk of legitimizing the tobacco industry. Together with Surfrider Foundation Europe, it calls for governance independent of manufacturers. These are attributed public positions, not a court decision or a finding against recipients."
        },
        "sourceIds": [
          "cnct-alcome",
          "cnct-surfrider",
          "alcome-governance"
        ]
      },
      {
        "id": "support-conditions",
        "basis": "documented",
        "kind": "funding",
        "text": {
          "fr": "Le barème et l'enlèvement à partir de 100 kg concernent les collectivités sous contrat, selon les modalités d'ALCOME. Ils ne prouvent ni un versement parisien précis ni une aide directe à une association.",
          "en": "The rate and collection from 100 kg concern contracted municipalities under ALCOME's terms. They establish neither a specific payment to Paris nor direct assistance to an association."
        },
        "sourceIds": [
          "alcome-support",
          "alcome-rep"
        ]
      },
      {
        "id": "campaign-source",
        "basis": "documented",
        "kind": "transparency",
        "text": {
          "fr": "Mon Mégot Où Il Faut se présente comme une marque d'ALCOME ; sa publication du 30 mai 2026 annonce les résultats de l'événement dont elle est partenaire. Ne pas compter la marque comme financeur indépendant ni son annonce comme audit externe.",
          "en": "Mon Mégot Où Il Faut identifies itself as an ALCOME-owned brand; its 30 May 2026 publication announces results for an event it partners with. Do not count the brand as an independent funder or its announcement as an external audit."
        },
        "sourceIds": [
          "megothon-2026-partner"
        ]
      },
      {
        "id": "street-collection-eligibility",
        "kind": "treatment",
        "basis": "documented",
        "text": {
          "fr": "Le cahier des charges de 2022 visait les mégots issus des cendriers de rue des collectivités et imposait des critères de qualité du flux et des obligations de transport. La FAQ actuelle indique un minimum de 100 kg pour la collecte séparée. Ce seuil ne prouve pas l'éligibilité des mégots ramassés au sol ni une prise en charge d'un dépôt citoyen. Faire confirmer les modalités actuelles et le régime applicable avant stockage ou transport.",
          "en": "The 2022 specification covered butts from municipal street ashtrays and imposed stream-quality and transport requirements. The current FAQ states a 100 kg minimum for separate collection. This threshold does not establish eligibility of ground-collected butts or acceptance of a citizen drop-off. Confirm current terms and applicable rules before storage or transport."
        },
        "sourceIds": [
          "alcome-spec-2022",
          "alcome-faq-collection",
          "waste-transport-r541-50"
        ]
      }
    ]
  },
  {
    "actorId": "asso-gestes-propres",
    "limits": [
      {
        "id": "industrial-partners",
        "basis": "documented",
        "kind": "funding",
        "text": {
          "fr": "L'association présente des industriels parmi ses membres et Citeo, ALCOME et Ecomaison comme partenaires. La page consultée ne chiffre pas les contributions individuelles ni leur éventuelle affectation au Mégothon.",
          "en": "The association lists industry members and Citeo, ALCOME and Ecomaison as partners. The reviewed page does not quantify individual contributions or possible Mégothon allocations."
        },
        "sourceIds": [
          "gestes-partners",
          "alcome-partners"
        ]
      },
      {
        "id": "packaging-interest-debate",
        "kind": "funding",
        "basis": "attributed_critique",
        "text": {
          "fr": "Carenews relaie l'enquête d'octobre 2026 de Zero Waste France et cite un financement de Gestes Propres par Elipso, syndicat des fabricants d'emballages plastiques. Le montant et les conditions restent non établis dans les extraits consultés ; ne pas déduire une intention ni un financement du Mégothon.",
          "en": "Carenews reports Zero Waste France's October 2026 investigation and cites funding of Gestes Propres by Elipso, the plastic packaging trade association. Amount and conditions are not established by the reviewed excerpts; do not infer intent or Mégothon funding."
        },
        "sourceIds": [
          "carenews-gestes-2026",
          "zwf-emballages-2026"
        ]
      }
    ]
  },
  {
    "actorId": "trash-spotter",
    "limits": [
      {
        "id": "scope",
        "basis": "documented",
        "kind": "transparency",
        "text": {
          "fr": "La plateforme a assuré un suivi numérique de l'édition 2023 et figure parmi les partenaires remerciés en 2025 et mécènes financiers de WCD France. Cela ne démontre ni son rôle technique en 2026 ni le montant des financements.",
          "en": "The platform supported digital reporting in 2023 and is acknowledged in 2025 and listed as a WCD France financial patron. This establishes neither its technical role in 2026 nor funding amounts."
        },
        "sourceIds": [
          "trash-2023",
          "megothon-2025",
          "wcd-2025"
        ]
      }
    ]
  },
  {
    "actorId": "lopp",
    "limits": [
      {
        "id": "platform-owner",
        "basis": "documented",
        "kind": "governance",
        "text": {
          "fr": "Les CGU de mars 2026 identifient LOPP comme éditeur de la plateforme Mégothon. ALCOME présente aussi LOPP comme partenaire. Ne pas assimiler l'éditeur au bénéficiaire exclusif des fonds ni à un financement chiffré.",
          "en": "The March 2026 terms identify LOPP as the Mégothon platform publisher. ALCOME also lists LOPP as a partner. This does not establish exclusive receipt of funds or a quantified payment."
        },
        "sourceIds": [
          "megothon-cgu",
          "alcome-partners",
          "lopp-partners"
        ]
      }
    ]
  },
  {
    "actorId": "asso-featured-1",
    "limits": [
      {
        "id": "brigade-filiere",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "Le compte rendu Gambetta de mars 2025 documente la valorisation via Récolte Citadine avec Cy-Clope. Il ne prouve pas le devenir des lots du Mégothon 2026 ni le maintien des modalités.",
          "en": "The March 2025 Gambetta minutes document recovery via Récolte Citadine with Cy-Clope. They do not establish the destination of Mégothon 2026 batches or that the terms remain current."
        },
        "sourceIds": [
          "gambetta-2025",
          "cyclope-treatment"
        ]
      },
      {
        "id": "brigade-tchao-conditional",
        "basis": "not_established",
        "kind": "treatment",
        "text": {
          "fr": "L'annonce Quartier Propre du 21 mars 2026 envisage TchaoMegot sous réserve d'obtenir le financement. Elle ne confirme ni un accord, ni la prise en charge effective, ni une destination des lots Mégothon 2026.",
          "en": "The 21 March 2026 Quartier Propre announcement considers TchaoMegot subject to funding. It establishes neither an agreement nor actual treatment nor the destination of Mégothon 2026 batches."
        },
        "sourceIds": [
          "brigade-tchao-2026",
          "tchao-treatment"
        ]
      },
      {
        "id": "local-funding",
        "kind": "funding",
        "basis": "not_established",
        "text": {
          "fr": "La Brigade Verte publie une adhésion annuelle à partir de 20 € et décrit la participation RSE de MyLegiTech en 2023. Le budget consolidé des collectes et les montants de chaque soutien ne sont pas établis par cette présentation.",
          "en": "Brigade Verte advertises annual membership from €20 and describes MyLegiTech's 2023 CSR involvement. The consolidated cleanup budget and individual support amounts are not established by this presentation."
        },
        "sourceIds": [
          "brigade-helloasso"
        ]
      }
    ]
  },
  {
    "actorId": "evt-paris-nettoyages",
    "metrics": [
      {
        "id": "paris-tonnes",
        "label": {
          "fr": "Masse annuelle de mégots ramassés (estimation municipale)",
          "en": "Annual mass of butts collected (municipal estimate)"
        },
        "value": 350,
        "unit": "tonnes",
        "period": "2025",
        "scope": "paris",
        "quality": "approximate",
        "sourceId": "paris-communique"
      },
      {
        "id": "paris-cost",
        "label": {
          "fr": "Coût annuel estimé du jet de mégots",
          "en": "Estimated annual cost of littered butts"
        },
        "value": 10000000,
        "unit": "eur",
        "period": "2025",
        "scope": "paris",
        "quality": "approximate",
        "sourceId": "paris-megots"
      },
      {
        "id": "paris-discarded",
        "label": {
          "fr": "Mégots jetés au sol par an (estimation)",
          "en": "Butts littered annually (estimate)"
        },
        "value": 2000000000,
        "unit": "count",
        "period": "2025",
        "scope": "paris",
        "quality": "approximate",
        "sourceId": "paris-megots"
      }
    ],
    "limits": [
      {
        "id": "paris-measure",
        "basis": "documented",
        "kind": "transparency",
        "text": {
          "fr": "Les communications municipales de 2025 parlent tantôt de 4 à 5 millions de mégots ramassés, tantôt de mégots jetés au sol chaque jour. La méthode de rapprochement de ces flux n'est pas établie ; ne pas présenter cette estimation comme un comptage exhaustif ni comme le budget du Mégothon.",
          "en": "The city's 2025 communications variously describe 4–5 million butts collected or discarded on the ground each day. How these flows are reconciled is not established; do not present this estimate as an exhaustive count or as the Mégothon budget."
        },
        "sourceIds": [
          "paris-megots",
          "paris-communique",
          "paris-discarded-daily"
        ]
      },
      {
        "id": "paris-rep",
        "basis": "documented",
        "kind": "funding",
        "text": {
          "fr": "Un contrat REP mégots avec ALCOME a été approuvé en 2021 (DPE 58). Le plan 2025 mentionne une distribution de cendriers de poche avec ALCOME et les buralistes. Les versements exacts et l'affectation à une action citoyenne nécessitent des pièces comptables distinctes.",
          "en": "A tobacco-butt producer responsibility contract with ALCOME was approved in 2021 (DPE 58). The 2025 plan mentions pocket ashtray distribution with ALCOME and tobacconists. Exact transfers and allocation to a citizen action require separate accounting evidence."
        },
        "sourceIds": [
          "paris-contrat",
          "paris-megots"
        ]
      }
    ]
  },
  {
    "actorId": "asso-megots-cyclope",
    "limits": [
      {
        "id": "energy-not-recycling",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "Cy-Clope décrit une valorisation énergétique des mégots. Ce traitement ne constitue pas un recyclage matière. Demander une preuve de réception, de traitement final et de la quantité réellement valorisée pour chaque lot.",
          "en": "Cy-Clope describes energy recovery of butts. This is not material recycling. Request evidence of receipt, final treatment and actual recovered quantity for each batch."
        },
        "sourceIds": [
          "cyclope-treatment"
        ]
      }
    ]
  },
  {
    "actorId": "operator-ckfd",
    "limits": [
      {
        "id": "downstream",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "CKFD annonce un regroupement à Gennevilliers puis un envoi vers une filière bretonne. Cette offre ne prouve ni l'admission de mégots ramassés au sol ni le trajet et le traitement effectifs d'un lot.",
          "en": "CKFD advertises consolidation in Gennevilliers followed by transport to a Brittany facility. This offer proves neither acceptance of littered butts nor a specific batch's actual transport and treatment."
        },
        "sourceIds": [
          "ckfd-treatment"
        ]
      },
      {
        "id": "direct-dropoff",
        "kind": "treatment",
        "basis": "not_established",
        "text": {
          "fr": "L'entrepôt de Gennevilliers est présenté par CKFD comme un site de regroupement de ses collectes. Il ne constitue pas un point d'apport public démontré. Obtenir un accord sur les lots, le conditionnement, le prix et la preuve de réception et de traitement avant tout déplacement.",
          "en": "CKFD describes its Gennevilliers warehouse as a consolidation site for its collections. It is not an established public drop-off site. Obtain agreement on batches, packaging, price and evidence of receipt and treatment before transport."
        },
        "sourceIds": [
          "ckfd-treatment"
        ]
      }
    ]
  },
  {
    "actorId": "operator-mego",
    "limits": [
      {
        "id": "material-route",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "MéGO! annonce un recyclage matière mais indique qu'environ 30 % des mégots reçus sont déclassés vers la valorisation énergétique, notamment lorsqu'ils sont trop humides ou contaminés. Il s'agit d'une déclaration de l'opérateur, pas du taux du Mégothon. Demander les quantités réellement traitées et les justificatifs de chaque lot.",
          "en": "MéGO! advertises material recycling but states that about 30% of received butts are downgraded to energy recovery, including overly wet or contaminated material. This is an operator statement, not a Mégothon rate. Request the actual treated quantities and batch evidence."
        },
        "sourceIds": [
          "mego-treatment",
          "mego-products"
        ]
      }
    ],
    "metrics": [
      {
        "id": "mego-downgrade",
        "label": {
          "fr": "Mégots reçus déclarés déclassés",
          "en": "Received butts reported downgraded"
        },
        "value": 30,
        "unit": "percent",
        "period": "Page consultée 2026",
        "scope": "organization",
        "quality": "approximate",
        "sourceId": "mego-products"
      }
    ]
  },
  {
    "institutionId": "asso-megots-tchaomegot",
    "limits": [
      {
        "id": "tchao-route",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "TchaoMegot annonce une dépollution des filtres et une transformation en fibres isolantes. L'offre ne prouve pas la prise en charge des mégots du Mégothon parisien ni le rendement réel de chaque lot.",
          "en": "TchaoMegot advertises filter decontamination and conversion to insulating fibers. The offer does not establish treatment of Paris Mégothon butts or actual batch yields."
        },
        "sourceIds": [
          "tchao-treatment"
        ]
      }
    ]
  },
  {
    "institutionId": "asso-megots-ecomegot",
    "limits": [
      {
        "id": "operator-route",
        "basis": "not_established",
        "kind": "treatment",
        "text": {
          "fr": "L'offre de collecte ne suffit pas à établir le traitement final d'un lot particulier. Demander conditions d'acceptation, filière, justificatif et prix.",
          "en": "The collection offer does not establish final treatment of a particular batch. Confirm acceptance, route, evidence and price."
        },
        "sourceIds": [
          "ecomegot-treatment"
        ]
      }
    ]
  },
  {
    "actorId": "collectivite-syctom",
    "limits": [
      {
        "id": "residual-not-specialized",
        "basis": "documented",
        "kind": "treatment",
        "text": {
          "fr": "Le circuit des ordures ménagères résiduelles ne prouve pas le recyclage matière des mégots. Les installations industrielles ne sont pas des points de dépôt autorisés pour les bénévoles.",
          "en": "Residual household waste routing does not prove material recycling of cigarette butts. Industrial facilities are not authorized volunteer drop-off points."
        },
        "sourceIds": [
          "paris-residual"
        ]
      },
      {
        "id": "ivry-contested-emissions",
        "kind": "treatment",
        "basis": "attributed_critique",
        "text": {
          "fr": "Le Collectif 3R a demandé le 7 janvier 2026 la fermeture du four 2 d'Ivry-Paris XIII, dénonçant des dépassements et un manque d'information. Le 8 janvier, le Syctom a contesté certaines interprétations des valeurs de SO2, reconnu des dépassements ponctuels en 2024 et déclaré avoir adapté les déchets admis. Consulter les documents d'information du public ; aucune exposition individuelle ou faute judiciaire n'est déduite.",
          "en": "On 7 January 2026 Collectif 3R called for closure of furnace 2 at Ivry-Paris XIII, citing exceedances and inadequate information. On 8 January Syctom disputed some interpretations of SO2 limits, acknowledged temporary 2024 exceedances and stated it had changed accepted waste types. Consult public monitoring documents; no individual exposure or judicial finding is inferred."
        },
        "sourceIds": [
          "ivry-collectif3r",
          "ivry-response",
          "syctom-environment"
        ]
      }
    ]
  },
  {
    "actorId": "cleanwalker-paris",
    "limits": [
      {
        "id": "local-affiliation",
        "basis": "documented",
        "kind": "governance",
        "text": {
          "fr": "La page du collectif Mégothon identifie Clean Walker au niveau national. La page de l'antenne Paris annonce notamment une mission Mégothon à Émerainville-Pontault-Combault (77). Cela ne permet pas d'attribuer le coportage national ni un total de collecte à Paris intra-muros.",
          "en": "The Mégothon collective page identifies Clean Walker nationally. The Paris branch page announces a Mégothon mission at Émerainville-Pontault-Combault (77). This does not establish national co-leadership by the branch or a collection total in inner Paris."
        },
        "sourceIds": [
          "megothon-collectif",
          "cleanwalker-paris"
        ]
      }
    ]
  },
  {
    "actorId": "asso-surfrider-paris",
    "limits": [
      {
        "id": "surfrider-national-scope",
        "basis": "documented",
        "kind": "governance",
        "text": {
          "fr": "Trash Spotter cite Surfrider dans la coalition de 2023 ; Surfrider Foundation Europe participe aux critiques publiques d'ALCOME. Ces informations concernent le réseau national/européen, pas un financement, un mandat ou une opération démontrés de l'antenne Paris.",
          "en": "Trash Spotter lists Surfrider in the 2023 coalition; Surfrider Foundation Europe takes part in public criticism of ALCOME. These facts concern national/European organizations, not proven funding, mandate or event for the Paris branch."
        },
        "sourceIds": [
          "trash-2023",
          "cnct-surfrider"
        ]
      },
      {
        "id": "national-funding",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "Surfrider publie ses comptes et décrit un modèle diversifié (dons, financements publics et privés), avec sélection des partenaires et objectifs d'indépendance. Act! with Surfrider déclare des prestations pour des entreprises en 2025. Ces éléments concernent le réseau, pas un budget parisien ni le financement de chaque collecte.",
          "en": "Surfrider publishes accounts and describes diversified funding, partner screening and independence goals. Act! with Surfrider reports corporate services in 2025. These concern the wider organization, not a Paris budget or funding of every cleanup."
        },
        "sourceIds": [
          "surfrider-finance",
          "surfrider-business"
        ]
      }
    ]
  }
];
