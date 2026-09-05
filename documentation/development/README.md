# Development — Index documentaire

Ce dossier contient la documentation spécialisée du développement CleanMyMap.
Les règles transversales de travail, de sécurité, de Git, de périmètre et de
validation restent canoniques dans les fichiers de gouvernance à la racine du
dépôt. Ce README est un index ; il ne crée pas une hiérarchie de gouvernance
concurrente.

## Documents canoniques de ce dossier

- [AI Developer Guide](./AI_DEVELOPER_GUIDE.md) — vocabulaire métier et repères
  propres au développement CleanMyMap ;
- [API standard](./api-standard.md) — contrats de réponse par domaine, erreurs
  et invariants HTTP/AuthN/AuthZ ;
- [Documentation Policy](./DOCUMENTATION_POLICY.md) — critère de documentation,
  choix de la source spécialisée et traitement de l'historique ;
- [Testing](./TESTING.md) — stratégie et commandes de test ;
- [Client/server bundle splitting](./client-server-bundle-splitting.md) — règles
  de découpage des frontières serveur/client et du bundle ;
- [Repo quality rules](./repo-quality-rules.md) — règles qualité spécialisées ;
- [TypeScript Precision Policy](./typescript-precision-policy.md) — contrat
  durable pour les frontières non fiables, types, casts et accès dynamiques ;
- [Lint & Static Analysis Refactor Playbook](./lint-refactor-playbook.md) —
  méthode de correction des diagnostics statiques sans masquer la cause racine ;
- [Conventions de modularisation](./conventions-modularisation.md) — décision
  d'extraction, cohésion, contrats et validation des refactors structurels ;
- [Doctrine Kaizen](./kaizen/README.md) — amélioration continue, méthode d'audit
  et template canonique de développement.

## Routage rapide

- architecture, frontières et radar des monolithes : `../architecture/` ;
- sécurité et autorisations : `../security/` ;
- design system et pages : `../design-system/` et `../pages_site/` ;
- exploitation, services et quotas : `../operations/`.

Pour une tâche, consulter uniquement les documents spécialisés réellement
concernés. Ne pas recopier une règle générale dans ce dossier si une source
canonique existe déjà.
