# Sécurité interne — CleanMyMap

Ce document décrit la doctrine de sécurité interne du projet.

Pour signaler une vulnérabilité de manière responsable, utiliser le fichier racine `SECURITY.md`.

## Modèle de menace simplifié

CleanMyMap manipule notamment :

- comptes et profils ;
- rôles privilégiés ;
- données de localisation ;
- actions terrain ;
- photos et pièces jointes ;
- messagerie et communauté ;
- exports ;
- services tiers ;
- quotas gratuits limités.

Les risques principaux sont :

- élévation de privilège ;
- lecture ou modification de données d'un tiers ;
- fuite de secret ;
- abus de formulaire ou d'email ;
- exposition de localisation ;
- contournement RLS ;
- webhook falsifié ;
- endpoint interne exposé ;
- dépendance vulnérable ;
- CI donnant une fausse impression de couverture.

## Identité

Clerk est le fournisseur d'identité principal du web.

Supabase assure la persistance et l'autorisation au niveau données lorsque le flux utilise RLS.

Ne pas introduire une seconde identité canonique pour le même utilisateur sans décision d'architecture explicite.

## Autorisation

Les permissions sont vérifiées côté serveur.

Un rôle `admin`, `elu` ou `max` ne doit pas modifier silencieusement le comportement d'un parcours utilisateur normal.

Une dérogation administrative sensible doit être :

- explicite ;
- autorisée côté serveur ;
- séparée du parcours normal ;
- motivée si nécessaire ;
- auditée.

Référence :

```txt
documentation/security/authz-authn-regles.md
```

## Secrets

Interdictions :

- secret dans Git ;
- `service_role` dans un bundle client ;
- token dans une URL publique ;
- secret dans une capture ou un artefact ;
- secret réel dans un exemple.

Audit :

```bash
npm run security:secrets
```

La CI doit exécuter cet audit même pour un commit uniquement documentaire.

## Supabase

Règles :

- RLS active sur les tables concernées ;
- permissions des RPC explicites ;
- `security invoker` par défaut quand adapté ;
- `search_path` maîtrisé ;
- pas de `service_role` client ;
- migrations versionnées ;
- tests propriétaire/non-propriétaire.

## API

Chaque route sensible doit vérifier son propre contrat d'accès.

Le proxy améliore la protection mais ne remplace pas l'autorisation métier.

Catégories :

```txt
public
authenticated
owner
admin
service/cron
signed webhook
```

## Email

La route `/api/email/test` est la surface de test admin recommandée.

Si `/api/send` reste présente :

- token local interdit comme bypass en production ;
- payload borné ;
- destinataires limités ;
- erreurs non sensibles ;
- quota surveillé.

## Données de localisation

La géolocalisation peut révéler des informations sensibles.

Vérifier :

- finalité ;
- précision nécessaire ;
- durée de conservation ;
- visibilité ;
- ownership ;
- export ;
- suppression.

L'app compagnon doit avoir un modèle d'identité cohérent avant production.

## Dépendances et CodeQL

Maintenir :

- Dependabot ;
- CodeQL ;
- lockfile ;
- revue ciblée des alertes.

Ne pas lancer un grand nettoyage aveugle. Prioriser les flux réellement exploitables et les frontières de confiance.

## CI

La CI doit distinguer :

- contrôles toujours actifs ;
- contrôles lourds ;
- documentation seule.

Toujours actifs :

```txt
secret audit
root hygiene
documentation governance
stack doc drift
agent skill mirror check
```

Pour le code web :

```txt
typecheck
lint
tests
security tests
regression gates
production build
```

## Incident

Référence :

```txt
documentation/operations/INCIDENT_RUNBOOK_SHORT.md
```

En cas de secret exposé :

1. révoquer ;
2. faire tourner la clé ;
3. vérifier les logs ;
4. rechercher dans l'historique ;
5. supprimer la valeur du code ;
6. documenter l'incident ;
7. renforcer le garde-fou.

## Vérification

```bash
npm run checks
```
