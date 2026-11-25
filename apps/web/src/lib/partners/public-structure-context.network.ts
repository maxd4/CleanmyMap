import type { PublicStructureContext } from "./public-structure-context";
import { NETWORK_STRUCTURE_SOURCES } from './public-structure-context.network.sources';
export { NETWORK_STRUCTURE_SOURCES };

export const NETWORK_STRUCTURE_CONTEXTS: readonly PublicStructureContext[] = [
  {
    "actorId": "asso-zerowaste-paris",
    "limits": [
      {
        "id": "funding-scope",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "Le financement associe adhésions, dons, subventions, mécénat d'entreprise et prestations. Les bilans locaux 2024/2025 sont publiés ; ne pas appliquer les proportions nationales de Zero Waste France à cette association distincte.",
          "en": "Funding includes membership fees, donations, grants, corporate patronage and paid services. Local 2024/2025 reports are published; national Zero Waste France shares do not apply to this separate association."
        },
        "sourceIds": [
          "zwp-finance"
        ]
      }
    ]
  },
  {
    "actorId": "asso-zerowaste-france",
    "limits": [
      {
        "id": "independence-policy",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "L'association publie ses comptes et le rapport du commissaire aux comptes 2025. Elle déclare un financement majoritairement citoyen et une règle statutaire de refus des contributions incompatibles avec son objet. Cette politique concerne l'association nationale et ne constitue pas une certification de chaque groupe local.",
          "en": "The association publishes its accounts and 2025 auditor's report. It states that most funding comes from individuals and that its statutes reject contributions incompatible with its purpose. This policy concerns the national association, not certification of each local group."
        },
        "sourceIds": [
          "zwf-finance"
        ]
      }
    ]
  },
  {
    "actorId": "asso-maison-zero-dechet",
    "limits": [
      {
        "id": "commercial-model",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "La boutique, les activités professionnelles et la mise à disposition d'espaces contribuent au financement de la sensibilisation ; certains projets reçoivent un soutien public. Les rapports d'activité sont accessibles. Distinguer les offres payantes, les ateliers à prix solidaires et les conférences gratuites.",
          "en": "Shop sales, professional activities and space hire help fund awareness work; some projects receive public support. Activity reports are available. Distinguish paid services, sliding-price workshops and free talks."
        },
        "sourceIds": [
          "maison-eco"
        ]
      }
    ]
  },
  {
    "actorId": "ma-petite-planete",
    "limits": [
      {
        "id": "corporate-model",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "Le modèle déclaré repose notamment sur les ligues d'entreprise rémunérées et les dons. L'association publie des rapports et une liste de partenaires. La participation à un défi d'entreprise ne certifie pas la performance environnementale globale de cette entreprise.",
          "en": "The stated model includes paid corporate challenges and donations. Reports and a partner list are published. Participation in a corporate challenge does not certify that company's overall environmental performance."
        },
        "sourceIds": [
          "mpp-faq",
          "mpp-reports",
          "mpp-partners"
        ]
      },
      {
        "id": "legal-scope",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "L'objet statutaire publié au JOAFE le 28 octobre 2025 prévoit aussi la détention de participations et des services à des filiales. Cette faculté ne prouve pas l'existence d'une filiale ni un flux financier déterminé.",
          "en": "The association's purpose published on 28 October 2025 also allows holdings and services to subsidiaries. This does not establish that any subsidiary or particular financial transfer exists."
        },
        "sourceIds": [
          "mpp-joafe-2025"
        ]
      }
    ]
  },
  {
    "actorId": "the-clean-project",
    "limits": [
      {
        "id": "event-finance",
        "kind": "funding",
        "basis": "not_established",
        "text": {
          "fr": "Le site propose des événements d'entreprise et du team building. Le budget propre à la clôture Bastille et les montants individuels des partenaires ne sont pas établis par cette présentation.",
          "en": "The website offers corporate events and team building. The Bastille closing event budget and individual partner contributions are not established by this presentation."
        },
        "sourceIds": [
          "tcp-offer"
        ]
      },
      {
        "id": "reported-impact",
        "kind": "claims",
        "basis": "documented",
        "text": {
          "fr": "Les résultats de mobilisation et de ramassage affichés sont des cumuls déclarés depuis la création du projet. Ils ne démontrent ni la quantité propre à Paris ni le traitement final des déchets, ni un effet durable sur les pratiques des participants.",
          "en": "The advertised participation and cleanup figures are self-reported cumulative totals since the project began. They do not establish Paris-only volumes, final treatment or lasting changes in participant behavior."
        },
        "sourceIds": [
          "tcp-offer"
        ]
      }
    ]
  },
  {
    "actorId": "asso-1",
    "limits": [
      {
        "id": "separate-business",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "PikPik présente Services Solidaires comme une entreprise liée à l'association, intervenant notamment auprès des collectivités du Syctom. Distinguer l'activité associative, les prestations de l'entreprise et leurs comptes ; une intervention ne démontre pas un financement de toutes les actions bénévoles.",
          "en": "PikPik describes Services Solidaires as a related company serving, among others, Syctom-area municipalities. Distinguish the association's activities, company services and accounts; a contract does not establish funding of every volunteer event."
        },
        "sourceIds": [
          "pikpik-services",
          "pikpik-overview"
        ]
      }
    ]
  },
  {
    "actorId": "asso-no-plastic-in-my-sea",
    "limits": [
      {
        "id": "donations-partnerships",
        "kind": "funding",
        "basis": "not_established",
        "text": {
          "fr": "L'association annonce un soutien du ministère chargé de l'environnement et propose du mécénat d'entreprise, notamment via des réseaux de dons. La page de partenariat n'établit pas le montant individuel ni les conditions d'affectation à une action ; ne pas confondre soutien et certification d'un partenaire.",
          "en": "The association states environmental ministry support and offers corporate patronage including donation networks. The partnership page does not establish individual amounts or event allocation terms; support is not partner certification."
        },
        "sourceIds": [
          "npims-org",
          "npims-partnership"
        ]
      }
    ]
  },
  {
    "actorId": "asso-aremacs-idf",
    "limits": [
      {
        "id": "alcome-partner",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "ALCOME cite AREMACS parmi ses associations partenaires et décrit un accompagnement en cendriers de poche. Le partenariat est annoncé à l'échelle de l'association ; la nature et le montant d'un éventuel financement de l'antenne francilienne ne sont pas établis.",
          "en": "ALCOME lists AREMACS among its partner associations and describes pocket-ashtray support. The partnership is association-wide; the nature and amount of any Île-de-France branch funding are not established."
        },
        "sourceIds": [
          "alcome-partners"
        ]
      },
      {
        "id": "paid-events",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "AREMACS publie des conditions de prestations événementielles et ses rapports d'activité. Distinguer le travail des bénévoles, les interventions salariées, les prestations facturées et la communication des organisateurs ; le partenariat ne vaut pas garantie de traitement final.",
          "en": "AREMACS publishes event-service terms and activity reports. Distinguish volunteer work, paid staff, invoiced services and organizer publicity; a partnership does not guarantee final treatment."
        },
        "sourceIds": [
          "aremacs-conditions",
          "aremacs-reports"
        ]
      }
    ]
  },
  {
    "actorId": "eco-organisme-citeo",
    "limits": [
      {
        "id": "producer-governance",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "Citeo indique avoir été créé par des entreprises de la consommation et de la distribution. Ses missions incluent réduction, réemploi et recyclage ; distinguer ses obligations REP de la défense des intérêts de ses membres.",
          "en": "Citeo states it was founded by consumer-goods and retail companies. Its missions include reduction, reuse and recycling; distinguish producer-responsibility obligations from representation of member interests."
        },
        "sourceIds": [
          "citeo-mission"
        ]
      },
      {
        "id": "lobbying-disclosure",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "La fiche HATVP déclare pour 2025 des dépenses de représentation d'intérêts comprises entre 300 000 € inclus et 400 000 € exclus. Il s'agit de la fourchette de lobbying total déclarée, non d'un budget de cleanwalk ou d'un montant précis. L'inscription au registre n'établit pas une pratique illégale.",
          "en": "The HATVP register reports 2025 interest-representation spending from €300,000 inclusive to €400,000 exclusive. This is the declared total lobbying band, not a cleanup budget or exact figure. Registration does not establish illegal conduct."
        },
        "sourceIds": [
          "citeo-hatvp"
        ]
      },
      {
        "id": "packaging-lobby-debate",
        "kind": "governance",
        "basis": "attributed_critique",
        "text": {
          "fr": "Dans son enquête d'octobre 2026, Zero Waste France critique le lobbying des acteurs de l'emballage et la gouvernance industrielle de Citeo ; Que Choisir relaie cette critique. Le débat porte notamment sur la priorité donnée à la réduction à la source. Ce sont des analyses attribuées, non un constat judiciaire ni une condamnation des bénéficiaires de Citeo.",
          "en": "In its October 2026 inquiry, Zero Waste France criticizes packaging-industry lobbying and Citeo's industrial governance; Que Choisir reports that criticism. The debate concerns, among other issues, prioritizing prevention at source. These are attributed analyses, not a judicial finding or a judgment on Citeo's recipients."
        },
        "sourceIds": [
          "zwf-emballages-2026",
          "quechoisir-citeo-2026",
          "citeo-hatvp",
          "citeo-mission"
        ]
      }
    ]
  },
  {
    "actorId": "spogomi-dream-in-green-france",
    "limits": [
      {
        "id": "nippon-funding",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "Dream in Green France désigne la Nippon Foundation comme organisatrice de la Coupe du monde 2025. La fondation indique recevoir une part des recettes des paris sur les courses de bateaux à moteur au Japon. Le budget français et le montant d'un éventuel transfert à Dream in Green France ne sont pas établis ; ne pas assimiler l'association française à l'activité de paris.",
          "en": "Dream in Green France identifies the Nippon Foundation as the 2025 World Cup organizer. The foundation reports receiving a share of Japanese motorboat-race betting proceeds. The French budget and any transfer to Dream in Green France are not established; the French association is not itself a betting operator."
        },
        "sourceIds": [
          "spogomi-france",
          "nippon-funds"
        ]
      },
      {
        "id": "competition-impact",
        "kind": "claims",
        "basis": "documented",
        "text": {
          "fr": "Le score sportif dépend du poids et du type de déchets. Il sert au classement d'une compétition et non à mesurer une réduction durable de pollution ou le traitement final de chaque lot.",
          "en": "The sport score depends on waste weight and type. It ranks competition results, not lasting pollution reduction or final treatment of each batch."
        },
        "sourceIds": [
          "spogomi-france"
        ]
      }
    ]
  },
  {
    "actorId": "mylegitech",
    "limits": [
      {
        "id": "rse-scope",
        "kind": "funding",
        "basis": "not_established",
        "text": {
          "fr": "La Brigade Verte décrit une participation RSE de MyLegiTech à l'extension dans le 11e en 2023. Cette présentation ne chiffre pas un don financier et ne mesure pas l'impact global de l'entreprise.",
          "en": "Brigade Verte describes MyLegiTech's CSR involvement in the 11th district expansion in 2023. The description neither quantifies a financial gift nor measures the company's overall impact."
        },
        "sourceIds": [
          "brigade-helloasso"
        ]
      }
    ]
  },
  {
    "actorId": "mairie-paris-5",
    "limits": [
      {
        "id": "municipal-support",
        "kind": "transparency",
        "basis": "documented",
        "text": {
          "fr": "La mairie présente sa Brigade citoyenne. Le dispositif municipal de nettoyage participatif prévoit une demande de matériel ; la fiche de la brigade ne garantit ni un prêt autonome ni le financement de chaque opération. Confirmer les conditions auprès du service compétent.",
          "en": "The town hall presents its citizen brigade. Municipal participatory cleaning provides for equipment requests; the brigade page guarantees neither independent loans nor funding for every event. Confirm conditions with the relevant service."
        },
        "sourceIds": [
          "mairie5-brigade",
          "paris-participatory"
        ]
      }
    ]
  },
  {
    "actorId": "mairie-paris-6",
    "limits": [
      {
        "id": "municipal-scope",
        "kind": "transparency",
        "basis": "not_established",
        "text": {
          "fr": "Le portail local oriente notamment vers les conseils de quartier. Les moyens de propreté et le matériel de ramassage relèvent du dispositif municipal ; l'existence d'un budget ou d'un stock propre à une cleanwalk du 6e n'est pas établie par ces pages.",
          "en": "The local portal includes neighborhood-council guidance. Street-cleaning resources and cleanup equipment are handled through the municipal scheme; an event-specific budget or local stock in the 6th district is not established by these pages."
        },
        "sourceIds": [
          "mairie6-portal",
          "paris-participatory"
        ]
      }
    ]
  },
  {
    "actorId": "evt-j-agis-nature",
    "limits": [
      {
        "id": "registration-data",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "La plateforme est portée par la Fondation pour la Nature et l'Homme. Ses CGU prévoient la transmission des données d'inscription au responsable de l'action et certains partages encadrés avec des partenaires. Une annonce de bénévolat ne démontre ni la réalisation de l'opération ni son traitement des déchets.",
          "en": "The platform is operated by the Fondation pour la Nature et l'Homme. Its terms provide for transferring registration data to the event organizer and certain controlled sharing with partners. A volunteer listing does not establish event completion or waste treatment."
        },
        "sourceIds": [
          "jagis-cgu"
        ]
      }
    ]
  },
  {
    "actorId": "evt-je-veux-aider",
    "limits": [
      {
        "id": "host-responsibility",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "La charte de la plateforme publique exige des missions d'intérêt général ne se substituant pas à un emploi, et confie à la structure d'accueil la sécurité et l'encadrement des bénévoles. Vérifier les conditions de la mission ; le référencement n'atteste pas son impact environnemental.",
          "en": "The public platform's charter requires public-interest missions that do not replace jobs and assigns volunteer safety and supervision to the host organization. Check mission conditions; a listing does not establish environmental impact."
        },
        "sourceIds": [
          "jva-charter"
        ]
      }
    ]
  },
  {
    "actorId": "cleanwalk-org",
    "limits": [
      {
        "id": "v2-availability",
        "kind": "transparency",
        "basis": "documented",
        "text": {
          "fr": "Le site annonce une V2 en reconstruction, avec des fonctionnalités encore indisponibles. L'annonce ne permet pas de présumer la disponibilité de chaque outil ou la complétude des événements ; vérifier directement avant de s'inscrire.",
          "en": "The site announces a V2 under reconstruction with some features still unavailable. Do not assume availability of every tool or completeness of event listings; confirm directly before registering."
        },
        "sourceIds": [
          "cleanwalk-v2"
        ]
      }
    ]
  },
  {
    "actorId": "cleanmymap",
    "limits": [
      {
        "id": "self-transparency",
        "kind": "transparency",
        "basis": "documented",
        "text": {
          "fr": "CleanMyMap est un projet numérique open source. Le dépôt rend le code et les contrats inspectables ; cela ne constitue pas une certification indépendante de sécurité, des résultats d'impact ou de la disponibilité de toutes les fonctionnalités. Les statuts et limites des données restent applicables aux propres actions du projet.",
          "en": "CleanMyMap is an open-source digital project. The repository makes code and contracts inspectable; this does not constitute independent certification of security, impact results or availability of all features. Data status and limitations also apply to the project's own events."
        },
        "sourceIds": [
          "cmm-source"
        ]
      }
    ]
  },
  {
    "actorId": "wings-of-the-ocean",
    "limits": [
      {
        "id": "funding-model",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "L'association propose du mécénat et des actions d'entreprise et publie ses rapports. Son appel aux dons de décembre 2025 décrit des besoins de pérennisation. Ne pas assimiler les résultats nationaux, les missions littorales et le budget ou les opérations de l'antenne Paris.",
          "en": "The association offers corporate patronage and events and publishes reports. Its December 2025 appeal describes sustainability funding needs. Do not equate national results, coastal missions and the Paris branch's budget or events."
        },
        "sourceIds": [
          "wings-partners",
          "wings-reports",
          "wings-funding-2025"
        ]
      }
    ]
  },
  {
    "actorId": "school-uai-0756544f",
    "limits": [
      {
        "id": "school-scope",
        "kind": "funding",
        "basis": "documented",
        "text": {
          "fr": "Ellipse déclare un statut privé hors contrat et publie des frais de scolarité. Ces frais concernent la scolarité, pas le financement ni la réalisation d'une opération de nettoyage. Aucune prise en charge de la collecte par un mécène n'en est déduite.",
          "en": "Ellipse declares a private non-contracted status and publishes tuition fees. These fees concern education, not funding or completion of a cleanup. No cleanup sponsorship is inferred."
        },
        "sourceIds": [
          "ellipse-legal",
          "ellipse-fees"
        ]
      }
    ]
  },
  {
    "actorId": "school-uai-0751241s",
    "limits": [
      {
        "id": "address-source-scope",
        "kind": "transparency",
        "basis": "documented",
        "text": {
          "fr": "La fiche municipale indique le 6 cité Voltaire, tandis que la liste du 11e publiée en 2017 indique le 8. Cette divergence concerne l'adresse, non une accusation envers l'école ; l'établissement annoncé et les modalités d'une action doivent être confirmés.",
          "en": "The city listing gives 6 cité Voltaire, while the 11th district's 2017 list gives 8. This is an address discrepancy, not a criticism of the school; the announced establishment and event arrangements must be confirmed."
        },
        "sourceIds": [
          "voltaire-city",
          "voltaire-mairie11"
        ]
      }
    ]
  },
  {
    "institutionId": "syctom-uve-ivry",
    "limits": [
      {
        "id": "site-specific-monitoring",
        "kind": "treatment",
        "basis": "attributed_critique",
        "text": {
          "fr": "Les critiques du Collectif 3R du 7 janvier 2026 visent notamment le four 2 d'Ivry-Paris XIII. Le Syctom a répondu le lendemain. Les documents d'information et mesures du site restent la référence ; ne pas extrapoler cette controverse à toutes les installations ni présumer le statut actuel d'un four.",
          "en": "Collectif 3R's 7 January 2026 criticism specifically concerns furnace 2 at Ivry-Paris XIII. Syctom responded the following day. Site monitoring documents remain the reference; do not extrapolate to other facilities or presume a furnace's current status."
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
    "actorId": "operator-carton-plein-cyclo",
    "limits": [
      {
        "id": "service-scope",
        "kind": "treatment",
        "basis": "not_established",
        "text": {
          "fr": "Le rapport 2023 de Carton Plein et la fiche GRAFIE 2025 mentionnent les mégots dans les flux de cyclologistique. L'offre professionnelle actuelle concerne la collecte de déchets à vélo ; l'acceptation des mégots ramassés au sol, le conditionnement, la desserte de Gennevilliers, le tarif et le traitement final doivent être confirmés par un devis. Aucun contrat CleanMyMap ou CKFD pour ces lots n'est établi.",
          "en": "Carton Plein's 2023 report and GRAFIE's 2025 profile include cigarette butts among cycle-logistics streams. The current professional offer covers bicycle waste collection; acceptance of ground-collected butts, packaging, service to Gennevilliers, price and final treatment require confirmation by quotation. No CleanMyMap or CKFD contract for these batches is established."
        },
        "sourceIds": [
          "carton-plein-cyclo-services",
          "carton-plein-2023-report",
          "grafie-cyclo-2025"
        ]
      },
      {
        "id": "insertion-scope",
        "kind": "governance",
        "basis": "documented",
        "text": {
          "fr": "Carton Plein Cyclo est présentée comme une filiale de l'association Carton Plein et une entreprise d'insertion. Distinguer les comptes de l'association et de la filiale, les prestations payantes et les aides à l'insertion ; ne pas promettre un transport gratuit ni un bénéfice carbone chiffré sans mesure.",
          "en": "Carton Plein Cyclo is described as a subsidiary of the Carton Plein association and a work-integration enterprise. Distinguish association and subsidiary accounts, paid services and employment support; do not promise free transport or quantified carbon savings without measurement."
        },
        "sourceIds": [
          "grafie-cyclo-2025",
          "carton-plein-2023-report"
        ]
      }
    ]
  },
  {
    "actorId": "asso-runners-laveurs",
    "limits": [
      {
        "id": "plogging-scope",
        "kind": "claims",
        "basis": "not_established",
        "text": {
          "fr": "L'association organise des sorties de plogging en Île-de-France. Les présentations consultées n'établissent ni une fréquence annuelle garantie à Paris, ni les quantités de mégots traitées, ni un budget propre à ces sorties. Confirmer l'organisation et la destination des déchets pour chaque opération.",
          "en": "The association organizes plogging outings in Île-de-France. The reviewed profiles establish neither guaranteed annual frequency in Paris, treated cigarette-butt quantities, nor a dedicated outing budget. Confirm organization and waste destination for each event."
        },
        "sourceIds": [
          "runners-laveurs-association",
          "runners-laveurs-fondation"
        ]
      }
    ]
  }
];
