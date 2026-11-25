# Mode École : candidat de refonte Web

**Statut : PLAN / CANDIDATE.** Aucun runtime intégré ou déployé par cette publication.

Base analysée : `9bfa52af3474bf0e2b45b89a4868a1933390b622`. Chemins cibles vérifiés sur `f542b7d448855dfae320b3d679a7f587e2c89061`. La capture initiale décrit les défauts à corriger, pas une maquette à reproduire.

## Décisions produit

EXTEND_EXISTING : conserver la route publique `/learn/ecole` et les composants du kit existants. Aucun moteur scolaire, route, API, dépendance, table, mécanisme de collecte ou règle de reconnaissance ajouté. Les trois précédents candidats du bloc Apprendre n'ont aucun chemin cible en commun avec celui-ci. La palette plus claire appartient au registre partagé du candidat Vulgarisation, pas à un nouveau registre École.

- En-tête compact, sans panneau décoratif fictif ni CTA répétés. Quatre onglets : Lancer une séance, Préparer la séance, Fiche élève, Banque de questions. Le premier est actif par défaut. Navigation clavier flèches/Home/End, relations ARIA et panneaux masqués ; ancres historiques choisir-niveau, fiche-enseignant, fiche-eleve préservées sur les onglets, nouvelle ancre banque-questions. La navigation modifie le fragment sans créer de nouvelle route.
- Lancement : classes 6e à 3e, sélection visible, deux formats directement comparables, repères de durée et de matériel affichés, lancement uniquement après sélection d'une classe, démo accessible sans compte. Le choix est conservé entre les onglets. Les URLs de lancement et le retour aux Bonnes pratiques restent identiques.
- Préparation : distinction entre quiz collectif de 30 min et atelier de 60 min, représentation proportionnelle 15/30/15 des durées contractuelles, fiche enseignant et conseils d'animation. Les conseils ne sont pas présentés comme un minutage supplémentaire. Aucun score de progression inventé.
- Fiche élève : quatre invites à compléter sur papier, sans saisie sur le site ni nom demandé. Pas de promesse de PDF ou de collecte de réponses.
- Banque : les vingt questions de support du kit (quatre thèmes de cinq actuellement, compteurs dérivés du code) ne sont pas la banque du moteur. Suppression des cartes et labels dupliqués et de l'accordéon parent inutile ; un accordéon par thème, réponses, explications, points à retenir, sources et statuts de revue conservés. Avertissement avant consultation des corrigés. Les questions à vérifier sont signalées et ne doivent pas être utilisées dans la séance publique.
- Interface FR/EN, avec projection bilingue des fiches enseignant/élève et des conseils depuis l'owner existant. La banque de support garde ses textes et sources français, explicitement identifiés dans le panneau anglais et balisés lang=fr. Pas de traduction non vérifiée des questions scientifiques.

## Contrats intangibles

Conserver les quatre niveaux, les formats quiz-30 et atelier-60, l'éligibilité des questions, les exclusions needsReview, le mode collectif, la démo, le retour historique et le comportement des anciens liens. Le quiz-30 cible 15 questions ; atelier-60 évalue 8 concepts avant/après et 2 transferts séparés au post-quiz. Les valeurs affichées sur le lanceur sont issues des constantes existantes. Ne modifier ni le moteur de sélection, ni les calculs de bilan, ni l'état de session, ni les permissions. Les réponses collectives restent locales en mémoire, sans nom ni compte élève. Les niveaux sont des profils pédagogiques internes, sans alignement officiel aux programmes. Les ressources territoriales, attestations et reconnaissance des actions restent hors périmètre.

## Application

Consulter [01-ecole.patch](./01-ecole.patch) et [MANIFEST.json](./MANIFEST.json). Depuis le checkout courant, inspecter les chemins cibles et les changements dirty/staged des autres writers. Respecter AGENTS, les règles scoped, la documentation Next installée et les validations obligatoires.

```sh
git apply --check documentation/specs/ecole-ui/01-ecole.patch
git apply documentation/specs/ecole-ui/01-ecole.patch
```

En cas d'écart réel, rapprocher uniquement les hunks compatibles ; ne pas imposer de checkout historique ni écraser un autre writer. Ne déclarer les modifications CURRENT qu'après intégration et validation. Le manifeste décrit les fichiers cibles, pas les fichiers du moteur préservés.

## Validations requises sur checkout réel

- Tests ciblés du kit, des URL, du lanceur, du contenu localisé, des quatre panneaux et du support, puis tests de sélection et de séance École (quiz-30, atelier-60, pré/post, transferts, résumé, reprises, démo, exclusions et privacy). Vérifier les attentes des tests du picker partagées avec S'entraîner sans reproduire sa refonte.
- Typecheck, lint et tests Web proportionnés ; contrôles documentaires et de complexité concernés. Une baseline obsolète doit être traitée selon sa gouvernance, jamais assouplie pour masquer un finding. Couverture ciblée, pas de FULL non demandé.
- Navigateur PUBLIC : accéder sans connexion ni bypass, depuis le host effectivement annoncé. Desktop 1440/1920, mobile 390, FR/EN, trois modes d'affichage, clair/sombre selon contrat. Vérifier quatre onglets, focus et clavier, sélection persistante lors de changement d'onglet, liens directs avec ancres historiques, conservation des paramètres URL hors fragment, choix de niveau et de format, CTA désactivé sans classe, lancement exact des 8 combinaisons, démo et retour. Vérifier le rendu proportionnel des durées, la lisibilité des fiches, l'ouverture/repli des quatre thèmes, les sources et statuts à vérifier, absence de débordement ou de cartes fictives. Captures desktop/mobile des quatre panneaux.
- Vérifier les flux réels de session collective et l'atelier complet, y compris absence de PII et de réponse dans l'URL ou dans une persistance de progression scolaire. Ne pas changer les règles métier pour faciliter une validation UI. Vérifier la palette après intégration coordonnée de Vulgarisation.
- Les tests modifiés/ajoutés restent candidats jusqu'à exécution. Ne corriger que les défauts constatés, notamment les éventuelles contraintes lint liées à la synchronisation du fragment ou aux composants de présentation.

## Preuves et limites

Contrôles réalisés : lecture des owners, consommateurs et tests ; vérification des neuf blobs de base, construction des hunks et rejeu textuel exact, recherche ciblée de secrets, contrôle d'intégrité du blob publié et non-recouvrement des trois candidats précédents. Ces contrôles ne sont pas une preuve de compilation ni d'interaction navigateur. HOOK_NOT_AVAILABLE ; git apply --check réel, typecheck, lint, tests, navigateur NOT_RUN ; couverture NOT_MEASURED. Aucune preuve de déploiement.

**STOP CONDITION** : intégration sur checkout courant, validations proportionnées réussies, captures desktop/mobile, documentation synchronisée, publication fast-forward et relecture de main. Retirer uniquement le candidat consommé et son entrée d'index après intégration effective.
