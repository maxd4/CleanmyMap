# Suivi Trash Spotter — présentation détaillée

**Statut : CURRENT pour la consultation, avec `PUBLICATION_RIGHTS_DECISION_REQUIRED` comme limite produit encore ouverte.** Source canonique de la page : [trash-spotter-README.md](./trash-spotter-README.md).

## Parcours de lecture

- **Route** : `/sections/trash-spotter`, surface de suivi secondaire du bloc Réseau & Discussions.
- **Accès** : `auth-blur-gate` ; l'aperçu anonyme flouté précède l'accès à la surface authentifiée. L'affichage public ne confère aucune autorisation sur les observations privées.
- **Contenu** : carte globale des `spot` approuvés, signalements récents et indicateurs de qualité de coordonnées ; le périmètre de lecture est borné par les filtres réellement appliqués.
- **États** : aperçu flouté, chargement, erreur de récupération, données disponibles ou liste/carte vide. L'absence de résultat ne crée pas de point fictif ni de zéro interprété comme mesure complète.
- **Action secondaire** : rejoindre `/signalement` pour créer une observation et consulter « Mes observations ». Le formulaire `TrashSpotterObservationForm` n'est pas rendu ici.
- **Navigation** : ni quatrième entrée du bloc Agir ni route de création concurrente.

## Propriétaires et vérification

- `apps/web/src/lib/sections-registry/config.ts` : registre, famille et mode d'accès déclaré ;
- `apps/web/src/components/sections/rubriques/trash-spotter-section.tsx` : consultation, données et états UI ;
- `apps/web/src/components/sections/rubriques/trash-spotter/` et `apps/web/src/lib/actions/` : capacités métier selon les imports réellement présents ;
- `/signalement` : seul parcours de déclaration ;
- [INDEX maître](../../../INDEX.md) et [contrat des familles](../../../PAGE_FAMILIES.md) : route, accès et SEO.

Aucune décision d'élargissement du droit de publication n'est prise dans ce document. Pour un changement de mode d'accès ou de données exposées, vérifier le runtime et son API, l'AuthZ et les tests de projection avant de modifier la fiche.
