# Contract Review Prompt

Purpose: compare the visible UI against the intended model after the blind and task-based passes are complete.

Use this prompt after:
1. Blind screenshot review
2. Task-based screenshot review

This pass is where contracts, specs, and interaction docs are introduced.

## Why This Exists
- The blind pass tests what the UI communicates.
- The task pass tests whether the UI supports user goals.
- This pass tests whether the design matches the intended architecture and whether the architecture itself is worth keeping.

## Inputs
- Screenshots
- Relevant contracts and specs
- Optional: prior blind-review and task-review outputs

## Recommended Docs
Choose only the documents relevant to the surfaces under review.
Examples:
- SCREEN_CONTRACTS.md
- UI_LANGUAGE_CONTRACT.md
- MOBILE_COMPACT_VIEW_CONTRACT.md
- PLAN_INTERACTION_CONTRACT.md
- STAGE_SURFACE_CONTRACT.md
- STAGE_STEP_CONTRACT.md
- PLAN_SURFACE_REDESIGN_CONTRACT.md
- SPEC.md

## Rules For The Reviewer
- First compare visible UI against the stated contract.
- Then judge whether the contract itself is good or too rigid.
- Do not assume the written contract is automatically correct.
- Separate screen failures from contract failures.
- Prioritize the highest-leverage mismatches.

## Questions To Answer
1. Does the UI match the intended object hierarchy?
2. Does each screen respect compact vs detail vs study ownership?
3. Does naming match the public language contract?
4. Does interaction match the tap/disclosure/navigation contract?
5. Are similar objects treated similarly across the app?
6. Which mismatches are visual-only, and which are structural?
7. Which parts of the contract should change, if any?
8. What can be frozen and what still needs framework work?

## Required Output Shape
- Contract Conformance Review
- Where The UI Matches Intention
- Where The UI Violates The Contract
- Where The Contract Itself Is Weak
- Recommended Next Pass
- Freeze / Do Not Freeze

## Prompt Template
Use files directly from:
`[FOLDER_PATH]`

First review the screenshots against the contracts below.
Then judge whether the contracts themselves are good enough.

Docs in scope:
- [DOC_1]
- [DOC_2]
- [DOC_3]
- [DOC_4]

Instructions:
- Treat this as an independent contract-conformance review.
- Do not assume the written contracts are correct just because they exist.
- Separate UI mismatch from contract weakness.
- Be explicit about what is framework-complete versus what still needs structural work.
- Prioritize mobile-first clarity when phone screenshots are part of the packet.

Please answer:
1. Where does the UI match the intended hierarchy and ownership model?
2. Where does it violate the contracts?
3. Which repeated objects are still inconsistent?
4. Is the interaction language coherent?
5. Which parts of the contracts should be kept, changed, or removed?
6. What is the next narrow pass before beautification or freeze?

Please structure your answer as:
- Contract Conformance Review
- Where The UI Matches Intention
- Where The UI Violates The Contract
- Where The Contract Itself Is Weak
- Recommended Next Pass
- Freeze / Do Not Freeze
