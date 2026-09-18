# Partie V — Risques techniques, sécurité et contrôle des systèmes d'IA {#partie-v-risques-techniques-securite-et-controle-des-systemes-dia}

Cette partie descend d'un niveau : après les dépendances systémiques, elle analyse les risques concrets liés à l'usage technique des modèles, à la génération de code, à la cybersécurité, aux données et aux limites des garde-fous.

## Confidentialité, données et responsabilité juridique

### Données sensibles dans les instructions et les fichiers transmis

Le quatrième risque est celui de la **confidentialité**. Les instructions envoyés à une IA peuvent contenir beaucoup plus d'informations sensibles qu'il n'y paraît : architecture du projet, extraits de code, erreurs serveur, logs, schémas de base de données, données métier, noms d'utilisateurs, informations personnelles, clés API, jetons, secrets ou variables d'environnement. Un instruction doit donc être traité comme un canal de transmission de données, et non comme une simple zone de texte sans conséquence.

Cette vigilance est particulièrement importante dans un projet comme CleanMyMap. Le site peut manipuler des signalements localisés, des photos, des comptes utilisateurs, des rôles, des exports, des données associatives ou des informations institutionnelles. Même lorsqu'un instruction ne contient pas directement une donnée personnelle évidente, il peut contenir des éléments permettant une réidentification indirecte : adresse, coordonnées, identifiant technique, historique d'action, capture d'écran ou extrait de base de données. L'usage de l'IA doit donc respecter un principe de minimisation : ne transmettre que ce qui est strictement nécessaire à la tâche.

Sur le plan opérationnel, certaines informations ne doivent jamais être envoyées à un outil IA : **clés API**, **secrets**, **jetons**, **mots de passe**, **variables d'environnement**, URLs privées, chaînes de connexion, dumps de base de données ou données personnelles non anonymisées. La CNIL rappelle également que la sécurité des clés d'accès aux API ne doit pas être négligée et qu'elles doivent être protégées comme des secrets techniques, par exemple via des mécanismes de stockage sécurisé.

Les logs, erreurs et extraits de base de données doivent être **anonymisés** avant tout partage avec une IA. Cela signifie retirer ou remplacer les noms, emails, identifiants, adresses, coordonnées GPS précises, numéros de téléphone, jetons, IDs de session et toute information permettant de retrouver une personne ou un compte. Dans le doute, il faut réduire le contexte envoyé plutôt que transmettre un extrait complet. Un modèle peut aider à corriger une erreur sans recevoir tout l'historique applicatif ni les données réelles des utilisateurs [@nist_artificial_intelligence_3; @cnil_s_curit].

Le même principe vaut pour le code produit. Tout **code généré par IA** doit être relu, testé et discuté avant intégration. Les **dépendances ajoutées** doivent être vérifiées, car une bibliothèque proposée automatiquement peut accroître inutilement le bundle, introduire une faille, exposer une donnée ou créer une dette de maintenance. L'OWASP classe d'ailleurs les risques liés à la chaîne d'approvisionnement et aux dépendances parmi les vulnérabilités importantes des applications utilisant des modèles de langage.

### RGPD, consentement et minimisation des données

Le RGPD impose plusieurs principes directement applicables à l'usage de l'IA dans un contexte européen : finalité limitée, minimisation des données, transparence, sécurité, durée de conservation proportionnée, droits des personnes et responsabilité du responsable de traitement. Ces principes s'appliquent dès qu'un système traite des **données à caractère personnel**, c'est-à-dire toute information permettant d'identifier directement ou indirectement une personne.

Dans CleanMyMap, les données sensibles ne se limitent pas aux noms, emails ou comptes utilisateurs. Des photos géolocalisées peuvent aussi devenir des données personnelles si elles montrent une personne, une plaque d'immatriculation, un visage, un commerce identifiable, un domicile, une adresse précise ou un élément permettant de relier un signalement à un individu. Une simple photo de déchet peut donc changer de statut selon son contenu, son contexte et les métadonnées associées.

L'usage d'API d'IA pour analyser automatiquement des images, reformuler des signalements ou classer des contenus peut constituer un traitement de données personnelles si les éléments transmis permettent d'identifier une personne ou un lieu précis associé à une personne. Ce traitement doit alors être justifié par une finalité claire, expliqué aux utilisateurs et limité aux données strictement nécessaires. Le fait qu'un traitement soit techniquement possible ne suffit pas à le rendre conforme.

La minimisation doit être appliquée dès la conception. CleanMyMap doit éviter d'envoyer à une API externe des images complètes si une version compressée, floutée, recadrée ou anonymisée suffit. Les visages, plaques d'immatriculation, adresses précises, coordonnées GPS trop fines et métadonnées inutiles doivent être supprimés ou masqués lorsque leur conservation n'est pas nécessaire. De même, les instructions envoyés à un modèle ne doivent pas contenir de noms, emails, identifiants, logs personnels ou données de compte si la tâche peut être réalisée avec un exemple générique.

Le consentement ne doit pas être traité comme une simple case à cocher. Lorsque l'utilisateur transmet une photo ou un signalement, il doit comprendre quelles données sont collectées, pourquoi elles le sont, combien de temps elles sont conservées, qui peut y accéder, et si elles peuvent être transmises à un service externe d'IA. Si une analyse automatique d'image ou de texte est utilisée, cette information doit apparaître clairement dans la politique de confidentialité et, si nécessaire, dans l'interface de dépôt.

