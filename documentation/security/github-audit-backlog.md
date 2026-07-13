# Backlog d'audit GitHub — exécutable par Codex

**Dernière confrontation avec GitHub :** 13 juillet 2026  
**Dépôt de référence :** `maxd4/CleanmyMap`  
**Branche de référence :** `main`  
**Dernier commit observé :** `8666d8eb8e4f309fd518aea8b5321fa2f29af9d2`

## Objectif

Maintenir un état GitHub fiable et vérifiable pour CleanMyMap : alertes de sécurité, CodeQL, Dependabot, secret scanning, CI et protection de `main`.

Le backlog doit distinguer strictement :

- l'état réel obtenu depuis GitHub ;
- l'état visible dans le code du dépôt ;
- les éléments historiques qui ne doivent plus être traités comme des tâches actives ;
- les réglages externes au dépôt qui nécessitent une autorisation explicite avant modification.

## Sources de vérité à lire

Avant exécution :

1. les règles globales du dépôt
2. `documentation/security/README.md`
3. `documentation/security/github-audit-backlog.md`
4. `documentation/plans-perso/AUDIT_REPO_GPT56.md`
5. `.github/workflows/ci.yml`
6. `.github/workflows/codeql.yml`
7. `.github/dependabot.yml`
8. `package.json`

Ensuite, ne lire que les fichiers nécessaires à l'item en cours.

## Règles d'exécution

- Travailler dans le checkout courant. Aucun worktree, clone parallèle ou dossier projet sibling.
- Commencer par `git status --short` et préserver toutes les modifications utilisateur existantes.
- Revalider l'état GitHub distant avant de corriger une alerte historique.
- Ne jamais inventer un nombre d'alertes à partir de la documentation.
- Si l'API GitHub renvoie `403`, `404` ou si `gh` n'est pas authentifié, noter `non accessible` au lieu de supposer `0`.
- Ne pas fermer ou ignorer une alerte CodeQL uniquement pour faire baisser un compteur.
- Une alerte peut être corrigée, supprimée avec du code mort, ou rejetée comme faux positif/risque accepté uniquement avec justification factuelle.
- Ne pas modifier les réglages GitHub externes, les rulesets, la protection de branche, les secrets, les permissions ou les paramètres du dépôt sans autorisation explicite de l'utilisateur.
- Ne pas créer de branche, commit, push ou PR sans demande explicite.
- Préférer les validations ciblées puis `npm run checks:changed`.
- Ne pas lancer plusieurs commandes lourdes en parallèle.

---

# État déjà vérifié — ne pas rouvrir sans preuve

## CI principale

Les corrections attendues dans l'ancien backlog sont déjà présentes dans `.github/workflows/ci.yml` :

- `security:secrets` s'exécute aussi pour les changements documentaires ;
- `check:root-files` est exécuté en CI ;
- `check:doc-governance` est exécuté en CI ;
- `check:stack-doc-drift` est exécuté en CI ;
- `check:agent-skills` est exécuté en CI ;
- le build de production web s'exécute pour les changements non documentaires ;
- le typecheck du companion s'exécute lorsque son code ou le workflow CI change.

**Conclusion :** ne pas créer un nouveau chantier de réécriture de `ci.yml`. Vérifier seulement l'absence de régression dans `GHA-030`.

## CodeQL déjà traité historiquement

Le commit `8c8e4a8d7501ce8787c31cfd15f7cde0acab5d61` a déjà modifié notamment :

- `apps/web/scripts/upload-sentry-sourcemaps.mjs` ;
- `scripts/export-clerk-users.mjs` ;
- `scripts/split-bibliography.mjs`.

Ne pas rouvrir automatiquement leurs anciennes alertes sans confirmer qu'elles sont encore ouvertes sur le commit courant.

## Alertes documentaires potentiellement périmées

