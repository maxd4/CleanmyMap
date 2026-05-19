### 📋 Audit : Panel Administrateur

## Partie 1 : Logiques clés et utilité (Ce que fait la rubrique)

- **Mission Principale :** L'Espace "God-Mode". Sécuriser l'application en donnant les pleins pouvoirs à la core-team pour gérer au laser le trafic, la qualité des déclarations et prévenir toute corruption de la cause par des acteurs malveillants.
- **Logique de Fonctionnement :** 
  - **Data-Grid Haute Performance :** Dashboards techniques à multi-filtres (React-Table/Ag-grid) pour auditer chaque utilisateur, modifier manuellement leur rôle Clerk (passer quelqu'un de `volunteer` à `mod_admin`).
  - **Tooling de Modération QA :** Outils de soft-delete, bannissement direct via webhooks, et workflow de validation de lieux propres (Clean Places) pour nettoyer les abus avant qu'ils ne polluent la carte publique.
- **Valeur pour l'utilisateur (Core Team Admin) :** La survie du produit. Sans ce panneau de modération, la base de données Supabase pourrait être submergée de dessins obscènes ou de faux signalements toxiques (Vandalisme Digital). L'admin y trouve la réponse à tous les problèmes humains du réseau, centralisés en un lieu sûr.