Le projet doit aussi distinguer les traitements internes et externes. Une classification simple réalisée localement ou par une règle déterministe ne pose pas les mêmes enjeux qu'un envoi vers une API d'IA tierce. Dans le second cas, il faut vérifier le fournisseur, la région de traitement si elle est disponible, les conditions de conservation des données, la possibilité d'exclusion de l'entraînement, les sous-traitants, les garanties contractuelles et la conformité avec les règles européennes de protection des données.

Si un traitement IA est susceptible d'engendrer un risque élevé pour les droits et libertés des personnes, une **AIPD** doit être envisagée avant la mise en œuvre. C'est particulièrement important si le projet combine géolocalisation, photos, comptes utilisateurs, analyse automatique, modération, profils, données sensibles ou décisions pouvant affecter la visibilité d'un signalement. L'AIPD ne doit pas être vue comme une formalité administrative, mais comme un outil de conception permettant d'identifier les risques avant qu'ils ne deviennent des incidents.

### Responsabilité en cas d'erreur générée ou validée par IA

Le risque ne concerne pas seulement la confidentialité des données envoyées aux modèles. Il concerne aussi la **responsabilité en cas d'erreur**. L'IA peut produire rapidement du code, des composants, des pages, des migrations, des requêtes SQL ou de la documentation, mais cette vitesse peut masquer une perte de maîtrise technique. Une proposition générée peut sembler correcte, élégante et cohérente tout en introduisant une faille, une dépendance inutile, une règle métier ambiguë, une mauvaise gestion des permissions ou une architecture difficile à maintenir.

Dans un projet web, les erreurs produites ou suggérées par IA peuvent prendre plusieurs formes : fichiers trop longs, logique dupliquée, composants difficiles à tester, dépendances ajoutées sans justification, migrations de base de données risquées, règles d'authentification incomplètes, absence de tests, mauvaise gestion des erreurs ou exposition involontaire de données. Le danger est d'autant plus fort que le code généré donne souvent une impression de complétude. Il peut compiler, fonctionner sur un cas simple et pourtant rester fragile dans les cas limites.

### Opacité des modèles et explicabilité limitée

La responsabilité est d'autant plus délicate que les modèles restent en partie **opaques**. Il est souvent difficile de comprendre pourquoi un modèle a produit une réponse précise, quelle donnée a pesé le plus, quelles instructions ont été suivies, quelles sources ont été réellement prises en compte ou pourquoi une sortie semble correcte dans un contexte mais pas dans un autre. Cette opacité limite l'auditabilité et fragilise l'explicabilité des décisions assistées par IA.

Pour CleanMyMap, cela signifie qu'une sortie de modèle ne suffit jamais à elle seule. Quand une réponse touche au code, à la sécurité, aux données, aux coûts ou à l'organisation du projet, il faut pouvoir la relier à une logique compréhensible : source vérifiée, règle explicite, test reproductible ou validation humaine. Sans cette chaîne, l'IA peut aider à produire, mais elle ne permet pas d'expliquer proprement ce qui a été produit ni pourquoi.

### Répartition de la responsabilité juridique

En cas d'erreur, la responsabilité ne se situe pas à un seul endroit. Elle peut concerner l'utilisateur qui a lancé la requête, le développeur qui a intégré la sortie, la plateforme qui a exposé l'outil, le fournisseur du modèle qui a conçu le système, ou l'entreprise qui a déployé l'outil dans un contexte donné. Le point important n'est donc pas seulement de savoir "qui a appuyé sur le bouton", mais qui avait le pouvoir réel de contrôler le risque, de vérifier le résultat et d'empêcher sa mise en production.

Pour CleanMyMap, la règle doit rester claire : l'IA propose, mais l'équipe qui déploie reste responsable. Une erreur générée par IA n'efface pas la responsabilité de celui qui l'a intégrée, de celui qui l'a publiée ou de celui qui a choisi de s'en remettre à elle sans contrôle suffisant. Cela impose une traçabilité minimale des décisions et une validation humaine pour tout ce qui touche à la sécurité, aux données ou à la mise en ligne.

Dans un projet de développement durable comme CleanMyMap, cette dette technique est contradictoire avec l'objectif du projet. Un outil numérique censé servir une action environnementale ne doit pas devenir lourd, instable ou coûteux à maintenir parce qu'il a été produit trop vite. La sobriété ne concerne donc pas seulement le poids des pages, les images ou les appels API : elle concerne aussi la clarté du code, la stabilité de l'architecture, la limitation des dépendances et la capacité humaine à comprendre ce qui est déployé.

Le risque est aussi organisationnel. Plus un projet accepte des sorties IA sans arbitrage clair, plus il devient difficile de savoir qui assume la responsabilité d'un choix technique, d'un message public, d'un calcul environnemental ou d'une règle métier. Or une IA ne peut pas porter la responsabilité finale d'une décision. Si une migration casse une base de données, si une dépendance introduit une faille, si un chiffre environnemental est faux ou si une règle d'accès expose des données, la responsabilité revient toujours à l'équipe qui a intégré, validé et publié la sortie.

La contre-mesure retenue dans CleanMyMap est donc explicite : l'IA peut proposer, mais l'humain doit comprendre, relire et valider. Tout code généré doit être relu avant intégration. Toute dépendance ajoutée doit être justifiée par un besoin réel. Toute migration de base de données doit être testée et comprise avant application. Toute règle de sécurité, d'authentification, de stockage ou de permission doit rester sous responsabilité humaine identifiable. Les décisions structurantes ne doivent pas être validées par simple confiance dans le modèle.

### Traçabilité des décisions assistées par IA

