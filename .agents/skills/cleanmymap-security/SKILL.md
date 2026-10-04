---
name: cleanmymap-security
description: "Utiliser lorsqu'une tâche touche AuthN/AuthZ, ownership, rôles, RLS, secrets, XSS, URL/HTML utilisateur, webhook, privilèges serveur ou autre frontière sensible CleanMyMap."
category: repository
risk: high
source: local
tags: "[security, authn, authz, rls, secrets, xss, ownership]"
---

# CleanMyMap — sécurité applicative

## But

Préserver les frontières de confiance réelles du produit, sans introduire de restriction produit non justifiée.

## Utiliser quand

- identité Clerk, rôles, ownership ou permissions changent ;
- une route, action serveur, RPC, webhook ou service privilégié est modifié ;
- du contenu utilisateur peut atteindre HTML, URL, markdown ou redirection ;
- un secret, token, `service_role` ou variable d'environnement est concerné ;
- une policy RLS ou une capacité admin/modération est touchée.

## Sources canoniques

Lire le `AGENTS.md` racine, le scoped `AGENTS.md`, puis les documents de `documentation/security/` et les helpers AuthZ existants du domaine.

## Modèle de frontière

Toujours distinguer :

```text
AuthN = qui agit ?
AuthZ = a-t-il ce droit ?
Ownership = cette ressource lui appartient-elle ?
Override = agit-il explicitement avec un pouvoir supérieur ?
Audit = l'opération sensible est-elle traçable ?
```

Pour une route sensible, préserver l'ordre conceptuel pertinent :

```text
entrée
→ AuthN/AuthZ
→ parsing/validation
→ règle métier
→ persistence
→ audit/effets
→ réponse
```

## Règles

- Ne jamais faire confiance à un rôle ou scope déclaré par le client.
- Ne jamais exposer `service_role`, secret serveur ou décision AuthZ dans un Client Component.
- Ne jamais désactiver RLS pour contourner un bug.
- Réutiliser l'owner d'autorisation existant au lieu de créer une permission parallèle.
- Valider les URLs avec une primitive structurée (`URL`) et une allowlist de protocoles/hosts quand le contrat l'exige.
- N'injecter du HTML utilisateur que via un contrat explicitement sanitisé et testé.
- Ne pas journaliser secrets, PII inutiles, payload brut sensible ou stack trace externe.
- Appliquer le moindre privilège aux pouvoirs et données sensibles, pas comme prétexte pour fermer arbitrairement une surface communautaire.

## Validation

Ajouter les tests positifs et négatifs au bon seam : anonyme/authentifié, owner/non-owner, rôle minimal/insuffisant, payload invalide, chemin privilégié. Ajouter les tests de sécurité canoniques lorsqu'ils sont concernés. `checks:full` n'est lancé que dans une préparation immédiate de déploiement Vercel ou dans un prompt explicitement dédié à cette commande ; les lots sensibles utilisent sinon les validations ciblées et `checks:fast` selon leur blast radius.
