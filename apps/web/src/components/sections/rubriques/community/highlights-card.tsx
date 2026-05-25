"use client";

import type { AppError } from "@/lib/errors/app-errors";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import type { CommunityHighlightItem } from"@/components/sections/rubriques/community/types";
import { Activity, Users, Map } from "lucide-react";
import { motion } from "framer-motion";

type CommunityHighlightsCardProps = {
  loading: boolean;
  error: AppError | null;
  highlights: CommunityHighlightItem[];
};

function CommunityHighlightsCard(props: CommunityHighlightsCardProps) {
  const { loading, error, highlights } = props;

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Activity size={48} className="text-slate-900" />
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Activité Récente
        </h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-12 w-full bg-slate-50 animate-pulse rounded-2xl" />
          <div className="h-12 w-full bg-slate-50 animate-pulse rounded-2xl" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-2">
          {error.kind === "permission" ? (
            <PermissionErrorState title="Accès limité" message="Section réservée aux membres." />
          ) : (
            <ErrorMessage kind={error.kind} message={error.message} />
          )}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {highlights.map((item, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50"
            >
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.date}</span>
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Map size={12} className="text-pink-600" />
                  {item.actions} {item.actions > 1 ? "Actions" : "Action"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                <Users size={12} className="text-pink-600" />
                <span className="text-xs font-black text-slate-900">{item.volunteers}</span>
              </div>
            </motion.div>
          ))}
          {highlights.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-medium text-slate-400">En attente de nouvelles mobilisations...</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { CommunityHighlightsCard };
