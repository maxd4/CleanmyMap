import type { ContentValidationRecord } from "@/lib/content/content-validation";
import type { QuizSchoolAssessmentLocalizedText } from "./quiz-school-workshop-assessment";
import type { QuizSchoolLevel } from "./quiz-school-types";

export type QuizSchoolRegion = "ile-de-france";

export type QuizSchoolTerritorialResource = {
  id: string;
  name: QuizSchoolAssessmentLocalizedText;
  theme: QuizSchoolAssessmentLocalizedText;
  region: QuizSchoolRegion;
  territory: QuizSchoolAssessmentLocalizedText;
  levels: readonly QuizSchoolLevel[];
  audience: QuizSchoolAssessmentLocalizedText;
  description: QuizSchoolAssessmentLocalizedText;
  officialUrl: string;
  reviewedAt: string;
  validationStatus: "validated" | "needsReview";
  validation: ContentValidationRecord;
};

const ALL_LEVELS: readonly QuizSchoolLevel[] = ["6e", "5e", "4e", "3e"];
const REVIEW_DATE = "2026-09-02";

function validationRecord(
  id: string,
  url: string,
  sourceName: string,
  claimText: QuizSchoolAssessmentLocalizedText,
  recommendationText: QuizSchoolAssessmentLocalizedText,
): ContentValidationRecord {
  return {
    id,
    kind: "institutional",
    status: "published",
    owner: "Équipe contenu CleanMyMap",
    source: {
      name: sourceName,
      url,
      date: REVIEW_DATE,
      datePrecision: "day",
      dateBasis: "document",
    },
    evidenceLevel: "strong",
    lastReviewedAt: REVIEW_DATE,
    reviewedBy: "Équipe contenu CleanMyMap",
    claims: {
      fact: [{ id: `${id}-fact`, type: "fact", text: claimText, interpretationLimit: { fr: "Les informations pratiques et la programmation peuvent évoluer.", en: "Practical information and programming may change." } }],
      estimate: [],
      recommendation: [{ id: `${id}-recommendation`, type: "recommendation", text: recommendationText }],
    },
  };
}

const ACADEMIE_URL = "https://www.academieduclimat.paris/parcours-pedagogiques/";
const MAISON_NATURE_URL = "https://www.paris.fr/lieux/maison-paris-nature-17576";
const APPRENDRE_DEHORS_URL = "https://www.paris.fr/pages/apprendre-et-enseigner-dehors-21682";

