import { Answer, Locale } from "./assistant-constants";
import {
  findWasteCategorySlug,
  getWastePedagogicalProjection,
} from "@/lib/waste";
import type { WastePedagogicalProjection } from "@/lib/waste";
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text: string, patterns: string[]): boolean {
  return patterns.some((pattern) => text.includes(normalizeText(pattern)));
}

function localizedAnswer(locale: Locale, frAnswer: Answer, enAnswer: Answer): Answer {
  return locale === "fr" ? frAnswer : enAnswer;
}

const CARDBOARD_FOOD_CONTAMINATION_KEYWORDS = [
  "gras",
  "grasse",
  "graisse",
  "graisseux",
  "greasy",
  "grease",
  "sauce",
  "food residue",
  "huile alimentaire",
  "huiles alimentaires",
  "huile de cuisson",
  "huiles de cuisson",
  "huile d'olive",
  "huiles d'olive",
  "huile de friture",
  "huiles de friture",
  "cooking oil",
  "olive oil",
  "food oil",
  "frying oil",
];

const CARDBOARD_GENERIC_CONTAMINATION_KEYWORDS = [
  "souille",
  "sale",
  "dirty",
  "soiled",
  "contaminated",
  "contamine",
  "reste de",
  "restes de",
  "reste",
  "restes",
  "leftover",
  "leftovers",
  "colle",
  "glue",
];

const CARDBOARD_HAZARDOUS_CONTAMINATION_KEYWORDS = [
  "peinture",
  "paint",
  "solvant",
  "solvent",
  "huile moteur",
  "huiles moteur",
  "huile de moteur",
  "huiles de moteur",
  "motor oil",
  "engine oil",
  "huile minerale",
  "huiles minerales",
  "mineral oil",
  "aerosol",
  "aérosol",
  "produit chimique",
  "chemical",
  "pesticide",
  "hydrocarbure",
  "fuel",
];

const CARDBOARD_PACKAGE_KEYWORDS = [
  "carton de pizza",
  "carton gras de pizza",
  "carton graisseux de pizza",
  "boite a pizza",
  "boîte à pizza",
  "pizza box",
  "boite a tacos",
  "boîte à tacos",
  "taco box",
];

const CARDBOARD_FOOD_REMAINS_KEYWORDS = [
  "contenant encore des aliments",
  "contient encore des aliments",
  "contient des aliments",
  "containing food",
  "contains food",
  "food inside",
  "still has food",
  "still contains food",
  "restes alimentaires",
  "restes de nourriture",
  "food leftovers",
  "food remains",
];

const CARDBOARD_UNQUALIFIED_REMAINS_KEYWORDS = [
  "reste",
  "restes",
  "leftover",
  "leftovers",
];

const CARDBOARD_NON_FOOD_CONTAMINATION_KEYWORDS = ["colle", "glue"];

const CARDBOARD_MATERIAL_KEYWORDS = ["carton", "cardboard"];

const CONFIRMED_CARDBOARD_PACKAGING_KEYWORDS = [
  "emballage en carton",
  "emballage carton",
  "cardboard packaging",
  "cardboard box",
  "boite en carton",
  "boîte en carton",
];

const CARDBOARD_COMPOSITE_KEYWORDS = [
  "carton composite",
  "composite cardboard",
  "brique alimentaire",
  "food carton",
  "tetra pak",
  "tetrapak",
];

const CLEAN_CARDBOARD_KEYWORDS = [
  "carton de pizza propre",
  "boite a pizza propre",
  "boîte à pizza propre",
  "carton de pizza vide",
  "boite a pizza vide",
  "boîte à pizza vide",
  "clean pizza box",
  "empty pizza box",
  "clean taco box",
  "empty taco box",
];

