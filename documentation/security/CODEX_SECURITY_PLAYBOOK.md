# Codex Security Playbook

Ce guide résume les règles de sécurité que l'on applique ici quand on audite ou modifie le repo avec la compétence `codex-security`.

## Objectif

- Identifier rapidement les surfaces à risque.
- Corriger les problèmes structurels, pas seulement les symptômes.
- Garder les garanties vérifiables par tests.
- Éviter toute régression sur Supabase, Vercel, l'auth et les flux publics.

## Principes non négociables

- Aucun secret en dur dans le code, les docs ou les logs.
- Aucun fallback "production" silencieux pour une configuration manquante.
- Les variables `NEXT_PUBLIC_*` sont publiques par définition.
- Les secrets serveur restent côté serveur, jamais dans le bundle navigateur.
- Les surfaces publiques doivent avoir une validation stricte et des limites explicites.
- Une correction de sécurité doit s'accompagner d'un test ou d'une vérification automatisable.

## Supabase

### Règles d'accès

- Préférer `SECURITY INVOKER` pour les helpers SQL exposés.
- Éviter `SECURITY DEFINER` dans le schéma `public`.
- Si une fonction doit rester privilégiée, la restreindre explicitement avec `REVOKE` / `GRANT`.
- Utiliser `service_role` uniquement côté serveur.
- Vérifier les politiques RLS sur les tables exposées.

### Contrôles à faire

- Lancer les advisories de sécurité Supabase après une modification SQL.
- Vérifier que les helpers RPC ne sont pas appelables par `anon` sans intention claire.
- Vérifier que les écritures sensibles ne reposent pas sur des paramètres client spoofables.
- Vérifier les chemins d'importation et de fan-out qui écrivent dans `app_notifications`, `missions`, `actions` ou `spots`.
- Vérifier qu'une branche Git de preview Supabase est bien associée et active via `npm -C apps/web run backend:supabase:preview:ensure` avant de considérer un preview comme utilisable.

## Tests navigateur et smoke production authentifiés

Ce workflow est générique et s'applique à toute surface métier protégée qui
doit être vérifiée localement puis, si nécessaire, en production.

### Local

- Utiliser le bypass `CMM_DEV_AUTH_BYPASS_ROLE` uniquement sur un serveur local
  ou de développement configuré pour ce mécanisme.
- La matrice de rôles disponible est : `benevole`, `coordinateur`,
  `scientifique`, `entreprise`, `elu`, `admin` et `max`.
- Choisir le rôle correspondant à la capacité testée. Ne pas lancer tous les
  rôles lorsque le chantier n'en nécessite que certains, et ne pas utiliser
  `max` systématiquement comme identité de substitution.
- Les handlers doivent continuer à appliquer leurs helpers centraux d'AuthN et
  d'AuthZ ; le bypass local ne rend aucune route publique et ne modifie pas les
  permissions métier.

### Production

1. Vérifier que la configuration nécessaire est disponible sans afficher de
   secret ni de valeur sensible.
2. Obtenir une vraie session utilisateur Clerk. Préférer un Agent Task si la
   version et l'instance le supportent ; sinon utiliser le mécanisme Clerk
   stable de création de session et de jeton court, sans documenter sa valeur.
3. Vérifier d'abord une lecture authentifiée de la surface concernée, puis
   créer au maximum une donnée de smoke via la vraie API utilisateur.
4. Donner à chaque mutation un marker unique et non sensible permettant de
   retrouver précisément ses artefacts.
5. Vérifier la persistance dans la source canonique, les effets secondaires
   attendus, les flux downstream concernés et l'absence d'écriture dans les
   sources legacy qui ne doivent plus être alimentées.
6. Réserver `service_role` aux lectures de preuve côté serveur et au nettoyage
   chirurgical des artefacts identifiés par leur ID ou leur marker. Ne jamais
   l'utiliser comme identité HTTP utilisateur.
7. Nettoyer obligatoirement toutes les données créées par le smoke, sans
   toucher aux données d'un autre utilisateur, puis vérifier qu'aucun marker,
   ID, événement ou artefact associé ne subsiste.
8. Révoquer ou terminer la session temporaire et, le cas échéant, l'Agent Task.

Un replay local Docker/Supabase ne doit pas être installé uniquement pour
reproduire une preuve déjà suffisamment couverte par des tests contractuels.
Il reste justifié lorsque le comportement vérifié dépend réellement du
runtime Supabase local, de son schéma, de RLS ou de ses extensions.

### OpenAI / Studio local

- `OPENAI_API_KEY` peut être requis par `apps/web/supabase/config.toml` pour Supabase Studio local.
- Cette clé reste un secret serveur/local et ne doit jamais passer dans `NEXT_PUBLIC_*` ni dans le sync Vercel.
- Si le repo ne consomme pas OpenAI côté applicatif, ne pas ajouter de logique frontend ou de fallback public pour cette clé.

## Vercel

### Règles d'environnement

- Les variables de production ne doivent pas être codées en dur dans `env.ts`.
- La synchronisation d'env vers Vercel doit être publique par défaut.
- Les clés sensibles ne doivent partir qu'avec une action explicite de type `--include-secrets`.
- Les environnements preview doivent être scoping par branche quand c'est nécessaire.
- Les fichiers `.env.local` et `.env.vercel.local` doivent rester alignés sur le projet lié.

### Contrôles à faire

- Vérifier que le projet est bien lié via `.vercel/project.json`.
- Vérifier que `backend-doctor` passe avant publication.
- Vérifier que les env vars requises existent en local et dans l'export Vercel.
- Vérifier qu'aucune variable secrète n'est marquée `NEXT_PUBLIC_*`.

## Checklist de revue

Avant de valider une modification sensible, vérifier :

- la surface est-elle publique ou privée ?
- la donnée peut-elle être falsifiée par un client ?
- la fonction SQL a-t-elle le bon niveau de privilège ?
- la configuration échoue-t-elle vite si un secret manque ?
- le test de régression couvre-t-il la règle que l'on ajoute ?

## Commandes utiles

- `npm -C apps/web run test:security`
- `npm -C apps/web run typecheck`
- `npm -C apps/web run backend:doctor`
- `npm -C apps/web run backend:vercel:env:sync`
- `npm -C apps/web run backend:supabase:push`

## Quand bloquer

Bloquer si :

- un secret apparaît dans le frontend ou dans un fallback hardcodé ;
- une fonction SQL publique reste en `SECURITY DEFINER` sans justification ;
- une écriture sensible accepte un `user_id` / `mission_id` / `created_by` fourni par le client sans garde-fou ;
- une route sensible dépend d'un en-tête ou d'un paramètre spoofable ;
- une doc opérationnelle ne reflète plus les règles réelles du code.
