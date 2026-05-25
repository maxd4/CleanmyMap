# Progression & badges

## Fiche canonique

- **Route** : `/gamification`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/gamification/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Lire, comparer et partager les données de carte et d'impact.
- **Action principale attendue** : Explorer la carte ou lire les résultats.
- **Palette attendue** : red
- **Scope** : à valider
- **Terminée** : non
- **Couleurs actuellement détectées** : red — canvas #fee2e2, halo rgba(244, 63, 94, 0.22)
- **Incohérences de couleurs** : Pas d'incohérence détectée après réalignement; validation visuelle à confirmer.
- **Risque de conflit avec les couleurs existantes** : moyen : attention au chevauchement entre sky cartographique et rouge impact / alerte.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Carte
- légende
- chiffres clés
- résumés d'impact
- **Textes à réduire ou supprimer** :
- Commentaires de contexte
- badges de répétition
- cartes trop proches visuellement
- **Bulles / cartes / contextes trop nombreux** : Les widgets de lecture d'impact se superposent facilement avec la carte ou les stats.
- **Composants UI concernés** :
- Carte
- cards d'impact
- filtres
- legend
- tableaux / rapports
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

- [progression_badges.md](../../../../3-BLOC-VISUALISER&IMPACTER/progression_badges.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
