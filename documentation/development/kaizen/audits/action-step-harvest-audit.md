# Audit Kaizen Harvest

Date: 2026-05-06  
Fichier cible principal: `apps/web/src/components/actions/action-declaration/ActionStepHarvest.tsx`

## Décisions prises

- Les calculs dérivés du harvest sont maintenant mémoïsés dans `use-harvest-logic.ts` pour éviter de recalculer les benchmarks, deltas et conversions à chaque frappe.
- Les valeurs numériques sont bornées avant usage:
  - poids déchets: `0..100`
  - poids mégots: `0..100`
  - nombre de mégots: `0..10000`
  - bénévoles: minimum `1`
- Les handlers de synchronisation ne propagent plus de valeurs aberrantes dans les conversions.
- Le slider visuel possède maintenant un `id` explicite et un `aria-labelledby` associé.
- Les champs poids / état / nombre des mégots et le champ déchets ont des identifiants stables pour l'accessibilité.

## Points vérifiés

- Le mode `clean_place` reste inchangé.
- Les jauges et comparaisons par bénévole restent cohérentes.
- Les champs texte conservent leur comportement contrôlé.
- Le build Next.js passe après les ajustements.
- Aucun changement de dépendance.
