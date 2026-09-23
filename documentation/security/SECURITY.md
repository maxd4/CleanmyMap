# Sécurité interne — CleanMyMap (`CURRENT`)

> Doctrine transverse actuellement applicable. L'index canonique du domaine
> est [`documentation/security/README.md`](./README.md) ; les contrats
> spécialisés détaillent leur sujet sans être recopiés ici.

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

Le rôle privilégié reste unique : **IMU = super-admin = rôle interne `max`**.
`max` est la valeur technique canonique, `IMU` le libellé produit et
`super-admin` un alias entrant ; aucune différence de permissions ne doit être
déduite de ces appellations.

## Autorisation

Les permissions sont vérifiées côté serveur selon le contrat :

```txt
Role + Capability + Scope + relation à la ressource + état métier
```

Un rôle seul ne constitue pas une permission globale.

Un utilisateur privilégié ne doit pas modifier silencieusement le comportement
d'un parcours utilisateur normal.

Le domaine Actions conserve actuellement une divergence documentée : `elu` est
encore accepté par certaines capacités de modération globale. Cette exception
runtime ne définit pas un rôle admin-like global et ne doit pas être étendue aux
autres domaines.

Une dérogation administrative sensible doit être :

- explicite ;
- autorisée côté serveur ;
- séparée du parcours normal ;
- motivée si nécessaire ;
- auditée.

Référence :

```txt
documentation/security/authz-authn-regles.md
documentation/security/authorization-capabilities.md
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
organizer
organization
territory
global moderation
service/cron
signed webhook
```

Une catégorie d'accès doit être reliée à une capacité et à son scope minimal,
pas uniquement à une comparaison de rôle.

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

L'application mobile utilise le même contrat d'identité Clerk que le web. Son
renouvellement en background headless, `mission_actions` et sa validation
opérationnelle restent ouverts avant toute production mobile.

## Dépendances et CodeQL

Maintenir :

- Dependabot ;
- CodeQL ;
- lockfile ;
- revue ciblée des alertes.

Ne pas lancer un grand nettoyage aveugle. Prioriser les flux réellement exploitables et les frontières de confiance.

## Garde-fou architectural Semgrep

Semgrep complète CodeQL avec un petit contrat architectural local, sans devenir
une seconde source de vérité ni un scanner générique. La configuration
versionnée est [`scripts/security/semgrep/cleanmymap.yml`](../../scripts/security/semgrep/cleanmymap.yml)
et s'exécute sans service SaaS avec :

```bash
npm run check:semgrep
```

Le garde-fou exige Semgrep `1.177.0` et couvre uniquement les invariants
actuels suivants :

- `SUPABASE_SERVICE_ROLE_KEY` reste absent des composants client web et du
  runtime mobile ;
- Clerk reste l'identité utilisateur : les appels Supabase Auth interdits ne
  sont pas réintroduits ;
- `dangerouslySetInnerHTML` reste limité aux usages contrôlés déjà documentés
  dans [`dom-xss-prevention.md`](./dom-xss-prevention.md) ;
- une redirection provenant directement de `searchParams` passe par les
  helpers de validation d'URL ;
- un composant client n'importe pas les modules réservés au serveur définis par
  la frontière web canonique.

Les quatre occurrences contrôlées actuellement présentes (initialiseurs,
JSON-LD et style d'impression) sont explicitement conservées dans la
configuration ; toute nouvelle occurrence doit être revue selon le contrat
XSS avant d'être autorisée. Les fixtures positives et négatives sont exécutées
par le même script afin d'éviter les faux positifs. Le plan de validation ne
sélectionne ce contrôle que pour les surfaces web/mobile ou les fichiers du
garde-fou ; une modification documentaire seule ne le déclenche pas.

## Politique CURRENT des scanners

La sélection des scanners suit les runtimes et les contrats réellement présents
dans le dépôt. Elle ne justifie pas l'ajout d'un outil uniquement parce qu'il
existe sur le marché.

| Scanner | État | Périmètre et règle d'usage |
|---|---|---|
| CodeQL | `CURRENT / PRINCIPAL` | SAST JavaScript/TypeScript, Python de `maintenance/python` et GitHub Actions. Le workflow versionné [`codeql.yml`](../../.github/workflows/codeql.yml) utilise actuellement la matrice `javascript-typescript`, `python`, `actions` avec `security-extended,security-and-quality`. L'autobuild reste limité à JavaScript/TypeScript. |
| Semgrep | `CURRENT / CIBLÉ` | Garde-fou des invariants propres à CleanMyMap (`service_role`, identité Clerk, frontières client/serveur, redirections et HTML injecté). Il complète CodeQL sans le remplacer ni devenir un scanner générique. |
| Bandit | `NON RETENU CURRENT` | Aucun gain Python distinct de CodeQL n'est démontré pour `maintenance/python`. Bandit reste volontairement absent des dépendances, scripts et workflows ; une réévaluation exige une comparaison locale bornée et reproductible montrant des findings utiles non couverts par CodeQL. |
| MobSF | `TARGET / DÉGEL MOBILE` | Non activé tant que `apps/mobile` reste `CURRENT / FROZEN`. Lors d'un dégel explicite ou d'une pré-release mobile, un scan MobSF devra porter sur un artefact Android/iOS réel produit pour la release (`.apk`, `.aab` ou `.ipa`), avec le rapport conservé et les findings bloquants traités avant publication. |
| SonarQube | `NON RETENU CURRENT` | Couverture largement redondante avec ESLint, CodeQL, coverage, Knip, jscpd, complexité, cycles et mutation testing déjà présents. Aucun serveur, package ou workflow SonarQube n'est requis. |
| gosec | `NON APPLICABLE` | Aucun runtime Go n'existe dans le dépôt ; aucun scanner Go n'est ajouté. |
| Brakeman | `NON APPLICABLE` | Aucun runtime Ruby/Rails n'existe dans le dépôt ; aucun scanner Ruby n'est ajouté. |

Cette matrice ne crée pas une seconde source de vérité : les contrats restent
dans le code et les fiches `CURRENT` spécialisées. Toute évolution d'un runtime
ou un dégel mobile doit d'abord mettre à jour la décision et son périmètre,
puis seulement les outils nécessaires.

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
