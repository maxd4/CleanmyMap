# Checklist humaine de revue sécurité — `CURRENT`

Cette checklist couvre uniquement les contrôles de sécurité. Les contrôles
généraux TypeScript, UI, accessibilité, performance et qualité renvoient aux
sources de [`documentation/development/`](../development/).

## Entrées et URLs

- [ ] Les entrées sont typées, bornées, normalisées et rejetées explicitement si invalides.
- [ ] Les URLs sont parsées avec `new URL()` ou les helpers centralisés.
- [ ] Aucun `startsWith("http")`, `includes("http")` ou `indexOf("http")` ne sert de validation.
- [ ] Le protocole et, si nécessaire, le hostname sont comparés explicitement.

## AuthN/AuthZ, données et API

- [ ] Le handler vérifie l'identité, la capacité, le rôle compatible et le scope/ownership ; le proxy seul ne suffit pas.
- [ ] `activeProfile`, un rôle client, un email ou un booléen client ne fournit pas l'autorisation.
- [ ] Les DTO exposent seulement la projection nécessaire.
- [ ] RLS, permissions RPC et migrations restent cohérentes.
- [ ] Une dérogation sensible est séparée du flux normal et auditée selon [`admin-operation-audit.md`](./admin-operation-audit.md).
- [ ] `service_role` et les secrets restent côté serveur.

## XSS et HTML

- [ ] Le contenu non fiable n'arrive pas dans `innerHTML`, `outerHTML` ou `dangerouslySetInnerHTML`.
- [ ] Le texte simple utilise `textContent` ou le rendu React normal.
- [ ] Un HTML dynamique est sanitisé par le mécanisme approuvé et son entrée est identifiée.
- [ ] Un script ou style statique contrôlé est documenté comme tel ; il n'est pas assimilé à une donnée utilisateur.
- [ ] Une donnée sérialisée dans `<script>` est encodée pour le contexte script et ne mélange pas HTML non fiable et code.
- [ ] Toute occurrence de `dangerouslySetInnerHTML` est revue selon le contrat [`dom-xss-prevention.md`](./dom-xss-prevention.md), pas rejetée par simple correspondance textuelle.

## Anti-abus et secrets

- [ ] Le rate limit, le honeypot, le timestamp et/ou BotID sont proportionnés au flux.
- [ ] Les réponses `429` conservent le contrat attendu.
- [ ] Aucun secret, token ou valeur privée n'est ajouté au code, aux logs, aux snapshots ou à la documentation.

## Preuves

- [ ] Les tests négatifs de scope et d'ownership couvrent le risque réel.
- [ ] `npm run security:secrets` a été exécuté pour un lot documentaire ou sensible.
- [ ] Les validations documentaires et de drift pertinentes sont exécutées.

Références : [`README.md`](./README.md),
[`authz-authn-regles.md`](./authz-authn-regles.md),
[`url-validation-security.md`](./url-validation-security.md),
[`dom-xss-prevention.md`](./dom-xss-prevention.md).

