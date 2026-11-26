import { expect, test } from "@playwright/test";
async function openCatalogue(page:import("@playwright/test").Page,width:number,height:number){
  await page.setViewportSize({width,height});
  await page.goto("/sections/annuaire");
  const cookies=page.getByRole("button",{name:"Tout refuser"});
  await cookies.waitFor({state:"visible",timeout:5000}).catch(()=>{});
  if(await cookies.isVisible().catch(()=>false)){
    await cookies.click();
    await cookies.waitFor({state:"hidden",timeout:3000}).catch(()=>{});
  }
  await page.getByRole("tab",{name:"Annuaire",exact:true}).click();
  return page.getByTestId("annuaire-catalog");
}
test("desktop: one searchable catalogue, featured filter and canonical public profile",async({page})=>{
  const catalog=await openCatalogue(page,1440,900);
  await expect(catalog.getByRole("searchbox")).toBeVisible();
  await expect(catalog.locator("[data-catalog-key]").first()).toBeVisible();
  await expect(page.locator("#annuaire-panel-network canvas")).toHaveCount(0);
  await catalog.getByRole("button",{name:"À la une",exact:true}).click();
  await expect(catalog.locator("[data-catalog-key]").first()).toContainText("À la une");
  await catalog.getByRole("button",{name:"Toutes",exact:true}).click();
  await catalog.getByRole("searchbox").fill("Syctom");
  const row=catalog.locator('[data-catalog-key="network:collectivite-syctom"]');
  await expect(row).toHaveCount(1);
  await row.getByRole("button",{name:"Consulter la fiche"}).click();
  const dialog=page.getByRole("dialog");
  await expect(dialog).toContainText("Syctom");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await row.getByRole("button",{name:/Voir dans les services publics/}).click();
  await expect(page.getByRole("tab",{name:"Services publics"})).toHaveAttribute("aria-selected","true");
  await expect(page.getByTestId("public-cleanliness-organization").locator("aside h3")).toContainText("Syctom");
});
test("mobile: compact list and empty-state reset",async({page})=>{
  const catalog=await openCatalogue(page,390,844);
  await catalog.getByRole("button",{name:"Liste",exact:true}).click();
  await expect(catalog.getByRole("button",{name:"Liste",exact:true})).toHaveAttribute("aria-pressed","true");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  await catalog.getByRole("searchbox").fill("zzzz-introuvable-123456");
  await expect(catalog.locator("[data-catalog-key]")).toHaveCount(0);
  await catalog.getByRole("button",{name:"Réinitialiser",exact:true}).click();
  await expect(catalog.locator("[data-catalog-key]").first()).toBeVisible();
});
