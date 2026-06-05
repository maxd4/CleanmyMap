# Formulaire de groupe

## Fiche canonique

- **Route** : `/sections/rejoindre-un-formulaire`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/rejoindre-un-formulaire-section.tsx`
- `apps/web/src/app/api/actions/group-join/route.ts`
- `apps/web/src/lib/actions/group-participation.ts`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Agir (bloc)
- **Statut** : finalisée
- **Contexte nécessaire** : Compte connecté pour rejoindre, affichage public possible des actions validées
- **Objectif utilisateur principal** : Rejoindre le formulaire d'une action déjà validée sans recréer une nouvelle action.
- **Action principale attendue** : Voir les actions approuvées, choisir celle à rejoindre, enregistrer la participation.
- **Palette attendue** : emerald
- **Scope** : finalisé
- **Terminée** : oui
- **Couleurs actuellement détectées** : emerald — canvas #e8f8ef, halo rgba(34, 197, 94, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : le vert doit rester distinct des panneaux de support et des surfaces techniques.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de rubrique
- CTA principal
- états de participation
- validation et erreurs
- **Textes à réduire ou supprimer** :
- Aides répétées
- cartes descriptives redondantes
- contextes décoratifs
- **Bulles / cartes / contextes trop nombreux** : La jonction de groupe doit rester lisible et éviter la multiplication des micro-blocs.
- **Composants UI concernés** :
- Hero
- cartes d'état
- CTA
- validation
- navigation de bloc
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible

## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant=\"loading\"`, `variant=\"empty\"`, `variant=\"forbidden\"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

## Références legacy

- [group-action.md](../../../../../features/group-action.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Le point d'entrée doit rester cohérent avec la rubrique `Formulaire de groupe` du bloc `Agir`.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
