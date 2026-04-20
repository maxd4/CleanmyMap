/**
 * CleanMyMap - Smoke Checks (P0 - Sécurité & Fiabilité)
 * Exécute une vérification rapide des endpoints sensibles (sans écriture).
 * 
 * Usage local: node scripts/smoke-tests.mjs
 */

const ENDPOINTS_TO_CHECK = [
  { path: "/api/community/funnel.csv", expectedStatus: 401, desc: "Accès Admin exigé" },
  { path: "/api/actions/map", expectedStatus: 200, desc: "Endpoint Map Public (Read-Only)" },
  { path: "/api/analytics/funnel", expectedStatus: 401, desc: "Analytics Funnel (Admin exigé)" },
  { path: "/api/reports/elus-dossier", expectedStatus: 401, desc: "Rapports Elus (Admin/Elu exigé)" }
];

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function runSmokeTests() {
  console.log(`\n🚀 Lancement des Smoke Checks sur ${BASE_URL}\n`);
  
  let successCount = 0;

  for (const endpoint of ENDPOINTS_TO_CHECK) {
    const url = `${BASE_URL}${endpoint.path}`;
    try {
      // On fetch sans token d'auth exprès pour vérifier la sécurité de base (401/403)
      const res = await fetch(url, { method: "GET" });
      const status = res.status;

      if (status === endpoint.expectedStatus || (endpoint.expectedStatus === 401 && status === 403)) {
        console.log(`✅ [PASS] ${endpoint.desc}`);
        console.log(`   └─ Status ${status} correspond aux règles de sécurité.`);
        successCount++;
      } else {
        console.error(`❌ [FAIL] ${endpoint.desc}`);
        console.error(`   └─ Attendu ${endpoint.expectedStatus}, reçu ${status} sur ${url}`);
      }
    } catch (err) {
      console.error(`⚠️ [ERROR] ${endpoint.desc}`);
      console.error(`   └─ Impossible de joindre ${url}: ${err.message}`);
    }
  }

  console.log(`\n🏁 Bilan : ${successCount}/${ENDPOINTS_TO_CHECK.length} vérifications réussies.\n`);
  if (successCount < ENDPOINTS_TO_CHECK.length) {
    process.exit(1);
  }
}

runSmokeTests();