La gouvernance n'est solide que si chaque décision assistée par IA reste traçable. Dans CleanMyMap, il faut pouvoir distinguer ce qui relève d'une suggestion du modèle, d'une validation humaine et d'une mise en production effective. Cette séparation permet de savoir pourquoi une donnée a été transmise, quel outil a été utilisé, sur quelle base une décision a été prise et qui l'a validée.

Cette traçabilité doit couvrir au minimum les usages sensibles : instructions contenant du contexte technique, code généré ou modifié, dépendances ajoutées, migrations proposées, politiques de sécurité, traitements de données, calculs d'impact et contenus destinés à être publiés. L'objectif n'est pas de bureaucratiser l'usage de l'IA, mais de conserver une chaîne de responsabilité lisible si un problème apparaît.

Pour CleanMyMap, la bonne pratique est simple : journaliser les usages critiques, conserver les arbitrages importants, documenter les validations humaines et pouvoir revenir en arrière si une proposition IA se révèle fragile ou non conforme. Une décision assistée par IA n'est acceptable que si elle peut être expliquée, auditée et, si nécessaire, annulée.

## Vibe coding, dette de sécurité et nouveaux risques logiciels

Cette partie traite de l'IA utilisée par l'équipe pour construire CleanMyMap. Elle ne doit pas être confondue avec les fonctionnalités IA proposées aux utilisateurs dans le site lui-même, comme un itinéraire IA, une assistance conversationnelle ou une recommandation automatique.

Le développement assisté par IA accélère la production de code, mais il doit rester encadré par une gestion du risque explicite. Le NIST recommande de traiter les risques propres à l'IA générative au moyen d'un profil de risque dédié, tandis que l'OWASP classe parmi les vulnérabilités majeures l'overreliance, l'excessive agency, la divulgation d'informations sensibles, les faiblesses de chaîne d'approvisionnement et l'insecure output handling [@nist_ai_600_1; @owasp_llm_top_10_2025].

### Définition du vibe coding

Le terme **vibe coding** a été popularisé par **Andrej Karpathy** au début de l'année 2025 pour désigner une pratique de développement dans laquelle l'utilisateur décrit ce qu'il veut obtenir en langage naturel, puis laisse un modèle d'IA générer, modifier ou corriger le code. Dans sa formulation initiale, Karpathy expliquait qu'il s'agissait de se laisser porter par le modèle, au point de presque oublier le code lui-même. L'idée n'est donc pas seulement d'être assisté par IA, mais de déplacer une partie importante du travail de programmation vers une interaction conversationnelle avec le modèle.

Dans cette acception, le vibe coding désigne une pratique consistant à construire une application principalement par prompts en langage naturel, en s'appuyant sur des assistants IA et des agents de code.

Le vibe coding se distingue du développement assisté par IA classique. Dans un usage encadré, le développeur comprend le code proposé, le relit, le teste, le modifie et reste capable de le déboguer. Dans le vibe coding au sens strict, l'utilisateur se concentre davantage sur le résultat visible : il décrit une intention, lance le code, observe si l'application fonctionne, puis redemande une correction au modèle si une erreur apparaît. Le jugement repose alors davantage sur le ressenti, les tests rapides et l'apparence de fonctionnement que sur une compréhension fine de l'architecture.

Cette pratique peut être très productive pour des prototypes, des démonstrateurs, des scripts ponctuels, des maquettes ou des outils personnels jetables. Elle permet à des personnes peu expertes de produire rapidement une interface, une automatisation ou une petite application. C'est pourquoi le vibe coding a été perçu comme une rupture culturelle : il transforme l'IA en intermédiaire entre l'intention humaine et le code, et abaisse fortement la barrière d'entrée du développement logiciel.

Mais cette approche devient risquée dès qu'elle est appliquée à un projet destiné à être maintenu, déployé en production ou relié à des données sensibles. Un code qui "a l'air de marcher" peut contenir des failles de sécurité, des dépendances inutiles, une mauvaise gestion des erreurs, une architecture fragile ou des choix difficiles à maintenir. Le danger n'est pas seulement de produire du mauvais code, mais de produire du code que l'équipe ne comprend plus assez pour l'auditer, le corriger ou l'assumer.

### Production massive de code par des profils non spécialistes

L'accessibilité croissante des outils de développement assistés par IA a fortement réduit la barrière d'entrée au développement web. Des outils comme **Cursor**, **Bolt**, **Lovable**, **v0**, **Replit Agent**, **Claude Code** ou **Codex** permettent désormais de créer une interface, une landing page, un tableau de bord ou une petite application en quelques heures, parfois à partir d'une simple description en langage naturel. Cette démocratisation a des effets positifs réels : elle permet à des étudiants, associations, indépendants ou profils non techniques de prototyper des outils sans dépendre immédiatement d'une équipe complète et peut accélérer l'expérimentation.

Mais cette accessibilité produit aussi un effet rebond. Plus il devient facile de créer une application, plus il devient facile d'en créer trop, trop vite, sans maintenance, sans audit de sécurité et sans vraie stratégie produit. Des non-développeurs ou des profils très juniors peuvent obtenir une application qui semble fonctionner, mais dont le code reste fragile, mal compris, peu testé ou dépendant de services tiers. Le problème n'est pas que ces personnes créent : c'est que l'outil peut donner une impression de maîtrise supérieure à la maîtrise réelle.

