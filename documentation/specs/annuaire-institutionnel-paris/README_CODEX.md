# Candidat d'intégration : Annuaire institutionnel Paris 2D

Statut : PLAN / CANDIDATE, non intégré. SHA de préparation : `349eadd4d5b5e4418d571f3767cbf9aae52a803b`.

Ce dossier versionne le candidat préparé par ChatGPT, hors runtime. Les quatre fichiers sous `CANDIDATS/` conservent leurs chemins cibles et leur contenu d'origine ; les contrôles isolés décrits ci-dessous ont été effectués lors de la préparation, pas sur le checkout réel. Revoir le diff courant et les collisions avant intégration. La publication de cette spécification ne valide ni l'intégration ni le déploiement.

## Fichiers

Chemins cibles après intégration (sources dans `CANDIDATS/` à l'intérieur de ce dossier) :

- `apps/web/src/lib/partners/public-cleanliness-organization.paris-extension.ts` : extension éditoriale sans duplication des divisions DPE existantes, avec relations sourcées, personnes et unités réglementaires.
- `apps/web/src/lib/partners/public-cleanliness-coverage.ts` : projection des territoires, affectations et lacunes depuis le dataset.
- `apps/web/src/components/sections/rubriques/annuaire/public-cleanliness-coverage-table.tsx` : composant de matrice accessible, intégré via callback de navigation existant.
- `apps/web/src/lib/partners/public-cleanliness-coverage.test.ts` : scénarios proposés à exécuter avec Vitest du dépôt.

## Intégration dans les owners actuels

Dans `apps/web/src/lib/partners/public-cleanliness-organization.ts` :

1. Étendre `OrganizationRelationKind` de `mandate | assignment | cooperation`. Conserver les quatre autres valeurs.
2. Ajouter à `PublicCleanlinessOrganizationNode` les propriétés optionnelles :

```ts
coverageRole?: 'local_mayor' | 'local_delegation' | 'local_dgs' | 'local_dgaep' | 'req';
publicContact?: {
  label: string;
  url: string;
  kind: 'official_portal' | 'functional_contact';
  sourceIds: readonly string[];
};
```

3. Importer `extendParisPublicCleanlinessDataset` depuis `./public-cleanliness-organization.paris-extension` (l'extension importe uniquement des types). Renommer les trois constantes sources initiales en `BASE_PUBLIC_CLEANLINESS_SOURCES`, `BASE_PARIS_PUBLIC_CLEANLINESS_NODES`, `BASE_PARIS_PUBLIC_CLEANLINESS_RELATIONS` et retirer leur `export`. Avant l'export de `PARIS_PUBLIC_CLEANLINESS_DATASET`, appeler une seule fois l'extension avec ces trois tableaux et réexporter les trois noms publics historiques depuis le résultat. Conserver le moteur de sélection des villes et les exports publics.
4. Supprimer le lien `city-prevention` de statut inconnu s'il est encore utilisé comme rattachement hiérarchique, faute de preuve ; conserver le nœud générique sans inventer de rattachement. Ne pas attribuer les services spécialisés ou Urgence Propreté à une division sans source.
5. Vérifier le raccord Syctom avec l'ID réellement disponible dans `INITIAL_ANNUAIRE_ENTRIES` : la documentation annonce un ID alors que le test actuel attend `directoryId` absent. Ne pas créer un faux ID ou un doublon de seed.
6. Compléter le validateur : identités uniques (IDs et pas de duplication de la même identité attestée), source et URL HTTPS des contacts, interdiction de coordonnées privées ou issues des recrutements dans la projection publique, absence d'arêtes `assignment` depuis une entité autre que personne, affectation vers une fonction (pas de faux rattachement), couverture complète des groupes déclarés pour Paris. Conserver la détection des cycles et la contrainte parent unique sur `hierarchy` uniquement. Vérifier les doublons sémantiques d'arêtes et les statuts historiques ; ne pas imposer Paris au moteur générique.
7. Revoir les tests existants : l'ID `dpe`, le parent `city-paris`, les 14 divisions et les types d'arêtes existants restent stables. Les références `dgs-19` et `dgaep` sont rattachées aux mairies individualisées sans duplication. Les nouvelles sources ont une date de vérification explicite ; ne pas fabriquer de relecture lorsque seule la documentation du dépôt atteste la consultation.

Dans `apps/web/src/components/sections/rubriques/annuaire/public-cleanliness-organization.tsx` :

- Ajouter les libellés FR/EN `mandate`, `assignment`, `cooperation` dans `COPY` et ajuster intro/relations/footer ; les mandats politiques affichés ne sont pas des mandats accordés par CleanMyMap.
- Importer `PublicCleanlinessCoverageTable`, l'insérer avant le paragraphe footer dans le panneau du dataset avec `{dataset && <PublicCleanlinessCoverageTable dataset={dataset} fr={fr} onSelect={selectRelatedNode} />}`. Garder la matrice indépendante des filtres (20 lignes) et navigable par sélection. Ajouter affichage du contact fonctionnel/portail dans la fiche si présent. Utiliser les libellés anglais des nouveaux nœuds si disponibles ; les noms officiels restent acceptables en l'absence de traduction attestée.
- Pour éviter une liste énorme par défaut, distinguer les racines politiques et nominatives du véritable arbre administratif (sections repliables dans le même panneau, pas de nouveau moteur), ouvrir les fiches associées par les arêtes typées et respecter la recherche. Les personnes ne doivent pas devenir enfants hiérarchiques par commodité.
- Ajouter scénarios de comportement FR/EN : sélection depuis matrice, navigation entre mandats, filtres, date/statut, clavier et affichage mobile. Préserver le démontage de la scène Three.js en 2D.

## Éléments sourcés et limites à terminer

- DPE : arrêté du 3 avril 2024, pages 2 et 3 lues visuellement, articles 1 à 6. Recherche de modifications ultérieures non concluante. Les nouvelles unités réglementaires sont historiques à la date de l'arrêté, pas réputées toutes actuelles. Maintenir les divisions et métiers existants dont les sources actuelles attestent la structure.
- SG : notice BOVP du 23 juillet 2026 identifiée ; texte intégral non obtenu. Marie Daudé est attestée dans l'organigramme du 9 septembre 2026. Ne pas déduire les rattachements détaillés avant lecture de l'arrêté.
- DPMP : arrêté du 6 janvier 2025, source municipale du 26 octobre 2026 et page 2024 de territorialisation. Les divisions de tranquillité publique actuelles sont 17. Vérifier leur rattachement intermédiaire exact et les évolutions réglementaires avant de relier à la sous-direction historique. Les relations mairie-DPMP sont fonctionnelles.
- Élus : liste de la mandature 2026, 17 maires et exécutif central ; compléter les délégations locales des 17 mairies à partir des fiches municipales courantes (pas des résultats 2020-2026). Compléter les commissions pertinentes au-delà de la 8e avec leurs libellés et membres vérifiés. Les cabinets, conseillers techniques et DGS/DGAEP locaux non documentés restent des lacunes.
- REQ : reprendre `documentation/plans/referents-entretien-quartier-paris.md` au même SHA. Régine Merlin y est attestée par Paris Huit (source non rouverte avec succès lors de la préparation), Vincent Chetouani par le CR de 2024 relu ; son rôle historique n'est pas le nouveau dispositif. Les index 11e et 18e sont documentés dans le plan, non vérifiés intégralement ici. Habiba et Sébastien : identités incomplètes, historiques, ne pas inventer de noms. Julie Bastide, Nicolas Genaille, Adrien Blot : contacts de recrutement/prospection, pas titulaires ni contacts publics. Marianne Jaouen et Pascale Martinetto : anciens contacts, ne pas réactiver comme titulaires. Ajouter le statut/source du dispositif 10e uniquement si la fiche municipale est disponible. Confirmer le responsable central et les quartiers ; absence de preuve = lacune.
- Contacts : le candidat fournit 17 liens d'orientation vers les portails municipaux. Il ne les présente pas comme des contacts directs. Ajouter uniquement les canaux fonctionnels publiés avec leur preuve. L'adresse de recrutement, les coordonnées privées et les contacts nominaux non nécessaires restent exclus.
- Terrain : le modèle actuel décrit les métiers généraux et la Division 17 historique. Compléter les unités réellement documentées pour les autres divisions ; pas de génération de postes/ateliers fictifs. Vérifier les conseils de quartier et les référents DPMP selon leur source actuelle, distincts des REQ.

## Documentation et validation

Contrôles exécutés hors checkout lors de la préparation : TypeScript 5.8.3 `--strict` sur les deux modules de données avec un contrat reproduit du moteur et un fixture synthétique (25 nœuds de base) : PASS. Smoke test Node 22 sur le même fixture : 177 nœuds ajoutés, 194 relations ajoutées, 18 sources ajoutées, 20 lignes ; unicité des IDs, références de sources, endpoints, absence de cycle hiérarchique, groupes 17/14/17, mandats de Carine Ekon, statut historique REQ et six unités mécaniques : PASS. Ce ne sont pas des tests du checkout CleanMyMap, ni une preuve de typecheck UI, Vitest, couverture ou CI.

Actualiser `documentation/features/organisation-services-publics-proprete.md` et les fiches Annuaire canoniques concernées, distinguer le référentiel actuel des lacunes et des sources historiques. Le présent manifeste est candidat temporaire, non une nouvelle source CURRENT.

Exécuter les tests unitaires existants et nouveaux, les tests UI comportementaux, le typecheck/lint ciblés selon `AGENTS.md`, puis le scénario e2e Annuaire avec navigateur réel si possible. Vérifier les projections publiques, la matrice et les sélections au clavier, ainsi que la non-régression de l'onglet 3D. Ne pas annoncer une couverture ou un résultat non exécuté. Publier le candidat intégré et validé conformément à `AGENTS.md`. Retirer les candidats devenus redondants après intégration.

STOP CONDITION : référentiel navigable politique et administratif pour les 20 arrondissements, données sourcées et lacunes explicites, tests exécutés, aucune régression du 3D, publication main vérifiée. Aucune exhaustivité nominative fictive.