- `free-plan-services-visual.tsx` n'existe plus sous ce nom dans l'arbre courant. Ne pas en faire une tâche active sans alerte GitHub actuelle.
- Les familles `js/unused-local-variable` et `js/unneeded-defensive-code` sont de faible priorité et ne doivent pas déclencher une campagne de nettoyage globale.
- `run-inventory.js` était historique et a été supprimé dans le lot `GHA-020` ; la branche active du nettoyage reste `scripts/cleanup/inventory.ts`.

---

# P0 — Établir un snapshot GitHub incontestable

## GHA-000 — Capturer l'état distant réel

**Priorité : P0**  
**Risque : faible**  
**Livrable : snapshot factuel avant toute correction**

### Objectif

Remplacer les nombres historiques par un snapshot GitHub exact, daté et attaché au commit courant.

### Préconditions

```bash
gh auth status
git status --short
git rev-parse HEAD
```

Vérifier que le checkout correspond bien à `maxd4/CleanmyMap`. Si le checkout local est en avance ou en retard par rapport à `main`, le signaler avant de poursuivre.

### Commandes de lecture recommandées

```bash
REPO="maxd4/CleanmyMap"

# Commit distant de main
gh api "repos/$REPO/commits/main" --jq '.sha'

# Dependabot — alertes ouvertes
gh api --paginate --slurp \
  "repos/$REPO/dependabot/alerts?state=open&per_page=100" \
  --jq 'map(length) | add // 0'

# Code scanning — alertes ouvertes
gh api --paginate --slurp \
  "repos/$REPO/code-scanning/alerts?state=open&per_page=100" \
  --jq 'map(length) | add // 0'

# Secret scanning — alertes ouvertes
gh api --paginate --slurp \
  "repos/$REPO/secret-scanning/alerts?state=open&per_page=100" \
  --jq 'map(length) | add // 0'

# État de protection de main
gh api "repos/$REPO/branches/main" --jq \
  '{name, protected, protection}'

# Rulesets éventuels
gh api "repos/$REPO/rulesets"
```

### Inventaire CodeQL détaillé

```bash
gh api --paginate --slurp \
  "repos/$REPO/code-scanning/alerts?state=open&per_page=100" \
  --jq 'add | map({
    number,
    rule: .rule.id,
    severity: .rule.security_severity_level,
    path: .most_recent_instance.location.path,
    state
  })'
```

### Snapshot minimal à produire

```txt
date:
local SHA:
remote main SHA:
Dependabot open:
Code scanning open:
Secret scanning open:
main protected:
rulesets:
CI/code scanning accessibility:
```

### Critères d'acceptation

- Aucun nombre n'est repris d'un ancien document sans requête distante.
- Les erreurs d'accès sont écrites explicitement.
- Le snapshot mentionne le SHA exact.
- Les alertes CodeQL sont listées avec numéro, règle et chemin courant.

### Stop condition

Si `gh` n'est pas authentifié ou ne possède pas les droits nécessaires, arrêter les actions GitHub distantes, conserver l'analyse locale et indiquer précisément ce qui n'a pas pu être revalidé.

---

# P1 — Traiter uniquement les alertes de sécurité réellement ouvertes

## GHA-010 — Revoir le flux fichier → service HTTP du géocodage d'import

**Priorité : P1 si l'alerte `js/file-access-to-http` est encore ouverte**  
**Risque : moyen à élevé selon la nature des adresses importées**

### Fichiers principaux

- `apps/web/scripts/lib/sheet-ingestion-core.mjs`
- `apps/web/scripts/build-admin-import-from-sheet.mjs`
- `apps/web/scripts/sync-real-data-from-sheet.mjs`
- autres consommateurs réels trouvés localement

### Constat actuel

`sheet-ingestion-core.mjs` contient `geocodeAddress()`, qui envoie une adresse à Nominatim.

Dans `build-admin-import-from-sheet.mjs`, ce flux n'est activé que lorsque le CLI contient explicitement `--geocode`. Les libellés peuvent provenir d'un Google Sheet ou d'un snapshot CSV local.

Ce flux est donc intentionnel et opt-in, mais il peut transférer vers un service tiers des données issues d'un fichier. Il ne doit ni être corrigé aveuglément, ni rejeté automatiquement comme faux positif.

