// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { PARIS_CLEANWALK_ACTORS, PARIS_CLEANWALK_RELATIONS } from "@/lib/partners/paris-cleanwalk-network";
import { getScheduledOperation } from "@/lib/partners/paris-cleanwalk-network.scheduled";
import { ParisNetwork3DFallback } from "./paris-network-3d-fallback";
import { ScheduledOperationPanel } from "./paris-network-scheduled-operation";
import { ParisNetwork3DBubble } from "./paris-network-3d-bubble";

describe("school operations UI", () => {
  it("exposes schools, links and operation details in HTML", () => {
    const container=document.createElement("div"); document.body.appendChild(container);
    const root=createRoot(container); const select=vi.fn();
    (globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
    try {
      act(()=>root.render(<ParisNetwork3DFallback actors={PARIS_CLEANWALK_ACTORS} relations={PARIS_CLEANWALK_RELATIONS} selectedActorId={null} hoveredActorId={null} onSelectActor={()=>{}} onHoverActor={()=>{}} onSelectRelation={select} reason="user_selected" fr/>));
      expect(container.textContent).toContain("Établissements scolaires"); expect(container.textContent).toContain("Lycée Ellipse Montessori Academy"); expect(container.textContent).toContain("École élémentaire Voltaire");
      expect(container.querySelector("button button")).toBeNull();
      const button=Array.from(container.querySelectorAll("button")).find(b=>b.textContent?.startsWith("Collaboration programmée"));
      expect(button).toBeDefined(); act(()=>button?.click()); expect(select).toHaveBeenCalledTimes(1);
      const r=PARIS_CLEANWALK_RELATIONS.find(r=>r.id===select.mock.calls[0][0]);
      if(r?.relationType!=="collaboration_programmee")throw Error("missing relation");
      const op=getScheduledOperation(r.operationId); if(!op)throw Error("missing operation");
      act(()=>root.render(<ScheduledOperationPanel operation={op} onClose={()=>{}} fr/>));
      expect(container.textContent).toContain("Programmée"); expect(container.textContent).toContain("déclaration de l’organisateur"); expect(container.textContent).toContain("Aucune URL publique propre");
      expect(container.querySelector("a")).toBeNull();
      const school=PARIS_CLEANWALK_ACTORS.find(a=>a.id==="school-uai-0751241s"); if(!school)throw Error("missing school");
      act(()=>root.render(<ParisNetwork3DBubble actor={school} isLocked onClose={()=>{}} fr/>));
      expect(container.textContent).toContain("0751241S"); expect(container.textContent).toContain("Adresses divergentes"); expect(container.textContent).toContain("identification probable"); expect(container.textContent).toContain("30/11/2026");
    } finally { act(()=>root.unmount()); container.remove(); }
  });
});