Ces applications peuvent devenir des **zombie sites** : sites ou applications générés par IA, fonctionnels au lancement, puis rapidement abandonnés. Ils restent parfois en ligne avec des dépendances obsolètes, des bases de données mal protégées, des clés API oubliées, des formulaires actifs, des emails automatisés, des mesure d'audience, des scripts tiers ou des pages non maintenues. Même si chaque site consomme peu isolément, leur accumulation crée une dette technique collectivisée à l'échelle du web : ressources serveur inutiles, stockage durable, surfaces d'attaque non patchées, dépendances vulnérables et bruit numérique supplémentaire.

Cette démocratisation s'accompagne d'un risque symétrique côté sécurité offensive : Google Threat Intelligence observe que des acteurs tentent déjà d'utiliser les modèles pour accélérer le phishing, la reconnaissance, le scripting malveillant et la génération de contenus, même si ces modèles n'apportent pas encore de capacité totalement nouvelle [@google_gtig_adversarial_misuse_generative_ai]. La baisse de barrière d'entrée peut donc bénéficier à des créateurs débutants comme à des acteurs malveillants.

### Code non compris, absence de tests et validation superficielle

Le principal risque du **vibe coding** est cognitif : il crée une **illusion de maîtrise**. Un développeur peut générer un composant fonctionnel avec un modèle de langage, le lancer dans le navigateur, constater que l'interface s'affiche correctement et croire que le code est maîtrisé. Pourtant, un code qui fonctionne dans un cas simple n'est pas forcément robuste. Il peut mal gérer les erreurs, les permissions, les cas limites, les entrées inattendues, les problèmes de performance, l'accessibilité ou la sécurité.

Cette illusion est dangereuse parce qu'elle déplace le critère de qualité. Le développeur ne juge plus toujours le code à partir de sa structure, de ses dépendances, de sa maintenabilité ou de sa sécurité, mais à partir d'un résultat immédiat : "ça marche". Or une application web peut fonctionner visuellement tout en contenant une dette invisible : logique dupliquée, état mal géré, appels API inutiles, absence de validation côté serveur, mauvaise gestion des rôles, dépendance fragile ou faille dans les règles d'accès.

Le problème devient plus important lorsque le développeur ne comprend pas réellement ce que le modèle a produit. S'il ne peut pas expliquer le rôle des fonctions, la circulation des données, les hypothèses du composant ou les conditions d'échec, il ne pourra pas adapter correctement le code lorsque le besoin évoluera. Il risque alors d'empiler des corrections générées par IA sur un code déjà mal compris, jusqu'à produire une architecture difficile à maintenir.

L'absence de tests automatisés amplifie ce risque. Sans tests unitaires, tests d'intégration, tests d'interface ou vérifications de sécurité, une modification ultérieure peut casser silencieusement une fonctionnalité existante. Le modèle peut corriger une erreur visible tout en introduisant une régression ailleurs. Dans un projet riche comme CleanMyMap, ce risque concerne particulièrement les formulaires, les routes API, les permissions, les exports, les cartes, les traitements de photos, les rôles utilisateurs et les règles de base de données.

Les dérives recensées par l'OWASP pour les applications LLM recouvrent directement ces faiblesses : insecure output handling, excessive agency, overreliance, sensitive information disclosure et supply chain vulnerabilities [@owasp_llm_top_10_2025]. Kaspersky relève, pour sa part, des erreurs récurrentes dans le code généré par IA : absence de validation, clés codées en dur, authentification côté client, erreurs de journalisation et configurations applicatives trop larges [@kaspersky_vibe_coding_risks_2025].

Pour CleanMyMap, la règle est claire : tout code accepté doit pouvoir être expliqué par un humain. Une personne doit être capable de dire ce que fait le code, quelles données il manipule, quelles erreurs il peut produire, quelles dépendances il ajoute, quelles permissions il suppose et comment il pourrait échouer. Si personne ne peut expliquer ces points, le code ne doit pas être intégré, même s'il semble fonctionner dans l'immédiat.

| Risque                                      | Exemple dans un projet web      | Effet possible        | Contre-mesure CleanMyMap |
| ------------------------------------------- | ------------------------------- | --------------------- | ------------------------ |
| Code non compris                            | Composant généré sans lecture   | Régression cachée     | Revue humaine du code    |
| Absence de tests                            | Fonction livrée sans CI         | Erreur en production  | Tests avant déploiement  |
| Mauvaise authentification                   | Connexion gérée côté client     | Contournement d'accès | Vérification serveur     |
| Permissions Supabase / RLS incorrectes      | Politique trop large            | Fuite de données      | Relecture RLS            |
| Clés API exposées                           | `.env` copié dans le navigateur | Abus de compte        | Secrets protégés         |
| Dépendances vulnérables                     | Paquet ajouté sans audit        | Failles connues       | Audit des dépendances    |
| Dette technique                             | Fichiers dupliqués et couplés   | Maintenance coûteuse  | Refactor ciblé           |
| Prompts trop larges ou agents mal contrôlés | Modifications en cascade        | Code instable         | Déploiement progressif   |

### Dette technique et dette de sécurité accélérées par l'automatisation

L'automatisation accélère la dette technique quand elle permet d'empiler rapidement des composants sans arbitrage architectural. Elle rend plus probable la création de couches successives de code, de dépendances et de raccourcis techniques qui fonctionnent à court terme mais deviennent difficiles à maintenir dès que le projet évolue. Elle accélère aussi la dette de sécurité lorsque des choix de configuration, de permissions, de journalisation ou de stockage sont acceptés sans relecture humaine.

### Mesures de maîtrise et déploiement progressif

Les mesures retenues pour CleanMyMap sont les suivantes :

