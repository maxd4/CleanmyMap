# Gouvernance des coûts plateforme — CleanMyMap

## Objet

Ce document est la source `CURRENT` pour les décisions de coût et de placement
entre Vercel, Supabase, le navigateur et les assets préparés.

Il ne contient ni backlog daté, ni classement ponctuel de routes, ni compteur de
quota. Les diagnostics historiques vivent dans
[`audits/`](./audits/). Les rapports entièrement générés vivent sous
`artifacts/`.

Pour les sources de vérité des données, lire aussi
[`../architecture/data-governance.md`](../architecture/data-governance.md).
Pour l'autorisation, utiliser
[`../security/authorization-capabilities.md`](../security/authorization-capabilities.md).
Le coût ne crée jamais à lui seul une permission.

## Principe directeur

Choisir la couche qui porte réellement la responsabilité :

| Besoin | Couche par défaut | Règle |
|---|---|---|
| contenu public durable et versionné | Git / rendu statique | ne pas déplacer en base sans besoin de mutation |
| état personnel éphémère ou non critique | navigateur | `localStorage` / IndexedDB si aucune synchronisation serveur n'est requise |
| donnée métier persistante, partagée ou sécurisée | Supabase | RLS, lectures bornées, index ou RPC adaptés |
| secret serveur, orchestration, mutation privilégiée, agrégation serveur nécessaire | Vercel / serveur applicatif | garder le handler utile, borné et explicitement justifié |
| média ou livrable réutilisable | asset préparé / Storage | ne pas reconstruire le fichier à chaque lecture |
| donnée dérivée recalculable | cache / ISR / revalidation | le cache n'est jamais la source de vérité |

Une route Vercel n'est pas un proxy Supabase par défaut. Un accès direct
navigateur → Supabase n'est acceptable que si le contrat RLS et la surface de
données le permettent réellement.

## Dimensions de coût à surveiller

Les libellés Vercel utilisés par le dépôt incluent notamment :

- `Invocations` : exécutions de fonctions et rendus serveur ;
- `Edge Requests` : requêtes traitées par l'edge ;
- `Fast Origin Transfer` : données transférées entre edge et origine ;
- `Fluid Memory` : mémoire provisionnée pendant l'exécution ;
- `Fast Data Transfer` : octets servis au visiteur.

Les noms et modalités commerciales peuvent évoluer chez le fournisseur. Les
scripts et dashboards courants restent l'autorité pour les mesures actuelles ;
ce document ne fige aucun plafond numérique.

## Arbre de décision

Avant d'ajouter une surface ou un flux :

1. La donnée doit-elle être persistée ?
   - non → Git ou navigateur selon sa nature ;
   - oui → continuer.
2. Doit-elle être partagée, sécurisée ou retrouvée sur plusieurs appareils ?
   - oui → Supabase est le candidat naturel ;
   - non → état local possible.
3. L'opération exige-t-elle un secret, une AuthZ serveur, une orchestration
   privilégiée ou une transformation non exposable au client ?
   - oui → serveur/Vercel ;
   - non → éviter un relais serveur inutile.
4. La lecture doit-elle être exacte à chaque requête ?
   - non → cache, ISR, revalidation ou snapshot ;
   - oui → borner strictement volume et fréquence.
5. La fonctionnalité ajoute-t-elle une route, un polling, un cron, un export ou
   un bundle lourd ?
   - oui → documenter le coût attendu et le garde-fou correspondant.

## Vercel : règles durables

### Rendu dynamique et cache

Ne pas utiliser par défaut :

```txt
force-dynamic
revalidate = 0
cache: "no-store"
```

Les conserver uniquement lorsqu'un besoin fonctionnel, de fraîcheur ou de
sécurité l'exige.

Préférer :

- statique quand le contenu est stable ;
- ISR ou `revalidate` quand une fenêtre de fraîcheur est acceptable ;
- cache court pour les agrégats réutilisés ;
- état navigateur pour les données personnelles non critiques.

Une désactivation volontaire du cache doit être explicable depuis le code et
protégée par les tests ou contrôles pertinents.

### Routes API

Une route applicative doit apporter au moins une responsabilité réelle :

- mutation métier ;
- AuthZ serveur ;
- usage d'un secret ;
- validation ou anti-abus ;
- agrégation/transformation nécessaire ;
- orchestration de plusieurs services ;
- production d'un livrable serveur justifié.

Éviter les handlers qui ne font que relayer une lecture Supabase RLS-safe.

Toute liste ou export doit avoir une borne explicite : pagination, `limit`,
période, scope, bbox, agrégat ou autre contrat équivalent.

### Edge et middleware

Le proxy ou middleware doit rester limité aux surfaces qui nécessitent
réellement cette frontière.

Ne pas ajouter une route au matcher uniquement pour dupliquer une AuthZ déjà
correctement portée par le handler. L'autorité finale reste la couche serveur
responsable du contrat.

Les liens publics vers des surfaces protégées ne doivent pas provoquer
involontairement des préchargements coûteux lorsque le produit n'en a pas
besoin.

### Polling, temps réel et panneaux live

Un polling doit avoir :

- une fréquence justifiée ;
- une condition de visibilité ou d'activité lorsque pertinente ;
- un arrêt ou ralentissement quand l'onglet est caché ou la surface fermée ;
- une alternative évaluée : cache, revalidation au focus, Supabase Realtime,
  push ou chargement à la demande.

