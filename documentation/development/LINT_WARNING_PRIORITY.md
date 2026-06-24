# Priorité des warnings ESLint restants

**Date du snapshot** : 2026-06-25  
**Source** : scan ESLint courant sur `apps/web/src`  
**Résultat** : 378 warnings, 0 erreur

L'ordre ci-dessous suit le risque technique et l'impact potentiel sur le comportement du code, pas seulement le volume.

## 1. Risque d'exécution

Ces warnings peuvent masquer des bugs d'état ou des effets de bord involontaires.

- `react-hooks/set-state-in-effect` : 9 occurrences
  - Priorité la plus haute, car un `setState` mal placé peut créer des boucles de rendu ou des états incohérents.
- `react-hooks/exhaustive-deps` : 5 occurrences
  - Les dépendances incomplètes rendent les effets fragiles et peuvent figer des valeurs obsolètes.
- `react-hooks/purity` : 2 occurrences
  - Toute logique non pure dans le rendu mérite d'être traitée tôt.

## 2. Typage et dette logique

Ces warnings dégradent la sûreté du code et cachent souvent des branches mortes ou des contrats flous.

- `@typescript-eslint/no-explicit-any` : 14 occurrences
  - À garder sous contrôle même après la grosse purge, car chaque `any` réintroduit une zone aveugle.
- `@typescript-eslint/no-unused-vars` : 110 occurrences
  - Très volumineux, mais prioritaire après les warnings de runtime car il masque souvent des contrats obsolètes ou du code mort.

## 3. Maintenabilité structurelle

Ces warnings n'indiquent pas forcément un bug immédiat, mais ils signalent des fichiers plus difficiles à relire, tester et faire évoluer.

- `complexity` : 126 occurrences
  - C'est le plus gros volume du snapshot actuel.
- `max-lines-per-function` : 72 occurrences
  - Signale des fonctions trop longues et souvent trop chargées.
- `max-lines` : 18 occurrences
  - Indique des fichiers trop denses pour rester simples à maintenir.
- `react/jsx-max-depth` : 1 occurrence
  - Alerte sur un composant trop imbriqué.

## 4. Qualité de rendu et contenu

Ces warnings sont moins risqués fonctionnellement, mais ils gardent l'UI plus propre et plus cohérente.

- `react/no-unescaped-entities` : 20 occurrences
  - À corriger progressivement dans le texte visible.
- `@next/next/no-img-element` : 1 occurrence
  - À traiter quand le composant concerné est repris.

## Ordre recommandé

1. Corriger les warnings de hooks.
2. Réduire les `any` restants.
3. Élaguer les variables non utilisées.
4. Découper les fonctions trop complexes ou trop longues.
5. Nettoyer ensuite les warnings de rendu et de contenu.

## Remarque

Le snapshot courant montre encore des `any` résiduels. Le gros du travail est fait, mais le dépôt n'est pas encore à zéro sur ce point dans l'état lint actuel.
