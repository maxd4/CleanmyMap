# Etapes a suivre pour corriger la messagerie Supabase / Next.js

## Etat actuel

Fait:

1. Les migrations ont ete renommees au format Supabase valide `YYYYMMDDHHMMSS`.
2. L'historique `supabase_migrations.schema_migrations` a ete re-aligne sur ces nouveaux noms.
3. La migration `20260428000020_chat_channels_profiles.sql` a ete appliquee sur la base liee.
4. `public.profiles` existe dans la base.
5. `public.app_messages.sender_id` et `recipient_id` sont en `text`.
6. Les policies RLS par canal sont en place.
7. Le code chat utilise maintenant un client RLS via Clerk quand un template JWT est disponible.

Il reste:

1. Configurer le template JWT Supabase cote Clerk.
2. Verifier que le chat ne renvoie plus `503` apres connexion.
3. Forcer une synchro de profil pour que `profiles` contienne l'utilisateur courant.
4. Tester chaque canal dans l'UI.
5. Utiliser `supabase db push --dry-run` comme garde-fou avant toute publication.

## 1. Confirmer le contexte local

1. Verifier que `apps/web/.env.local` pointe vers le bon projet Supabase.
2. Verifier que la messagerie affiche bien l'erreur de flux sur localhost.
3. Verifier que le site tourne sur `http://localhost:3000` avant de toucher au schema.

Commandes utiles:

```powershell
Get-Content apps/web/.env.local
npm run dev
```

## 2. Identifier la cause exacte

1. Ouvrir `apps/web/src/app/api/chat/route.ts`.
2. Ouvrir `apps/web/src/components/chat/chat-shell.tsx`.
3. Verifier si le code lit et ecrit dans `public.app_messages`.
4. Verifier si le code joint `public.profiles`.
5. Verifier si le frontend envoie `sender_id = user.id` depuis Clerk.
6. Verifier le champ utilise pour l'arrondissement et pour le role utilisateur.

## 3. Comparer avec la base Supabase reliee

1. Lister les migrations locales.
2. Verifier si `20260420000015_advanced_chat_core.sql` existe dans le repo.
3. Verifier si la migration a ete appliquee sur le projet lie.
4. Verifier si `public.profiles` existe vraiment dans la base distante.
5. Verifier si `public.app_messages` existe vraiment dans la base distante.
6. Verifier le type de `sender_id` et `recipient_id`.
7. Verifier les policies RLS deja presentes.
8. Si la table ou les types sont mauvais, ne pas refaire un `db push` aveugle: appliquer le SQL versionne de facon directe.

Commandes utiles:

```powershell
npx supabase migration list --linked
@'
select table_name, column_name, data_type
from information_schema.columns
where table_schema = ''public''
  and table_name in (''profiles'', ''app_messages'');
'@ | npx supabase db query --linked
```

## 4. Choisir la correction minimale

1. Ne pas desactiver RLS.
2. Ne pas rendre la lecture globale publique.
3. Ne pas inventer une nouvelle table de profil si `profiles` existe deja dans le code.
4. Ne pas modifier auth, roles ou routes hors messagerie.
5. Corriger uniquement ce qui bloque le schema ou les policies.

## 5. Aligner le schema si necessaire

Si la base distante est incoherente avec le code:

1. Creer une migration versionnee avec un timestamp unique.
2. Ajouter ou corriger `public.profiles`.
3. Faire correspondre `app_messages.sender_id` et `recipient_id` au type attendu par le code.
4. Ajouter les indexes utiles.
5. Activer RLS sur les tables concernees.

## 6. Poser les policies RLS

Regles a appliquer:

1. `INSERT`: `sender_id = auth.uid()` ou l'identifiant utilisateur attendu par le schema retenu.
2. `SELECT` communautaire: membres connectes.
3. `SELECT` quartier: meme arrondissement uniquement.
4. `SELECT` DM: seulement expediteur ou destinataire.
5. `SELECT` governance/executive: seulement les roles autorises.

Attention:

1. Les policies doivent suivre le type exact d'identifiant utilise par le backend.
2. Si le code utilise Clerk, la base et les policies doivent etre coherentes avec les IDs Clerk.

## 7. Appliquer la migration

1. Creer la migration dans `apps/web/supabase/migrations/`.
2. Valider le SQL localement.
3. Pousser la migration vers le projet Supabase lie.
4. Ne pas patcher manuellement la base sans garder le SQL versionne dans le repo.
5. Si `db push` echoue sur l'historique Supabase, utiliser `npx supabase db query --linked -f ...` puis reparer l'historique plus tard.

Commandes utiles:

```powershell
npx supabase migration new fix_chat_schema
npx supabase db push --linked
```

## 8. Verifier la synchro profil

1. Ouvrir `apps/web/src/lib/auth/sync.ts`.
2. Verifier que la synchro Cree une ligne dans `public.profiles`.
3. Verifier que `paris_arrondissement` est renseigne si necessaire.
4. Verifier que le role utilisateur est bien persiste.
5. Se reconnecter en local pour forcer la synchro passive.
6. Si la ligne ne se cree pas, verifier le template Clerk et le flux de login, pas la table Supabase en premier.

## 9. Tester la messagerie

1. Ouvrir la page de messagerie.
2. Verifier le chargement des messages.
3. Tester l'envoi d'un message communautaire.
4. Tester l'envoi d'un message prive.
5. Tester un message `admin_elu`.
6. Tester un message `territory`.
7. Tester un `bug_report`.
8. Verifier les etats `loading`, `empty` et `error`.
9. Verifier que le chat renvoie une erreur claire si le template JWT Clerk est absent.

## 10. Valider la securite

1. Verifier que les DM ne sont pas lisibles hors paire expediteur/destinataire.
2. Verifier que les messages de quartier sont limites a l'arrondissement.
3. Verifier que les messages sensibles restent limites au role autorise.
4. Verifier que RLS reste active.
5. Verifier que les requetes de test ne contournent pas la securite par inadvertance.
6. Verifier que le client service role ne sert plus au flux chat normal.

## 11. Documenter le resultat

1. Garder la migration dans le repo.
2. Noter la regle RLS retenue.
3. Noter le champ exact du profil utilise pour l'arrondissement.
4. Noter le champ exact du profil utilise pour le role.
5. Noter le template JWT Clerk requis pour activer la messagerie en local.

## 12. Ne pousser sur GitHub qu'apres validation

Ordre impose avant push:

1. `lint`
2. `typecheck`
3. `build`
4. `vercel build --yes` si le projet est lie a Vercel
5. `git push` seulement si tout est vert

Commande standard:

```powershell
npm run prepush:guard
```
