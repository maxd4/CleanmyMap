# Audit du système de quiz CleanMyMap

Cette note synthétise l'audit du système de quiz et liste les points qui doivent encore être validés manuellement.

## Résultat de l'audit automatisé

- Banque inspectée: 115 questions.
- Audit qualité: 87 avertissements, 0 erreur.
- Audit des sources: 0 question sans source, 0 chiffre non sourcé, 0 règle locale non marquée variable.
- Questions à relire: 51.
- Sources faibles ou trop vagues: 69.

## Corrections sûres appliquées

- Le build de production a été débloqué en sécurisant la lecture de `sourceHealth` dans [apps/web/src/lib/actions/map-route.ts](../../apps/web/src/lib/actions/map-route.ts).
- Un test de progression personnelle a été aligné sur le type exporté par le module correspondant dans [apps/web/src/lib/learning/quiz-personal-progress.test.ts](../../apps/web/src/lib/learning/quiz-personal-progress.test.ts).

## Performance et quotas Vercel / Supabase

- La banque de questions reste chargée localement depuis `data/environmental-quiz-bank.ts` via [apps/web/src/lib/learning/quiz-question-bank.ts](../../apps/web/src/lib/learning/quiz-question-bank.ts), sans fetch réseau au montage.
- Le chargement SRS côté utilisateur reste borné à la liste courante de questions et bénéficie désormais d'un cache mémoire court dans [apps/web/src/lib/services/quiz-srs-service.ts](../../apps/web/src/lib/services/quiz-srs-service.ts), ce qui évite les lectures Supabase répétées lors de remounts rapides.
- Le stockage personnel du quiz reste d'abord local (`localStorage`) pour les états anonymes et les progressions non critiques.
- Les métriques pédagogiques restent limitées à un envoi POST par session terminée via [apps/web/src/lib/learning/quiz-pedagogical-metrics-client.ts](../../apps/web/src/lib/learning/quiz-pedagogical-metrics-client.ts); il n'y a pas de polling.
- La synchronisation des bonnes réponses n'est appelée que lorsque la feature flag `quizServerSync` est activée; elle reste désactivée par défaut.

## Points à valider manuellement

### Équilibre pédagogique

- Vérifier que chaque mode garde bien sa promesse pédagogique: Terrain, Données scientifiques, Sensibilisation, Habitudes de vie, Ordres de grandeur, Tri & sécurité, Mixte.
- Revoir les questions signalées comme trop directes ou trop évidentes, en particulier celles qui emploient une formulation trop orientée ou un piège trop faible.
- Confirmer que les niveaux de difficulté restent cohérents avec le niveau réel de réflexion demandé.

### Explications

- Repasser les questions dont l'explication reste trop proche de la réponse brute.
- Renforcer les explications qui n'expliquent pas encore le mécanisme, la conséquence ou l'arbitrage utile.
- Contrôler que les questions de type estimation, comparaison, conséquences indirectes et cas limites donnent bien un apprentissage lisible.

### Lien avec CleanMyMap

- Valider les questions dont le lien avec CleanMyMap paraît trop faible ou trop générique, notamment:
  - `i1`, `i2`, `x1`, `x2`, `cb3`
  - `im6`, `im15`, `im16`
  - `at2`, `at4`, `at11`, `at13`
  - `tr2`, `rc1`, `hb2`, `ec2`
- Vérifier que les formulations restent ancrées dans les rubriques, les modes et les usages réels du quiz.

### Sources

- Contrôler les sources marquées `needsReview`.
- Vérifier les sources internes ou trop vagues, surtout quand la question s'appuie sur une donnée chiffrée, une règle de tri, une sécurité terrain ou un ordre de grandeur.
- Reprendre les libellés de source qui sont encore trop génériques, en particulier sur certaines questions de tri, de méthodologie et de terrain.
- Pour les consignes locales, confirmer que `isLocalRule=true` et `localScope=variable` restent corrects.

### Interface

- Vérifier le parcours complet dans l'interface:
  - sélection du mode;
  - sélection du niveau de piégeage quand elle s'applique;
  - session courte;
  - progression;
  - explication après réponse;
  - bilan final;
  - recommandation du prochain mode;
  - accès aux rubriques d'apprentissage.
- Confirmer que le mode mixte conserve une répartition homogène et que l'ordre reste lisible.

### Vérifications techniques

- Le build production passe avec `npm run build -w apps/web`.
- Les tests ciblés du quiz passent.
- Le `typecheck` global du workspace échoue encore sur des fichiers hors quiz:
  - `src/components/admin/free-plan-services-visual.test.ts`
  - `src/components/sections/rubriques/rejoindre-un-formulaire-section.utils.test.ts`
  - `src/lib/environmental-impact-estimator/project-signals.test.ts`
  - `src/lib/supabase/client.test.ts`
  - `src/proxy.protected-routes.test.ts`

## Commandes de contrôle

- `npm run audit:quiz-quality`
- `npm run audit:quiz-sources`
- `npm run test -w apps/web -- src/components/learn/environmental-quiz.test.ts src/components/learn/quiz-session-panel.test.ts src/lib/learning/quiz-selection-engine.test.ts src/lib/learning/quiz-personal-progress.test.ts src/lib/learning/quiz-quality-audit.test.ts src/lib/learning/quiz-source-audit.test.ts`
- `npm run test -w apps/web -- src/lib/services/quiz-srs-service.test.ts`
- `npm run build -w apps/web`
- `npm run typecheck -w apps/web`
