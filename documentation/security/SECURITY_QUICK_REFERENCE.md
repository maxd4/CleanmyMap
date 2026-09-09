# Référence sécurité rapide — `CURRENT`

Cette page rappelle les erreurs fréquentes. Les contrats détaillés restent
dans l'index [`README.md`](./README.md).

## URLs

À ne pas faire :

```ts
url.startsWith("https://")
url.includes("http")
url.indexOf("http") === 0
```

À faire : parser avec `new URL()`, vérifier `protocol === "https:"` quand
HTTPS est requis, comparer le hostname exactement et réutiliser
`apps/web/src/lib/security/validation.ts`.

## XSS et HTML

- contenu utilisateur : texte React ou `textContent`, jamais HTML injecté ;
- HTML dynamique : sanitation explicite et documentée ;
- scripts/styles statiques contrôlés : exception contextualisée, sans entrée utilisateur ;
- données JSON dans `<script>` : sérialisation et encodage adaptés au contexte ;
- `dangerouslySetInnerHTML` n'est pas une preuve de vulnérabilité à lui seul, mais chaque occurrence doit être revue selon [`dom-xss-prevention.md`](./dom-xss-prevention.md).

## AuthZ et données

Une session valide ne suffit pas. Vérifier identité, capacité, rôle compatible,
scope/ownership, état métier, projection minimale et audit si nécessaire.
`activeProfile`, un rôle envoyé par le client, un email et `service_role` côté
client ne sont jamais une autorité.

## Rate limiting

L'identité vient du contexte serveur ou de l'IP de plateforme prévue ; une clé
client arbitraire n'est pas acceptée. Le fallback mémoire local est best-effort
et ne constitue pas une garantie multi-instance. Voir
[`RATE_LIMITING.md`](./RATE_LIMITING.md).

## Blocages immédiats

- secret probable ou PII dans Git, logs ou documentation ;
- contrôle serveur absent sur une route sensible ;
- scope ambigu accepté comme permission globale ;
- RLS ou signature webhook contournée ;
- audit de succès avant l'effet réel ;
- entrée critique non validée ;
- réponse `429` cassant son contrat.

## Commandes

```bash
npm run security:secrets
npm run check:doc-governance
npm run check:stack-doc-drift
npm run test:security
```
