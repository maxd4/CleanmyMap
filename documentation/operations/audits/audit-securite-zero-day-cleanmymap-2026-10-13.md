# CleanMyMap : audit de sécurité ciblé sur les vulnérabilités inconnues et les angles morts

**Statut : AUDIT / SNAPSHOT, non normatif**
**Date : 13 octobre 2026 (Europe/Paris)**
**Référence : `maxd4/CleanmyMap`, `main` = `dc10adf8dafbd046bb6cf5a3eeca3f07c6803b50`**
**Nature : revue statique sélective + consultation de contrôles GitHub Actions + diagnostics Supabase en lecture seule + recoupement d'avis publics.**

## 1. Portée et terminologie

Une vulnérabilité *zero-day* n'est pas détectable de manière exhaustive par un scanner. La revue cherche des vulnérabilités applicatives jusque-là non identifiées, des vulnérabilités de dépendances connues et des lacunes de détection. Aucune exploitation du site de production ni fuzzing destructif n'a été menée. Aucun exploit, accès non autorisé ou compromission n'a été démontré. **Conclusion : ZERO_DAY_CONFIRMED = 0 ; ZERO_DAY_ABSENCE_PROVEN = no.**

L'inventaire du dépôt a été consulté via GitHub ; les points suivants ont été relus : configurations de sécurité et de CI, dépendances principales, API sensibles (notamment Stripe, chat, accès d'équipe SPOGOMI, médias, cartes et rate limiting), gouvernance SQL, contrôles CodeQL/Semgrep/ZAP, sources documentaires canoniques et diagnostics PostgreSQL. Cette revue n'est pas une revue ligne par ligne de l'intégralité des fichiers.

## 2. Résultats vérifiés

| Référence | Observation | Portée de la preuve |
|---|---|---|
| `apps/web/package.json`, `package-lock.json` | `next@16.3.8` et `react@19.2.3` déclarés/résolus | Code versionné, pas preuve du déploiement actif |
| Advisories Next.js d'octobre 2026 | Les CVE-2026-94483, 94484, 94485 et 94544 sont corrigées par `16.3.8` | Versions déclarées compatibles avec le correctif ; pas de CVE persistante prouvée |
| React Server Components | Avis GHSA-wx67-qw84-cm4g : `react-server-dom-*` versions < `19.2.8` affectées ; `react@19.2.3` n'est pas une preuve que le package RSC vulnérable est installé | Vérifier code RSC réellement embarqué par `next@16.3.8`, bundle et parcours affectés |
| Run GitHub Actions 38314482299 | CodeQL `success` sur le SHA audité | Le job a réussi, sans garantie d'absence d'alerte ou d'une zero-day |
| Run GitHub Actions 38314482203 | `dependency-audit`, `secret-audit`, `web-build`, `web-static`, `mobile-validation` : `success` ; `ci` : `failure` dans `web-tests` | État CI réel du SHA, non preuve de production |
| Logs `web-tests` | 3 tests de `vercel-regression-gates.test.ts` échouent : inventaire routes, justification `force-dynamic`, justification `no-store` ; groupe `security` : 15 fichiers réussis | Régression de garde CI, non faille de sécurité démontrée |
| Supabase Advisors security, projet lié actif | Un groupe `INFO` « RLS Enabled No Policy » avec 21 constats ; aucun `WARN` / `ERROR` retourné | À qualifier selon tables exclusivement serveur ; « pas de policy » peut être voulu |
| PostgreSQL lecture seule | 0 table `public` sans RLS ; 0 table `public` accessible en lecture client sans RLS ; 0 vue/matview `public` lisible par `anon` ou `authenticated` ; 0 routine `SECURITY DEFINER` de `public` exécutable par ces rôles | Contrôle de surface des privilèges, pas un test complet des policies ou des API avec `service_role` |
| Historique Supabase | Migration `20261012000021_spogomi_certificate_reissue_concurrency` présente dans la liste distante | Présence dans l'historique, pas un test concurrent exécuté |

**Documentation de référence :**

