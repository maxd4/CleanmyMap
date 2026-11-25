# Annuaire institutionnel nominatif

**Statut : CANDIDATE / PLAN.** Ce dossier contient un candidat d'intégration partiel, non intégré au runtime. Il ne constitue ni une fonctionnalité livrée ni un contrat CURRENT.

Archive de transport conservée à la demande explicite de l'utilisateur : [cleanmymap-annuaire-candidat-partiel.zip](./cleanmymap-annuaire-candidat-partiel.zip). Le contenu n'est pas dupliqué dans les chemins runtime. SHA-256 : `880f8a8257be2f8f4a00d832e18f9fcab77aa0959adb445e122a6590e9804748`.

Base de conception : `cd97f32e9752e151a243fc9b60e2f5f9890508b2`. Les trois fichiers visés par le patch sont inchangés à la référence de publication `465eba93cbb3fe7012c5101bf1d497dbbb1dc83f`. Ne pas imposer ces SHA au checkout d'intégration. Extraire dans un emplacement de travail approprié, lire le README interne et adapter le patch et les quatre fichiers TypeScript aux owners actuels. Vérifier les consommateurs, la provenance, les dates, la séparation publique/privée et les contrôles de sécurité avant intégration. Les données relationnelles privées réelles ne figurent pas dans cette archive.

Publication documentaire : mode `DIRECT_GITHUB_PUBLICATION`. Intégrité ZIP/CRC, UTF-8, chemins internes et recherche ciblée de secrets : PASS (contrôles isolés, non exhaustifs). Hooks locaux : `HOOK_NOT_AVAILABLE`. Vitest, couverture, navigateur, AuthZ/RLS et PostgreSQL : `NOT_RUN` pour cette publication. La CI n'est pas déclarée validée. La persistance administrative, les API, l'interface privée et la preuve de non-fuite restent à réaliser. Après intégration, transférer les invariants durables vers le contrat existant [Organisation des services publics de propreté](../../features/organisation-services-publics-proprete.md) et retirer le candidat devenu inutile.
