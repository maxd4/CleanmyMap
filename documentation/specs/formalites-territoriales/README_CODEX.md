# Formalités territoriales et accompagnement

Statut : CANDIDATE / non intégré. 27 novembre 2026. Référence de lecture : `f654eeea9ea07d2f4636859b314da9159bf723b7`.
Chantier indépendant ; aucun runtime activé, aucun changement de l'ordre des autres lots.

## Ordre

1. `01-cadre-territorial.patch` : cadre national, scopes EPCI et arrondissement, résolution géographique et tests candidats.
2. `02-accompagnement.patch` : sept besoins facultatifs, Lyon 8 et Nantes Métropole, formulaire Paris prioritaire, copie des faits, courriels complémentaires et alternatifs, obligations hors accordéon, tests candidats.
3. `03-persistance.patch` : champ de préparation, validation, conservation, brouillon, hydratation et duplication.
4. `04-documentation-canonique.patch` : deux documents CURRENT, à appliquer avec le runtime correspondant seulement.

## Décisions

Paris garde son moteur spécialisé. La simple cleanwalk n'est pas une manifestation par défaut. L'incertitude locale reste inconnue. Un point d'ancrage ne prouve pas toute la géographie d'un itinéraire. Le gestionnaire n'est pas déduit du territoire.

Le formulaire Paris est prioritaire pour les demandes courantes ; ses champs exacts ne sont pas vérifiés. Une demande complémentaire doit être relue et précisée par l'organisateur. Ne pas solliciter deux fois un service pour le même besoin. Lyon 8 : prêt de matériel sur demande ; Nantes : kit via formulaire, idéalement trois semaines avant. Pas de stock ni de soutien présumé. Les besoins ne sont ni une preuve ni une obligation. Aucun envoi automatique, aucune nouvelle table ni modification RLS. La fiche imprimable reste complète.

Sources :
- https://www.paris.fr/pages/nettoyages-participatifs-ensemble-rendons-paris-plus-propre-15425
- https://www.service-public.gouv.fr/particuliers/vosdroits/F21899
- https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070299/LEGISCTA000006180817/
- https://mairie8.lyon.fr/vie-pratique/dechets-et-proprete/organiser-une-operation-de-nettoyage-citoyen
- https://metropole.nantes.fr/mes-services-mon-quotidien/organiser-un-ramassage-citoyen-des-dechets
- https://geo.api.gouv.fr/decoupage-administratif/communes
- https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-competence-geographique-des-services-locaux

## Intégration et preuves restantes

Partir du checkout courant, vérifier les hunks et préserver les changements concurrents. Vérifier les consommateurs de FormalityRuleScope, les traces, la publication/revue associative, les DTO publics/privés, Mobile et les écritures de préparation.

Restent à implémenter ou vérifier :
- DILA dynamique et cache (schéma réel non vérifié ; le lien annuaire est un fallback, pas une résolution de compétence) ;
- géométrie multiterritoriale complète, distinction fiable France/étranger, territoires particuliers, ancien territoire devenu périmé et cas parisiens non municipaux avant activation générale des obligations nationales ;
- récépissé, accord/refus et preuve opposable : workflow actuel conservé tant que le contrat Web/Mobile/SQL n'est pas validé ;
- inventaire et quantités demandées, courriels Lyon, sélection Mobile, DTO, écritures concurrentes ;
- champs réels du formulaire Paris et couverture des demandes ; conserver les consignes de sécurité générales visibles indépendamment des besoins ;
- tests historiques de rendu à adapter, tests de persistance, non-régression publication/revue, permissions et réponses GEO/DILA réelles.

Contrôles : reconstruction statique depuis les fichiers du SHA de référence. Hooks locaux HOOK_NOT_AVAILABLE ; git apply --check, typecheck, lint, Vitest, couverture et runtime NOT_RUN. Aucun résultat de production revendiqué.

STOP CONDITION : candidats adaptés et intégrés, validations exécutées, aucun blocage fondé sur une géographie non prouvée, formulaire Paris prioritaire et besoins facultatifs indépendants, contrats partagés sans duplication. Toute preuve manquante reste explicite.
