import { PARIS_CLEANWALK_ACTORS, type ParisCleanwalkActor } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_ASSOCIATION_PUBLIC_CONTACTS, PARIS_DPE_CONTACT, resolveParisCleaningDivisionContacts, resolveParisTownHallContacts, type ParisAssociationContact, type ParisContactSource } from "@/lib/partners/paris-cleanwalk-network.contacts";

export const PARIS_CLEANWALK_HANDOFF_GUIDANCE: readonly { label: string; text: string; source: ParisContactSource; additionalSource?: ParisContactSource }[] = [
  {
    "label": "Organisation de la reprise",
    "text": "Contacter les divisions concernées avant l'action et demander les modalités de reprise : point et horaire, quantités, flux acceptés, tri et conditionnement. Aucune reprise ni adresse de dépôt n'est confirmée par cette fiche.",
    "source": {
      "title": "Nettoyage participatif, Ville de Paris",
      "url": "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
      "verifiedOn": "2026-11-25"
    }
  },
  {
    "label": "Corbeilles publiques",
    "text": "Ne laissez aucun sac de cleanwalk au pied d'une corbeille publique et ne le déposez pas automatiquement dans son réceptacle. Les corbeilles de rue sont destinées aux petits déchets individuels.",
    "source": {
      "title": "Agir pour la propreté, Ville de Paris",
      "url": "https://prod-v3.paris.fr/pages/agir-pour-la-proprete-de-ma-ville-2015",
      "verifiedOn": "2026-11-25"
    }
  },
  {
    "label": "Bacs jaunes et Trilib'",
    "text": "Pas de dépôt indifférencié de sacs de cleanwalk. Respecter les flux et consignes des bacs : emballages et papiers admissibles en vrac, verre d'emballage dans le module prévu, déchets alimentaires dans le module dédié selon ses consignes. Confirmer les modalités particulières avec le service.",
    "source": {
      "title": "Que faire de ses déchets ?, Ville de Paris",
      "url": "https://www.paris.fr/pages/en-2019-paris-vous-facilite-le-tri-6266",
      "verifiedOn": "2026-11-25"
    },
    "additionalSource": {
      "title": "Trilib', Ville de Paris",
      "url": "https://www.paris.fr/pages/trilib-une-nouvelle-approche-du-tri-selectif-3963",
      "verifiedOn": "2026-11-25"
    }
  },
  {
    "label": "Déchets dangereux",
    "text": "Ne pas collecter les objets piquants, sous pression ou toxiques. Demander au service les modalités adaptées pour les déchets particuliers.",
    "source": {
      "title": "Nettoyage participatif, Ville de Paris",
      "url": "https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425",
      "verifiedOn": "2026-11-25"
    }
  }
];

export function selectRelevantAssociationContacts(selected: ReadonlySet<number>, contacts: readonly ParisAssociationContact[], actors: readonly ParisCleanwalkActor[]) {
  if (!selected.size) return [];
  return contacts.flatMap(contact => {
    const actor = actors.find(item => item.id === contact.actorId);
    if (!actor || actor.category !== "association_locale" || !actor.parisZone.isIntramuros) return [];
    const matched = actor.parisZone.arrondissements.filter(n => selected.has(n));
    if (!matched.length) return [];
    return [{ contact, actor, matchedArrondissements: [...new Set(matched)].sort((a,b) => a-b) }];
  });
}

export function resolveParisFormalitiesSupport(numbers: readonly number[]) {
  const arrondissements = [...new Set(numbers.filter(n => Number.isInteger(n) && n >= 1 && n <= 20))].sort((a,b) => a-b);
  const selected = new Set(arrondissements);
  return {
    arrondissements,
    divisions: resolveParisCleaningDivisionContacts(arrondissements),
    townHalls: resolveParisTownHallContacts(arrondissements),
    associations: selectRelevantAssociationContacts(selected, PARIS_ASSOCIATION_PUBLIC_CONTACTS, PARIS_CLEANWALK_ACTORS),
    logistics: PARIS_DPE_CONTACT.logistics,
    guidance: PARIS_CLEANWALK_HANDOFF_GUIDANCE,
  };
}
export type ParisFormalitiesSupport = ReturnType<typeof resolveParisFormalitiesSupport>;
