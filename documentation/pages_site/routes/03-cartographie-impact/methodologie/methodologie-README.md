# Méthodologie

## Fiche canonique

- **Route** : `/methodologie`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/methodologie/page.tsx`
- **Type fonctionnel** : rubrique cliquable — impact
- **Famille / bloc fonctionnel** : Cartographie & Impact (bloc)
- **Statut** : public
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Exposer la méthode de lecture de l'impact et les repères de synthèse.
- **Action principale attendue** : Consulter la méthodologie et les vues d'impact associées.
- **Point d'entrée** : CTA cliquable depuis les surfaces du bloc Cartographie & Impact, notamment `/actions/map`.
- **Palette attendue** : red
- **Scope** : terminé
- **Terminée** : oui
- **Couleurs actuellement détectées** : red — canvas #fee2e2, halo rgba(220, 38, 38, 0.24)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : la frontière rouge doit rester nette pour éviter la confusion avec les blocs d'impact et d'alerte.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- Titre de page
- cartes de synthèse
- CTA de navigation
- indicateurs prioritaires
- repères méthodologiques
- **Textes à réduire ou supprimer** :
- Rappels redondants
- badges de contexte répétés
- blocs d'aide trop verbeux
- **Bulles / cartes / contextes trop nombreux** : Le bloc mélange des cartes de lecture et des CTA, la densité doit rester maîtrisée.
- **Accès bloc** : la page doit rester explicitement accessible comme rubrique du bloc et non comme page isolée cachée dans un sous-menu.
- **Composants UI concernés** :
- Titre
- cards de synthèse
- CTA
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop
- **Priorité de correction** : faible

## Répartition des blocs

- **Quota** : s'appuie sur la fiche d'architecture `documentation/architecture/methodologie-fonctionnement-site.md` et sur le schéma de l'onglet `Plans et quotas`.
- **Rapport d'impact** : s'appuie sur le texte canonique `documentation/plans/rapport_impact/impact_IA.md` et sur le schéma de l'onglet `Impact carbone`.
- **Séparation attendue** : les deux blocs doivent rester indépendants, avec une logique de lecture différente et sans mélange entre quotas web et ACV d'impact.




## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- La page est structurée en deux blocs distincts: `Quota` et `Rapport d'impact`.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
