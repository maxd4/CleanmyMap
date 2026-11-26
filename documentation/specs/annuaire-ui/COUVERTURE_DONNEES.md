# Couverture des données publiques de l'Annuaire

**Statut : VALIDATED / RÉCEPTIONNÉ (matrice vérifiée sur `main`).** Les invariants durables sont portés par `documentation/pages_site/routes/04-reseau-discussions/annuaire/` (`annuaire-README.md`, `annuaire-presentation-detaillee.md`) et `documentation/features/paris-cleanwalk-network-3d.md`. Les inconnues externes restent explicitement documentées ci-dessous sans invention de données.

## Règle de complétude

Chaque information métier publique a un owner, une projection et au moins un emplacement utilisateur. Une information masquée par un repli reste consultable. Les clés techniques, les méta-données de sélection et les champs privés n'ont pas à être affichés. Les données publiées dynamiquement doivent provenir du contrat de publication autorisé. Une donnée non prouvée n'est ni un zéro, ni une relation inexistante, ni une autorisation.

| Owner / champs examinés | Destination candidate | Validation attendue |
|---|---|---|
| annuaire-types.ts : id, name, legalIdentity, kind, description, scope, types, engagementTypesSource, tags, featuredReason | En-tête, présentation et couverture ; identité technique/navigation, domaine thématique uniquement avec provenance, sélection éditoriale distincte de la qualification | Entrées statiques et publiées, catégories, description et identité ; vérifier les domaines déclarés |
| location, lat, lng, coordinatesSource, publicAddress, coveredArrondissements, schoolProfile | Implantations, adresse et nature du site, territoire distinct, UAI/secteur/niveau et sources divergentes | Coordonnées non vérifiées sans pin, adresse distincte de la desserte, conservation de toutes les adresses scolaires |
| websiteUrl, instagramUrl, facebookUrl, primaryChannel | Contacts publics avec normalisation et filtrage des invitations privées | Tester les liens sûrs, le CTA existant, les URL interdites et les droits de publication |
| contributionTypes, availability, associationProfile.mission/recurringNeeds/usefulResources/publicCalls | Présentation, besoins, moyens, contacts, ressources | Réutiliser les sections extraites du drawer ; conditions déclarées distinctes d'un accord |
| associationProfile.pastActions/pastActionsProvenance/impactHistory | Actions et impact avec gardes de provenance existantes | Ne jamais convertir activité déclarée en impact vérifié |
| associationProfile.structureStatus, provenance, verificationStatus, qualificationStatus, lastUpdatedAt | Qualification de la fiche et fraîcheur | Ne pas attribuer un partenariat actif à partir d'une source éditoriale ; afficher explicitement statut/fraîcheur aussi dans le panneau carte si absent |
| isFeatured, organizerDirectoryId, recentActivityAt | Tri éditorial, pont métier explicite, champ historique non probant | Pas de score d'influence, pas de relation déduite ; recentActivityAt non utilisé comme preuve |
| internalAdminContact et registre privé institutional-relations | Exclus de la projection publique ; surcouche administrative séparée | Sentinelles de fuite dans projection, DOM, API et caches ; pas de notes privées dans Git |
| paris-cleanwalk-network.ts : id/annuaireEntryId/organizerDirectoryId/name/category, roles/ecosystemRoles | Identité et compétences ; liens par identifiants explicites | Parité des alias, aucune fusion par nom ou proximité |
| activities (tous les éléments), equipmentAvailability.status/summary/items/sourceUrl/certainty | Activités, services et moyens | Tester toutes les activités, résumés et équipements ; une offre n'est pas une disponibilité confirmée |
| participationModalities, platformStatus, officialWebsite, publicContact, publicChannels/provenance | Participation, canaux, limites de plateforme | Canaux publics seulement, certification et date, modalités explicites |
| publicLeader, parisZone.label/arrondissements/scopeNote/isIntramuros, schoolProfile | Responsables, territoires, sites et identités scolaires | Source, rôle, date, pas d'inférence de rattachement ou lieu exact à partir de couverture |
| funding.sources/sharePercent/amountEur/sharesPublished/period/entityName/calculationBase/sourceUrl/verifiedAt/notes | Financement : montants et parts distincts, base, portée, période et preuve | Null inconnu distinct de 0 ; pas de somme ou classement de sources hétérogènes |
| provenance.sourceLabel/sourceUrl/secondarySourceUrl/certainty, verifiedAt | Sources et preuve | Conserver statut, origine et dates |
| isCleanMyMapMember | Invariant de non-attribution ; ne pas afficher un faux statut positif | Aucune permission ou adhésion inférée |
| public-cleanliness-organization.ts : kind, service, assignment, description, territoryIds, legalEmployerId, unitId, publicContact, sourceIds | Identité institutionnelle, responsabilités, territoires, organigramme, contacts et preuves | Tous les nœuds documentés, relations et sources ; historiques distincts du présent |
| searchTerms, territoryCoverageGroup, coverageRole, directoryId, networkActorId | Recherche, matrice, navigation et résolution d'identité | Ne pas présenter ces codes comme de nouvelles compétences |
| relations institutionnelles : id/from/to/kind/status/validFrom/validUntil/sourceIds | Liaisons, fiche relation, chronologie | Aucun mandat, programme ou contrat converti en hiérarchie ; dates de validité et source |
| public-cleanliness-people.ts | Responsables et affectations documentées | Fonctions distinctes de personnes, affectation historique non actuelle |
| public-cleanliness-coverage.ts | Matrice des 20 arrondissements | Conserver lacunes explicites, divisions mutualisées sans duplication |
| public-cleanliness-needs.ts | Qui contacter et mise en évidence dans le graphique | Règles existantes, même besoin/arrondissement, garder les limites opérationnelles et les sources |
| public-cleanliness-chain.paris.ts | Rôle dans les filières, services et preuves | Étapes de lecture, jamais une chaîne de transferts supposée ; descriptions originales et liens réellement attestés |
| paris-cleanwalk-network.relations.ts : id/sourceId/targetId/title/summary/relationType/operations/frequencyKnown/source | Fiche relation, liaisons et historique | Types, deux endpoints, preuves, dates, fréquence ; toutes les relations consultables même sans tracé |
| paris-cleanwalk-network.scheduled.ts | Opérations programmées, fiche détaillée existante | Date, lieu, acteurs/rôles, information manquante ; jamais promotion automatique en réalisé |
| public-structure-context.*.ts : metrics et limits, période, unité, portée, qualité, basis, kind, sourceIds et sources | Chiffres et limites, panneau partagé | Tester toutes les métriques/limites et leurs preuves ; critiques attribuées, jamais note |
| annuaire-geo-network.model.ts : implantation, statut d'adresse, indicateurs | Pin, fiche, listes hors Paris / localisation non établie | Dédupliquer voisins/opérations ; ne pas confondre position, activité et influence |
| public-network-identity-media.ts (candidats 07/09) | Logo local, adresse publique et provenance | Auditer cohérence avec owner d'implantation ; pas de logo inventé, aucune adresse personnelle |

