"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { SustainableGoal, SUSTAINABLE_GOALS } from "@/data/content/sustainable-goals";

export function SustainableGoalsInteractive() {
 const [selectedGoal, setSelectedGoal] = useState<SustainableGoal | null>(null);
 const [hoveredGoal, setHoveredGoal] = useState<SustainableGoal | null>(null);

 return (
 <div className="space-y-8">
 <div className="text-center space-y-4">
 <h2 className="text-3xl font-bold cmm-text-primary">Les 17 Objectifs de Développement Durable</h2>
 <p className="text-lg cmm-text-secondary max-w-2xl mx-auto">
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
 <div className="absolute top-2 right-2 text-4xl font-bold cmm-text-primary">
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
 className={selectedGoal?.id === goal.id ? 'text-white' : 'cmm-text-secondary'}
 />
 </div>
 <h3 className="cmm-text-caption font-bold cmm-text-primary leading-tight">
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
 className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-slate-900 text-white cmm-text-caption px-3 py-2 rounded-lg whitespace-nowrap z-20"
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
 <span className="text-2xl font-bold cmm-text-muted">#{selectedGoal.number}</span>
 </div>
 <h3 className="text-3xl font-bold cmm-text-primary">
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
 <p className="text-lg cmm-text-secondary leading-relaxed">
 {selectedGoal.description}
 </p>

 {/* Targets */}
 <div>
 <h4 className="text-xl font-bold cmm-text-primary mb-4">Objectifs principaux</h4>
 <div className="grid gap-3">
 {selectedGoal.targets.map((target, index) => (
 <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
 <div className={`w-2 h-2 rounded-full ${selectedGoal.color} mt-2 flex-shrink-0`} />
 <span className="cmm-text-secondary">{target}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Indicators */}
 <div>
 <h4 className="text-xl font-bold cmm-text-primary mb-4">Indicateurs de suivi</h4>
 <div className="grid gap-3">
 {selectedGoal.indicators.map((indicator, index) => (
 <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
 <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
 <span className="cmm-text-secondary">{indicator}</span>
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