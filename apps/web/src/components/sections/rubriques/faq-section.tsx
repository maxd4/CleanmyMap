"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown, User, Building2, Heart, Users, Search, Sparkles, MessageCircleQuestion } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
  category: "citoyen" | "benevole" | "mairie" | "partenaire";
}

const FAQ_ITEMS: FAQItem[] = [
  // CATEGORY: CITOYEN
  {
    question: "Comment signaler un lieu sale ?",
    answer: "Ouvrez l'application CleanMyMap, localisez le point problématique sur la carte et cliquez sur 'Signaler'. Prenez une photo, décrivez le type de déchets et validez. Votre signalement sera validé par la modération.",
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
    answer: "Oui ! Créez un événement depuis la section Communauté. Précisez la date, lieu, nombre de bénévoles attendus. Vous pouvez ajouter un lieu sur la carte et Inviter d'autres bénévoles. Après l'événement, déclarerez les actions collectées.",
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
    answer: "Contactez-nous via le formulaire 'Devenir partenaire' ou directement sur partners@cleanmymap.fr. Nous vous fournissons un accès dédié et un accompagnement personnalisé.",
    category: "mairie",
  },
  // CATEGORY: PARTENAIRE
  {
    question: "Comment devenir partenaire de CleanMyMap ?",
    answer: "Les associations, entreprises et institutions peuvent devenir partenaires. Remplissez le formulaire sur la page Annuaire. Vous apparaîtrez dans notre répertoire et pourrez accéder à des ressources exclusives.",
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
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]["id"] | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openItems, setOpenItems] = useState<string[]>([]);

  const filteredItems = FAQ_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleItem = (question: string) => {
    setOpenItems((prev) => 
      prev.includes(question) ? prev.filter(q => q !== question) : [...prev, question]
    );
  };

  return (
    <SectionShell
      id="faq"
      title="Centre d'Aide"
      subtitle="Toutes les réponses à vos questions pour une utilisation optimale de la plateforme."
      icon={MessageCircleQuestion}
      gradient="from-blue-500/20 via-indigo-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Controls Row */}
        <div className="flex flex-col lg:flex-row gap-8 items-stretch lg:items-center justify-between">
           {/* Category Picker */}
           <div className="flex flex-wrap items-center gap-2 p-2 rounded-[2rem] bg-slate-950/40 border border-white/5 backdrop-blur-3xl shadow-2xl">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                  activeCategory === "all" ? "bg-white text-slate-950 shadow-2xl" : "text-slate-500 hover:text-white hover:bg-white/5"
                )}
              >
                Tous
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    activeCategory === cat.id ? "bg-white text-slate-950 shadow-2xl" : "text-slate-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  <cat.icon size={14} />
                  {cat.label}
                </button>
              ))}
           </div>

           {/* Search Box */}
           <div className="relative group min-w-[320px]">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une question..."
                className="w-full h-14 rounded-2xl border border-white/5 bg-slate-950/40 pl-14 pr-6 text-sm font-bold text-white shadow-inner transition-all focus:border-blue-500/40 focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-600"
              />
           </div>
        </div>

        {/* FAQ Grid/List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <AnimatePresence mode="popLayout">
              {filteredItems.map((item, idx) => (
                <motion.div
                  key={item.question}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className={cn(
                    "rounded-[2.5rem] border transition-all duration-500 overflow-hidden",
                    openItems.includes(item.question) 
                      ? "bg-white/5 border-white/20 shadow-2xl" 
                      : "bg-slate-900/40 border-white/5 hover:border-white/10"
                  )}
                >
                  <button
                    onClick={() => toggleItem(item.question)}
                    className="w-full text-left p-8 flex items-start justify-between gap-6 group"
                  >
                    <div className="space-y-2">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-blue-400 transition-colors">
                          {item.category}
                       </span>
                       <h4 className="text-lg font-black text-white tracking-tight leading-snug group-hover:translate-x-1 transition-transform">
                          {item.question}
                       </h4>
                    </div>
                    <div className={cn(
                      "mt-4 p-2 rounded-xl bg-white/5 border border-white/5 transition-transform duration-500",
                      openItems.includes(item.question) ? "rotate-180 bg-blue-500/20 border-blue-500/30 text-blue-400" : "text-slate-500"
                    )}>
                       <ChevronDown size={20} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {openItems.includes(item.question) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        <div className="px-8 pb-8 text-slate-400 text-sm font-medium leading-relaxed border-t border-white/5 pt-6">
                           {item.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
           </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="py-20 text-center space-y-6">
             <div className="p-6 w-20 h-20 rounded-full bg-slate-950/40 border border-white/5 mx-auto flex items-center justify-center text-slate-500">
                <HelpCircle size={40} />
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-white">Aucun résultat trouvé</h3>
                <p className="text-slate-500 font-bold">Essayez d'autres mots-clés ou changez de catégorie.</p>
             </div>
             <button
               onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}
               className="px-8 py-4 rounded-xl bg-white text-slate-950 text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all"
             >
                Réinitialiser
             </button>
          </div>
        )}

        {/* Support CTA */}
        <div className="p-10 rounded-[3rem] border border-white/5 bg-blue-600/10 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-8 group">
           <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-blue-400">
                 <Sparkles size={28} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">Encore des questions ?</h4>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notre équipe support vous répond sous 24h</p>
              </div>
           </div>
           <button className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/10 transition-all">
              Contacter le support
           </button>
        </div>
      </div>
    </SectionShell>
  );
}