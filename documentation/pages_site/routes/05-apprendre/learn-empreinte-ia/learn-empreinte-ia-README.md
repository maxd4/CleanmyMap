# Mon empreinte IA

## Fiche canonique

- **Route** : `/learn/empreinte-ia`
- **Accès** : public pour le calcul anonyme; fonctionnalités de sauvegarde et de gestion authentifiées et owner-scoped.
- **Fichier source** : `apps/web/src/app/learn/empreinte-ia/page.tsx`
- **Clients de saisie, gestion et import** : `apps/web/src/app/learn/empreinte-ia/personal-ai-declaration-client.tsx`, `personal-ai-import-client.tsx`
- **Owner scientifique et normalisation** : `apps/web/src/lib/environmental-impact-estimator/`
- **Persistance** : `public.personal_ai_declarations`, RLS Clerk et `/api/personal-ai/declarations`.
- **Famille visuelle** : Apprendre; accents d'impact repris du composant pédagogique.

## Parcours

- Le parcours prioritaire « Estimation rapide » fonctionne sans compte fournisseur ni connexion : chatbot, période, fréquence approximative, échanges, longueurs de questions/réponses et présence éventuelle d'usages image/audio.
- « Je ne sais pas » reste une valeur inconnue distincte de zéro. Les longueurs sont conservées en caractères et ne sont jamais converties en tokens mesurés. Les offres gratuites et abonnements n'influencent pas le calcul énergétique.
- Sans modèle, tokenizer et conversion caractères→tokens empiriquement validés, l'énergie et les impacts attribués à l'activité personnelle restent `NA`. Image/audio restent déclarés séparément avec quantité et impact `NA`.
- Le parcours affiche séparément trois simulations pédagogiques pour un million de tokens hypothétiques, issues du registre scientifique. Une région `UNKNOWN` laisse le CO₂e et l'eau `NA`; choisir une région est une hypothèse de simulation, jamais une localisation déclarée ni une compensation.
- Le calcul rapide reste anonyme. Après connexion, une période connue est requise pour enregistrer le scénario dans la table existante, sous le type `SELF_REPORTED_CHAT_USAGE`, avec compteurs de tokens et énergie nuls. Il n'est jamais classé EcoLogits.
- Un scénario rapide actif en conflit de période avec une déclaration/import actif du même fournisseur ne peut coexister : l'API/RPC le refuse jusqu'à exclusion et rapprochement explicite. Le scénario enregistré est modifiable, excluable, réactivable et supprimable via la gestion privée existante.
- La saisie technique existante reste disponible après le parcours rapide.
- La saisie peut rester anonyme. Elle n'appelle aucune API de sauvegarde.
- La connexion rend disponible l'enregistrement explicite et la liste privée du compte.
- Une personne peut corriger une déclaration, l'exclure, la réactiver ou la supprimer définitivement.
- Les formats importés acceptés sont OpenAI Organization Usage JSON, Anthropic Analytics 2026 JSON, Gemini `usageMetadata` JSON, Codex rollout JSONL et CSV explicitement mappé. Les autres schémas, dont les enveloppes Anthropic legacy non vérifiées, sont refusés.
- Les JSONL Codex sont lus par morceaux; seuls les compteurs autorisés sont retenus en mémoire. Les fichiers ne sont jamais téléversés. Les PDF sont extraits localement avec PDF.js, sans OCR; seuls les montants/devises et compteurs explicitement étiquetés sont repris.
- Les limites d'analyse sont JSON/CSV 10 Mo et 20 000 lignes, JSONL 50 Mo et 250 000 lignes, PDF 5 Mo et 20 pages. La confirmation transmet des lignes normalisées au RPC `confirm_personal_ai_import` en une transaction owner-scoped, puis l'interface affiche les lignes relues depuis la réponse PostgreSQL.
- Un import conserve les hashes distincts d'identité source et de contenu normalisé, ainsi qu'une portée contenant uniquement des empreintes de dimensions source attestées. Les identifiants fournisseur bruts restent locaux. Une révision met à jour la même identité stable, sans additionner l'ancienne valeur; une identité indéterminée ne peut pas être confirmée. Le contenu d'un relevé importé se modifie uniquement en réimportant sa source; exclusion, réactivation et suppression restent disponibles avec les contrôles de chevauchement.
- Les chevauchements sont comparés par fournisseur, modèle, période et dimensions de portée : seules des portées prouvées disjointes peuvent coexister. Une portée englobante/sous-ensemble, sans dimension commune ou ancienne portée inconnue reste en conflit, y compris lorsque la période est inconnue. Une page fournisseur incomplète et les relevés Codex sans période restent partiels.
- OpenAI utilise les dimensions de regroupement présentes dans ses lignes (`project_id`, `user_id`, `api_key_id`, `batch`, `service_tier`, `api_source`); Gemini exige un `responseId` pour une identité stable. Le CSV exige la sélection explicite d'une ou plusieurs colonnes d'identité. Les compteurs égaux et le contenu seul ne créent jamais une identité source.
- Une facture à coût seul conserve le coût sans tokens, énergie ni CO₂e déduits.
- Les bornes de période sont des dates UTC, avec borne de fin exclusive.
- La région d'inférence accepte `null`, `UNKNOWN` ou un code ISO 3166-1 alpha-2 valide ; une région sans facteur scientifique compatible conserve le carbone en `NA`.
- Une entrée vide reste inconnue (`null`); zéro est un choix explicite.
- Les frontières énergétiques IT, site et mur local restent distinctes; sans frontière ou preuve, le moteur ne revendique pas une mesure correspondante.
- EcoLogits ne traite que les données qualifiées par requête. Les agrégats restent proxy ou `NA`.
- Le moteur fournit les valeurs, les sources et les limites; les inconnues restent `NA`. `methodology_version` identifie la méthode, tandis que `factor_version` conserve les IDs/versions du registre réellement appliqués ou les facteurs indisponibles explicitement.

## Données et confidentialité

La persistance minimale associe l'identifiant Clerk propriétaire à une déclaration normalisée et au snapshot scientifique calculé côté serveur. Sont enregistrés les choix de source/provenance, le fournisseur, les modèles/opérateurs déclarés, la région physique déclarée, la granularité, la période, les catégories de tokens, les modalités, les frontières énergétiques et les versions de méthode/facteurs. Pour un import, les métadonnées et les coûts restent séparés des tokens; les identifiants source bruts ne sont pas persistés.

Les prompts, conversations, factures, identifiants bruts de compte fournisseur, clés d'API et credentials ne font pas partie du contrat. Les tableaux, projections et comparaisons de cette page ne modifient pas les KPI terrain, les règles XP, la gamification ni les snapshots environnementaux du projet. Les scénarios de collecte restent pédagogiques et ne constituent aucune compensation carbone ou hydrique.

RLS limite les lignes à `auth.jwt()->>'sub'`; les routes répètent ce contrôle par identifiant et owner. Les réponses privées utilisent `Cache-Control: private, no-store`. Les données sont conservées jusqu'à leur suppression par la personne ou au traitement d'une demande de droits; aucune purge automatique n'est configurée.

La fiche de méthode globale est [SCIENTIFIC_PROTOCOL.md](../../../../product/SCIENTIFIC_PROTOCOL.md). La déclaration et ses snapshots sont versionnés et ne créent pas d'historique avancé ou de budget du lot 3.