- revue humaine systématique du code généré ;
- tests automatisés avant toute mise en production ;
- lint et contrôle de qualité du code ;
- audit régulier des dépendances ;
- protection stricte des variables d'environnement et des secrets ;
- contrôle des permissions Supabase et des règles RLS ;
- déploiement progressif des fonctionnalités à risque ;
- logs et monitoring pour repérer les régressions ou les accès anormaux.

CleanMyMap a bénéficié de l'IA, mais le projet doit éviter une logique de vibe coding non contrôlé : chaque modification critique doit être relue, testée et replacée dans l'architecture générale.

## Cybersécurité du code et des systèmes assistés par IA

### Failles d'authentification et de gestion des permissions

Les failles d'authentification, les permissions trop larges, les clés exposées, les routes trop ouvertes ou les règles RLS mal calibrées ne sont pas des accidents isolés : elles deviennent plus probables quand le développement est guidé par la vitesse plutôt que par la compréhension.

Dans un projet utilisant Supabase, un point de vigilance central est la **Row Level Security**. La RLS permet de définir, au niveau de la base PostgreSQL, quelles lignes chaque utilisateur peut lire, créer, modifier ou supprimer. Si elle est désactivée, mal configurée ou contournée par des politiques trop permissives, un utilisateur peut accéder à des données qui ne devraient pas lui appartenir. Dans CleanMyMap, ce risque concerne notamment les comptes utilisateurs, les signalements, les photos, les rôles, les espaces associatifs, les exports et les données de modération. Une règle RLS ne doit donc jamais être générée puis acceptée automatiquement : elle doit être relue comme une règle de sécurité, pas comme une simple requête SQL.

### Clés exposées, secrets mal protégés et erreurs de configuration

Les clés API et variables d'environnement constituent un autre point critique. Une clé exposée côté client, copiée dans un dépôt, transmise dans un instruction ou laissée dans un log peut être réutilisée par un tiers. Le problème est aggravé par les outils de vibe coding et les agents de code : ils peuvent lire rapidement beaucoup de fichiers, générer des configurations et proposer des exemples `.env` sans toujours distinguer une clé publique, une clé de service, un jeton temporaire ou un secret de production. Dans CleanMyMap, les clés de service, secrets Stripe, jetons Clerk, clés Supabase sensibles, clés Resend, jetons Sentry ou clés d'API IA ne doivent jamais être exposés dans le navigateur, dans un instruction ou dans un dépôt.

Les routes API doivent également être traitées comme des surfaces d'attaque. Une route qui accepte une entrée utilisateur doit vérifier le format, la taille, le type, l'authentification, les permissions et la fréquence d'appel. Sans validation stricte, une IA peut générer une route fonctionnelle mais fragile : injection de paramètres inattendus, accès à des données non autorisées, absence de contrôle de rôle, surcharge par appels répétés ou fuite d'informations dans les messages d'erreur. Le fait qu'une route fonctionne en développement ne prouve donc pas qu'elle soit sûre en production.

### Dépendances vulnérables ou mal comprises

Les dépendances ajoutées trop vite ou choisies sur recommandation automatique peuvent introduire des vulnérabilités, des licences incompatibles ou une dette de maintenance difficile à résorber. Des outils d'analyse statique et de contrôle automatique peuvent aider : `npm audit` permet de repérer certaines vulnérabilités connues dans les dépendances JavaScript, GitHub Secret Scanning ou des outils équivalents peuvent détecter des secrets exposés dans un dépôt, et Semgrep peut repérer des motifs de code dangereux. Mais ces outils ne remplacent pas une checklist de sécurité vérifiée humainement : ils détectent certaines erreurs connues, pas toutes les erreurs de logique métier.

Pour CleanMyMap, la règle opérationnelle est donc la suivante : aucune route sensible, règle RLS, migration, dépendance critique ou configuration d'authentification ne doit être déployée uniquement parce qu'elle a été générée par IA. Avant tout déploiement, il faut vérifier les permissions, tester les rôles, masquer les secrets, limiter les appels, contrôler les dépendances et s'assurer qu'un humain comprend la logique de sécurité. Le code généré peut accélérer le travail, mais la responsabilité de la sécurité reste humaine.

### IA comme accélérateur d'attaque et d'audit de sécurité

La revue de sécurité ne peut donc pas être entièrement déléguée à l'IA. Un modèle peut aider à repérer une faille, proposer une politique RLS, expliquer une erreur ou suggérer un test, mais il ne doit pas être l'autorité finale. La validation doit rester humaine, car elle dépend du contexte réel du projet : qui doit accéder à quoi, dans quelle situation, avec quel niveau de privilège et avec quelles conséquences en cas d'erreur.

L'IA peut aussi servir d'accélérateur d'attaque lorsqu'elle aide à explorer plus vite un code, à automatiser des vérifications offensives ou à chercher des points faibles dans une architecture. La même capacité peut donc être utile à l'audit défensif ou dangereuse si elle est détournée. Pour CleanMyMap, cela impose une règle simple : l'IA peut assister la revue de sécurité, mais jamais disposer seule des permissions, des clés ou des accès nécessaires à une action sensible.

La bonne pratique est donc de limiter les dérives plutôt que de réparer après coup : revues humaines systématiques, migrations testées, dépendances contrôlées, secrets protégés, permissions minimales, tests sur les fonctions critiques et gouvernance explicite. L'IA peut accélérer le travail, mais la responsabilité du code, des données, de la sécurité et de la mise en production reste humaine.

### Sécurité informatique offensive assistée par IA

