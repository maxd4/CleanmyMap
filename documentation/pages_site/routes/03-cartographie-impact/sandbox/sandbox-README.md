# Sandbox carte

## Fiche canonique

- **Route canonique visible** : `/sections/sandbox`
- **Alias technique** : `/sandbox`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sandbox/page.tsx`
- `apps/web/src/components/sections/rubriques/sandbox-section.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Tester la carte sans toucher aux écrans métier.
- **Action principale attendue** : Explorer la carte d'entraînement ou lire les états techniques.
- **Palette attendue** : sky
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : sky / slate — rendu technique de test
- **Incohérences de couleurs** : Aucune incohérence bloquante pour la carte d'entraînement.
- **Risque de conflit avec les couleurs existantes** : moyen : la page doit rester distincte de la carte métier et des vues d'impact.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Carte
- légende
- états système
- contrôles techniques
- **Textes à réduire ou supprimer** :
- commentaires répétitifs
- cartes trop proches visuellement
- bulles d'aide trop verbeuses
- **Bulles / cartes / contextes trop nombreux** : La carte d'entraînement doit rester un espace de test lisible, pas une page de reporting.
- **Composants UI concernés** :
- Carte
- cards d'état
- filtres
- runbooks
- tableaux de contrôle
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

- [sandbox.md](../../../../3-BLOC-VISUALISER&IMPACTER/sandbox.md)

## Notes d'audit

- Cette fiche documente la carte d'entraînement du bloc.
- `/sandbox` est un alias technique vers `/sections/sandbox`.
- La source de vérité canonique d'usage est la page `Carte d'entraînement` du bloc `Cartographie & Impact`.
