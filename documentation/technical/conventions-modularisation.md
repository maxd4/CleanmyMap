# Conventions de modularisation

## Regles
- Preferer des modules metier courts, testes et nommes par domaine.
- Garder des facades d'exports pour limiter les ruptures d'import.
- Eviter les fichiers monolithiques en depassant les seuils lint (`max-lines`).

## Pattern recommande
1. `*.types.ts`
2. `*.formulas.ts` / `*.helpers.ts`
3. `*.data.ts`
4. `*.service.ts` ou facade domaine

## Validation minimale
- `npm -C apps/web run typecheck`
- `npm -C apps/web run lint`
- tests cibles des modules modifies
