# Guide développeur Supabase

Objectif: livrer des features sans faire grimper inutilement les quotas Supabase.

## Synthèse de décision

Pour CleanMyMap, la ligne de conduite est la suivante:

- garder les tables centrales et métiers: `profiles`, `actions`, le minimum de préférences, et les données utiles aux flows principaux;
- simplifier tout ce qui lit ou écrit souvent: participants, RSVPs, carte, badges, historiques, exports, uploads;
- différer les fonctionnalités lourdes ou coûteuses: vrai chat Supabase, quiz persistants complets, stockage riche de progression si la valeur produit n'est pas prouvée;
- supprimer de Supabase tout ce qui doit rester dans Git: contenus pédagogiques, notices, guides, pages "apprendre".

La règle de fond à conserver est simple: une table centrale peut rester `high` si l'usage est légitime, borné et justifié; ce qu'il faut corriger, ce sont les lectures non bornées, trop larges, répétées ou non justifiées.

Supabase doit rester la couche des données vraiment vivantes et utiles: comptes, actions, signalements, participations, rapports d'impact essentiels. Tout le reste doit aller ailleurs quand c'est possible: repo Markdown, `localStorage`, fichiers statiques, agrégats, caches, ou outils externes.

| À faire maintenant | Pourquoi |
| --- | --- |
| Supprimer les requêtes non bornées | C'est un vrai risque de quota et de lenteur |
| Mettre des `.limit()`, filtres, pagination, bounding box | Ce sont des garde-fous durables |
| Documenter les tables centrales | Pour éviter que Codex recrée des mauvaises pratiques |
| Définir où stocker chaque type de donnée | Supabase, `localStorage`, repo Markdown, cache, fichier |
| Encadrer les fonctions coûteuses | Cartographie, chat, quiz, génération de documents |
| Garder une trace des choix techniques | Utile pour ton rapport et pour la suite du développement |

## Doctrine de stockage CleanMyMap

Avant d'ajouter une nouvelle fonctionnalité, documenter explicitement:

- où la donnée est stockée,
- combien d'écritures elle produit,
- combien de lectures elle déclenche,
- comment elle est limitée,
- pourquoi Supabase est nécessaire, ou pourquoi il ne l'est pas.

Cette doctrine s'applique aussi aux fonctionnalités qui "pourraient" aller en base. Le fait qu'un stockage soit possible ne suffit pas à le justifier.

### Conserver dans le dépôt Git

- les contenus pédagogiques,
- les fichiers `.md`,
- les pages "apprendre",
- les notices,
- les guides,
- les ressources,
- les ressources statiques.

Ces contenus doivent rester versionnés dans le repo, modifiables par pull request et servis comme pages statiques quand c'est possible.

### Conserver localement par défaut

- quiz côté navigateur tant qu'aucun suivi connecté n'apporte une valeur durable,
- réponses erronées à remontrer,
- brouillons visuels ou états d'interface non critiques,
- préférences d'UI déjà traitées ailleurs dans le dépôt.

Pour les quiz, `localStorage` peut suffire pour remontrer les mauvaises réponses. Supabase ne doit servir qu'à une version connectée, par exemple un suivi de progression personnel réellement utile.

Quand un suivi durable est vraiment justifié, préférer un résumé compact plutôt qu'un journal d'interactions:

- score;
- thème;
- date;
- erreurs principales;
- éventuellement un indicateur de révision, pas chaque clic.

Les quiz n'écrivent pas automatiquement en base.
`localStorage` peut servir pour remontrer les mauvaises réponses côté navigateur.
Supabase ne sert qu'au suivi connecté si la valeur produit est réelle et durable.

### Écrire peu

- formulaires bénévoles: une soumission complète = une écriture,
- pas d'auto-save permanent,
- pas de brouillon synchronisé à chaque frappe,
- pas de stockage de chaque changement de champ,
- pas de journal exhaustif si un résumé suffit.

### Lire peu

- estimateurs et tableaux de bord: données agrégées d'abord,
- graphiques: nombres d'actions, signalements, poids estimé, rapports générés,
- compteurs: `head: true`, `count`, ou RPC dédié si besoin,
- cartes et listes: pagination ou limites systématiques,
- documents générés: lecture du résumé minimal, pas d'historique complet inutile.

### Cartographie

La cartographie est une zone à risque:

- une carte ne doit jamais charger toute la table `spots`, `actions`, `trash_spotter_spots` ou `community_events`,
- elle doit charger seulement la zone visible,
- elle doit appliquer une limite et des filtres,
- elle peut utiliser des clusters ou des couches simplifiées si cela réduit le volume sans casser l'usage.

### Générer à la demande

- PDF et exports: privilégier la génération côté navigateur puis le téléchargement local,
- Supabase: stocker au besoin seulement les métadonnées du document généré, par exemple l'action concernée, la date, le statut et l'auteur,
- PDF complet en base: optionnel uniquement si la valeur produit le justifie,
- stockage de fichiers: à surveiller comme un coût caché,
- micro-événements: éviter de les persister individuellement si une agrégation produit la même valeur.

