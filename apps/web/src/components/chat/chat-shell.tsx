"use client";

import { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { MessageSquare, Shield, Users, Lock, Send, Paperclip, X, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useUser } from "@clerk/nextjs";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getChatFeedState } from "./chat-feed-state";

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
          : "Discussion indisponible";
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
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setSendError("Connecte-toi pour envoyer un message.");
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

        const { data: uploadData, error: uploadError } = await supabase.storage
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

      // 2. Send Message
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: activeChannel.type,
          content: message,
          arrondissementId: activeChannel.type === 'neighborhood' ? (initialArrondissement || 11) : undefined,
          attachmentUrl,
          attachmentType,
        }),
      });

      if (res.ok) {
        setMessage("");
        setFile(null);
        mutate();
      } else {
        const payload = await res.json().catch(() => ({}));
        const messageFromApi =
          typeof payload?.hint === "string"
            ? payload.hint
            : typeof payload?.message === "string"
              ? payload.message
              : "Envoi impossible pour le moment.";
        setSendError(messageFromApi);
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError("Envoi impossible pour le moment.");
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
        // We might want to refresh the page or mutate global user state
        location.reload(); 
      } else {
        const err = await res.json();
        alert(err.error || "Erreur lors de la mise à jour");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
             {activeChannel.type === 'neighborhood' ? <Users size={18} /> : 
              activeChannel.type === 'governance' ? <Shield size={18} /> :
              activeChannel.type === 'executive' ? <Lock size={18} /> : <User size={18} />}
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tighter">
                {activeChannel.label}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Discussion Live</p>
          </div>
        </div>
        <button 
          onClick={() => setIsEditingHandle(!isEditingHandle)}
          className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
        >
          <User size={18} />
        </button>
      </div>

      {isEditingHandle && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 animate-in slide-in-from-top-2">
           <div className="flex-1">
             <p className="text-[10px] font-black uppercase text-emerald-700 mb-1">Changer votre @handle</p>
             <input 
               value={newHandle}
               onChange={(e) => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
               placeholder="nouveau_pseudo"
               className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
             />
           </div>
           <button 
             onClick={handleUpdateHandle}
             className="mt-4 px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm"
           >
             Valider
           </button>
        </div>
      )}

      {!userId ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          Discussion en lecture seule.{" "}
          <Link href="/sign-in" className="font-semibold underline">
            Se connecter
          </Link>{" "}
          pour publier et reagir.
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Channels */}
        <div className="w-16 md:w-56 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex flex-col p-2 space-y-2">
            <ChannelButton 
                active={activeChannel.type === 'neighborhood'} 
                onClick={() => setActiveChannel({ type: 'neighborhood', label: 'Voisinage' })}
                icon={<Users size={18} />}
                label="Voisinage"
            />
            <ChannelButton 
                active={activeChannel.type === 'governance'} 
                onClick={() => setActiveChannel({ type: 'governance', label: 'Gouvernance' })}
                icon={<Shield size={18} />}
                label="Staff & Elus"
            />
            <ChannelButton 
                active={activeChannel.type === 'executive'} 
                onClick={() => setActiveChannel({ type: 'executive', label: 'Exécutif' })}
                icon={<Lock size={18} />}
                label="Admin"
            />
        </div>

        {/* Message Area */}
        <div className="flex-1 flex flex-col relative">
          <div 
            ref={scrollRef}
            className="flex-1 p-4 overflow-y-auto space-y-6 custom-scrollbar"
          >
            {feedState === "loading" ? (
                <div className="flex items-center justify-center h-full">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : null}

            {feedState === "degraded" ? (
                <div className="h-full flex items-center">
                    <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-semibold">Discussion temporairement indisponible.</p>
                      <p className="mt-1">{error instanceof Error ? error.message : "Reconnexion necessaire pour charger les messages."}</p>
                    </div>
                </div>
            ) : null}

            {feedState === "empty" ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 grayscale space-y-2">
                    <MessageSquare size={48} />
                    <p className="text-xs font-black uppercase tracking-widest">Pas encore de message</p>
                </div>
            ) : null}

            {messages.map((msg) => (
                <div key={msg.id} className="flex items-start group">
                    <img 
                      src={msg.sender.avatar_url || `https://ui-avatars.com/api/?name=${msg.sender.display_name}`} 
                      className="w-8 h-8 rounded-xl mr-3 shadow-md border border-white dark:border-slate-800"
                      alt="" 
                    />
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                                {msg.sender.display_name}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 opacity-60">
                                @{msg.sender.handle}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase ml-auto">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: fr })}
                            </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-[90%] whitespace-pre-wrap break-words">
                            {msg.content}
                        </div>
                        {msg.attachment_url && (
                             <div className="mt-2 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm max-w-xs">
                                <img src={msg.attachment_url} alt="Attachment" className="w-full object-cover max-h-48 hover:scale-105 transition-transform cursor-pointer" />
                             </div>
                        )}
                    </div>
                </div>
            ))}
          </div>

          {/* Mentions Dropdown */}
          {showMentions && userData?.users?.length > 0 && (
            <div className="absolute bottom-20 left-4 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-2">
                {userData.users.map((u: any) => (
                    <button 
                        key={u.handle}
                        onClick={() => insertMention(u.handle)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                        <img src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.display_name}`} className="w-6 h-6 rounded-lg" alt="" />
                        <div>
                            <p className="text-xs font-black text-slate-900 dark:text-white leading-none">{u.display_name}</p>
                            <p className="text-[10px] text-emerald-600 font-bold">@{u.handle}</p>
                        </div>
                    </button>
                ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
             {sendError ? (
                <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {sendError}
                </div>
              ) : null}
             {file && (
                <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 animate-in fade-in">
                    <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-emerald-500 border border-slate-200 dark:border-slate-800">
                        <Paperclip size={16} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-[10px] font-black text-slate-900 dark:text-white truncate uppercase tracking-widest">{file.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{(file.size / 1024 / 1024).toFixed(2)} MO • Prêt à l&apos;envoi</p>
                    </div>
                    <button type="button" onClick={() => setFile(null)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </div>
             )}
             <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2 border border-slate-200 dark:border-slate-700 focus-within:border-emerald-500/50 transition-colors">
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f && f.size > 2 * 1024 * 1024) {
                            alert("Fichier trop lourd (Max 2 MO)");
                            return;
                        }
                        setFile(f || null);
                    }}
                />
                <button 
                  type="button" 
                  disabled={!userId}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-emerald-500 transition-colors disabled:opacity-50"
                >
                    <Paperclip size={18} />
                </button>
                <textarea 
                   rows={1}
                   value={message}
                   onChange={handleTextChange}
                   disabled={!userId}
                   className="flex-1 bg-transparent border-none focus:ring-0 text-xs py-2 px-1 max-h-32 resize-none placeholder:text-slate-400 font-medium"
                   placeholder="Tapez un message... (@handle pour taguer)"
                />
                <button 
                  disabled={!userId || (!message.trim() && !file) || isSending || isUploading}
                  type="submit" 
                  className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                    <Send size={18} />
                </button>
             </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChannelButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${active 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
            <div className={`p-1 ${active ? 'text-white' : 'text-slate-400'}`}>
                {icon}
            </div>
            <span className="hidden md:block text-xs font-black uppercase tracking-widest truncate">
                {label}
            </span>
            {active && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full hidden md:block" />}
        </button>
    );
}
