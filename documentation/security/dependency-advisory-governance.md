# Gouvernance des advisories de dépendance

## Périmètre

Cette gouvernance couvre les advisories de dépendance explicitement traitées
dans le graphe de `apps/mobile`. Elle ne constitue pas une exception globale de
package, de niveau de sévérité ou de scanner.

| Advisory | CVE | Package utilisé dans `apps/mobile` | Chemin transitif | Correctif couvert |
| --- | --- | --- | --- | --- |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | CVE-2025-71330 | `apps/mobile/vendor/image-size` `2.0.3` | `@expo/metro` → `metro` → `image-size` | Rejet des entrées ICNS trop courtes, hors limites ou non progressives |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | CVE-2025-71329 | `apps/mobile/vendor/image-size` `2.0.3` | `react-native` → `@react-native/community-cli-plugin` → `metro` → `image-size` | Conservation de la garde de progression des boîtes JXL/HEIF de taille nulle |
| [GHSA-528h-pc64-c93x](https://github.com/advisories/GHSA-528h-pc64-c93x) | CVE-2026-71429 | `apps/mobile/vendor/stream-json` `1.9.1` | `@clerk/expo` → `@clerk/clerk-js` → `@solana/wallet-adapter-base` → `@solana/web3.js@1.99.0` → `jayson@4.3.0` → `stream-json` | Backport CommonJS borné à `StreamValues` et `Verifier`, sans surface de filtres JSON |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | CVE-2026-85393 | `apps/mobile/vendor/node-forge` `1.4.0` | `expo@57.0.22` → `@expo/cli@57.0.24` → `node-forge`, et `@expo/code-signing-certificates@0.0.6` → `node-forge` | Backport du contrôle du nombre d'enfants de `DigestAlgorithm` depuis `forge#1152` (`ceba344...`) |
| [GHSA-VFJ7-8CJW-P6XM](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | CVE-2026-93687 | `apps/mobile/vendor/braces` `3.0.4` | `micromatch@4.0.8` → `braces` dans Metro et l'outillage ESLint | Backport borné de profondeur de parsing ; voir `apps/mobile/vendor/braces/SECURITY-PATCH.md` |

## Mitigation effectivement versionnée

`image-size@2.0.3` est un package local CleanMyMap basé sur le code publié de
`image-size@1.2.1`. Ce package n'est pas une release npm upstream : sa version
`2.0.3` sert à rendre le backport explicite pour le lockfile et les outils
d'advisories.

Les deux correctifs sont documentés dans
`apps/mobile/vendor/image-size/SECURITY-PATCH.md` et vérifiés par
`apps/mobile/security/image-size-security.test.mjs`. Le lockfile résout le
package local `vendor/image-size` en version `2.0.3`.

Les overrides Metro de `package.json` redirigent les deux résolutions utilisées
par l'application mobile :

- `metro@0.84.5` vers le package local `vendor/image-size` ;
- `metro@0.87.0` vers le package local `vendor/image-size`.

Cette mitigation remplace l'ancienne acceptation de risque. Il n'y a donc plus
de date d'expiration ni de renouvellement périodique à maintenir
pour cette décision locale. Dependabot et CodeQL restent actifs, et le dépôt
exécute désormais le contrôle de dépendances lorsqu'un changement touche le
graphe npm, le contrôleur d'audit, sa politique ou sa preuve. Le job exécute
d'abord `node --test scripts/security/audit-dependencies.test.mjs`, puis le
gate reproductible `npm run security:dependencies`, qui lance exactement
`npm audit --json` et refuse toute vulnérabilité `High` ou `Critical` qui ne
correspond pas à une mitigation exacte. Un contrôle non pertinent produit
`SKIPPED_BY_SCOPE` avec la raison `dependency graph and dependency-audit
control unchanged`, jamais `PASS`. Il n'existe ni ignore global, ni exception
par package, ni exception par niveau de sévérité.

Le champ diagnostique `RUNTIME_SCOPE` est dérivé du graphe `packages` du
`package-lock.json`. Il suit les `dependencies` et `optionalDependencies` des
workspaces réels `apps/web` et `apps/mobile`, puis distingue
`WEB_RUNTIME`, `MOBILE_RUNTIME`, leur combinaison, `DEV_BUILD_ONLY` lorsqu'une
chaîne n'est atteignable que depuis les devDependencies connues, et
`UNCLASSIFIED` lorsqu'aucune reachability n'est démontrée. Cette classification
ne modifie jamais l'enforcement : tout High/Critical non couvert par une
mitigation exacte reste bloquant.

Les exceptions du gate sont limitées aux quatre lignes du registre versionné dans
`scripts/security/audit-dependencies.mjs`. Chaque ligne doit matcher exactement
l'advisory, le package, la version et le chemin résolu, et référence cette
documentation ainsi que le test de sécurité du backport. Une alerte qui ne
correspond pas à ces quatre éléments reste bloquante, y compris lorsqu'elle
concerne un package vendorisé. Le gate peut donc rester en échec si le graphe
contient une alerte High/Critical non mitigée ; aucune baseline ne la ratifie.

## Mitigation `braces` sans release upstream

Le diagnostic peut relayer plusieurs parents (`@clerk/expo`, Expo, Metro,
React Native et `eslint-config-next`) alors que l'advisory racine est
`[GHSA-VFJ7-8CJW-P6XM](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)` /
`CVE-2026-93687` sur `braces@3.0.3`. La chaîne historique passe notamment par
`micromatch@4.0.8` puis `braces@3.0.4` dans Metro et `fast-glob` dans l'outillage
ESLint Web.

L'advisory upstream indique que les versions `braces <= 3.0.3` sont affectées
et qu'aucune version corrigée n'est publiée. Le suivi mainteneur est conservé
dans [micromatch/braces#70](https://github.com/micromatch/braces/issues/70).
Le graphe actuel atteint le backport local depuis `apps/mobile` via
Expo/Metro et depuis l'outillage Web via `fast-glob`. Le package local `3.0.4`
conserve l'API upstream et ajoute uniquement une garde de profondeur de parsing
à 1000 niveaux ; sa provenance, sa justification et sa preuve sont versionnées
dans `apps/mobile/vendor/braces/SECURITY-PATCH.md`. La mitigation est couverte exactement
par le registre de `scripts/security/audit-dependencies.mjs` et ne constitue
ni un ignore ni une réduction de l'audit.

La mitigation ne rend pas fiable un asset spécialement forgé par lui-même :
Aucun asset non fiable ne doit entrer dans un build Metro. Les assets d'un
build doivent provenir du dépôt contrôlé ou d'une source vérifiée avant
exécution de Metro.

## Mitigation `node-forge` du graphe Expo

Le package local `apps/mobile/vendor/node-forge` part exactement du tarball
publié `node-forge@1.4.0`. Il conserve sa licence, son identité et sa
provenance upstream, mais ne contient que `package.json`, `LICENSE`, ce
document et les 42 fichiers `lib/*.js` atteignables depuis l'entrée Node
consommée par les deux packages Expo. Les tests, exemples, documentation,
benchmarks, artefacts de build et modules runtime non atteignables sont exclus
du vendor reproductible.

Le seul changement de code est le contrôle de la cardinalité de la séquence
nichée `DigestAlgorithm`, repris du commit upstream
`ceba34402e329f0365134f23fe19898756527d65` de `digitalbazaar/forge#1152`.
`apps/mobile/security/node-forge-security.test.mjs` vérifie le vecteur RSA
forgé : la copie exacte vulnérable de `1.4.0` l'accepte, tandis que le
backport la rejette, puis exerce les fonctions node-forge réellement appelées
par `@expo/code-signing-certificates`.

Les overrides sont limités à `@expo/cli` et
`@expo/code-signing-certificates`; aucun override global `node-forge` n'est
autorisé. Le lockfile doit continuer à résoudre ces deux chemins vers le
vendor local. CleanMyMap ne déclare actuellement ni `codeSigningCertificate`,
ni `codeSigningMetadata`, ni `expo-updates` : cette mitigation protège le
tooling Expo et ne constitue pas une affirmation d'exposition du runtime
public.

### CodeQL `js/missing-origin-check` : alertes #938 et #939

Les alertes CodeQL #938 (`lib/prng.js`) et #939 (`lib/util.js`) sont classées
`FALSE_POSITIVE` pour le contexte précis du vendor `node-forge` :

- #938 est dans la branche `registerWorker` où `worker === self`. Le listener
  signalé est le canal de protocole du worker ; la branche principale reçoit
  les messages via l'objet `Worker`, pas via un listener `window` acceptant des
  messages inter-fenêtres arbitraires.
- #939 se trouve dans le script Blob exécuté par `new Worker(blobUrl)`. Son
  `self.addEventListener('message', ...)` appartient donc à un
  `DedicatedWorkerGlobalScope`. Le thread principal ne reçoit ensuite que via
  les objets `Worker` créés pour ce calcul.

Le listener `window` distinct utilisé par le polyfill `setImmediate` vérifie
`event.source === window` et un token interne exact ; il n'est pas le sink des
deux alertes. Le graphe local résout par ailleurs le package uniquement pour
`@expo/cli` et `@expo/code-signing-certificates`, sans dépendance runtime ou
browser de l'application mobile. Cette décision est spécifique au canal
Dedicated Worker et au Node tooling Expo : elle ne crée aucune exclusion
globale CodeQL et ne justifie aucune modification du code upstream vendorisé.

### CodeQL `js/polynomial-redos` : correctif du parseur PEM

Les trois alertes High de `lib/pem.js` sont traitées par un backport local :
les bornes BEGIN/END sont maintenant recherchées par parcours de marqueurs et
le type, les headers et le body sont validés séparément. La regex à
quantificateurs imbriqués et backreference a été supprimée ; le test de
marqueur malformé de grande taille est dans
`apps/mobile/security/node-forge-security.test.mjs`.

La vérification upstream du 2026-10-02 n'a trouvé ni release npm corrigée, ni
commit/PR revu, ni issue/advisory upstream correspondant à ces regex PEM.
`node-forge@1.4.0` reste la release npm `latest` compatible avec le graphe
Expo. La comparaison upstream `v1.4.0`
(`2ae172f7cda6831b358c3fc111f4f3e1781782b2`) → `main`
(`723240415b25120d47146f982809fa69344ab890`) ne modifie pas `lib/pem.js`.
Le détail de provenance et des APIs Expo est conservé dans
`apps/mobile/vendor/node-forge/SECURITY-PATCH.md`.

La frontière CURRENT ne fournit pas d'entrée non fiable à `pem.decode` : les
APIs PEM d'Expo sont présentes pour le tooling, mais CleanMyMap n'active ni
`updates.codeSigningCertificate` ni `updates.codeSigningMetadata`, et aucun
`extra.eas.projectId` n'est versionné dans le mobile tant que le rattachement
à un projet Expo réel n'a pas été effectué. Cette absence de consumer ne sert
pas de justification de conservation de l'alerte : le correctif local est
versionné et testé.

## Compatibilité `jayson` et CVE-2026-71429

Le graphe mobile réel est :

```text
@clerk/expo
→ @clerk/clerk-js
→ @solana/wallet-adapter-base
→ @solana/web3.js@1.99.0
→ jayson@4.3.0
→ stream-json ^1.9.1
```

`jayson@4.3.0` utilise les chemins CommonJS historiques
`stream-json/streamers/StreamValues` et `stream-json/utils/Verifier`, puis
appelle `StreamValues.withParser()` pour lire un flux JSON-RPC. Le
`stream-json@3.6.0` upstream n'est pas un remplacement compatible : son
entrée est ESM et ses chemins publics sont différents. L'override global
`stream-json` a donc été supprimé.

`apps/mobile/vendor/stream-json` est un backport CleanMyMap versionné sous le
nom `stream-json` et la version de contrat `1.9.1` afin de satisfaire la plage
`^1.9.1` de `jayson`. Il ne prétend pas être le code upstream
`stream-json@3.6.0`.

La provenance upstream réellement conservée est limitée aux modules
nécessaires au contrat historique :

- le parseur incrémental `Parser` et son support UTF-8 ;
- `Assembler`, `StreamBase` et `streamers/StreamValues` ;
- `utils/Verifier` ;
- `utils/withParser` et le pipeline compatible `stream-chain@2.2.5`.

Le package CleanMyMap conserve les licences BSD-3-Clause correspondantes, mais
exclut volontairement toute la surface de filtres JSON concernée par
CVE-2026-71429. Les modules de filtres `pick`, `ignore`, `filter` et `replace`
ne sont ni embarqués ni résolubles. Il n'y a aucun override global et la
redirection reste limitée à `jayson@4.3.0`.

La redirection est strictement scoped à `jayson@4.3.0` dans `package.json` :

```json
"jayson@4.3.0": {
  "stream-json": "file:apps/mobile/vendor/stream-json"
}
```

La garantie de streaming incrémental est vérifiée par
`apps/mobile/security/stream-json-jayson-security.test.mjs`, qui couvre le
chargement de `jayson`, les deux imports profonds, l'émission incrémentale
d'une valeur complète, plusieurs valeurs sur un flux ouvert, un JSON
fragmenté, l'absence de callback avant complétion, l'erreur JSON invalide, un
échange JSON-RPC minimal via `jayson.Utils.parseStream()` et l'absence des
modules de filtres exclus. Une requête complète ou fragmentée est émise dès
qu'elle est complète, sans attendre EOF ; plusieurs requêtes successives sont
émises dans l'ordre sur une connexion persistante.
La chaîne effective doit rester vérifiable avec
`npm ls jayson stream-json @solana/web3.js`; aucun contrat fonctionnel de
Clerk, Supabase ou Solana n'est modifié et ce lot ne migre pas vers
`@solana/kit`.

`npm audit` conserve un signal attendu sur le nom et la version de contrat
`stream-json@1.9.1` : le scanner ne peut pas inspecter le contenu du package
local ni déduire que les filtres concernés ont été retirés. Ce signal n'est pas
ignoré globalement ; il est contrôlé par le test de surface local ci-dessus et
doit rester visible jusqu'à la suppression de la mitigation ou à la prise en
charge explicite de ce backport par le scanner.

## Conditions de retrait — `node-forge`

Le vendor `node-forge` et ses deux overrides ne pourront être retirés que
lorsqu'une release upstream publiée contenant le correctif de
`GHSA-86w9-cpqp-85rv` / `CVE-2026-85393` sera disponible et compatible avec
`@expo/cli@57.0.24` et `@expo/code-signing-certificates@0.0.6` (ou avec les
versions Expo alors supportées). Le retrait exige la vérification de l'arbre
réel, la régénération du lockfile et le succès du test RSA, des validations
mobile, de `npm audit` et de `npm run check:lockfile-policy`. Sans cette
preuve, le backport reste versionné ; aucune mise à jour majeure d'Expo ne
constitue une condition implicite de retrait.

## Conditions de retrait — `image-size`

Le vendor et les overrides `image-size` ne pourront être retirés que lorsqu'une
release upstream `image-size` contenant les deux correctifs sera publiée et
validée. La version contenant les deux correctifs devra être compatible avec le
graphe Expo/React Native/Metro de l'application mobile. À ce moment seulement,
le dépôt devra revenir à cette release officielle, régénérer le lockfile et
supprimer le backport local après validation ciblée.

## Conditions de retrait — `stream-json`

Le package local et son override scoped ne pourront être retirés que si
`jayson` cesse d'exiger les deux chemins CommonJS historiques, ou si une
release upstream compatible les préserve tout en corrigeant l'advisory et en
garantissant le même streaming incrémental. Le retrait exige alors une preuve
de l'arbre exact, la régénération du lockfile et le succès du test de
compatibilité, de `npm audit` et de `npm run check:lockfile-policy`. Si cette
preuve n'est pas disponible, la mitigation `stream-json` reste en place.

L'état de cette mitigation dans le dépôt ne préjuge pas de l'état affiché par
Dependabot côté GitHub. Une alerte peut rester visible jusqu'à l'actualisation
du graphe ou du scanner GitHub, même si le runtime versionné utilise déjà le
backport local.

## Surfaces non concernées

- `apps/web` n'est pas concerné : `image-size` n'est ni dans son graphe npm,
  ni importé par son code source.
- Le runtime mobile n'expose pas directement `image-size` et n'utilise pas
  d'upload photo natif dans la V1 courante. `expo-image-picker` et la capacité
  d'upload photo mobile ne font pas partie du graphe runtime publié.