- GitHub : https://github.com/maxd4/CleanmyMap/tree/dc10adf8dafbd046bb6cf5a3eeca3f07c6803b50
- CodeQL : https://github.com/maxd4/CleanmyMap/actions/runs/38314482299
- CI : https://github.com/maxd4/CleanmyMap/actions/runs/38314482203
- Next.js : https://nvd.nist.gov/vuln/detail/CVE-2026-94483 ; https://nvd.nist.gov/vuln/detail/CVE-2026-94544
- React RSC : https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g
- Supabase Advisor : https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## 3. Findings ouverts, par priorité

### SEC-01 [P1 : résilience anti-abus] Rate limiting distribué dégradé vers un compteur local

**Fait :** `apps/web/src/lib/rate-limit/server.ts` bascule volontairement sur `checkRateLimit` en mémoire lorsque Upstash est indisponible ou dépasse 1 seconde. `apps/web/src/lib/rate-limit/store.ts` confirme le caractère local à un processus. Sur une application à instances multiples, ce fallback ne conserve pas l'invariant de quota global. Il est déjà testé comme un comportement attendu dans `server.test.ts`.

**Risque :** surconsommation ou abus des routes coûteuses lors de la dégradation du fournisseur ; exposition réelle conditionnée à la panne, au scaling et aux garde-fous en amont. **Aucune attaque constatée.**

**Décision :** classifier les routes par risque : conserver le fallback local pour les lectures publiques à faible coût ; pour les mutations sensibles, l'émission de tokens, uploads ou appels payants, définir explicitement `FAIL_CLOSED` ou un quota de secours robuste, avec réponse 503/429 appropriée. Préserver les protections de l'infrastructure et documenter le budget de panne. Tests du mode dégradé multi-instance simulé.

### SEC-02 [P1 : couverture] DAST et analyse des workflows non bloquants

**Fait :** `.github/workflows/dast-zap-baseline.yml` emploie `fail_action: false` et `-I` ; le scan est strictement passif et public. `.github/workflows/zizmor.yml` utilise `continue-on-error: true`. Ces choix sont **intentionnels et déjà documentés** dans `documentation/security/dast-zap-baseline.md` et `documentation/security/SECURITY.md`.

**Risque :** un signal important peut rester consultable sans empêcher une release. Ce n'est pas un contournement ni une vulnérabilité prouvée.

**Décision :** préserver la lane passive de production ; établir une revue structurée des rapports et, si besoin, une nouvelle lane bloquante pour findings déterministes, après baseline justifiée. Lancer les tests actifs uniquement sur environnement isolé, jamais sur production ou données utilisateurs.

### SEC-03 [P2 : défense XSS] CSP seulement en Report-Only

**Fait :** `apps/web/next.config.ts` ajoute `Content-Security-Policy-Report-Only`, dérivée de `apps/web/src/lib/security/csp.ts`, avec notamment `script-src 'unsafe-inline'`. La dette est connue dans `documentation/security/csp.md` et `documentation/security/dast-zap-baseline.md`.

**Risque :** le navigateur n'applique pas cette CSP pour bloquer une injection ; le vrai risque XSS dépend de l'existence préalable d'un point d'injection. **XSS non démontrée.**

**Décision :** programme progressif vers une CSP enforce avec nonces/hashes compatibles Next/Clerk, tests Playwright, collecte de violations avant bascule ; ne pas activer une politique cassant l'authentification ni ajouter un second moteur CSP.

### SEC-04 [P2 : confidentialité] Source maps navigateur produites en production

**Fait :** `productionBrowserSourceMaps: true` dans `apps/web/next.config.ts`. `apps/web/scripts/upload-sentry-sourcemaps.mjs` et `documentation/operations/services-stack.md` prévoient l'upload à Sentry et, dans certains contextes, la conservation des `.map` sur le filesystem de build.

**Risque :** si les fichiers `.map` sont servis publiquement, ils facilitent la rétro-ingénierie et peuvent révéler du contexte non nécessaire ; **la disponibilité publique des maps n'a pas été testée** et ce n'est pas, en soi, une exécution de code ni une fuite de secrets démontrée.

**Décision :** vérifier un déploiement Vercel identifié par SHA, l'URL effective de maps et leur visibilité, sans scan agressif ; conserver les symbolications Sentry tout en évitant les artefacts publics inutiles. Ne pas désactiver brutalement le paramètre sans tester l'upload Sentry.

