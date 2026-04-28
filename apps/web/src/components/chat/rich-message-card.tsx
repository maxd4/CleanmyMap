import { motion } from "framer-motion";
import { MessageSquare, Tag, Zap, Image as ImageIcon, MapPin, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface RichMessageCardProps {
  message: {
    id: string;
    content: string;
    sender: {
      display_name: string;
      handle: string;
      avatar_url: string;
    };
    created_at: string;
    attachment_url?: string;
  };
  isMe: boolean;
}

export function RichMessageCard({ message, isMe }: RichMessageCardProps) {
  // Simple "AI Detection" simulation for demo purposes
  const isActionRelated = /collecte|nettoyage|ramassage|déchets|pollution|bravo/i.test(message.content);
  const isQuestionRelated = /\?|comment|pourquoi|où/i.test(message.content);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 mb-6 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar with Status Ring */}
      <div className="relative shrink-0">
        <div className={`absolute -inset-1 rounded-2xl blur-sm opacity-20 ${isMe ? 'bg-violet-500' : 'bg-emerald-500'}`} />
        <img 
          src={message.sender.avatar_url || `https://ui-avatars.com/api/?name=${message.sender.display_name}`} 
          className="w-10 h-10 rounded-2xl relative z-10 border-2 border-white dark:border-slate-800 shadow-xl"
          alt="" 
        />
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center z-20 ${isMe ? 'bg-violet-500' : 'bg-emerald-500'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[11px] font-black cmm-text-primary uppercase tracking-tight">
            {message.sender.display_name}
          </span>
          <span className="text-[10px] font-bold text-violet-500/60 lowercase">
            @{message.sender.handle}
          </span>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
          </span>
        </div>

        {/* Bubble */}
        <div className={`relative group p-4 rounded-[2rem] shadow-lg transition-all duration-300 ${
          isMe 
            ? 'bg-violet-600 text-white rounded-tr-none' 
            : 'bg-white dark:bg-slate-900 cmm-text-secondary border border-slate-100 dark:border-slate-800 rounded-tl-none'
        }`}>
          {/* Smart Tags (AI Simulation) */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {isActionRelated && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                isMe ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              }`}>
                <Zap size={10} /> Action Terrain
              </div>
            )}
            {isQuestionRelated && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                isMe ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
              }`}>
                <MessageSquare size={10} /> Question
              </div>
            )}
            {message.attachment_url && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                isMe ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
              }`}>
                <ImageIcon size={10} /> Preuve Visuelle
              </div>
            )}
          </div>

          <div className={`cmm-text-small font-medium leading-relaxed ${isMe ? 'text-white' : 'cmm-text-secondary'}`}>
            {message.content}
          </div>

          {/* Attachment */}
          {message.attachment_url && (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="mt-3 rounded-2xl overflow-hidden shadow-2xl relative group/img"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-3">
                <div className="flex items-center gap-2 text-white text-[10px] font-black uppercase">
                  <MapPin size={12} /> Voir sur la carte
                </div>
              </div>
              <img 
                src={message.attachment_url} 
                alt="Attachment" 
                className="w-full object-cover max-h-60"
              />
            </motion.div>
          )}

          {/* Micro-interaction logic for reactions would go here */}
        </div>
        
        {/* Magic Glow behind bubble */}
        {isActionRelated && !isMe && (
          <div className="absolute -z-10 w-full h-full bg-emerald-400/10 blur-2xl rounded-full" />
        )}
      </div>
    </motion.div>
  );
}
