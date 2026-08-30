# AGENTS.md — CleanMyMap

## Portée et héritage

Ce fichier contient uniquement la gouvernance universelle du dépôt. Toute
règle propre à un sous-arbre doit vivre dans le `AGENTS.md` le plus proche :

```txt
root
├── apps/web
│   ├── src/app/api
│   ├── supabase
│   └── scripts
├── apps/mobile
├── scripts
├── .github
├── maintenance/python
└── documentation
```

L'héritage se lit du root vers l'application puis vers la frontière
spécialisée. Les fichiers scoped ajoutent des règles locales ; ils ne
remplacent pas les invariants de ce fichier et ne doivent pas recopier sa
gouvernance. Ne pas réintroduire dans le root une règle exclusivement web,
API, Supabase, scripts, mobile, CI/GitHub, Python ou documentation.

Les fichiers scoped canoniques sont :

```txt
apps/web/AGENTS.md
apps/web/src/app/api/AGENTS.md
apps/web/supabase/AGENTS.md
apps/web/scripts/AGENTS.md
apps/mobile/AGENTS.md
scripts/AGENTS.md
.github/AGENTS.md
maintenance/python/AGENTS.md
documentation/AGENTS.md
```

Ordre de priorité :

1. consigne explicite de l'utilisateur ;
2. sécurité, données et authentification ;
3. état réel du dépôt GitHub `maxd4/CleanmyMap` ;
4. architecture et contrats existants ;
5. design system ;
6. tests et validation ;
7. simplicité ;
8. performance et quotas lorsque le sujet est concerné.

Ne jamais préférer une refonte large à une correction ciblée suffisante.

## Canari de session

Commencer uniquement la réponse finale par `Maxence —`. Les mises à jour
intermédiaires ne doivent pas commencer par ce canari.

## Source de vérité et Git

- utiliser GitHub comme source de vérité et confronter toute copie locale à
  `maxd4/CleanmyMap`, branche `main` ;
- lire le fichier actuel et ses dépendances directes avant de le modifier ; ne
  pas privilégier une ancienne conversation ou un ancien plan au dépôt réel ;
- le checkout de travail reste directement sur `main` ; toute exécution qui
  produit des modifications doit se terminer par un commit ciblé sur `main`
  puis un push vers `origin/main` ; aucune modification ne justifie un commit
  artificiel ;
- ne pas créer de Pull Request, branche temporaire ou worktree sans demande
  explicite ; ne jamais pousser avec `--force` ni réécrire l'historique publié ;
- le commit et le push doivent couvrir uniquement le lot de l'exécution
  courante ; stage uniquement les chemins concernés et préserve les
  changements parallèles ;
- si le push échoue, conserver le commit local et signaler explicitement le
  blocage ; ne jamais contourner les protections par un force push ;
- avant le push, vérifier le diff exact du périmètre logique, les validations
  pertinentes et l'égalité des SHAs `main`/`origin/main`.
- lorsqu'une vérification effective du site web est demandée, comparer le
  déploiement actif avec le `main` actuel ; si le déploiement est obsolète,
  redéployer Vercel depuis ce `main` avant de vérifier le site et ne pas tirer
  de conclusion à partir d'une version plus ancienne.

Un agent externe peut lire et préparer une analyse ou des fichiers, mais ne
doit pas écrire sans autorisation. L'intégrateur local vérifie la cohérence du
checkout, applique les changements autorisés, valide, committe et pousse.

`CHATGPT.md` gouverne la réflexion et la préparation côté ChatGPT ; ce fichier
gouverne l'exécution locale Codex. ChatGPT ne crée ni commit, ni push, ni
worktree. Codex intègre les décisions autorisées, exécute les checks puis
committe et pousse chaque lot modifié en fin d'exécution selon la règle
ci-dessus.

## Chantiers parallèles

- un worktree dirty est permis ; les modifications étrangères ne sont ni
  corrigées, nettoyées, stashées, déplacées ni inventoriées systématiquement ;
