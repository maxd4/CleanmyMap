# Données publiques

## Fiche canonique

- **Route** : `/sections/open-data`
- **Fichier(s) source(s)** :
  - `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
  - `apps/web/src/app/(app)/open-data/page.tsx` (alias technique)
  - `apps/web/src/components/sections/rubriques/open-data-section.tsx`
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Accès runtime** : `public-visible` ; la page de présentation est lisible sans compte. Les éventuels accès d'API, exports ou données sensibles ne sont pas déduits de cette visibilité et relèvent de leurs contrats propres.
- **Objectif utilisateur principal** : Consulter une présentation publique des formats d'échange, des usages de données et des possibilités de réutilisation.
- **Action principale attendue** : Explorer les rubriques de présentation. Cette section n'est pas, à elle seule, une preuve qu'un téléchargement ou un export est déclenché depuis la page.
- **Palette attendue** : pink
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : violet / blanc — cartes et accents violet, fonds blancs et lavande.
- **Incohérences de couleurs** : Écart détecté : la famille documentaire attendue est `pink`, tandis que le composant utilise actuellement une identité violet / blanc.
- **Risque de conflit avec les couleurs existantes** : moyen : indigo et pink doivent rester distincts du légal et des zones techniques.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Messages clés
- liens de navigation
- CTA réseau
- état de participation
- **Textes à réduire ou supprimer** :
- Accroches longues
- cartes descriptives en doublon
- contextes trop bavards
- **Bulles / cartes / contextes trop nombreux** : Les listes d'acteurs, messages et cartes réseau peuvent saturer la colonne centrale.
- **Composants UI concernés** :
- Listes
- cartes discussion
- réseau / annuaire
- messagerie
- panneaux latéraux
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
- `/open-data` reste un alias de compatibilité vers cette section canonique.

## Fichiers associés

- [Présentation détaillée](./open-data-presentation-detaillee.md)
- [Liste des propositions à traiter](./open-data-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./open-data-objectifs-non-pertinents.md)
