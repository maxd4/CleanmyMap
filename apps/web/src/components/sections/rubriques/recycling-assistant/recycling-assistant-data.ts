import { Answer, Locale, Tone } from "./recycling-assistant.types";

export type LocalizedContent = {
  fr: Partial<Answer>;
  en: Partial<Answer>;
};

export const RECYCLING_DATA: Record<string, LocalizedContent> = {
  megot: {
    fr: {
      kind: "specific",
      tone: "slate",
      badge: "Déchet résiduel",
      title: "Un mégot ne se recycle pas avec les emballages",
      summary: "Le bon réflexe est de le garder à part, au sec, puis de le jeter en résiduel ou dans un cendrier de collecte si ta ville en propose.",
      bullets: [
        "Ne le jette pas avec le papier, le plastique ou le verre.",
        "Utilise un cendrier, un collecteur à mégots ou un petit contenant fermé.",
        "S'il est dans la rue, ramasse-le seulement si c'est sûr et proprement possible.",
      ],
      nextStep: "Cherche un cendrier de collecte ou garde-le avec les déchets non recyclables.",
    },
    en: {
      kind: "specific",
      tone: "slate",
      badge: "Residual waste",
      title: "A cigarette butt is not recyclable with packaging",
      summary: "Keep it separate and dry, then place it in residual waste or a butt collection container if your city provides one.",
      bullets: [
        "Do not mix it with paper, plastic or glass.",
        "Use an ashtray, a butt collector or a small closed container.",
        "If it is in the street, only pick it up if it is safe to do so.",
      ],
      nextStep: "Look for a butt collector or keep it with the non-recyclable waste.",
    }
  },
  food_waste: {
    fr: {
      kind: "specific",
      tone: "emerald",
      badge: "Compost / biodéchets",
      title: "Les déchets alimentaires vont au compost ou à la collecte biodéchets",
      summary: "Si ta commune a une collecte dédiée, utilise-la. Sinon, compost domestique, compost partagé ou association de quartier sont les bons réflexes.",
      bullets: [
        "Épluchures, restes, marc de café et autres biodéchets vont au compost.",
        "Si tu as un bac partagé ou un composteur collectif, alimente-le avec des déchets acceptés.",
        "Si le déchet est mélangé à des emballages sales, sépare ce qui peut encore être composté.",
      ],
      nextStep: "Vérifie la règle locale: collecte biodéchets, composteur collectif ou compost à domicile.",
    },
    en: {
      kind: "specific",
      tone: "emerald",
      badge: "Compost / bio-waste",
      title: "Food scraps go to compost or a bio-waste collection stream",
      summary: "If your city offers a dedicated collection, use it. Otherwise, home compost, a shared compost point or a local association are the right options.",
      bullets: [
        "Peelings, leftovers, coffee grounds and other bio-waste go to compost.",
        "If you have a shared bin or community composter, feed it only with accepted waste.",
        "If the waste is mixed with dirty packaging, separate what can still be composted.",
      ],
      nextStep: "Check the local rule: bio-waste collection, community composter or home compost.",
    }
  },
  greasy_cardboard: {
    fr: {
      kind: "packaging",
      tone: "amber",
      badge: "Carton sale",
      title: "Un carton gras ou très sale ne va pas au tri papier-carton",
      summary: "S'il est fortement souillé par la graisse ou des restes, il faut le mettre en résiduel. Si une partie est encore propre, tu peux parfois la séparer.",
      bullets: [
        "Le gras et les restes alimentaires dégradent le recyclage du carton.",
        "Découpe si besoin les zones propres pour les garder au tri.",
        "Une boîte à pizza propre peut parfois être triée; si elle est trop grasse, garde-la en résiduel.",
      ],
      nextStep: "Sépare la partie propre si possible, sinon mets le carton sale avec les déchets non recyclables.",
    },
    en: {
      kind: "packaging",
      tone: "amber",
      badge: "Dirty cardboard",
      title: "Greasy or heavily soiled cardboard does not belong in paper recycling",
      summary: "If it is heavily contaminated with grease or leftovers, put it in residual waste. If a clean part remains, separate it when possible.",
      bullets: [
        "Grease and food residue reduce cardboard recyclability.",
        "Cut off clean sections if you can keep them in the recycling stream.",
        "A clean pizza box may be accepted; if it is too greasy, keep it in residual waste.",
      ],
      nextStep: "Separate the clean part if possible, otherwise put the dirty cardboard with non-recyclable waste.",
    }
  },
  ampoule: {
    fr: {
      kind: "specific",
      tone: "amber",
      badge: "Point de collecte",
      title: "Ampoules et néons vont dans une collecte dédiée",
      summary: "Ne les mets pas dans le verre ni dans la poubelle classique. Dépose-les en point de collecte DEEE, en magasin ou en déchèterie selon ce que propose ta commune.",
      bullets: [
        "Ampoules, néons, tubes fluorescents et certaines lampes suivent une filière spéciale.",
        "Ne casse pas l'objet pour le jeter avec le verre.",
        "Un magasin ou une déchèterie peut proposer une reprise dédiée.",
      ],
      nextStep: "Cherche un point DEEE ou une reprise en magasin avant de jeter l'objet.",
    },
    en: {
      kind: "specific",
      tone: "amber",
      badge: "Dedicated drop-off",
      title: "Light bulbs and neon tubes go to a dedicated collection point",
      summary: "Do not put them in glass recycling or regular trash. Drop them at a WEEE point, in a shop or at the recycling center depending on what your city offers.",
      bullets: [
        "Bulbs, neon tubes, fluorescent tubes and some lamps follow a special stream.",
        "Do not break the item just to throw it in the glass container.",
        "A shop or recycling center may offer dedicated take-back.",
      ],
      nextStep: "Look for a WEEE point or a shop take-back option before disposal.",
    }
  }
};
