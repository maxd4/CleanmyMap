# Rejoindre une action - Présentation détaillée

## Fiche canonique

- **Route** : `/sections/rejoindre-une-action`
- **Dossier canonique** : `rejoindre-une-action`
- **Rôle** : permettre de rejoindre une action future ouverte ou de consulter les résultats publics d'une action passée.
- **Périmètre** : onglets futurs/passés, liste des actions futures, recherche, filtres, tri, demande de participation, annulation d'une demande, file de modération, suivi personnel, résultats finaux publics et confirmation avant action sensible.
- **États à documenter** : chargement, absence d'actions, erreur de chargement, file de modération vide, file de modération alimentée, modale de confirmation, accès refusé si le compte n'est pas disponible selon le contexte, annulation de demande, départ confirmé.
- **Composants concernés** : `SectionShell`, `PageHeader`, `JoinActionTabs`, `CmmButton`, modale de confirmation, cartes d'action, panneau de file de modération, suivi personnel.
- **Notes d'audit** :
  - le point d'entrée est la route `/sections/rejoindre-une-action` ;
  - l'ancien chemin `/sections/rejoindre-un-formulaire` redirige en conservant sa query string ;
  - l'onglet futur consomme les pré-actions ouvertes à la participation ;
  - l'onglet passé consomme une lecture publique dédiée des actions `post_action_complete`, sans `historyItems`, et permet un claim rétroactif séparé ;
  - seules les actions satisfaisant `isJoinableFuturePreAction(...)` remontent dans la liste : phase `pre_action`, statut `pending` ou `approved`, `moderation_visibility = visible`, `published_at != null`, début futur selon Europe/Paris et `groupJoinEnabled === true` ;
  - une action masquée par modération reste absente de la liste et du lien direct public ;
  - la gestion des demandes ne s'ouvre qu'après sélection explicite d'une action via `actionId` et confirmation des droits de revue par le serveur ;
  - le CTA principal oriente vers une demande d'inscription future, pas vers une création de rubrique distincte ;
  - le CTA secondaire sur une inscription existante permet l'annulation sans effacer l'historique ;
  - le vocabulaire UI actif est `Rejoindre une action`, avec `Actions futures` et `Actions passées`.

## Frontière inscription / participation

Avant l'action, les états et demandes affichés proviennent de
`action_registrations` et utilisent le vocabulaire de l'inscription : une
`Inscription confirmée` est une demande acceptée, pas une présence terrain.
Après l'action, un claim rétroactif ou une participation confirmée provient de
`action_participants` et utilise le vocabulaire de la participation. Le claim
reste soumis à la review prévue par le runtime et ne reconstitue pas
automatiquement les effectifs ou les résultats.

## Structure visuelle cible

- **Fil d'Ariane** : `Agir > Rejoindre une action`.
- **Hero** : fond vert très clair, titre large, sous-titre explicatif et illustration panoramique, sans pilule de contexte redondante.
- **Onglets** : `Action future` est sélectionné par défaut ; `Action passée` expose les résultats publics terminés. La navigation est une vraie tablist clavier et reste reflétée par `tab` dans l'URL.
- **Zone de recherche et filtres** : `Recherche`, `Filtres` et `Trier` sont visibles sur l'onglet futur ; Localisation, Période et Statut restent dans le panneau `Filtres`.
- **Bloc principal** : liste des actions futures ouvertes, avec vignette visuelle, métadonnées, badges d'état et CTA `Demander à participer` ou `Quitter` selon l'état de participation.
- **Colonne latérale** : raccourcis réellement utiles, suivi personnel compact et aide ; aucune colonne latérale disproportionnée sur mobile.
- **Bas de page** : file de demandes uniquement après sélection explicite d'une action et si `canReview` est vrai côté serveur, puis rappel de sécurité.
- **Interaction critique** : ouverture d'une modale avant validation d'une demande de participation.

## Intentions UI

- La page doit rester lisible sur desktop et mobile avec une largeur partagée, des cartes emerald cohérentes et une hiérarchie sans micro-typographie uppercase.
- Le vert doit rester la teinte dominante unique de la page.
- Les cartes, états loading/empty/error et zones tactiles suivent le même rythme de lecture ; les libellés utiles ne sont pas tronqués.
- Les états vides doivent proposer un CTA utile, pas une simple notice.
- La file de modération doit rester visible comme un bloc métier à part entière, et non comme un simple détail de la liste.
- Le retrait d'une inscription future doit conserver la trace dans `action_registrations` et rester visible dans l'historique de l'utilisateur.
- Une participation finale ne peut être créée que par un flux post-action dédié dans `action_participants`; elle reste distincte de l'inscription future.
