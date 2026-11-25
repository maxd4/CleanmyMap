# Plan | Audit navigateur et réception des parcours Web

**Statut : PLAN.** Référence lue le 25 novembre 2026 : `e718cedcb545dcfe98fb8d3259875593ce60c3be`. Priorisation d'une campagne locale, non constat de défauts actuels. Ne remplace ni la [roadmap produit](../product/roadmap-priorisee.md), ni l'[index des routes](../pages_site/INDEX.md), ni le [plan macro-lots UI/UX](./PLAN_MACRO_LOTS_UI_UX_CODEX.md).

## Objectif et séquencement

Recevoir le produit réel, en priorité les parcours à forte densité de droits, données, mutations et interactions. Auditer après la stabilisation des candidats de `documentation/specs/` qui touchent la surface, pas pendant leur intégration. Les preuves déjà produites sur un candidat identique restent recevables ; ne pas refaire une campagne pour elle-même. Un lot peut avancer sur les autres surfaces si un writer ou une dépendance bloque une page. Les bugs graves observés n'attendent pas la fin de la campagne.

## Méthode commune

1. Résoudre la route, son statut, sa fiche CURRENT, ses composants, API, scopes, tests et candidats en cours. Ne pas transformer un alias en deuxième page. Réutiliser les scénarios E2E, fixtures et authentification de développement déjà disponibles. Vérifier l'état actuel de main et le candidat réellement testé.
2. Parcourir l'interface réelle avec navigateur desktop et mobile ; états initial, chargement, vide, partiel, indisponible, succès, erreurs et reprises, navigation clavier, focus, contrastes, trois modes d'affichage et thèmes applicables. Tester le retour arrière, liens profonds, rechargement et conservation pertinente des choix. Consigner dimensions et environnement effectifs.
3. Vérifier avec identités de test habilitées et non habilitées les frontières serveur, accès anonymes, permissions et scopes. Ne jamais utiliser une UI masquée comme preuve d'AuthZ. Les opérations destructives restent sur fixtures ou environnement isolé. Tester les API et RLS quand le risque l'exige.
4. Sur les surfaces de données, rapprocher l'affichage des owners canoniques, unités, période, provenance, disponibilité et pagination ; distinguer mesure, déclaration, proxy et prédiction. Vérifier l'absence de charges inutiles et de doubles requêtes avec les traces réseau lorsque pertinent, sans inventer de seuil de performance.
5. Pour chaque défaut, reproduire, identifier la cause et le consommateur, classer sécurité/intégrité, blocage fonctionnel, accessibilité ou ergonomie, fixer une STOP CONDITION et corriger dans un lot attribué. Une suggestion esthétique non démontrée reste une proposition, pas une régression. Respecter les lots UI/UX existants, sans réimplémentation.
6. Archiver les preuves sans données personnelles ni secrets ; reporter par route l'état `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN` et, pour une route retirée, la preuve du remplacement. Un smoke est explicitement moins fort qu'un audit métier. Utiliser la fiche propriétaire pour les changements durables, pas une nouvelle matrice concurrente.

## Ordre de réception

