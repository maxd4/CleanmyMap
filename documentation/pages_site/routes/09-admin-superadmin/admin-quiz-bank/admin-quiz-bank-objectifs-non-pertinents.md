# Banque de quiz — Objectifs non pertinents

But : éviter de reproposer des évolutions incompatibles avec le rôle de la page.

## Liste des objectifs écartés

### Rendre le dashboard admin public

Écarté.

Motif :

```txt
surface interne d'audit et de correction
```

### Collecter les réponses brutes nominatives par défaut

Écarté.

Motifs :

- minimisation des données ;
- RGPD ;
- absence de besoin démontré.

### Autoriser tous les comptes connectés

Écarté. Le runtime vérifie le compte connecté et `getCurrentUserEffectiveAccess().canAccessAdminPage`. Cette capacité concerne `admin` et `max` selon le contrat CURRENT ; elle n'est pas ouverte aux autres comptes authentifiés. Le rôle `max` n'est pas exclu par une formulation historique « admin seulement ».

### Ajouter une base parallèle uniquement pour les métriques

Écarté par défaut.

Mesurer d'abord les limites du système actuel.

## Règle de mémoire

Une idée écartée ne revient que si un besoin nouveau, mesuré et documenté apparaît.

## Liens utiles

- `admin-quiz-bank-README.md`
- `admin-quiz-bank-presentation-detaillee.md`
- `admin-quiz-bank-liste-propositions-a-traiter.md`
