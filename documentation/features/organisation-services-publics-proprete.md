# Organisation des services publics de propreté — contrat Annuaire

**Statut : CURRENT pour la visualisation et le référentiel éditorial affiché.** Les fiches d'emploi et les sources institutionnelles n'attestent ni une coopération CleanMyMap, ni un droit applicatif, ni un mandat municipal.

## Périmètre et sources canoniques

La vue « Organisation des services publics » se trouve dans `/sections/annuaire`, à côté du réseau 3D des cleanwalks. Son owner de données est `apps/web/src/lib/partners/public-cleanliness-organization.ts`; son owner d'interface est `apps/web/src/components/sections/rubriques/annuaire/public-cleanliness-organization.tsx`. Elle utilise le référentiel géographique `apps/web/src/lib/geo/paris-arrondissements.ts` et réutilise les identifiants d'organisation déjà employés par le réseau (`evt-paris-nettoyages` pour la DPE et `collectivite-syctom` pour Syctom).

La sélection d'une ville résout une entrée dans `PUBLIC_CLEANLINESS_CITY_DATASETS`. Paris est actuellement la seule ville documentée. Lyon et Marseille restent sélectionnables via le référentiel géographique, mais affichent explicitement l'absence de données institutionnelles validées ; le moteur ne contient pas de branches propres à ces villes.

## Contrat des entités et relations

- Un nœud possède un identifiant stable, un type distinct (`direction`, `service`, `unit`, `team`, `position`, `profession`, `person`, `provider` ou `city`), un employeur/rattachement, un territoire, un état d'affectation et une ou plusieurs sources.
- Les types `position` et `profession` ne désignent pas un titulaire. Les personnels de terrain sont représentés par corps de métier collectifs. Aucun nom de titulaire ou effectif n'est déduit d'une offre d'emploi.
- Les territoires sont un tableau : une division mutualisée est un unique nœud relié à chacun des arrondissements desservis.
- Les relations distinguent `hierarchy`, `coordination`, `programme` et `service`. Une prestation, une coordination fonctionnelle ou le lancement d'un programme ne sont jamais convertis en lien hiérarchique.
- L'état `confirmed` décrit une organisation, un métier ou une relation étayés par la source citée ; `historical` qualifie une structure/poste décrits à une date donnée sans attester son maintien ni son titulaire ; `unknown` signale une affectation ou un rattachement non établi.
- Chaque référence contient l'URL, le niveau de preuve et la date de vérification. Les dates affichées comme mise à jour publiée ne sont renseignées que pour les pages qui les publient explicitement.

## Référentiel Paris

La page Propreté de la Ville décrit le STPP au sein de la DPE, les brigades Urgence Propreté, les services spécialisés et les divisions d'accueil, dont la liste par arrondissements forme 14 unités (1er–4e, 5e–6e, 7e–8e, 9e–10e et une unité pour chacun des 11e à 20e). La page sur la collecte distingue les secteurs collectés par la Ville de ceux collectés par des entreprises privées ; les opérateurs privés ne sont pas nommés sans preuve correspondante.

Une offre de TSON pour la Division 17 décrit des secteurs territoriaux, ateliers, un secteur fonctionnel, des responsables d'équipe, des éboueurs et des conducteurs. Ces détails restent marqués historiques et limités à cette division ; ils ne sont pas projetés sur les autres divisions. L'offre REQ du 20e décrit un dispositif lancé par la DDCT, un rattachement au DGAEP de mairie d'arrondissement, ainsi que la coordination avec DPE, divisions territoriales et police municipale. Une offre DGAEP du 19e décrit la place du DGAEP dans la direction générale des services de cette mairie. Ces sources de poste ne prouvent pas l'identité des titulaires actuels ni des affectations de quartier.

Les fonctions de prévention, sensibilisation et tri sont représentées sans inventer un rattachement administratif détaillé. Syctom conserve son identifiant de réseau existant ; la relation de service/traitement est distincte d'une hiérarchie municipale.

## Interface, accessibilité et performance

Les onglets utilisent le patron ARIA `tablist`/`tab`/`tabpanel`, activables au clavier par flèches, `Home` et `End`. L'arborescence repose sur listes HTML imbriquées et boutons natifs repliables/sélectionnables ; elle reste navigable au clavier sur mobile et défile horizontalement lorsque les niveaux sont profonds. Les filtres réutilisent les choix de ville/arrondissement du référentiel géographique.

Le panneau WebGL reste monté sous son onglet masqué pour préserver l'état existant, mais la scène 3D est chargée dynamiquement par son composant actuel seulement quand il entre dans le viewport. La consultation seule de l'organigramme ne monte pas le canvas Three.js. Aucun nouveau moteur graphique ou droit applicatif n'est ajouté.

## Sources consultées le 24 novembre 2026

| Source | Fait repris | Niveau de preuve |
|---|---|---|
| [Organigramme de la Ville de Paris](https://www.paris.fr/pages/organigramme-de-la-ville-de-paris-2380), mise à jour 09/09/2026 | directions municipales, dont DPE, DDCT et DPMP | page institutionnelle actuelle |
| [Propreté à Paris](https://www.paris.fr/pages/la-proprete-239/), mise à jour 16/09/2026 | DPE/STPP, division territoriale, métiers, équipes Urgence Propreté, spécialités et secteurs d'accueil | page institutionnelle actuelle |
| [Collecte des déchets ménagers](https://www.paris.fr/pages/la-collecte-44), mise à jour 22/09/2026 | responsabilité DPE et partage Ville/prestataires selon arrondissements | page institutionnelle actuelle |
| [Paris Data — directions](https://opendata.paris.fr/explore/dataset/liste-des-directions-de-la-ville-de-paris/) | source du registre des directions | jeu de données officiel, issu de l'organigramme |
| [Offre REQ 20e](https://travaillerpourparis.offres.paris.fr/13375/1/referents-referentes-de-l-entretien-du-quartier-20eme-arrondissements-f-h) | organisation, rattachement DGAEP, coordination transversale, territoire d'emploi annoncé | fiche de recrutement officielle ; aucun titulaire actuel établi |
| [Offre TSON, Division 17](https://travaillerpourparis.offres.paris.fr/5521/1/technicien-technicienne-des-services-operationnels-de-nettoiement-tson-atelier-as-engins-apm-f) | description de secteurs, ateliers et postes au sein de la Division 17 | fiche de recrutement officielle, référence datée 2025 ; preuve historique |
| [Offre DGAEP, mairie du 19e](https://travaillerpourparis.offres.paris.fr/15944/1/directeur-general-adjoint-des-services-en-charge-de-l-espace-public-a-la-mairie-du-19eme-f-h) | articulation organisationnelle du DGS et du DGAEP pour le 19e | fiche de recrutement officielle ; ne prouve pas de titulaire |

Les références REQ ci-dessus distinguent l'initiative et les offres de poste des affectations ou titulaires non établis ; aucun contact de recrutement n'est exposé dans cette vue publique.
