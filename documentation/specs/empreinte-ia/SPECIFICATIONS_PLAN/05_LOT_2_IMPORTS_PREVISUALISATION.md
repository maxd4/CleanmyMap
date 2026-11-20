# Prompt Codex : Lot 2/3, imports réels, prévisualisation et qualité

**Type : LOT XL / réécriture de la partie import du premier ancien prompt.** À exécuter après le lot 1. Le détail des fixtures vérifiées et des exemples JSON est fourni dans `02_SOURCES_ET_FIXTURES_API.md`.

```text
LOT 2/3 : Import de consommation IA multi-fournisseurs, aperçu puis confirmation.

OBJECTIF
Permettre d'importer des relevés CSV, JSON, JSONL et factures PDF textuelles dans « Mon empreinte IA », sans clé API ni stockage brut. Normaliser la sémantique propre à chaque fournisseur, puis consommer le même calculateur et le même stockage privé que le lot 1.

JALON 1 : PARSEURS ET TESTS DE CONFORMITÉ
- Parseur OpenAI organization/usage/completions JSON avec buckets, input comprenant cached/cache-write, sorties multimodales, model null, has_more/next_page et dates Unix UTC. Fixture officielle : input=1000, cache_read=400, cache_write=100, uncached=500, output=500, requêtes=5 ; total logique=1500, pas de double somme.
- Parseur Anthropic Analytics 2026 /v1/organizations/analytics/usage, distinct du legacy usage_report. Champs usage.uncached_input_tokens, usage.cache_creation.ephemeral_1h_input_tokens et ephemeral_5m_input_tokens, cache_read_input_tokens, output_tokens, requests, data_refreshed_at. Fixture officielle : input=4 699 800, output=891 000, total=5 590 800, demandes=4210. Implémenter le legacy séparément uniquement si son format est prouvé.
- Parseur Gemini GenerateContentResponse.usageMetadata : total=prompt+candidates+toolUsePrompt+thoughts ; cache inclus dans prompt. Fixture synthétique 231+242+0+524=997, dont cache=50. Parseur Codex rollout JSONL : réutiliser les règles de compteurs cumulatifs et resets des scripts/data/ existants, extraire uniquement métriques, jamais transcript.
- CSV OpenAI/OpenRouter : mapper les colonnes vérifiées, sinon mapping guidé explicite avec validation ; pas de schema inventé. PDF textuel : extraire en local et seulement les tokens/coûts effectivement identifiables ; une facture seulement monétaire conserve le coût, tokens/kWh/CO2e=null. Refuser PDF scannés/chiffrés et ne pas faire d'OCR ni d'IA externe.

JALON 2 : SÉCURITÉ ET PRÉVISUALISATION
- Traiter les fichiers dans le navigateur et en mémoire, avec parsing incrémental JSONL. Plafonds documentés : CSV/JSON 10 Mo et 20 000 lignes, JSONL 50 Mo et 250 000 lignes, PDF 5 Mo et 20 pages. Dépendance PDF légère, lazy-loaded uniquement si requise ; aucune donnée brute transmise à l'API.
- Onglet Importer : glisser-déposer, fichier choisi, détection format/version, aperçu fournisseur, modèle, compte/scope, période, catégories de tokens, coût/devise, source, couverture des pages, nombres valides/rejetés, champs manquants, chevauchements et doublons. États explicites de rejet, partiel et prêt à confirmer ; confirmation utilisateur avant écriture.
- Empreinte normalisée owner-scoped ; identités stables des buckets révisables et suppression des duplications exactes. Pour scopes imbriqués, événements inclus dans des buckets, mêmes périodes et vues agrégées concurrentes : signaler conflit et exiger exclusion/choix, ne pas additionner automatiquement. Un bucket recouvrant deux mois sans détail de ventilation est hors agrégat mensuel.

JALON 3 : CONFIRMATION ET DOCUMENTATION
- Envoyer exclusivement des lignes normalisées/validées au service existant du lot 1. Confirmation multi-lignes ATOMIC dans la couche PostgreSQL ou RPC owner-scoped, pas de boucle HTTP partiellement validée ; idempotence après timeout et concurrent import, relecture des résultats enregistrés.
- Sans compte, calcul/aperçu temporaire autorisé mais aucun enregistrement ; connexion requise uniquement pour Confirmer. Aucune demande de clé fournisseur, aucun upload brut ni logs contenant prompts, factures ou identifiants personnels.
- Actualiser la fiche de page, la méthodologie d'import, la sécurité, RGPD, provenance, tableaux de formats supportés et version des fixtures ; distinguer `CURRENT` de formats à vérifier.

VALIDATION
Exécuter les fixtures exactes OpenAI, Anthropic, Gemini et Codex ; cache, reasoning, multimodal, pagination tronquée, data_refreshed_at, model null, formats legacy, CSV échappé/BOM, PDF coût seul, PDF non textuel, taille excessive, erreur de décodage, doublons et collisions scopes. Tests de confirmation atomique, réimport, deux comptes Clerk, preuve PostgreSQL RLS en lane éphémère, E2E navigateur d'import puis suppression ; typecheck/lint, couverture Web ciblée et documentation CURRENT.

STOP CONDITION
Les fichiers réellement compatibles génèrent un aperçu puis un usage calculable traçable. Les totaux ne doublent pas, les factures sans tokens ne créent aucune émission, aucun secret ou brut n'est stocké et les imports refusés/partiels sont explicitement justifiés.
```