# Mon espace

## Fiche canonique

- **Route** : `/dashboard`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/dashboard/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Centraliser la synthèse, le pilotage et les réglages personnels dans une seule page de référence.
- **Action principale attendue** : Consulter l'état du compte, arbitrer une action ou ajuster ses paramètres.
- **Palette attendue** : amber / orange
- **Scope** : terminé
- **Terminée** : oui
- **Couleurs actuellement détectées** : amber/orange chaud — surfaces sombres, fond chaud, accents amber
- **Incohérences de couleurs** : plus d'incohérence structurante détectée sur la famille visuelle ciblée.
- **Risque de conflit avec les couleurs existantes** : faible : la logique warm doit rester distincte des blocs d'impact rouge et des blocs réseau/pink.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de page
- cartes métriques
- CTA de navigation
- indicateurs prioritaires
- **Textes à réduire ou supprimer** :
- Rappels redondants
- badges de contexte répétés
- blocs d'aide trop verbeux
- **Bulles / cartes / contextes trop nombreux** : Densité mieux maîtrisée, mais certains textes d'accompagnement peuvent encore être resserrés au fil des itérations.
- **Composants UI concernés** :
- Titre
- cards métriques
- CTA
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : faible


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [dashboard.md](../../../../6-PAGES-STANDALONE/dashboard.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page `Mon espace` fusionnée avec les informations de profil.
- Le chemin `/profil` est désormais un alias de compatibilité qui redirige vers `/dashboard`.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