- délimiter chaque lot, modifier uniquement son périmètre et stage uniquement
  les chemins nécessaires ; ne jamais utiliser `git add -A` ;
- préserver les artefacts et changements parallèles, et ne signaler le dirty
  state que s'il provoque une interférence concrète ;
- attribuer un échec de validation au lot seulement s'il concerne un fichier,
  contrat ou régression du lot. Une erreur étrangère est
  `SKIPPED_PARALLEL_CHANTIER` et ne doit pas être corrigée dans ce lot.

## Hygiène du dépôt et architecture interne

- conserver par défaut sous la racine du projet tous les fichiers et dossiers
  du projet, notamment le code, les tests, la documentation, les scripts, les
  données et les artefacts, selon les emplacements canoniques de son
  architecture ;
- ne pas créer par commodité de dossier parallèle, copie persistante, clone,
  worktree ou arborescence hors projet ailleurs sous `business` ou sur la
  machine, notamment un dépôt ou dossier `CleanmyMap-*` parallèle ;
- respecter et étendre l'arborescence canonique existante ; ne pas créer de
  structure ambiguë ou dupliquée lorsqu'un contenu possède déjà un emplacement
  canonique ; la racine du projet reste la source canonique des fichiers
  versionnables ;
- ne pas créer de fichier racine sans justification explicite ; placer les
  temporaires, captures, logs, exports et artefacts dans leur emplacement
  canonique (`artifacts/`, `documentation/`, `backups/` ou sous-dossier dédié) ;
- supprimer les artefacts temporaires dès qu'ils ne sont plus nécessaires ; une
  exception hors projet n'est admise que pour une contrainte technique réelle
  et justifiée ; si elle est persistante, mentionner obligatoirement son chemin
  exact et sa justification dans le compte rendu final ;
- les images et captures placées sous `documentation/pages_site/routes/` sont
  des assets locaux uniquement : elles doivent rester ignorées par Git et ne
  doivent jamais être ajoutées à l'index ou commitées ;
- les skills CleanMyMap versionnés utilisent `.agents/skills/` comme source
  canonique et `.codex/skills/` comme miroir gouverné ; les skills tiers vont
  dans l'installation utilisateur globale, jamais dans le checkout ;
- ne pas modifier `documentation/pepite/` sans demande explicite.

Ne jamais supprimer en masse un fichier untracked, généré ou non canonique
sans établir sa provenance, son rôle, sa régénérabilité et son emplacement
attendu. En cas de doute, le conserver et produire un verdict
`KEEP / MOVE / REINSTALL_ELSEWHERE / DELETE`. Une absence d'import ou de suivi
Git ne suffit pas à justifier une suppression.

## Suppression et dead-code

L'absence de consommateur ou d'import runtime ne prouve pas qu'un module est
supprimable. Vérifier les connaissances métier, pédagogiques, de sécurité ou
réglementaires, configurations, migrations, compatibilités historiques,
fixtures et documents uniques. Rechercher le successeur, migrer explicitement
la valeur utile, supprimer les doublons prouvés et préserver les artefacts
historiques encore nécessaires.

## Principes de restructuration

Avant de créer ou déplacer une responsabilité, vérifier l'emplacement, le
nommage, les dépendances, les cycles, les contrats publics et les frontières
Server/Client. Toute restructuration importante suit :

1. structure physique cohérente et legacy réellement prouvé ;
2. architecture logique, dépendances, responsabilités et testabilité ;
3. garde-fous de gouvernance, dépendances et documentation canonique.

La taille seule n'impose pas une extraction. Rechercher activement les
frontières au-delà de 1200 lignes, revoir un module de 900 à 1200 lignes lors
d'une modification significative, et éviter les micro-extractions artificielles
ou les façades qui ne préservent pas les contrats, l'ordre d'exécution, les
exceptions et les effets de bord. Pour le réseau, SQL, concurrence,
transactions, navigateur, lifecycle et orchestration, caractériser d'abord le
comportement avant toute extraction.