### Travail

1. Lire le détail de l'alerte GitHub courante et confirmer son numéro, sa source et son sink.
2. Inventorier tous les consommateurs de `createGeocodeResolver` et `geocodeAddress`.
3. Déterminer la nature réelle des champs envoyés :
   - lieu public d'action ;
   - adresse personnelle ;
   - contenu libre ;
   - données déjà publiques.
4. Vérifier que `--geocode` reste explicitement opt-in.
5. Vérifier qu'aucun autre chemin n'active le géocodage automatiquement.
6. Choisir une seule issue :
   - **corriger** si des données potentiellement privées peuvent être envoyées sans garde suffisante ;
   - **restreindre** les champs autorisés au géocodage externe ;
   - **documenter et rejeter l'alerte** uniquement si le flux est volontaire, borné, non sensible et explicitement déclenché.
7. Si une correction de code est nécessaire, ajouter un test ciblé du garde-fou.

### Constat de cette passe

- L'alerte GitHub courante est bien `#7` sur `js/file-access-to-http`, avec `apps/web/scripts/lib/sheet-ingestion-core.mjs` comme site de flux et `apps/web/scripts/build-admin-import-from-sheet.mjs` comme consommateur actif; `apps/web/scripts/sync-real-data-from-sheet.mjs` a été supprimé.
- `--geocode` reste un opt-in explicite, et le wrapper historique `apps/web/scripts/sync-google-sheet-to-supabase.mjs` a été supprimé.
- Les données envoyées à Nominatim sont limitées aux libellés de localisation issus du Google Sheet ou du snapshot local: `locationLabel`, `departureLocationLabel`, `arrivalLocationLabel` et les labels de `clean_place`.
- Aucun autre chemin local n'active le géocodage automatiquement.
- Les points d'appel de `build-admin-import-from-sheet.mjs` normalisent maintenant le libellé avant d'atteindre le résolveur.
- Le résolveur de géocodage rejette maintenant les chaînes qui ressemblent à du texte libre, des URLs ou des emails avant toute requête réseau.
- Décision d'audit locale: alerte à rejeter comme flux de maintenance volontaire, borné et explicitement déclenché, avec garde supplémentaire sur le format des libellés.

### Interdictions

- Ne pas contourner l'alerte par renommage de fonction ou commentaire CodeQL.
- Ne pas envoyer plus de données au service externe.
- Ne pas inclure notes, identité, association ou autres colonnes non nécessaires dans la requête de géocodage.
- Ne pas transformer ce script de maintenance en route runtime.

### Critères d'acceptation

- Le flux fichier → HTTP est compris et documenté.
- Le géocodage externe reste explicitement opt-in.
- Seule la donnée minimale nécessaire quitte le processus.
- Une alerte rejetée possède une justification précise liée au flux réel.
- Une alerte corrigée possède une validation ciblée.
- Le script historique `apps/web/scripts/sync-real-data-from-sheet.mjs` a été supprimé; aucune tâche active ne doit plus s'y référer.

---

## GHA-020 — Supprimer ou corriger `run-inventory.js`

**Priorité : P1 si `js/incomplete-sanitization` est encore ouverte ; sinon P2**

### Fichier

```txt
scripts/cleanup/run-inventory.js
```

### Constat actuel

La recherche GitHub ne montre pas de consommateur runtime ou de script package pour ce fichier. Il s'agissait d'un doublon historique du script TypeScript `scripts/cleanup/inventory.ts` et il a été supprimé dans cette passe.

### Travail

1. Vérifier localement toutes les références :

```bash
rg -n "run-inventory|dark-cleanup-backup|Inventaire des références dark" . \
  -g '!node_modules/**' \
  -g '!.next/**' \
  -g '!artifacts/**' \
  -g '!backups/**'
```

2. Classer le fichier :
   - encore utilisé ;
   - utilitaire ponctuel encore utile ;
   - historique mort.

