# Partie X — Sobriété numérique du site {#partie-x-sobriete-numerique-du-site}

Elle résume l'audit détaillé et la dette future en un plan d'action court, orienté réduction effective.
Elle traduit en décisions techniques les constats des parties précédentes : réduire les coûts observés par l'ACV, limiter les dépendances et maintenir un niveau d'utilité compatible avec l'IUR visé.

## Optimisations prioritaires

### Optimisations déjà exécutées

**Réalisées (mai 2026)**

1. Isolation CSS Leaflet hors du layout global.
2. Filtres CI/CD `paths-ignore` pour la documentation.
3. Conversion du logo principal en WebP avec une réduction de **88 %**.

### Optimisations restantes

1. Désactiver le refresh SWR global et le rendre opt-in.
2. Continuer la conversion des PNG publics lourds en WebP/AVIF.
3. Mettre des limites strictes aux photos uploadées.
4. Réduire les événements mesure d'audience aux décisions produit utiles.
5. Charger `html-to-image`, confetti, calendrier et graphiques uniquement à la demande.
6. Pré-calculer les rapports et tableaux de bord lourds.
7. Supprimer ou fusionner les routes API redondantes.
8. Réduction du poids des images, compression et stockage

- mode sombre natif par défaut ou fortement encouragé, afin de réduire la consommation des écrans OLED sur mobile ;
- compression côté client avant upload ;
- taille maximale et nombre maximal d'images par signalement ;
- miniatures pour cartes et listes ;
- conversion progressive des assets publics lourds en WebP/AVIF ;
- politique de rétention pour photos, exports et pièces jointes ;
- suppression des doublons et archivage de ce qui n'a plus d'utilité probatoire.

Le stockage photo reste l'un des leviers les plus importants du plan de réduction.

## Limitation des services numériques coûteux

### Limitation des mesures d'audience et des services tiers

Décisions à appliquer :

- consentement strict pour les mesures d'audience ;
- échantillonnage faible sur PostHog et Sentry ;
- suppression des événements qui n'alimentent aucune décision produit ;
- liste officielle des services actifs avec utilité, coût, données traitées et plan de sortie ;
- isolation des services critiques derrière des modules d'adaptation : Clerk, Stripe, Resend, PostHog, Sentry, Upstash, Pinecone.

### Limitation des notifications et du bruit numérique

Les notifications doivent rester rares, utiles, désactivables et liées à une action concrète. Tout mécanisme qui sert surtout à maintenir l'attention ou à multiplier les relances doit rester optionnel ou être désactivé.

Cette exigence vaut aussi pour la dimension attentionnelle du numérique. Notifications, emails, relances, gamification et badges peuvent augmenter le temps d'écran et les micro-usages sans améliorer l'action terrain. Le numérique "engageant" devient alors contraire à l'objectif du projet s'il capte l'attention au lieu de la convertir en action utile.

### Réduction des données dormantes, logs et caches

Le stockage des photos, des logs et des caches doit rester strictement borné par l'utilité réelle. Une conservation durable n'est justifiée que pour la preuve, la sécurité, la maintenance ou le reporting utile.

## Architecture alternative plus sobre

- **Core public léger** : accueil, déclaration simple, carte, rapports publics, méthodologie ;
- **carte isolée** : import dynamique Leaflet, données par bbox, cluster serveur, vue liste par défaut sur mobile ;
- **API réduite** : lectures publiques avec cache court, `no-store` réservé au privé ;
- **données sobres** : Supabase source de vérité, exports CSV/JSON simples, Google Sheets limité à l'import/export ;
- **fonctions secondaires figées** : chat, gamification avancée, sponsor portal, sandbox, recommandations IA, vectoriel seulement si usage prouvé ;
- **IA optionnelle** : aucun appel IA dans les parcours critiques tant qu'une heuristique suffit.

### Estimation des gains possibles