Ne pas utiliser un flux temps réel pour une donnée qui tolère une fenêtre de
fraîcheur.

### Server Components et client

Garder le Server Component par défaut lorsqu'il convient au contrat de la page,
puis isoler les interactions dans le plus petit sous-arbre client.

Éviter :

- une page entière en Client Component pour un état local mineur ;
- plusieurs fetchs clients indépendants vers la même donnée ;
- l'hydratation d'objets inutilement volumineux ;
- les bibliothèques lourdes dans le shell global.

Pour les frontières et le bundle, voir
[`../development/client-server-bundle-splitting.md`](../development/client-server-bundle-splitting.md).

### Cartographie

Leaflet et les autres dépendances cartographiques lourdes doivent rester
isolées côté client et chargées uniquement lorsque la surface est utile.

Les données cartographiques doivent être bornées par zone visible, filtres,
limite ou agrégat. Ne jamais charger une table entière pour produire une vue de
carte.

### Images et médias

Préférer :

- compression avant upload ;
- dimensions préparées ;
- assets statiques pour les médias versionnés ;
- Storage ou CDN pour les médias persistants.

Ne pas utiliser une transformation serveur à la volée lorsqu'un fichier déjà
préparé satisfait le besoin.

### PDF et exports

Pour un livrable lourd :

1. limiter la donnée source ;
2. vérifier l'AuthZ ;
3. réutiliser un artefact déjà préparé lorsque possible ;
4. générer côté navigateur si le contrat le permet ;
5. conserver dans Storage lorsque le fichier doit être réutilisé ;
6. réserver la génération serveur aux cas qui la nécessitent réellement.

### Crons, monitors et robots

Une consommation sans navigation humaine peut venir de :

- cron ;
- monitoring ;
- robot ou crawler ;
- previewer de lien ;
- polling laissé actif ;
- revalidation automatique.

Avant de modifier le runtime, identifier la source réelle dans les logs et les
audits.

### Analytics

Les analytics soumises au consentement ne doivent pas être initialisées avant
la décision utilisateur prévue par le produit.

Limiter le volume des pageviews et événements lorsque leur granularité
n'apporte pas de valeur analytique correspondante.

## Supabase : coût et placement

Les règles détaillées d'optimisation des requêtes vivent dans
[`../database/supabase-table-optimization-playbook.md`](../database/supabase-table-optimization-playbook.md).

Invariants transversaux :

- aucune lecture large par commodité ;
- aucune RLS affaiblie pour réduire un coût ;
- projection minimale des colonnes ;
- borne explicite ;
- filtre en base plutôt qu'après chargement ;
- index adapté aux chemins runtime ;
- RPC ou agrégat partagé lorsque plusieurs surfaces refont le même calcul ;
- snapshot/cache pour les synthèses qui n'exigent pas une fraîcheur immédiate.

Une table centrale peut rester coûteuse dans un audit si ses accès sont
légitimes, bornés et correctement indexés. Le but n'est pas d'obtenir
artificiellement zéro signal.

## Autorisation et coût

Ne pas créer une seconde taxonomie d'accès fondée sur les quotas.

Les classes d'autorisation canoniques sont définies dans
[`../security/authorization-capabilities.md`](../security/authorization-capabilities.md),
notamment :

```txt
public_read
authenticated_write
private_read
privileged
public_write_exception
```

Une surface coûteuse peut être `privileged` si son rôle produit et son risque
le justifient, mais elle ne devient pas privilégiée uniquement pour économiser
un quota.

## Checklist de modification

Avant publication d'une fonctionnalité qui touche la plateforme :

- [ ] la couche de stockage est justifiée ;
- [ ] aucune route Vercel de relais inutile n'est ajoutée ;
- [ ] chaque lecture potentiellement croissante est bornée ;
- [ ] le cache ou la stratégie de fraîcheur est explicite ;
- [ ] les pollings et crons ont un propriétaire et une fréquence justifiée ;
- [ ] les exports et médias lourds ont une stratégie d'artefact ;
- [ ] l'AuthZ reste portée par le contrat de sécurité ;
- [ ] la taille du bundle est revue si une dépendance lourde est ajoutée ;
- [ ] le quota ou coût susceptible d'augmenter est identifiable ;
- [ ] les tests et audits pertinents sont exécutés.

## Audits et commandes

Commandes principales du dépôt :

```bash
npm run audit:vercel-quota
npm run audit:vercel:ci
npm run report:vercel-surface
```

`npm run report:vercel-surface` produit le rapport courant sous
`artifacts/vercel/`. Un rapport généré n'est pas une source documentaire
`CURRENT`.

Les diagnostics historiques conservés sont indexés dans
[`audits/README.md`](./audits/README.md).

Une évolution volontaire d'une baseline ou d'un coût attendu doit être
justifiée par le changement réel puis validée avec le mécanisme prévu par le
script concerné.

## Références

- [`../architecture/data-governance.md`](../architecture/data-governance.md)
- [`../database/README.md`](../database/README.md)
- [`../database/supabase-table-optimization-playbook.md`](../database/supabase-table-optimization-playbook.md)
- [`../security/authorization-capabilities.md`](../security/authorization-capabilities.md)
- [`../development/client-server-bundle-splitting.md`](../development/client-server-bundle-splitting.md)
- [`vercel-build-troubleshooting.md`](./vercel-build-troubleshooting.md)
- [`audits/README.md`](./audits/README.md)
