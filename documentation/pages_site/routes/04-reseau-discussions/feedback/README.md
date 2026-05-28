# Feedback

## Fiche canonique

- **Route** : `/sections/feedback`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/feedback-section.tsx`
- **Type fonctionnel** : rubrique cliquable — feedback
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : public
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Partager un bug, une amélioration ou une proposition de collaboration.
- **Action principale attendue** : Ouvrir la rubrique, choisir le bon questionnaire puis envoyer le retour.
- **Point d'entrée** : carte du bloc Réseau & Discussions dans le sommaire, menu déroulant du bloc dans la navbar, raccourci feedback de la barre supérieure.
- **Palette attendue** : pink
- **Scope** : terminé
- **Terminée** : oui
- **Couleurs actuellement détectées** : pink / rose — accent de formulaire et CTA de contact.
- **Incohérences de couleurs** : Aucune incohérence structurelle détectée avec le bloc 04; la section reste lisible comme rubrique réseau.
- **Risque de conflit avec les couleurs existantes** : moyen : la rubrique doit rester distincte des autres entrées de discussion sans dériver vers les couleurs d'accueil.
- **Niveau de surcharge textuelle** : moyen
- **Textes à conserver** :
- intitulé de la rubrique
- choix du questionnaire
- libellés de formulaire
- messages de confirmation
- contact direct
- **Textes à réduire ou supprimer** :
- rappels redondants
- explications longues sur les contrôles déjà visibles
- doublons entre questionnaires et aide générale
- **Bulles / cartes / contextes trop nombreux** : La page combine plusieurs canaux de retour, des cartes de questionnaires et un contact direct. La hiérarchie doit rester très lisible.
- **Accès bloc** : la page doit rester explicitement accessible comme rubrique du bloc Réseau & Discussions, pas comme page orpheline.
- **Composants UI concernés** :
- hero de section
- questionnaires
- cartes de retour
- CTA contact
- barre de navigation
- sommaire du site
- **Captures attendues** : desktop
- **Priorité de correction** : moyenne

## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la rubrique feedback.
- Le rendu est assuré par la route dynamique `/sections/[sectionId]` avec `sectionId = feedback`.
- Les autres chemins de rappel vers la rubrique doivent converger vers cette fiche sans recréer une entrée séparée dans un autre bloc.
