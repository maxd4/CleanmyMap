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
- **Objectif utilisateur principal** : retrouver ses accès prioritaires, notifications, engagement et gestion du compte ; distinguer la lecture collective de son activité personnelle.
- **Action principale attendue** : Créer une action ou ouvrir un raccourci utile du quotidien.
- **Palette attendue** : amber / orange
- **Scope** : cockpit privé à cinq vues liées par `?tab=` ; pas de nouveau modèle métier.
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
- Le résumé KPI conserve la période, les unités et les limites de comparabilité ;
  ses libellés, états, CTA et interprétations suivent la locale active.
- Les alertes, justifications et CTA dynamiques du résumé sont localisés par
  message complet avec paramètres ; un texte inconnu reste intact et ne doit
  jamais être altéré par remplacement de fragment.
- Les interprétations `positive`, `negative` et `neutral` sont distinctes ;
  `neutral` ne porte pas de signal visuel de régression.
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

## Navigation et chargement

- Aujourd'hui (par défaut) : accès prioritaires du rôle actif, suivi des participations via le dossier d'engagement, historique terrain et profil. Aucun KPI collectif n'est présenté comme personnel.
- Notifications : centre de suivi existant, chargé seulement à l'ouverture.
- Indicateurs collectifs : agrégat de plateforme approuvé via `loadPilotageOverview`, comparaison sur 30 jours, dernière activité publiée disponible (qui peut être antérieure à la période), limites de source et recommandations ; aucun scope personnel implicite.
- Engagement : parrainages et classement global par consentement existant, accès au profil détaillé, erreurs de données indépendantes.
- Compte : rôle attribué, rôle actif, changement de parcours autorisé, lien vers l'évolution du compte et réglages. Aucune nouvelle mutation.
- Le raccourci « Mon organisation » est disponible dès qu'une adhésion organisationnelle active ou une invitation valide est liée au compte Clerk, quel que soit le rôle actif. Sa visibilité ne confère aucun droit : les données et mutations sont revalidées côté serveur par les API entreprise.
- Les onglets sont des liens de navigation avec `aria-current`, historique navigateur et préchargement désactivé. Une valeur inconnue ou multiple revient à Aujourd'hui. Aucun accès privé sans session, rappel de complétion conservé. Les modes changent la présentation, jamais les accès prioritaires.
- Les chargements collectif et engagement ne sont déclenchés que par la vue correspondante. Aucun polling ajouté.

## Notifications

- La section canonique est disponible à `/dashboard?tab=notifications#notifications`. L'ancienne ancre `/dashboard#notifications` ouvre cette vue par compatibilité.
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

- Référence legacy non versionnée dans le dépôt actuel ; consulter les documents canoniques de cette page et ne pas recréer l'ancien chemin.

## Notes d'audit

- Cette fiche est la source de vérité canonique pour la page.
- Les dossiers legacy de `documentation/pages_site/` restent lisibles pour transition, mais ils ne sont plus la référence principale.