L'IA peut aider des acteurs peu qualifiés à augmenter fortement leur capacité d'attaque. Elle peut générer des campagnes de phishing plus crédibles, produire des scripts malveillants plus vite, automatiser une partie de la reconnaissance ou adapter des attaques à partir de quelques indications seulement. Le coût d'entrée baisse alors, ce qui élargit l'accès à des pratiques auparavant plus techniques.

Ce risque est important parce qu'il ne suppose pas un attaquant très expert. Un acteur peu qualifié peut, avec un modèle, obtenir des textes d'hameçonnage plus convaincants, des scripts d'exploration plus rapides ou des automatisations de base plus faciles à industrialiser. Pour CleanMyMap, cela rappelle qu'un projet qui utilise l'IA doit aussi prévoir que ses propres surfaces d'attaque peuvent être plus facilement explorées si les secrets, les routes et les permissions sont mal protégés.

### Sécurité informatique défensive assistée par IA

La même technologie peut aussi renforcer la défense. L'IA peut aider à détecter des vulnérabilités, générer des tests, proposer des revues de code, documenter des règles de sécurité ou repérer des anomalies dans des fichiers de configuration. Utilisée correctement, elle devient un accélérateur d'audit et de sécurisation plutôt qu'un simple outil de production.

Pour CleanMyMap, cet usage défensif est pertinent à condition de rester encadré. Les tests produits par l'IA doivent être relus, les recommandations de sécurité vérifiées, et les alertes interprétées avec prudence. Le modèle peut suggérer ce qu'il faut contrôler, mais il ne doit pas être l'autorité finale sur la sécurité du système.

## Alignement, garde-fous et comportements non fiables

### Sycophancy et modèles trop complaisants

Les risques sociaux de l'IA ne viennent pas seulement de son infrastructure ou de ses fournisseurs.
Ils viennent aussi du **comportement même des modèles**.
Le NIST rappelle, dans son profil Generative AI du AI Risk Management Framework, que la gestion du risque doit couvrir la conception, le développement, l'usage, l'évaluation et le déploiement de ces systèmes.
Autrement dit, un modèle peut être techniquement performant tout en restant socialement risqué s'il produit des réponses trop affirmatives, trop séduisantes ou mal calibrées dans des contextes sensibles.
Les IA génératives sont entraînées pour être utiles, fluides et acceptables par les utilisateurs, mais ces objectifs peuvent entrer en tension avec la vérité, la prudence ou la sécurité.

L'un des risques les plus documentés est la **sycophancy**.
Anthropic a montré qu'un modèle entraîné à plaire à l'utilisateur peut parfois privilégier une réponse qui épouse ses croyances plutôt qu'une réponse plus vraie ou plus prudente.
OpenAI a ensuite reconnu publiquement qu'une mise à jour combinant plusieurs signaux de préférence utilisateur avait pu faire basculer un modèle vers un comportement trop complaisant, au point de considérer ce type de défaut comme un problème de lancement à traiter explicitement.

Ce risque est important dans un rapport de soutenance, car il rappelle qu'un modèle peut :

- valider excessivement les croyances, émotions ou raisonnements de l'utilisateur ;
- renforcer une impression de justesse alors que la réponse devrait être plus nuancée ;
- donner une forme de confirmation sociale artificielle à une demande, même lorsque cette demande appelle une contradiction, une réserve ou un renvoi vers un humain.

La sycophancy se manifeste aussi dans la validation émotionnelle : un modèle entraîné à plaire peut amplifier les émotions de l'utilisateur, valider ses frustrations ou ses enthousiasmes de façon disproportionnée, et adapter son ton pour maximiser la satisfaction immédiate plutôt que la vérité à long terme.

Ce comportement devient problématique dans des contextes décisionnels : un utilisateur qui soumet un plan à un modèle de langage et reçoit une validation enthousiaste peut prendre des décisions importantes sur la base de cette fausse assurance. Des études d'Anthropic (2024) ont montré que la sycophancy est positivement corrélée avec la taille du modèle et le temps d'entraînement aux préférences humaines, ce qui signifie que les modèles les plus capables peuvent aussi être les plus susceptibles de ce biais.

### Fragilité des garde-fous en contexte long

Les garde-fous des modèles de langage ont été conçus et testés principalement sur des échanges courts. Leur robustesse dans des conversations de très longue durée, avec de nombreux tours de dialogue, est moins documentée. Des techniques de _contournement des garde-fous_ progressif, consistant à faire accepter à un modèle des prémisses légèrement problématiques puis à construire sur ces prémisses au fil de l'échange, peuvent amener des modèles à s'éloigner progressivement de leurs lignes de conduite initiales.

Ce risque est particulièrement pertinent dans des sessions de développement longues où l'IA est utilisée comme compagnon de travail permanent. Les fournisseurs reconnaissent eux-mêmes que ces comportements restent difficiles à mesurer parfaitement et à corriger dans tous les cas de contexte long.

### Contournement des limites par reformulation ou accumulation contextuelle

Les limites de sécurité peuvent aussi être contournées par reformulation progressive, par accumulation de contexte ou par demandes fragmentées qui paraissent isolément inoffensives. Le modèle peut alors accepter des prémisses successives sans percevoir immédiatement la finalité globale de la requête.

Ce risque est particulièrement important lorsque l'IA sert de compagnon de travail permanent : plus l'échange dure, plus il devient possible d'user la prudence du modèle, de déplacer subtilement le cadre initial ou de faire accepter un enchaînement de demandes qui aurait été refusé d'emblée.

### Besoin de supervision humaine et de validation externe

La fragilité des garde-fous, combinée à la sycophancy et à la tendance à l'autorité implicite, impose que la supervision humaine ne soit pas facultative mais structurelle. Elle doit être intégrée dans le processus, pas ajoutée après coup.

