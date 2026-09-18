## Annexe B — Méthodologie de calcul et incertitudes {#annexe-b-methodologie-de-calcul-et-incertitudes}

### Facteurs d'émission de référence

Les calculs s'appuient sur les données de la **Base Empreinte de l'ADEME** et les rapports de durabilité des fournisseurs cloud :

- **Électricité (France)** : 0,052 kgCO₂e / kWh.
- **Électricité (Moyenne Cloud Global)** : ~0,4 kgCO₂e / kWh.
- **Eau (Refroidissement Data Center)** : ~0,5 L / kWh consommé.
- **Inférence IA (GPT-4 class)** : ~0,01 kgCO₂e par requête complexe (incluant amortissement infrastructure).

### Hypothèses de consommation

- **Développement** : Un compilation CI/CD complet consomme environ 0,1 kWh. Le développement assisté par IA (2000+ invites) est estimé à une dette initiale de 50 kgCO₂e.
- **Usage Web** : 1 Go de données transférées équivaut à environ 0,02 kgCO₂e selon le mix énergétique moyen.
- **Stockage** : 1 Go stocké pendant un an génère environ 0,05 kgCO₂e.

### Marges d'incertitude

Les résultats présentés comportent des marges d'erreur inhérentes à l'opacité des infrastructures logiciel en tant que service :

- **Incertitude Cloud** : ± 30 % (dépend du mix énergétique réel au moment du calcul).
- **Incertitude IA** : ± 50 % (l'impact de l'entraînement des modèles propriétaires n'est pas auditable précisément).
- **Incertitude Matérielle** : ± 20 % (basée sur des moyennes d'ACV serveurs génériques).

### B.4 Limites des estimations

Les estimations restent des ordres de grandeur utiles pour l'arbitrage, mais elles ne doivent pas être lues comme des mesures instrumentées. Elles dépendent des hypothèses de calcul, des données disponibles et du périmètre retenu.
