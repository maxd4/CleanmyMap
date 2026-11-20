# Formats fournisseurs vérifiés, jeux d'essai et décision sur les API

**Statut : DÉCISIONS D'IMPORT À INTÉGRER / preuves publiques datées du 20 novembre 2026.** Aucun test n'a utilisé une clé ni des données privées réelles. Les chiffres ci-dessous proviennent soit d'exemples de documentation (signalés), soit de **fixtures synthétiques** de conformité, pas d'une facturation personnelle observée.

## 1. Périmètre de support décidé

| Format | Décision | Frontière scientifique |
|---|---|---|
| OpenAI `/v1/organization/usage/completions` JSON | **Parser dédié obligatoire** | Buckets agrégés, tokens multimodaux, modèle éventuellement `null` |
| Anthropic **nouvelle** `/v1/organizations/analytics/usage` JSON | **Parser dédié obligatoire** | Beta 2026, `data` en lignes, catégories de cache distinctes |
| Anthropic **legacy** `/v1/organizations/usage_report/messages` JSON | Parser de compatibilité limité si fixture vérifiée | Format historiquement différent, pas mêmes champs/structure |
| Codex CLI `rollout-*.jsonl` | **Parser dédié obligatoire**, réutiliser scripts existants | Compteurs cumulatifs/redémarrages, traces pouvant contenir prompts => extraction locale uniquement |
| Google Gemini `GenerateContentResponse.usageMetadata` JSON | **Parser dédié obligatoire** | Raisonnement additionnel aux candidates, outils et cache ; usage par requête |
| OpenAI CSV export d'activité | Adapter avec mapping de colonnes **vérifiées sur export représentatif** | Ne pas inventer un schéma CSV unique si la plateforme modifie ses colonnes |
| OpenRouter Activity CSV | Import par mapping interactif CSV et validation ; adapter dédié **seulement si schéma concret vérifié** | Ne pas confondre export de graphique, export de logs et facturation |
| PDF de facture contenant du texte | Extraction locale **du coût et des tokens explicitement écrits** | Une facture monétaire ne prouve aucun nombre de tokens |
| Divers CSV/JSON non reconnus | Mapping assisté limité, avec confirmation des unités et conventions | Pas de reconnaissance heuristique qui invente modèle, cache ou région |
| Captures PDF scannées | Refus sans OCR | Confidentialité, fiabilité et dépendances limitées |

**Non retenu** : un import générique qui essaie tous les champs sans contracter la sémantique du fournisseur. **Non retenu** : toute requête privée à une API avec une clé publique « universelle ».

## 2. OpenAI Usage API (documentation primaire)

Source : https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/completions

La documentation expose `GET /organization/usage/completions`, `start_time`, `end_time` exclusif, `bucket_width`, `group_by` (`model`, `project_id`, `api_key_id`, etc.), pagination `has_more`/`next_page`. L'appel authentifié exige **`OPENAI_ADMIN_KEY`**. Un utilisateur n'est pas censé saisir ce secret sur une application tierce grand public.

**Fixture dérivée de l'exemple JSON officiel** (réduite aux champs testés) :

```json
{
  "object": "page",
  "data": [{
    "object": "bucket", "start_time": 1730419200, "end_time": 1730505600,
    "results": [{
      "object": "organization.usage.completions.result",
      "input_tokens": 1000, "input_cached_tokens": 400,
      "input_cache_write_tokens": 100, "input_uncached_tokens": 500,
      "output_tokens": 500, "num_model_requests": 5,
      "model": null, "project_id": null
    }]
  }],
  "has_more": false, "next_page": null
}
```

**Attendu** : `totalInput=1000`, `cachedRead=400`, `cachedWrite=100`, `uncached=500`, `totalOutput=500`, `totalLogical=1500`, `requests=5`, `model=null`, `region=null`, `sourceGranularity=bucket`. Ne pas donner 2000 tokens en sommant les sous-catégories. Le vrai exemple officiel a `has_more=true` et détail multimodal : tester aussi la **pagination incomplète**, et ne pas déclarer que ses `1500 tokens` sont uniquement du texte. Le `has_more=false` dans cette fixture est une **modification synthétique contrôlée**.

**Test négatif** : `input_cached_tokens=1100` alors que `input_tokens=1000` => rejet de la ligne ou erreur cohérente ; `model=null` => pas de sélection implicite d'un modèle OpenAI de remplacement.

## 3. Anthropic Analytics API 2026, sans conflation avec la legacy

Source actuelle : https://platform.claude.com/docs/en/manage-claude/usage-cost-analytics-api

