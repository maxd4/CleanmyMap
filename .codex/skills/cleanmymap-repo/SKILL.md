---
name: cleanmymap-repo
description: "Socle de travail pour toute tâche visant le dépôt CleanMyMap. Active la lecture du main réel, des AGENTS scoped, des contrats concernés et des validations proportionnées, sans recopier la gouvernance du dépôt."
category: repository
risk: safe
source: local
tags: "[cleanmymap, repository, governance, scope, validation]"
---

# CleanMyMap — socle dépôt

## But

Orienter toute tâche CleanMyMap vers les **sources canoniques actuelles** sans transformer ce skill en seconde gouvernance.

## Utiliser quand

- une tâche touche le code, les tests, la documentation, les données ou l'infrastructure CleanMyMap ;
- une modification doit être intégrée, validée ou publiée ;
- plusieurs sources historiques ou anciennes conversations pourraient entrer en conflit.

## Sources canoniques à lire d'abord

1. état réel de `main` et du checkout ;
2. `AGENTS.md` racine ;
3. `AGENTS.md` scoped le plus proche des fichiers concernés ;
4. documentation canonique du domaine ;
5. code, callers, consommateurs et tests directement concernés.

Une ancienne conversation, un ancien SHA, un audit passé, QMD ou un snapshot ne remplace jamais l'état courant du dépôt.

## Règles de travail

- Travailler en `MAIN-ONLY / SINGLE-WRITER` selon la gouvernance actuelle.
- Préserver tout changement local ou fichier utilisateur préexistant ; ne jamais le restaurer ou l'écraser par commodité.
- Stager uniquement le candidat du lot ; ne jamais utiliser `git add -A`, `reset`, `clean`, `stash` ou `force-push` pour masquer un conflit.
- Traiter une **responsabilité cohérente** : ne pas créer de micro-lots par finding ou fichier quand les conséquences appartiennent au même contrat.
- Avant une nouvelle abstraction, table, helper, service, source de données ou document, rechercher l'owner existant et préférer la convergence.
- Les symboles sont privés par défaut ; un export, barrel ou alias doit correspondre à un consommateur ou contrat réel.
- La taille seule ne justifie jamais une modularisation.
- Une preuve ne justifie que ce qu'elle mesure : code présent ≠ test exécuté ≠ état distant ≠ preuve de production.

## Routage vers les skills spécialisés

N'activer un skill spécialisé que si son domaine est réellement concerné : sécurité, Supabase, UI/browser, formulaires, accessibilité, SEO, i18n, audits qualité, Next.js, React performance, TypeScript, diagnostic, TDD ou revue.

Éviter d'empiler plusieurs skills génériques qui donnent la même méthode de travail.

## Validation

Utiliser les commandes canoniques actuelles définies dans `scripts/AGENTS.md` et `documentation/development/TESTING.md`.

Par défaut :

```text
validation ciblée utile
→ checks:fast si le blast radius le justifie
→ checks:full uniquement avant un déploiement Vercel ou dans un prompt dédié
```

Ne pas relancer une preuve déjà suffisante sur le même candidat sans raison.

## Clôture

Ne jamais annoncer un test, build, migration, push ou état distant comme validé sans preuve observée. Après publication, vérifier la convergence lorsque la gouvernance du lot le demande.