function buildGreasyCardboardAnswer(
  locale: Locale,
  publicSpaceReportNote?: string,
  hasFoodRemains = false,
): Answer {
  return localizedAnswer(
    locale,
    {
      kind: "packaging",
      tone: "amber",
      badge: "Carton gras / emballage",
      title: "Un emballage en carton se trie même s'il est gras",
      summary: hasFoodRemains
        ? "Retire d'abord les restes alimentaires. Une fois vide, l'emballage en carton se trie avec le papier-carton, même s'il porte des traces de graisse."
        : "Des traces de graisse ou une boîte à pizza souillée ne changent pas la consigne : vide l'emballage en carton puis trie-le.",
      bullets: [
        "Retire les restes alimentaires et sépare les éléments qui ne sont pas en carton avant le tri.",
        "Une boîte à pizza ou un carton d'emballage vide, propre ou marqué par la graisse, reste dans la filière papier-carton locale.",
        "Si l'objet n'est pas un emballage en carton, précise sa nature : la matière seule ne suffit pas à déduire sa filière.",
      ],
      nextStep: "Vide l'emballage, retire les restes, puis dépose le carton en vrac dans le bac de tri local.",
      note: publicSpaceReportNote,
    },
    {
      kind: "packaging",
      tone: "amber",
      badge: "Greasy cardboard / packaging",
      title: "Cardboard packaging belongs in recycling even when it is greasy",
      summary: hasFoodRemains
        ? "Remove the food leftovers first. Once empty, cardboard packaging belongs in the paper-and-cardboard stream even when it has grease marks."
        : "Grease marks or a soiled pizza box do not change the guidance: empty the cardboard package and sort it.",
      bullets: [
        "Remove food leftovers and separate parts that are not cardboard before sorting.",
        "An empty pizza box or cardboard package, clean or marked with grease, remains in the local paper-and-cardboard stream.",
        "If the item is not cardboard packaging, specify what it is: material alone is not enough to infer its route.",
      ],
      nextStep: "Empty the package, remove leftovers, then place the cardboard loose in your local recycling bin.",
      note: publicSpaceReportNote,
    },
  );
}

function buildCardboardConditionClarificationAnswer(locale: Locale): Answer {
  return localizedAnswer(
    locale,
    {
      kind: "packaging",
      tone: "amber",
      badge: "Précise l'état du carton",
      title: "Une boîte à pizza vide se trie, même avec des traces de graisse",
      summary: "Précise surtout si des restes alimentaires sont encore dans la boîte : retire-les d'abord, puis trie l'emballage en carton.",
      bullets: [
        "Vide la boîte et retire les restes alimentaires avant de la trier.",
        "Une boîte en carton vide, propre ou marquée par la graisse, va dans la filière papier-carton locale.",
        "Si ce n'est pas un emballage en carton, précise l'objet : la matière seule ne suffit pas.",
      ],
      nextStep: "Indique si la boîte est vide ou contient encore des restes alimentaires.",
    },
    {
      kind: "packaging",
      tone: "amber",
      badge: "Specify the cardboard condition",
      title: "An empty pizza box belongs in recycling, even with grease marks",
      summary: "The key detail is whether food leftovers are still inside: remove them first, then sort the cardboard packaging.",
      bullets: [
        "Empty the box and remove food leftovers before sorting it.",
        "An empty cardboard box, clean or marked with grease, belongs in the local paper-and-cardboard stream.",
        "If it is not cardboard packaging, specify the item: material alone is not enough.",
      ],
      nextStep: "Say whether the box is empty or still contains food leftovers.",
    },
  );
}