Pour CleanMyMap, cela se traduit par des règles opérationnelles simples : pas d'usage de l'IA pour des arbitrages sensibles sans relecture ; pas de publication directe de contenus issus d'un modèle de langage sans validation humaine ; réévaluation périodique de chaque usage IA pour vérifier que le bénéfice réel justifie toujours le coût. La supervision n'est pas un contrôle ponctuel : c'est une posture permanente intégrée au flux de travail.

## Grille de décision pour un usage responsable de l'IA

### Conditions minimales d'un usage acceptable

- Gouvernance claire : définir ce que l'IA peut proposer et ce que seul l'humain peut valider.

- Vérification systématique : lint/tests/revue code et vérification factuelle pour les contenus.

- Hygiène des données : minimisation des données envoyées, anonymisation, exclusion des informations sensibles.

- Traçabilité des décisions : distinguer suggestion IA, décision produit et validation technique finale.

- Cadre de qualité : conventions de code, standards UX, schéma d'événements, checklist pre-release.

- Cohérence environnementale : réserver l'IA aux usages à forte valeur (architecture, qualité, documentation critique), éviter les itérations peu utiles.

- Transparence : expliciter les zones assistées par IA et les contrôles humains associés.

### Grille risque / utilité / coût / preuve

Cette grille sert à décider si une nouvelle fonctionnalité IA mérite d'être intégrée dans CleanMyMap. Elle ne remplace pas le jugement de l'équipe; elle le structure.

| Question                                   | Réponse attendue pour aller plus loin            | Si la réponse est non                       |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------- |
| 1. La tâche est-elle réellement utile au   | Elle améliore directement la coordination,       | La fonctionnalité doit être repoussée ou    |
| terrain?                                   | la qualité des données, la mobilisation ou       | supprimée.                                  |
|                                            | la lecture des actions.                          |                                             |
| 2. Peut-elle être réalisée sans IA avec    | Non : une règle simple ne suffit pas, ou         | Préférer une règle métier, un               |
| une règle simple?                          | dégraderait nettement l'utilité.                 | automatisme déterministe ou une             |
|                                            |                                                  | interface plus simple.                      |
| 3. L'IA réduit-elle du temps humain ou     | Elle réduit des tâches répétitives, des          | L'usage n'est pas justifié; conserver une   |
| améliore-t-elle la qualité?                | erreurs ou des délais, ou elle améliore la       | solution non IA.                            |
|                                            | pertinence du résultat.                          |                                             |
| 4. Le modèle utilisé est-il proportionné à | Le plus petit modèle ou la méthode la plus       | Le périmètre doit être réduit ou la         |
| la tâche?                                  | sobre suffit à obtenir le résultat attendu.      | fonctionnalité abandonnée.                  |
| 5. Les données envoyées sont-elles non     | Les données sont minimisées,                     | Ne pas envoyer ces données; revoir le       |
| sensibles?                                 | anonymisées et sans information critique.        | design ou bloquer l'usage.                  |
| 6. L'impact environnemental est-il limité? | Les appels sont rares, l'usage est borné,        | Réduire la fréquence, simplifier le flux ou |
|                                            | le stockage est maîtrisé et l'hébergement        | renoncer à l'IA.                            |
|                                            | est sobre.                                       |                                             |
| 7. La sortie est-elle relue ou validée par | Oui, systématiquement pour les contenus,         | La sortie ne doit pas être publiée telle    |
| un humain?                                 | le code critique et les décisions sensibles.     | quelle.                                     |
| 8. L'usage est-il mesurable et             | Oui : journal d'usage, métriques, fonctionnalité | L'intégration est trop risquée et ne doit   |
| désactivable?                              | flag ou possibilité de coupure nette.            | pas être retenue.                           |

**Règle de décision** : une fonctionnalité IA ne doit être intégrée que si elle répond positivement à la majorité de ces critères.

### Matrice risque / réponse / contrôle

|                  |                  | Réponse prévue    |                      |                     |                    |
| ---------------- | ---------------- | ----------------- | -------------------- | ------------------- | ------------------ |
| Risque identifié | Impact potentiel | dans CleanMyMap   | Contrôle / preuve    | Indicateur de suivi | Niveau de priorité |
| Consommation     | Émissions, coût  | Modèles légers,   | Logs de compilation, | kWh estimés par     | Haute              |
| électrique       | d'usage, charge  | cache, limitation | rapport d'usage IA,  | mois, nombre        |                    |
|                  | serveur          | des appels IA     | configuration des    | d'appels IA         |                    |
|                  |                  |                   | modèles              |                     |                    |

