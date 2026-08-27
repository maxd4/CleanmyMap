# Admin audit

Ce dossier regroupe la journalisation des opérations d’administration et son
adaptateur pour les envois d’email de test.

- `operation-audit.ts` est le module canonique d’écriture et de lecture du
  journal `admin_operations_audit`.
- `email-test-audit.ts` construit uniquement les détails bornés du parcours
  email avant de déléguer au journal canonique.

Les contrôles d’accès restent dans `../access.ts` et les opérations métier
restent dans leurs domaines respectifs.
