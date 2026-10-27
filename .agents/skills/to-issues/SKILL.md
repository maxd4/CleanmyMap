---
name: to-issues
description: "Découper explicitement un chantier CleanMyMap en issues cohérentes et vérifiables, sans publication automatique."
category: workflow
risk: medium
source: local
tags: "[to, issues]"
---

# Découpage d'un objectif en issues exploitables

## Déclenchement

Activer sur demande explicite de découper une roadmap, PRD ou chantier en issues. **Ne pas publier** d'issues si l'utilisateur demande seulement une proposition.

## Méthode

1. Lire l'objectif déjà fixé, les contraintes, `main`, les contrats et issues existantes éventuellement liées.
2. Identifier les responsabilités réellement indépendantes et leurs dépendances. Chaque issue doit apporter une capacité vérifiable ou un contrat cohérent complet.
3. Ne pas diviser un même invariant en « API », « types », « tests » et « documentation » séparés : ils appartiennent au même lot.
4. Séquencer seulement pour migration à risque, frontière autonome, autorisation humaine ou déploiement distinct.
5. Pour chaque issue : finalité, comportement attendu, limites, modules concernés, invariants, validation, `STOP CONDITION` et dépendance explicite.
6. Vérifier les doublons et le vocabulaire des labels existants plutôt que supposer `ready-for-agent` ou une taxonomie externe.

## Sortie

Issues rédigées et priorisées dans la réponse. Publication et modification des labels uniquement par un intégrateur autorisé, sur demande explicite ; ChatGPT prépare le contenu sans modifier GitHub.
