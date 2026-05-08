# Guide Sécurité

Ce document donne le contexte de référence pour les zones sensibles de CleanMyMap.

## Ce qu'il faut protéger

- Routes publiques vs privées
- Indexation (`robots`, `sitemap`, `noindex`)
- Validation d'URL
- Regex à risque et ReDoS
- Rate limiting et anti-spam
- Secrets, variables d'environnement et permissions CI

## Règles de base

- Valider les entrées avant toute logique métier.
- Utiliser des helpers partagés plutôt que des validations locales dupliquées.
- Préférer le parsing explicite aux regex quand le format est structuré.
- Garder les réponses d'erreur homogènes sur les mêmes surfaces.
- Bloquer au plus tôt les surfaces privées ou sensibles.

## Helpers de référence

- `src/lib/security/validation.ts`
- `src/lib/seo/indexability.ts`
- `src/lib/auth/protected-routes.ts`
- `src/lib/community/discussion-rate-limit.ts`
- `src/lib/http/api-errors.ts`

## Checklists à appliquer

- Voir [README](./README.md)
- Voir [Contrôles avant merge](./PRE_MERGE_CHECKLIST.md)
- Voir [Référence rapide](./SECURITY_QUICK_REFERENCE.md)

## Si une modification touche une surface sensible

1. Vérifier si la route doit être publique ou privée.
2. Vérifier l'impact sur le sitemap et les robots.
3. Vérifier la validation d'entrée.
4. Vérifier les protections anti-spam et rate limits.
5. Lancer les tests de sécurité ciblés.
6. Vérifier qu'aucun secret n'a été introduit.

## Signal d'alerte

Bloquer immédiatement si:

- une URL est validée par substring
- une regex critique n'est pas bornée
- une page privée devient indexable
- un 429 public change de forme sans raison
- une permission GitHub Actions devient trop large