3. Si historique mort :
   - supprimer le fichier ;
   - supprimer seulement les références documentaires devenues fausses ;
   - ne pas créer un remplaçant inutile.

4. Si encore utile :
   - lire l'alerte CodeQL exacte ;
   - corriger la sanitation à la frontière de sortie ;
   - extraire si utile un helper explicite pour cellule Markdown ;
   - ajouter un test avec caractères spéciaux, `|`, backticks, CR/LF et contenu long.

### Critères d'acceptation

- Aucun code mort n'est conservé uniquement pour « corriger » une alerte.
- Si le script reste, la correction correspond à la donnée réellement produite.
- L'alerte est fermée par suppression légitime ou correction réelle, pas par masquage.
- Dans ce lot, le doublon `run-inventory.js` est supprimé et aucune alternative inutile n'est ajoutée.

### Constat de cette passe

- L'alerte `#614` `js/incomplete-sanitization` sur `scripts/cleanup/inventory.ts` est corrigée localement.
- Le tableau Markdown échappe désormais `\`, `|` et les retours ligne via `escapeMarkdownTableCell()`.
- Un test ciblé couvre les caractères sensibles `\`, `|`, backticks et les sauts de ligne.
- La sortie JSON du rapport reste inchangée.

---

## GHA-025 — Traiter les autres alertes CodeQL seulement si elles existent encore

**Priorité : P1/P2 selon sévérité distante**

### Objectif

Éviter les tâches fantômes issues d'anciens audits.

### Travail

À partir du snapshot `GHA-000`, traiter les alertes restantes dans cet ordre :

1. sécurité réelle / transfert de données / accès fichiers ;
2. injection, validation, sanitation ;
3. secrets et permissions ;
4. robustesse filesystem ;
5. qualité ;
6. variables inutilisées.

Pour chaque alerte :

```txt
numéro GitHub:
règle:
fichier courant:
ligne courante:
source du flux:
sink:
usage runtime ou maintenance:
sévérité:
décision: fix | delete dead code | dismiss with reason | keep open
validation:
```

### Règle stricte

Ne pas lancer une correction massive de toutes les notes `js/unused-local-variable` ou `js/unneeded-defensive-code` sans preuve de valeur. Traiter par petits lots ciblés, après les sujets de sécurité.

### Constat de cette passe

- L'alerte `#804` `js/clear-text-storage-of-sensitive-data` sur `apps/web/src/components/sections/rubriques/use-weather-data.ts` est corrigée localement.
- Le stockage persistant ne conserve plus les coordonnées GPS en clair; seules `label` et `subtitle` sont conservés dans `localStorage`.
- Les anciennes entrées sont réécrites sans coordonnées au prochain chargement.
- Un test ciblé couvre la migration et la suppression des champs sensibles.
- Le script historique `apps/web/scripts/sync-real-data-from-sheet.mjs` a été supprimé et sa mention de retrait reste documentaire.

### Constat complémentaire

- `scripts/export-clerk-users.mjs` a été durci dans ce lot: sortie bornée au workspace, suppression des champs `privateMetadata`, `unsafeMetadata`, `emailAddresses` et `raw`, et test Node direct de non-régression.
- Les alertes `#642` et `#643` restent à revalider côté GitHub après le prochain scan distant.
- `scripts/summarize-jsonl.mjs` et `scripts/cicd-metrics-report.mjs` échappent maintenant aussi `\\`, `|`, les backticks et les retours ligne dans leurs tableaux Markdown; les helpers ont été extraits et testés en import.
- `apps/web/scripts/sync-real-data-from-sheet.mjs` a été supprimé comme code mort et retiré de l'allowlist secrète locale.
- `apps/web/scripts/lib/sheet-ingestion-core.mjs` refuse maintenant de géocoder les entrées qui ne ressemblent pas à une vraie adresse ou un lieu.
- Le lot `file ↔ HTTP` sur `apps/web/scripts/lib/sheet-ingestion-core.mjs` reste classé comme flux de maintenance opt-in avec contrôle local renforcé des libellés.

### Constat de cette passe

