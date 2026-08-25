# Messagerie

## Fiche canonique

- **Route** : `/sections/messagerie`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/messagerie/page.tsx`
- `apps/web/src/app/(app)/sections/[sectionId]/page.tsx`
- `apps/web/src/components/sections/rubriques/connect-section.tsx`
- `apps/web/src/components/chat/chat-shell.tsx`
- `apps/web/src/app/api/chat/inbox/route.ts`
- `apps/web/supabase/migrations/20260825210000_chat_dm_inbox_read_state.sql`
- **Type fonctionnel** : page de réseau
- **Famille / bloc fonctionnel** : Réseau & Discussions (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Objectif utilisateur principal** : Retrouver rapidement un échange privé et poursuivre le fil actif.
- **Action principale attendue** : Sélectionner une conversation, lire les messages réellement visibles et répondre.
- **Palette attendue** : pink
- **Scope** : lot 1 livré — boîte de conversations privées
- **Terminée** : lot 1 oui ; salons thématiques, Annonce/Relai et Sondage restent des lots séparés.
- **Données** : `app_messages` reste la source canonique ; aucune table de conversations n'est créée.
- **Lecture** : le compteur ne compte que les messages DM entrants après le curseur propre à `(user_id, peer_id)`.
- **Navigation** : `tab=dm`, `recipientId`, `recipientLabel` et `recipientHandle` restent compatibles avec les deep-links existants.
- **Responsive** : inbox puis fil avec retour sur mobile ; inbox et fil simultanés sur desktop lorsque l'espace le permet.
- **Composants UI concernés** : inbox DM, fil actif, sélection de destinataire et états loading/empty/error.
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : critique


## États à documenter

- **loading** : skeletons sobres dans la liste DM, sans conversation artificielle.
- **empty** : aucune conversation privée affichée ; la recherche de membre existante permet de démarrer un échange.
- **error** : erreur de chargement explicite avec réessai réel, sans faux compteur.
- **access refused / connexion indisponible** : l'API RLS renvoie l'état d'accès ou de disponibilité approprié.
- **fil actif** : les messages et pièces jointes existants restent dans le composant chat ; l'ouverture marque le fil lu de façon idempotente.



## Références legacy

- Aucun fichier legacy dédié.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- `/messagerie` reste un alias de compatibilité vers cette section canonique.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.

## Fichiers associés

- [Présentation détaillée](./messagerie-presentation-detaillee.md)
- [Liste des propositions à traiter](./messagerie-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./messagerie-objectifs-non-pertinents.md)
