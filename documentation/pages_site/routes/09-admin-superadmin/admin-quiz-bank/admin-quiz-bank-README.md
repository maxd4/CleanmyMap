# Banque de quiz

## Fiche canonique

- **Route** : `/admin/quiz-bank`
- **Famille** : Admin & Super-admin
- **Accès runtime** : `admin-like` (`admin` ou `max` via `canAccessAdminPage`)
- **Source principale** : `apps/web/src/app/(app)/admin/quiz-bank/page.tsx`
- **Type** : vue interne d'audit et de relecture de la banque de questions

## Contrat d'accès

La page exige :

```txt
userId présent
`getCurrentUserEffectiveAccess().canAccessAdminPage = true`
```

Sinon :

```txt
notFound()
```

Le runtime actuel autorise donc les profils `admin` et `max`. Aucun autre rôle,
notamment `elu`, ne reçoit cette capacité par analogie.

## Sources principales

```txt
apps/web/src/app/(app)/admin/quiz-bank/page.tsx
apps/web/src/lib/learning/quiz-question-bank.ts
apps/web/src/lib/learning/quiz-bank-admin.ts
apps/web/src/lib/learning/quiz-pedagogical-metrics.ts
apps/web/src/components/admin/quiz-pedagogical-metrics-panel.tsx
apps/web/src/components/admin/quiz-bank-admin-view.tsx
```

## Objectif utilisateur

Permettre à un administrateur de :

- filtrer la banque ;
- relire les questions ;
- prioriser les éléments à corriger ;
- contrôler les sources ;
- lire les métriques pédagogiques ;
- détecter questions trop faciles ou trop échouées ;
- repérer les compétences fragiles et erreurs fréquentes.

## Données pédagogiques

La page indique que cette couche utilise des agrégats anonymes :

```txt
mode
question
compétence
type d'erreur
```

Et n'y conserve pas :

```txt
identifiant utilisateur
réponse brute
```

Toute évolution de collecte doit déclencher une revue RGPD et sécurité.

## Fichiers associés

- [Présentation détaillée](./admin-quiz-bank-presentation-detaillee.md)
- [Propositions à traiter](./admin-quiz-bank-liste-propositions-a-traiter.md)
- [Objectifs non pertinents](./admin-quiz-bank-objectifs-non-pertinents.md)
