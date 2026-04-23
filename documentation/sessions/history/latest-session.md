# Latest Session

Updated: 2026-04-23

## Done
- **Nettoyage historique GitHub Actions** : suppression de tous les runs en échec visibles via l’API pour `maxd4/CleanmyMap`, avec vérification finale qu’aucun run `failure` ou `cancelled` ne restait listé.
- **Académie du Climat - ateliers structurés** : ajout d’un espace dédié dans l’annuaire pour les prochains ateliers, classés par type `social / humanitaire / environnemental`, avec masquage automatique des catégories vides, tri par date à venir et sources officielles reliées à chaque atelier.
- **Académie du Climat - social renforcé** : seconde passe sur les ateliers officiels avec ajout d’entrées plus ciblées pour la catégorie `social`, dont `Inventons nos CHOUETTES vies bas carbone – dès 9 ans !` et `Atelier 2tonnes : comment agir pour le climat ?`, afin d’étoffer les ateliers collectifs et d’éducation à l’action.
- **Navigation plus claire** : le bandeau garde sa structure actuelle, le breadcrumb applicatif est devenu plus explicite sur desktop avec la hiérarchie bloc/rubrique, et un bouton `Explorer` ouvre désormais un plan du site dédié.
- **Bandeau compact** : le titre statique du site affiche désormais `Agir-Cartographier-Préserver` sur une seule ligne, et le slogan réutilisé dans les pages concernées a été harmonisé avec ce format sans points.
- **Annuaire partenaires - tests de contenu et crédibilité locale** : ajout de tests qui interdisent les liens `example.com`, vérifient la présence d’au moins un commerce partenaire réellement engagé, et valident la relecture des demandes onboarding avec un chemin de publication vers l’annuaire; les fiches partenaires actives affichent aussi désormais une phrase explicite sur leur utilité locale.
- **Annuaire partenaires - UX resserrée** : les fiches n’exposent plus que deux actions principales au maximum, la carte a perdu les CTA secondaires redondants, et le dashboard utilise des libellés plus courts pour éviter les répétitions entre répertoire, fiches et vue réseau.
- **Annuaire partenaires - crédibilité renforcée** : les fiches publiques refusent désormais les liens placeholders, les commerces/partenaires doivent rester complets avec canal public, zone et fraîcheur minimale, et les fiches non confirmées par un humain sont visuellement distinguées des partenaires vérifiés.
- **Sync réel carte aligné** : `sync-real-data-from-sheet.mjs` suit maintenant le même schéma que l’import structuré, avec `Départ / Arrivée / Type de Lieu / Qualité Mégots`, des métadonnées de trajet sérialisées dans les notes et un store local `real_records.json` compatible avec la carte du site.
- **Onboarding partenaire structuré** : les champs `coverage` et `availability` du formulaire partenaire passent maintenant en objets normalisés, avec arrondissements/quartiers pour le périmètre et créneaux/plages pour la disponibilité, tout en conservant une compatibilité de lecture pour les anciennes demandes texte.
- **Réseau séparé en 3 usages** : la vue `Découvrir le réseau` est désormais publique et centrée sur la carte et les fiches, la vue `Gouvernance / pilotage` reste dédiée aux stats et aux demandes, et la vue `Rejoindre le réseau` conserve uniquement l’onboarding.
- **Import Google Sheet - nouvelle structure** : le builder d’import accepte maintenant les colonnes `Départ / Arrivée / Type de Lieu / Qualité Mégots`, reconstitue un trajet géocodé avec polyline dans les notes techniques, et le pipeline Supabase / carte relit ces métadonnées pour afficher les actions sur le plan.
- **Onboarding partenaire → fiche publiée** : chaque demande partenaire crée désormais aussi une fiche publiée “à revalider” dans l’annuaire via un store dédié, puis la rubrique `annuaire` et les vues réseau fusionnent le seed avec ces fiches publiées pour éviter que la collecte reste invisible côté publication.
- **Annuaire partenaires - fiche Green Flex** : remplacement du lien placeholder `example.com/green-flex` par le site officiel `greenflex.com` dans le seed de l’annuaire, afin de garder le réseau crédible.
- **Blocages harmonisés** : les écrans de connexion utilisent maintenant la même formulation de base partout, avec `Connexion requise`, `Cette fonctionnalité nécessite une connexion Clerk.` pour les écrans floutés et `Cette vue reste lisible, mais les actions sont réservées aux comptes connectés.` pour les écrans désactivés.
- **Rubriques bilingues - seconde passe** : les rubriques elles-mêmes ont été repassées en `fr/en` sur les derniers libellés isolés, avec les écrans `guide`, `sandbox`, `élus`, `annuaire`, `community`, `trash-spotter` et `route` branchés sur `useSitePreferences` pour éviter les textes français restants quand la langue du site passe en anglais.
- **Texte inclusif harmonisé** : les libellés de l’annuaire et des rubriques ont été réécrits avec une forme inclusive cohérente là où c’était pertinent, afin d’éviter les formulations genrées ou trop neutres dans les fiches publiques.
- **Clôture de la matrice d'accès Clerk** : la seconde passe a harmonisé les états de blocage, renforcé le garde générique avec un `aria-hidden` sur les contenus verrouillés, et validé le typage après les derniers ajustements des écrans protégés.
- **Matrice d'accès Clerk appliquée** : les routes privées sont maintenant classées page par page en `visible`, `visible mais désactivé` ou `flou + accès Clerk requis`, avec un helper centralisé et des gardes d'écran adaptés sur le dashboard, le formulaire bénévole, les profils, le parcours, le partenaire onboarding, les partenaires réseau, le sponsor portal et les rubriques sensibles.
- **Accueil public et navigation ouverte** : la page d’accueil n’est plus un portail d’authentification, elle propose un bouton `Visiter le site` vers un bloc de découverte avec aperçu dashboard et rappel du formulaire bénévole, tandis que `Apprendre` et `Générer un livrable` restent accessibles sans compte.
- **Accueil - formulaire en premier plan** : le bloc bénévole a été remonté dans le hero de la page d’accueil pour le rendre visible dès le premier écran, avec une carte d’accès directe au formulaire et un rappel clair du passage à Clerk seulement au moment de déclarer.
- **Accueil - hero mobile compact** : le hero a été raccourci sur petits écrans, avec typo, boutons et carte bénévole allégés et les statistiques secondaires masquées sur mobile pour limiter le scroll avant l’accès au formulaire.
- **Annuaire partenaires** : ajout de Klin d'oeil (`klindoeil.com`) dans les partenaires/commerçants engagés, avec ancrage Bas Belleville, rue Deguerry, et mention de leur carte des bonnes adresses.
- **Annuaire partenaires - second balayage** : suppression du faux canal public Facebook du collectif `Eco-anxiété`, avec rendu tolérant quand une fiche n'a pas encore de contact public vérifiable.
- **Annuaire partenaires - revue admin** : remplacement du faux statut `draft_published` par un vrai cycle de revue `pending_admin_review / accepted / rejected`, avec filtrage public sur les fiches acceptées et une route admin de validation dédiée.
- **Annuaire partenaires - découpage lisible** : la rubrique a été séparée en zones distinctes pour la découverte, le pilotage et la gouvernance, afin d’éviter un seul écran trop dense avec recherche, carte, cartes compactes, recommandations, dashboard et retours.
- **Partenaires - séparation vitrine / décision** : la page `network` a été recentrée sur la découverte du réseau et les points de repère publics, tandis que `dashboard` a été recentrée sur la supervision, les décisions et la revue des fiches publiées.
- **Mode d'affichage persistant** : le mode d'affichage est maintenant relu depuis Clerk côté serveur, initialisé au démarrage du shell, et persiste via une mutation `/api/account/display-mode` sans ajout de garde-fou métier.
- **Exports livrables par périmètre** : le rapport web et les exports admin acceptent désormais `global`, `compte`, `association` et `arrondissement`, avec un scope unique branché sur les routes de consultation et les boutons d’export.
- **Rapport d'impact PDF renforcé** : ajout d'une couverture institutionnelle en tête du rapport web, avec narration budgétaire, indicateurs de crédibilité, messages pour élus, et export print plus formel pour les livrables PDF.
- **Mutation de rôle Clerk verrouillée** : le badge rôle déclenche maintenant une mutation serveur vers Clerk pour les profils self-service uniquement (`benevole`, `coordinateur`, `scientifique`), avec synchro Supabase après update, refus explicite des rôles `admin`/`elu`, et protection middleware dédiée sur `/api/account`.
- **Élargissement par défaut des vues partenaires** : le tableau de bord réseau s’appuie désormais sur l’annuaire complet pour ses compteurs de base, les pages `partners/dashboard` et `partners/network` calculent la couverture territoriale sur l’ensemble du répertoire, et le portail sponsors affiche maintenant un périmètre observé plus large avec un rappel concret des zones suivies.
- **Déclarer - expérience mobile** : le formulaire a été réordonné pour mobile-first avec la colonne de saisie prioritaire, des boutons plus larges, des cartes plus compactes et un feedback après envoi plus lisible sur petit écran.
- **Déclarer - poids et photos** : le bloc poids a été rendu plus central avec une saisie prioritaire, une aide vision non intrusive et un marquage d’écart suspect; le bloc photos reste optionnel, replié par défaut, et n’alimente l’entraînement que si des images sont fournies.
- **Déclarer - base + lieu/tracé** : suppression de la duplication des champs de parcours dans le composant secondaire, avec un bloc `Lieu / tracé` unifié dans le formulaire principal, aperçu live conservé, coordonnées et message d’ajustement relégués en secondaire.
- **Déclarer - largeur de formulaire** : le formulaire bénévole a été remis en flux plein largeur en supprimant la séparation en deux colonnes, afin que l’assistance cartographique ne réduise plus la place disponible pour la saisie principale.
- **Déclarer - parcours simplifié** : ajout d’un chemin visible `1. Localiser / 2. Tracer / 3. Valider`, renommage de l’assistance cartographique en `Tracer la zone sur la carte`, et repli des options avancées derrière un seul pliage plus lisible.
- **Rubriques bilingues** : les gabarits communs `DecisionPageHeader` et `PageReadingTemplate` basculent maintenant leurs libellés de section en anglais quand la langue du site passe à `en`, ce qui évite les intitulés de surface restés en français.
- **Formulaire bénévole** : le lieu de parcours est maintenant saisi via deux champs distincts `départ` / `arrivée`, avec libellé de route dérivé en arrière-plan et logique de boucle si `arrivée` est vide.
- **Cas d'apprentissage clarifié** : les photos concernent désormais explicitement les sacs de déchets collectés, et la masse réelle saisie dans le formulaire est le label d'entraînement pour la future prédiction IA.
- **Vision de terrain** : le formulaire bénévole accepte désormais des photos, infère des variables intermédiaires éditables (`nombre de sacs`, `taille`, `remplissage`, `catégorie`, `mégots`) et pré-remplit le poids avec intervalle + confiance quand le signal est suffisant.
- **Boucle d’apprentissage** : ajout de la table `training_examples`, persistance best-effort des exemples photo/poids, et métriques de dataset sur le dashboard (`MAE`, `RMSE`, version modèle, warning dataset faible).
- **Tracé auto** : la création d’action dérive maintenant une géométrie automatique depuis départ/arrivée ou un fallback de zone quand pertinent, sans perturber le flux simple sans départ/arrivée.
- **Sandbox de visualisation** : la sandbox est désormais une rubrique dédiée du bloc `Visualiser`, avec route sectionnée et lien de découverte depuis la page carte.
- **Niveaux de confiance** : suppression des libellés visibles de confiance/fiabilité dans les rubriques, avec déplacement de la méthode dans des panneaux repliables sur `climate`, `weather`, `compare` et `gamification`.
- **Rubriques au-dessus du fold** : déplacement du contenu secondaire sous la première zone visible sur `dashboard`, `reports`, `community`, `annuaire` et `learn/hub`.
- **Formulaire bénévole** : le composant visible réutilise maintenant le builder de payload testé et le client HTTP retente en format legacy si le payload contractuel est rejeté.
- **Validation** : ajout d’un test de route `POST /api/actions` et d’un test de fallback HTTP, avec `typecheck` et `test:regression-gates` au vert.
- **Navigation mobile** : Le ruban fixe du bas affiche désormais les blocs et les rubriques du bloc actif, avec accès direct aux pages et tracking conservé.
- **Bloc Piloter** : ajout d’un fallback visuel pour éviter un bloc vide dans la navigation quand aucun item métier n’est disponible pour un profil, sans dupliquer les routes dans le mapping source de vérité.
- **Aperçu trajet live** : le formulaire bénévole calcule maintenant le tracé dès la saisie départ/arrivée, propose un mode de route `souple` par défaut, et ajoute un message d’ajustement transmis avec l’action pour affiner le trajet avant validation.
- **Vision sans auto-remplissage** : les photos des sacs servent à prédire la masse et à comparer cette prédiction à la masse réelle saisie, mais le formulaire ne remplit plus automatiquement les réponses; il affiche seulement des valeurs conseillées en fond gris.
- **Précisions d'entraînement simplifiées** : le formulaire bénévole ne conserve plus que `masse`, `nombre de sacs`, `remplissage` et `densité`; les précisions restent facultatives derrière une case dédiée, avec remplissage limité à 25/50/75/100 et densité `sec / humide dense / mouillé`.
- **Photos facultatives** : les photos des sacs collectés sont maintenant explicitement marquées comme optionnelles dans le formulaire; sans photo, la soumission reste possible et aucun exemple d'entraînement n'est créé.
- **Écart suspect** : ajout d'un marquage visuel sur la masse, le nombre de sacs, le remplissage et la densité quand la saisie humaine s'éloigne nettement de la suggestion vision, sans bloquer la soumission.
- **Badges gamification** : les badges de progression et d’identité utilisent maintenant de vrais pictogrammes Lucide cohérents avec leur sens, au lieu d’acronymes textuels.
- **Déclarer, couche 1** : le formulaire bénévole a été remis en hiérarchie mobile-first avec le poids avant les enrichissements, et les photos + précisions IA repliées par défaut pour laisser le parcours rapide au premier écran.
- **Messagerie PRO** : Implémentation du `ChatShell` (DMs, Mentions `@user`, Salons Régionaux par voisinage).
- **Notifications In-App** : Création de la "Centrale App" (`NotificationBell`) intégrant tous les types d'alertes et supprimant les emails automatiques (Sobriété Numérique).
- **Retour Haptique** : Ajout de vibrations (standards et succès majeurs) pour améliorer l'expérience mobile-first.
- **Sécurité Hardening** : API rate-limiting (quotas de messages), standardisation des erreurs 401/403 et isolation des rôles (Admins, Élus, Coordinateurs).
- **Rétention de Données** : Procédure SQL de purge automatique (messages 6 mois, médias 1 mois).
- **Newsletter** : Table de souscription Supabase et API opt-in fonctionnelle.
- **Gamification** : Logique de détection de "Level Up" et notifications d'engagement automatiques.
- **Profils** : Synchronisation des `@handle` uniques depuis Clerk vers Supabase avec support de modification.
- **CI/CD Fixes** : Résolution des erreurs GitHub Actions (fichiers lourds, TypeScript, middleware/proxy migration, vulnérabilités npm).

