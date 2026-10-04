---
name: cleanmymap-seo
description: "Utiliser quand une tâche CleanMyMap touche metadata Next.js, canonical, robots, sitemap, JSON-LD/schema.org, indexabilité ou contenu destiné aux moteurs de recherche."
category: repository
risk: medium
source: local
tags: "[seo, metadata, canonical, robots, sitemap, json-ld]"
---

# CleanMyMap — SEO

## But

Faire évoluer les surfaces indexables sans créer des métadonnées ou données structurées incohérentes avec le contenu réel.

## Règles

- Identifier la route et sa fiche/documentation canonique avant de modifier son contrat SEO.
- Utiliser les APIs metadata Next.js déjà propriétaires du domaine au lieu d'ajouter une seconde couche.
- Un canonical doit représenter l'URL de référence réellement voulue.
- `noindex`/robots est une décision de surface, pas une rustine pour masquer une page incohérente.
- Le sitemap doit être dérivé de sources canoniques quand c'est possible ; éviter les inventaires manuels parallèles.
- Le JSON-LD doit décrire du contenu réellement présent et vérifiable ; ne pas inventer note, organisation, événement ou métrique.
- Ne pas dupliquer les mêmes métadonnées dans plusieurs owners.
- Préserver les pages privées, admin et états non publics hors indexation selon le contrat existant.

## Validation

Vérifier la metadata générée, canonical/robots, sitemap ou structured data directement concernés. Une chaîne « SEO optimale » générique ne remplace pas les conventions et checks du dépôt.