### SEC-05 [P2 : dépendances et supply-chain] RSC, pinning et backports locaux

**Fait :** `next@16.3.8`, `react@19.2.3`, applications mobile et web, ainsi que plusieurs composants vendored (`braces`, `image-size`, `node-forge`, `stream-json`) documentés avec backports et tests locaux. L'audit npm ciblé de CI est passé ; les avis du domaine RSC concernent des distributions qui peuvent être embarquées par Next et ne se déduisent pas de la seule version du package `react`.

**Risque :** dérive de patches manuels et couverture imparfaite du code vendored ; le risque d'une CVE RSC effectivement présente reste **non prouvé**.

**Décision :** tracer le graphe installé effectif, y compris les bundles de framework, confronter les avis officiels, vérifier les diffs des backports avec les patches sources, produire un SBOM et des tests ciblés. Mettre à jour uniquement les packages réellement affectés après preuve de compatibilité. Ne pas supprimer les backports sans équivalent upstream.

### SEC-06 [P2 : liens d'accès] Tokens SPOGOMI dans une URL de partage

**Fait :** `apps/web/src/lib/spogomi/team-access.ts` produit des tokens aléatoires de 32 octets, hashés en base ; les grants expirent après 14 jours et les sessions après 12 heures. `apps/web/src/app/api/spogomi/team-access/route.ts` échange un token transmis dans les paramètres de l'URL contre un cookie `HttpOnly`, `SameSite=Lax`, avec `Referrer-Policy: no-referrer` sur la redirection.

**Risque :** tout détenteur du lien peut demander une session tant que le grant est valide ; c'est en partie le contrat fonctionnel d'un lien de partage, pas un contournement découvert. La diffusion involontaire par historique, logs ou outils tiers est **à examiner**. L'absence de consommation « one-time » peut être voulue pour plusieurs équipiers.

**Décision :** clarifier et documenter le modèle de possession du lien et sa période de validité, auditer l'exposition des URLs dans observabilité/analytics/referrer et vérifier les cas révocation, rotation et sessions concurrentes. Ne pas imposer l'usage unique si cela empêche le partage prévu.

### SEC-07 [P2 : CI] Baseline de tests de régression Vercel rouge

**Fait :** échecs réels du run GitHub `38314482203` : 153 routes constatées contre 149 attendues, justification absente sur `gallery/route.ts` (`force-dynamic`) et `certificates/[certificateReference]/route.ts` (`no-store`).

**Risque :** le signal « CI verte » n'est pas disponible sur le SHA, ce qui diminue la confiance dans les validations complémentaires. **Non classé comme faille exploitable.**

**Décision :** corriger les écarts du gate sans en diminuer la sévérité ; identifier les nouvelles routes puis mettre à jour la baseline avec justification, et documenter correctement les choix de cache. Tester avant publication.

## 4. Protections démontrées et non-findings

- Endpoint Stripe : contrôle de signature avec `stripe.webhooks.constructEvent` avant application des RPC ; aucune absence de vérification découverte dans la route inspectée.
- Auth mobile : `requireMobileAuthenticatedAccess` utilise `authenticateRequest` Clerk avec `acceptsToken: 'session_token'` ; le contrôle d'identité est explicite dans le helper examiné.
- Supabase : toutes les tables ordinaires `public` contrôlées avaient RLS, les fonctions `SECURITY DEFINER` de `public` n'étaient pas exécutable directement par `anon` ou `authenticated` et les vues publiques n'étaient pas directement lisibles selon les privilèges observés. Cela ne démontre pas que tous les handlers utilisant `service_role` sont sûrs.
- Upload signalement : bucket privé avec `file_size_limit` 5 Mio et allowlist MIME JPEG/PNG/WebP, contraintes SQL, contrôle du statut `ready` ; la simple lecture du service n'établit pas une vulnérabilité d'upload.
- Aucun nouveau service Redis ou WAF à installer par défaut : Upstash, Cloud/Vercel et les outils GitHub existants sont à exploiter avant de créer une deuxième architecture.

## 5. Tests utiles pour la recherche de vulnérabilités non connues

