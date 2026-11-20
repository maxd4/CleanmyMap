import assert from 'node:assert/strict';
import { compareOffers, priceCarbonPareto } from '../apps/web/src/lib/environmental-impact-estimator/offer-comparison.ts';
const e={checkedAt:'2026-11-20',sourceUrls:['https://example.org/synthetic-only']};
function make(id, cost, carbon, fields={}) {
 const n=1000;
 const base={id,name:id,modelId:'fixture',modelVersion:'1',providerId:'provider',deploymentId:id,executionEnvironment:'cloud_api',weightsAvailability:'open_weights',access:{billingMode:'API',codingPlatformIds:['codex'],reasoningConfigurationId:'high'},codingAssessment:{benchmarkId:'synthetic-code-benchmark',codingWorkloadId:'w',reasoningConfigurationId:'high',successRate:{min:.9,max:.9},criticalRequirementsPassed:true,evidence:e},evidence:e,kind:'REAL_VERIFIED',quality:'PASS',capabilities:'PASS',privacy:'PASS',availability:'PASS',campaign:{attemptedTasks:n,successfulTasks:n,successDefinitionId:'s',workloadId:'w',workloadDomain:'CODE',price:cost===null?null:{totalEur:{min:cost*n,max:cost*n},scope:'FULL_ATTRIBUTABLE',method:'BILLED',evidence:e},energy:{totalKwh:{min:2,max:2},boundary:'FACILITY',evidence:e},operationalCarbon:carbon===null?null:{totalKgCo2e:{min:carbon,max:carbon},boundary:'LOCATION_BASED_OPERATIONAL',location:'SINGLE_REGION_VERIFIED',accountingMethodId:'m',evidence:e}}};
 return {...base,...fields};
}
let count=0;function test(name,fn){fn();count++;console.log('PASS',name)}
const A=make('A',.1,100);
const statuses=r=>Object.fromEntries(r.offers.map(x=>[x.offer.id,x.eligibility]));
test('15 percent and left side',()=>{const r=compareOffers(A,[make('B',.07,35),make('C',.1,45),make('D',.113,20),make('E',.14,130),make('F',.06,125),make('G',.115,18),make('H',.11501,10),make('I',.01,200)]);assert.deepEqual(r.plotPoints.map(x=>x.id),['A','B','C','D','F','G','I']);assert.deepEqual(r.plotPoints.filter(x=>x.onPriceCarbonParetoFront).map(x=>x.id),['B','D','F','G','I']);});
test('missing cost',()=>{const r=compareOffers(A,[make('M',null,40)]);assert.equal(statuses(r).M,'PRICE_UNKNOWN')});
test('missing carbon',()=>{const r=compareOffers(A,[make('M',.05,null)]);assert.equal(statuses(r).M,'ELIGIBLE_PRICE');assert.deepEqual(r.plotPoints.map(x=>x.id),['A'])});
test('price reference zero',()=>{const r=compareOffers(make('A',0,100),[make('B',.01,5)]);assert.equal(statuses(r).B,'PRICE_UNKNOWN')});
test('zero successes',()=>{const r=compareOffers(make('A',.1,100,{campaign:{...A.campaign,successfulTasks:0}}),[make('B',.01,5)]);assert.equal(statuses(r).B,'PRICE_UNKNOWN')});
test('quality and privacy and availability',()=>{const r=compareOffers(A,[make('B',.01,10,{quality:'FAIL'}),make('C',.01,10,{privacy:'UNPROVEN'}),make('D',.01,10,{availability:'FAIL'})]);assert.equal(statuses(r).B,'QUALITY_INSUFFICIENT');assert.equal(statuses(r).C,'PRIVACY_BLOCKED');assert.equal(statuses(r).D,'UNAVAILABLE')});
test('cloud local cross boundary',()=>{const r=compareOffers(A,[make('L',.01,10,{executionEnvironment:'local_device'})]);assert.equal(statuses(r).L,'ENVIRONMENT_MISMATCH')});
test('workload mismatch',()=>{const r=compareOffers(A,[make('X',.01,10,{campaign:{...A.campaign,workloadId:'different'}})]);assert.equal(statuses(r).X,'WORKLOAD_MISMATCH')});
test('cost scope mismatch',()=>{const r=compareOffers(A,[make('X',.01,10,{campaign:{...A.campaign,price:{...A.campaign.price,scope:'LOCAL_TCO'}}})]);assert.equal(statuses(r).X,'COST_BOUNDARY_MISMATCH')});
test('scenario excluded',()=>{const r=compareOffers(A,[make('X',.01,10,{kind:'SCENARIO_ONLY'})]);assert.equal(statuses(r).X,'SCENARIO_ONLY')});
test('uncertain price',()=>{const R=make('R',null,100,{campaign:{...A.campaign,price:{...A.campaign.price,totalEur:{min:95,max:105}}}});const S=make('S',null,30,{campaign:{...A.campaign,price:{...A.campaign.price,totalEur:{min:100,max:115}}}});const r=compareOffers(R,[S]);assert.equal(statuses(r).S,'PRICE_ELIGIBILITY_UNCERTAIN');assert.equal(r.plotPoints.length,0)});
test('carbon regional set interval never midpoint',()=>{const r=compareOffers(A,[make('S',.05,40,{campaign:{...A.campaign,operationalCarbon:{...A.campaign.operationalCarbon,totalKgCo2e:{min:20,max:40},location:'REGIONAL_SET_VERIFIED'}}})]);assert.deepEqual(r.offers[1].carbonGramsCo2ePerSuccess,{min:20,max:40});assert.equal(r.plotPoints.length,1)});
test('endpoint location not physical',()=>{const r=compareOffers(A,[make('S',.05,30,{campaign:{...A.campaign,operationalCarbon:{...A.campaign.operationalCarbon,location:'INPUT_OR_STORAGE_REGION_ONLY'}}})]);assert.equal(r.offers[1].carbonGramsCo2ePerSuccess,null)});
test('carbon method mismatch',()=>{const r=compareOffers(A,[make('S',.05,30,{campaign:{...A.campaign,operationalCarbon:{...A.campaign.operationalCarbon,accountingMethodId:'other'}}})]);assert.equal(r.offers[1].carbonGramsCo2ePerSuccess,null)});
test('reference quality unproven',()=>{const r=compareOffers(make('A',.1,100,{quality:'UNPROVEN'}),[make('B',.05,5)]);assert.equal(statuses(r).B,'REFERENCE_UNVERIFIED')});
test('duplicate ID rejected',()=>{assert.throws(()=>compareOffers(A,[make('A',.05,5)]),/dupliqué/)});
test('pareto identical not dominated',()=>{const pts=[{id:'A',xEuroPerSuccess:.1,yGramsCo2ePerSuccess:100},{id:'B',xEuroPerSuccess:.1,yGramsCo2ePerSuccess:100}];assert.deepEqual(priceCarbonPareto(pts),['A','B'])});
test('3 percentage point quality guard',()=>{const r=make('A',.1,100,{campaign:{...make('A',.1,100).campaign,successfulTasks:900}});const w=make('B',.09,35,{campaign:{...make('B',.09,35).campaign,successfulTasks:870}});const f=make('C',.09,35,{campaign:{...make('C',.09,35).campaign,successfulTasks:869}});const c=compareOffers(r,[w,f]);assert.equal(statuses(c).B,'ELIGIBLE_PRICE');assert.equal(statuses(c).C,'QUALITY_INSUFFICIENT')});