| Action                               |                                             Gain potentiel | Confiance |
| ------------------------------------ | ---------------------------------------------------------: | --------- |
| Compression images + miniatures      |                        -30 % à -80 % sur médias transférés | élevée    |
| Lazy loading strict des cartes       |                      -300 Ko à -1,5 Mo sur pages non carte | moyenne   |
| Réduction Framer Motion              |                              -50 à -200 Ko JS selon routes | moyenne   |
| SWR opt-in au lieu de refresh global |    -20 % à -70 % de requêtes sur tableaux de bord inactifs | moyenne   |
| Cache rapports/exports               | -30 % à -90 % de calcul serveur sur consultations répétées | moyenne   |
| CI filtrée docs-only                 |                 -10 % à -40 % de minutes CI selon activité | moyenne   |
| Suppression dépendances inutilisées  |                         gain variable, surtout maintenance | moyenne   |

### Indicateurs de suivi après mise en production

| Indicateur                                          | Ce qu'il permet de vérifier                                          |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| Nombre de signalements validés                      | si la plateforme capte des données utiles et réellement exploitables |
| Nombre de cleanwalks organisées                     | si le site déclenche ou facilite des actions concrètes               |
| Nombre de participants                              | si la coordination améliore la mobilisation collective               |
| Quantité estimée de déchets retirés                 | si l'utilité environnementale reste tangible                         |
| Rapports transmis aux associations ou collectivités | si les données produites deviennent réutilisables                    |
| Poids moyen des pages                               | si le service reste léger pour les utilisateurs                      |
| Poids moyen des photos uploadées                    | si le coût média est maîtrisé                                        |
| Nombre moyen de requêtes par session                | si la complexité applicative reste contenue                          |
| Volume de stockage Supabase                         | si l'accumulation des données reste proportionnée                    |
| Nombre d'appels IA                                  | si l'usage de l'IA reste ciblé                                       |
| Volume de mesure d'audience collecté                | si la mesure d'usage ne devient pas elle-même un surcoût             |

### Grille de décision avant toute fonctionnalité coûteuse ou assistée par IA

Pour éviter qu'une nouvelle fonctionnalité soit ajoutée simplement parce qu'elle est techniquement faisable, le projet doit appliquer une grille d'arrêt explicite avant développement ou mise en production.

| Question                                                         | Réponse attendue pour continuer                                           | Si la réponse est non                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| La fonctionnalité améliore-t-elle directement l'action terrain ? | oui, sur le signalement, la coordination, la preuve ou le reporting utile | ne pas développer ou retirer du coeur produit |
| Une règle simple ou un flux non IA suffit-il ?                   | non, un mécanisme déterministe serait insuffisant                         | préférer la solution simple                   |
| Le coût numérique est-il borné ?                                 | oui, fréquence, stockage et calcul restent limités                        | réduire le périmètre ou refuser               |
| Les données nécessaires sont-elles non sensibles ou minimisées ? | oui, données réduites et protégées                                        | revoir le design ou bloquer la fonction       |
| La sortie est-elle vérifiable humainement ?                      | oui, relecture, test, audit ou comparaison possible                       | ne pas automatiser                            |
| L'usage est-il mesurable et désactivable ?                       | oui, fonctionnalité flag, métriques, journal d'usage                      | ne pas intégrer                               |

Cette grille doit valoir pour l'IA, mais aussi pour toute couche numériquement coûteuse : tableau de bord, carte enrichie, stockage média, outils de mesure d'audience avancés, moteur de recommandation ou export sophistiqué.
Une fonctionnalité n'est pas légitime parce qu'elle est moderne ; elle l'est si elle augmente l'utilité nette sans faire dériver le projet vers l'inflation de code, de données ou de dépendances.

## Traduction en actions concrètes sur le site

Une fois les priorités techniques posées, il faut encore les convertir en règles de pilotage stables pour l'équipe et pour les futures évolutions du service.

### Principes directeurs à retenir

Elle convertit les constats précédents en règles de pilotage, de contrôle et de priorisation applicables au projet.

