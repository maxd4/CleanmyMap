# Complément 2026 : captures Strava pertinentes à ajouter aux guides CleanMyMap Mobile

**Statut : BENCHMARK / SOURCE EXTERNE.** Recherche complémentaire du 3 novembre 2026. Le dépôt `main` reste la source de vérité sur l'implémentation CleanMyMap.

Ce document complète les huit images Google Play déjà intégrées aux guides. Il **ne prétend pas disposer d'une capture exacte de chacune des 22 pages**. Il distingue les captures observées et leur date, les banques UI historiques, les sources officielles décrivant un comportement sans capture et les illustrations de concept non représentatives du runtime.

## Priorité de collecte

1. **Clubs + événements : S01**, capture publiée directement par Strava en juillet 2026. À préférer au visuel générique `strava-communaute.png` des guides 12, 13 et 20.
2. **Mode sombre / GPS / carte / progression : S02**, capture officielle montrant trois vues concrètes. À utiliser pour les guides 02, 03 et 11 (palette de Strava non reprise).
3. **Paramètres : S09/S10**, véritables captures répertoriées mais version et accès à confirmer. Le guide 19 manque actuellement d'un écran correspondant.
4. **Défis et trophées : S06**, capture tierce plus pertinente visuellement que le visuel de progression générique ; disponibilité de l’interface actuelle non confirmée.
5. **Carte / itinéraires : S03 + S04 + S05**, compléter les guides 02 et 16 avec mention des versions anciennes.
6. **Notifications et messagerie : S11/S12**, comportement documenté, mais **capture de la page exacte toujours manquante**.

## Catalogue sourcé

