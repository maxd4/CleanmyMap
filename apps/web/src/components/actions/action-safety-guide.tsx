import { useId } from "react";
import { CmmDisclosure } from "@/components/ui/cmm-disclosure";
import { buildWasteFieldGuidance } from "@/lib/waste";
import type { WasteCategorySlug } from "@/lib/waste";

type SafetyGuideLocale = "fr" | "en";
type GuideSection = { title: string; items: string[] };

const ESSENTIAL_RULES: Record<SafetyGuideLocale, string[]> = {
  fr: [
    "Ne ramasser que les déchets identifiés et sûrs, avec une protection adaptée.",
    "Ne pas toucher aux objets dangereux, aux déchets inconnus ni aux récipients fermés.",
    "Rester avec le groupe, suivre l’encadrant et ne jamais aller sur la chaussée.",
    "En cas de danger : s’éloigner, prévenir l’organisateur et appeler les secours si nécessaire.",
  ],
  en: [
    "Pick up only waste that is identified and safe, using suitable protection.",
    "Do not touch hazardous or unknown waste, or closed containers.",
    "Stay with the group, follow its leader and never enter the roadway.",
    "If there is danger, move away, tell the organizer and contact emergency services if needed.",
  ],
};

function buildActionSafetyGuideSections(
  categories: readonly WasteCategorySlug[] | null | undefined,
  locale: SafetyGuideLocale,
  schoolContextConfirmed: boolean,
): GuideSection[] {
  const guidance = buildWasteFieldGuidance(categories);
  const labels = (values: readonly { fr: string; en: string }[]) => values.map((value) => value[locale]);
  const collectable = guidance.definitions.filter((category) =>
    category.pickupPolicy === "basic_ppe_ok" || category.pickupPolicy === "basic_ppe_with_care",
  );
  const trainedOrNoPickup = guidance.definitions.filter((category) =>
    category.pickupPolicy === "trained_only" || category.pickupPolicy === "no_pickup",
  );
  const general = locale === "fr";

  return [
    {
      title: general ? "Déchets ramassables" : "Waste that may be collected",
      items: [
        ...(collectable.length > 0
          ? collectable.map((category) => `${category.labels[locale]} : ${category.examples.map((item) => item[locale]).join(", ")}.`)
          : [general ? "Aucune catégorie sûre n’est déclarée pour cette action." : "No safe waste category is declared for this action."]),
        ...(guidance.definitions.length === 0
          ? [general ? "Ne ramasser que les déchets clairement identifiés, sans danger apparent et dans le cadre des consignes locales." : "Collect only clearly identified waste with no apparent danger, following local instructions."]
          : []),
      ],
    },
    {
      title: general ? "Déchets à ne pas toucher" : "Waste not to touch",
      items: [
        ...(trainedOrNoPickup.flatMap((category) => [
          `${category.labels[locale]} : ${category.pickupPolicy === "no_pickup" ? (general ? "ne pas ramasser." : "do not collect.") : (general ? "réservé aux personnes formées et équipées selon la consigne adaptée." : "for trained people with suitable equipment and instructions only.")}`,
        ])),
        ...labels(guidance.definitions.flatMap((category) => category.prohibitions)),
        ...labels(guidance.definitions
          .filter((category) => category.pickupPolicy === "no_pickup" || category.hazardLevel === "high" || category.hazardLevel === "critical")
          .flatMap((category) => category.fieldInstructions)),
        ...(general
          ? ["Ne pas toucher aux seringues, aiguilles, objets coupants, piles ou batteries abîmées, médicaments, produits chimiques inconnus, bonbonnes et récipients sous pression.", "Ne pas ouvrir les sacs, bidons ou contenants trouvés."]
          : ["Do not touch syringes, needles, sharp objects, damaged batteries, medicines, unknown chemicals, gas cylinders or pressurized containers.", "Do not open found bags, cans or containers."]),
        ...(guidance.definitions.length === 0
          ? [general ? "Un objet inconnu ou suspect reste sur place : ne pas improviser de manipulation." : "Leave unknown or suspicious items in place; do not improvise handling."]
          : []),
      ],
    },
    {
      title: general ? "Équipements" : "Equipment",
      items: [
        ...(general
          ? ["Porter des gants adaptés et des chaussures fermées ; utiliser une pince plutôt que les mains.", "Utiliser un gilet haute visibilité près d’une zone de circulation, sans entrer sur la chaussée."]
          : ["Wear suitable gloves and closed shoes; use a litter picker instead of your hands.", "Wear high-visibility clothing near traffic, without entering the roadway."]),
        ...labels(guidance.definitions.flatMap((category) => category.ppe)),
      ],
    },
    {
      title: general ? "Sécurité du groupe" : "Group safety",
      items: [
        general
          ? "Rester avec son groupe et respecter le périmètre, le parcours et les consignes de l’organisateur."
          : "Stay with the group and follow its boundaries, route and organizer instructions.",
        ...(schoolContextConfirmed
          ? [general
            ? "Pour un contexte scolaire confirmé, convenir avec l’établissement des adultes référents, des comptages utiles et des consignes adaptées au groupe. Ce sont des recommandations de préparation, pas des obligations légales universelles ; les règles dépendent de l’établissement et du contexte local."
            : "For a confirmed school context, agree with the school on adult leads, useful headcounts and instructions suited to the group. These are planning recommendations, not universal legal requirements; applicable rules depend on the school and local context."]
          : []),
      ],
    },
    {
      title: general ? "Signalement" : "Reporting a hazard",
      items: general
        ? ["En cas de danger, ne rien toucher, s’éloigner et prévenir l’organisateur.", "L’organisateur peut baliser à distance et contacter le service local ou habilité ; en cas d’urgence, appeler le numéro d’urgence local (112 en France et dans l’Union européenne)."]
        : ["If you see a hazard, do not touch it: move away and tell the organizer.", "The organizer can mark the area from a safe distance and contact the appropriate local service; in an emergency, call the local emergency number (112 in France and the European Union)."],
    },
    {
      title: general ? "Tri et fin de collecte" : "Sorting and finishing",
      items: general
        ? ["Trier uniquement si les déchets sont sûrs à manipuler et selon les consignes de la collectivité ou de la filière locale.", "Garder séparés les déchets à risque signalés ; ne jamais les mettre dans un sac ordinaire.", "Se laver les mains après la collecte et avant de boire ou manger."]
        : ["Sort waste only when safe to handle and follow local authority or collection-channel instructions.", "Keep reported hazardous waste separate; never put it in an ordinary bag.", "Wash your hands after collecting and before eating or drinking."],
    },
  ];
}