function buildAmbiguousCardboardAnswer(
  locale: Locale,
  mode: "material" | "contamination" | "hazardous" = "material",
): Answer {
  const hazardous = mode === "hazardous";
  const uncertainContamination = mode === "contamination";
  return localizedAnswer(
    locale,
    {
      kind: hazardous ? "decheterie" : "unknown",
      tone: hazardous ? "rose" : "amber",
      badge: hazardous
        ? "Contamination à vérifier"
        : uncertainContamination
          ? "Contamination du carton à préciser"
          : "Nature du carton à préciser",
      title: hazardous
        ? "Un carton contaminé par un produit doit suivre une filière vérifiée"
        : uncertainContamination
          ? "La contamination du carton ne permet pas de choisir le bac"
          : "La matière carton ne suffit pas à déterminer la filière",
      summary: hazardous
        ? "Ne le mets pas automatiquement dans le bac de tri : vérifie la filière locale pour les déchets chimiques ou dangereux."
        : uncertainContamination
          ? "Précise la nature de la contamination avant de choisir une filière : une salissure générique ne prouve pas qu'il s'agit de graisse alimentaire."
          : "Précise s'il s'agit d'un emballage, d'un objet en carton ou d'un carton composite avant de choisir un bac.",
      bullets: hazardous
        ? [
            "La peinture, les solvants, les huiles et autres produits chimiques ne suivent pas le tri ordinaire.",
            "Garde l'objet isolé et ne l'ouvre pas si son contenu est incertain.",
            "La filière dépend du produit et de la consigne de la collectivité.",
          ]
        : uncertainContamination
          ? [
              "Une contamination décrite comme sale, souillée ou contaminée peut être alimentaire, chimique ou autre.",
              "Une trace de graisse alimentaire sur un emballage vide suit la consigne papier-carton, mais elle doit être établie.",
              "Ne choisis pas le bac papier-carton tant que la nature de la contamination n'est pas connue.",
            ]
          : [
              "Un emballage carton vide peut se trier, même avec une trace de graisse.",
              "Une matière seule, un carton composite ou un objet non identifié ne prouve pas qu'il s'agit d'un emballage.",
              "Ne choisis pas le bac papier-carton avant d'avoir identifié l'objet.",
            ],
      nextStep: hazardous
        ? "Identifie le produit et vérifie la déchèterie ou la filière locale pour déchets dangereux."
        : uncertainContamination
          ? "Précise la contamination : trace alimentaire, produit chimique ou autre souillure."
          : "Précise la nature exacte de l'objet : emballage vide, boîte, carton composite ou autre objet.",
    },
    {
      kind: hazardous ? "decheterie" : "unknown",
      tone: hazardous ? "rose" : "amber",
      badge: hazardous
        ? "Contamination to verify"
        : uncertainContamination
          ? "Specify the cardboard contamination"
          : "Specify the cardboard item",
      title: hazardous
        ? "Cardboard contaminated by a product needs a verified route"
        : uncertainContamination
          ? "The cardboard contamination is not enough to choose a bin"
          : "Cardboard material alone is not enough to choose a route",
      summary: hazardous
        ? "Do not automatically put it in recycling: check the local route for chemical or hazardous waste."
        : uncertainContamination
          ? "Specify the contamination before choosing a route: generic dirt does not prove that it is food grease."
          : "Say whether it is packaging, a cardboard object or composite cardboard before choosing a bin.",
      bullets: hazardous
        ? [
            "Paint, solvents, oils and other chemicals do not follow ordinary recycling.",
            "Keep the item isolated and do not open it if its contents are uncertain.",
            "The route depends on the product and local-authority guidance.",
          ]
        : uncertainContamination
          ? [
              "Dirt, soiling or contamination can be food-related, chemical or something else.",
              "A food-grease mark on empty packaging follows the paper-and-cardboard guidance, but it must be established.",
              "Do not choose the paper-and-cardboard bin while the contamination is unknown.",
            ]
          : [
              "Empty cardboard packaging can be recycled, even with a grease mark.",
              "Material alone, composite cardboard or an unidentified object does not prove that it is packaging.",
              "Do not choose the paper-and-cardboard bin before identifying the item.",
            ],
      nextStep: hazardous
        ? "Identify the product and check the recycling center or local hazardous-waste route."
        : uncertainContamination
          ? "Specify the contamination: food residue, chemical product or another type of soiling."
          : "Specify the item: empty packaging, box, composite carton or another cardboard object.",
    },
  );
}

function createDefaultAnswer(locale: Locale): Answer {
  return locale === "fr"
    ? {
        kind: "unknown",
        tone: "slate",
        badge: "Besoin de précision",
        title: "Je n'ai pas encore assez d'info",
        summary: "Précise la matière, l'état de l'objet et le contexte: propre ou sale, petit ou gros, dans la rue ou chez toi.",
        bullets: [
          "Indique la matière si possible: plastique, verre, métal, papier, pile, bois, textile.",
          "Dis si l'objet est propre, vide, gras, cassé ou dangereux.",
          "Ajoute le contexte: espace public, domicile, chantier ou commerce.",
        ],
        nextStep: "Essaie un exemple rapide ci-dessous pour obtenir une réponse plus nette.",
      }
    : {
        kind: "unknown",
        tone: "slate",
        badge: "Need details",
        title: "I need a bit more context",
        summary: "Tell me the material, condition and context: clean or dirty, small or bulky, public space or home.",
        bullets: [
          "Name the material if possible: plastic, glass, metal, paper, battery, wood, textile.",
          "Say whether it is clean, empty, greasy, broken or hazardous.",
          "Add the context: public space, home, construction site or shop.",
        ],
        nextStep: "Try one of the quick examples below to get a sharper answer.",
      };
}