export const QUIZ_SCHOOL_TERRITORIAL_RESOURCES: readonly QuizSchoolTerritorialResource[] = [
  {
    id: "academie-du-climat-parcours-scolaires",
    name: { fr: "Académie du Climat", en: "Climate Academy" },
    theme: { fr: "Climat, transitions et action collective", en: "Climate, transitions and collective action" },
    region: "ile-de-france",
    territory: { fr: "Paris 4e", en: "Paris 4th arrondissement" },
    levels: ALL_LEVELS,
    audience: { fr: "Jeunes de 9 à 15 ans ; parcours scolaires", en: "Young people aged 9 to 15; school programmes" },
    description: { fr: "Un prolongement possible pour approfondir les enjeux écologiques par des parcours et ateliers pédagogiques.", en: "A possible extension to explore environmental issues through educational programmes and workshops." },
    officialUrl: ACADEMIE_URL,
    reviewedAt: REVIEW_DATE,
    validationStatus: "validated",
    validation: validationRecord(
      "academie-du-climat-parcours-scolaires",
      ACADEMIE_URL,
      "L’Académie du Climat — parcours pour les scolaires",
      { fr: "Le site officiel décrit des parcours pédagogiques pour les scolaires et indique un public de jeunes de 9 à 15 ans.", en: "The official site describes educational programmes for schools and indicates an audience of young people aged 9 to 15." },
      { fr: "Proposer l’Académie du Climat comme piste à vérifier selon le niveau et la programmation.", en: "Suggest the Climate Academy as a lead to check according to grade and current programme." },
    ),
  },
  {
    id: "maison-paris-nature",
    name: { fr: "Maison Paris Nature", en: "Maison Paris Nature" },
    theme: { fr: "Biodiversité et observation du vivant", en: "Biodiversity and observing living things" },
    region: "ile-de-france",
    territory: { fr: "Parc Floral, Paris 12e", en: "Parc Floral, Paris 12th arrondissement" },
    levels: ALL_LEVELS,
    audience: { fr: "Classes et centres de loisirs ; animations adaptées dès 6 ans", en: "School classes and leisure centres; activities adapted from age 6" },
    description: { fr: "Un lieu de ressources pour observer la biodiversité parisienne et relier la séance à une enquête de terrain.", en: "A resource centre to observe Paris biodiversity and connect the session with a field investigation." },
    officialUrl: MAISON_NATURE_URL,
    reviewedAt: REVIEW_DATE,
    validationStatus: "validated",
    validation: validationRecord(
      "maison-paris-nature",
      MAISON_NATURE_URL,
      "Ville de Paris — Maison Paris Nature",
      { fr: "La Ville de Paris présente la Maison Paris Nature comme un lieu de ressources et indique l’accueil de classes pour des animations adaptées à partir de 6 ans.", en: "The City of Paris presents Maison Paris Nature as a resource centre and indicates that classes are welcomed for activities adapted from age 6." },
      { fr: "Proposer une observation de la biodiversité locale, après vérification des modalités d’accueil.", en: "Suggest observing local biodiversity after checking current visiting arrangements." },
    ),
  },
  {
    id: "apprendre-dehors-square-deux-nethes",
    name: { fr: "Lieux ressources « Apprendre dehors » — square des Deux Nèthes", en: "“Learning outdoors” resource sites — Square des Deux Nèthes" },
    theme: { fr: "Nature en ville et action territoriale", en: "Urban nature and local action" },
    region: "ile-de-france",
    territory: { fr: "Paris 18e", en: "Paris 18th arrondissement" },
    levels: ALL_LEVELS,
    audience: { fr: "Classes parisiennes ; accueil et accompagnement sur inscription selon les modalités publiées", en: "Paris school classes; welcome and support by registration under the published arrangements" },
    description: { fr: "Une piste de sortie pour observer un espace de nature en ville et prolonger le passage du collège au territoire.", en: "A possible outing to observe urban nature and extend the move from school to territory." },
    officialUrl: APPRENDRE_DEHORS_URL,
    reviewedAt: REVIEW_DATE,
    validationStatus: "validated",
    validation: validationRecord(
      "apprendre-dehors-square-deux-nethes",
      APPRENDRE_DEHORS_URL,
      "Ville de Paris — Apprendre et enseigner dehors",
      { fr: "La page officielle décrit des lieux ressources « Apprendre dehors » et cite le square des Deux Nèthes pour l’accueil de classes.", en: "The official page describes “Learning outdoors” resource sites and cites Square des Deux Nèthes for welcoming classes." },
      { fr: "Proposer ce lieu comme piste de sortie, en vérifiant l’autorisation et les créneaux au moment du projet.", en: "Suggest this site as an outing lead, checking permissions and time slots when planning." },
    ),
  },
];

export function getQuizSchoolTerritorialResources(
  region: QuizSchoolRegion = "ile-de-france",
  resources: readonly QuizSchoolTerritorialResource[] = QUIZ_SCHOOL_TERRITORIAL_RESOURCES,
): QuizSchoolTerritorialResource[] {
  return resources
    .filter((resource) => resource.region === region && resource.validationStatus === "validated" && resource.validation.status === "published")
    .sort((left, right) => {
      const leftParis = left.territory.fr.startsWith("Paris") ? 0 : 1;
      const rightParis = right.territory.fr.startsWith("Paris") ? 0 : 1;
      return leftParis - rightParis || left.name.fr.localeCompare(right.name.fr, "fr");
    });
}