| Rang | Surface canonique ou famille | Profondeur et scénarios discriminants |
|---|---|---|
| A01 | /sections/messagerie | Après candidats Messagerie/SPOGOMI : DM, canaux publics, topics, annonces, sondages, non-lus, pagination, recherche, responsive ; droits et isolation par événement, anciens accès, révocation. |
| A02 | /pilotage | Après refonte Pilotage : scopes coordinateur, admin/max, hub restreint, raccourcis, chargements autorisés, cohérence des données, densité textuelle. |
| A03 | /reports | Après stabilisation de tous les changements Reports : génération, analyse, historique persistant, bibliothèque publique, reprise de configuration, PDF officiel et impression, KPI, météo et quotas, empreinte IA si migrée ; droits et export. |
| A04 | /profil/impact | Attribution personnelle, périodes, données manquantes, historique, absence de double comptage et de lecture d'un tiers. |
| A05 | /sponsor-portal | KPI, périmètre temporel et territorial réellement autorisé, cohérence avec Pilotage/Rapports, état sans données. |
| A06 | /actions/map | Calques Actions/Trash Spotter, distinction observé/prédit, sélection, filtres, géométrie, projections, popups, photos différées, journal, export, mobile, requêtes bornées. |
| A07 | /actions/history | Actions propres, historique et transitions, pagination, accès à la préparation et au bilan, droits sur actions d'autrui. |
| A08 | /actions/new | Création et préparation, sauvegarde/reprise, champs obligatoires et unités, soumission, jour J, bilan, idempotence, restrictions, cohérence route/météo et provenance. Parcours anonyme de préparation et authentification des écritures. |
| A09 | /signalement | Création, réussite partielle si photo échoue, Mes observations, preuve photo, reprise, permissions, données privées. Vérifier les acquis sans refaire la refonte. |
| A10 | /actions/new?panel=itineraire | Parcours planner : origine, budget, calcul, contraintes, groupes, calques, repli, transmission de la preuve au formulaire. Smoke de /sections/route et conservation des paramètres. |
| A11 | /actions/new?panel=meteo | Météo du créneau, fraîcheur, erreurs et contexte opérationnel ; smoke de /sections/weather et /sections/guide. |
| A12 | /admin et sous-routes | Creator Inbox, formulaires, modération signalements, banque quiz, services, XP Audit, godmode si accessibles dans le rôle prévu ; contrôles négatifs, confirmations, audit, mutations et accès public. |
| A13 | /sections/rejoindre-une-action | Remplace /sections/community : recherche et découverte, inscription et désinscription autorisées, capacité, état complet/annulé, redirection historique. |
| A14 | /sections/feedback | Propositions et problèmes, persistance, suivi auteur, erreurs et anonymat/publication selon contrat. |
| A15 | /sections/gamification | Après candidat : progression, cinq onglets si livrés, acquis/verrouillés, réconciliations, liens profonds, calculs réels. |
| A16 | /sections/open-data | Après candidat : projection publique, exclusions, données partielles, provenance, limites, conditions d'utilisation et téléchargements. |
| A17 | /sections/trash-spotter | Suivi et monitoring, données validées/actionnables, séparation historique, droits, fraîcheur, cohérence avec la carte commune. |
| A18 | /sections/funding | CTA configuré, données financières vérifiables, inconnues, historiques de paiement sans réactivation implicite. |
| A19 | /sections/elus | Gouvernance, visibilité et accès réellement autorisés, absence de données de tiers. |
| A20 | Bloc Apprendre | /learn/bonnes-pratiques, /learn/comprendre, /learn/sentrainer, /learn/ecole ; sources, quiz, sessions, huit combinaisons école si prévues, FR/EN, confidentialité ; /learn/empreinte-ia : suivre son statut réel et tester sa destination si migrée. |
| A21 | Annuaire et réseau | Smoke desktop/mobile de /sections/actors, /sections/annuaire, /partners/onboarding, /partners/dashboard après les candidats : navigation, chargement, accès et carte. Audit approfondi uniquement si anomalie ou preuve manquante. |
| A22 | Compte et authentification | /dashboard, /profil, /profil/[profile], /profil/engagement, /reglages, /sign-in, /sign-up, /onboarding : smoke des refontes acquises, identité, bascule de rôle et restrictions, reprise, préférences. |
| A23 | Standalone et techniques | /form-comparison, /preview/actions/new, /declaration-simple, /prints/report, /error/429 : vérifier existence et statut à l'index/runtime, isolation de prévisualisation, impression et erreurs. Si une route est retirée, tracer son remplacement sans la ressusciter. |
| A24 | Pages légales | Contact, CGU si route active, mentions légales, politique de confidentialité et cookies ; exactitude des pratiques, liens et formulaires. Toute non-conformité critique passe immédiatement en priorité. |

### Compléments de couverture route-first

Les 24 rangs proviennent de la demande initiale. Ne pas interpréter leur liste comme l'inventaire complet du site. La réception inclut aussi les routes actives de l'index, notamment l'accueil, /methodologie après ses candidats, et les parcours SPOGOMI publics, organisateur et équipe (session limitée et révocable). Regrouper ces contrôles avec leur famille fonctionnelle : SPOGOMI avec A01/A08/A12/A13, méthodologie avec A03/A20. Les routes secondaires, paramètres, aliases et redirections sont des cas de contrôle, pas des chantiers de reconstruction.

## Dépendances et livrables

- Le programme d'intégration des specs vient avant la réception des surfaces qu'il modifie. Les plans [calques itinéraire](./calques-carte-itineraire.md), [calibration scientifique](./calibration-scientifique-planner.md) et [données externes](./donnees-externes-cartographie-dechets.md) ont leurs propres critères ; A08/A10/A11 fournissent une base de non-régression, à rejouer uniquement sur les deltas ultérieurs.
- Livrer un bilan exploitable par rang : SHA, route réelle, identités/scopes testés, environnement, cas et résultats, preuves, cause des défauts, changements et vérifications, reste bloqué. Éviter les copies de captures ou données sensibles dans Git.
- Une publication est un fait vérifié sur main ; une validation navigateur et une preuve CI restent des faits distincts. Aucun test n'est déclaré exécuté par ce plan.

**STOP CONDITION :** chaque rang et route complémentaire active possède une réception proportionnée ou un blocage justifié avec prochain contrôle ; les défauts critiques démontrés sont corrigés et vérifiés avant clôture de leur périmètre. Aucun audit global répété sans nouvelle preuve ni réouverture d'une spec déjà réceptionnée.
