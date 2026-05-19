### 📋 Audit : Sandbox (Espace Technique Expérimental)

## Partie 1 : Logiques clés et utilité (Ce que fait la rubrique)

- **Mission Principale :** Sanctuariser un dojo de test (Playground) inviolable et privé, fourni exclusivement aux membres certifiés du Back-office technique ou Super-Admin de l'architecture pour éprouver, casser, et tester la plateforme sans conséquences.
- **Logique de Fonctionnement :** 
  - **Accès Gardé :** Interface invisible à l'utilisateur lambda, bloquée par des Guards (Clerk + Middleware) ultra restrictives limitant l'accès strict.
  - **Stress & Healthcheck :** Panneau de tests de tolérance avec boutons d'injection : Simulation de paquets GPS, spoofing de données Supabase lourdes, rendering sur Leaflet massifs et validations critiques (Webhook Clerks, SWR Caching Behavior).
- **Valeur pour l'utilisateur (Technicien) :** Offre un gain de temps massif et de la bande passante psychologique en Débogage de Production. Permet de certifier localement ("Ce code tourne sur le Runbook") l'opérabilité de l'app si d'aventure Supabase/Leaflet/Next tombe ou qu'une migration massive engendre un bottleneck réseau.
