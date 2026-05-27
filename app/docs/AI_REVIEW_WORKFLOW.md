# AI Review Workflow

This is the default review workflow for this solo project.
Keep it lightweight.

## Model Roles

- OpenAI 5.4 in the IDE: default implementer, verifier, packet builder, and contract checker.
- Claude Sonnet on the web: default blind UX reviewer.
- Claude Opus in the IDE: optional architecture reviewer only when a change touches product philosophy, screen ownership, schema, or an unresolved review conflict.

Rule: do not ask the IDE model to pretend it is a first-time user. It has too much context.

## Locked Mobile Review Principles

- Mobile portrait is the source of truth for runtime and Study surfaces.
- On phone, the whole row or header owns the tap before any small trailing control does.
- Inline expansion already communicates which stage is open on phone.
- Do not add desktop-style selected or viewing indicators on phone unless explicitly approved.
- Do not make a small pill look like the only mobile tap target unless that is truly the intended interaction.

Rule: review feedback does not override a locked product principle unless the human explicitly approves the change.

## Default UI Review Loop

1. Build or adjust the UI with OpenAI 5.4 in the IDE.
2. Run tests, audits, and local verification in the IDE.
3. Export screenshots only for the changed screens.
4. Send those screenshots to Claude Sonnet on the web in a fresh chat.
5. Use a blind UX prompt only. Do not send code, contracts, changelogs, or implementation notes.
6. Compare the feedback against the locked mobile principles and the current blocker list.
7. Fix only confirmed blockers.
8. Run one more blind confirmation review on the same changed screens.
9. Freeze and move on.

## When To Use Claude Opus In The IDE

Use Claude Opus only when one of these is true:

- the change affects architecture or screen ownership
- the change affects a spec or contract
- the blind web review conflicts with a locked product principle
- two reviews disagree and you need a philosophy-level tie-breaker

Do not spend Opus usage on routine screenshot polish checks.

## Blind UX Review Rules

- Give the reviewer only the rendered UI: screenshots, short video, or the running app.
- Prefer neutral filenames like `screen-01-mobile.png` when possible.
- Do not provide repo paths, component names, contracts, or implementation summaries.
- Ask the reviewer to separate `Observed`, `Unclear`, and `Inferred` findings.
- Treat only `Observed` issues as confirmed UX evidence.

## Informed Review Rules

If you intentionally want a contract or architecture review, run it as a separate review in a separate chat.

- Label it as informed review, not blind UX review.
- Give only the minimum docs needed.
- Do not let informed-review suggestions silently rewrite locked mobile principles.

## Review Scope Rule

Do one broad review only when the architecture is still in motion.
After that, switch to blocker-only confirmation reviews.

Do not reopen the whole screen family every time a narrow UI fix lands.
