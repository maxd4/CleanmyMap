// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { projectPublicEntity } from "@/lib/partners/public-entity-projection";
import { PARIS_CLEANWALK_ACTORS } from "@/lib/partners/paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "@/lib/partners/public-cleanliness-organization";
import { PublicEntityDetails } from "./public-entity-details";

function content(ref: Parameters<typeof projectPublicEntity>[0]) {
  const p=projectPublicEntity(ref);
  expect(p).not.toBeNull();
  const el=document.createElement("div");
  el.innerHTML=renderToStaticMarkup(<PublicEntityDetails projection={p!} fr/>);
  return el;
}
describe("public entity detail coverage",()=>{
  it("renders every documented activity and equipment summary in each actor record",()=>{
    for(const actor of PARIS_CLEANWALK_ACTORS){
      const el=content({networkActorId:actor.id});
      for(const activity of actor.activities)expect(el.textContent).toContain(activity);
      expect(el.textContent).toContain(actor.equipmentAvailability.summary);
      for(const item of actor.equipmentAvailability.items??[])expect(el.textContent).toContain(item);
    }
  });
  it("renders source-backed figures and limitations, not merely their counts",()=>{
    for(const actor of PARIS_CLEANWALK_ACTORS){
      const p=projectPublicEntity({networkActorId:actor.id})!;
      const el=content({networkActorId:actor.id});
      for(const metric of p.metrics){expect(el.textContent).toContain(metric.label.fr);expect(el.textContent).toContain(metric.period);}
      for(const limit of p.limits)expect(el.textContent).toContain(limit.text.fr);
    }
  });
  it("renders every institutional description and incident relation",()=>{
    for(const node of PARIS_PUBLIC_CLEANLINESS_DATASET.nodes){
      const el=content({institutionId:node.id});
      expect(el.textContent).toContain(node.description);
      for(const edge of PARIS_PUBLIC_CLEANLINESS_DATASET.relations.filter(r=>r.from===node.id||r.to===node.id)){
        expect([...el.querySelectorAll("[data-relation-id]")].some(item=>item.getAttribute("data-relation-id")===edge.id)).toBe(true);
      }
    }
  }, 15000);
  it("renders the same record for both explicit aliases of a shared institution",()=>{
    expect(content({institutionId:"town-hall-05"}).textContent).toBe(content({networkActorId:"mairie-paris-5"}).textContent);
  });
});