test('code downgrade even with lower cost and max reasoning',()=>{const b=make('weak',.01,1,{access:{...A.access,reasoningConfigurationId:'max'},codingAssessment:{...A.codingAssessment,reasoningConfigurationId:'max',successRate:{min:.7,max:.7}}});assert.equal(statuses(compareOffers(A,[b])).weak,'QUALITY_INSUFFICIENT')});
test('code comparable at lower reasoning',()=>{const b=make('capable',.07,20,{access:{...A.access,reasoningConfigurationId:'medium'},codingAssessment:{...A.codingAssessment,reasoningConfigurationId:'medium',successRate:{min:.89,max:.89}}});assert.equal(statuses(compareOffers(A,[b])).capable,'ELIGIBLE_PRICE')});
test('coding confidence or critical tests block recommendation',()=>{const b=make('critical',.01,1,{codingAssessment:{...A.codingAssessment,criticalRequirementsPassed:false}});assert.equal(statuses(compareOffers(A,[b])).critical,'QUALITY_INSUFFICIENT')});
test('billing mode mismatch',()=>{const b=make('sub',.01,1,{access:{billingMode:'SUBSCRIPTION',codingPlatformIds:['codex'],reasoningConfigurationId:'high',subscriptionPlanId:'pro',subscriptionPlanAvailability:'VERIFIED'}});assert.equal(statuses(compareOffers(A,[b])).sub,'BILLING_MODE_MISMATCH')});

console.log(`${count} groupes de vérification synthétique réussis (Node, sans Vitest).`);
