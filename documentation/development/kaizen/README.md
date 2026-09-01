# Kaizen — amélioration continue CleanMyMap

## Rôle

Ce dossier porte la doctrine d'amélioration continue du développement CleanMyMap.

Le Kaizen sert à améliorer progressivement un périmètre réel, déjà compris et suffisamment stable. Il ne crée pas un droit à élargir silencieusement le périmètre d'un chantier et ne remplace ni les règles du dépôt, ni les contrats métier, ni la documentation spécialisée du domaine concerné.

La hiérarchie reste :

1. demande explicite de l'utilisateur ;
2. sécurité, données et authentification ;
3. état réel du dépôt et contrats courants ;
4. correction fonctionnelle et tests critiques ;
5. backlog ou refactor nécessaires ;
6. amélioration Kaizen.

## Documents canoniques

- [`PRINCIPLES.md`](./PRINCIPLES.md) — philosophie, priorités et limites du Kaizen ;
- [`AUDIT_METHOD.md`](./AUDIT_METHOD.md) — méthode pour conduire un audit Kaizen ciblé ;
- [`EXAMPLES.md`](./EXAMPLES.md) — exemples de bonnes et mauvaises applications ;
- [`templates/TEMPLATE-AUDIT.md`](./templates/TEMPLATE-AUDIT.md) — modèle minimal d'audit.

## Audits

Les audits Kaizen vivent sous `audits/`.

Un audit est une preuve de travail sur un état donné du dépôt. Il n'est pas une source de vérité permanente sur le comportement courant. Avant de réutiliser une décision ou un constat d'un audit, il faut le confronter au code, aux tests et à la documentation canonique actuels.

Statuts recommandés :

- `working` — audit en cours ;
- `closed` — actions terminées ou explicitement abandonnées ;
- `historical` — document ancien conservé pour mémoire, non exécutable sans réaudit.

Un audit historique qui contient d'anciens prompts, métriques, estimations, dépendances ou recommandations UI ne doit jamais être exécuté tel quel.

## Quand appliquer le Kaizen

Le Kaizen est pertinent lorsqu'au moins un signal concret existe :

- cas limite ou erreur récurrente ;
- duplication ou complexité qui augmente le risque ;
- dette technique observée pendant une modification significative ;
- incohérence entre code, tests et documentation ;
- friction UX démontrée ;
- problème d'accessibilité, performance ou maintenabilité vérifiable ;
- périmètre récemment stabilisé qui mérite une passe d'amélioration ciblée ;
- demande explicite d'audit ou d'amélioration approfondie.

Il n'est pas nécessaire de créer un audit pour chaque fichier modifié ou chaque gros module.

## Deux niveaux d'application

### Micro-Kaizen pendant un chantier

Pendant une tâche, une amélioration directement nécessaire à la correction, à la robustesse ou à la cohérence du périmètre peut être intégrée si elle reste dans l'allowlist logique du lot.

Une amélioration utile mais hors périmètre doit être signalée ou consignée ; elle ne doit pas être implémentée opportunément.

### Audit Kaizen dédié

Après stabilisation d'un périmètre, un audit dédié peut sélectionner au maximum trois actions prioritaires avec preuves et critères de fin explicites.

La méthode détaillée est dans [`AUDIT_METHOD.md`](./AUDIT_METHOD.md).

## Relations avec les autres sources

- gouvernance universelle : `AGENTS.md` ;
- gouvernance documentaire : `documentation/AGENTS.md` ;
- politique documentaire : `documentation/development/DOCUMENTATION_POLICY.md` ;
- tests : `documentation/development/TESTING.md` ;
- design system : `documentation/design-system/` ;
- comportement fonctionnel d'une page : `documentation/pages_site/` ;
- architecture, sécurité, produit et exploitation : leurs dossiers spécialisés respectifs.

Le Kaizen ne doit pas recopier ces contrats. Il les utilise comme contraintes.

## Critère de réussite

Une application Kaizen est réussie quand elle :

- part d'un problème ou d'une opportunité prouvée ;
- améliore réellement la robustesse, la compréhension, la qualité ou la maintenabilité ;
- reste proportionnée au risque et au périmètre ;
- préserve les contrats existants ou documente explicitement leur changement ;
- possède une validation adaptée ;
- ne crée pas une nouvelle source documentaire concurrente.
