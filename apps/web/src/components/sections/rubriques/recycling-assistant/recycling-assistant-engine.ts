import { Answer, Locale, Tone } from "./recycling-assistant.types";
import {
  includesAny,
  localizedAnswer,
  normalizeText,
  batteryKeywords,
  ampouleKeywords,
  cartridgeKeywords,
  shoeKeywords,
  megotKeywords,
  greasyCardboardKeywords,
  foodWasteKeywords,
  dedicatedCollectionKeywords,
  decheterieKeywords,
  glassKeywords,
  packagingKeywords,
  reportKeywords,
  publicSpaceKeywords,
} from "./recycling-assistant.utils";

export function createDefaultAnswer(locale: Locale): Answer {
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

export function buildAnswer(question: string, locale: Locale): Answer {
  const text = normalizeText(question);

  if (!text) {
    return createDefaultAnswer(locale);
  }

  const wantsReport = includesAny(text, reportKeywords);
  const publicSpace = includesAny(text, publicSpaceKeywords);

  const publicSpaceReportNote = wantsReport && publicSpace
    ? locale === "fr"
      ? "Si cet objet est abandonné dans l'espace public, un signalement sur DansMaRue peut compléter le tri."
      : "If this item is abandoned in public space, a DansMaRue-style report can complement the sorting guidance."
    : undefined;
  
  const fallbackBin =
    locale === "fr"
      ? "à défaut: poubelle grise / ordures ménagères"
      : "if impossible: residual waste bin";

  if (includesAny(text, megotKeywords)) {
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "slate",
        badge: "Déchet résiduel",
        title: "Un mégot ne se recycle pas avec les emballages",
        summary: `Le bon réflexe est de le garder à part, au sec, puis de le jeter en résiduel ou dans un cendrier de collecte si ta ville en propose (${fallbackBin}).`,
        bullets: [
          "Ne le jette pas avec le papier, le plastique ou le verre.",
          "Utilise un cendrier, un collecteur à mégots ou un petit contenant fermé.",
          "S'il est dans la rue, ramasse-le seulement si c'est sûr et proprement possible.",
        ],
        nextStep: "Cherche un cendrier de collecte ou garde-le avec les déchets non recyclables.",
        note: publicSpaceReportNote,
      },
      {
        kind: "specific",
        tone: "slate",
        badge: "Residual waste",
        title: "A cigarette butt is not recyclable with packaging",
        summary: `Keep it separate and dry, then place it in residual waste or a butt collection container if your city provides one (${fallbackBin}).`,
        bullets: [
          "Do not mix it with paper, plastic or glass.",
          "Use an ashtray, a butt collector or a small closed container.",
          "If it is in the street, only pick it up if it is safe to do so.",
        ],
        nextStep: "Look for a butt collector or keep it with the non-recyclable waste.",
        note: publicSpaceReportNote,
      },
    );
  }

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

  if (includesAny(text, greasyCardboardKeywords)) {
    return localizedAnswer(
      locale,
      {
        kind: "packaging",
        tone: "amber",
        badge: "Carton sale",
        title: "Un carton gras ou très sale ne va pas au tri papier-carton",
        summary: `S'il est fortement souillé par la graisse ou des restes, il faut le mettre en résiduel. Si une partie est encore propre, tu peux parfois la séparer (${fallbackBin}).`,
        bullets: [
          "Le gras et les restes alimentaires dégradent le recyclage du carton.",
          "Découpe si besoin les zones propres pour les garder au tri.",
          "Une boîte à pizza propre peut parfois être triée; si elle est trop grasse, garde-la en résiduel.",
        ],
        nextStep: "Sépare la partie propre si possible, sinon mets le carton sale avec les déchets non recyclables.",
        note: publicSpaceReportNote,
      },
      {
        kind: "packaging",
        tone: "amber",
        badge: "Dirty cardboard",
        title: "Greasy or heavily soiled cardboard does not belong in paper recycling",
        summary: `If it is heavily contaminated with grease or leftovers, put it in residual waste. If a clean part remains, separate it when possible (${fallbackBin}).`,
        bullets: [
          "Grease and food residue reduce cardboard recyclability.",
          "Cut off clean sections if you can keep them in the recycling stream.",
          "A clean pizza box may be accepted; if it is too greasy, keep it in residual waste.",
        ],
        nextStep: "Separate the clean part if possible, otherwise put the dirty cardboard with non-recyclable waste.",
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
          "Textiles, médicaments, DEEE et piles suivent souvent une filière séparée.",
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
          "Textiles, medicines, WEEE and batteries often follow separate collection routes.",
          "A small item with a special material is not necessarily regular waste.",
          "Tell me the exact item and I can point you to the right stream.",
        ],
        nextStep: "Identify the exact item to find the correct drop-off point.",
        note: reportNote,
      },
    );
  }

  if (includesAny(text, batteryKeywords)) {
    const reportNote = wantsReport
      ? locale === "fr"
        ? "Si la pile ou la batterie est abandonnée dans l'espace public, un signalement sur DansMaRue peut aussi être utile."
        : "If the battery is abandoned in public space, a DansMaRue-style report can also help."
      : undefined;
    return localizedAnswer(
      locale,
      {
        kind: "specific",
        tone: "amber",
        badge: "Point de collecte spécifique",
        title: "Piles et batteries: pas dans la poubelle classique",
        summary: `Dépose-les dans un point de collecte dédié ou en déchèterie. Ne les mets pas dans le bac ordinaire (${fallbackBin}).`,
        bullets: [
          "Les piles et batteries vont dans un circuit séparé.",
          "Cherche un point de collecte en magasin, mairie ou déchèterie.",
          "Garde-les à l'écart des déchets humides ou métalliques libres.",
        ],
        nextStep: "Cherche une borne piles / batteries ou le point de collecte le plus proche.",
        note: reportNote,
      },
      {
        kind: "specific",
        tone: "amber",
        badge: "Dedicated drop-off",
        title: "Batteries and cells: not in the regular bin",
        summary: `Use a dedicated drop-off point or the recycling center. Do not place them in the regular bin (${fallbackBin}).`,
        bullets: [
          "Batteries go through a separate collection stream.",
          "Look for a collection box in a shop, town hall or recycling center.",
          "Keep them away from wet waste or loose metal items.",
        ],
        nextStep: "Look for a batteries drop-off point nearby.",
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
          "Meubles, matelas, gros électroménager et gravats vont souvent à la déchèterie.",
          "Peinture, solvants, huiles et aérosols suivent une filière dédiée.",
          "Si l'objet est électrique mais petit, vérifie d'abord la collecte DEEE.",
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
          "Furniture, mattresses, large appliances and rubble usually go to the recycling center.",
          "Paint, solvents, oils and aerosols follow a dedicated stream.",
          "If the item is electrical but small, check the WEEE collection stream first.",
        ],
        nextStep: "Check the drop-off conditions and opening hours before you go.",
        note: reportNote,
      };
  }

  if (includesAny(text, glassKeywords)) {
    const reportNote = wantsReport
      ? locale === "fr"
        ? "Si un objet en verre est cassé dans l'espace public, un signalement public peut être utile; pour le verre propre, vise le conteneur verre."
        : "If broken glass is in public space, a public report may help; for clean glass, use the glass container."
      : undefined;
    return locale === "fr"
      ? {
        kind: "glass",
        tone: "emerald",
        badge: "Verre",
        title: "Bouteilles et bocaux en verre vont au conteneur verre",
        summary: `Le verre propre se trie à part. Ne mélange pas avec la vaisselle, le miroir ou la céramique (${fallbackBin}).`,
        bullets: [
          "Bouteilles et bocaux en verre: oui.",
          "Vaisselle, cristal, miroir et céramique: non.",
          "Si c'est sale ou dangereux, traite l'objet à part avant de le jeter.",
        ],
        nextStep: "Vide l'objet et dépose-le dans le conteneur verre dédié.",
        note: reportNote,
      }
      : {
        kind: "glass",
        tone: "emerald",
        badge: "Glass",
        title: "Glass bottles and jars go to the glass container",
        summary: `Clean glass is sorted separately. Do not mix it with dishes, mirrors or ceramics (${fallbackBin}).`,
        bullets: [
          "Glass bottles and jars: yes.",
          "Dishes, crystal, mirrors and ceramics: no.",
          "If it is dirty or dangerous, handle it separately before disposal.",
        ],
        nextStep: "Empty it and drop it in the dedicated glass container.",
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
          "Si c'est gras, plein de restes ou humide, ce n'est plus un bon recyclable.",
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
          "If it is greasy, full of leftovers or wet, it is no longer a good recyclable.",
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
