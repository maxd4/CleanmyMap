"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Shield, Users, Lock, Send, Paperclip, X, User, LayoutGrid, Share2, Sparkles } from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getChatFeedState } from "./chat-feed-state";

import { RichMessageCard } from "./rich-message-card";
import { TopicNetworkGraph } from "./topic-network-graph";

type ChatMessage = {
  id: string;
  content: string;
  channel_type: 'dm' | 'neighborhood' | 'governance' | 'executive';
  attachment_url?: string;
  created_at: string;
  sender: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.hint === "string"
        ? payload.hint
        : typeof payload?.message === "string"
        ? payload.message
        : "Le service de discussion est momentanément indisponible. Nous tentons de rétablir la connexion.";
    throw new Error(message);
  }
  return payload;
};

export function ChatShell({ initialArrondissement }: { initialArrondissement?: number }) {
  const [activeChannel, setActiveChannel] = useState<{
    type: ChatMessage['channel_type'];
    id?: string;
    label: string;
  }>({ type: 'neighborhood', label: "Voisinage" });

  const [viewMode, setViewMode] = useState<'messages' | 'graph'>('messages');
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mentions search
  const { data: userData } = useSWR(
    showMentions ? `/api/chat/users?q=${mentionQuery}` : null,
    fetcher
  );

  // Clerk user
  const { user } = useUser();
  const userId = user?.id;
  const supabase = getSupabaseBrowserClient();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@([a-z0-9_]*)$/i);

    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (handle: string) => {
    const lastAt = message.lastIndexOf("@");
    const newText = message.slice(0, lastAt) + `@${handle} ` + message.slice(lastAt + mentionQuery.length + 1);
    setMessage(newText);
    setShowMentions(false);
  };

  // Polling every 30s as requested
  const { data, error, isLoading, mutate } = useSWR(
    `/api/chat?channelType=${activeChannel.type}${activeChannel.type === 'neighborhood' ? `&arrondissementId=${initialArrondissement || 11}` : ''}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const messages: ChatMessage[] = data?.messages || [];
  const feedState = getChatFeedState({
    isLoading,
    hasMessages: messages.length > 0,
    hasError: Boolean(error),
  });

  useEffect(() => {
    if (scrollRef.current && viewMode === 'messages') {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, viewMode]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setSendError("Connectez-vous pour envoyer un message.");
      return;
    }
    if ((!message.trim() && !file) || isSending || isUploading) return;

    setIsSending(true);
    let attachmentUrl = undefined;
    let attachmentType = undefined;

    try {
      // 1. Upload file if present
      if (file) {
        setIsUploading(true);
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${activeChannel.type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);
        
        attachmentUrl = publicUrl;
        attachmentType = file.type;
      }

      setSendError(null);

      // 2. Optimistic Update
      const optimisticMsg = {
        id: `opt-${Date.now()}`,
        content: message,
        channel_type: activeChannel.type,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString(),
        sender: {
          display_name: user?.fullName || user?.username || "Moi",
          handle: user?.username || "moi",
          avatar_url: user?.imageUrl || "",
        }
      };
      
      mutate({ ...data, messages: [...(data?.messages || []), optimisticMsg] }, { revalidate: false });
      
      const currentMessage = message;
      setMessage("");
      setFile(null);

      // 3. Send Message
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: activeChannel.type,
          content: currentMessage,
          arrondissementId: activeChannel.type === 'neighborhood' ? (initialArrondissement || 11) : undefined,
          attachmentUrl,
          attachmentType,
        }),
      });

      if (res.ok) {
        mutate();
      } else {
        const payload = await res.json().catch(() => ({}));
        const messageFromApi =
          typeof payload?.hint === "string"
            ? payload.hint
            : typeof payload?.message === "string"
            ? payload.message
            : "Envoi impossible pour le moment. Veuillez réessayer.";
        setSendError(messageFromApi);
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError("Une erreur est survenue lors de l'envoi de votre message. Vérifiez votre connexion.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleUpdateHandle = async () => {
    if (!newHandle.trim()) return;
    try {
      const res = await fetch("/api/users/profile/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: newHandle }),
      });
      if (res.ok) {
        setIsEditingHandle(false);
        location.reload(); 
      } else {
        const err = await res.json();
        alert(err.error || "Impossible de mettre à jour votre profil. Veuillez réessayer.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[700px] cmm-surface rounded-[2.5rem] border overflow-hidden shadow-2xl relative">
      {/* Dynamic Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center text-violet-600 shadow-inner">
            {activeChannel.type === 'neighborhood' ? <Users size={22} /> : 
             activeChannel.type === 'governance' ? <Shield size={22} /> :
             activeChannel.type === 'executive' ? <Lock size={22} /> : <User size={22} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg cmm-text-primary uppercase tracking-tighter">
                {activeChannel.label}
              </h3>
              <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 text-[9px] font-black uppercase tracking-widest animate-pulse">
                Live
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} className="text-violet-500" />
              Intelligence Collective
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setViewMode('messages')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'messages' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <MessageSquare size={18} />
            </button>
            <button 
              onClick={() => setViewMode('graph')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Share2 size={18} />
            </button>
          </div>
          
          <button 
            onClick={() => setIsEditingHandle(!isEditingHandle)}
            className="w-10 h-10 rounded-xl cmm-surface-muted flex items-center justify-center cmm-text-muted hover:text-violet-500 hover:shadow-lg transition-all"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {isEditingHandle && (
        <div className="p-5 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/50 flex items-center gap-4 animate-in slide-in-from-top-4 relative z-20">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-violet-700 dark:text-violet-400 mb-2 tracking-widest">Identité Numérique</p>
            <input 
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="votre_pseudo_unique"
              className="w-full bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-2 cmm-text-small font-bold focus:ring-4 focus:ring-violet-500/10 outline-none"
            />
          </div>
          <button 
            onClick={handleUpdateHandle}
            className="mt-6 px-6 py-2 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
          >
            Confirmer
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Advanced Sidebar */}
        <div className="w-20 md:w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col p-3 space-y-3">
          <ChannelButton 
            active={activeChannel.type === 'neighborhood'} 
            onClick={() => setActiveChannel({ type: 'neighborhood', label: 'Voisinage' })}
            icon={<Users size={20} />}
            label="Espace Public"
            count={messages.length}
          />
          <ChannelButton 
            active={activeChannel.type === 'governance'} 
            onClick={() => setActiveChannel({ type: 'governance', label: 'Gouvernance' })}
            icon={<Shield size={20} />}
            label="Staff & Elus"
          />
          <ChannelButton 
            active={activeChannel.type === 'executive'} 
            onClick={() => setActiveChannel({ type: 'executive', label: 'Exécutif' })}
            icon={<Lock size={20} />}
            label="Administration"
          />
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950">
          {viewMode === 'graph' ? (
            <TopicNetworkGraph />
          ) : (
            <>
              <div 
                ref={scrollRef}
                className="flex-1 p-6 overflow-y-auto space-y-2 custom-scrollbar"
              >
                {feedState === "loading" && (
                  <div className="space-y-8 p-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                        <div className="flex-1 space-y-3">
                          <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded-full" />
                          <div className="h-12 w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {feedState === "degraded" && (
                  <div className="h-full flex items-center p-8">
                    <div className="w-full rounded-[2rem] border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-6 text-center">
                      <p className="text-sm font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-2">Service en maintenance</p>
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-500">Tentative de reconnexion au flux de données...</p>
                    </div>
                  </div>
                )}

                {feedState === "empty" && (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 space-y-4">
                    <MessageSquare size={64} className="cmm-text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Zone de silence</p>
                  </div>
                )}

                {messages.map((msg) => (
                  <RichMessageCard 
                    key={msg.id} 
                    message={msg} 
                    isMe={msg.sender.handle === user?.username} 
                  />
                ))}
              </div>

              {/* Advanced Input Footer */}
              <form onSubmit={handleSend} className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                {sendError && (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-400 animate-in fade-in zoom-in-95">
                    {sendError}
                  </div>
                )}
                
                {file && (
                  <div className="mb-4 p-3 bg-violet-50 dark:bg-violet-950/20 rounded-2xl flex items-center gap-3 border border-violet-100 dark:border-violet-900/50 animate-in slide-in-from-bottom-2">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-violet-500 shadow-sm border">
                      <Paperclip size={18} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-black uppercase text-violet-700 dark:text-violet-400 truncate">{file.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} Mo • Image prête</p>
                    </div>
                    <button type="button" onClick={() => setFile(null)} className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                )}

                <div className="relative flex items-end gap-3 bg-slate-50 dark:bg-slate-900/80 rounded-3xl p-3 border border-transparent focus-within:border-violet-500/30 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all duration-300 shadow-inner">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 2 * 1024 * 1024) {
                        alert("Fichier trop lourd (Max 2Mo)");
                        return;
                      }
                      setFile(f || null);
                    }}
                  />
                  <button 
                    type="button" 
                    disabled={!userId}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-violet-500 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-30"
                  >
                    <Paperclip size={20} />
                  </button>
                  <textarea 
                    rows={1}
                    value={message}
                    onChange={handleTextChange}
                    disabled={!userId}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none placeholder:text-slate-400"
                    placeholder={userId ? "Votre message à la communauté..." : "Connectez-vous pour participer"}
                  />
                  <button 
                    disabled={!userId || (!message.trim() && !file) || isSending || isUploading}
                    type="submit" 
                    className="w-12 h-12 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all duration-300 relative group ${active 
        ? 'bg-violet-600 text-white shadow-2xl shadow-violet-600/30' 
        : 'cmm-text-muted hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none'}`}
    >
      <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
        {icon}
      </div>
      <div className="hidden md:block text-left">
        <span className="block text-[10px] font-black uppercase tracking-widest leading-none">
          {label}
        </span>
        {count !== undefined && (
          <span className={`text-[9px] font-bold ${active ? 'text-white/60' : 'text-slate-400'}`}>
            {count} messages
          </span>
        )}
      </div>
      {active && (
        <motion.div 
          layoutId="active-channel"
          className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full" 
        />
      )}
    </button>
  );
}
