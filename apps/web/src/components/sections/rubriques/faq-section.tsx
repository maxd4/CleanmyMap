"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, User, Building2, Heart, Users } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: "citoyen" | "benevole" | "mairie" | "partenaire";
}

const FAQ_ITEMS: FAQItem[] = [
  // CATEGORY: CITOYEN
  {
    question: "Comment signaler un lieu sale ?",
    answer: "Ouvrez l'application CleanMyMap, localizez le point problématique sur la carte et cliquez sur 'Signaler'. Prenez une photo, décrivez le type de déchets et validez. Votre signalement sera validé par la modération.",
    category: "citoyen",
  },
  {
    question: "Le signalement est-il gratuit ?",
    answer: "Oui, entièrement gratuit. CleanMyMap est une plateforme citoyenne ouverte à tous. Aucune inscription requise pour signaler, mais un compte vous permet de suivre l'historique de vos signalements.",
    category: "citoyen",
  },
  {
    question: "Que se passe-t-il après mon signalement ?",
    answer: "Votre signalement est examiné par notre équipe de modération (24-72h). S'il est validé, il apparaît sur la carte. Les données alimentent notre index de pollution locale et peuvent déclencher des opérations de nettoyage.",
    category: "citoyen",
  },
  {
    question: "Puis-je demander le nettoyage d'un lieu spécifique ?",
    answer: "CleanMyMap n'organise pas directement le nettoyage mais met en relation. Vous pouvez signaler un point sale qui sera potentiellement traité lors d'un cleanup communautaire ou par les services municipaux.",
    category: "citoyen",
  },
  // CATEGORY: BENEVOLE
  {
    question: "Comment déclarer une action de nettoyage ?",
    answer: "Allez dans la section 'Déclarer' de l'app, remplissez le formulaire avec la date, durée, quantité de déchets collectés (kg) et nombre de mégots. Ajoutez des photos avant/après et validez. Votre impact sera calculé automatiquement.",
    category: "benevole",
  },
  {
    question: "Comment sont calculés les points d'impact ?",
    answer: "L'impact = kg collectés × 2.5kg CO2 évité + mégots × 500L eau préservée + surface nettoyée. Tous les calculs sont transparents et documentés dans la page Méthodologie du site.",
    category: "benevole",
  },
  {
    question: "Puis-je organiser un événement de nettoyage ?",
    answer: "Oui ! Créez un événement depuis la section Communauté. Précisez la date, lieu, nombre de bénévoles attendus. Vous pouvez ajouter un lieu sur la carte et Inviter d'autres bénévoles. Après l'événement, déclarerez les actions.collectées.",
    category: "benevole",
  },
  {
    question: "Comment obtenir mon certificat d'impact ?",
    answer: "Après chaque action déclarée et validée, accédez à votre profil pour télécharger votre certificat personnalisé. Il affiche votre contribution (kg, CO2, eau) et votre niveau de bénévole.",
    category: "benevole",
  },
  // CATEGORY: MAIRIE
  {
    question: "Comment une mairie peut-elle utiliser CleanMyMap ?",
    answer: "Les collectivités peuvent accéder au tableau de bord dédié : consulter les signalements, suivre les actions déclarées, analyser les zones à forte pollution et piloter les opérations de nettoyage. Demandez l'accès via le formulaire partenaire.",
    category: "mairie",
  },
  {
    question: "Les données sont-elles accessibles aux collectivités ?",
    answer: "Oui, les mairies partenaires peuvent exporter les données de leur territoire : historique des signalements, statistiques d'actions, cartographie des zones problématiques. Tout est anonymisé.",
    category: "mairie",
  },
  {
    question: "CleanMyMap remplace-t-il les services de propreté ?",
    answer: "Non, CleanMyMap est un outil complémentaire. Les données collectées aident les services municipaux à cibler leurs interventions, mais le nettoyage reste de leur responsabilité.",
    category: "mairie",
  },
  {
    question: "Comment solliciter un partenariat mairie ?",
    answer: "Contactez-nous via le formulaire 'Devenir partenaire' ou directement sur partners@cleanmymap.fr. Nous为您提供 un accès dédié et un accompagnement personnalisé.",
    category: "mairie",
  },
  // CATEGORY: PARTENAIRE
  {
    question: "Comment devenir partenaire de CleanMyMap ?",
    answer: "Les associations, entreprises et institutions peuvent devenir partenaires. Remplissez le formulaire sur la page Annuaire. Vous apparaîtrez dans notre répertoire et pourrez accéder à des ressources专属.",
    category: "partenaire",
  },
  {
    question: "Puis-je promouvoir mes événements sur la plateforme ?",
    answer: "Oui, les partenaires peuvent publier des événements de nettoyage via la section Communauté. Les événements sont visibles par tous les bénévoles et facilitent la mobilisation.",
    category: "partenaire",
  },
  {
    question: "CleanMyMap est-il open source ?",
    answer: "Partiellement. Les algorithmes de calcul d'impact sont transparents et documentés (page Méthodologie). Le code de la plateforme est partiellement ouvert. Contactez-nous pour plus d'informations techniques.",
    category: "partenaire",
  },
];

const CATEGORIES = [
  { id: "citoyen", label: "Citoyen", icon: User },
  { id: "benevole", label: "Bénévole", icon: Heart },
  { id: "mairie", label: "Mairie", icon: Building2 },
  { id: "partenaire", label: "Partenaire", icon: Users },
] as const;

export function FAQSection() {
  const [activeCategory, setActiveCategory] = useState<string>("citoyen");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filteredFAQs = FAQ_ITEMS.filter(faq => faq.category === activeCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-lg"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-500/10 flex items-center justify-center">
          <HelpCircle size={24} className="text-slate-600" />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight cmm-text-primary">
            Foire Aux Questions
          </h3>
          <p className="text-sm text-slate-500">
            Réponses aux questions les plus fréquentes
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <cat.icon size={14} />
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredFAQs.map((faq, index) => {
          const isExpanded = expandedId === index;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-slate-100 overflow-hidden shadow-sm bg-white/50 backdrop-blur-sm"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : index)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium cmm-text-primary pr-4">{faq.question}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-sm cmm-text-secondary leading-relaxed border-t border-slate-100 pt-3">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-slate-50/80 backdrop-blur-sm border border-slate-100 shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          💡 Votre question n'est pas listée ? 
          <a href="/contact" className="text-emerald-600 hover:underline ml-1">Contactez-nous</a>
        </p>
      </div>
    </motion.div>
  );
}