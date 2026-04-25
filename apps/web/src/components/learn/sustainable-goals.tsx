"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  GraduationCap,
  Users,
  Flower,
  Briefcase,
  Lightbulb,
  Zap,
  Factory,
  Building,
  Recycle,
  DollarSign,
  Leaf,
  Fish,
  Mountain,
  Scale,
  Droplets,
  HandHeart,
  Globe
} from "lucide-react";

interface SustainableGoal {
  id: number;
  number: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  description: string;
  targets: string[];
  indicators: string[];
  cleanMapRelevance: string;
}

const SUSTAINABLE_GOALS: SustainableGoal[] = [
  {
    id: 1,
    number: "01",
    title: "Éliminer la pauvreté",
    icon: DollarSign,
    color: "bg-red-500",
    description: "Éliminer l'extrême pauvreté pour tous, partout dans le monde.",
    targets: [
      "Réduire de moitié la proportion de personnes vivant dans l'extrême pauvreté",
      "Mettre en place des systèmes de protection sociale pour tous",
      "Assurer l'égalité des droits à la propriété économique"
    ],
    indicators: [
      "Taux de pauvreté extrême (< 1,90 $/jour)",
      "Couverture des systèmes de protection sociale",
      "Proportion de population couverte par des droits sociaux"
    ],
    cleanMapRelevance: "La pollution plastique affecte disproportionnellement les populations vulnérables vivant près des décharges sauvages."
  },
  {
    id: 2,
    number: "02",
    title: "Faim « Zéro »",
    icon: Leaf,
    color: "bg-amber-500",
    description: "Éliminer la faim, assurer la sécurité alimentaire et promouvoir l'agriculture durable.",
    targets: [
      "Éliminer la faim et assurer l'accès à une alimentation saine",
      "Doubler la productivité agricole et les revenus des petits producteurs",
      "Maintenir la diversité génétique des semences et plantes cultivées"
    ],
    indicators: [
      "Prévalence de l'insécurité alimentaire",
      "Indice de production alimentaire par habitant",
      "Proportion de terres agricoles sous pratiques durables"
    ],
    cleanMapRelevance: "La pollution plastique contamine les sols agricoles et les chaînes alimentaires."
  },
  {
    id: 3,
    number: "03",
    title: "Bonne santé",
    icon: Heart,
    color: "bg-green-500",
    description: "Assurer une vie saine et promouvoir le bien-être pour tous à tout âge.",
    targets: [
      "Réduire le taux de mortalité maternelle",
      "Mettre fin aux épidémies de paludisme, de la tuberculose et du sida",
      "Réduire d'un tiers la mortalité prématurée due aux maladies non transmissibles"
    ],
    indicators: [
      "Taux de mortalité maternelle",
      "Taux de mortalité infantile",
      "Couverture vaccinale contre la diphtérie, le tétanos et la coqueluche"
    ],
    cleanMapRelevance: "Les microplastiques et polluants chimiques présents dans l'environnement contribuent aux maladies chroniques."
  },
  {
    id: 4,
    number: "04",
    title: "Éducation de qualité",
    icon: GraduationCap,
    color: "bg-red-600",
    description: "Assurer l'accès de tous à une éducation de qualité, sur un pied d'égalité.",
    targets: [
      "Assurer l'accès de tous à l'éducation préscolaire",
      "Assurer l'accès de tous à une éducation primaire et secondaire gratuite et de qualité",
      "Éliminer les disparités entre les sexes dans l'éducation"
    ],
    indicators: [
      "Taux d'achèvement de l'enseignement primaire",
      "Taux d'alphabétisation des jeunes",
      "Proportion d'élèves ayant atteint au moins un niveau minimum de compétence"
    ],
    cleanMapRelevance: "L'éducation environnementale est essentielle pour sensibiliser les générations futures à la pollution plastique."
  },
  {
    id: 5,
    number: "05",
    title: "Égalité entre les sexes",
    icon: Flower,
    color: "bg-orange-500",
    description: "Parvenir à l'égalité des sexes et autonomiser toutes les femmes et les filles.",
    targets: [
      "Mettre fin à toutes les formes de discrimination à l'égard des femmes",
      "Éliminer toutes les formes de violence à l'égard des femmes",
      "Éliminer les pratiques préjudiciables telles que le mariage des enfants"
    ],
    indicators: [
      "Proportion de femmes siégeant au parlement",
      "Proportion de femmes victimes de violence physique ou sexuelle",
      "Proportion de filles et de garçons âgés de 5 à 17 ans soumis au travail des enfants"
    ],
    cleanMapRelevance: "Les femmes et les filles sont souvent les plus exposées aux risques liés à la pollution plastique dans les pays en développement."
  },
  {
    id: 6,
    number: "06",
    title: "Eau propre et assainissement",
    icon: Droplets,
    color: "bg-blue-500",
    description: "Assurer l'accès de tous à l'eau et à l'assainissement et assurer une gestion durable des ressources en eau.",
    targets: [
      "Assurer l'accès universel à l'eau potable",
      "Assurer l'accès à l'assainissement et à l'hygiène pour tous",
      "Améliorer la qualité de l'eau en réduisant la pollution"
    ],
    indicators: [
      "Proportion de population utilisant des services d'eau potable gérés en sécurité",
      "Proportion de population utilisant des services d'assainissement gérés en sécurité",
      "Changement dans l'utilisation efficace des ressources en eau"
    ],
    cleanMapRelevance: "La pollution plastique contamine les sources d'eau douce et les systèmes d'assainissement."
  },
  {
    id: 7,
    number: "07",
    title: "Énergie propre et d'un coût abordable",
    icon: Zap,
    color: "bg-yellow-500",
    description: "Garantir l'accès de tous à des services énergétiques fiables, durables et modernes, à un coût abordable.",
    targets: [
      "Assurer l'accès universel à des services énergétiques modernes et abordables",
      "Augmenter considérablement la part des énergies renouvelables",
      "Doubler le taux d'amélioration de l'efficacité énergétique"
    ],
    indicators: [
      "Proportion de population ayant accès à l'électricité",
      "Part des énergies renouvelables dans la consommation finale d'énergie",
      "Intensité énergétique mesurée en termes de PIB"
    ],
    cleanMapRelevance: "La production d'énergie renouvelable réduit la dépendance aux combustibles fossiles qui alimentent l'industrie plastique."
  },
  {
    id: 8,
    number: "08",
    title: "Travail décent et croissance économique",
    icon: Briefcase,
    color: "bg-red-700",
    description: "Promouvoir une croissance économique soutenue, partagée et durable, le plein emploi productif et un travail décent pour tous.",
    targets: [
      "Soutenir la croissance économique durable par habitant",
      "Améliorer la productivité par l'innovation et la diversification",
      "Promouvoir des politiques axées sur le développement durable"
    ],
    indicators: [
      "Taux de croissance du PIB par habitant",
      "Taux d'emploi des jeunes (15-24 ans)",
      "Proportion de travailleurs vivant avec moins de 1,90 $ par jour"
    ],
    cleanMapRelevance: "L'économie circulaire du plastique peut créer des emplois durables dans le recyclage et la gestion des déchets."
  },
  {
    id: 9,
    number: "09",
    title: "Industrie, innovation et infrastructure",
    icon: Factory,
    color: "bg-orange-600",
    description: "Construire une infrastructure résiliente, promouvoir une industrialisation durable qui profite à tous et encourager l'innovation.",
    targets: [
      "Développer des infrastructures de qualité, fiables et durables",
      "Promouvoir une industrialisation durable",
      "Augmenter l'accès des PME aux services financiers"
    ],
    indicators: [
      "Proportion de la population vivant à moins de 2 km d'une gare routière",
      "Part de l'industrie manufacturière dans le PIB",
      "Proportion de PME ayant accès à un crédit bancaire"
    ],
    cleanMapRelevance: "L'innovation dans les matériaux recyclables et les infrastructures de gestion des déchets est cruciale."
  },
  {
    id: 10,
    number: "10",
    title: "Inégalités réduites",
    icon: Scale,
    color: "bg-pink-500",
    description: "Réduire les inégalités dans les pays et d'un pays à l'autre.",
    targets: [
      "Réduire l'inégalité des revenus",
      "Autonomiser et promouvoir l'inclusion sociale, économique et politique de tous",
      "Assurer l'égalité des chances et réduire les inégalités de résultats"
    ],
    indicators: [
      "Coefficient de Gini des revenus",
      "Proportion de population vivant en dessous de 50 % du revenu médian",
      "Proportion de personnes couvertes par des systèmes de protection sociale"
    ],
    cleanMapRelevance: "La pollution plastique affecte disproportionnellement les populations les plus vulnérables et les pays en développement."
  },
  {
    id: 11,
    number: "11",
    title: "Villes et communautés durables",
    icon: Building,
    color: "bg-orange-700",
    description: "Faire en sorte que les villes et les établissements humains soient ouverts à tous, sûrs, résilients et durables.",
    targets: [
      "Assurer l'accès de tous à un logement et des services de base abordables",
      "Fournir un transport urbain sûr, abordable et durable",
      "Rendre les villes plus résilientes face aux changements climatiques"
    ],
    indicators: [
      "Proportion de population urbaine vivant dans des bidonvilles",
      "Proportion de villes avec un plan de gestion des déchets",
      "Proportion de population satisfaite de son dernier trajet en transport public"
    ],
    cleanMapRelevance: "Les villes génèrent 80% des déchets plastiques mondiaux. CleanMyMap aide à cartographier et réduire cette pollution urbaine."
  },
  {
    id: 12,
    number: "12",
    title: "Consommation et production responsables",
    icon: Recycle,
    color: "bg-amber-600",
    description: "Établir des modes de consommation et de production durables.",
    targets: [
      "Mettre en œuvre le cadre décennal de programmation sur les modes de consommation et de production durables",
      "Réduire de moitié le gaspillage alimentaire par habitant",
      "Réduire considérablement la production de déchets par la prévention, la réduction et le recyclage"
    ],
    indicators: [
      "Taux de recyclage des déchets municipaux",
      "Consommation intérieure de matériaux par habitant",
      "Proportion de poissons issus de stocks gérés de manière durable"
    ],
    cleanMapRelevance: "CleanMyMap promeut directement ce objectif en permettant la réduction et la cartographie des déchets plastiques."
  },
  {
    id: 13,
    number: "13",
    title: "Lutte contre les changements climatiques",
    icon: Globe,
    color: "bg-green-600",
    description: "Prendre d'urgence des mesures pour lutter contre les changements climatiques et leurs répercussions.",
    targets: [
      "Renforcer la résilience et la capacité d'adaptation face aux risques liés au climat",
      "Intégrer les mesures relatives aux changements climatiques dans les politiques nationales",
      "Améliorer l'éducation et la sensibilisation aux changements climatiques"
    ],
    indicators: [
      "Nombre de décès, de personnes disparues et d'endommagements directs dus aux catastrophes",
      "Nombre de pays ayant intégré l'adaptation aux changements climatiques dans leurs politiques",
      "Montant mobilisé pour le financement climatique"
    ],
    cleanMapRelevance: "La pollution plastique contribue aux changements climatiques et CleanMyMap aide à réduire cette contribution."
  },
  {
    id: 14,
    number: "14",
    title: "Vie aquatique",
    icon: Fish,
    color: "bg-blue-600",
    description: "Conserver et exploiter de manière durable les océans, les mers et les ressources marines.",
    targets: [
      "Prévenir et réduire considérablement la pollution marine de tous types",
      "Gérer et protéger durablement les écosystèmes marins et côtiers",
      "Réduire au minimum les incidences de l'acidification des océans"
    ],
    indicators: [
      "Indice de santé des écosystèmes côtiers",
      "Proportion de zones marines importantes conservées par des mesures de protection",
      "Taux d'acidification des océans (pH)"
    ],
    cleanMapRelevance: "CleanMyMap cartographie la pollution plastique qui atteint les océans et menace la vie aquatique."
  },
  {
    id: 15,
    number: "15",
    title: "Vie terrestre",
    icon: Mountain,
    color: "bg-green-700",
    description: "Préserver et restaurer les écosystèmes terrestres, en veillant à les exploiter de façon durable.",
    targets: [
      "Assurer la conservation, la restauration et l'utilisation durable des écosystèmes terrestres",
      "Promouvoir la gestion durable des forêts",
      "Lutter contre la désertification et restaurer les terres dégradées"
    ],
    indicators: [
      "Proportion de terres forestières",
      "Indice de biodiversité des espèces terrestres",
      "Proportion de terres dégradées restaurées"
    ],
    cleanMapRelevance: "La pollution plastique affecte les écosystèmes terrestres et CleanMyMap aide à identifier et nettoyer ces zones."
  },
  {
    id: 16,
    number: "16",
    title: "Paix, justice et institutions efficaces",
    icon: Scale,
    color: "bg-blue-700",
    description: "Promouvoir l'avènement de sociétés pacifiques et inclusives aux fins du développement durable.",
    targets: [
      "Réduire considérablement toutes les formes de violence et les taux de mortalité qui y sont associés",
      "Mettre fin aux mauvais traitements, à l'exploitation et à la traite des enfants",
      "Promouvoir l'état de droit au niveau national et international"
    ],
    indicators: [
      "Taux d'homicides intentionnels",
      "Proportion d'enfants victimes de violence",
      "Proportion de population victime de violence physique ou sexuelle"
    ],
    cleanMapRelevance: "La justice environnementale nécessite des institutions efficaces pour réguler la pollution plastique."
  },
  {
    id: 17,
    number: "17",
    title: "Partenariats pour la planète",
    icon: HandHeart,
    color: "bg-slate-600",
    description: "Renforcer les moyens de mettre en œuvre le Partenariat mondial pour le développement durable et l'adapter.",
    targets: [
      "Renforcer la mobilisation des ressources internes pour améliorer la capacité domestique",
      "Améliorer le partenariat Nord-Sud et Sud-Sud",
      "Tirer parti du potentiel de la technologie pour atteindre les objectifs"
    ],
    indicators: [
      "APD en pourcentage du RNB des pays donateurs",
      "Nombre d'accords de partenariat pour le développement durable",
      "Proportion de produits de base répondant aux normes internationales"
    ],
    cleanMapRelevance: "CleanMyMap est un exemple de partenariat technologique pour atteindre les objectifs de développement durable."
  }
];