### 5.1 Surfaces à valider en priorité

1. Contrôles BOLA/IDOR et privilèges sur les API `actions`, `chat`, `spogomi`, `mobile`, `signalements`, `admin`, `reports` : anonyme, propriétaire, autre compte, admin, scope différent et état révoqué.
2. Tests de confusions d'identités entre cookie Clerk, Bearer natif et session d'équipe ; aucun contexte privilégié hérité implicitement.
3. Fuzzing borné des schémas JSON, import CSV/XLSX, GPX/GeoJSON et uploads images ; limites de taille, quantité, profondeur, temps CPU, échecs de parsing ; jamais contre la production.
4. Revue de sécurité SQL `SECURITY DEFINER`, politiques RLS effectives, signature et idempotence webhook, réutilisation des URLs signées, injection XSS de la messagerie et métadonnées externes.
5. Vérification de fraîcheur AuthZ et caches privés, notamment après logout, changement d'identité ou révocation d'accès.
6. Tests de résistance aux indisponibilités Upstash, Supabase, Clerk et Storage en environnement éphémère ; pas de fail-open sur opérations sensibles.

### 5.2 Outils et stratégie

- **Déjà installés :** CodeQL, Semgrep, `npm audit` avec gouvernance de backports, Secret Audit, OWASP ZAP Baseline, zizmor, OpenSSF Scorecard, Vitest, Playwright, Supabase éphémère CI.
- **À ajouter seulement si justifié :** tests property-based/fuzzing réutilisables pour les parseurs publics ; rapport SBOM CycloneDX via outil de l'écosystème npm ; une lane active ZAP sur preview isolée si elle peut être authentifiée sans secrets production.
- **Ne pas installer :** Docker/WSL local ni nouveau moteur de validation redondant ; la CI éphémère existante est le runtime DB autorisé.
- **Gestion des findings :** garder les détails exploitables hors du dépôt public tant qu'ils ne sont pas corrigés. Reporter la synthèse sécurisée dans `documentation/security/` et les preuves datées dans `documentation/operations/audits/` après qualification.

## 6. Ordre d'exécution proposé

1. **P1 :** preuve et traitement du mode dégradé du rate limiting sur endpoints sensibles ; tests de non-régression.
2. **P1 :** qualification des résultats de scan non bloquants et matrice de validation AuthZ/IDOR avec tests réels, limitée aux propriétaires existants.
3. **P2 :** vérification RSC installé et politique de dépendances/backports ; ne pas inventer de CVE active.
4. **P2 :** CSP enforce progressive, exposition réelle des maps Sentry et modèle des grants SPOGOMI.
5. **Hygiène parallèle :** rétablir les trois tests de régression Vercel sans assouplir les contrats.

## 7. Limitations

- **ZERO_DAY_CONFIRMED : 0** ; **ZERO_DAY_ABSENCE_PROVEN : no**.
- **DEPENDABOT_OPEN_ALERTS : unknown** ; **CODE_SCANNING_OPEN_ALERTS : unknown** ; **SECRET_SCANNING_OPEN_ALERTS : unknown** : connecteur GitHub n'autorise pas la lecture des endpoints d'alertes privées, ce qui n'autorise pas à conclure qu'elles sont vides.
- **CI_CODEQL_LATEST_SHA : success** ; **CI_SECURITY_GROUP : success** ; **CI_GLOBAL : failure (regression gates)**.
- **SUPABASE_LOG_QUERY_USED : no** ; **MUTATION_DB : no** ; **WEB_ACTIVE_SCAN : no** ; **TESTS_LOCAUX_EXECUTED : no** ; **PRODUCTION_PROOF : no**.
- Les advisors et les requêtes système PostgreSQL attestent uniquement leur résultat ponctuel. Ils ne prouvent ni chaque combinaison des policies RLS, ni la sécurité des routes HTTP, ni l'intégrité des données privées.

**Conclusion :** aucune zero-day exploitable n'a été démontrée. La priorité utile est la preuve comportementale sur les frontières critiques et la réduction des angles morts des contrôles existants, sans inventer de nouvelles abstractions ni traiter les findings informatifs comme des vulnérabilités.
