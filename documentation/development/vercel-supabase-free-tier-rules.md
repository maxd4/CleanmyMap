# Règles free tier Vercel + Supabase

Objectif: garder CleanMyMap compatible avec les plans gratuits ou très limités de Vercel et Supabase sans dégrader le comportement visible.

Ce document sert de doctrine pratique. Si une feature ne respecte pas ces règles, elle doit être justifiée avant implémentation.

## Principe directeur

Le repo doit porter tout ce qui peut rester statique.
Le navigateur doit garder tout ce qui peut rester local.
Supabase doit stocker seulement ce qui a une vraie valeur persistante, partagée ou sécurisée.
Vercel ne doit pas devenir un relais par défaut entre le client et Supabase.
Supabase doit rester la couche des données vraiment vivantes et utiles: comptes, actions, signalements, participations, rapports d'impact essentiels.
Tout le reste doit aller ailleurs quand c'est possible: repo Markdown, `localStorage`, fichiers statiques, agrégats, caches, ou outils externes.

## Blocage observé sur les previews Dependabot

Quand une PR Dependabot déclenche une preview Vercel, l'échec peut venir du provisioning Supabase plutôt que du build Next.js.

Cas observé sur ce dépôt:

- statut Vercel: `Resource provisioning failed`;
- cause Supabase: `Database branch limit reached`;
- effet: la preview reste rouge même si le build est prêt ou ignoré.

Conséquences pratiques:

- fermer des PR Dependabot obsolètes réduit le bruit, mais ne suffit pas si les branches Supabase restent présentes;
- ce type d'échec ne se corrige pas dans le code applicatif;
- la vraie correction passe par la suppression des branches Preview mortes dans Supabase ou par un quota plus large / une autre stratégie de branches.

| À faire maintenant | Pourquoi |
| --- | --- |
| Corriger les requêtes non bornées | C'est un vrai risque de quota et de lenteur |
| Mettre des `.limit()`, filtres, pagination, bounding box | Ce sont des garde-fous durables pour borner chaque lecture |
| Documenter les tables centrales | Pour éviter que Codex recrée des mauvaises pratiques, des RLS floues et des requêtes non bornées |
| Définir où stocker chaque type de donnée | Choisir la bonne couche de vérité avant d'écrire: Supabase, `localStorage`, repo Markdown, cache, fichier |
| Encadrer les fonctions coûteuses | Cartographie, chat, quiz, génération de documents: bornes de volume, fréquence, cache et durée d'exécution à définir avant mise en prod |
| Garder une trace des choix techniques | Noter le choix, le coût, le risque et la raison du placement pour pouvoir arbitrer ensuite |

## Tables centrales à documenter en priorité

Ces tables reviennent souvent dans les hotspots de quota. Les documenter évite de les traiter comme des tables génériques.

- [Guide de référence database](../database/README.md)
- `profiles`
- `actions`
- `progression_profiles`
- `progression_events`
- `points_ledger`
- `user_points`
- `community_events`
- `event_rsvps`
- `app_notifications`
- `quiz_type_progress`
- `quiz_srs`
- `checklist_progress`
- `runbook_checks`
- `user_badge_totals`

Règle pratique:

- une table centrale peut rester visible dans les audits;
- elle ne doit jamais être relue en entier juste pour un compteur, un badge ou un résumé;
- si une synthèse existe déjà, consommer l'agrégat ou le RPC correspondant plutôt que refaire le calcul dans une route Vercel ou un composant client.

## Ce qui doit rester statique dans le repo

- Pages publiques Markdown.
- Guides, notices, aides, contenus éditoriaux.
- Documentation produit, technique et sécurité.
- Ressources statiques déjà versionnées.
- Textes de référence qui n'ont pas besoin d'écriture utilisateur.

Règle:
- si un contenu est lisible publiquement et ne change pas à chaque interaction, il reste dans Git;
- ne pas déplacer un contenu Markdown public vers Supabase pour "économiser Vercel";
- les pages statiques du repo consomment du trafic Vercel quand elles sont visitées, mais elles évitent le calcul serveur et restent le bon choix par défaut.

## Ce qui doit aller dans `localStorage` ou `IndexedDB`

Garder localement tout état non critique ou non partagé:

- quiz anonymes ou progressions locales;
- préférences d'affichage;
- brouillons;
- calques carte;
- filtres de confort;
- états UI qui n'ont pas de valeur serveur durable.

