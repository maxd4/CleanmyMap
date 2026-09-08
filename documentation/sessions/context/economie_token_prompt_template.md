# Prompt opérationnel — structure canonique

Ce canevas réduit le contexte répété sans remplacer `AGENTS.md`, les règles
scoped, les contrats métier ou les sources canoniques du dépôt. Ne pas y
recopier la stack, l'historique du projet ou les règles générales.

## OBJECTIF

[Résultat concret attendu pour cette tâche uniquement]

## SOURCES / FICHIERS À RELIRE

- `AGENTS.md` et le `AGENTS.md` scoped applicable.
- Sources canoniques directement concernées : [chemins précis].
- Callers, consommateurs, tests ou migrations à vérifier : [chemins précis].

## PÉRIMÈTRE

- Inclus : [fichiers, routes, contrats ou surfaces concernés].
- Exclu : [zones à préserver explicitement].

## CHANGEMENT

[Description courte du changement à appliquer, sans recopier la gouvernance
existante]

## INVARIANTS

- [Contrats métier, sécurité, données ou compatibilité à préserver]
- [Comportements ou fichiers qui ne doivent pas changer]

## VALIDATIONS

- [Commande ciblée obligatoire]
- [Tests, lint, typecheck, build ou audit justifiés par le périmètre]
- Vérifier le diff exact et signaler séparément les échecs préexistants ou
  liés à un chantier parallèle.

## STOP CONDITION

[Preuve observable permettant de déclarer la tâche terminée ; sinon décrire le
blocage précis et ne pas élargir le périmètre]
