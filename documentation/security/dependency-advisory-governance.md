# Gouvernance des advisories de dépendance

## Périmètre

Cette gouvernance couvre les deux advisories `image-size` présentes dans le
graphe de `apps/mobile`. Elle ne constitue pas une exception globale de
package, de niveau de sévérité ou de scanner.

| Advisory | CVE | Package utilisé dans `apps/mobile` | Chemin transitif | Correctif couvert |
| --- | --- | --- | --- | --- |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | CVE-2025-71330 | `apps/mobile/vendor/image-size` `2.0.3` | `@expo/metro` → `metro` → `image-size` | Rejet des entrées ICNS trop courtes, hors limites ou non progressives |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | CVE-2025-71329 | `apps/mobile/vendor/image-size` `2.0.3` | `react-native` → `@react-native/community-cli-plugin` → `metro` → `image-size` | Conservation de la garde de progression des boîtes JXL/HEIF de taille nulle |

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

## Suivi vers l'upstream

Le vendor et les overrides ne pourront être retirés que lorsqu'une release
upstream `image-size` contenant les deux correctifs sera publiée et validée ;
la version upstream devra être une version contenant les deux correctifs
dans le graphe Expo/React Native/Metro du companion. À ce moment seulement,
le dépôt devra revenir à cette release officielle, régénérer le lockfile et
supprimer le backport local après validation ciblée.

L'état de cette mitigation dans le dépôt ne préjuge pas de l'état affiché par
Dependabot côté GitHub. Une alerte peut rester visible jusqu'à l'actualisation
du graphe ou du scanner GitHub, même si le runtime versionné utilise déjà le
backport local.

## Surfaces non concernées

- `apps/web` n'est pas concerné : `image-size` n'est ni dans son graphe npm,
  ni importé par son code source.
- Le runtime mobile n'expose pas directement `image-size` : le code compagnon
  utilise `expo-image-picker` et transmet l'URI de la photo à l'upload.