## Sécurité et validation globales

- ne jamais exposer un secret ou `service_role` côté client ;
- ne jamais désactiver RLS ou contourner AuthN/AuthZ pour débloquer un flux ;
- ne pas utiliser de SQL brut dans le code applicatif ;
- valider les entrées non fiables et vérifier les permissions côté serveur ;
- ne pas exposer de stack trace, secret, erreur interne ou détail sensible ;
- préserver les contrats publics, les données, les erreurs et les invariants
  de sécurité existants ;
- tout texte public est en français sauf surface explicitement localisée.

Les règles propres à Next/web, API, Supabase, scripts, mobile, CI/GitHub,
Python et documentation sont portées par les fichiers scoped correspondants.
Les changements SQL, routes API, workflows, maintenance Python et documents
doivent en plus appliquer leur gouvernance locale.

## Charge machine

Ne pas lancer plusieurs commandes lourdes en parallèle. Préférer les contrôles
read-only et ciblés ; exécuter séquentiellement les suites Vitest/Node,
pytest, build, Turbopack et E2E. Ne pas laisser tourner de serveur, watcher,
worker ou processus local après la validation. Ne pas explorer par défaut
`node_modules/`, `.next/`, `.vercel/`, `.playwright-mcp/`,
`.codex-remote-attachments/`, `artifacts/` ou `backups/`.

## Validation

Ne jamais annoncer une commande non exécutée comme réussie. Choisir les checks
proportionnels au risque :

```bash
npm run checks:changed
npm run checks
```

La validation complète doit couvrir les garde-fous de gouvernance, tests,
typecheck, lint et build web. Les tests E2E restent explicites. Pour un audit
GitNexus, utiliser exclusivement :

```bash
npm run audit:gitnexus
npm run audit:gitnexus:cycles
```

Ces commandes utilisent `analyze --index-only` puis `status`; ne pas appeler
directement le mode standard qui peut injecter des fichiers de gouvernance.
En cas d'échec : lire l'erreur complète, identifier la cause, corriger le lot
minimal, relancer le check ciblé puis élargir si nécessaire.

## Navigateur et réponse

Ne pas lancer de navigation, capture, audit visuel ou Playwright sans demande
explicite ou obligation locale. Les validations E2E non visuelles restent
autorisées lorsqu'elles sont explicitement requises.

La réponse finale doit être en français, commencer par `Maxence —`, distinguer
faits vérifiés, inférences et incertitudes, lister les fichiers modifiés et
hors périmètre, les validations exactes, les erreurs rencontrées, l'état du
push, les artefacts et les changements parallèles préservés. Ne pas présenter
comme testé ou terminé ce qui ne l'est pas.

Terminer par :

```text
VERDICT_REVIEW: <terminé|partiel|bloqué|échec>
COMMIT: <SHA ou aucun>
PRIMARY_EVIDENCE: <preuves et artefacts principaux>
REMAINING_UNCERTAINTIES: <incertitudes restantes ou aucune>
NEXT_RECOMMENDED_ACTION: <action suivante ou aucune>
```

## Interdictions synthétiques

Il est interdit de créer un dépôt parallèle, d'utiliser `service_role` côté
client, de désactiver RLS, d'exposer des secrets, de contourner une protection
pour obtenir du vert, d'inventer des sources ou chiffres, de laisser des
placeholders ou routes cassées, ou de considérer une ancienne conversation
comme source supérieure au dépôt actuel.

## Contexte de conversation

Si plusieurs chantiers se mélangent ou si une décision importante risque d'être
perdue, ne pas reconstruire approximativement le contexte : fournir une
passation courte avec l'état, le dernier commit, les fichiers, les décisions
et la prochaine étape, puis attendre confirmation avant de continuer.
