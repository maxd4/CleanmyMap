# Validation d'URL — contrat `CURRENT`

Le contrôle d'URL doit parser la valeur, pas rechercher une sous-chaîne. Les
patterns `startsWith("http")`, `includes("http")` et `indexOf("http")` sont
insuffisants et ne doivent pas servir d'autorisation ou de sanitation.

## Règle

```ts
function hasHttpsProtocol(value: string | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
```

Pour un domaine autorisé, comparer `new URL(value).hostname` à une valeur
canonique exacte. Ajouter les bornes de longueur, le rejet des hôtes locaux ou
placeholders et les schémas autorisés selon le flux. Les helpers centralisés
de `apps/web/src/lib/security/validation.ts` restent préférables à une copie
locale.

## Contrôles complémentaires

- distinguer URL absolue et URL relative selon le contrat de la surface ;
- ne pas accepter `javascript:`, `data:` ou un autre schéma non prévu ;
- traiter `mailto:` et `tel:` uniquement dans les flux qui les autorisent explicitement ;
- valider l'URL avant la persistance, la redirection, l'affichage ou l'appel réseau ;
- tester les hostnames proches, les chaînes malformées, les hôtes locaux et les valeurs trop longues.

## Revue

Une validation syntaxique ne remplace pas une allowlist de domaine quand la
surface exige un fournisseur précis. Une URL HTTPS valide peut encore pointer
vers un domaine non autorisé. Voir le contrat d'entrée du domaine et la
checklist [`CODE_REVIEW_CHECKLIST.md`](./CODE_REVIEW_CHECKLIST.md).
