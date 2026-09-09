# Sécurité des regex — contrat `CURRENT`

Les regex traitant une entrée externe doivent rester bornées et prévisibles.
Le risque principal documenté ici est le ReDoS par backtracking excessif.

## Règles applicables

- borner la longueur avant toute regex ;
- éviter les quantificateurs imbriqués et les groupes ambigus répétés ;
- limiter les alternatives qui se recouvrent et les ordonner explicitement si nécessaire ;
- préférer un parsing itératif ou un parseur dédié pour un format structuré ;
- ne pas utiliser une regex de sous-chaîne pour valider une URL : utiliser `new URL()` ;
- conserver des tests négatifs pour les entrées longues, ambiguës et malformées.

## Exemple de garde

```ts
const MAX_VALUE_LENGTH = 256;

function isBoundedValue(value: string): boolean {
  return value.length <= MAX_VALUE_LENGTH && /^[+\d][\d\s().-]+$/.test(value);
}
```

La borne dépend du contrat métier et doit rester proche de la frontière
d'entrée. Une borne seule ne rend pas sûre une expression dont la structure
permet un backtracking exponentiel.

## Validation d'un changement

Identifier la source, le sink, le volume maximal, le moteur utilisé et le cas
de rejet. Si le format peut être décomposé en étapes simples, le parsing
explicite est préféré. Les inventaires historiques de corrections ne font pas
partie de ce contrat.
