# Coupe d'accès en 3 niveaux pour les quotas

Dernière mise à jour: 2026-06-28

Objectif: réserver les surfaces les plus coûteuses aux bons profils dès le départ pour limiter les risques Vercel, Supabase et Clerk.

La règle de base pour CleanMyMap est de séparer les fonctionnalités en 3 niveaux:

1. `Public léger`
2. `Connecté standard`
3. `Privilégié` (`admin`, `max`, et certains parcours opérateurs comme `coordinateur` quand la fonctionnalité l'exige)

Ce découpage ne sert pas seulement à la sécurité. Il sert aussi à réduire:

- les lectures Supabase larges;
- les exports répétés;
- les pages SSR ou routes API trop fréquentes;
- les traitements de gouvernance ou de modération qui n'ont pas vocation à être ouverts à tous.

## Règle de décision

Une fonctionnalité doit remonter d'un niveau dès qu'elle:

- lit plusieurs tables ou une table critique en volume;
- exporte des données;
- agrège des synthèses transverses;
- déclenche un recalcul ou un backfill;
- expose une vue de supervision ou d'audit;
- n'apporte pas de valeur métier immédiate à un visiteur non authentifié.

### Niveau 1 - Public léger

À garder accessible sans compte seulement si la surface reste:

- lisible;
- cacheable;
- bornée;
- sans export;
- sans agrégation lourde;
- sans scan large.

Exemples typiques:

- page d'accueil;
- pages éditoriales ou méthodologiques;
- contenus d'apprentissage;
- aperçus publics courts et stables.

### Niveau 2 - Connecté standard

À réserver aux comptes connectés pour tout ce qui concerne:

- le profil de l'utilisateur;
- son tableau de bord;
- ses participations;
- ses préférences;
- ses notifications personnelles;
- ses vues de suivi ou de mission.

Le niveau 2 peut lire des données Supabase, mais la requête doit rester:

- bornée;
- indexable;
- limitée au périmètre de l'utilisateur;
- sans lecture globale inutile.

### Niveau 3 - Privilégié

À réserver aux parcours de supervision, d'administration ou d'opération lourde.

Exemples typiques:

- exports CSV / JSON lourds;
- rapports de gouvernance;
- dashboards transverses;
- backfills;
- modération;
- files d'attente internes;
- vues d'audit;
- traitements de maintenance.

Règle pratique:

- si la page ou la route peut faire monter les quotas sans apporter un bénéfice immédiat au grand public, elle doit commencer au niveau 3;
- si elle touche une donnée personnelle mais non critique, elle reste au niveau 2;
- si elle sert surtout à superviser ou arbitrer, elle va au niveau 3.

## Messages d'accès communs

Pour éviter les variations de copie selon les pages, CleanMyMap utilise deux messages communs:

- les surfaces qui demandent une connexion affichent `Connexion requise` avec les actions `Se connecter` et `Créer un compte`;
- les surfaces administrateur affichent un message commun indiquant que la page est temporairement réservée aux admins pour préserver les quotas gratuits Supabase et Vercel, avec les actions `Se connecter` et `Retour au tableau de bord`.

Ces messages restent la référence par défaut. Les pages ne doivent les personnaliser que si un besoin métier le justifie vraiment.

## Matrice de départ recommandée

| Surface | Niveau recommandé | Remarque |
| --- | --- | --- |
| Accueil, pages éditoriales, contenus d'apprentissage | Public léger | Doivent rester cacheables et stables |
| `dashboard`, `profil`, `missions`, `sponsor-portal`, `prints/report` | Connecté standard | Accès personnel ou semi-personnel |
| `reports` | Connecté standard pour le pilotage, privilégié pour la génération et les exports | Séparer l'onglet de lecture de l'onglet de génération |
| `pilotage` | Privilégié | Opérationnel, avec rôle restreint |
| `admin`, `admin/*` | Privilégié | Back-office complet |
| `api/reports/actions.csv` | Privilégié | Export lourd |
| `api/reports/actions.json` | Privilégié | Export lourd |
| `api/reports/governance-monthly` | Privilégié | Rapport de supervision |
| `api/reports/elus-dossier` | Privilégié | Dossier institutionnel |
| `community_events`, `event_rsvps`, `action_participants`, `profiles` | Connecté standard ou privilégié selon la vue | Toujours borner la requête et éviter les scans larges |

## Application concrète

- si une surface est publique, elle doit rester simple et amortie par le cache;
- si une surface est personnelle, elle doit filtrer sur l'identité de session;
- si une surface est transverse, elle doit passer par un niveau privilégié et idéalement par un snapshot, un RPC ou un export préparé;
- si une surface n'est utile qu'à l'équipe de pilotage, elle ne doit pas être ouverte par défaut.

## Références associées

- [`documentation/database/supabase-quota-audit.md`](../database/supabase-quota-audit.md)
- [`documentation/development/supabase-refresh-strategy-audit.md`](./supabase-refresh-strategy-audit.md)
- [`documentation/development/vercel-quota-governance.md`](./vercel-quota-governance.md)
