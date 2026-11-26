import {expect,test} from "@playwright/test";

test("public science explorer exposes bounded results, warns on truncation, and handles API errors",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  let failNext=false;
  await page.route("**/api/actions/map?**",route=>{
    if(failNext){
      failNext=false;
      return route.fulfill({status:500,json:{status:"error"}});
    }
    const type=new URL(route.request().url()).searchParams.get("types");
    if(type==="spot"){
      return route.fulfill({json:{status:"ok",count:1,isTruncated:false,partialSource:false,items:[
        {id:"spot-1",status:"approved",contract:{type:"spot",status:"approved",dates:{observedAt:"2026-02-01"},location:{departmentCode:"75"},metadata:{},dataQuality:{status:"ok",provenance:{geometry:"observed"}}}}
      ]}});
    }
    if(type==="clean_place"){
      return route.fulfill({json:{status:"ok",count:0,isTruncated:false,partialSource:false,items:[]}});
    }
    return route.fulfill({json:{status:"ok",count:2,isTruncated:true,partialSource:false,items:[
      {id:"complete",status:"approved",contract:{type:"action",status:"approved",dates:{observedAt:"2026-01-01"},location:{departmentCode:"75",latitude:48.85,longitude:2.35},metadata:{actionPhase:"post_action_complete",wasteKg:0,actorName:"PRIVATE_SENTINEL"}}},
      {id:"future",status:"approved",contract:{type:"action",status:"approved",dates:{observedAt:"2027-01-01"},metadata:{actionPhase:"pre_action"}}}
    ]}});
  });
  await page.goto("/sections/open-data");
  const cookies=page.getByRole("button",{name:"Tout refuser"});
  await cookies.waitFor({state:"visible",timeout:3000}).catch(()=>{});
  if(await cookies.isVisible().catch(()=>false))await cookies.click();

  await page.getByRole("button",{name:"Afficher un aperçu"}).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("1 retenus sur 2 reçus")).toBeVisible();
  await expect(page.getByText(/Lecture tronquée/)).toBeVisible();
  const table=page.getByRole("table",{name:"Échantillon de données publiques"});
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table).not.toContainText("PRIVATE_SENTINEL");
  await expect(table).not.toContainText("48.85");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);

  failNext=true;
  await page.getByRole("button",{name:"Afficher un aperçu"}).click();
  await expect(page.locator("#api").getByRole("alert")).toContainText("Impossible de lire la réponse publique");
  await page.getByRole("button",{name:"Réessayer"}).click();
  await expect(page.getByText("1 retenus sur 2 reçus")).toBeVisible();

  // Successive dataset switches (spot -> clean_place)
  await page.getByLabel("Jeu consulté").selectOption("spot");
  await page.getByRole("button",{name:"Afficher un aperçu"}).click();
  await expect(page.getByText("1 retenus sur 1 reçus")).toBeVisible();

  await page.getByLabel("Jeu consulté").selectOption("clean_place");
  await page.getByRole("button",{name:"Afficher un aperçu"}).click();
  await expect(page.getByText("0 retenus sur 0 reçus")).toBeVisible();
  await expect(page.getByText(/Aucune ligne admissible/)).toBeVisible();

  await page.setViewportSize({width:1280,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test("real public GET /api/actions/map respects bounds and omits private identity fields",async({request})=>{
  const response=await request.get("/api/actions/map?types=action&status=approved&floorDate=all&limit=5");
  expect([200,503]).toContain(response.status());
  const text=await response.text();
  expect(text).not.toMatch(/created_by_clerk_id|createdByClerkId|email|stack/i);
  if(response.status()===200){
    const body=JSON.parse(text) as {status:string;count:number;items:unknown[]};
    expect(body.status).toBe("ok");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeLessThanOrEqual(5);
  }
});
