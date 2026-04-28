// Test de la conversion automatique des mégots
// Ce script teste la logique de conversion nombre de mégots -> masse

const CIGARETTE_BUTT_WEIGHTS = {
  propre: 0.2,   // Mégot sec
  humide: 0.4,   // Mégot humide
  mouille: 0.6,  // Mégot mouillé
};

function convertCigaretteButtsToKg(count, condition) {
  const weightPerButt = CIGARETTE_BUTT_WEIGHTS[condition];
  return (count * weightPerButt) / 1000; // Conversion grammes -> kg
}

// Tests de conversion
console.log("=== Tests de conversion mégots -> masse ===");
console.log("50 mégots secs:", convertCigaretteButtsToKg(50, "propre"), "kg");
console.log("50 mégots humides:", convertCigaretteButtsToKg(50, "humide"), "kg");
console.log("50 mégots mouillés:", convertCigaretteButtsToKg(50, "mouille"), "kg");
console.log("");
console.log("100 mégots secs:", convertCigaretteButtsToKg(100, "propre"), "kg");
console.log("100 mégots humides:", convertCigaretteButtsToKg(100, "humide"), "kg");
console.log("100 mégots mouillés:", convertCigaretteButtsToKg(100, "mouille"), "kg");
console.log("");
console.log("=== Simulation formulaire ===");

// Simulation du comportement du formulaire
function simulateFormUpdate(baseWasteKg, cigaretteCount, condition) {
  const cigaretteKg = convertCigaretteButtsToKg(cigaretteCount, condition);
  const totalWasteKg = baseWasteKg + cigaretteKg;
  
  console.log(`Poids de base: ${baseWasteKg} kg`);
  console.log(`${cigaretteCount} mégots ${condition}: +${cigaretteKg.toFixed(3)} kg`);
  console.log(`Poids total: ${totalWasteKg.toFixed(3)} kg`);
  console.log("---");
}

simulateFormUpdate(2.5, 75, "propre");
simulateFormUpdate(1.0, 120, "humide");
simulateFormUpdate(0.5, 200, "mouille");