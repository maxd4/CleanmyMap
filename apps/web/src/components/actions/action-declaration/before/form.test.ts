import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ActionBeforeDeclarationForm } from "./form";
import { IdentityAndSharingSection } from "./identity-and-sharing-section";
import { PlannedActionSection } from "./planned-action-section";
import { PreparationAndSafetySection } from "./preparation-and-safety-section";
import { PreparationPlanningFields } from "./preparation-planning-fields";
import { ScheduleFields } from "./planned-action-schedule-fields";
import { createInitialFormState } from "../payload";

describe("ActionBeforeDeclarationForm", () => {
  it("renders the lightweight pre-action form", () => {
    const html = renderToStaticMarkup(
      React.createElement(ActionBeforeDeclarationForm, {
        actorNameOptions: ["Aperçu local"],
        defaultActorName: "Aperçu local",
        userMetadata: {
          userId: "preview-local",
          username: "preview-local",
          displayName: "Aperçu local",
          email: undefined,
        },
        linkedEventId: undefined,
        initialRecordType: "action",
        isAuthenticated: true,
        onPassToComplete: () => undefined,
      } as ComponentProps<typeof ActionBeforeDeclarationForm>),
    );

    expect(html).toContain("Préparer une action future");
    expect(html).not.toContain('data-testid="before-action-stepper"');
    expect(html).not.toContain("Déclarer avant l&#x27;action");
    expect(html).not.toContain("Préparer le formulaire de groupe");
    expect(html).toContain("Enregistrer la préparation");
    expect(html).toContain("publication sera déclenchée explicitement");
    expect(html).toContain("Identité et organisation");
    expect(html).toContain("Type de structure");
    expect(html).toContain("Sélectionnez un type de structure");
    expect(html).toContain("Action prévue");
    expect(html).toContain("Préparation et sécurité");
    expect(html).toContain("Déchets attendus");
    expect(html).toContain("catégories susceptibles d’être rencontrées");
    expect(html).toContain("distincte des déchets réellement collectés");
    expect(html).toContain("Point de rendez-vous précis");
    expect(html).toContain("Commune ou secteur d’intervention");
    expect(html).toContain("Boucle");
    expect(html).not.toContain("Zone cible prévue");
    expect(html).toContain('role="combobox"');
    expect(html).toContain("Nombre de bénévoles attendus");
    expect(html).toContain("Répartition facultative");
    expect(html).toContain("Enfants");
    expect(html).toContain("Adultes");
    expect(html).toContain("Retraités");
    expect(html).not.toContain("unités opérationnelles");
    expect(html).toContain("Message complémentaire aux participants");
    expect(html).toContain("Notes logistiques internes");
    expect(html).toContain("Checklist avant départ");
    expect(html).toContain("Présentation");
    expect(html).toContain("Localisation et parcours");
    expect(html).toContain("Options avancées");
    expect(html).toContain("Bénévoles et informations pratiques");
    expect(html).not.toContain("Localisation du rendez-vous");
    expect(html).not.toContain("État de préparation");
    expect(html).toContain("Sélectionnez un type d’action");
    expect(html).toContain("Sélectionnez un type de zone");
    expect(html).toContain("Sélectionnez un niveau");
    expect(html).toContain("Date et horaires");
    expect(html).toContain("Accueil des bénévoles au point de rendez-vous.");
    expect(html).toContain("Départ effectif après le rendez-vous.");
    expect(html).toContain("Début du créneau global");
    expect(html).toContain("Fin du créneau global");
    expect(html).toContain("Inscriptions des bénévoles");
    expect(html).toContain("Inviter des membres");
    expect(html).toContain("coordonnées facultatives");
    expect(html).toContain('class="cmm-disclosure"');
    expect(html).toContain('data-cmm-field-control="input"');
    expect(html).toContain('data-cmm-field-control="textarea"');
    expect(html).toContain('data-cmm-field-control="select"');
    expect(html).toContain("Obligatoire");
    expect(html).toContain('id="before-action-title"');
    expect(html).toContain('id="before-action-date"');
    expect(html).toContain('id="before-departure-location"');
    expect(html).toContain("Autoriser les demandes d&#x27;inscription");
    expect(html).not.toContain("Déchets collectés");
    expect(html).not.toContain("Photos de preuve");
    expect(html).not.toContain("Score d'impact");
    expect(html).not.toContain("Confirmer et publier");

    const presentationIndex = html.indexOf("Présentation");
    const scheduleIndex = html.indexOf("Date et horaires principaux");
    const locationIndex = html.indexOf("Localisation et parcours");
    const practicalIndex = html.indexOf("Bénévoles et informations pratiques");
    expect(presentationIndex).toBeGreaterThan(-1);
    expect(scheduleIndex).toBeGreaterThan(presentationIndex);
    expect(locationIndex).toBeGreaterThan(scheduleIndex);
    expect(practicalIndex).toBeGreaterThan(locationIndex);
  });

  it("shows an explicit arrival only for point-to-point topology", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.routeTopology = "point_to_point";
    const html = renderToStaticMarkup(
      React.createElement(PlannedActionSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      }),
    );

    expect(html).toContain("Arrivée");
    expect(html).toContain('id="before-arrival-location"');
    expect(html).not.toContain("aucun point d’arrivée distinct n’est fabriqué");
  });

  it("does not invent a date or duration for a new action", () => {
    const html = renderToStaticMarkup(
      React.createElement(PlannedActionSection, {
        form: createInitialFormState("Aperçu local", "action"),
        updateField: vi.fn(),
        updateFields: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      }),
    );

    expect(html).toMatch(/id="before-action-date"[^>]*value=""/);
    expect(html).toMatch(/id="before-meeting-time"[^>]*value=""/);
    expect(html).toMatch(/id="before-departure-time"[^>]*value=""/);
    expect(html).toMatch(/id="before-duration-minutes"[^>]*value=""/);
    expect(html).toContain("Date et horaires principaux");
    expect(html).toContain("Créneau global");
    expect(html).not.toContain("Stockage précis ; affichage métier");
  });

  it("keeps invalid global hours visible in the extracted schedule section", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.eventStartTime = "25:00";
    form.eventEndTime = "10:00";
    const html = renderToStaticMarkup(
      React.createElement(ScheduleFields, {
        form,
        updateField: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      }),
    );

    expect(html).toContain("Les horaires doivent respecter le format HH:MM.");
  });

  it("keeps expected waste optional and derives safety guidance from the catalog", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.durationMinutes = "60";
    form.wasteCategories = ["broken_glass"];
    const html = renderToStaticMarkup(
      React.createElement(PlannedActionSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      }),
    );

    expect(html).toContain("1 catégorie");
    expect(html).toContain("Gants anti-coupure et contenant rigide adapté");
    expect(html).toContain("Balisser ou signaler la zone si la collecte n&#x27;est pas sûre.");
    expect(html).toContain("60 min");
    expect(html).not.toContain("Stockage précis ; affichage métier");
    expect(html).not.toContain("affichage métier");
    expect((html.match(/Déchets attendus/g) ?? []).length).toBe(1);
  });

  it("renders preparation and safety as four compact groups without the obsolete GPS banner", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.wasteCategories = ["broken_glass"];
    form.safetyInstructions = "Rester en groupe.";
    form.materialsProvided = "Pinces disponibles.";
    form.suggestedMaterials = ["gloves", "grabbers"];
    form.recommendedMaterials = "Prévoir de l'eau.";
    form.accessibilityStatus = "conditions_reported";
    form.accessibility = "Accès par la rue latérale.";
    form.preparationChecklist[0] = { ...form.preparationChecklist[0], checked: true };
    form.logisticsNotes = "Prévoir un lieu de repli.";
    form.operationalRoute = { routes: [] } as never;

    const html = renderToStaticMarkup(
      React.createElement(PreparationAndSafetySection, {
        form,
        updateField: vi.fn(),
      }),
    );

    const securityIndex = html.indexOf("Sécurité et risques");
    const materialIndex = html.indexOf("Matériel à prévoir");
    const accessibilityIndex = html.indexOf("Accessibilité");
    const logisticsIndex = html.indexOf("Logistique et checklist");
    expect(securityIndex).toBeGreaterThan(-1);
    expect(materialIndex).toBeGreaterThan(securityIndex);
    expect(accessibilityIndex).toBeGreaterThan(materialIndex);
    expect(logisticsIndex).toBeGreaterThan(accessibilityIndex);
    expect(html).toContain("Recommandations calculées depuis les déchets attendus");
    expect(html).toContain("Balisser");
    expect(html).toContain("Consignes particulières de l&#x27;organisateur");
    expect(html).toContain("Matériel fourni par l&#x27;organisateur");
    expect(html).toContain("Complément libre à apporter (facultatif)");
    expect(html).toContain("Précisions d&#x27;accessibilité");
    expect(html).toContain("Checklist avant départ");
    expect(html).toContain('class="cmm-disclosure"');
    expect(html).toContain("Notes logistiques facultatives");
    expect(html).not.toContain("Bon à savoir");
    expect(html).not.toContain("Ce pré-formulaire ne comprend pas de tracé GPS");
    expect(html).not.toContain("min-h-[132px]");
    expect(html).toContain('data-cmm-field-control="textarea"');
    expect(html).toContain('data-cmm-field-control="select"');
  });

  it("keeps historical preparation values editable in the team section", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.volunteersCount = "12";
    form.participantMessage = "Merci d’arriver dix minutes avant.";
    form.plannedObjective = "nettoyage";
    form.placeType = "Bois/Parc/Jardin/Square/Sentier";
    form.estimatedDifficulty = "moderee";
    form.wasteCategories = ["broken_glass"];

    const html = renderToStaticMarkup(
      React.createElement(PreparationPlanningFields, {
        form,
        updateField: vi.fn(),
        validationIssueFields: [],
      }),
    );

    expect(html).toMatch(/id="before-volunteers-count"[^>]*value="12"/);
    expect(html).toContain("Merci d’arriver dix minutes avant.");
    expect(html).toContain("Nettoyage");
    expect(html).toContain("Bois/Parc/Jardin/Square/Sentier");
    expect(html).toContain("Modérée");
    expect(html).toContain("Gants anti-coupure et contenant rigide adapté");
  });

  it("keeps historical accessibility text visible when no status has been selected", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.accessibility = "Description historique à conserver.";

    const html = renderToStaticMarkup(
      React.createElement(PreparationAndSafetySection, {
        form,
        updateField: vi.fn(),
      }),
    );

    expect(html).toContain("Description historique à conserver.");
    expect(html).toContain("Précisions d&#x27;accessibilité");
    expect(html).toContain("Aucune recommandation automatique pour les déchets attendus renseignés.");
  });

  it("keeps a length error beside an overlong legacy value", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.safetyInstructions = "x".repeat(2001);

    const html = renderToStaticMarkup(
      React.createElement(PreparationAndSafetySection, {
        form,
        updateField: vi.fn(),
      }),
    );

    expect(html).toContain("2001/2000 caractères");
    expect(html).toContain("Les consignes particulières dépasse la limite de 2000 caractères.");
    expect(html).toContain('aria-invalid="true"');
  });

  it("labels a typed rendez-vous without coordinates as a free non-geolocated address", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.departureLocationLabel = "Entrée non répertoriée";
    form.latitude = "";
    form.longitude = "";
    const html = renderToStaticMarkup(
      React.createElement(PlannedActionSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      }),
    );

    expect(html).toContain("Adresse libre non géolocalisée");
    expect(html).toContain("l’entrée ou le repère est conservé sans coordonnées");
  });

  it("keeps the authenticated creator read-only and separates co-organizers from participants", () => {
    const form = createInitialFormState("legacy-alias", "action");
    form.organizerType = "association";
    form.organizerAccounts = "user-organizer, user-organizer";
    form.participantAccounts = ["user-participant", "user-participant"];

    const html = renderToStaticMarkup(
      React.createElement(IdentityAndSharingSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        userMetadata: {
          userId: "user-creator",
          displayName: "Maxence",
          handle: "maxence_deroome",
        },
        showGroupJoinHelp: false,
        onToggleGroupJoinHelp: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      } as ComponentProps<typeof IdentityAndSharingSection>),
    );

    expect(html).toContain('data-clerk-user-id="user-creator"');
    expect(html).toContain('value="Maxence"');
    expect(html).toContain("@maxence_deroome");
    expect(html).toContain("Organisateurs associés");
    expect(html).toContain("Inscriptions des bénévoles");
    expect(html).toContain("Inviter des membres");
    expect(html).toContain("Autoriser les demandes d&#x27;inscription");
    expect(html).toContain("Les membres ajoutés recevront une invitation après la publication");
    expect(html).toContain("Rechercher");
    expect(html).toContain('type="search"');
    expect(html).not.toContain('value="legacy-alias"');
    expect(html).not.toContain("actorNameOptions");
  });

  it.each([
    [false, [], "Facultatif"],
    [false, ["user-one"], "1 membre"],
    [true, [], "Facultatif"],
    [true, ["user-one", "user-two"], "2 membres"],
  ] as const)("keeps public requests and pre-registered members independent (%s / %s)", (groupJoinEnabled, participantAccounts, countLabel) => {
    const form = createInitialFormState("legacy-alias", "action");
    form.groupJoinEnabled = groupJoinEnabled;
    form.participantAccounts = [...participantAccounts];

    const html = renderToStaticMarkup(
      React.createElement(IdentityAndSharingSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        userMetadata: { userId: "user-creator", displayName: "Maxence" },
        showGroupJoinHelp: false,
        onToggleGroupJoinHelp: vi.fn(),
        hasAttemptedSubmit: false,
        validationIssueFields: [],
      } as ComponentProps<typeof IdentityAndSharingSection>),
    );

    expect(html).toContain('id="before-group-join-enabled"');
    expect(html).toContain('for="before-group-join-enabled"');
    expect(html).toContain(countLabel);
    expect(html).toContain("Les demandes ne deviennent possibles qu&#x27;après sa publication.");
    expect(html).toContain("Les membres ajoutés recevront une invitation après la publication");
  });
});
