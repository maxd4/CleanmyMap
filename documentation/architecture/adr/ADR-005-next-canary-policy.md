# ADR-005 — Politique Next.js canary

**Statut : à décider**  
**Date : 11 juillet 2026**

## Contexte

Le manifeste web courant utilise :

```txt
next: 16.3.0-canary.79
eslint-config-next: 16.2.4
```

Une version canary peut contenir :

- correctifs non encore stables ;
- APIs expérimentales ;
- régressions ;
- changements rapides.

Aucune décision durable ne doit être implicite.

## Question

Pourquoi CleanMyMap dépend-il d'une version canary de Next.js ?

## Options

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

## Recommandation

Par défaut :

> utiliser une version stable de Next.js, sauf blocage démontré.

Ne pas faire de downgrade automatique dans le même lot que d'autres corrections importantes.

## Si la canary est conservée

Ajouter une vérification régulière :

1. vérifier si le correctif est disponible en stable ;
2. lire les release notes ;
3. tester typecheck ;
4. lancer tests ;
5. lancer build ;
6. revenir sur stable lorsque la condition de sortie est remplie.

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

À compléter après vérification de la raison historique réelle.

Ne pas marquer cet ADR comme accepté sans preuve.
