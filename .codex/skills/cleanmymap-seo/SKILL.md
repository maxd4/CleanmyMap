---
name: cleanmymap-seo
description: "Indexabilité, SEO, canonical, metadata, JSON-LD, sitemap, robots et routes publiques CleanMyMap."
category: repository
risk: medium
source: local
tags: "[seo]"
---

# SEO des routes publiques

## Déclenchement

Activer pour métadonnées Next.js, sitemap, robots, canonical, redirections, indexabilité, JSON-LD, SEO/AEO/GEO ou modification susceptible de changer le contenu visible d'une page indexable.

## Sources

`documentation/seo/README.md`, `documentation/pages_site/INDEX.md` et fiche `CURRENT` de la route, `apps/web/src/lib/seo/indexability.ts`, `apps/web/src/app/sitemap.ts`, `robots.ts`, metadata/structured-data existants.

## Procédure

1. Classifier indépendamment `ACCESS` (`PUBLIC/HYBRID/PRIVATE`), `SEARCH` (`INDEX/NOINDEX`), `DISCOVERY` et `CANONICAL` selon la matrice courante.
2. Pour une page `HYBRID`, distinguer contenu publiquement indexable et mutations/données privées toujours protégées.
3. Déduire sitemap, robots, canonical et metadata de l'owner existant ; ne pas réintroduire un inventaire de routes parallèle.
4. Le JSON-LD doit décrire du contenu effectivement visible et prouvé. Ne jamais inventer note, événement, FAQ, agrément ou organisation constituée.
5. Ne pas indexer une route privée, un alias, un utilitaire ou une page provisoire par analogie avec des routes voisines.

## Validation

Inspecter HTML/métadonnées réellement rendus, canonical, sitemap, robots et tests de l'owner. La configuration Git ne prouve pas l'indexation actuelle par Google ; une donnée Search Console doit être observée explicitement.
