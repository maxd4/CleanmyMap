# Réseau & Discussions

Groupes de discussion, annuaire des acteurs et données publiques.

## Fiche de bloc

- **Nom canonique** : Réseau & Discussions
- **Dossier canonique** : `04-reseau-discussions`
- **Snapshots** : colocalisés dans le dossier de chaque page canonique.

## Inventaire des pages

L’inventaire exhaustif des routes canoniques, alias et fiches est tenu dans
[`INDEX.md`](../../INDEX.md). Le contrat de famille runtime est décrit dans
[`PAGE_FAMILIES.md`](../../PAGE_FAMILIES.md).

## Règles

- les statuts de présentation anonyme viennent de `apps/web/src/lib/sections-registry/config.ts` et sont appliqués par `apps/web/src/app/(app)/sections/[sectionId]/page.tsx` ;
- `disabled` et `blur` ne doivent pas être résumés par le vague mot `protégé` ;
- les alias ne reçoivent pas une seconde fiche canonique du contenu ;
- les snapshots sont placés sous `screenshots/desktop/` ou `screenshots/mobile/`
  dans la page canonique concernée.

## Navigation primaire

`apps/web/src/lib/navigation.ts` est la source canonique de la navigation par
profil. Dans le bloc `network`, les entrées visibles sont exactement les trois
surfaces suivantes, dans cet ordre :

1. Groupes de discussion (`/sections/messagerie`)
2. Annuaire des acteurs (`/sections/annuaire`)
3. Données publiques (`/sections/open-data`)

Feedback (`/sections/feedback`) et Soutenir CleanMyMap
(`/sections/funding`) restent accessibles par leurs liens directs et leurs CTA,
mais ne sont pas des entrées supplémentaires du bloc `network`. Les anciennes
URL `/community` et `/sections/community` redirigent vers
`/sections/rejoindre-une-action`. Les alias partenaires redirigent vers
`/sections/annuaire`, sans conserver un onglet de l’ancienne page.

L’accueil et `/explorer` utilisent les mêmes priorités de preview exportées par
`apps/web/src/lib/accueil/navigation.ts`.

Les sections `open-data` et `annuaire` partagent la famille visuelle violette
existante, avec des surfaces blanches/lavande ; aucune palette locale
supplémentaire n’est introduite. Le renderer commun reste
`apps/web/src/components/sections/rubriques/section-renderer.tsx`.
