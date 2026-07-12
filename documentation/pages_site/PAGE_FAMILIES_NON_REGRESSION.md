# Mémoire de non-régression `page-families`

## But

Éviter une nouvelle dérive entre :

```txt
routes runtime
sections-registry
page-families
documentation/pages_site
sitemap
```

## Invariants

- une route canonique garde une fiche canonique unique ;
- `/` reste l'unique homepage canonique ;
- `/accueil` ne doit pas revenir comme alias caché ;
- le registre des familles vit dans `apps/web/src/lib/ui/page-families/families/registry.ts` ;
- les métadonnées partagées vivent dans `page-families.manifest.json` ;
- le mapping pathname → famille vit dans `resolve-page-family.ts` ;
- les exceptions nommées vivent dans `exceptions.ts` ;
- chaque exception est testée ;
- les docs ne recalculent pas seules une famille ou une couleur ;
- les captures restent centralisées au niveau du bloc ou de la famille.

## Générateur documentaire

`documentation/pages_site/generate-canonical-pages.mjs` ne doit plus :

```txt
réécrire INDEX.md
écraser les README enrichis
créer un photo/ par route
recalculer les couleurs dans une logique parallèle
```

Son rôle est désormais limité à l'audit de dérive.

## Vérification de dérive

Commande de diagnostic :

```bash
npm run audit:pages-site-drift
```

Mode strict :

```bash
npm run check:pages-site-drift
```

Le check compare :

```txt
page.tsx
sections-registry
INDEX.md
fiches canoniques
noyaux documentaires
```

## Routes de sections documentées à protéger

Les routes suivantes doivent résoudre vers leur famille métier :

```txt
/sections/elus                    → accueil-pilotage
/sections/route                   → agir
/sections/weather                 → agir
/sections/rejoindre-un-formulaire → agir
/sections/gamification            → cartographie-impact
/sections/community              → reseau-discussions
/sections/feedback               → reseau-discussions
/sections/actors                 → reseau-discussions
/sections/annuaire               → reseau-discussions
/sections/messagerie             → reseau-discussions
/sections/open-data              → reseau-discussions
/sections/funding                → reseau-discussions
/sections/trash-spotter          → reseau-discussions
```

## Sections volontairement non classées

Jusqu'à décision produit :

```txt
/sections/recycling
/sections/compost
/sections/climate
```

restent explicitement non classées dans `page-families`.

Ne pas leur attribuer une famille silencieusement.

## Exceptions actuelles

```txt
explorer-sommaire
methodologie-impact
weather-operations
join-group-form
reports-impact
partners-indigo
error-429
```

## Méthodologie

Le runtime actuel résout `/methodologie` avec la variante sky dédiée.

La documentation doit suivre ce comportement tant qu'une décision inverse n'est pas appliquée dans le code et les tests.

## Tests

Le resolver possède déjà une suite :

```txt
apps/web/src/lib/ui/page-families/resolve-page-family.test.ts
```

Elle doit couvrir :

- routes directes ;
- routes de sections documentées ;
- exceptions ;
- sections non classées ;
- fallback inconnu.

## Maintenance

Après une modification de route, de famille ou d'exception :

1. modifier le runtime ;
2. modifier ou ajouter le test ;
3. mettre à jour `INDEX.md` ;
4. mettre à jour la fiche concernée ;
5. lancer l'audit de dérive.