- L'alerte `#278` `js/file-system-race` sur `scripts/pre-release-check.mjs` est corrigée localement.
- Le parcours récursif utilise maintenant `readdirSync(..., { withFileTypes: true })`, ce qui supprime la double vérification `readdirSync` + `statSync` sur les chemins déjà énumérés.
- Un test ciblé couvre l'exécution du check sur un arbre temporaire avec un fichier client sensible détecté une seule fois.
- La commande `node scripts/pre-release-check.mjs --exit-on-error` passe sur le checkout courant.
- Les alertes `#276` et `#277` `js/incomplete-sanitization` sur `scripts/cicd-metrics-report.mjs` et `scripts/summarize-jsonl.mjs` sont corrigées localement.
- Les sorties Markdown échappent désormais `\\`, `|`, les backticks et les sauts de ligne; les helpers sont exportés et couverts par des tests importables.
- L'alerte `#11` `js/http-to-file-access` sur `apps/web/scripts/sync-real-data-from-sheet.mjs` est traitée par suppression du script historique mort et retrait de l'allowlist associée.

---

# P1 — Vérifier les garanties CI sans les réécrire

## GHA-030 — Revalider la CI actuelle et bloquer les régressions

**Priorité : P1**  
**Risque : faible**

### Objectif

Vérifier que les garanties déjà corrigées sont toujours effectives. Ne modifier `.github/workflows/ci.yml` que si une régression réelle est trouvée.

### Vérifications obligatoires

Confirmer dans le workflow courant :

- `permissions: {}` au niveau global ;
- permissions minimales par job ;
- `security:secrets` non conditionné par `docs_only` ;
- `check:root-files` non conditionné par `docs_only` ;
- `check:doc-governance` non conditionné par `docs_only` ;
- `check:stack-doc-drift` non conditionné par `docs_only` ;
- `check:agent-skills` non conditionné par `docs_only` ;
- `npm ci` seulement pour les changements code ;
- typecheck, lint, tests et build web sur changements code ;
- `test:security` dans un job dédié ;
- typecheck du companion lorsque `companion-app/*` ou `ci.yml` change.

### CodeQL

Confirmer que `.github/workflows/codeql.yml` :

- s'exécute sur `push`, `pull_request` et schedule ;
- utilise `security-events: write` seulement dans le job d'analyse ;
- analyse `javascript-typescript` ;
- conserve les requêtes `security-extended,security-and-quality` sauf raison explicite.

### Validation locale

```bash
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills
```

Puis, seulement si le périmètre a modifié du code :

```bash
npm run checks:changed
```

### Critères d'acceptation

- Aucun chantier CI n'est créé si la couverture attendue existe déjà.
- Toute modification du workflow répond à une régression concrète.
- Les permissions GitHub Actions ne sont pas élargies.

---

# P2 — Protection de `main` et règles externes

## GHA-040 — Revalider la protection de `main`

**Priorité : P2**  
**Type : réglage externe au dépôt**

### Constat

La documentation historique indique `main non protégée`, mais cet état doit être revalidé via GitHub avant d'être traité comme actuel.

### Lecture seule

```bash
REPO="maxd4/CleanmyMap"

gh api "repos/$REPO/branches/main" --jq \
  '{name, protected, protection}'

gh api "repos/$REPO/rulesets"
```

### Si `main` est déjà protégée

- documenter la règle actuelle ;
- vérifier qu'elle n'impose pas de friction inutile à un mainteneur unique ;
- fermer l'item sans modification.

### Si `main` n'est pas protégée

Préparer une recommandation minimale :

- force-push interdit ;
- suppression de branche protégée interdite ;
- checks critiques requis seulement si leurs noms et stabilité sont confirmés ;
- pas d'obligation de revue à plusieurs personnes pour un projet solo ;
- conserver une procédure d'urgence administrateur documentée.

### Interdiction

Ne pas créer ou modifier un ruleset, une protection de branche ou un réglage GitHub sans autorisation explicite de l'utilisateur.

