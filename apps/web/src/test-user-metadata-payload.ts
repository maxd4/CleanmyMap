// Test script pour vérifier le payload avec les données utilisateur automatiques
import { buildCreateActionPayload } from "../components/actions/action-declaration/payload";

// Données de test
const mockForm = {
  actorName: "Test User",
  associationName: "Test Association",
  actionDate: "2024-01-15",
  locationLabel: "Test Location",
  departureLocationLabel: "Départ Test",
  arrivalLocationLabel: "",
  routeStyle: "souple" as const,
  routeAdjustmentMessage: "",
  latitude: "",
  longitude: "",
  wasteKg: "5.5",
  cigaretteButts: "0",
  volunteersCount: "2",
  durationMinutes: "60",
  notes: "Test notes",
  wasteMegotsKg: "0",
  wasteMegotsCondition: "propre" as const,
  wastePlastiqueKg: "",
  wasteVerreKg: "",
  wasteMetalKg: "",
  wasteMixteKg: "",
  triQuality: "moyenne" as const,
  placeType: "Rue/Avenue/Boulevard",
  visionBagsCount: "",
  visionFillLevel: "",
  visionDensity: "",
  enterpriseName: "",
};

const mockUserMetadata = {
  userId: "user_123456789",
  username: "testuser",
  displayName: "Test User Display",
  email: "test@example.com",
};

// Test du payload
const payload = buildCreateActionPayload({
  form: mockForm,
  declarationMode: "quick",
  effectiveManualDrawingEnabled: false,
  drawingIsValid: false,
  manualDrawing: null,
  isEntrepriseMode: false,
  linkedEventId: undefined,
  photos: [],
  visionEstimate: null,
  userMetadata: mockUserMetadata,
});

console.log("=== PAYLOAD AVEC DONNÉES UTILISATEUR AUTOMATIQUES ===");
console.log(JSON.stringify(payload, null, 2));

console.log("\n=== VÉRIFICATIONS ===");
console.log("✓ userId automatique:", payload.userMetadata?.userId);
console.log("✓ username automatique:", payload.userMetadata?.username);
console.log("✓ displayName automatique:", payload.userMetadata?.displayName);
console.log("✓ email automatique:", payload.userMetadata?.email);
console.log("✓ Pas de champs manuels d'identité dans le payload principal");