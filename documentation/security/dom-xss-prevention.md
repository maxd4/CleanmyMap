# Prévention XSS DOM — contrat `CURRENT`

Ce document décrit le contrat de traitement des contenus dans le runtime
actuel. Une occurrence de `innerHTML` ou `dangerouslySetInnerHTML` n'est pas à
elle seule une preuve de vulnérabilité : la source, le contexte et le caractère
contrôlé ou non de la donnée doivent être établis.

## 1. Contenu non fiable

Les entrées utilisateur, traductions ou données externes non auditées sont du
texte ou du HTML non fiable. Les afficher avec le rendu React normal ou
`textContent` ; ne pas les injecter directement dans `innerHTML`, `outerHTML`,
`document.write()` ou `dangerouslySetInnerHTML`.

Si du HTML dynamique est réellement requis, le sanitizer approuvé doit être
appliqué à la frontière, avec une allowlist adaptée au contexte et un test
contre les balises/attributs actifs. La sanitation ne remplace pas la
validation métier.

## 2. Scripts et styles statiques contrôlés

Le runtime contient des usages de `dangerouslySetInnerHTML` pour des scripts
d'initialisation et des styles d'impression contrôlés par le code. Ces usages
ne reçoivent pas de contenu utilisateur par construction et doivent rester
statiques, courts, révisables et commentés lorsque le contexte n'est pas évident.
Une donnée qui devient dynamique change de catégorie et doit repasser par une
conception de sanitation/encodage.

## 3. Données sérialisées dans `<script>`

Le JSON-LD et les autres données injectées dans un script doivent être produits
par le serveur depuis une structure typée, sérialisés avec un encodeur adapté au
contexte JavaScript et séparés du code. Ne jamais concaténer une chaîne fournie
par l'utilisateur dans le corps d'un script. Vérifier l'échappement des
séquences qui peuvent terminer le contexte script (`<`, `</script>`, etc.)
selon le helper utilisé.

## 4. HTML généré pour export

Les générateurs HTML/PDF sont des producteurs de documents, pas une permission
d'injecter des données non échappées. Toute valeur provenant d'un formulaire,
d'une base ou d'une source tierce doit être échappée pour le contexte HTML ou
texte correspondant avant génération. Les scripts de contrôle d'impression et
de fermeture peuvent rester statiques.

## Checklist

- [ ] source de chaque valeur identifiée ;
- [ ] contenu non fiable rendu comme texte ou sanitisé ;
- [ ] script/style statique séparé et documenté ;
- [ ] sérialisation `<script>` encodée pour son contexte ;
- [ ] HTML d'export échappé avant génération ;
- [ ] tests négatifs présents lorsqu'une frontière est sensible.

Références :
[`SECURITY_QUICK_REFERENCE.md`](./SECURITY_QUICK_REFERENCE.md),
[`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md),
[CodeQL `js/xss-through-dom`](https://codeql.github.com/codeql-query-help/javascript/js-xss-through-dom/),
[OWASP DOM XSS](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html).
