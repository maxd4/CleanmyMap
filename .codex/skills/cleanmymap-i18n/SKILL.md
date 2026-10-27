---
name: cleanmymap-i18n
description: "Langue française, textes d interface, traductions, pluriels, nombres, dates et vocabulaire métier CleanMyMap."
category: repository
risk: medium
source: local
tags: "[i18n]"
---

# Langue, formatage et vocabulaire

## Déclenchement

Activer pour contenu francophone, libellés, traduction, pluralisation, chiffres/dates/unités, locale URL ou catalogue de textes.

## Contrats

`apps/web/AGENTS.md`, `apps/web/src/lib/domain-language.ts`, règles de navigation et propriétaires des catalogues existants. Les textes publics web restent en français selon la gouvernance courante, sauf décision produit explicite.

## Méthode

1. Chercher l'identifiant métier stable : statut, rôle, catégorie, badge et permission ne sont jamais dérivés du libellé visible.
2. Identifier le propriétaire courant de l'affichage ; une variation locale ne justifie pas un moteur i18n ou un catalogue global supplémentaire.
3. Préserver sens, unité, grammaire française, lisibilité des erreurs, accentuation, pluriels et valeurs inconnues.
4. Pour nombre/date/unité, utiliser le formateur existant ; pour un score stocké de 0 à 100, afficher en `%` via l'owner du domaine, sans modifier la valeur.
5. Ne pas transformer les clés API, enums persistées ou routes en chaînes traduites sans migration et consommateurs mis à jour.

## Validation

Vérifier le parcours public/privé réellement touché, les chaînes longues sur mobile, l'accessibilité et les fallbacks. Ne pas annoncer une internationalisation complète après une simple traduction de page.
