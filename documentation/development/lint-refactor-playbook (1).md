# Lint & Static Analysis Refactor Playbook

## Objet

Ce playbook décrit comment corriger les diagnostics ESLint et de qualité
statique sans dégrader le comportement de CleanMyMap.

Il ne maintient aucun compteur de warnings, classement daté de fichiers ou
backlog. Les résultats courants doivent être produits par les outils du dépôt
au moment du chantier.

Pour le typage, la source normative est
[`typescript-precision-policy.md`](./typescript-precision-policy.md).

## Principe directeur

Un diagnostic statique est un signal. La correction doit traiter la cause qui
rend le code fragile, ambigu ou inutile, pas seulement faire disparaître le
message.

```text
comportement / sécurité
→ contrat de données
→ effets et dépendances
→ types
→ complexité
→ code mort
→ rendu / style
```

## Workflow

1. Reproduire le diagnostic sur la zone concernée.
2. Identifier la règle et la cause racine.
3. Vérifier contrats, callers et tests utiles.
4. Corriger le plus petit périmètre cohérent.
5. Adapter un test si logique, frontière ou effet change.
6. Relancer le lint ciblé.
7. Lancer typecheck/tests selon le risque.
8. Utiliser `artifacts/` pour une preuve ponctuelle, pas un snapshot documentaire durable.

## Hooks React

### `react-hooks/set-state-in-effect`

Ne pas déplacer un calcul pur dans un effet. Préférer initialisation directe,
valeur dérivée pendant le rendu, ou `useMemo` uniquement pour un calcul
réellement coûteux.

Réserver `useEffect` aux effets de bord réels.

### `react-hooks/exhaustive-deps`

Avant de modifier la liste des dépendances :

- identifier les valeurs réellement lues ;
- stabiliser une fonction seulement si son identité est réellement pertinente ;
- extraire une logique pure si elle n'a pas besoin d'effet ;
- ne jamais retirer une dépendance uniquement pour faire taire le lint.

## Types et données inconnues

Pour `no-explicit-any` et les règles `no-unsafe-*`, appliquer
[`typescript-precision-policy.md`](./typescript-precision-policy.md).

```text
unknown
→ validation
→ normalisation
→ type métier
```

Ne pas corriger par un cast décoratif.

## Code mort

Pour `no-unused-vars`, déterminer si la valeur est réellement morte, révèle une
branche inachevée ou appartient à une signature imposée. Supprimer le code
réellement mort ; ne pas le commenter ni le renommer pour masquer le diagnostic.

## Complexité et taille

Pour `complexity`, `max-lines-per-function`, `max-lines` ou équivalent :

- la taille seule n'impose pas une extraction ;
- rechercher une vraie responsabilité ;
- isoler normalisation, règles de décision et transformations pures lorsqu'elles
  forment une unité cohérente ;
- préserver les contrats publics et l'ordre des effets.

Voir [`conventions-modularisation.md`](./conventions-modularisation.md).

## JSX et rendu

### `react/no-unescaped-entities`

Corriger la représentation du texte JSX sans changer son contenu fonctionnel.

### `@next/next/no-img-element`

Utiliser `next/image` lorsqu'il couvre correctement le besoin. Une exception
doit être motivée par le comportement réel.

### Accessibilité

Traiter le diagnostic selon la sémantique réelle : nom accessible, label, rôle,
focus, clavier, relation erreur/champ. Ne pas ajouter un `aria-*` arbitraire
pour satisfaire une règle.

Pour les contrats UI, consulter `documentation/design-system/`.

## Réponses réseau et parsing

Une réponse externe ne doit pas être propagée comme objet dynamique dans la
logique métier.

```text
lecture
→ parsing sûr
→ validation
→ conversion vers type métier
→ utilisation
```

Ne pas fabriquer silencieusement un objet valide avec des fallbacks arbitraires.

## Suppressions ESLint

Une directive `eslint-disable` n'est acceptable que lorsqu'une règle générique
ne représente pas correctement un cas légitime. Elle doit être locale,
motivée et supprimée lorsque la cause disparaît.

Ne pas diminuer globalement une sévérité pour éviter une correction locale.

## Validation

Pour une correction locale :

```text
lint ciblé
→ test ciblé si logique modifiée
→ typecheck si types, exports ou frontières touchés
```

Pour une abstraction, route, helper partagé ou extraction :

```text
lint ciblé
→ tests de contrat concernés
→ typecheck
→ validations plus larges selon le risque
```

Les commandes exactes sont définies dans [`TESTING.md`](./TESTING.md) et la
gouvernance du dépôt.

## Critères de sortie

- diagnostic ciblé résolu ;
- cause racine plus claire ;
- aucun cast ou disable aveugle ajouté ;
- comportement et contrats préservés ou explicitement modifiés ;
- tests pertinents verts ;
- aucune dette structurelle artificielle créée.

## Références

- [`typescript-precision-policy.md`](./typescript-precision-policy.md)
- [`conventions-modularisation.md`](./conventions-modularisation.md)
- [`repo-quality-rules.md`](./repo-quality-rules.md)
- [`TESTING.md`](./TESTING.md)
- [`kaizen/PRINCIPLES.md`](./kaizen/PRINCIPLES.md)
