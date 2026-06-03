# Gamification - Présentation détaillée

## Fiche canonique

- **Route** : `/gamification`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/gamification/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Lire, comparer et partager les données de carte et d impact.
- **Action principale attendue** : Explorer la carte ou lire les résultats.
- **Palette attendue** : red
- **Scope** : à corriger
- **Terminée** : non
- **Couleurs actuellement détectées** : slate — canvas #eef0f3, halo rgba(148, 163, 184, 0.18)
- **Incohérences de couleurs** : Écart détecté: attendu red, code actuel slate / neutral.
- **Risque de conflit avec les couleurs existantes** : moyen : attention au chevauchement entre sky cartographique et rouge impact / alerte.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Carte
- légende
- chiffres clés
- résumés d impact
- **Textes à réduire ou supprimer** :
- Commentaires de contexte
- badges de répétition
- cartes trop proches visuellement
- **Bulles / cartes / contextes trop nombreux** : Les widgets de lecture d impact se superposent facilement avec la carte ou les stats.
- **Composants UI concernés** :
- Carte
- cards d impact
- filtres
- legend
- tableaux / rapports
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique

## Rôle produit

La rubrique gamification sert à rendre lisible la progression personnelle, la reconnaissance utile et les paliers d engagement. Elle doit rester non compétitive, crédible et alignée avec la mission benevole du site.

## Ce que la rubrique montre

- progression visible;
- badges one-shot;
- badges infinis;
- badges réguliers;
- retours d impact;
- distinctions de confiance;
- surfaces de lecture calmes, pas un jeu mobile.

## Mécaniques récentes à garder visibles

- `Actions créées` reste le badge infini de base pour la contribution validée.
- `Équilibre des contextes` soutient l alternance entre spontané, association et entreprise avec des cycles croissants: 1, puis 2, puis 3 actions de chaque type, et remise à zéro entre chaque palier.
- `Régularité mensuelle` suit les mois calendaires de participation et se recalcule si une action est rejetée.
- `Zone sensible apaisée` compte les actions validées sur les zones critiques ou historiquement très sales.

## États à documenter

- **loading** : fond `slate`, skeletons sobres, loader discret, même largeur et mêmes espacements que les autres états.
- **empty state** : fond `slate` doux, ton encourageant, CTA utile unique.
- **access refused** : `slate` avec léger `red` / `orange`, ton neutre et professionnel, pas de dramatisation.
- **Architecture commune** : `SystemStateLayout`, `SystemStateIcon`, `SystemStateTitle`, `SystemStateDescription`, `SystemStateAction`, `SystemStateMeta`.
- **Variantes** : `variant="loading"`, `variant="empty"`, `variant="forbidden"`.
- **Règle** : aucune route de ce type ne doit avoir un état vide sans CTA utile.

## Références legacy

- [progression_badges.md](../../../../3-BLOC-VISUALISER&IMPACTER/progression_badges.md)

## Notes d audit

- Cette fiche est la source de vérité canonique pour la page.
- La source canonique des règles de gamification vit dans [gamification-SPEC_CANONIQUE.md](./gamification-SPEC_CANONIQUE.md).
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Liens de travail

- [Spécification canonique](./gamification-SPEC_CANONIQUE.md)
- [Liste des propositions à traiter](./gamification-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./gamification-objectifs-non-pertinents.md)
