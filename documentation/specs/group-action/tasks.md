# Group Action Publishing - tasks

## [ ] 1. Lock the rules

- [ ] Confirm the final wording for the join CTA.
- [ ] Decide whether the share is equal, weighted, or organizer-defined.
- [ ] Confirm whether join is allowed more than once per user.

## [ ] 2. Model the data

- [ ] Add the group participation fields to the action model.
- [ ] Add the participation join table or equivalent persistence layer.
- [ ] Define validation for duplicate participation and invalid shares.

## [ ] 3. Implement the backend flow

- [ ] Create the join-group endpoint or refactor the existing endpoint.
- [ ] Normalize the returned payload for UI refresh.
- [ ] Handle failure states explicitly.

## [ ] 4. Update the UI

- [ ] Add the group action entry point in the `Agir` block.
- [ ] Add the join CTA to homepage cards.
- [ ] Add the join CTA to action history rows.
- [ ] Add the join CTA to map bubbles.

## [ ] 5. Test

- [ ] Add unit tests for share allocation.
- [ ] Add integration tests for the join flow.
- [ ] Add UI tests for the visible entry points.
- [ ] Add regression coverage for duplicate joins.

## [ ] 6. Document

- [ ] Update the feature documentation with user-facing usage.
- [ ] Update the plan file to point to the spec artifacts.
- [ ] Record any open decision that changes the intended behavior.

