# Gouvernance temporaire des advisories de dépendance

## Portée

Cette acceptation de risque est limitée au `companion-app` et aux deux
advisories `image-size` détectées dans son graphe npm. Elle ne constitue pas une
exception globale de package, de niveau de sévérité ou de scanner.

| Advisory | CVE | Package résolu | Chemin transitif | Impact |
| --- | --- | --- | --- | --- |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | CVE-2025-71330 | `image-size@1.2.1` | `@expo/metro` → `metro` → `image-size` | Boucle infinie du parseur ICNS, déni de service de l'event loop |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | CVE-2025-71329 | `image-size@1.2.1` | `react-native` → `@react-native/community-cli-plugin` → `metro` → `image-size` | Boucle infinie des parseurs JXL/HEIF, déni de service de l'event loop |

Les deux advisories concernent les versions `image-size <= 2.0.2`. Aucune
version npm corrigée n'est actuellement publiée. Le lockfile du companion
résout `image-size@1.2.1` ; aucune version d'Expo, React Native, Metro ou
`image-size` n'est modifiée par cette gouvernance.

## Surfaces réellement concernées

- `apps/web` n'est pas concerné : `image-size` n'est ni dans son graphe npm,
  ni importé par son code source.
- Le runtime mobile n'expose pas directement `image-size` : le code compagnon
  utilise `expo-image-picker` et transmet l'URI de la photo à l'upload.
- Le risque résiduel porte uniquement sur le bundling Metro d'un asset
  spécialement forgé, avant ou pendant un build Expo/React Native.
- Aucune asset non fiable ne doit entrer dans un build Metro. Les assets d'un
  build doivent provenir du dépôt contrôlé ou d'une source vérifiée avant
  exécution de Metro.

Cette limitation ne désactive ni Dependabot, ni CodeQL, ni `npm audit`, et ne
justifie pas un ignore global par package ou par niveau `High`.

## Acceptation de risque bornée

- Date de décision : `2026-08-25`
- Date de réévaluation au plus tard : `2026-11-25`
- Périmètre accepté : uniquement `GHSA-w3rx-r6r6-pgpr` et
  `GHSA-5p2g-fcmc-qvqq` dans `companion-app`.
- Condition obligatoire : aucun asset non fiable dans un build Metro.
- Action à la réévaluation : vérifier les versions corrigées disponibles et
  décider d'une mise à niveau coordonnée Expo / React Native / Metro, ou d'un
  remplacement maintenu de la dépendance transitive.

L'acceptation expire à la date de réévaluation et doit être renouvelée par une
nouvelle décision documentée ; elle ne se prolonge pas silencieusement.