Règle:
- si perdre l'état ne casse pas le produit, il ne doit pas être synchronisé par défaut;
- si l'information n'a pas besoin d'être partagée entre appareils, commencer en local;
- `IndexedDB` est préférable pour les états plus volumineux ou structurés, `localStorage` pour les petits états simples.

## Ce qui peut aller dans Supabase

Supabase est adapté quand la donnée a une valeur durable et justifie un stockage partagé:

- comptes et profils persistants;
- données métier réelles;
- soumissions de formulaires qui doivent survivre au navigateur;
- contenu utilisateur devant être relié à une identité;
- agrégats ou compteurs qui servent plusieurs vues;
- fichiers ou documents si le stockage est nécessaire au produit;
- suivi connecté utile, notamment pour la progression authentifiée.
- les compteurs simples doivent préférer une RPC, une vue ou une table d'agrégats côté Supabase plutôt qu'un calcul sur des lignes chargées dans une route Vercel.

Règle:
- si la donnée doit être retrouvée ailleurs que sur cet appareil, Supabase est possible;
- si elle doit être protégée, la RLS doit être la première ligne de défense;
- si une lecture publique est suffisante, préférer un accès direct client via la clé anon et une RLS correcte plutôt qu'une route Vercel de relais.

## Ce qui ne doit pas passer par Vercel par défaut

Éviter Vercel quand la route ne fait que relayer une autre source ou répéter un travail inutile:

- proxy Supabase sans logique métier;
- auth inutile sur pages publiques;
- polling ou refresh répété sans cache;
- lecture de données publiques qui peut se faire directement côté client;
- calculs légers qui pourraient être des RPC Supabase;
- génération de contenu qu'un asset statique ou un stockage direct peut couvrir;
- routes qui ne font que reconditionner un JSON déjà disponible ailleurs.

Règle:
- si une route Vercel ne fait que transférer la requête vers Supabase, elle doit être supprimée ou remplacée seulement si l'accès direct est sécurisé par la RLS;
- si Vercel reste nécessaire, la route doit apporter une vraie valeur: contrôle d'accès, agrégation, transformation, secret serveur, limite anti-abus, ou orchestration.
- toute lecture Supabase ou Vercel doit être bornée explicitement: `limit`, pagination, filtre de période, bbox, scope, ou agrégat; une requête sans borne claire est un risque direct de quota, de lenteur et de coût.

## Règles par surface

### API routes

- créer une API route seulement si elle remplit une fonction que le client ne peut pas faire proprement;
- éviter les routes "pass-through" vers Supabase;
- borner les listes, le volume de réponse et la fréquence;
- refuser les routes qui servent uniquement à masquer une requête Supabase triviale;
- privilégier le client direct avec RLS quand la lecture est publique ou déjà autorisée.
- si le handler de route vérifie déjà l'auth, ne rajouter le middleware que si cela évite un vrai risque ou un vrai coût supplémentaire;
- ne pas faire passer une API protégée par le middleware uniquement pour "sécuriser plus": si la sécurité est déjà au bon niveau dans le handler, cela ajoute surtout des Edge Requests.

### Middleware

- le middleware Clerk ou Next.js doit viser uniquement les routes réellement protégées;
- les pages publiques, assets, documents statiques, routes techniques inutiles et pages d'apprentissage ne doivent pas déclencher d'auth inutile;
- un matcher trop large augmente les requêtes et le coût sans gain fonctionnel.

### Cartographie

- une carte ne doit pas charger une table entière;
- la carte doit charger seulement la zone visible, avec filtres et limite;
- si la lecture est publique et filtrée par RLS, préférer le client direct à une API route intermédiaire;
- garder la logique de carte la plus légère possible côté serveur;
- éviter tout recalcul ou revalidation inutile sur les interactions carte.

### Quiz

- garder en local les quiz anonymes, les brouillons et les résultats non critiques;
- n'ajouter une synchronisation Supabase que si la progression connectée apporte une vraie valeur produit;
- ne pas écrire à chaque clic si une écriture finale ou un stockage local suffit.
- si le suivi durable est activé, privilégier un résumé compact: score, thème, date, erreurs principales;
- éviter de synchroniser chaque micro-interaction ou chaque réponse intermédiaire.

### Formulaires

