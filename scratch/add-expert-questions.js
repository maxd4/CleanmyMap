const fs = require('fs');
const path = 'apps/web/src/components/learn/environmental-quiz.tsx';

let content = fs.readFileSync(path, 'utf8');

const newQuestions = `
  // === BATCH E — expertise-et-debats ===
  {
    id: "ec1",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Une commune dépense beaucoup pour ramasser les emballages abandonnés dans la rue. Qui paie théoriquement pour la fin de vie de ces produits ?",
    answer: "Les producteurs via l'éco-contribution (Responsabilité Élargie du Producteur - REP)",
    options: [
      "Les producteurs via l'éco-contribution (Responsabilité Élargie du Producteur - REP)",
      "Uniquement les contribuables locaux via la taxe d'enlèvement des ordures",
      "Les supermarchés qui les distribuent",
      "L'État central via l'impôt sur le revenu"
    ],
    explanation: "Le principe de Responsabilité Élargie du Producteur (REP) oblige les fabricants à financer la fin de vie de leurs produits. Comprendre cela permet d'orienter le plaidoyer vers la source plutôt que de se limiter au nettoyage bénévole.",
    reasoningType: "conséquences indirectes",
    format: "mini-enquetes"
  },
  {
    id: "ec2",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Selon la hiérarchie européenne de traitement des déchets, quelle est l'action prioritaire absolue ?",
    answer: "La prévention et la réduction à la source",
    options: [
      "La prévention et la réduction à la source",
      "Le réemploi et la réparation",
      "Le recyclage matière",
      "La valorisation énergétique (incinération)"
    ],
    explanation: "Le meilleur déchet est celui qu'on ne produit pas. Le recyclage n'arrive qu'en 3ème position après la prévention et le réemploi. C'est un argument clé pour s'opposer au 'tout-recyclable' comme solution miracle.",
    reasoningType: "comparaison",
    format: "classements"
  },
  {
    id: "rc1",
    type: "true-false",
    category: "tri-recyclage",
    question: "Un gobelet portant la mention 'Plastique biosourcé et compostable' (PLA) peut être jeté sans problème dans un composteur de quartier.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "La majorité du PLA nécessite un compostage industriel (plus de 60°C pendant des semaines). Dans un composteur domestique, il ne se dégrade pas, et dans le bac de tri jaune, il perturbe le recyclage du PET classique.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites"
  },
  {
    id: "rc2",
    type: "true-false",
    category: "tri-recyclage",
    question: "Le recyclage du plastique fonctionne sur un cycle infini, au même titre que le verre ou le métal.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "Contrairement au verre ou à l'aluminium, le plastique subit un 'décyclage' (downcycling). Ses chaînes de polymères se cassent à chaque fonte. Il finit souvent par être incinéré ou enfoui après 1 ou 2 cycles.",
    reasoningType: "idée reçue",
    format: "vrai-faux-piegeux"
  },
  {
    id: "hb1",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Pendant un tri, un bénévole hésite sur un emballage complexe et dit : 'Je le mets au recyclage au cas où, ils feront le tri là-bas'. Comment s'appelle ce biais très dommageable ?",
    answer: "Le tri optimiste (wishcycling)",
    options: [
      "Le tri optimiste (wishcycling)",
      "Le syndrome du sauveur environnemental",
      "L'effet rebond",
      "Le paradoxe de Jevons"
    ],
    explanation: "Le 'wishcycling' augmente les coûts de traitement, abîme les machines et risque de faire refuser toute la balle de recyclage. Le bon réflexe en cas de doute persistant reste le bac résiduel.",
    reasoningType: "questions contre-intuitives",
    format: "situations-terrain"
  },
  {
    id: "hb2",
    type: "true-false",
    category: "impact-methodologie",
    question: "Remplacer systématiquement un sac plastique à usage unique par un tote bag en coton est toujours une victoire écologique nette.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "À cause de l'impact colossal de la culture du coton (eau, pesticides), un tote bag doit être utilisé des centaines, voire des milliers de fois pour amortir son bilan écologique par rapport au plastique. C'est un exemple de transfert d'impact.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites"
  },
  {
    id: "reg1",
    type: "multiple-choice",
    category: "impact-methodologie",
    question: "Quel est l'avantage principal d'un système de consigne pour réemploi par rapport au tri sélectif classique ?",
    answer: "Il garantit une boucle fermée très propre et évite l'extraction de nouvelle matière",
    options: [
      "Il garantit une boucle fermée très propre et évite l'extraction de nouvelle matière",
      "Il permet aux communes de gagner plus d'argent sur la revente des matériaux",
      "Il nécessite beaucoup moins de camions sur les routes",
      "Il autorise les consommateurs à jeter les bouteilles n'importe où"
    ],
    explanation: "La consigne (notamment du verre) évite de refondre la matière à 1500°C. Elle nécessite juste un lavage, économisant jusqu'à 75% d'énergie par rapport au recyclage classique, tout en évitant la contamination.",
    reasoningType: "comparaison",
    format: "questions-contre-intuitives"
  },
  {
    id: "co1",
    type: "true-false",
    category: "action-terrain",
    question: "Dans un composteur partagé, la présence de nombreux moucherons et une forte odeur d'ammoniaque prouvent que la décomposition est optimale.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "C'est le signe d'un déséquilibre : excès d'humidité et d'azote (trop de restes alimentaires, manque d'air). Il faut rééquilibrer en ajoutant de la matière sèche carbonée (feuilles, broyat, carton) et aérer.",
    reasoningType: "terrain",
    format: "vrai-faux-piegeux"
  },
  {
    id: "bd1",
    type: "true-false",
    category: "climat-biodiversite",
    question: "La pollution plastique dans les sols agricoles est moins préoccupante que dans l'océan car les déchets n'y bougent pas.",
    answer: "Faux",
    options: ["Vrai", "Faux"],
    explanation: "Les microplastiques (issus de bâches, boues d'épuration) modifient la porosité du sol, impactent la faune du sol (vers de terre) et peuvent être absorbés par les cultures, entrant ainsi directement dans la chaîne alimentaire humaine.",
    reasoningType: "idée reçue",
    format: "mythes-et-realites"
  },
  {
    id: "id1",
    type: "multiple-choice",
    category: "action-terrain",
    question: "Sur le terrain, comment différencier rapidement un plastique souple (films) d'un plastique rigide pour bien orienter le tri ?",
    answer: "Le test de la poignée : si on le froisse dans le poing et qu'il reprend sa forme, il est rigide",
    options: [
      "Le test de la poignée : si on le froisse dans le poing et qu'il reprend sa forme, il est rigide",
      "Le test de l'eau : le rigide coule toujours, le souple flotte",
      "La couleur : les plastiques souples sont toujours transparents ou blancs",
      "Le bruit : un plastique rigide ne fait jamais de bruit quand on le plie"
    ],
    explanation: "Le 'test de la poignée de main' est une astuce de terrain. Si le plastique garde la forme de boule, c'est un film (souple). S'il se déplie tout seul (comme un pot de yaourt ou une barquette), il compte comme rigide.",
    reasoningType: "terrain",
    format: "situations-terrain"
  }
`;

// Insert before the last `];` of QUIZ_QUESTIONS
const lastBracketIndex = content.lastIndexOf('];');
if (lastBracketIndex !== -1) {
  content = content.slice(0, lastBracketIndex) + newQuestions + '\n' + content.slice(lastBracketIndex);
  fs.writeFileSync(path, content);
  console.log('Nouveaux quiz injectés avec succès !');
} else {
  console.log('Erreur : impossible de trouver la fin du tableau QUIZ_QUESTIONS.');
}
