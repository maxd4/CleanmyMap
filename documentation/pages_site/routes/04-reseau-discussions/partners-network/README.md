# Réseau engagé

## Fiche canonique

- **Route** : `/partners/network`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/partners/network/page.tsx`
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Faire circuler l'information et faciliter les échanges entre acteurs.
- **Action principale attendue** : Lire, contacter ou rejoindre une discussion / un réseau.
- **Palette attendue** : indigo
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : indigo — canvas #e8e9fc, halo rgba(99, 102, 241, 0.22)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : indigo et pink doivent rester distincts du légal et des zones techniques.
- **Niveau de surcharge textuelle** : fort
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
- **Priorité de correction** : moyenne


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [reseau_engage.md](../../../../4-BLOC-RESEAU&DISCUSSION/reseau_engage.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
