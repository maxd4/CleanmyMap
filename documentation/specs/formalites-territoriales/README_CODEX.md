# Formalités territoriales et accompagnement

Statut : CANDIDATE / non intégré. 27 novembre 2026. Références de lecture : `f654eeea9ea07d2f4636859b314da9159bf723b7` (passe 1), `202267461c69ce033ebe44bbfb479d78d378b3f0` (passe 2).
Chantier indépendant ; aucun runtime activé, aucun changement de l'ordre des autres lots.

## Ordre

1. `01-cadre-territorial.patch` : cadre national, scopes EPCI et arrondissement, résolution géographique et tests candidats.
2. `02-accompagnement.patch` : sept besoins facultatifs, Lyon 8 et Nantes Métropole, formulaire Paris prioritaire, copie des faits, courriels complémentaires et alternatifs, obligations hors accordéon, tests candidats.
3. `03-persistance.patch` : champ de préparation, validation, conservation, brouillon, hydratation et duplication.
4. `04-documentation-canonique.patch` : deux documents CURRENT, à appliquer avec le runtime correspondant seulement ; contrôler/adapter les hunks documentaires au checkout réel.
5. Copier les sept fichiers sous `CANDIDATS_METROPOLE/` vers leurs chemins relatifs exacts, puis `05-contacts-metropole.patch` (intégration Web/API, catalogue local Rennes).
6. `06-preuve-territoriale.patch` : preuve métropolitaine du point calculée côté serveur, qualification nationale prudente et régression candidate. Ne jamais activer 01 sans 06.

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
- DILA dynamique et cache : code candidat livré, appels réels non exécutés, vérifier tous les codes de service, champs et limites du fournisseur avant activation ;
- géométrie multiterritoriale : candidat IGN livré ; contrôler les réponses réelles, géométries frontières, taille des requêtes et ambiguïtés ; ne jamais étendre les règles d'un point à un itinéraire entier ; cas parisiens non municipaux à vérifier ;
- récépissé, accord/refus et preuve opposable : workflow actuel conservé tant que le contrat Web/Mobile/SQL n'est pas validé ;
- inventaire et quantités demandées, courriels Lyon, sélection Mobile, DTO, écritures concurrentes ;
- champs réels du formulaire Paris et couverture des demandes ; conserver les consignes de sécurité générales visibles indépendamment des besoins ;
- tests historiques de rendu à adapter, tests de persistance, non-régression publication/revue, permissions et réponses GEO/DILA réelles.

Contrôles : reconstruction statique depuis les fichiers du SHA de référence. Hooks locaux HOOK_NOT_AVAILABLE ; git apply --check, typecheck, lint, Vitest, couverture et runtime NOT_RUN. Aucun résultat de production revendiqué.

STOP CONDITION : candidats adaptés et intégrés, validations exécutées, aucun blocage fondé sur une géographie non prouvée, formulaire Paris prioritaire et besoins facultatifs indépendants, contrats partagés sans duplication. Toute preuve manquante reste explicite.

## Passe 2 : annuaire métropolitain dynamique

Périmètre fonctionnel visé : communes de métropole et de Corse, y compris communes rurales, pas une liste finie de grandes villes. Le filtre INSEE exclut l'outre-mer ; la résolution administrative géographique reste la preuve nécessaire. Ne pas annoncer un inventaire exhaustif des contacts ni une couverture juridique complète.

Architecture : le serveur récupère la géométrie enregistrée de la pré-action autorisée ; IGN API Carto retourne les communes intersectées. Puis DILA joint compétence géographique et fiche de service par identifiant. Le navigateur déclenche explicitement GET /api/actions/[actionId]/formalities?contacts=1. Aucun envoi automatique, aucune écriture de contact dans la fiche d'action, aucune nouvelle migration. Seules les données publiques du service (téléphone, courriel, site, formulaire, fiche, communes, date de récupération) sont renvoyées. Les données personnelles de l'organisateur ne sont pas transmises à DILA. Les géométries sont envoyées à IGN pour la résolution, pas le titre ou les identités. Vérifier les protections, la fraîcheur des résultats et la politique de confidentialité avant activation.

Bornes candidates : 12 communes par recherche, 60 identifiants par commune, groupes de 15, 4 communes en parallèle ; cache mémoire de 6 h, maximum 500 entrées. Réponse tronquée ou fournisseur indisponible : état partiel/inconnu, jamais résultat complet par défaut. La liste de communes intersectées ne prouve pas que toute l'action est en France. Les contacts DILA sont des interlocuteurs d'orientation administrative, non une preuve de compétence de collecte ni d'accord. Les codes mairie, epci et gendarmerie sont documentés dans les exemples consultés ; les autres codes proposés (prefecture, sous_pref, commissariat_police, ddt, ddtm, dreal, sdis) restent à confirmer sur le service réel.

Les annuaires nationaux complémentaires sont des accès vers les sources, non des imports exhaustifs : BANATIC, SINOE, réseaux associatifs World Cleanup Day et JeVeuxAider, Surfrider, ressources assurance, OFB, réserves naturelles, parcs naturels régionaux, VNF. Paris, Lyon, Nantes et Rennes disposent de règles pratiques locales candidates ; aucune disponibilité de matériel ni reprise des déchets présumée. Les contacts directs des syndicats de déchets et des associations sont à résoudre par les sources officielles, pas à déduire de la mairie. Les gestionnaires privés restent à identifier.

Sources techniques à consulter avec le candidat :
- https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-competence-geographique-des-services-locaux
- https://api-lannuaire.service-public.gouv.fr/
- https://github.com/IGNF/apicarto/blob/master/doc/limites-administratives.yml
- https://github.com/IGNF/apicarto/blob/master/controllers/limites-administratives/index.js
- https://www.banatic.interieur.gouv.fr/
- https://www.sinoe.org/
- https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000034448110/

Validation passe 2 : relecture des contrats IGN et DILA, génération et rejeu textuel exact des patches 05/06 sur les candidats précédents (PASS). Les tests Vitest inclus sont des tests candidats non exécutés. Accès réseau du conteneur au dépôt indisponible (résolution DNS), pas de checkout canonique. HOOK_NOT_AVAILABLE ; git apply --check réel, typecheck monorepo, lint, tests, appels IGN/DILA de production, E2E et déploiement NOT_RUN. Les hunks du patch documentaire 04 n'ont pas été rejoués complètement dans l'outil de reconstruction ; adapter sur le checkout plutôt que revendiquer PASS. Les deux documents CURRENT doivent absorber la doctrine de cette passe au moment de l'intégration, sans avancer leur statut avant validation.

Reste ouvert : preuve de réception et d'autorisation (ne pas confondre envoyé et accordé), refus, délais locaux exacts, intégration Mobile et tests Web/Mobile, recherche exhaustive des contacts locaux par besoin, récupération des demandes réellement couvertes par les formulaires, vérification de l'invalidation des preuves lors d'un changement de version de règle. Ne pas réinitialiser un workflow historique sans vérifier le contrat existant. Toute validation SQL/RLS et publication associative requise doit être exécutée sur le checkout réel.
