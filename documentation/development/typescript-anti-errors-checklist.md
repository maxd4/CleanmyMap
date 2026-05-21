# TypeScript Anti-Errors Checklist

Checklist courte pour une correction TypeScript sans régression.

## Avant de corriger

- Identifier le code d'erreur exact.
- Dire si la donnée vient d'une frontière externe ou d'un type métier interne.
- Vérifier si un type nommé existe déjà.
- Chercher un helper de normalisation réutilisable.

## Pendant la correction

- Préférer un type explicite à un `Record<string, unknown>`.
- Préférer une validation à un cast.
- Préférer `unknown` à `any`.
- Garder les accès dynamiques dans un helper unique.
- Ajouter un guard clause plutôt qu'un `!`.

## Après la correction

- Vérifier que la logique métier n'a pas été simplifiée à l'excès.
- Ajouter ou adapter un test si la frontière de données a changé.
- Relancer `typecheck` et le lint de la zone touchée.
- Mettre à jour le backlog si le lot est volumineux.

## Règle finale

Si la correction masque le problème au lieu de le résoudre, elle est mauvaise.
