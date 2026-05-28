# Feature: Group Action Publishing & Join Form

## Goal
Add a workflow allowing a single volunteer to publish a group action. Other volunteers can join the group via a "Rejoindre un formulaire" button, automatically attributing a share of the data to their personal statistics without filling the full form each time. Integrate UI elements:
- "Rejoindre un formulaire" in the "Agir" block.
- "J'ai participé à cette action" buttons on the homepage, action history page, and map action bubbles.

## User Review Required
- Confirm the wording for the new buttons (French/English).
- Approve the location of the new "Rejoindre un formulaire" section in the "Agir" block.
- Validate any changes to the data model for storing group participation counts.

## Open Questions
- Should the group action form include optional fields for extra comments?
- How should the system distribute the collected data proportionally among participants?
- Do we need a new API endpoint for joining a group action, or can we reuse existing ones?

## Proposed Changes
### Frontend Components
- **[NEW]** `components/sections/rubriques/group-action-form.tsx` – UI for publishing a group action.
- **[MODIFY]** `components/sections/rubriques/methodologie-page-client.tsx` – Add "Rejoindre un formulaire" card in the "Agir" block.
- **[MODIFY]** `components/homepage/ActionCards.tsx` – Insert "J'ai participé à cette action" button on each action card.
- **[MODIFY]** `pages/history.tsx` – Add join button next to each historic action entry.
- **[MODIFY]** `components/maps/ActionBubble.tsx` – Add join button on map bubbles.
### Backend / API
- **[NEW]** `pages/api/actions/join-group.ts` – Endpoint to register a volunteer joining an existing group action, compute share allocation.
- **[MODIFY]** `lib/models/action.ts` – Extend schema with `groupId`, `participantsCount`, and `participantShares`.
### Database / Supabase
- **[NEW]** Migration to add columns `group_id`, `participants_count` to `actions` table.
- **[NEW]** Migration to create `action_participants` join table for per‑user shares.
### Tests
- Add unit tests for new API endpoint.
- Update Playwright UI tests to cover new buttons.
### Documentation
- Update `documentation/features/group-action.md` with usage guide.
- Add entries in the Open Source Docs list.

## Verification Plan
### Automated Tests
- Run `npm run test` to ensure existing and new unit tests pass.
- Run `npm run playwright` to verify UI flow for publishing, joining, and stats update.
- Execute `npm run typecheck` and `npm run lint`.
### Manual Verification
- Deploy locally (`npm run dev`) and manually create a group action, then join with a second user to confirm stats update.
- Check that the new buttons appear on homepage, history page, and map bubbles.
- Verify that the "Rejoindre un formulaire" section appears in the "Agir" block and is responsive.

---
*Implementation plan created. Awaiting your feedback before proceeding.*