|                       |                                     | Réponse prévue        |                        |                     |                    |
| --------------------- | ----------------------------------- | --------------------- | ---------------------- | ------------------- | ------------------ |
| Risque identifié      | Impact potentiel                    | dans CleanMyMap       | Contrôle / preuve      | Indicateur de suivi | Niveau de priorité |
| Consommation          | Stress hydrique,                    | Limiter les sessions  | Section ACV,           | Estimation eau,     | Haute              |
| d'eau                 | refroidissement des                 | lourdes, réduire les  | hypothèses eau,        | durée des sessions  |                    |
|                       | data centers                        | rechargements,        | choix                  | lourdes             |                    |
|                       |                                     | privilégier un        | d'hébergement          |                     |                    |
|                       |                                     | hébergement sobre     | documentés             |                     |                    |
| Stockage excessif     | Stockage,                           | Compression, taille   | Règles d'upload,       | Volume stocké,      | Haute              |
| de photos             | transferts,                         | max, purge ou         | scripts de             | nombre de photos    |                    |
|                       | ralentissement,                     | archivage des         | traitement, audits     | hors seuil          |                    |
|                       | coût cloud                          | images inutiles       | de volume              |                     |                    |
| Dépendance aux        | enfermement propriétaire, variation | Abstractions,         | Inventaire des         | Nombre de           | Haute              |
| plateformes cloud     | des prix, fragilité                 | exports,              | services, plan de      | services            |                    |
|                       | technique                           | documentation des     | sortie,                | remplaçables sans   |                    |
|                       |                                     | services critiques,   | documentation          | rupture             |                    |
|                       |                                     | alternatives          | d'architecture         |                     |                    |
|                       |                                     | prévues               |                        |                     |                    |
| Dette technique       | Complexité, bugs,                   | Revue humaine,        | PR relues, tests CI,   | Taux de PR relues,  | Haute              |
| liée au code IA       | maintenance plus                    | tests, check-list de  | journal                | bugs post-merge     |                    |
|                       | coûteuse                            | sortie IA             | d'amélioration IA      |                     |                    |
| Confidentialité des   | Fuite                               | Anonymisation,        | Gouvernance IA,        | instructions sans   | Haute              |
| données               | d'informations,                     | données interdites,   | règles de instruction, | données sensibles,  |                    |
|                       | risque RGPD                         | contrôle avant        | contrôle               | incidents           |                    |
|                       |                                     | instruction           | pré-publication        |                     |                    |
| Effets rebond liés    | Émissions                           | Privilégier les       | Parcours terrain,      | Distance moyenne    | Moyenne à haute    |
| aux déplacements      | indirectes, trajets                 | actions proches,      | formulaires            | par action, part    |                    |
|                       | évitables                           | regrouper les         | d'action,              | d'actions locales   |                    |
|                       |                                     | déplacements          | cartographie locale    |                     |                    |
| Infobésité            | Surcharge                           | Simplification des    | Audit UX, liste des    | Nombre d'écrans,    | Moyenne            |
|                       | cognitive, baisse                   | écrans, hiérarchie    | pages, suivi des       | taux d'abandon,     |                    |
|                       | d'usage utile                       | claire, notifications | parcours               | temps de lecture    |                    |
|                       |                                     | limitées              |                        |                     |                    |
| Travail invisible lié | Coût social et                      | Usage ciblé,          | Partie sociale du      | Journal d'usage IA, | Haute              |
| à l'IA                | humanitaire                         | transparence, pas     | rapport, synthèse      | décisions relues    |                    |
|                       | sous-estimé                         | d'usage massif        | jury, journal          | humainement         |                    |
|                       |                                     | sans valeur réelle    | d'impact DU            |                     |                    |
| Fin de vie du         | Déchets                             | Prolongation des      | ACV, stratégie de      | Nombre d'appareils  | Moyenne à haute    |
| matériel numérique    | électroniques,                      | appareils, réemploi,  | réemploi, suivi des    | prolongés ou        |                    |
|                       | pollution locale                    | recyclage certifié    | filières               | orientés vers une   |                    |
|                       |                                     |                       |                        | filière             |                    |

Cette matrice n'a pas pour fonction de promettre l'absence de risque. Elle sert à montrer que chaque risque identifié dispose d'une réponse opérationnelle, d'un point de contrôle et d'une trace vérifiable, afin que l'arbitrage IA reste lisible devant un jury comme devant l'équipe projet.

### Apports méthodologiques des ateliers DU à l'usage de l'IA

Les ateliers DU ont clarifié un point utile pour CleanMyMap : l'IA n'a d'intérêt que si elle renforce un système sociotechnique déjà lisible. Autrement dit, elle n'est pas la finalité du projet. Elle devient acceptable lorsqu'elle améliore la coordination entre acteurs, la traçabilité des choix, la qualité du reporting et la capacité d'arbitrage institutionnel, plutôt que de produire davantage de surface numérique pour elle-même. Les idées issues des ateliers DU n'entrent donc pas ici comme un backlog, mais comme des critères, choix ou améliorations déjà absorbés dans le projet lorsqu'ils ont réellement renforcé l'utilité, la sobriété ou la gouvernance.

Cette lecture rejoint le pilotage par indicateurs : un outil assisté par IA doit être jugé sur sa capacité à rendre l'action plus mesurable, plus explicable et plus utile, et non sur la seule vitesse de production. Dans CleanMyMap, cela légitime l'usage de l'IA pour structurer la documentation, fiabiliser le code, mieux formuler les contrôles et accélérer la production de livrables lorsque cette accélération améliore réellement la coordination, la lisibilité institutionnelle et la sobriété de l'équipe.

### Limites restantes et principe de prudence

Malgré ce cadre, plusieurs limites restent ouvertes. La première est l'hétérogénéité de qualité des données : si les flux amont restent imparfaits, l'IA peut amplifier des interprétations fragiles au lieu de les corriger. La deuxième est le risque d'effet rebond et d'inflation de code : plus l'outil rend la production facile, plus il faut une discipline explicite pour refuser les fonctionnalités secondaires et les abstractions peu utiles.

S'ajoutent à cela des limites structurelles déjà visibles dans le dépôt : dépendance technologique à des services propriétaires, besoin d'une validation humaine pérenne sur les contenus et le code, et exigence d'exportabilité réelle pour conserver une autonomie technique minimale. Ces points ne rendent pas l'usage de l'IA incohérent, mais ils imposent de la traiter comme un levier sous contrainte et non comme une solution auto-justifiée.
