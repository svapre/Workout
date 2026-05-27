# Review Protocol

This project uses a lightweight solo review split:
- OpenAI 5.4 in the IDE: implementation, tests, audits, packet prep, and contract checks
- Claude Sonnet on the web: blind UX review from the rendered UI only
- Claude Opus in the IDE: optional architecture or philosophy review when a change is deeper than routine UI polish

Use [AI_REVIEW_WORKFLOW.md](/d:/code/Workout/app/docs/AI_REVIEW_WORKFLOW.md) as the default working rule.

## Locked Review Principles

- Mobile portrait is the source of truth for runtime and Study surfaces.
- On phone, the whole row or header owns the tap before a small trailing pill does.
- Inline expansion already communicates which stage is open on phone.
- Do not add desktop-style selected or viewing indicators on phone unless explicitly approved.
- Review feedback may identify blockers, but it does not override a locked product principle without explicit human approval.

## When To Stop And Get Human + Claude Review

### ALWAYS review before implementing:
- Any change to data schemas in SPEC.md
- Any new repository or localStorage key
- Any new feature not previously discussed
- Any change to progression engine logic
- Any change to how sessions are written or read
- Any UI that introduces user choices during execution mode
- Any feature that makes the app interpret data and act on it
- Any external dependency or library addition
- Any deviation from the architecture rules in ARCHITECTURE.md

### ALWAYS review after implementing:
- Any new screen
- Any major UI change
- End of every feature before marking complete

### Never needs review:
- Bug fixes with a known, isolated cause
- Grammar or copy fixes
- CSS tweaks within existing patterns
- Playwright test writing
- Renaming variables to match existing spec

## The Default Review Process

FOR ROUTINE UI WORK:
1. Build with OpenAI 5.4 in the IDE.
2. Run tests, audits, and local verification.
3. Export screenshots for the changed screens only.
4. Run one blind UX review with Claude Sonnet on the web in a fresh chat.
5. Compare the feedback against the locked review principles and the current blocker list.
6. Fix only confirmed blockers.
7. Run one blind confirmation review on the same screens.
8. Freeze and move on.

FOR ARCHITECTURE OR SPEC WORK:
1. Stop before coding.
2. Do an informed review with the minimum necessary docs.
3. Decide the direction.
4. Implement with OpenAI 5.4 in the IDE.
5. Verify locally.
6. If the result is still mostly a UX question, finish with a blind web review.

## Review Modes

### Default: Blind UX Review
- Use [BLIND_REVIEW_PROMPT.md](/d:/code/Workout/app/docs/BLIND_REVIEW_PROMPT.md)
- Screenshots only, or the running app only
- No code, contracts, changelog, or implementation summary
- Goal: learn what the UI communicates on its own

### Optional: Task Review
- Use [TASK_REVIEW_PROMPT.md](/d:/code/Workout/app/docs/TASK_REVIEW_PROMPT.md)
- Use this when the main question is task flow, hesitation, or entry path

### Exception: Contract Review
- Use [CONTRACT_REVIEW_PROMPT.md](/d:/code/Workout/app/docs/CONTRACT_REVIEW_PROMPT.md)
- Use only when you are intentionally checking architecture, hierarchy, naming, or interaction rules
- Keep it separate from the blind review, ideally in a separate chat

### Decision Review
- Use [FINAL_DECISION_TEMPLATE.md](/d:/code/Workout/app/docs/FINAL_DECISION_TEMPLATE.md)
- Force a concrete result: `Freeze`, `One narrow pass, then freeze`, or `Not ready`

Rule: do not give contracts before a blind review unless the review is explicitly contract-only.

Rule: after one broad review, switch to blocker-only confirmation reviews instead of reopening the whole family.

## When GPT Suggests Something Unplanned
1. Stop. Do not implement it.
2. Compare it against the locked review principles first.
3. If it still needs philosophy review, escalate it to Claude Opus or an informed contract review.
4. Human decides yes or no.
5. If yes: implement with OpenAI 5.4 in the IDE.
6. If no: document the rejection in DECISIONS.md.

## Red Flags - Stop Immediately If GPT Suggests:
- Adding a recommendation or suggestion engine
- Interpreting reflection/session data to change app behaviour
- Adding analytics charts to the main UI
- Adding social or sharing features
- Using activeState nested object
- Storing activity names instead of exerciseId
- Writing session data to the active plan object
- Adding any external library or framework
- Modifying schema field names without updating SPEC.md

## After Any Approved Change
1. Update CHANGELOG.md with what changed and which files.
2. Update SPEC.md if any schema changed.
3. Update DECISIONS.md if a significant decision was made.
4. Update ONBOARDING.md current state section.

Rule: docs update in the same commit as the code change.
