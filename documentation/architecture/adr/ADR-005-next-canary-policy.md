# ADR-005 — Politique de stabilité Next.js

**Statut : accepté — stable par défaut**
**Date : 11 juillet 2026**
**Décision clôturée : 27 août 2026**

## Contexte historique

Le manifeste web observé lors de la rédaction utilisait :

```txt
next: 16.3.0-canary.79
eslint-config-next: 16.2.4
```

Une version canary peut contenir :

- correctifs non encore stables ;
- APIs expérimentales ;
- régressions ;
- changements rapides.

Aucune décision durable ne devait être implicite.

## Question historique

Pourquoi CleanMyMap dépendait-il d'une version canary de Next.js ?

## Options examinées

### Option A — Revenir sur stable

À privilégier si aucune fonctionnalité ou correction indispensable n'exige la canary.

Avantages :

- moins de churn ;
- compatibilité plus prévisible ;
- documentation plus simple.

### Option B — Conserver temporairement la canary

Acceptable seulement si une raison précise est documentée.

Le document doit alors enregistrer :

```txt
raison exacte
issue ou bug bloquant
fonctionnalité utilisée
date d'adoption
version minimale
condition de sortie
responsable de revalidation
```

## Décision

La politique acceptée pour CleanMyMap est :

> utiliser une version stable de Next.js, sauf blocage démontré.

Le runtime web actuel suit cette politique :

```txt
next: 16.3.3
react: 19.2.8
typescript: ^7
```

Cette décision ne modifie pas rétroactivement le contexte canary décrit plus haut.

## Exception canary

Une version canary ne peut être introduite qu'avec une justification technique précise et documentée. La décision doit alors enregistrer :

```txt
raison exacte
issue ou bug bloquant
fonctionnalité utilisée
date d'adoption
version minimale
condition de sortie
responsable de revalidation
```

## Validation

Toute modification de version Next.js doit passer :

```bash
npm run typecheck
npm run lint
npm run test
npm run test:security
npm run test:regression-gates
npm run build
```

## Décision finale

La politique « stable par défaut » est acceptée et clôt cet ADR. Toute future exception canary devra être justifiée selon la procédure ci-dessus.
