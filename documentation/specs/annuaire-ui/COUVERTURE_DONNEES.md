# Couverture des données publiques de l'Annuaire

**Statut : CANDIDATE.** Base lue : e8f5b931bcaa09f126ecb1c345cbee67ff08e9eb. Aucune validation navigateur ou de production. Ce document est la matrice de passation temporaire des candidats 11 à 14 ; transférer les invariants durables vers les contrats CURRENT après intégration, puis retirer cette matrice temporaire.

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

## Vérifications réelles et manquantes

- Lecture statique des référentiels et des consommateurs existants ; reconstitution des hunks utiles après 06/08/09 et adaptation de leur conflit de palette pink/family.
- Les tests candidats parcourent les acteurs et les nœuds, vérifient la projection, les valeurs rendues, relations, sources, confidentialité de contact administratif, alias et algorithmes de graphe. Ils ne sont pas exécutés.
- Les champs dont le statut ou la présentation ne sont pas encore complètement harmonisés (notamment qualification/fraîcheur et domaine) doivent être vérifiés dans le panneau carte et les vues institutionnelles ; ne pas déclarer la matrice exhaustive en exécution.
- Limites géographiques : le rectangle actuel ne représente pas la frontière exacte. Source primaire choisie : https://opendata.paris.fr/explore/dataset/arrondissements/ ; export GeoJSON : https://opendata.paris.fr/explore/dataset/arrondissements/export/ ; licence ODbL, attribution Ville de Paris. Importer localement les vingt polygones, valider les IDs, l'intégrité et la provenance ; utiliser la géométrie officielle pour le test point-dans-polygone, les calques et la couverture documentée. Le snapshot paris-pressure existant représente des IRIS/grilles, pas les limites administratives ; ne pas le détourner. Le fichier GeoJSON officiel n'a pas été récupéré ni intégré.
- Les candidats séparent les badges en pixels mais le comportement sous forte densité, le regroupement à faible zoom, le plein écran cartographique, les légendes interactives et l'adaptation mobile nécessitent encore des preuves/compléments. Les regroupements institutionnels par familles et la navigation territoriale doivent être évalués avec la disposition réelle ; pas de rattachement supplémentaire.
- Couverture des logos tiers, portraits, adresses et nouveaux liens : inventaire de chaque ID et recherche des preuves publiques restent nécessaires. Aucune disponibilité ou autorisation de publication n'est inventée.

STOP CONDITION : chaque donnée publiable pertinente est rendue au bon emplacement, les exclusions sont justifiées, les deux visualiseurs et la fiche commune sont réellement raccordés, le public ne reçoit aucune donnée privée, les contrôles runtime et CI du candidat exact réussissent.

### Catalogue unifié (CANDIDATE 15 à 17)

| Données | Destination | Preuve attendue |
|---|---|---|
| Entrées éditoriales et partenaires acceptés, acteurs réseau, structures institutionnelles admissibles | Catalogue unique, identifiants explicites et fiche commune | Test de couverture, priorité partenaire sur même ID, absence de fusion par nom |
| Familles, provenance, territoire, participation, filière, relations documentées | Filtres et tri | Résultats et compteur issus de la même projection ; inconnues conservées |
| Coordonnées prouvées et canaux publics autorisés | Actions conditionnelles des cartes | Pas de centroïde comme adresse, pas de contact administratif ni URL fictive |
| Personnes, postes, métiers et équipes internes | Fiches et organigramme | Pas de comptage comme structures autonomes |

Les candidats n'ajoutent pas de nouveaux logos ou preuves géographiques. Tests préparés mais non exécutés ; couverture réelle non prouvée. Les écarts précédents restent ouverts.
