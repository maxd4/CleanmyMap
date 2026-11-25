import type { AnnuaireEntrySeedInput } from "@/lib/partners/annuaire-types";

export const SCHOOL_ENTRIES: AnnuaireEntrySeedInput[] = [
  {
    "id": "school-uai-0756544f",
    "name": "Lycée Ellipse Montessori Academy",
    "legalIdentity": "Lycée général privé Ellipse Montessori Academy",
    "kind": "etablissement_enseignement",
    "scope": "local",
    "types": [],
    "description": "Lycée général privé hors contrat ; identité institutionnelle documentée.",
    "location": "3 rue Amélie, 75007 Paris",
    "lat": null,
    "lng": null,
    "coordinatesSource": "unknown",
    "websiteUrl": "https://ellipsema.com/",
    "coveredArrondissements": [
      7
    ],
    "contributionTypes": [],
    "primaryChannel": {
      "platform": "site web",
      "label": "Site ou fiche institutionnelle",
      "url": "https://ellipsema.com/"
    },
    "schoolProfile": {
      "uai": "0756544F",
      "level": "lycee_general",
      "sector": "prive_hors_contrat",
      "addresses": [
        {
          "label": "3 rue Amélie, 75007 Paris",
          "sourceUrl": "https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/table/?q=0756544F"
        }
      ],
      "sources": [
        {
          "label": "Annuaire de l’Éducation nationale",
          "url": "https://data.education.gouv.fr/explore/dataset/fr-en-annuaire-education/table/?q=0756544F"
        },
        {
          "label": "Mentions légales Ellipse",
          "url": "https://ellipsema.com/en/mentions-legales/"
        }
      ],
      "verifiedAt": "2026-11-25"
    }
  },
  {
    "id": "school-uai-0751241s",
    "name": "École élémentaire Voltaire",
    "legalIdentity": "École élémentaire publique Voltaire",
    "kind": "etablissement_enseignement",
    "scope": "local",
    "types": [],
    "description": "École élémentaire publique ; identification de l’établissement annoncé pour le 30 novembre probable, à confirmer.",
    "location": "6 ou 8 cité Voltaire, 75011 Paris (adresse à confirmer)",
    "lat": null,
    "lng": null,
    "coordinatesSource": "unknown",
    "websiteUrl": "https://www.paris.fr/lieux/ecole-elementaire-voltaire-415",
    "coveredArrondissements": [
      11
    ],
    "contributionTypes": [],
    "primaryChannel": {
      "platform": "site web",
      "label": "Site ou fiche institutionnelle",
      "url": "https://www.paris.fr/lieux/ecole-elementaire-voltaire-415"
    },
    "schoolProfile": {
      "uai": "0751241S",
      "level": "elementaire",
      "sector": "public",
      "addresses": [
        {
          "label": "6 cité Voltaire, 75011 Paris",
          "sourceUrl": "https://www.paris.fr/lieux/ecole-elementaire-voltaire-415"
        },
        {
          "label": "8 cité Voltaire, 75011 Paris",
          "sourceUrl": "https://www.education.gouv.fr/annuaire/75011/paris-11e-arrondissement/ecole/0751241s/eepu-voltaire-8-cite-voltaire.html"
        },
        {
          "label": "8 cité Voltaire, 75011 Paris",
          "sourceUrl": "https://mairie11.paris.fr/pages/les-ecoles-elementaires-9802"
        }
      ],
      "sources": [
        {
          "label": "Annuaire de l’Éducation nationale",
          "url": "https://www.education.gouv.fr/annuaire/75011/paris-11e-arrondissement/ecole/0751241s/eepu-voltaire-8-cite-voltaire.html"
        },
        {
          "label": "Ville de Paris",
          "url": "https://www.paris.fr/lieux/ecole-elementaire-voltaire-415"
        },
        {
          "label": "Mairie du 11e",
          "url": "https://mairie11.paris.fr/pages/les-ecoles-elementaires-9802"
        }
      ],
      "verifiedAt": "2026-11-25"
    }
  }
];
