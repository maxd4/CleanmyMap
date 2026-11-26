# Audit transversal GitHub et dépôt CleanMyMap

Statut : AUDIT / SNAPSHOT. Date : 2026-11-26.
SHA de lecture : a68a07dbf2857c2c58d6dddaf12a9256f8ea1928. Arbre Git récursif non tronqué.
Périmètre : configuration GitHub accessible, workflows, gates, manifestes,
gouvernance, accueil des contributeurs, volumétrie. Aucun audit exhaustif
des 7662 fichiers ni pentest n'est revendiqué.

## Constats observés et décisions

| Priorité | Constat et preuve | Décision |
|---|---|---|
| P0 | audit-github-release.mjs retourne PASS avec un run arbitraire réussi, des rulesets vides ou une réponse d'alertes non-tableau ; trois reproductions de la fonction actuelle | Candidat de correction et tests dans [la spec](../../specs/github-release-proof/README_CODEX.md), à intégrer avant nouvelle attestation de release |
| P0 | SQL proof 45818202674 (528788ab) et 45817228967 (83aba800) échoués ; job 139903517159 indique SUPABASE_SQL_EVIDENCE FAIL, cause exacte non prouvée par le log compact | Récupérer l'artefact d'evidence 15117276058 si accessible, diagnostiquer la première preuve en échec et corriger sa cause. Aucun SQL distant pour simuler la preuve |
| P1 | Rulesets actifs : protection d'historique (deletion/non_fast_forward, sans bypass), restriction d'update (rôle administrateur et intégration autorisée) ; aucun required status check | Conserver la protection actuelle et le workflow coordonné. Une gate distante prépublication nécessiterait une décision de workflow ; ne pas l'activer aveuglément sur main |
| P1 | web-governance sélectionné par docs_only ou web_code_relevant ; diff mixte documentation + Mobile/Python et diff Dependabot isolé peuvent échapper aux checks transversaux | Corriger la sélection, sans imposer les lanes applicatives hors scope |
| P1 | Runs récents annulés lors de pushes successifs ; ci et CodeQL réussis sur le SHA de lecture, dernière E2E observée réussie sur 8b212cc | Examiner la provenance des preuves réellement nécessaires et les politiques de concurrence par lane ; ne pas désactiver globalement les annulations |
| P1 | Configuration de sécurité et listes d'alertes non accessibles par le connecteur actuel ; aucun nombre d'alertes attesté | Relire via gh authentifié ou interface d'administration ; conserver les scanners et ne pas dismiss arbitrairement |
| P1 | Neuf PR Dependabot ouvertes, dont six npm, deux pip et une GitHub Actions ; compatibilité réelle non validée | Traiter par écosystème et compatibilité Expo/React Native, puis Web et tooling. Aucun merge automatique |
| P2 | 815 fichiers sous documentation (558 Markdown), 47 141 octets pour le fichier d'instructions racine ; budget local déclaré de 240 lignes | Terminer DOC-01 à DOC-11 déjà engagés, sans diminuer les obligations de preuve |
| P2 | .agents/skills/brag : 289 fichiers, 16 583 865 octets, pyproject et uv.lock ; branche Dependabot uv observée ; pas de fichier de licence identifié par nom sous ce skill | Examiner provenance et licences des ressources, usages réels et références ; sortir les ressources non nécessaires du dépôt technique si autorisé, sans effacer d'historique ni supprimer d'asset utilisé |
| P2 | Aucun guide CONTRIBUTING ni CODE_OF_CONDUCT identifié dans l'arbre Git | Guide de contribution proposé dans .github ; adoption d'un code de conduite et canal de modération à décider par le mainteneur |
| P2 | Document historique GitHub/Vercel non daté avec compteurs et recommandations devenus périmés ; documentation CI discordante | Classer l'historique, corriger les descriptions CURRENT et orienter depuis les README |

## Inventaire

Arborescence : 7662 blobs, 145484059 octets (hors historique Git).
Web 5578 fichiers / 82618442 octets ; Mobile 269 / 13772451 ;
documentation 815 / 24878597 ; .agents 334 / 16682292 ;
scripts 454 / 5239145. Les métriques ne représentent ni le bundle déployé,
ni la quantité de code runtime, ni la dette technique.
12 workflows ; 528 migrations, 253 fichiers route.ts/route.js API et
1941 fichiers de test Web déjà inventoriés dans les travaux P0/P1/P2.
Ne pas créer un nouveau registre des owners en parallèle de ces lots.

## Points à préserver

Historique de main protégé sans bypass ; CI indépendante de la publication
Vercel ; secret-audit et dependency-audit indépendants ; actions épinglées
sur SHA selon la politique existante ; CodeQL, Scorecard et zizmor ;
workflow de convergence read-only ; séparation des preuves PostgreSQL,
E2E et backup/restore. Le statut success d'un workflow n'atteste pas les
alertes ouvertes ni les jobs ignorés. Les outils Scorecard et zizmor sont
informatifs selon leur contrat actuel : qualifier leurs résultats avant
d'en faire des gates bloquantes. La dernière preuve E2E échouée antérieure
ne doit pas masquer une réussite ultérieure, ni inversement.

## Réglages distants à confirmer

GitHub : Settings / Code security (alertes, dependency graph, Dependabot
security updates, secret scanning, push protection, private vulnerability
reporting), Actions / General (permissions par défaut et autorisation de
création/approbation de PR), Environments (production et secrets par scope),
Collaborators et Apps installées, identité du bypass d'intégration,
2FA/passkey du compte, notifications de sécurité et accès de récupération.
Ne publier ni secret, ni liste de credentials, ni résultat brut sensible.
Les accès aux détails des règles classiques, permissions Actions,
environments, secrets, variables, collaborateurs et alertes ont été refusés
ou non pris en charge. L'absence de visibilité n'est pas un défaut de réglage.

Sources : [gouvernance GitHub](../github-governance.md),
[hardening Actions](../../security/github-actions-hardening.md),
[CI](../../../.github/workflows/ci.yml),
[run SQL](https://github.com/maxd4/CleanmyMap/actions/runs/45818202674),
[run E2E ultérieur](https://github.com/maxd4/CleanmyMap/actions/runs/45828471506),
[documentation GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
