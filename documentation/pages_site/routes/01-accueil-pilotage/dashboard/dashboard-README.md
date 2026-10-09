# Dashboard

## Fiche canonique

- **Route** : `/dashboard`
- **Fichier(s) source(s)** :
- `apps/web/src/app/(app)/dashboard/page.tsx`
- **Type fonctionnel** : page de bloc
- **Famille / bloc fonctionnel** : Accueil & Pilotage (bloc)
- **Statut** : protégé
- **Contexte nécessaire** : Compte connecté, parfois rôle ou profil spécifique
- **Complétion du compte** : Un profil incomplet affiche un rappel non bloquant ; la page reste accessible après le contrôle d'authentification.
- **Objectif utilisateur principal** : Lire sa situation immédiate, ses alertes et sa prochaine action depuis un cockpit court.
- **Action principale attendue** : Créer une action ou ouvrir un raccourci utile du quotidien.
- **Palette attendue** : amber / orange
- **Scope** : cockpit privé avec résumé décisionnel, notifications paginées, action prioritaire et accès rapides.
- **Configuration** : le dashboard expose un CTA secondaire vers `/reglages` ; les préférences, la confidentialité et la demande de suppression sont gérées sur cette surface canonique.
- **Terminée** : non
- **Couleurs actuellement détectées** : amber — canvas #fff2df, halo rgba(249, 115, 22, 0.26)
- **Incohérences de couleurs** : Aucune incohérence de couleur détectée avec la règle actuelle.
- **Risque de conflit avec les couleurs existantes** : moyen : la frontière rouge doit rester nette pour éviter la confusion avec les blocs d'impact et d'alerte.
- **Niveau de surcharge textuelle** : fort
- **Textes à conserver** :
- Titre de page
- cartes métriques
- CTA de navigation
- indicateurs prioritaires
- **Textes à réduire ou supprimer** :
- Rappels redondants
- badges de contexte répétés
- blocs d'aide trop verbeux
- **Bulles / cartes / contextes trop nombreux** : Le dashboard ne porte ni le workflow d'export/modération ni les comparaisons cartographiques détaillées, réservés aux surfaces dédiées.
- **Composants UI concernés** :
- Titre
- cards métriques
- CTA
- nav secondaire
- sidebar / ribbon
- **Captures attendues** : desktop, mobile
- **Priorité de correction** : moyenne

## Notifications

- La section canonique est disponible à l’ancre `/dashboard#notifications`.
- Elle lit exclusivement `public.app_notifications` via le client existant.
  La vue **À traiter** projette séparément, par lots bornés, les notifications
  correspondant aux identifiants métier encore pendants ; elle ne dépend donc
  pas de leur position dans l'historique. La vue **Informations** conserve une
  pagination chronologique initiale de 20 notifications puis des pages
  supplémentaires de 20 éléments.
- Le centre propose deux vues : **À traiter** pour les décisions encore
  ouvertes selon l’état métier canonique, et **Informations** pour les autres
  notifications. Une notification lue peut donc rester « À traiter » tant
  que sa demande métier n’a pas été décidée.
- Les boutons de décision sont exposés uniquement pour les événements métier
  autorisés : demandes de partage d’action, invitations `action_event` de
  sous-type `invitation` et demandes `action_event` de sous-type
  `registration_request`. Le centre recharge respectivement les demandes de
  partage et les inscriptions `action_registrations` `manual_add` `pending`,
  puis vérifie la correspondance avec l'événement `app_notifications` du même
  utilisateur avant affichage puis avant mutation ; aucune notification ne
  devient une seconde boîte métier. Une discordance est signalée, elle ne se
  transforme pas en liste vide présentée comme saine.
- La pagination suit un curseur stable sur `created_at DESC` puis `id DESC`;
  l’historique complet n’est jamais chargé en une seule requête et aucun
  polling supplémentaire n’est activé dans le Dashboard.
- La cloche utilise un décompte serveur exact des lignes `read_at IS NULL`,
  indépendant de sa prévisualisation limitée à quatre notifications. Les
  décisions encore ouvertes sont chargées en priorité dans cette prévisualisation,
  devant les informations récentes, même si leur événement est ancien. Le
  compteur « À traiter » reste séparé et provient des demandes métier encore
  pendantes ; il n'est pas déduit de `read_at`.
- Chaque notification affiche son type et son pictogramme, son état lu/non
  lu, sa décision éventuelle (en attente, acceptée, refusée, retirée, traitée
  ou indisponible), son titre
  et son contenu complets, sa date et son heure ainsi qu’une
  date relative. Le champ `payload` brut n’est pas affiché.
- Le bouton `Afficher plus` charge la page suivante jusqu’à l’épuisement de
  l’historique. L’état vide, le chargement, l’erreur et la fin de liste sont
  explicitement rendus.
- L’ouverture de la section ne marque aucune notification automatiquement;
  le marquage reste individuel et conserve les permissions Clerk/Supabase.


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

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