### Tables centrales

Une table centrale peut rester `high`, voire `critical`, si les requêtes sont filtrées, bornées et justifiées.

Règle de lecture de l'audit:

- une table centrale peut rester `high` ou `critical` si l'usage est structurellement légitime,
- je ne chercherai pas à "faire disparaître tous les high",
- je viserai d'abord les requêtes non bornées, trop larges, trop fréquentes ou non justifiées,
- je privilégierai les optimisations qui réduisent le volume sans casser les usages.

Règles de tri pour les prochains audits CleanMyMap:

- acceptable si la table est centrale mais les requêtes restent filtrées, bornées et lisibles,
- acceptable si le volume d'écriture est élevé mais utile métier,
- à corriger dès qu'une requête critique est non bornée, trop large, ou charge une table entière pour un simple besoin d'affichage,
- à éviter si le refactor complexifie sans gain net de risque,
- à éviter pour les index ajoutés "au cas où".
- `high` acceptable si l'usage est expliqué et borné,
- `critical` ou `high` non borné, non filtré, ou filtré côté React après chargement complet, à corriger,
- pas de refactor compliqué sans baisse claire du risque.

Ce qu'il faut refuser:

- charge complète d'une table puis filtre côté React,
- compteur construit après lecture exhaustive,
- requête répétée au montage sans limite claire,
- index ajoutés "au cas où" sans bénéfice mesurable.

En pratique, pour l'audit Supabase, je traiterai comme prioritaires:

- `profiles` en premier, en cherchant les 4 requêtes non bornées et tout chargement large inutile,
- `event_rsvps` et `action_participants` ensuite, avec focus sur les listes, compteurs et historiques,
- `spots`, `trash_spotter_spots` et `community_events` pour garantir des chargements carte toujours bornés,
- la carte ne charge jamais une table entière: seulement la zone visible, avec limite, filtres et éventuellement clusters ou couches simplifiées,
- `actions` en contrôle final, pas en priorité si les autres postes restent plus risqués,
- les `SELECT *`,
- les requêtes sans `limit`,
- les requêtes sans filtre ou trop larges,
- les accès répétés au montage,
- les colonnes sur-sélectionnées,
- les tables très sollicitées mais encore mal bornées.
- les lectures non filtrées,
- les lectures sans `limit`,
- les sur-sélections de colonnes,
- les accès répétés inutiles,
- les usages critiques sur `profiles`, `participants`, `map`, `actions` et `notifications`.

Et je laisserai en place un `high` sur une table centrale comme `profiles` si:

- l'usage est justifié,
- les requêtes sont filtrées,
- les colonnes sont minimales,
- le coût reste borné.

### Grille de décision

| Situation | Décision |
|---|---|
| Table centrale utilisée dans beaucoup de fichiers, mais requêtes filtrées et limitées | Acceptable |
| Table `high` parce qu'elle reçoit beaucoup d'écritures utiles | Acceptable |
| Table `critical` avec requêtes non bornées sur carte, profils ou participants | À corriger |
| Requête qui charge toute une table pour afficher un compteur | À corriger |
| Refactor qui rend le code plus complexe sans baisse claire du risque | À éviter |
| Index ajoutés partout "au cas où" | À éviter |

### Questions obligatoires pour chaque nouvelle feature

1. Où les données sont-elles stockées ?
2. Combien d'écritures la feature produit-elle ?
3. Combien de lectures la feature produit-elle ?
4. Quelle borne ou quel cache limite la consommation ?
5. Quelle partie peut rester dans Git ou dans le navigateur ?

Règle d'exécution à utiliser pour chaque nouvelle fonctionnalité:

- où les données sont stockées;
- combien on écrit;
- combien on lit;
- comment c'est borné;
- pourquoi Supabase est justifié, ou pourquoi il ne l'est pas.

## Règles de base

- utiliser le minimum de colonnes nécessaires
- paginer systématiquement les listes métier
- préférer des compteurs `head: true` ou des RPC dédiés pour les dashboards de synthèse
- garder les écritures en lot quand plusieurs lignes sont créées ensemble
- éviter les fetchs déclenchés au montage si la donnée peut être préchargée côté serveur
- réserver `service_role` aux chemins serveur strictement nécessaires

## Ce qu'il faut éviter

- `select("*")` sur les routes de lecture utilisateur quand la réponse est visible en UI
- requêtes sans `limit()` ou `range()` sur les collections qui peuvent grossir
- boucle `await` qui appelle Supabase une ligne après l'autre
- `useEffect(() => { fetch(...) }, [])` quand la page pourrait être rendue avec des props serveur ou un cache
- `storage.list()` sur un bucket entier pour un simple affichage local
- `download()` de masse quand un lien signé ou un aperçu suffit
- subscription Realtime sans seuil clair de désabonnement ou sans filtrage local
- persistance en base de contenus pédagogiques qui peuvent rester dans Git
- synchronisation de quiz anonymes alors qu'un état local suffit
- autosave permanent sur des formulaires qui n'ont besoin que d'une soumission finale