Nouvel endpoint **beta** : `GET /v1/organizations/analytics/usage`, avec header `anthropic-beta: analytics-usage-cost-2026-08-24`. Réponses `data[]` en lignes avec `starting_at`, `ending_at`, `group` et `usage`, `has_more`, `next_page`, `data_refreshed_at`. L'accès Claude Console exige une API Admin ou un token OAuth `org:admin` ; Claude Enterprise peut disposer de `read:analytics`. **Ce n'est pas un endpoint public**. Le format legacy possède une autre enveloppe (buckets / results).

**Fixture issue de l'exemple officiel, limitée aux champs utiles** :

```json
{
  "data": [{
    "starting_at": "2026-09-03T00:00:00Z",
    "ending_at": "2026-09-04T00:00:00Z",
    "group": {"model": "claude-sonnet-5", "inference_geo": null, "workspace_id": null},
    "usage": {
      "uncached_input_tokens": 1284500,
      "cache_creation": {"ephemeral_1h_input_tokens": 0, "ephemeral_5m_input_tokens": 215300},
      "cache_read_input_tokens": 3200000,
      "output_tokens": 891000,
      "total_tokens": 5590800,
      "requests": 4210
    }
  }],
  "has_more": false, "next_page": null,
  "data_refreshed_at": "2026-09-18T16:02:11Z"
}
```

**Attendu** : `inputTotal=1 284 500 + 0 + 215 300 + 3 200 000 = 4 699 800`, `output=891 000`, `total=5 590 800`, `requests=4210`. `inference_geo=null` => région inconnue. Le code doit détecter la cohérence avec `usage.total_tokens`, sans transformer `null` en zéro implicite. Le vrai exemple officiel a `has_more=true` ; le `false` de la fixture est synthétique. La date de fraîcheur reste un champ de provenance, pas une date de consommation.

**Test de fraîcheur** : une réponse incomplète ou dont `data_refreshed_at` précède la fin demandée est marquée **PARTIAL**. Les métriques peuvent être révisées ultérieurement par le fournisseur ; un nouvel export doit remplacer/réconcilier la même plage au lieu de s'ajouter.

Le legacy `usage_report/messages` reste un adaptateur distinct si utilisé. Ne pas traiter un JSON legacy comme un JSON Analytics 2026. Voir https://platform.claude.com/docs/en/manage-claude/usage-cost-api

## 4. Gemini : un modèle de raisonnement n'a pas la même formule de total

Source primaire Google Cloud `UsageMetadata` : https://docs.cloud.google.com/gemini-enterprise-agent-platform/reference/rest/v1beta1/GenerateContentResponse

Pour une réponse Gemini :

`totalTokenCount = promptTokenCount + candidatesTokenCount + toolUsePromptTokenCount + thoughtsTokenCount`.

`cachedContentTokenCount` est **déjà inclus** dans `promptTokenCount`.

**Fixture intégralement synthétique conforme à cette équation** :

```json
{
  "modelVersion": "gemini-model-example",
  "usageMetadata": {
    "promptTokenCount": 231,
    "cachedContentTokenCount": 50,
    "candidatesTokenCount": 242,
    "toolUsePromptTokenCount": 0,
    "thoughtsTokenCount": 524,
    "totalTokenCount": 997
  }
}
```

Attendu : `inputTotal=231`, `outputVisible=242`, `outputReasoning=524`, `outputNormalizedTotal=766`, `total=997`, `cacheRead=50` sous-ensemble de 231, `model` identifié comme libellé fournisseur mais **non présumé dans le catalogue**, région inconnue. **Ne pas affirmer que les tokens de réflexion sont déjà inclus dans les candidates Gemini**.

Test spécifique : `toolUsePromptTokenCount=100` implique `totalTokenCount=1097`, et un scope d'entrée au modèle qui inclut les 100 tokens outil uniquement selon le contrat Google. Ne pas additionner un total déjà déclaré à sa propre ventilation.

## 5. Codex JSONL et import CSV contrôlé

Le dépôt contient déjà `scripts/data/summarize-jsonl-input.mjs` et `scripts/data/summarize-jsonl-tokens.mjs`, avec reconstruction de compteurs cumulatifs, gestion des resets et colonnes `input_tokens`, `cached_input_tokens`, `cache_write_input_tokens`, `output_tokens`, `reasoning_output_tokens`. La fonctionnalité Web **réutilise les mêmes règles**, mais ne dépend pas d'un script Node inaccessible dans le navigateur. Définir un contrat pur partagé dans l'owner du domaine ou déplacer la logique de normalisation sans multiplier les implémentations.

**Tests JSONL** : deux snapshots cumulés `input=100,output=20` puis `input=140,output=35` => total delta `140/35` ; un reset `input=10,output=2` après `140/35` => ajouter 10 et 2, pas une différence négative. Les formats et statuts de session protègent l'absence de recomptage. Une ligne JSONL peut contenir des messages personnels : analyser seulement les champs d'usage en mémoire et supprimer les objets bruts immédiatement.

