---
name: cleanmymap-documentation
description: "Mettre à jour la documentation canonique CleanMyMap, les contrats et fiches route-first protégées sans duplication."
category: repository
risk: medium
source: local
tags: "[documentation]"
---

# Documentation canonique et fiches de pages

## Déclenchement

Activer quand un changement modifie durablement un contrat, une page, un comportement, une décision, la documentation ou un ADR.

## Sources

`documentation/AGENTS.md`, `documentation/README.md`, `documentation/development/DOCUMENTATION_POLICY.md`, `documentation/pages_site/README.md` et `INDEX.md`, puis le document propriétaire du domaine.

## Méthode

1. Localiser l'**owner canonique** et le statut `CURRENT`, `PLAN`, `AUDIT`, `HISTORY`, `SNAPSHOT`, `ADR` ou `GENERATED`. Un audit daté ne définit pas le runtime actuel.
2. Avant d'ajouter un document, rechercher une source appropriée ; modifier la seule règle propriétaire et lier les autres documents au lieu de recopier.
3. Décrire les conséquences durables : contrat, comportement, décision, limite, provenance, unités et hypothèses. Ne pas maintenir manuellement un inventaire entièrement dérivable du code.
4. Pour changement de page, mettre à jour seulement la fiche route-first `CURRENT` concernée. Structure et assets de `documentation/pages_site/routes/` restent protégés : pas de renommage, déplacement, nettoyage global ni régénération de captures hors autorisation explicite.
5. Si une fiche protégée devient fausse et ne peut être éditée selon le périmètre, signaler `DOCUMENTATION_DRIFT` avec chemin et contradiction.
6. Vérifier liens, statuts et checks documentaires ciblés sans lancer une réorganisation cosmétique.

## Sortie

Diff limité, sources modifiées, références mises à jour et preuve des checks exécutés. Les documents fournis par l'utilisateur restent les candidats autoritatifs de leur chemin pour le lot.
