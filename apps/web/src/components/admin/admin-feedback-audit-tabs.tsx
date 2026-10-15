"use client";

import { useState } from "react";
import type { AdminOperationAuditEntry } from "@/lib/admin/audit/operation-audit";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import { CreatorInboxPanel } from "./creator-inbox-panel";
import { AdminOperationsAuditPanel } from "./admin-operations-audit-panel";

export function AdminFeedbackAuditTabs({
  feedbackItems,
  auditEntries,
}: {
  feedbackItems: CreatorInboxItem[];
  auditEntries: AdminOperationAuditEntry[];
}) {
  const [activeTab, setActiveTab] = useState<"feedback" | "audit">("feedback");

  return (
    <section aria-label="Boîte créateur unifiée et journal administrateurs">
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Surface administrative">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "feedback"}
          onClick={() => setActiveTab("feedback")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "feedback"
              ? "bg-stone-950 text-white"
              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
          }`}
        >
          Boîte créateur unifiée
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "audit"}
          onClick={() => setActiveTab("audit")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "audit"
              ? "bg-stone-950 text-white"
              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
          }`}
        >
          Journal administrateurs
        </button>
      </div>

      {activeTab === "feedback" ? (
        <div role="tabpanel" aria-label="Boîte créateur unifiée">
          <CreatorInboxPanel initialItems={feedbackItems} />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Journal administrateurs">
          <AdminOperationsAuditPanel entries={auditEntries} />
        </div>
      )}
    </section>
  );
}