**CSV tiers** : exiger mapping explicite de `date`, `granularity`, `model`, `input`, `output`, catégories optionnelles, unité, coût et devise. Refuser les cellules interprétées comme formules (`=`, `+`, `-`, `@`) lors des exports ultérieurs ; gérer BOM, guillemets, virgules, point-virgules et encodage. Un CSV de facturation uniquement monétaire est conservé comme preuve de coût sans émissions calculées.

Sources OpenRouter : https://openrouter.ai/activity et https://openrouter.ai/blog/announcements/activity-dashboard/ ; export CSV/PDF indiqué par l'éditeur. **Schéma de colonnes non attesté dans ce dossier : pas de parser figé avant fixture représentative.**

## 6. Doublons, scope et plages temporelles

- Inclure `ownerClerkId`, fournisseur, identité de compte pseudonymisée, `granularity`, identifiant source si disponible, période UTC `[start,end[`, modèle, et hash du contenu **normalisé** dans l'identité de déduplication. Ne jamais stocker le nom du fichier ni son contenu brut comme source canonique.
- Les buckets fournisseur révisables ont une identité stable indépendante de la valeur totale ; un import ultérieur du **même bucket et scope** doit être présenté comme remplacement/version révisée, pas une nouvelle consommation cumulée.
- Deux lignes d'une même source sur le même modèle et le même bucket mais avec `group_by` distincts doivent être détectées comme agrégations alternatives, pas comptées deux fois.
- Une requête individuelle incluse dans un bucket ne s'ajoute pas à ce bucket. En cas de non-prouvabilité de l'exclusivité, présenter `CONFLICT_OVERLAP` et exiger une exclusion ou un choix explicite ; pas de calcul de différence arbitraire.
- Une période absente = import partiel hors total mensuel. Un bucket à cheval sur un mois = non ventilé tant qu'une ventilation sourcée n'existe pas.
- Un import de 1000 lignes doit présenter nombre total, lignes valides, rejetées, et éléments déjà présents. Import multi-lignes `ATOMIC` en transaction PostgreSQL, avec relecture et idempotence après retry.

## 7. Décision de confidentialité et d'API directes

**Aucune clé publique partagée permettant de lire une consommation individuelle privée n'a été trouvée.** Une clé API standard ne donne pas automatiquement accès aux métriques d'administration : OpenAI documente `OPENAI_ADMIN_KEY`, Anthropic fournit Admin/Analytics, et Mistral exige une clé d'administration sur les plans admissibles.

**Décision ferme pour ces lots** : pas de champ permettant de transmettre une clé API, pas de stockage de clé, pas de synchronisation fournisseur en arrière-plan. Un utilisateur peut récupérer **ses exports ou une réponse API JSON** par son propre canal autorisé, puis les importer dans CleanMyMap. Cela couvre l'objectif fonctionnel sans exposer des permissions organisationnelles à un site grand public.

Une connexion API déléguée peut être envisagée **après** démonstration d'une authentification OAuth **read-only et user-scoped**, distincte de `org:admin`, avec durée de vie, révocation, minimisation des droits et autorisation fournisseur vérifiées. Anthropic Enterprise `read:analytics` est un droit d'organisation, pas un consentement individuel générique. Ne pas créer un connecteur fictif ou un bouton « Connecter OpenAI » non opérant.

## 8. Tests d'acceptation minimaux pour le lot d'import

1. OpenAI : `1000` entrée dont `400` cache read et `100` cache write + `500` sortie = **1500** tokens ; 5 requêtes ; modèle inconnu ; pas de CO2 opérationnel central si la région est inconnue.
2. Anthropic Analytics 2026 : **4 699 800** input total, **891 000** output, **5 590 800** total ; **4210** requêtes ; `data_refreshed_at` conservé.
3. Gemini : `231+242+0+524=997`, cache 50 non additionné, raisonnement additionnel 524.
4. Codex : séries cumulatives et reset, sans double comptage.
5. Deux imports du même bucket => un seul enregistrement actif ; fichier répété et révision tardive => idempotence + historique traçable.
6. Deux agrégats de scopes imbriqués => conflit, pas addition.
7. Facture avec uniquement `34,20 EUR` => coût sauvegardable, tokens, kWh, CO2e = `null`.
8. JSON `has_more=true` sans pages suivantes => `PARTIAL`, sans prétendre exhaustivité.
9. JSON malformé, CSV hors taille, PDF chiffré/scanné ou sans texte => rejet propre sans sauvegarde.
10. Comptes Clerk A/B : aucune lecture, écriture, déduplication ni export inter-comptes.