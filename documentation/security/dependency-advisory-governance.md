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
pour cette décision locale. Dependabot, CodeQL et `npm audit` restent actifs ;
aucun ignore global par package ou par niveau `High` n'est autorisé.

La mitigation ne rend pas fiable un asset spécialement forgé par lui-même :
Aucun asset non fiable ne doit entrer dans un build Metro. Les assets d'un
build doivent provenir du dépôt contrôlé ou d'une source vérifiée avant
exécution de Metro.

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
- Le runtime mobile n'expose pas directement `image-size` : le code compagnon
  utilise `expo-image-picker` et transmet l'URI de la photo à l'upload.
