# Group Action Publishing - plan

## Context

This feature extends the current action declaration flow with a group participation path.

## Design Principles

- Minimize duplicate form entry.
- Keep the join flow explicit and reversible where possible.
- Preserve compatibility with existing action statistics.
- Add validation before persisting any participation share.

## Proposed Architecture

### UI

- Add a group action entry point inside the `Agir` block.
- Add a join action affordance in homepage cards, history entries and map bubbles.
- Keep the group action form isolated from the solo declaration form.

### API

- Add a dedicated join-group endpoint if existing endpoints cannot express the participation semantics cleanly.
- Validate action eligibility, ownership and duplicate participation.
- Return a normalized participation payload for UI refresh.

### Data Model

- Add `groupId` to actions that belong to a group.
- Track participant counts and per-user shares.
- Store each participation as an auditable record rather than an implicit counter only.

### Testing

- Unit tests for validation and share allocation.
- Integration tests for join flow and duplicate joins.
- UI tests for the visible entry points.

## Implementation Order

1. Define the data model and validation rules.
2. Build the join endpoint.
3. Wire the UI entry points.
4. Add tests for the nominal flow and error cases.
5. Update documentation and examples.

## Risks

- Share allocation can become inconsistent if the rules are ambiguous.
- Reusing an existing endpoint may hide the semantics of group participation.
- UI duplication across homepage, history and map can drift if not centralized.