- un formulaire public doit écrire une seule fois au moment de la soumission;
- pas d'auto-save continu par défaut;
- pas de brouillon synchronisé à chaque frappe;
- si le formulaire peut rester local jusqu'à validation finale, le garder local;
- si le formulaire doit aller en base, limiter les colonnes et appliquer des garde-fous.

### Documents générés

- PDF, exports et documents générés doivent être produits à la demande seulement;
- ne pas générer côté serveur si un téléchargement statique ou un asset pré-rendu suffit;
- pour un rapport PDF, privilégier la génération côté navigateur puis le téléchargement local;
- Supabase peut conserver seulement les métadonnées utiles: action concernée, date, statut, auteur;
- ne stocker le PDF complet en base que de façon optionnelle, si l'usage produit le justifie;
- ne pas archiver le gros document complet en base si un résumé minimal suffit;
- si un document doit être servi publiquement, préférer un fichier statique ou un stockage dédié plutôt qu'une route Vercel persistante.

### Images

- privilégier les images déjà préparées, compressées et versionnées;
- éviter d'utiliser `next/image` comme machine de transformation pour des sources distantes ou déjà optimisées si cela n'apporte pas de valeur nette;
- ne pas compter sur une optimisation serveur à la volée comme mécanisme standard;
- pour les médias publics simples, préférer des fichiers statiques adaptés au besoin.

### Chat

- ne pas construire un chat dans Vercel par simple réflexe;
- pour une première version, un outil externe ou un lien vers une plateforme de discussion peut suffire;
- si un chat doit exister, borner les lectures, les écritures, la modération et la rétention;
- le temps réel Supabase pour le chat reste désactivé par défaut; si une exception devient indispensable, elle doit passer par un flag public explicite et un audit avant activation;
- éviter de faire transiter le chat par une route Vercel qui ne ferait que relayer Supabase.

## Règles de décision Supabase vs Vercel vs navigateur

| Cas | Choix par défaut |
| --- | --- |
| Contenu public lisible sans état | Git, rendu statique |
| Préférence visuelle, brouillon, calque carte, quiz anonyme | Navigateur |
| Donnée métier persistante ou partagée | Supabase |
| Lecture publique autorisée par RLS | Client direct vers Supabase |
| Logique qui exige un secret serveur, une agrégation ou un contrôle d'accès supplémentaire | Vercel |
| Route qui ne fait que relayer Supabase | À supprimer ou à remplacer |

## Checklist obligatoire avant toute nouvelle fonctionnalité

- [ ] La donnée doit-elle vraiment sortir du repo ou du navigateur ?
- [ ] Si elle sort, pourquoi `localStorage` ou `IndexedDB` ne suffisent-ils pas ?
- [ ] Si elle doit aller en base, quelle table, quelle RLS, quelle durée de vie ?
- [ ] Combien d'écritures la feature produit-elle ?
- [ ] Combien de lectures la feature produit-elle ?
- [ ] Chaque lecture est-elle bornée par `limit`, pagination, filtre temporel, scope, bbox ou agrégat ?
- [ ] La lecture peut-elle être faite directement côté client avec la clé anon et une RLS correcte ?
- [ ] La feature ajoute-t-elle une route Vercel inutile ?
- [ ] Le middleware touche-t-il seulement les routes protégées ?
- [ ] Les pages publiques restent-elles sans auth inutile ?
- [ ] La carte, le quiz, le formulaire ou le document généré restent-ils bornés ?
- [ ] L'image, le PDF ou l'export peut-il rester statique ou pré-généré ?
- [ ] La feature ajoute-t-elle un coût récurrent sur Vercel ou Supabase sans valeur produit claire ?
- [ ] La feature peut-elle échouer de façon sûre si le stockage local est vide ou si le cache n'est pas disponible ?

## Règle de clôture

Si une fonctionnalité ne peut pas dire clairement:

1. où vit la donnée,
2. combien elle lit,
3. combien elle écrit,
4. pourquoi elle passe par Vercel, Supabase ou le navigateur,

alors elle n'est pas assez cadrée pour être livrée.

## Règle de validation des migrations

Chaque migration Supabase doit suivre la séquence suivante:

1. migration SQL versionnée ou changement de schéma explicitement identifié;
2. usages client et serveur ajustés au nouveau contrat;
3. vérification ciblée sur les routes, composants ou helpers touchés;
4. contrôle que la lecture reste bornée et que la RLS attendue continue de tenir.

Si l'une de ces étapes manque, la migration doit rester considérée comme incomplète.