## Bonnes pratiques par surface

### Database / PostgREST

- sélectionner les colonnes utiles explicitement
- mettre des bornes sur les listes
- utiliser des index adaptés avant d'augmenter les volumes
- préférer un agrégat côté serveur pour les tableaux de bord
- documenter la source de vérité de chaque donnée et la raison du stockage choisi

### RPC

- garder les fonctions limitées à un besoin métier précis
- documenter le coût attendu dans le code ou la migration
- éviter les RPC qui remplacent une simple requête paginée

### Storage

- limiter la taille des uploads
- normaliser les formats lourds vers WebP ou AVIF quand c'est possible
- ne pas lister un bucket complet dans une UI
- garder les scripts d'export et de rétention hors des parcours utilisateur

### Auth

- aujourd'hui l'application repose surtout sur Clerk
- ne pas ajouter d'appel Supabase Auth sans besoin explicite
- si un flux `supabase.auth.*` est ajouté, vérifier le coût MAU et les rate limits

### Realtime

- n'activer une subscription que si elle remplace vraiment du polling
- filtrer côté client pour limiter les revalidations
- déconnecter proprement les channels au démontage

### Chat et salons

Les salons de discussion sont une zone de coût et de risque élevée:

- beaucoup d'écritures,
- beaucoup de lectures,
- parfois du temps réel,
- modération,
- spam,
- notifications,
- signalements.

Pour une première version, privilégier un lien vers Discord, WhatsApp, Signal, Mattermost, Matrix ou un formulaire de contact plutôt que de construire un vrai chat dans Supabase.

Si un chat Supabase devient vraiment nécessaire, documenter d'abord pourquoi le besoin dépasse un simple renvoi vers un outil externe, puis borner les lectures, les écritures et la rétention.
Le temps réel Supabase pour le chat doit rester désactivé par défaut. Si une exception est justifiée, elle doit passer par un flag public explicite, par exemple `NEXT_PUBLIC_ENABLE_SUPABASE_CHAT_REALTIME=1`, puis repasser par un audit avant activation.

### Garde-fous techniques à maintenir

- aucune requête Supabase non bornée;
- `.limit()` ou `.range()` obligatoire sur les listes métier;
- pagination sur les historiques;
- `head: true` ou `count` pour les compteurs;
- `localStorage` pour les préférences locales, quiz et brouillons non critiques;
- documents `.md` servis depuis le repo, pas depuis Supabase;
- cartographie filtrée par bounding box, zoom, statut et limite de résultats;
- pas de temps réel Supabase pour les salons de discussion par défaut;
- feature flags pour les fonctionnalités coûteuses;
- messages explicites dans l'admin quand une donnée est plafonnée ou échantillonnée.

### Dashboards et statistiques

- préférer un `count` côté serveur plutôt qu'une lecture complète
- découper les requêtes coûteuses en fonctions réutilisables
- réutiliser `SWR` ou un cache serveur quand la valeur n'a pas besoin d'être fraîche à la seconde
- n'agréger que des signaux utiles, pas des micro-événements si un total suffit

## Checklist avant merge

- [ ] chaque `.select()` a une raison claire
- [ ] aucune liste métier n'est non bornée
- [ ] aucun `select("*")` inutile n'a été ajouté
- [ ] les uploads ont une taille maximale et un bucket cible clair
- [ ] les écrans live ne créent pas une subscription par composant enfant
- [ ] les routes admin lourdes sont commentées et justifiées
- [ ] la feature indique où les données vivent, combien elle lit, combien elle écrit et quelle borne s'applique
- [ ] les contenus pédagogiques et pages de guide restent dans Git si une base n'apporte pas de valeur supplémentaire
- [ ] les quiz anonymes restent côté navigateur si aucun suivi connecté n'est requis
- [ ] les formulaires à soumission unique ne stockent pas des brouillons chaque seconde
- [ ] les graphiques utilisent des données agrégées au lieu de micro-événements persistés un par un
- [ ] les PDF et exports massifs sont générés à la demande et ne sont pas archivés sans raison
- [ ] le script `backend:supabase:quota-audit` ne remonte pas de nouveau hotspot majeur

## Quand accepter un coût élevé

Un coût Supabase plus élevé peut être acceptable si:

- la fonctionnalité est centrale pour l'utilisateur
- la donnée doit être fraîche
- le coût est borné par un limit, un cache ou une fréquence contrôlée
- il existe un dashboard ou une alerte pour surveiller la dérive
- la table est centrale mais l'usage reste légitime, filtré et borné

## Règle simple

Si une requête sert seulement à afficher un résumé, elle doit être:

1. bornée,
2. paginée ou agrégée,
3. explicitement documentée,
4. couverte par un test ou un audit.
