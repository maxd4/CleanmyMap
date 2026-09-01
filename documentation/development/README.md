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
- [Repo quality rules](./repo-quality-rules.md) — règles qualité spécialisées
  lorsqu'elles sont directement concernées.
- [Doctrine Kaizen](./kaizen/README.md) — amélioration continue, méthode d'audit
  et template canonique de développement.

## Routage rapide

- Architecture et frontières : `../architecture/` ;
- sécurité et autorisations : `../security/` ;
- design system et pages : `../design-system/` et `../pages_site/` ;
- exploitation et quotas : `../operations/`.

Pour une tâche, consulter d'abord les fichiers de gouvernance à la racine,
puis uniquement les documents spécialisés réellement concernés. Ne pas
recopier une règle générale dans ce dossier si une source canonique existe
déjà.
