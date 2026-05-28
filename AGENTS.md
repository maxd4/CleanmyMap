# Regles strictes de travail local

## Interdiction de creer des dossiers projet paralleles

Il est strictement interdit de creer un nouveau dossier sibling, une copie du depot, un worktree Git ou tout autre dossier projet parallele a cote de `CleanmyMap-main` sans autorisation explicite de l'utilisateur.

Cette interdiction s'applique a tous les agents, modeles et automatisations travaillant sur ce projet.

Concretement, ne pas creer de dossier du type :
- `CleanmyMap-*`
- `CleanmyMap-main-*`
- `.worktrees/*`
- `worktrees/*`
- toute copie locale du depot hors du dossier courant

Tout travail doit rester dans :
`C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main`

## Règle UI de lisibilité

Sur les héros et titres de page, éviter les retours à la ligne décoratifs. Priorité:
1. réduire la taille,
2. réduire le tracking,
3. réduire la largeur utile,
4. réorganiser le bloc sur mobile.

Un titre ou sous-titre doit tenir sur une seule ligne sur desktop standard si c’est possible sans nuire à la lisibilité.

## Règle UI de lisibilité

Sur les héros et titres de page, éviter les retours à la ligne décoratifs. Priorité:
1. réduire la taille,
2. réduire le tracking,
3. réduire la largeur utile,
4. réorganiser le bloc sur mobile.

Un titre ou sous-titre doit tenir sur une seule ligne sur desktop standard si c'est possible sans nuire à la lisibilité.

## Règle système de couleurs (5 blocs, multi-teintes)

**Structure homepage** : 5 blocs avec logique multi-teintes selon le type de page.

**Blocs et teintes** :
1. Accueil & Pilotage → `amber`/`orange` (accueil) + `amber`/`brun` (pilotage)
2. Agir → `emerald`
3. Cartographie & Impact → `sky` (carto) + `red`/`rose` (impact)
4. Réseau & Discussions → `indigo`
5. Apprendre → `yellow`

**Mapping rubrique → teinte** :
- Pages accueil (`/dashboard`, `/profil`, `/explorer`, `/feedback`) → `amber`/`orange`
- Pages pilotage (`/pilotage`, `/admin`, `/elus`, `/godmode`) → `amber`/`brun`
- Pages carto (`/actions/map`, `/sandbox`) → `sky`
- Pages impact (`/reports`, `/gamification`) → `red`/`rose`

**Règle stricte** : Une page = une teinte dominante. Ne pas mélanger orange ET brun, ou sky ET red/rose sur la même page.

**Référence complète** : `documentation/design-system/BLOC_COLOR_SYSTEM_PREMIUM.md`

Si une isolation Git est necessaire, demander d'abord l'accord explicite de l'utilisateur et expliquer :
- le nom du dossier qui serait cree ;
- la raison precise ;
- la duree de conservation ;
- la procedure de fusion et suppression.

Sans cet accord, utiliser uniquement la branche courante et les fichiers du dossier `CleanmyMap-main`.

## Hygiene de la racine

- Ne pas generer de nouveaux fichiers a la racine du repo sauf demande explicite de l'utilisateur.
- Les fichiers temporaires, captures, logs, exports et artefacts de debug doivent aller dans `artifacts/`, `documentation/`, `backups/` ou un sous-dossier dedie.
- Si un fichier doit absolument vivre a la racine, il faut que ce soit un fichier d'architecture du projet ou un livrable racine clairement justifie.
- Tout fichier racine ajoute sans demande explicite doit etre considere comme une regression de gouvernance et etre nettoye avant validation.

## Règle Markdown et Quarto

- Ne jamais mettre de numéros de section ou de titre en dur (ex: `1.`, `## 2.`) dans les fichiers Markdown destinés à l'export. Ces numéros sont générés automatiquement par Quarto lors de l'export. Utilisez uniquement la hiérarchie standard (`#`, `##`, `###`).

## Règle de Gamification et Transparence

- Informer systématiquement l'utilisateur quand l'action qu'il s'apprête à faire (ou vient de faire) sur le site lui apporte de l'XP ou des badges.