export function buildActionSafetyGuideText(
  categories: readonly WasteCategorySlug[] | null | undefined,
  options: { schoolContextConfirmed?: boolean } = {},
): string {
  const sections = buildActionSafetyGuideSections(categories, "fr", options.schoolContextConfirmed === true);
  return [
    "Règles essentielles",
    ...ESSENTIAL_RULES.fr.map((rule) => `- ${rule}`),
    ...sections.flatMap((section) => [section.title, ...section.items.map((item) => `- ${item}`)]),
    "Les consignes de l’organisateur et les règles locales restent prioritaires.",
  ].join("\n");
}

export function ActionSafetyGuide({
  categories,
  locale = "fr",
  defaultOpen = false,
  schoolContextConfirmed = false,
  headingLevel = 3,
}: {
  categories?: readonly WasteCategorySlug[] | null;
  locale?: SafetyGuideLocale;
  defaultOpen?: boolean;
  schoolContextConfirmed?: boolean;
  headingLevel?: 3 | 4;
}) {
  const fr = locale === "fr";
  const titleId = useId();
  const sections = buildActionSafetyGuideSections(categories, locale, schoolContextConfirmed);
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const GuideSectionHeading = headingLevel === 4 ? "h5" : "h4";
  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
      <Heading id={titleId} className="text-base font-black text-sky-950">
        {fr ? "Guide de sécurité et de collecte" : "Safety and collection guide"}
      </Heading>
      <p className="mt-1 text-sm leading-6 text-sky-950">
        {fr ? "Les consignes de l’organisateur et les règles locales restent prioritaires." : "Organizer instructions and local rules take priority."}
      </p>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-sky-950 sm:grid-cols-2">
        {ESSENTIAL_RULES[locale].map((rule) => <li key={rule} className="rounded-xl border border-sky-100 bg-white/90 px-3 py-2">{rule}</li>)}
      </ul>
      <CmmDisclosure
        summary={fr ? "Consulter le guide complet" : "Read the full guide"}
        tone="sky"
        size="sm"
        className="mt-3"
        defaultOpen={defaultOpen}
      >
        <div className="space-y-4">
          {sections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <GuideSectionHeading className="font-bold text-sky-950">{section.title}</GuideSectionHeading>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-800">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          ))}
        </div>
      </CmmDisclosure>
    </section>
  );
}