### Critères d'acceptation

- L'état `protected` vient de GitHub, pas d'un ancien Markdown.
- Les règles existantes sont décrites factuellement.
- Toute proposition reste proportionnée au workflow d'un mainteneur unique.

### Constat GitHub du 13 juillet 2026

- `main` répond `protected: false` et `protection.enabled: false`.
- `gh api "repos/maxd4/CleanmyMap/rulesets"` renvoie `[]`.
- Aucun réglage externe n'a été modifié.
- Cet état doit rester un fait observé, pas une hypothèse historique.

---

# P2 — Dependabot et secret scanning

## GHA-050 — Revalider les compteurs et la configuration

**Priorité : P2**

### Dependabot

Le dépôt possède actuellement trois blocs hebdomadaires :

- npm workspace racine ;
- npm `companion-app` ;
- GitHub Actions.

Ne pas dupliquer un bloc `apps/web` : le lockfile racine couvre déjà le workspace web.

### Travail

1. Relever le nombre exact d'alertes Dependabot ouvertes.
2. Vérifier les PR Dependabot ouvertes si elles existent.
3. Distinguer :
   - vulnérabilité ;
   - simple version update ;
   - incompatibilité de lockfile ;
   - dépendance transitive.
4. Ne pas lancer de mise à jour majeure automatique sans vérifier les impacts Next.js, React, Clerk, Supabase et TypeScript.

### Secret scanning

1. Relever le nombre exact d'alertes distantes accessibles.
2. Exécuter :

```bash
npm run security:secrets
```

3. Si GitHub et l'audit local divergent :
   - ne pas conclure qu'un outil est faux ;
   - comparer les règles, fichiers ignorés, historiques Git et secrets déjà révoqués.

### Critères d'acceptation

- Les compteurs sont datés et attachés à un SHA.
- Aucun secret n'est affiché dans le rapport final.
- Aucun secret réel n'est copié dans une issue, un Markdown ou la réponse Codex.

### Snapshot du 13 juillet 2026

- Dependabot ouvert : `9` alertes.
- PR Dependabot ouvertes : `5` (`#93`, `#92`, `#86`, `#85`, `#82`), toutes créées par `app/dependabot`.
- Alertes ouvertes identifiées : `js-yaml` (`2`), `undici` (`4`), `tar` (`1`), `@babel/core` (`1`), `ws` (`1`).
- Secret scanning distant accessible : `0`.
- `npm run security:secrets` : `OK`, `2284` fichiers scannés, aucune suspicion de secret.
- Aucun secret réel n'a été recopié dans le backlog ni dans la réponse Codex.

---

# P3 — Mettre à jour la documentation seulement après les faits

## GHA-060 — Réécrire le snapshot documentaire final

**Priorité : P3**

### Fichier cible

```txt
documentation/security/github-audit-backlog.md
```

### Travail

Après `GHA-000` à `GHA-050`, mettre à jour le document avec :

```txt
date
commit SHA local
commit SHA main distant
Dependabot open count
Code scanning open count
Secret scanning open count
branch protection state
rulesets présents
alertes encore ouvertes avec règle + chemin
alertes corrigées dans ce lot
éléments non accessibles
```

### Règles

- Ne pas conserver une alerte historique dans la section active si elle est fermée ou si le fichier n'existe plus.
- Conserver une courte section historique seulement lorsqu'elle évite de rouvrir un ancien chantier.
- Ne pas recopier les longs détails d'un audit transversal dans ce backlog.
- Ne pas prétendre que GitHub est sain si certains endpoints étaient inaccessibles.

### Snapshot final du 13 juillet 2026

