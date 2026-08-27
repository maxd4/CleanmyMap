# ADR-007 — Autorisation par capacités et périmètres

## Statut

Adopté comme direction architecturale cible.

## Contexte

CleanMyMap possède plusieurs rôles métier :

```txt
benevole
coordinateur
scientifique
entreprise
elu
admin
max
```

Le rôle interne `max` est l'unique rôle privilégié correspondant au libellé
produit **IMU**. `super-admin`, `super_admin`, `superadmin` et les alias
legacy nécessaires (`owner`, `godmode`, `creator`) sont normalisés vers
`max` à l'entrée ; aucune de ces appellations ne crée un niveau de permission
distinct.

Ces rôles représentent des responsabilités différentes, mais le code historique contient plusieurs formes d'AuthZ :

- comparaisons directes de rôles ;
- helpers `admin-like` ;
- ownership ;
- relation organisateur ;
- dérogations de modération ;
- accès à des surfaces ou exports selon le rôle.

Cette diversité crée un risque de dérive : un rôle utile dans un domaine peut recevoir accidentellement un droit global dans un autre domaine.

Le cas le plus visible est la tension entre :

- les helpers génériques qui considèrent `admin` et `max` comme profils administratifs ;
- le domaine Actions qui inclut actuellement `elu` dans ses rôles de modération globale.

Un élu doit pouvoir exercer un pilotage territorial utile sans devenir, par simple rôle, un administrateur global de la plateforme.

## Décision

CleanMyMap adopte un modèle d'autorisation fondé sur :

```txt
Role + Capability + Scope + Resource relation + Business state
```

Le rôle seul ne suffit pas pour autoriser une opération sensible.

Les rôles ne forment pas une hiérarchie linéaire.

La cible fonctionnelle est :

```txt
Bénévole      → self / owned
Coordinateur  → organized / organization
Scientifique  → sanitized analytics
Entreprise    → organization
Élu           → territory
Admin         → global moderation
IMU (`max`)   → platform administration
```

Les scopes `organization` et `territory` exigent une relation canonique persistée et vérifiable côté serveur.

En l'absence de relation canonique suffisante, la permission reste refusée plutôt que d'être remplacée par un accès global.

## Conséquences

### Positives

- réduction des droits excessifs ;
- rôles métier plus utiles sans devenir administratifs ;
- permissions plus lisibles et testables ;
- meilleure séparation navigation UX / autorisation serveur ;
- meilleure minimisation des données ;
- possibilité d'étendre les capacités territoriales ou organisationnelles sans dupliquer des exceptions de rôle.

### Coûts

- inventaire initial des permissions effectives ;
- création ou consolidation de helpers de domaine ;
- nécessité de représenter explicitement certaines relations d'organisation ou de territoire ;
- tests négatifs supplémentaires ;
- migration progressive des comparaisons directes de rôles.

## Règles d'implémentation

1. Préférer un helper de capacité à une comparaison de rôle dispersée.
2. Conserver les helpers par domaine lorsque cela améliore la cohésion ; ne pas créer prématurément un moteur universel de politiques.
3. Vérifier ownership, organisation ou territoire côté serveur.
4. Une capacité privilégiée n'est jamais déduite d'un booléen envoyé par le client.
5. Un scope sans relation canonique est fail-closed.
6. L'UI peut adapter la navigation mais n'est jamais l'autorité AuthZ.
7. RLS doit rester cohérente avec les frontières applicatives pertinentes.
8. Les dérogations sensibles continuent d'exiger les garde-fous applicables : motif, audit, before/after, cible et erreur bornée.
9. `service_role` reste une identité technique et ne devient jamais un rôle utilisateur.

## Migration

La migration doit être progressive :

```txt
inventaire des permissions réelles
→ classification en capacités
→ définition des scopes manquants
→ helpers de domaine
→ tests de refus
→ convergence des routes
```

Ne pas casser un contrat métier stable uniquement pour renommer un helper.

Une divergence actuelle doit être documentée et testée jusqu'à sa migration ; elle ne doit pas devenir une justification pour étendre la divergence à d'autres domaines.

## Contrat détaillé

Le vocabulaire des capacités, scopes et la matrice cible sont définis dans :

```txt
documentation/security/authorization-capabilities.md
```

Les règles AuthN/AuthZ, dérogations administratives, frontières API et RLS restent dans :

```txt
documentation/security/authz-authn-regles.md
```