## Vérifications réelles et inconnues externes conservées

- Projection publique, fiches communes, interactions graphiques, catalogue unifié et confidentialité des contacts administratifs : **PASS** (Vitest + Playwright `e2e/annuaire-public-cleanliness.spec.ts` et `e2e/annuaire-catalog.spec.ts`).
- Limites géographiques : les 20 polygones officiels des arrondissements de Paris ont été importés depuis Paris Data (`https://opendata.paris.fr/explore/dataset/arrondissements/`, licence ODbL, attribution Ville de Paris) dans `apps/web/src/lib/geo/paris-arrondissements-boundaries.json` et `.ts`, validés par `paris-arrondissements-boundaries.test.ts`, et raccordés à `isPointInParisIntramuros`, au calque Leaflet (`annuaire-map-canvas.tsx`) et au calque MapLibre (`annuaire-map-3d-canvas.tsx`).
- Inconnues externes explicitement conservées : logos tiers sans autorisation de réutilisation vérifiable (`getNetworkPublicLogo` limité au logo CleanMyMap autorisé), adresses/géocodages absents pour les plateformes ou acteurs sans établissement physique public sourcé (aucun centroïde promu en position réelle).

STOP CONDITION : chaque donnée publiable pertinente est rendue au bon emplacement, les exclusions sont justifiées, les deux visualiseurs et la fiche commune sont réellement raccordés, le public ne reçoit aucune donnée privée, les contrôles runtime et CI du candidat exact réussissent.

### Catalogue unifié (CANDIDATE 15 à 17)

| Données | Destination | Preuve attendue |
|---|---|---|
| Entrées éditoriales et partenaires acceptés, acteurs réseau, structures institutionnelles admissibles | Catalogue unique, identifiants explicites et fiche commune | Test de couverture, priorité partenaire sur même ID, absence de fusion par nom |
| Familles, provenance, territoire, participation, filière, relations documentées | Filtres et tri | Résultats et compteur issus de la même projection ; inconnues conservées |
| Coordonnées prouvées et canaux publics autorisés | Actions conditionnelles des cartes | Pas de centroïde comme adresse, pas de contact administratif ni URL fictive |
| Personnes, postes, métiers et équipes internes | Fiches et organigramme | Pas de comptage comme structures autonomes |

Les candidats n'ajoutent pas de nouveaux logos ou preuves géographiques. Tests préparés mais non exécutés ; couverture réelle non prouvée. Les écarts précédents restent ouverts.