- Date : `13 juillet 2026`.
- SHA local : `8666d8eb8e4f309fd518aea8b5321fa2f29af9d2`.
- SHA `main` distant : `8666d8eb8e4f309fd518aea8b5321fa2f29af9d2`.
- Dependabot open count : `9`.
- Code scanning open count : `31`, dont `1` alerte de sévérité `error` encore visible à ce snapshot.
- Secret scanning open count : `0`.
- Branch protection state : `main.protected = false`, `protection.enabled = false`.
- Rulesets présents : `[]`.
- Alertes encore ouvertes avec règle + chemin :
  - `#804` `js/clear-text-storage-of-sensitive-data` — `apps/web/src/components/sections/rubriques/use-weather-data.ts`
  - `#614` `js/incomplete-sanitization` — `scripts/cleanup/inventory.ts`
  - `#278` `js/file-system-race` — `scripts/pre-release-check.mjs`
  - `#277` `js/incomplete-sanitization` — `scripts/summarize-jsonl.mjs`
  - `#276` `js/incomplete-sanitization` — `scripts/cicd-metrics-report.mjs`
  - `#107` `js/file-system-race` — `scripts/generate-modularization-report.mjs`
  - `#106` `js/file-system-race` — `scripts/analyze-heavy-files.mjs`
- Alertes corrigées dans ce lot :
  - `#804` corrigée localement par migration du stockage météo hors coordonnées sensibles.
  - `#614` corrigée localement par échappement Markdown des cellules d'inventaire.
  - `#278`, `#277`, `#276`, `#107`, `#106` corrigées localement par durcissement des scripts et suppression des courses TOCTOU.
  - `#668` et `#810` rejetées sur GitHub après suppression des fichiers morts `split.js` et `backpressure-feedback.tsx`.
  - Alertes historiques supprimées ou rejetées sur GitHub : `#7`, `#8`, `#9`, `#10`, `#11`, `#44`, `#45`, `#615`, `#640`, `#642`, `#643`, `#782`, `#783`, `#797`, `#798`, `#799`, `#800`, `#801`.
- Éléments non accessibles : aucun.

---

# Ordre d'exécution recommandé

1. `GHA-000` — snapshot distant exact.
2. `GHA-010` — géocodage fichier → HTTP, uniquement si l'alerte existe encore.
3. `GHA-020` — supprimer ou corriger `run-inventory.js`, selon usage réel.
4. `GHA-025` — autres alertes réellement ouvertes, par priorité.
5. `GHA-030` — vérifier les garanties CI déjà en place.
6. `GHA-040` — revalider `main`, sans modifier les réglages sans autorisation.
7. `GHA-050` — Dependabot et secret scanning.
8. `GHA-060` — mise à jour documentaire finale.

Après chaque correction CodeQL, recharger la liste distante avant de passer à l'alerte suivante lorsque c'est possible.

# Non-objectifs

Ne pas :

- réécrire toute la CI déjà corrigée ;
- traiter une ancienne alerte uniquement parce qu'elle existe dans un Markdown ;
- lancer un nettoyage massif de variables inutilisées ;
- modifier la protection de `main` sans autorisation ;
- créer une PR, branche ou push par défaut ;
- révéler un secret dans les logs ou le rapport final ;
- désactiver CodeQL, Dependabot ou le secret scanning pour obtenir un état vert ;
- élargir les permissions GitHub Actions sans nécessité démontrée.

# Validation finale

Exécuter au minimum :

```bash
npm run security:secrets
npm run check:root-files
npm run check:doc-governance
npm run check:stack-doc-drift
npm run check:agent-skills
```

Si du code applicatif ou des scripts ont été modifiés :

```bash
npm run checks:changed
```

Si seul le Markdown final a changé, ne pas lancer inutilement build, lint et tests complets.

# Rapport final attendu de Codex

La réponse finale doit indiquer :

- commit local et commit distant inspectés ;
- compteurs GitHub obtenus ;
- endpoints GitHub non accessibles, le cas échéant ;
- alertes CodeQL réellement ouvertes au départ ;
- alertes corrigées, supprimées avec code mort ou rejetées avec justification ;
- fichiers modifiés ;
- état de `main` ;
- réglages externes laissés inchangés faute d'autorisation ;
- validations réellement exécutées ;
- erreurs rencontrées ;
- risques restant ouverts.

Ne jamais annoncer `0 alerte` sans requête distante réussie correspondante.
