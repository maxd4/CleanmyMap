export type AcademieClimatWorkshopCategoryId =
  | "social"
  | "humanitaire"
  | "environnemental";

export type AcademieClimatWorkshop = {
  id: string;
  categoryId: AcademieClimatWorkshopCategoryId;
  title: string;
  summary: string;
  eventDate: string;
  timeLabel: string;
  locationLabel: string;
  sourceUrl: string;
  sourceUpdatedAt: string;
};

export type AcademieClimatWorkshopCategory = {
  id: AcademieClimatWorkshopCategoryId;
  label: { fr: string; en: string };
  tone: "rose" | "amber" | "emerald";
};

export type VisibleAcademieClimatWorkshopCategory = AcademieClimatWorkshopCategory & {
  workshops: AcademieClimatWorkshop[];
};

const WORKSHOP_CATEGORIES: AcademieClimatWorkshopCategory[] = [
  {
    id: "social",
    label: { fr: "Social", en: "Social" },
    tone: "rose",
  },
  {
    id: "humanitaire",
    label: { fr: "Humanitaire", en: "Humanitarian" },
    tone: "amber",
  },
  {
    id: "environnemental",
    label: { fr: "Environnemental", en: "Environmental" },
    tone: "emerald",
  },
];

export const ACADEMIE_CLIMAT_WORKSHOPS: AcademieClimatWorkshop[] = [
  {
    id: "prix-education-climat-2026",
    categoryId: "social",
    title: "Prix de l'Éducation pour le Climat 2026",
    summary:
      "Rencontre pour valoriser des projets pédagogiques et fédérer une communauté d’enseignant·es engagé·es.",
    eventDate: "2026-05-12",
    timeLabel: "13h - 17h30",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/prix-de-leducation-pour-le-climat-2026/",
    sourceUpdatedAt: "2026-03-24",
  },
  {
    id: "resilience-territoires-2026-05-12",
    categoryId: "social",
    title: "Résilience des Territoires",
    summary:
      "Atelier immersif pour se projeter dans la résilience d’une commune et relier décisions sociales, techniques et environnementales.",
    eventDate: "2026-05-12",
    timeLabel: "18h - 20h30",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/resilience-des-territoires-7/",
    sourceUpdatedAt: "2026-03-17",
  },
  {
    id: "inventons-nos-vies-bas-carbone-jeune",
    categoryId: "social",
    title: "Formation animation Inventons nos vies bas carbone jeune",
    summary:
      "Formation d’animation pour les jeunes publics afin de transmettre les ordres de grandeur de la transition.",
    eventDate: "2026-05-23",
    timeLabel: "13h30 - 18h",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/formation-animation-inventons-nos-vies-bas-carbone-jeune-24/",
    sourceUpdatedAt: "2026-01-30",
  },
  {
    id: "fresque-biodiversite-2026-05-13",
    categoryId: "environnemental",
    title: "Fresque de la Biodiversité",
    summary:
      "Atelier collaboratif pour comprendre les écosystèmes, les menaces sur le vivant et les leviers d’action.",
    eventDate: "2026-05-13",
    timeLabel: "14h30 - 17h30",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/fresque-de-la-biodiversite-42/",
    sourceUpdatedAt: "2026-03-04",
  },
  {
    id: "fresque-foret-2026-05-13",
    categoryId: "environnemental",
    title: "Fresque de la Forêt",
    summary:
      "Atelier ludique pour comprendre les enjeux de déforestation et identifier des gestes concrets.",
    eventDate: "2026-05-13",
    timeLabel: "18h - 21h",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/fresque-de-la-foret-36/",
    sourceUpdatedAt: "2026-03-05",
  },
  {
    id: "fresque-desertification-2026-05-29",
    categoryId: "environnemental",
    title: "Fresque de la Désertification",
    summary:
      "Atelier collaboratif pour comprendre la dégradation des terres et explorer des solutions de régénération.",
    eventDate: "2026-05-29",
    timeLabel: "14h30 - 17h30",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/fresque-de-la-desertification-9/",
    sourceUpdatedAt: "2026-03-12",
  },
  {
    id: "notre-tour-2026-06-02",
    categoryId: "social",
    title: "Prendre en main notre histoire avec l'Expérience « Notre Tour »",
    summary:
      "Atelier pour ressentir l’urgence climatique à travers l’histoire, la science et la manipulation concrète de scénarios.",
    eventDate: "2026-06-02",
    timeLabel: "18h30 - 20h30",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/prendre-en-main-notre-histoire-avec-lexperience-notre-tour-2/",
    sourceUpdatedAt: "2026-03-12",
  },
  {
    id: "resilience-territoires-2026-06-11",
    categoryId: "social",
    title: "Résilience des Territoires",
    summary:
      "Version interactive pour se mettre dans la peau d’une collectivité et anticiper les chocs à venir.",
    eventDate: "2026-06-11",
    timeLabel: "14h30 - 17h",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl: "https://www.academieduclimat.paris/evenements/resilience-des-territoires-4/",
    sourceUpdatedAt: "2026-03-12",
  },
  {
    id: "inventons-nos-chouettes-vies-bas-carbone-2026-04-25",
    categoryId: "social",
    title: "Inventons nos CHOUETTES vies bas carbone – dès 9 ans !",
    summary:
      "Atelier familles et jeunes pour imaginer des vies bas carbone désirables, avec cartes, ficelles et scénarios concrets.",
    eventDate: "2026-04-25",
    timeLabel: "14h30 - 16h30",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl:
      "https://www.academieduclimat.paris/evenements/inventons-nos-chouettes-vies-bas-carbone-des-9-ans-29/",
    sourceUpdatedAt: "2026-01-30",
  },
  {
    id: "atelier-2tonnes-2026-06-28",
    categoryId: "social",
    title: "Atelier 2tonnes : comment agir pour le climat ?",
    summary:
      "Atelier collectif pour comparer actions individuelles et collectives et construire un scénario de transition vers +1,5°C.",
    eventDate: "2026-06-28",
    timeLabel: "14h - 17h",
    locationLabel: "Académie du Climat, Paris 4e",
    sourceUrl:
      "https://www.academieduclimat.paris/evenements/atelier-2tonnes-comment-agir-pour-le-climat-54/",
    sourceUpdatedAt: "2025-05-26",
  },
];

function parseIsoDate(value: string): number {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
}

export function getVisibleAcademieClimatWorkshops(
  referenceDate: Date = new Date(),
): VisibleAcademieClimatWorkshopCategory[] {
  const referenceTs = referenceDate.getTime();
  return WORKSHOP_CATEGORIES.map((category) => ({
    ...category,
    workshops: ACADEMIE_CLIMAT_WORKSHOPS.filter(
      (workshop) =>
        workshop.categoryId === category.id &&
        parseIsoDate(workshop.eventDate) >= referenceTs,
    ).sort((a, b) => {
      const dateDiff = parseIsoDate(a.eventDate) - parseIsoDate(b.eventDate);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return a.title.localeCompare(b.title, "fr");
    }),
  })).filter((category) => category.workshops.length > 0);
}

export function getTotalUpcomingAcademieClimatWorkshops(
  referenceDate: Date = new Date(),
): number {
  return getVisibleAcademieClimatWorkshops(referenceDate).reduce(
    (total, category) => total + category.workshops.length,
    0,
  );
}
