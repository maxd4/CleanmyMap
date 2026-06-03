# Carte des actions

## Présentation détaillée

- [Fiche de présentation métier](./PRESENTATION.md)
- [Idées non pertinentes](./IDEES_NON_PERTINENTES.md)

## Logique de score

- 2 scores séparés sur `100`
- score déchets = `kg / bénévole`
- score mégots = `mégots / bénévole`
- référence = plus grosse action par bénévole sur les actions approuvées
- nouvelle action au-dessus du max = nouvelle référence
- référence chargée une fois par page
- même référence pour carte, popup et tableau
- popup chargé à la demande, sans fetch score séparé
- regroupement adaptatif des points en zone dense
- export PNG et GeoJSON de la vue courante
- score déchets = `clamp((kg / bénévole / réf déchets) * 100, 0, 100)`
- score mégots = `clamp((mégots / bénévole / réf mégots) * 100, 0, 100)`
- score global = `max(score déchets, score mégots)`
- aucun mélange
- aucune pondération
- recalcul au prochain fetch
- invalidation automatique après une validation `approved`
- carte = même référence partagée
- popup = même référence partagée
- tableau = même référence partagée
- recherche de zone hors carte
- filtre texte sur lieu, quartier, arrondissement, commune

## Lecture rapide

- bleu = `0` déchets et `0` mégots
- vert = score global `< 30`
- jaune = score global `30-79`
- violet = score global `>= 80`
- bac = besoin collecte
- cendrier = besoin mégots
- combiné = 2 besoins
- seuil infra = `75`

## Fiche canonique

- **Route** : `/actions/map`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/actions/map/page.tsx`
- **Type fonctionnel** : page d'action
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Lire, comparer et partager les données de carte et d'impact.
- **Action principale attendue** : Explorer la carte ou lire les résultats.
- **Palette attendue** : sky
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : sky — canvas #ddf3fd, halo rgba(14, 165, 233, 0.26)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
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
- **Priorité de correction** : faible


## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.



## Références legacy

- [carte_actions.md](../../../../3-BLOC-VISUALISER&IMPACTER/carte_actions.md)

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