| ID | Statut de la preuve | Sujet | Source | Lecture et limites | Guides concernés |
|---|---|---|---|---|---|
| S01 | OFFICIEL / CAPTURE | [Clubs et création d’événement, 2026](https://stories.strava.com/articles/whats-new-on-strava-strava-connects-to-claude-new-running-events-and-races-and-club-messaging) | Strava Stories, 16 juillet 2026, 2026-07-16 | Montage de trois écrans mobiles : vue Groupes/Clubs, détail d’un club, début du formulaire événement. Très pertinent pour les pages 12, 13 et 20. | 12,13,20 |
| S02 | OFFICIEL / CAPTURE | [Mode sombre : enregistrement, carte et statistiques](https://stories.strava.com/articles/hello-dark-mode) | Strava Stories, publication initiale du thème sombre, 2024 (à dater sur la page) | Montage d’écrans authentiques présentant une vue d’enregistrement à grands chiffres, une carte sombre et une page de progression. Référence très utile pour la densité et le contraste, pas pour la couleur orange de Strava. | 01,02,03,05,09,10,11,21,22 |
| S03 | OFFICIEL / SOURCE PRODUIT | [Exploration cartographique, recherche d’itinéraires](https://stories.strava.com/articles/it-just-got-easier-to-plan-a-route-with-strava-maps) | Strava Stories, 10 avril 2024, 2024-04-10 | Décrit la navigation Maps avec critères rapides, résultats en bas, itinéraire en évidence et sélection depuis la carte. La page officielle n’a pas livré une capture exportable directement via l’outil de collecte. | 02,06,07,16 |
| S04 | PRESSE / CAPTURE ANCIENNE | [Itinéraires et cartes Strava (ancienne UI)](https://www.cyclingweekly.com/news/latest-news/strava-releases-new-automated-routes-feature-452517) | Cycling Weekly, article d’annonce des routes automatisées, 2020 environ | Capture d’une ancienne interface Strava Routes : filtre de sport, carte, résultat et liste. Utile comme référence historique uniquement. | 02,16 |
| S05 | TIERS / CAPTURE ANCIENNE | [Exploration d’itinéraires et de segments](https://jona-mcc.medium.com/strava-route-explore-d797850735bd) | Étude UX Jonathan McCurdy (Medium), version historique | Deux écrans mobiles côte à côte, carte avec filtres et liste de parcours. Ne prouve pas l’UI 2026. | 02,16 |
| S06 | TIERS / CAPTURE À CONFIRMER | [Trophées et records personnels sur mobile](https://www.purrweb.com/blog/app-gamification-examples/) | Purrweb, étude sur la gamification, date exacte non vérifiée | Montage de deux écrans qui semblent provenir de Strava : Best Efforts et Trophy Case. Vérifier la provenance exacte et la date avant de figer un pattern. | 10,11,17 |
| S07 | TIERS / DESIGN NON LIVRÉ | [Prototype d’interface Trophy Case](https://dribbble.com/shots/4617415-Trophy-Case-and-Challenges-on-Strava-Profile) | Dribbble / designer Strava, 2018 | Direction graphique d’un designer, datant de 2018 ; ne pas classer comme capture d’application publiée. | 17 |
| S08 | TIERS / ARCHIVE UI | [Bibliothèque de captures Android Strava](https://gummble.com/apps/strava-android) | Gummble, 2024-02-21 | Bibliothèque de 583 captures sur deux versions, la dernière capturée en février 2024. Intéressante pour les sous-pages mais ancienne et accès complet potentiellement payant. | 03,04,05,08,14,15,19,20,22 |
| S09 | TIERS / CAPTURE SETTINGS | [Écran paramètres Strava](https://pablooo.club/screen/a371282e98ac1dadec8c426a1dce2491e76b4f2033f42d30ff162c9e30bb8805/Strava/settings/This%20screen%20allows%20users%20to%20manage%20their%20account%20settings%20and%20preferences.) | Pablooo.club, 2025-02-09 | Page de bibliothèque répertoriant une capture Settings datée du 9 février 2025. Accès effectif à l’image intégrale non vérifié. | 19,22 |
| S10 | TIERS / ARCHIVE UI | [Settings / Display, interface plus ancienne](https://uiland.design/screens/strava/screens/185fbe68-2a25-435f-b770-c034e0c89a51/screen/2a277058-0e1f-43dd-9961-8e281fbf40e0) | Uiland, date version non vérifiée | Page indexant une capture réelle de réglages; accès intégral par compte possiblement requis. Ne pas extrapoler la hiérarchie exacte 2026. | 19,22 |
| S11 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Boîte de notifications Strava](https://support.strava.com/fr/articles/15402139-comment-gerer-mes-notifications-strava) | Strava Help Center, 2026, 2026-09 | Confirme l’icône cloche en haut de l’Accueil et les préférences Push depuis Vous > Paramètres. Aucune capture exacte du centre de notifications récupérée. | 15,01 |
| S12 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Hub de discussion des clubs](https://support.strava.com/fr/articles/15401541-comment-utiliser-les-messages-du-club-sur-strava) | Strava Help Center, 2026, 2026-09 | Confirme les canaux, le hub, le composer, la modération et les interactions. À compléter par une capture authentique de la page. | 12,14 |
| S13 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Trophées et défis sur l’application](https://support.strava.com/fr/articles/15402068-collection-de-trophees-strava) | Strava Help Center, 2026, 2026-09 | Confirme 4 trophées récents sur le profil et l’accès à Tous les trophées. Capture actuelle à récupérer pour le layout. | 10,11,17 |
| S14 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Réglages Android](https://support.strava.com/hc/en-us/articles/216919067-Android-App-Settings) | Strava Help Center, actualisé, 2026 (date exacte non déterminée) | Énumère les catégories de paramètres : Appearance, Privacy, Display, Push Notifications et intégrations. Pour structure informationnelle uniquement. | 19,22 |
| S15 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Partager une activité et ses statistiques](https://support.strava.com/en-us/articles/15401840-sharing-your-strava-activities) | Strava Help Center, actualisé, 2026 (date exacte non déterminée) | Décrit le choix entre carte ou photo puis la feuille de partage système, avec restrictions de confidentialité. Capture à compléter. | 18,05 |
| S16 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Fiche d’activité Strava](https://support.strava.com/fr/articles/15401943-affichage-des-activites) | Strava Help Center, actualisé, 2026 (date exacte non déterminée) | Confirme navigation du flux vers activité, carte cliquable, résultats par segment, participants, kudos/commentaires. Capture de détail à compléter. | 05,04 |
| S17 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Écran Enregistrer activité](https://support.strava.com/fr/articles/15402137-comment-enregistrer-une-activite-sur-strava) | Strava Help Center, actualisé, 2026 (date exacte non déterminée) | Contrôles Démarrer, Terminer, bascule carte/stats et édition avant publication. Captures officielles du mode sombre S02 à comparer. | 03,04,21 |
| S18 | OFFICIEL / CONTRAT UI, SANS CAPTURE | [Calendrier et statistiques du profil](https://support.strava.com/fr/articles/15402175-votre-page-profil-strava) | Strava Help Center, 2026, 2026-08 | Confirme calendrier, performances, trophées, photos et graphique d’activités. Capture récente ciblée à compléter. | 09,10,11 |

## Protocole d’intégration documentaire

- Conserver le lien **vers la page source stable**. Les URL d'images hébergées par un CDN peuvent être temporaires ou comporter des jetons expirables ; une URL de fichier image n'est pas automatiquement pérenne.
- Avant chaque import de capture, vérifier : capture authentique de l'application ou composition marketing, appareil Android/iOS, version approximative, date de publication et pertinence pour l'écran CleanMyMap.
- **Droits :** une capture accessible publiquement n'est pas librement redistribuable. Vérifier les conditions de redistribution avant d'ajouter un asset tiers à un dépôt public. Sinon, conserver un lien de consultation ou un fichier local non versionné.
- **Confidentialité :** ne pas exploiter des captures du compte personnel sans masquer les noms, photos de tiers, lieux sensibles, trajets privés et notifications. Ne jamais stocker les cookies ou jetons d'authentification.
- Les six maquettes CleanMyMap générées restent des **cibles de composition hypothétiques**. Le texte d'exemple, les chiffres, les conversions environnementales et les badges montrés ne prouvent aucun contrat scientifique ou métier.
- Les libellés des liens supplémentaires permettent à Codex de **ouvrir la source exacte avant la réalisation d'une page**. Cela évite de présenter une image de marketing comme capture pixel-perfect de la sous-page.

## Captures exactes encore prioritaires à collecter

| Guides | Capture précise souhaitée | Source la plus fiable |
|---|---|---|
| 15 | Vue complète de la boîte de notifications, états lus/non lus et onglets | Capture directe sur l'application Strava installée |
| 14 | Hub Messages, liste des canaux et un canal ouvert | Capture directe Strava (clubs), compte test sans données privées |
| 19 | Paramètres généraux puis Confidentialité | Capture directe Android Strava actuelle |
| 17 | Défis actifs + collection de trophées | Capture directe Strava, données fictives ou masquées |
| 09/11 | Vous > Progression > historique/graphique | Capture directe Strava actuelle |
| 06/07/20 | Liste événements, détail, organisateur, gestion d'inscription | Capture directe Strava actuelle |
| 04/05/18 | Page fin de séance, détail, feuille de partage | Capture directe Strava actuelle |

Ces captures ne sont pas collectées depuis le compte utilisateur dans cette recherche. Leur absence ne doit jamais être compensée par une maquette présentée comme une capture réelle.
