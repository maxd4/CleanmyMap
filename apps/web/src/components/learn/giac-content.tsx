"use client";

import { useState } from"react";
import { motion, AnimatePresence } from"framer-motion";
import { FileText } from "lucide-react";
import { GIECReport, GIEC_REPORTS } from "@/data/content/giec-reports";

const getImpactColor = (impact: GIECReport['keyFindings'][0]['impact']) => {
 switch (impact) {
 case 'critical': return 'bg-red-500';
 case 'high': return 'bg-orange-500';
 case 'medium': return 'bg-amber-500';
 case 'low': return 'bg-green-500';
 default: return 'bg-slate-500';
 }
};

const getImpactLabel = (impact: GIECReport['keyFindings'][0]['impact']) => {
 switch (impact) {
 case 'critical': return 'Critique';
 case 'high': return 'Élevé';
 case 'medium': return 'Moyen';
 case 'low': return 'Faible';
 default: return 'Inconnu';
 }
};

export function GIECContent() {
 const [selectedReport, setSelectedReport] = useState<GIECReport | null>(null);

 return (
 <div className="space-y-8">
 {/* Header */}
 <div className="text-center space-y-4">
 <div className="flex items-center justify-center gap-3">
 <FileText className="text-blue-600" size={32} />
 <h2 className="text-3xl font-bold cmm-text-primary">Rapports du GIEC</h2>
 </div>
 <p className="text-lg cmm-text-secondary max-w-3xl mx-auto">
 Le Groupe d&apos;experts intergouvernemental sur l&apos;évolution du climat (GIEC) produit des rapports
 scientifiques qui font référence sur le changement climatique. Voici les conclusions clés
 vulgarisées pour une meilleure compréhension.
 </p>
 </div>

 {/* Reports Grid */}
 <div className="grid md:grid-cols-2 gap-6">
 {GIEC_REPORTS.map((report, index) => (
 <motion.button
 key={report.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.1 }}
 onClick={() => setSelectedReport(report)}
 className={`
 p-6 rounded-3xl backdrop-blur-sm border transition-all duration-300 text-left
 ${selectedReport?.id === report.id
 ? 'bg-white/90 border-blue-300 shadow-xl scale-105'
 : 'bg-white/60 border-slate-200 hover:bg-white/80 hover:border-slate-300 hover:shadow-lg'
 }
 `}
 >
 {/* Header */}
 <div className="flex items-start justify-between mb-4">
 <div className="flex-1">
 <div className="cmm-text-small font-bold text-blue-600 uppercase tracking-wider mb-1">
 GIEC {report.year}
 </div>
 <h3 className="text-lg font-bold cmm-text-primary leading-tight">
 {report.title}
 </h3>
 </div>
 <div className="text-2xl font-bold text-slate-300 ml-4">
 {report.year}
 </div>
 </div>

 {/* Focus */}
 <p className="cmm-text-secondary cmm-text-small mb-4 leading-relaxed">
 {report.focus}
 </p>

 {/* Key Findings Preview */}
 <div className="space-y-2">
 <p className="cmm-text-caption font-bold cmm-text-muted uppercase tracking-wider">
 Points clés ({report.keyFindings.length})
 </p>
 <div className="flex flex-wrap gap-2">
 {report.keyFindings.slice(0, 2).map((finding, idx) => (
 <div key={idx} className="flex items-center gap-1">
 <div className={`w-2 h-2 rounded-full ${getImpactColor(finding.impact)}`} />
 <span className="cmm-text-caption cmm-text-secondary">{getImpactLabel(finding.impact)}</span>
 </div>
 ))}
 {report.keyFindings.length > 2 && (
 <span className="cmm-text-caption cmm-text-muted">+{report.keyFindings.length - 2} autres</span>
 )}
 </div>
 </div>
 </motion.button>
 ))}
 </div>

 {/* Detail Modal */}
 <AnimatePresence>
 {selectedReport && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
 onClick={() => setSelectedReport(null)}
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="p-8 space-y-8">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="p-3 rounded-xl bg-blue-100">
 <FileText size={32} className="text-blue-600" />
 </div>
 <div>
 <div className="cmm-text-small font-bold text-blue-600 uppercase tracking-wider mb-1">
 Rapport GIEC {selectedReport.year}
 </div>
 <h3 className="text-2xl font-bold cmm-text-primary">
 {selectedReport.title}
 </h3>
 </div>
 </div>
 <button
 onClick={() => setSelectedReport(null)}
 className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
 >
 ✕
 </button>
 </div>

 {/* Focus */}
 <div className="p-6 bg-blue-50 rounded-2xl">
 <h4 className="text-lg font-bold text-blue-900 mb-2">Focus du rapport</h4>
 <p className="text-blue-800">{selectedReport.focus}</p>
 </div>

 {/* Key Findings */}
 <div>
 <h4 className="text-xl font-bold cmm-text-primary mb-6">Conclusions principales</h4>
 <div className="grid gap-4">
 {selectedReport.keyFindings.map((finding, index) => {
 const Icon = finding.icon;
 return (
 <motion.div
 key={index}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: index * 0.1 }}
 className="p-6 rounded-2xl bg-slate-50 border border-slate-200"
 >
 <div className="flex items-start gap-4">
 <div className={`p-3 rounded-xl ${getImpactColor(finding.impact)}`}>
 <Icon size={24} className="text-white" />
 </div>
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <h5 className="font-bold cmm-text-primary">{finding.title}</h5>
 <span className={`px-2 py-1 rounded-full cmm-text-caption font-bold text-white ${getImpactColor(finding.impact)}`}>
 {getImpactLabel(finding.impact)}
 </span>
 </div>
 <p className="cmm-text-secondary leading-relaxed">{finding.description}</p>
 </div>
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>

 {/* Implications */}
 <div>
 <h4 className="text-xl font-bold text-red-900 mb-4">Implications pour l&apos;humanité</h4>
 <div className="grid gap-3">
 {selectedReport.implications.map((implication, index) => (
 <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
 <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
 <span className="text-red-800">{implication}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Solutions */}
 <div>
 <h4 className="text-xl font-bold text-emerald-900 mb-4">Solutions et actions possibles</h4>
 <div className="grid gap-3">
 {selectedReport.solutions.map((solution, index) => (
 <div key={index} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-xl">
 <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
 <span className="text-emerald-800">{solution}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Call to Action */}
 <div className="p-6 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl text-white text-center">
 <h4 className="text-xl font-bold mb-2">Chaque action compte</h4>
 <p className="text-blue-100 mb-4">
 CleanMyMap vous aide à contribuer concrètement à la lutte contre le changement climatique
 en cartographiant et réduisant la pollution plastique.
 </p>
 <button className="px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors">
 Commencer à agir
 </button>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
}