## In Progress
- Intégration API Cleanwalk.org (Message type envoyé, en attente de réponse).

## Next
- Finaliser le Dashboard de pilotage Administrateur avec les vues "Gouvernance".
- Enrichir le mode "Science" avec les formules de calcul d'impact affichées en tooltips.
- Validation finale du parcours utilisateur "Mobilisation" avec les nouveaux outils de chat.

## Risks
- Le nettoyage Vercel n’a pas pu être exécuté depuis cet environnement faute de jeton/API CLI Vercel disponible; seul le dossier `.vercel` local du projet a confirmé le rattachement du projet.
- Les parcours personnalisés et le formulaire bénévole restent volontairement protégés; les visiteurs publics peuvent explorer et générer des livrables, mais la bascule vers l’action continue de dépendre de Clerk.
- La persistance du mode d’affichage dépend de Clerk pour les comptes connectés ; si la mutation échoue, l’UI garde le fallback local/cookie mais la synchronisation serveur peut manquer jusqu’au prochain changement.
- La hauteur du ruban est volontairement augmentée pour afficher les rubriques du bloc actif ; surveiller uniquement le rendu sur très petits écrans.
- L'inférence photo est actuellement hybride/heuristique côté web, avec un pipeline remplaçable prévu pour un vrai modèle vision plus tard.
- Le portail sponsors affiche une fenêtre analytique plus large, donc les volumes peuvent paraître plus élevés qu’avant lors des comparaisons visuelles.
- Les profils `admin` et `elu` sont volontairement exclus de la mutation self-service; tout besoin de bascule sur ces rôles doit rester géré côté back-office.
- La couverture PDF ajoute un bloc plus dense en haut de page; surveiller le saut de page et la lisibilité sur impressions A4 très chargées.
- Le périmètre par compte dépend des identifiants `created_by_clerk_id`; quelques contrats locaux restent sans clé compte stable et retombent donc sur un filtrage partiel pour ce mode.
