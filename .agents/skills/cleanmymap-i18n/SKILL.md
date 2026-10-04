---
name: cleanmymap-i18n
description: "Utiliser quand une tâche CleanMyMap touche locale, traduction, routage linguistique, formatage localisé ou catalogue de libellés multilingues réellement présent dans le dépôt."
category: repository
risk: medium
source: local
tags: "[i18n, locale, translation, formatting, nextjs]"
---

# CleanMyMap — i18n et libellés

## But

Éviter la duplication de vocabulaire et préserver les contrats de locale existants sans créer une infrastructure multilingue artificielle.

## Règles

- Pour l'application web actuelle, respecter l'invariant de textes publics en français défini par `apps/web/AGENTS.md`.
- N'introduire une traduction ou un nouveau locale que si le produit et les sources canoniques du domaine le prévoient réellement.
- Réutiliser les identifiants métier stables ; les modules métier ne doivent pas devenir propriétaires de variantes de libellés.
- Ne pas utiliser le texte affiché comme identifiant de rôle, statut ou catégorie.
- Centraliser un libellé seulement lorsqu'un catalogue/owner canonique existe ou qu'une vraie réutilisation le justifie.
- Préserver paramètres, pluriels, nombres, dates et unités via les primitives de formatage appropriées ; éviter la concaténation de fragments traduits.
- Ne pas traduire les clés techniques, identifiants, valeurs d'enum ou contrats API sans migration explicite.

## Validation

Vérifier la route/locale réellement concernée et les fallbacks existants. Une modification purement française ne doit pas déclencher la création d'une architecture i18n supplémentaire.