function buildCanonicalWasteAnswer(
  projection: WastePedagogicalProjection,
  locale: Locale,
  publicSpaceReportNote?: string,
): Answer {
  const isNoPickup = projection.pickupPolicy === "no_pickup";
  const tone =
    projection.hazardLevel === "critical" || isNoPickup
      ? "rose"
      : projection.hazardLevel === "high"
        ? "amber"
        : projection.slug === "glass"
          ? "emerald"
          : "slate";
  const kind =
    projection.slug === "glass"
      ? "glass"
      : ["bulky_furniture", "wood", "electrical_equipment", "battery", "medicine"].includes(projection.slug)
        ? "decheterie"
        : "specific";
  const bullets = [
    `${projection.hazardLabel}. ${projection.pickupLabel}.`,
    ...(projection.ppe[0]
      ? [locale === "fr" ? `EPI : ${projection.ppe[0]}` : `PPE: ${projection.ppe[0]}`]
      : []),
    projection.instructions[0],
    projection.prohibitions[0],
  ].filter(Boolean).slice(0, 4);

  return {
    kind,
    tone,
    badge: projection.label,
    title: isNoPickup
      ? locale === "fr"
        ? `Sécurise et signale : ${projection.label}`
        : `Secure and report: ${projection.label}`
      : locale === "fr"
        ? `La bonne filière pour ${projection.label}`
        : `The right stream for ${projection.label}`,
    summary: isNoPickup
      ? locale === "fr"
        ? `${projection.pickupLabel}. Oriente le cas vers ${projection.disposalLabel}.`
        : `${projection.pickupLabel}. Direct the case to ${projection.disposalLabel}.`
      : locale === "fr"
        ? `${projection.pickupLabel}. Oriente-le vers ${projection.disposalLabel}.`
        : `${projection.pickupLabel}. Direct it to ${projection.disposalLabel}.`,
    bullets,
    nextStep: locale === "fr" ? `Prochaine étape : ${projection.disposalLabel}.` : `Next step: ${projection.disposalLabel}.`,
    note: publicSpaceReportNote,
  };
}