export function SustainableGoalsInteractive() {
  const [selectedGoal, setSelectedGoal] = useState<SustainableGoal | null>(null);
  const [hoveredGoal, setHoveredGoal] = useState<SustainableGoal | null>(null);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-black text-slate-900">Les 17 Objectifs de Développement Durable</h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Adoptés par l&apos;ONU en 2015, les ODD constituent un plan d&apos;action universel pour éradiquer la pauvreté,
          protéger la planète et assurer la prospérité pour tous d&apos;ici 2030.
        </p>
      </div>

      {/* Interactive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {SUSTAINABLE_GOALS.map((goal, index) => {
          const Icon = goal.icon;
          return (
            <motion.button
              key={goal.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedGoal(goal)}
              onMouseEnter={() => setHoveredGoal(goal)}
              onMouseLeave={() => setHoveredGoal(null)}
              className={`
                relative aspect-square rounded-2xl backdrop-blur-sm border transition-all duration-300 overflow-hidden
                ${selectedGoal?.id === goal.id
                  ? 'scale-110 shadow-2xl z-10'
                  : hoveredGoal?.id === goal.id
                  ? 'scale-105 shadow-lg'
                  : 'hover:scale-102'
                }
              `}
              style={{
                background: `linear-gradient(135deg, ${goal.color}20 0%, ${goal.color}10 100%)`,
                borderColor: selectedGoal?.id === goal.id ? goal.color : 'rgb(226 232 240)'
              }}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-2 right-2 text-4xl font-black text-slate-900">
                  {goal.number}
                </div>
              </div>

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
                <div className={`
                  p-3 rounded-xl mb-3 transition-all
                  ${selectedGoal?.id === goal.id ? goal.color : 'bg-white/80'}
                `}>
                  <Icon
                    size={24}
                    className={selectedGoal?.id === goal.id ? 'text-white' : 'text-slate-600'}
                  />
                </div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  {goal.title}
                </h3>
              </div>

              {/* Hover Tooltip */}
              <AnimatePresence>
                {hoveredGoal?.id === goal.id && selectedGoal?.id !== goal.id && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-20"
                  >
                    {goal.title}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedGoal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedGoal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${selectedGoal.color}`}>
                      <selectedGoal.icon size={40} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-black text-slate-400">#{selectedGoal.number}</span>
                      </div>
                      <h3 className="text-3xl font-black text-slate-900">
                        {selectedGoal.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedGoal(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Description */}
                <p className="text-lg text-slate-700 leading-relaxed">
                  {selectedGoal.description}
                </p>

                {/* Targets */}
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-4">Objectifs principaux</h4>
                  <div className="grid gap-3">
                    {selectedGoal.targets.map((target, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className={`w-2 h-2 rounded-full ${selectedGoal.color} mt-2 flex-shrink-0`} />
                        <span className="text-slate-700">{target}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicators */}
                <div>
                  <h4 className="text-xl font-bold text-slate-900 mb-4">Indicateurs de suivi</h4>
                  <div className="grid gap-3">
                    {selectedGoal.indicators.map((indicator, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                        <span className="text-slate-700">{indicator}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CleanMap Relevance */}
                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <h4 className="text-xl font-bold text-emerald-900 mb-3">Lien avec CleanMyMap</h4>
                  <p className="text-emerald-800 leading-relaxed">
                    {selectedGoal.cleanMapRelevance}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}