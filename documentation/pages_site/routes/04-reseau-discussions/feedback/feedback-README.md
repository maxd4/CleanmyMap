# Idées et problèmes

## Fiche canonique

- **Route** : `/sections/feedback`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/feedback-section.tsx`
- **Type fonctionnel** : rubrique cliquable — feedback
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : public
- **Contrat SEO** : `ACCESS=PUBLIC`, `SEARCH=NOINDEX`, `DISCOVERY=INTERNAL_ONLY`, `CANONICAL=NONE`. Le feedback reste accessible par les parcours du produit, sans devenir une page de recherche autonome.
- **Contexte nécessaire** : Aucun
- **Objectif utilisateur principal** : Partager un bug, une idée, une amélioration ou une proposition de collaboration, puis retrouver ses propres retours.
- **Action principale attendue** : Ouvrir la rubrique, choisir l'un des quatre questionnaires puis envoyer le retour.
- **Contrat de saisie court** : le bug demande l'action effectuée, ce qui s'est produit et le résultat attendu ; l'idée ou l'amélioration demande le besoin/problème et la proposition, avec l'utilité facultative. Le titre est proposé depuis les réponses lorsqu'il est laissé vide et reste éditable.
- **Collaboration** : les champs métier de structure, objet, contribution et prochaine étape sont conservés.
- **Capture Bug facultative** : un utilisateur connecté peut joindre une image JPEG, PNG ou WebP de 5 Mo maximum. L'aperçu est local avant l'envoi ; la capture est stockée dans le bucket privé existant et n'est lisible que par son propriétaire ou un administrateur autorisé, via une URL signée à durée limitée.
- **Boucle propriétaire** : Le bloc `Mes retours` est visible dans la page Feedback ; après connexion, il lit uniquement les retours du compte Clerk courant via `GET /api/community/bug-reports`, avec une projection minimale et une pagination stable.
- **Statuts affichés** : `new`, `pending`, `responded`, `treated` et `archived` sont lus depuis l'état persistant du retour. Le contenu d'une réponse privée reste dans la messagerie existante.
- **Point d'entrée** : carte du bloc Réseau & Discussions dans le sommaire, menu déroulant du bloc dans la navbar, raccourci feedback de la barre supérieure.
- **Export administrateur** : depuis la boîte créateur, un administrateur peut copier un Markdown structuré ou un dossier d'analyse IA dans le presse-papiers local. L'export exclut les emails, identifiants de session, query strings privées, tokens et médias ; le contenu utilisateur y est cité comme donnée non fiable.
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
- sélection de quatre questionnaires et formulaire canonique
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
- Une pièce jointe en échec ne transforme pas l'envoi du feedback en faux succès silencieux : la référence du feedback reste disponible et l'interface indique que la capture n'a pas été jointe.

## Fichiers associés

- [Présentation détaillée](./feedback-presentation-detaillee.md)
- [Liste des propositions à traiter](./feedback-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./feedback-objectifs-non-pertinents.md)
