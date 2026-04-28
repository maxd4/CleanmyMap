import { motion } from "framer-motion";
import { Sparkles, TrendingUp, Hash } from "lucide-react";

interface Topic {
  id: string;
  name: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'urgent';
}

const TOPICS: Topic[] = [
  { id: "1", name: "Dépôt sauvage 11e", count: 24, sentiment: 'urgent' },
  { id: "2", name: "Collecte Bastille", count: 18, sentiment: 'positive' },
  { id: "3", name: "Mégots", count: 15, sentiment: 'neutral' },
  { id: "4", name: "Recyclage verre", count: 12, sentiment: 'positive' },
  { id: "5", name: "Signalements", count: 30, sentiment: 'neutral' },
  { id: "6", name: "Compostage", count: 10, sentiment: 'positive' },
];

export function TopicNetworkGraph() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-3xl overflow-hidden relative">
      {/* Decorative background grid */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="text-center mb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 mb-3">
          <TrendingUp size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Sujets Chauds</span>
        </div>
        <h3 className="text-2xl font-black cmm-text-primary tracking-tight">Réseau de Discussion</h3>
        <p className="cmm-text-muted text-xs font-bold uppercase tracking-tighter mt-1">Intelligence collective en temps réel</p>
      </div>

      <div className="relative w-full max-w-xl h-[400px]">
        {TOPICS.map((topic, idx) => {
          // Semi-random positions for the "cloud" effect
          const x = 50 + Math.cos(idx * (Math.PI * 2 / TOPICS.length)) * 30;
          const y = 50 + Math.sin(idx * (Math.PI * 2 / TOPICS.length)) * 30;
          const size = 60 + (topic.count * 2);
          
          return (
            <motion.div
              key={topic.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1,
                x: `${x}%`,
                y: `${y}%`,
              }}
              whileHover={{ scale: 1.1, zIndex: 50 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            >
              <div 
                className={`flex flex-col items-center justify-center rounded-full shadow-2xl backdrop-blur-xl border border-white/20 transition-all duration-500 hover:shadow-glow-${topic.sentiment}`}
                style={{ 
                  width: size, 
                  height: size,
                  backgroundColor: topic.sentiment === 'urgent' ? 'rgba(239, 68, 68, 0.15)' : 
                                   topic.sentiment === 'positive' ? 'rgba(16, 185, 129, 0.15)' : 
                                   'rgba(99, 102, 241, 0.15)'
                }}
              >
                <Hash size={14} className={
                  topic.sentiment === 'urgent' ? 'text-red-500' : 
                  topic.sentiment === 'positive' ? 'text-emerald-500' : 
                  'text-violet-500'
                } />
                <span className="text-[10px] font-black cmm-text-primary mt-1 px-2 text-center leading-tight">
                  {topic.name}
                </span>
                <span className="text-[9px] font-bold opacity-50 mt-0.5">{topic.count} msg</span>
              </div>
              
              {/* Pulse effect for urgent topics */}
              {topic.sentiment === 'urgent' && (
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-red-500/20 rounded-full blur-xl -z-10"
                />
              )}
            </motion.div>
          );
        })}

        {/* Central Hub */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-inner border border-slate-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center animate-pulse">
              <Sparkles className="text-violet-500" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-8 flex gap-6">
        {[
          { label: 'Action Positive', color: 'bg-emerald-500' },
          { label: 'Alerte Urgente', color: 'bg-red-500' },
          { label: 'Neutre', color: 'bg-violet-500' }
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${item.color}`} />
            <span className="text-[9px] font-black uppercase tracking-widest cmm-text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
