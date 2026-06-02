# Politique de publication

Ce document fixe la frontière entre ce qui peut être publié sur un GitHub public et ce qui doit rester interne ou généré.

---

## Règle de base

- Les fichiers publics peuvent être indexés dans `documentation/README.md`.
- Les fichiers internes ou sensibles ne doivent jamais être listés dans les index publics.
- Les artefacts générés peuvent être conservés dans le dépôt, mais doivent être identifiés comme archives ou sorties de génération.

---

## Inventaire strictement non public

Ces fichiers ou sous-arbres ne doivent pas être exposés comme documentation publique :

- [`AGENTS.md`](../AGENTS.md)
- [`documentation/project_context.md`](./project_context.md)
- [`documentation/sessions/`](./sessions/)
- [`documentation/plans/`](./plans/)
- [`documentation/operations/agent-memory-governance.md`](./operations/agent-memory-governance.md)
- [`documentation/operations/session-standard-runbook.md`](./operations/session-standard-runbook.md)
- [`documentation/maintenance/vercel_deployments.txt`](./maintenance/vercel_deployments.txt)
- [`documentation/rapport_IA/`](./rapport_IA/)
- [`backups/actions-backup-2026-04-24T07-54-44.951Z.json`](../backups/actions-backup-2026-04-24T07-54-44.951Z.json)
- Les archives Python historiques et leurs dumps ne doivent pas être exposés comme documentation publique.

---

## Zones publiques autorisées

Les familles suivantes peuvent rester visibles dans la documentation publique si elles n'y référencent pas les éléments ci-dessus :

- `architecture/`
- `backend/`
- `database/`
- `design-system/`
- `development/`
- `features/`
- `frontend/`
- `legal/`
- `operations/`
- `product/`
- `security/`
- `seo/`

---

## Zones générées / archives

Les éléments ci-dessous peuvent rester dans le dépôt, mais doivent être identifiés comme sorties de génération ou archives visuelles :

- `design-system-board.dynamic.html`
- `design-system-board.html`
- `design-system-board.data.json`
- `actions-map-current.png`
- `photo/`
- `liberte-UX-UI/`

---

## Garde-fous

- Aucun index public ne doit faire un lien direct vers un élément de la liste strictement non publique.
- Si un nouveau fichier de mémoire, de session, de backup ou de dump apparaît, il doit rejoindre l'inventaire strict avant toute publication.
- Toute section de documentation publique doit rester lisible sans dépendre d'un contexte de session interne.
