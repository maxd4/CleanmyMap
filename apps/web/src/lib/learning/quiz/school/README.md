# Capacité École

Ce sous-domaine regroupe les contrats et règles propres au Mode École. Il
reste consommable par le moteur générique du Quiz sans déplacer ce moteur dans
la capacité scolaire.

## Invariants

- niveaux pris en charge : `6e`, `5e`, `4e`, `3e` ;
- quiz public, sans AuthN obligatoire et sans donnée personnelle (PII) ;
- les questions `needsReview` sont exclues des parcours publics ;
- les tracks restent des métadonnées internes de composition ;
- une question conserve un texte unique et peut être éligible à plusieurs
  niveaux, avec un profil de difficulté et de compétences par niveau ;
- les faits, les sources et les règles pédagogiques restent explicitement
  séparés ;
- les formats scolaires sont `quiz-30` et `atelier-60` ;
- `atelier-60` compose automatiquement une séquence pédagogique d’environ
  30 minutes entre le pré-quiz et le post-quiz, à partir d’activités typées ;
- les activités déclarent leurs niveaux autorisés, leur difficulté, leurs
  compétences, leur source et leur statut de validation ; les activités
  `needsReview` ne sont jamais composées pour le public ;
- la progression 6e/5e/4e/3e est une adaptation pédagogique interne, sans
  déclaration d’alignement officiel aux programmes scolaires ;
- la présentation publique de référence est la documentation canonique de
  [`/learn/ecole`](../../../../../../../documentation/pages_site/routes/05-apprendre/learn-ecole/learn-ecole-README.md).

Les moteurs génériques, le contrat générique de question, la normalisation, la
taxonomy, les sources/audits et la progression restent dans le dossier parent
`quiz/`.