export function buildAnswer(question: string, locale: Locale): Answer {
  const text = normalizeText(question);

  if (!text) {
    return createDefaultAnswer(locale);
  }

  const wantsReport = includesAny(text, [
    "dans ma rue",
    "dans-ma-rue",
    "dansmarue",
    "declarer",
    "déclarer",
    "signalement",
    "report",
    "application",
  ]);

  const publicSpace = includesAny(text, [
    "rue",
    "trottoir",
    "route",
    "parc",
    "square",
    "allee",
    "allée",
    "voirie",
    "espace public",
    "depot sauvage",
    "dépôt sauvage",
    "corbeille",
    "poubelle publique",
    "mobilier",
    "encombrant",
  ]);

  const publicSpaceReportNote = wantsReport && publicSpace
    ? locale === "fr"
      ? "Si cet objet est abandonné dans l'espace public, un signalement sur DansMaRue peut compléter le tri."
      : "If this item is abandoned in public space, a DansMaRue-style report can complement the sorting guidance."
    : undefined;
  const fallbackBin =
    locale === "fr"
      ? "à défaut: poubelle grise / ordures ménagères"
      : "if impossible: residual waste bin";

  const canonicalSlug = findWasteCategorySlug(text);
  const isCardboardPackage = includesAny(text, CARDBOARD_PACKAGE_KEYWORDS);
  const isCardboardMaterial = includesAny(text, CARDBOARD_MATERIAL_KEYWORDS);
  const isConfirmedCardboardPackaging =
    isCardboardPackage || includesAny(text, CONFIRMED_CARDBOARD_PACKAGING_KEYWORDS);
  const isCompositeCardboard = includesAny(text, CARDBOARD_COMPOSITE_KEYWORDS);
  const isExplicitlyCleanCardboard = includesAny(text, CLEAN_CARDBOARD_KEYWORDS);
  const hasFoodRemains = includesAny(text, CARDBOARD_FOOD_REMAINS_KEYWORDS);
  const hasFoodContamination = includesAny(text, CARDBOARD_FOOD_CONTAMINATION_KEYWORDS);
  const hasGenericContamination = includesAny(text, CARDBOARD_GENERIC_CONTAMINATION_KEYWORDS);
  const hasHazardousContamination = includesAny(text, CARDBOARD_HAZARDOUS_CONTAMINATION_KEYWORDS);
  const hasUnqualifiedRemains =
    includesAny(text, CARDBOARD_UNQUALIFIED_REMAINS_KEYWORDS) && !hasFoodRemains;
  const hasNonFoodContamination = includesAny(text, CARDBOARD_NON_FOOD_CONTAMINATION_KEYWORDS);
  const isPaperCardboardCanonical = !canonicalSlug || canonicalSlug === "paper_cardboard";

  if (
    (isCardboardMaterial || isConfirmedCardboardPackaging) &&
    isPaperCardboardCanonical &&
    (hasHazardousContamination || isCompositeCardboard)
  ) {
    return buildAmbiguousCardboardAnswer(locale, hasHazardousContamination ? "hazardous" : "material");
  }

  if (
    (hasFoodContamination || hasFoodRemains) &&
    isPaperCardboardCanonical &&
    !hasUnqualifiedRemains &&
    !hasNonFoodContamination
  ) {
    return isConfirmedCardboardPackaging
      ? buildGreasyCardboardAnswer(locale, publicSpaceReportNote, hasFoodRemains)
      : buildAmbiguousCardboardAnswer(locale, "material");
  }

  if (
    hasGenericContamination &&
    (isCardboardMaterial || isConfirmedCardboardPackaging) &&
    isPaperCardboardCanonical
  ) {
    return buildAmbiguousCardboardAnswer(locale, "contamination");
  }

  if (isCardboardMaterial && !isConfirmedCardboardPackaging && isPaperCardboardCanonical) {
    return buildAmbiguousCardboardAnswer(locale, "material");
  }

  if (
    isConfirmedCardboardPackaging &&
    !isExplicitlyCleanCardboard &&
    !hasFoodContamination &&
    !hasFoodRemains &&
    !hasGenericContamination &&
    isPaperCardboardCanonical
  ) {
    return buildCardboardConditionClarificationAnswer(locale);
  }

  if (isExplicitlyCleanCardboard && isConfirmedCardboardPackaging && !canonicalSlug) {
    return buildCanonicalWasteAnswer(
      getWastePedagogicalProjection("paper_cardboard", locale),
      locale,
      publicSpaceReportNote,
    );
  }

  if (canonicalSlug) {
    return buildCanonicalWasteAnswer(
      getWastePedagogicalProjection(canonicalSlug, locale),
      locale,
      publicSpaceReportNote,
    );
  }

  const ampouleKeywords = [
    "ampoule",
    "ampoules",
    "lampe",
    "lampes",
    "neon",
    "neons",
    "néon",
    "néons",
    "tube fluorescent",
    "tubes fluorescents",
    "fluorescent",
    "led",
    "ampoule led",
    "ampoules led",
  ];
  const cartridgeKeywords = [
    "cartouche",
    "cartouches",
    "cartouche d encre",
    "cartouche d'encre",
    "cartouche encre",
    "toner",
    "toners",
    "cartouche imprimante",
    "cartouches imprimante",
  ];
  const shoeKeywords = [
    "chaussure",
    "chaussures",
    "basket",
    "baskets",
    "sneaker",
    "sneakers",
    "bottine",
    "bottines",
    "botte",
    "bottes",
    "sandale",
    "sandales",
  ];
  const foodWasteKeywords = [
    "dechets alimentaires",
    "déchets alimentaires",
    "biodéchets",
    "biodechets",
    "compost",
    "compostage",
    "restes alimentaires",
    "epluchures",
    "épluchures",
    "nourriture",
    "marc de cafe",
    "marc de café",
  ];
  const dedicatedCollectionKeywords = [
    "textile",
    "textiles",
    "vetement",
    "vêtement",
    "vêtements",
  ];
  const decheterieKeywords = [
    "decheterie",
    "déchèterie",
    "dechetterie",
    "déchetterie",
    "gravat",
    "gravats",
    "peinture",
    "solvant",
    "huile",
    "aerosol",
    "aérosol",
  ];
  const packagingKeywords = [
    "bouteille plastique",
    "bouteille en plastique",
    "canette",
    "carton",
    "papier",
    "boite a chaussures",
    "boite de chaussures",
    "boîte à chaussures",
    "shoe box",
    "emballage",
    "packaging",
    "barquette",
    "flacon",
  ];

  if (includesAny(text, foodWasteKeywords)) {
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "emerald",
        badge: "Compost / biodéchets",
        title: "Les déchets alimentaires vont au compost ou à la collecte biodéchets",
        summary: `Si ta commune a une collecte dédiée, utilise-la. Sinon, compost domestique, compost partagé ou association de quartier sont les bons réflexes (${fallbackBin}).`,
        bullets: [
          "Épluchures, restes, marc de café et autres biodéchets vont au compost.",
          "Si tu as un bac partagé ou un composteur collectif, alimente-le avec des déchets acceptés.",
          "Si le déchet est mélangé à des emballages sales, sépare ce qui peut encore être composté.",
        ],
        nextStep: "Vérifie la règle locale: collecte biodéchets, composteur collectif ou compost à domicile.",
        note: publicSpaceReportNote,
      },
      {
        kind: "specific",
        tone: "emerald",
        badge: "Compost / bio-waste",
        title: "Food scraps go to compost or a bio-waste collection stream",
        summary: `If your city offers a dedicated collection, use it. Otherwise, home compost, a shared compost point or a local association are the right options (${fallbackBin}).`,
        bullets: [
          "Peelings, leftovers, coffee grounds and other bio-waste go to compost.",
          "If you have a shared bin or community composter, feed it only with accepted waste.",
          "If the waste is mixed with dirty packaging, separate what can still be composted.",
        ],
        nextStep: "Check the local rule: bio-waste collection, community composter or home compost.",
        note: publicSpaceReportNote,
      },
    );
  }

  if (includesAny(text, ampouleKeywords)) {
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "amber",
        badge: "Point de collecte",
        title: "Ampoules et néons vont dans une collecte dédiée",
        summary: `Ne les mets pas dans le verre ni dans la poubelle classique. Dépose-les en point de collecte DEEE, en magasin ou en déchèterie selon ce que propose ta commune (${fallbackBin}).`,
        bullets: [
          "Ampoules, néons, tubes fluorescents et certaines lampes suivent une filière spéciale.",
          "Ne casse pas l'objet pour le jeter avec le verre.",
          "Un magasin ou une déchèterie peut proposer une reprise dédiée.",
        ],
        nextStep: "Cherche un point DEEE ou une reprise en magasin avant de jeter l'objet.",
        note: publicSpaceReportNote,
      },
      {
        kind: "specific",
        tone: "amber",
        badge: "Dedicated drop-off",
        title: "Light bulbs and neon tubes go to a dedicated collection point",
        summary: `Do not put them in glass recycling or regular trash. Drop them at a WEEE point, in a shop or at the recycling center depending on what your city offers (${fallbackBin}).`,
        bullets: [
          "Bulbs, neon tubes, fluorescent tubes and some lamps follow a special stream.",
          "Do not break the item just to throw it in the glass container.",
          "A shop or recycling center may offer dedicated take-back.",
        ],
        nextStep: "Look for a WEEE point or a shop take-back option before disposal.",
        note: publicSpaceReportNote,
      },
    );
  }

  if (includesAny(text, cartridgeKeywords)) {
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "amber",
        badge: "Point de collecte",
        title: "Les cartouches d'encre et toners ont une filière dédiée",
        summary: `Mieux vaut les déposer en magasin, en point de collecte dédié ou via une reprise fabricant. Elles ne vont pas avec le papier-carton classique (${fallbackBin}).`,
        bullets: [
          "Cartouches d'encre et toners ne sont pas des emballages ordinaires.",
          "Vérifie la reprise en magasin, au bureau ou chez le fabricant.",
          "Si la cartouche est abandonnée dans la rue, un signalement public peut aussi aider.",
        ],
        nextStep: "Cherche une borne dédiée ou une reprise du fabricant.",
        note: publicSpaceReportNote,
      },
      {
        kind: "specific",
        tone: "amber",
        badge: "Dedicated drop-off",
        title: "Ink cartridges and toner have a dedicated stream",
        summary: `It is better to drop them in a shop, a dedicated collection point or through manufacturer take-back. They do not go with normal paper/cardboard recycling (${fallbackBin}).`,
        bullets: [
          "Ink cartridges and toners are not ordinary packaging.",
          "Check take-back options in shops, offices or with the manufacturer.",
          "If a cartridge is abandoned in the street, a public report can also help.",
        ],
        nextStep: "Look for a dedicated box or a manufacturer take-back route.",
        note: publicSpaceReportNote,
      },
    );
  }

  if (includesAny(text, shoeKeywords)) {
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "emerald",
        badge: "Réemploi / textile",
        title: "Les chaussures se traitent d'abord par le réemploi ou la collecte textile",
        summary: `Si elles sont encore portables, donne-les ou fais-les réparer. Sinon, cherche une collecte textile si ta commune l'accepte; à défaut, la filière dépend du matériau et de l'état (${fallbackBin}).`,
        bullets: [
          "Le réemploi est souvent le meilleur réflexe pour une paire encore correcte.",
          "Certaines collectes textiles acceptent les chaussures attachées par paire et propres.",
          "Si elles sont très abîmées, graisseuses ou séparées de leur matière principale, la filière locale peut varier.",
        ],
        nextStep: "Vérifie d'abord s'il existe une collecte textile ou une solution de réemploi près de chez toi.",
        note: publicSpaceReportNote,
      },
      {
        kind: "specific",
        tone: "emerald",
        badge: "Reuse / textile",
        title: "Shoes should first go to reuse or a textile collection stream",
        summary: `If they are still wearable, donate or repair them. Otherwise, look for a textile collection if your city accepts it; beyond that, the route depends on the material and condition (${fallbackBin}).`,
        bullets: [
          "Reuse is often the best option for a pair that is still in decent shape.",
          "Some textile collections accept shoes tied as a pair and kept clean.",
          "If they are badly worn, greasy or mixed with multiple materials, the local route can vary.",
        ],
        nextStep: "First check whether there is a textile collection or a reuse option near you.",
        note: publicSpaceReportNote,
      },
    );
  }

  if (includesAny(text, dedicatedCollectionKeywords)) {
    const reportNote = publicSpaceReportNote;
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "amber",
        badge: "Collecte dédiée",
        title: "Oui, il faut souvent une collecte spécifique pour cet objet",
        summary: `Cherche une borne, une reprise en magasin, une pharmacie, une association ou une déchèterie selon la filière exacte (${fallbackBin}).`,
        bullets: [
          "Les textiles et autres objets à filière dédiée ne suivent pas forcément le tri des emballages.",
          "Si l'objet a une petite taille mais une matière spéciale, il n'est pas forcément un déchet classique.",
          "Donne-moi l'objet exact si tu veux que je te dise la bonne filière.",
        ],
        nextStep: "Identifie l'objet précis pour trouver le bon point de collecte.",
        note: reportNote,
      },
      {
        kind: "specific",
        tone: "amber",
        badge: "Dedicated stream",
        title: "This often needs a dedicated collection stream",
        summary: `Look for a drop-off box, shop take-back, pharmacy, association or recycling center depending on the exact stream (${fallbackBin}).`,
        bullets: [
          "Textiles and other dedicated-stream items do not necessarily belong with packaging.",
          "A small item with a special material is not necessarily regular waste.",
          "Tell me the exact item and I can point you to the right stream.",
        ],
        nextStep: "Identify the exact item to find the correct drop-off point.",
        note: reportNote,
      },
    );
  }

  if (includesAny(text, decheterieKeywords)) {
    const reportNote = wantsReport
      ? locale === "fr"
        ? "Si l'objet est abandonné dans la rue ou sur un trottoir, le signalement public reste pertinent en plus de la filière déchèterie."
        : "If the item is abandoned in the street or on a sidewalk, a public-space report can still be relevant alongside the recycling-center route."
      : undefined;
    return locale === "fr"
      ? {
          kind: "decheterie",
          tone: "rose",
          badge: "Déchèterie",
          title: "Oui, la déchèterie est le bon circuit",
          summary: `C'est la bonne filière pour les encombrants, les déchets dangereux et les objets trop gros pour les bacs (${fallbackBin}).`,
          bullets: [
            "Les gravats, peintures, solvants, huiles et aérosols suivent la consigne de la collectivité.",
            "Vérifie les horaires et les conditions d'accès avant de te déplacer.",
            "Si l'objet correspond à une catégorie Waste sensible, suis sa projection canonique.",
          ],
          nextStep: "Prépare le dépôt et vérifie les horaires / conditions d'accès de la déchèterie.",
          note: reportNote,
        }
      : {
          kind: "decheterie",
          tone: "rose",
          badge: "Recycling center",
          title: "Yes, the recycling center is the right route",
          summary: `It is the correct stream for bulky items, hazardous waste and items too large for regular bins (${fallbackBin}).`,
          bullets: [
            "Rubble, paint, solvents, oils and aerosols follow local-authority guidance.",
            "Check opening hours and access conditions before travelling.",
            "If the item matches a sensitive Waste category, follow its canonical projection.",
          ],
          nextStep: "Check the drop-off conditions and opening hours before you go.",
          note: reportNote,
        };
  }

  if (includesAny(text, packagingKeywords)) {
    const reportNote = wantsReport
      ? locale === "fr"
        ? "Si c'est un emballage ou un carton abandonné dans la rue, tu peux aussi le signaler comme nuisance publique."
        : "If it is packaging or cardboard abandoned in the street, you can also report it as a public nuisance."
      : undefined;
    return locale === "fr"
      ? {
          kind: "packaging",
          tone: "emerald",
          badge: "Tri emballages",
          title: "Si c'est propre et vide, ça part au tri des emballages",
          summary: `Bouteille plastique, canette ou carton propre: va vers le bac emballages/papiers de ta commune (${fallbackBin}).`,
          bullets: [
            "Aplatis le carton et vide l'objet avant de le jeter.",
            "Pour un emballage en carton, retire les restes alimentaires : une trace de graisse seule ne l'exclut pas du tri.",
            "Un carton de boîte à chaussures propre se trie comme un emballage carton.",
          ],
          nextStep: "Vide, aplatis et sépare les éléments différents avant de trier.",
          note: reportNote,
        }
      : {
          kind: "packaging",
          tone: "emerald",
          badge: "Packaging sorting",
          title: "If it is clean and empty, it goes with packaging",
          summary: `Plastic bottles, cans and clean cardboard usually go to the packaging/paper stream of your city (${fallbackBin}).`,
          bullets: [
            "Flatten cardboard and empty the item first.",
            "For cardboard packaging, remove food leftovers first: a grease mark alone does not exclude it from recycling.",
            "A clean cardboard shoe box is sorted as cardboard packaging.",
          ],
          nextStep: "Empty, flatten and separate the different materials before sorting.",
          note: reportNote,
        };
  }

  if (wantsReport && publicSpace) {
    return localizedAnswer(
      locale,
      {
        kind: "report",
        tone: "amber",
        badge: "Signalement public",
        title: "Oui, si c'est visible dans l'espace public, un signalement peut être pertinent",
        summary: "Dépôt sauvage, encombrant, corbeille qui déborde ou pollution visible: ce sont de bons cas de déclaration.",
        bullets: [
          "Décris l'objet et précise l'endroit exact.",
          "Ajoute une photo si l'application le permet.",
          "Si le problème est privé ou déjà pris en charge, ce n'est pas le bon circuit.",
        ],
        nextStep: "Déclare uniquement ce qui gêne dans la rue, sur un trottoir ou dans un espace public.",
      },
      {
        kind: "report",
        tone: "amber",
        badge: "Public report",
        title: "Yes, if it is visible in public space, reporting it can make sense",
        summary: "Fly-tipping, bulky waste, overflowing bins or visible pollution are good reporting cases.",
        bullets: [
          "Describe the item and give the exact location.",
          "Add a photo if the app supports it.",
          "If the issue is private or already handled, it is not the right channel.",
        ],
        nextStep: "Report only what is affecting the street, sidewalk or another public area.",
      },
    );
  }

  if (wantsReport) {
    return localizedAnswer(
      locale,
      {
        kind: "report",
        tone: "amber",
        badge: "Signalement public",
        title: "Oui, mais seulement si le problème est dans l'espace public",
        summary: "DansMaRue est pertinent pour les nuisances visibles sur la voie publique, pas pour un déchet déjà dans une filière de tri.",
        bullets: [
          "Dépôt sauvage, encombrant, poubelle publique débordante: oui.",
          "Déchet privé, objet chez toi ou déjà déposé dans une borne: non.",
          "En cas de doute, décris le lieu et le type de nuisance.",
        ],
        nextStep: "Précise si l'objet est sur la rue, dans un parc, sur un trottoir ou dans un lieu privé.",
      },
      {
        kind: "report",
        tone: "amber",
        badge: "Public report",
        title: "Yes, but only if the issue is in public space",
        summary: "DansMaRue is relevant for visible nuisances in public areas, not for waste already in a sorting stream.",
        bullets: [
          "Fly-tipping, bulky waste, overflowing public bin: yes.",
          "Private waste, an item at home or already deposited in a collection point: no.",
          "If in doubt, describe the place and the nuisance type.",
        ],
        nextStep: "Specify whether the item is on the street, in a park, on a sidewalk or in a private area.",
      },
    );
  }

  return createDefaultAnswer(locale);
}

// Tone presentation is owned by the current UI surface, not this answer model.
