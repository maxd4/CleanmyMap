# Rapports Web : génération, analyse et impression

Statut : VALIDATED / INTEGRATED (`3303e2bfb` + réception scientifique finale). Artefacts conservés comme trace pour `REPORTS-HUB`.
Base factuelle inspectée : 10b1e36a432a8d017a4b2084abe88ec44d7a428e. Ne pas imposer de checkout historique.
Périmètre : Web uniquement, EXTEND_EXISTING, lot cohérent en trois jalons. Les captures utilisateur concernent les trois surfaces de Rapports, non trois rubriques distinctes.

## Intégration des candidats

Appliquer ou adapter sur le checkout courant, dans cet ordre, en préservant les changements concurrents :
1. 01-generation.patch : génération, configuration, aperçu, restitution, hiérarchie des actions.
2. 04-generation-tests.patch : régressions de génération et d'aperçu.
3. 02-analysis.patch : tableau de bord, couverture et disponibilité, série mensuelle, tests.
4. 03-print-and-contracts.patch : synthèse imprimable, tests, documentation des routes.

Vérifier git apply --check ; un patch incompatible avec une évolution du checkout doit être adapté, non forcé. Les chemins dans les diffs désignent les owners existants. Aucun nouveau moteur métier, migration ou dépendance.

## Jalon 1 : génération

Route /reports?tab=generation. Séparer sélection (périmètre, période, filtres), composition (modules), aperçu et livraison. Préserver tous les contrôles et le contrat de génération. Utiliser les primitives et le design system existants. Le PDF officiel est l'action principale ; l'export IA est complémentaire et conserve son quota/contrat propre. Distinguer sélection vide, configuration invalide, erreur, chargement et données partielles ; ne pas annoncer une couverture complète sur un corpus tronqué ou incertain. Conserver historique, fichiers, accès et parcours existants. Ne pas transformer l'aperçu en document fictif.

## Jalon 2 : analyse

Route /reports?tab=analysis&detail=1. Une seule hiérarchie de titres, activité mesurée en premier, évolution temporelle, indicateurs d'impact qualifiés de proxys, qualité et méthodologie. Les cartes utilisent les primitives existantes. Séparer la fenêtre du bilan de la série mensuelle sur les douze derniers mois ; ne pas présenter les deux comme un même corpus. Les masses et participations inconnues ne deviennent pas des zéros ; zéro observé reste zéro. Les participations cumulées ne constituent pas un décompte de personnes uniques. Afficher les numérateurs de couverture et leur dénominateur ; signaler les sources partielles et événements indisponibles. Comparaisons : vérifier les dénominateurs et la disponibilité de chaque période, notamment précédent vide, valeur nulle, zéro observé et troncation ; ne pas fabriquer une variation. Préserver les calculs canoniques et leurs unités. Série sans interpolation trompeuse, tableau de couverture accessible. Le référentiel KPI est consultable sans occuper tout le premier écran.

## Jalon 3 : impression

Route /prints/report. Réutiliser le modèle d'analyse des rapports, sans requête source redondante. Document de synthèse non certifié, période et date issues du modèle, résultats mesurés et couverture, tableau des secteurs réels, évolution mensuelle et limites. Retirer certification/score/affirmations chiffrées et mentions de conformité non étayées (AA, 15 %, 65 %, sceau, ADEME et RGPD non démontrés). La comparaison illustrative de styles cartographiques centrée sur Paris n'est pas une preuve de collecte et reste hors impression. Bouton d'impression réel réutilisé ; lien distinct vers la génération du PDF officiel. Ne pas modifier le renderer officiel, les snapshots, les historiques, les artefacts ni les quotas. Préserver authentification avant chargement, noindex et confidentialité. Vérifier les sauts de page, tableaux multipages, largeur A4, absence de chrome et absence de contenu tronqué.

## Validation et clôture

- Exécuter les tests ciblés modifiés, typecheck et lint selon les règles de développement du dépôt ; adapter uniquement les erreurs réellement liées au candidat. Vérifier au runtime la génération, les filtres, modules, aperçu, PDF, export IA, historique, analyse, impression et accès anonyme/connecté.
- Vérifier les trois modes d'affichage et des largeurs représentatives 390, 768, 1280 et 1920 px. Vérifier contrastes, débordements, focus, navigation clavier, états vide/partiel/erreur, données réelles et impression A4 multipage. Ne pas masquer des fonctionnalités.
- Vérifier les comparaisons avec période précédente vide et les couvertures partielles. La représentation des inconnues dans l'intégralité des comparaisons doit encore être prouvée.
- Intégrer les deltas documentaires des fiches de route avec le runtime. Vérifier la cohérence de reports-presentation-detaillee.md et du contrat reports-generation-parameters.md si le comportement décrit y a changé. Aucun doublon documentaire.
- Préserver les modifications des autres writers et suivre MAIN-ONLY / MULTI-WRITER COORDONNÉ. Pas de FULL ou de déploiement implicite.

STOP CONDITION : les trois surfaces sont intégrées, les états et interactions préservés, les mesures non renseignées distinguées de zéro, les affirmations imprimables non prouvées retirées, les tests ciblés et vérifications navigateur/impression réussis, la documentation alignée et le commit publié vérifié. Toute impossibilité de validation est signalée précisément, sans prétendre à une livraison complète.

## Preuves et limites de la préparation ChatGPT

Lecture du code et contrats sur la base indiquée ; candidats produits à partir des fichiers réels ; reconstruction textuelle des deltas effectuée lors de leur préparation. HOOK_NOT_AVAILABLE, git apply sur checkout réel NOT_RUN, tests workspace/typecheck/lint/navigateur/impression/CI NOT_RUN, couverture NOT_MEASURED. La vérification exhaustive des hunks par relecture distante a atteint la limite d'appels de l'environnement. Le contenu n'est pas une preuve de comportement exécuté. Les preuves runtime et l'intégration restent à produire par Codex. Aucun changement runtime publié.
