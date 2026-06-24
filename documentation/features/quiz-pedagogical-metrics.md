# Métriques pédagogiques du quiz

Ce document décrit les métriques anonymes utilisées pour interpréter la qualité réelle des questions du quiz CleanMyMap.

Objectif:
- savoir quelles questions fonctionnent réellement;
- repérer les questions trop faciles;
- repérer les questions trop échouées;
- voir quels modes sont le plus joués;
- identifier les compétences les moins maîtrisées;
- suivre les types d&apos;erreurs fréquents.

Principe RGPD:
- aucune donnée personnelle inutile n&apos;est collectée;
- les agrégats portent sur les questions, les modes, les compétences et les erreurs;
- aucun identifiant utilisateur n&apos;est nécessaire pour le tableau de bord;
- les réponses brutes ne sont pas conservées par cette couche.

Schéma:
- `bucket_type`: `question`, `mode`, `skill`, `error_type`
- `bucket_key`: identifiant technique de la question, du mode, de la compétence ou de l&apos;erreur
- `attempts`: nombre de tentatives agrégées
- `correct_count`: réponses correctes
- `wrong_count`: réponses fausses
- `session_count`: nombre de sessions, utile pour les modes
- `last_seen_at`: dernière occurrence observée

Seuils de lecture:
- question trop facile: au moins 8 tentatives et 85% de réussite ou plus;
- question trop échouée: au moins 6 tentatives et 35% de réussite ou moins;
- compétence fragile: au moins 5 tentatives et 60% de réussite ou moins.

Interface:
- le tableau de bord est affiché dans la page admin de la banque quiz;
- les cartes sont triées pour faire remonter les signaux actionnables;
- le rendu reste sobre, en lecture, et sans surcharge visuelle.

Commande utile:
```bash
npm run test -w apps/web -- src/lib/learning/quiz-pedagogical-metrics.test.ts
```