La traduction opérationnelle repose sur un socle simple : des indicateurs lisibles, un arbitrage explicite entre utilité et coût numérique, une gouvernance humaine assumée, une formalisation des limites connues et une priorisation stricte des usages IA à forte valeur. Le but n'est pas d'industrialiser l'IA partout, mais de l'autoriser seulement lorsqu'elle renforce la fiabilité, la traçabilité et la sobriété du produit.

- Principe 1 : toute production assistée IA doit être vérifiable et testable.
- Principe 2 : prioriser les usages IA à forte valeur ajoutée (qualité, architecture, documentation, accessibilité).
- Principe 3 : protéger les données et limiter les expositions inutiles.
- Principe 4 : maintenir une cohérence écologique (sobriété numérique + efficacité produit).
- Principe 5 : conserver une responsabilité humaine explicite sur les contenus et le code en production.

### Tableau de pilotage synthétique

- **A. Check-list "sortie IA avant merge"** — État : **réalisé**. Contrôle : exactitude technique, conventions, tests, sécurité, UX. Impact attendu : réduire les régressions et la dette technique.
- **B. Validation humaine des contenus environnementaux** — État : **réalisé (mai 2026)**. Contrôle : flux de travail de validation via `CONTENT_VALIDATION_WORKFLOW.md`. Impact attendu : réduire le risque de surpromesse.
- **C. Standardisation des usages IA utiles** — État : **réalisé (mai 2026)**. Contrôle : guide de instructions via `PROMPT_GUIDE.md`. Impact attendu : réduire le bruit numérique et les instructions inutiles.
- **D. Protection des données sensibles** — État : **réalisé (mai 2026)**. Contrôle : politique de sécurité via `DATA_PROTECTION_POLICY.md`. Impact attendu : réduire les risques juridiques et éthiques.
- **E. Gouvernance IA explicite** — État : **réalisé**. Contrôle : document de gouvernance et points de contrôle projet. Impact attendu : clarifier les responsabilités.
- **F. Garde-fous qualité automatisés** — État : **démarré**. Contrôle : lint, tests, couverture minimale, contrôles accessibilité/performance. Impact attendu : limiter les régressions silencieuses.
- **G. Clarté des messages environnementaux** — État : **réalisé (mai 2026)**. Contrôle : flux de travail de clarté via `CONTENT_VALIDATION_WORKFLOW.md`. Impact attendu : améliorer la lisibilité publique.
- **H. Sobriété numérique dans les décisions produit** — État : **démarré**. Contrôle : poids des pages, requêtes, composants peu utiles, chargements différés. Impact attendu : réduire données, énergie et batterie.
- **I. Gouvernance technique et éditoriale** — État : **démarré**. Contrôle : rôles explicites de validation. Impact attendu : rendre les décisions plus traçables.
- **J. Fiabilité des indicateurs** — État : **réalisé (mai 2026)**. Contrôle : protocole de revue via `METRICS_RELIABILITY_PROTOCOL.md`. Impact attendu : éviter des indicateurs trompeurs.

### Bonnes pratiques à maintenir dans la durée

- Pratique 1 : toujours vérifier avant publication (contenu + code + données).
- Pratique 2 : préférer des demandes IA bornées, avec contexte précis et critères d'acceptation.
- Pratique 3 : documenter les décisions critiques et leurs arbitrages.
- Pratique 4 : surveiller les régressions de qualité et corriger rapidement.
- Pratique 5 : maintenir l'alignement entre efficacité de développement et finalité environnementale.
- Pratique 6 : revisiter périodiquement le ratio "gain de temps IA" vs "coût de vérification".

En synthèse, cette section fixe moins une liste d'outils qu'une discipline de décision : n'autoriser l'IA et la complexité produit que lorsqu'elles renforcent clairement l'utilité, la fiabilité et la sobriété du projet.

La partie suivante ne détaille plus les actions à mener : elle fixe la position institutionnelle qui permet de juger si ce plan de réduction est suffisant.
