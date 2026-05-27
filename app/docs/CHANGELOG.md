# Changelog
Newest first. Append only. Never delete entries.

Format for new entries:
## 2026-05-08 - [Feature or Fix Name]
- What changed
- Files affected
- Status: complete | needs-review | in-progress

---

## 2026-05-27 - Documentation Freshness Audit + Enforcement Check
- Audited all documentation against the actual codebase and fixed drift in ARCHITECTURE.md (file structure now lists every real module), ONBOARDING.md (current state updated to 2026-05-27 with Poco X6 audit and sw.js entries), and README.md (rewritten to match current product scope).
- Added a documentation-freshness enforcement script (`doc-freshness-check.mjs`) that validates key docs are not stale when source code changes, enforcing the existing docs-in-same-commit rule from REVIEW_PROTOCOL.md.
- Committed and pushed all accumulated Codex work plus documentation updates to GitHub.
- Status: complete
- Files: ARCHITECTURE.md, ONBOARDING.md, README.md, CHANGELOG.md, doc-freshness-check.mjs


## 2026-05-15 - Style C Overlay Body Map Pipeline + Mobile Install Shell
- Replaced the old combined-guide body-map build with a locked Style C overlay pipeline: neutral front/back figures now provide the visible silhouette, and one white overlay per muscle group now generates the final front/back masks directly without multicolor region splitting.
- Added a dedicated extraction spec for the overlay workflow, regenerated the runtime body-map assets, and revalidated the exercise-detail body visual on mobile and responsive audits.
- Added a lightweight installable mobile shell with a web manifest, home-screen metadata, and generated app icons so the existing responsive web app can be saved and launched more like a mobile app.
- Status: complete
- Files: app/web/assets/body-map/*, app/docs/BODY_MAP_EXTRACTION_SPEC.md, app/docs/CHANGELOG.md, app/docs/ARCHITECTURE.md, app/docs/DECISIONS.md, app/docs/ONBOARDING.md, app/web/index.html, app/web/manifest.webmanifest, app/web/assets/icons/*

## 2026-05-15 - Raster Body Map Asset Rebuild
- Replaced the failing hand-drawn body-map direction with a raster-backed asset pipeline built from the approved neutral and colored guide figures, then regenerated the production front/back transparent bases and grouped region masks that the existing body-visual component already knows how to render.
- Tightened mask extraction around the actual guide palette so front and back highlights stay separated by region instead of bleeding across similar hues, and revalidated the new body visuals in mobile and responsive exercise-detail screenshots.
- Status: complete
- Files: app/web/assets/body-map/*, app/docs/CHANGELOG.md

## 2026-05-14 - Body Visual Reference Rebuild
- Rebuilt the muscle-map region geometry from the approved Gemini silhouette and grouped-region guides, replacing the improvised plates with broader front/back muscle families that align to the product's consumer-fitness resolution.
- Tuned the body-visual shell and glow styling so the reference-derived regions carry the anatomy read while the surrounding figure stays calm and premium on activity detail surfaces.
- Status: complete
- Files: bodyVisuals.js, styles.css, CHANGELOG.md

## 2026-05-14 - Body Visual Human Silhouette Pass
- Reworked the muscle-map figure so the main read comes from continuous front/back body contours instead of disconnected internal shell pieces, then reduced the ambient aura and softened the interior shading so the body reads more like a human silhouette than a mannequin.
- Status: complete
- Files: bodyVisuals.js, styles.css, CHANGELOG.md

## 2026-05-14 - Body Visual Anatomy Refinement
- Refined the new muscle map into a more anatomical front/back figure by tightening the silhouette, separating front and back landmark lines, reducing the broad figure aura, and sharpening the muscle-region geometry so activity detail reads less like a generic mannequin.
- Fixed the runtime break from the prior body-map pass by restoring the missing back-landmark definition and re-ran mobile and responsive UI audits to confirm the updated SVG renders cleanly across activity and routine surfaces.
- Status: complete
- Files: bodyVisuals.js, styles.css, CHANGELOG.md

## 2026-05-14 - Beautification Phase 1 Foundation
- Added a shared semantic color system for plans, domains, and lifecycle states, then applied it across active-plan cards, history accents, and activity visuals so the app reads faster at a glance without turning noisy.
- Rebuilt the body visual from the old rect-based figure into a stylized front/back muscle map with contoured SVG regions, gradient target fills, and calmer premium framing for both physical and fallback practice visuals.
- Added a week-strip calendar rail plus date-grouped session feed to Workout History, wired `selectedHistoryDate` into app state and history actions, and updated the mobile audit to validate the new calendar-first flow instead of the old flat list assumption.
- Status: complete
- Files: app.js, styles.css, mobile-ui-audit.mjs, semanticColors.js, bodyVisuals.js, primaryVisuals.js, displayModels.js, exerciseView.js, historyWeekRail.js, workoutView.js, activePlansView.js, CHANGELOG.md

## 2026-05-14 - Starter Content Preservation Audit
- Added a focused Playwright audit that seeds custom body targets, activities, routines, and blueprints alongside starter content, marks the starter bundle as stale, removes selected starter items, and verifies the app restores only the missing starter content without wiping or duplicating user-owned library content.
- Confirmed the preserved custom blueprint remains runnable after the starter re-sync and re-ran the custom library roundtrip audit successfully to keep the authoring-to-runtime path covered.
- Status: complete
- Files: starter-content-preservation-audit.mjs, CHANGELOG.md

## 2026-05-14 - Body Target Reference Protection
- Added a lightweight body-target library/detail flow inside Activities so shared custom targets are now reachable, reviewable, and deletable only when nothing saved still depends on them.
- Guarded custom target deletion so a target still used by saved activities cannot be removed, while unused custom targets can be deleted safely with a clear notice.
- Added a focused Playwright audit for both paths and re-ran the custom library roundtrip successfully to confirm the new target-management flow did not break activity authoring or runtime behavior.
- Status: complete
- Files: app.js, exerciseView.js, styles.css, body-target-reference-protection-audit.mjs, CHANGELOG.md

## 2026-05-14 - Exercise Reference Deletion Protection
- Added guarded deletion for custom activities on the activity detail screen, so a custom exercise can only be removed when it is no longer referenced by saved routines, blueprints, active plans, or logged sessions.
- Surfaced clear dependency notices when deletion is blocked and added a focused Playwright audit that proves a referenced activity is protected while an unused activity still deletes successfully without harming dependent saved content.
- Re-ran the custom library roundtrip audit successfully to confirm the new activity-deletion guard did not break the authoring-to-runtime library flow.
- Status: complete
- Files: app.js, exerciseView.js, exerciseService.js, exercise-reference-protection-audit.mjs, CHANGELOG.md

## 2026-05-14 - Routine Reference Deletion Protection
- Blocked routine deletion when the routine is still referenced by saved blueprints or active plans, and surfaced a clear notice that names the kinds of dependencies still using it so routine cleanup cannot silently break saved journeys.
- Added a focused Playwright audit that proves the protected delete is blocked, verifies an unused routine still deletes successfully, and confirms the dependent blueprint and active plan remain healthy afterward.
- Re-ran the custom library roundtrip audit successfully to confirm the new deletion guard did not break the authoring-to-runtime library flow.
- Status: complete
- Files: app.js, routine-reference-protection-audit.mjs, CHANGELOG.md

## 2026-05-14 - Final History Mobile Clarity Pass
- Tightened the workout-history experience for mobile by renaming the remaining audit-style labels to more user-facing language (`Plan edits`, `Stage progress`, `Viewing every plan`, `No sessions for this plan`), removing the visible plan-version field from the summary panel, and softening version-history entries into plan-edit records instead of raw version headers.
- Strengthened selected-plan context while scrolling through history by making the history focus card sticky on mobile, so the current plan/session relationship stays visible deeper into the detail stack.
- Polished two remaining home-surface copy points that the blind review kept calling out: active-plan cards now say `planned step(s)` instead of `ordered step(s)`, and the import action now reads `Import plan package`.
- Status: complete
- Files: workoutView.js, activePlansView.js, styles.css, CHANGELOG.md

## 2026-05-14 - Mobile History Orientation And Copy Cleanup
- Reworked the workout-history mobile flow so the screen now explains its stacked behavior more clearly: plan/session details are explicitly framed as the content below the chooser, the desktop-only "from the left" language is gone, and each history section now advertises its expand/collapse action more clearly on touch screens.
- Simplified history vocabulary to be more user-facing by renaming internal labels such as `Plan snapshot`, `Journey metadata`, and `Revision history` to clearer terms like `Plan details`, `Dates and status`, and `Saved updates`, while also softening archived/removed copy.
- Added a focused history context card above the detail stack to make the currently selected plan/session relationship easier to understand on mobile, and strengthened the archive-modal backdrop so the confirmation state competes less with the content behind it.
- Status: complete
- Files: workoutView.js, styles.css, CHANGELOG.md

## 2026-05-14 - Large-State Mobile Readiness Audit
- Added a focused Playwright audit that seeds a fuller mobile app state with multiple live plans, extra session history, and an archived plan, then verifies the key review-worthy surfaces still hold up: Active Plans home, active-plan detail, history overview, archived history filter, and active history filter.
- Re-ran the mobile and responsive UI guardrails successfully after the large-state pass to confirm the fuller dataset did not introduce new overflow, navigation, or console issues across the main app surfaces.
- Status: complete
- Files: large-state-mobile-audit.mjs, CHANGELOG.md

## 2026-05-13 - Package Version Compatibility Hardening
- Tightened package-version handling so blueprint imports now explicitly reject unsupported `exportVersion` values while still allowing legacy blueprint packages that simply predate the version field, and active-plan / revision package failures now name the specific package type in their error copy instead of using a generic export-version message.
- Added a focused compatibility check that proves four behaviors: legacy blueprint packages without `exportVersion` still import, unsupported blueprint package versions fail clearly without partial writes, unsupported active-plan package versions fail clearly without partial writes, and unsupported revision packages become blocking reviews with an explicit compatibility issue.
- Re-ran the import-mode hardening check plus the blueprint package and active-plan package roundtrip regressions successfully.
- Status: complete
- Files: planService.js, activePlanRevision.js, package-version-compatibility-check.mjs, CHANGELOG.md

## 2026-05-13 - Draft Interruption And Refresh Guard Hardening
- Added a browser-level unsaved-work guard so blueprint drafts, live-plan drafts, routine drafts, and in-progress workout player state now trigger the standard refresh/close warning instead of being silently lost on browser reload or tab close.
- Added a focused Playwright audit that proves both live-plan and blueprint editing behave safely under interruption: section-switch `Stay` keeps the draft, dismissing the browser refresh warning preserves the draft, and accepting the refresh drops only the unsaved draft while leaving saved content unchanged.
- Re-ran the live-plan editor audit and blueprint authoring roundtrip audit successfully to confirm the new global guard did not break either editor flow.
- Status: complete
- Files: app.js, draft-interruption-recovery-audit.mjs, CHANGELOG.md

## 2026-05-13 - Active Plan Import Conflict Audit
- Added a focused Playwright audit that exports a real active-plan package and then proves three failure modes stay safe through the UI: importing the same active plan twice, importing into a conflicting custom exercise catalog, and importing into workout history that already contains one of the package session ids.
- Verified that these blocked imports surface a visible notice to the user and do not partially write active plans, routines, exercises, body targets, or workout history when the conflict is rejected.
- Status: complete
- Files: active-plan-import-conflict-audit.mjs, CHANGELOG.md

## 2026-05-13 - Multi Active Plan Isolation Audit
- Added a focused Playwright audit that activates two live instances of the same blueprint, switches between them in user-chosen order, runs sessions independently, revises one plan, archives the other, and then verifies that session history, current progress, revision history, and archived snapshots stay isolated per plan.
- Verified the intended multi-plan behavior for the app: users can continue any active plan they choose, and one plan's workouts, revisions, or archive actions do not mutate the other plan's live journey or history filters.
- Status: complete
- Files: multi-active-plan-isolation-audit.mjs, CHANGELOG.md

## 2026-05-13 - Active Plan Archive Export Restore Continuity Audit
- Added a focused Playwright audit that exports a live plan package while the plan is active, archives that plan and verifies the archived snapshot stays readable in history, then restores the exported package into a clean app state and confirms the restored plan can continue running with preserved stage history, revision history, session history, and custom exercise dependencies.
- Verified the intended continuity story for in-progress journeys without adding more product code: active export remains trustworthy after archive, archived history snapshots remain intact, and the restored package can keep moving forward in runtime and history.
- Status: complete
- Files: active-plan-archive-restore-continuity-audit.mjs, CHANGELOG.md

## 2026-05-13 - Active Plan Package Restore
- Added a real active-plan package restore path to the app so exported live-plan packages can now be imported from the Active Plans dashboard into a clean app state, carrying over their dependent exercises, routines, workout sessions, stage history, and revision history.
- Added a focused Playwright audit that exports a seeded live plan through the UI, resets the app to a clean state, restores the package through the new import entry point, runs another workout, and verifies the restored history remains intact.
- Status: complete
- Files: planService.js, app.js, activePlansView.js, styles.css, active-plan-package-restore-audit.mjs, CHANGELOG.md

## 2026-05-13 - Full Plan Package Roundtrip + Custom Exercise Portability
- Added a focused Playwright audit that exports an authored blueprint package through the UI, resets the app to a starter-only state, re-imports the package, activates it, runs the first session, and confirms the imported content survives into runtime and history.
- Hardened full-plan blueprint packages so they now carry referenced exercises and body targets alongside the plan and routines, and updated import handling to merge those dependencies into the local libraries before resolving the plan package.
- Status: complete
- Files: full-plan-package-roundtrip-audit.mjs, planService.js, app.js, CHANGELOG.md

## 2026-05-13 - Custom Library Roundtrip Audit
- Added a focused Playwright audit that imports a custom activity through the Exercise Library, authors a new routine around it, wires that routine into a newly authored blueprint, activates the blueprint into a live plan, runs the first workout, and confirms the custom content survives into history.
- Verified the real current product path for custom building blocks: imported exercise -> authored routine -> authored blueprint -> activated plan -> runtime session -> history.
- Status: complete
- Files: custom-library-roundtrip-audit.mjs, CHANGELOG.md

## 2026-05-13 - Blueprint Authoring Roundtrip Audit
- Added a focused Playwright audit that creates a new blueprint, edits two stages with authored routine selections, activates the blueprint into a live plan, runs the first workout, and confirms the authored names and routine choices carry through into runtime history.
- Adjusted the audit to work with the app's starter blueprint library by asserting that the authored blueprint is persisted and activated correctly rather than assuming an empty catalog.
- Status: complete
- Files: blueprint-authoring-roundtrip-audit.mjs, CHANGELOG.md

## 2026-05-13 - Save Review Feedback And Confirmation Pass
- Added the missing shell-level success banner for notices that were already being set in state, so saving a live-plan update now lands with visible confirmation instead of relying on the user to infer success from the detail screen.
- Tightened the save-review screen by renaming the preview panel, making the disabled save button describe what is missing (`Choose stage to save`, `Add summary to save`, etc.), and keeping the required stage choice visually tied to the blocked save state.
- Status: complete
- Files: shell.js, activePlanRevisionView.js, CHANGELOG.md

## 2026-05-13 - Live Plan Review Flow Clarified On Mobile
- Pulled `Stage mapping` to the top of the live-plan save review, hid low-value empty panels, added a stronger required-action panel, and made the blocked save state visibly read as blocked when the stage choice or summary is still missing.
- Rewrote internal editor/review copy such as `Blueprint reference`, `Theme Code`, and `Completed-stage edits ignored`, and simplified the live-plan editor's read-only progress labeling so mobile editing reads more like product UI and less like raw system data.
- Status: complete
- Files: activePlanRevisionView.js, activePlanEditorView.js, styles.css, CHANGELOG.md

## 2026-05-13 - Live Plan Editor Audit For Edit Apply And Execution
- Rebuilt the focused Playwright audit for the live-plan editor around the current mobile-first detail flow: open `Plan tools`, edit live-plan metadata, trigger a remap review by changing the current stage's active ordered step, apply the revision, then run the revised plan and confirm the new session appears in history under the updated active-plan version.
- Verified that direct saves bump the live-plan version, remap review preserves draft state when backing out, manual anchor apply resets day/cycle state correctly, and the revised routine still executes cleanly after the change.
- Status: complete
- Files: live-plan-editor-audit.mjs, CHANGELOG.md

## 2026-05-13 - Plan Lifecycle Audit For Archive Remove And History
- Added a focused Playwright audit that activates two plans, logs one session on each, archives one, removes the other, and verifies both read-only journey snapshots remain available from History with preserved stage, revision, and session timelines.
- Confirmed the active queue clears both plans correctly and that archived/removed snapshots keep their session references after lifecycle actions.
- Status: complete
- Files: plan-lifecycle-audit.mjs, CHANGELOG.md

## 2026-05-13 - Milestone Progression Audit + Export Hardening
- Hardened blob-based CSV and JSON exports by routing them through a shared delayed-revoke helper, which fixes the race where the browser could lose the download before it fully started.
- Updated the milestone state-machine Playwright audit to open the real `Plan tools` disclosure before exporting, then verified the full progression matrix: pass/advance, fail/restart, fail/stay, demotion, rest-step completion, and duration-session progression.
- Status: complete
- Files: app.js, milestone-state-machine-audit.mjs, CHANGELOG.md

## 2026-05-13 - Core Loop Audit For Blueprint To History
- Added a focused Playwright audit that resets the app, activates a starter blueprint, opens the new active plan, runs a full workout session, verifies progress changes, and confirms the session appears in history.
- Verified the main `blueprint -> active plan -> workout -> history` loop successfully against the live app with screenshots captured from the audit run.
- Status: complete
- Files: core-loop-audit.mjs, CHANGELOG.md

## 2026-05-13 - Mobile Stage Tap Ownership Cleanup
- Removed the mobile-first regression where plan-family Study and detail screens leaned on tiny trailing pills to communicate stage actions. On phone, later-stage detail rows now emphasize whole-row tap ownership instead of a pill-first `Study stage` cue.
- Removed the redundant mobile `Viewing`-style selected treatment from Study nodes, kept desktop split-view affordances intact, and shifted mobile Study back toward an expanded node plus attached script model with clearer whole-stage touch hints.
- Status: complete
- Files: journeyNodes.js, studyView.js, activePlanDetailView.js, plansView.js, styles.css, CHANGELOG.md

## 2026-05-13 - Solo AI Review Workflow Split
- Added a lightweight review workflow doc that matches the actual tool setup: OpenAI 5.4 in the IDE as implementer and verifier, Claude Sonnet on the web as the default blind UX reviewer, and Claude Opus in the IDE as an optional architecture tie-breaker.
- Updated the review protocol and blind-review prompt so blind UX review now means UI-only evidence, no contracts or code, and a blocker-only loop after the first broad pass.
- Marked the shared `plan-thorough` packet prompt as an informed review path rather than the default human-like UX review path, and recorded the new review split in the decision log.
- Status: complete
- Files: AI_REVIEW_WORKFLOW.md, REVIEW_PROTOCOL.md, BLIND_REVIEW_PROMPT.md, cross-ai-review-bundles-latest/plan-thorough/PROMPT_FOR_ANY_AI.txt, DECISIONS.md, CHANGELOG.md

## 2026-05-12 - Review Process Postmortem
- Added a diagnosis document that explains how review feedback reintroduced desktop-style mobile indicators into the plan family, maps the drift across the recent changelog entries, and identifies the contract/prompt rules that amplified the problem.
- Recorded the locked mobile-portrait principles that should have taken priority, plus a proposed set of future process rules for preventing review-to-contract drift before the protocol itself is changed.
- Status: complete
- Files: REVIEW_PROCESS_POSTMORTEM.md, CHANGELOG.md

## 2026-05-12 - Study Node Grammar + Compare Card Tightening
- Tightened blueprint comparison cards into shorter compare-first summaries, switched the list chips to more user-facing sentence-case commitment cues, and combined the opening-stage read into a single lighter comparison note so the mobile list reads less like a field stack.
- Updated Study node grammar on phone by replacing the `Select / Selected` wording with `View stage / Viewing`, adding an explicit touch-selection hint, and flattening the selected stage script so it reads as an attached script instead of a nested second card.
- Re-ran `node --check`, the mobile UI audit, and the responsive UI audit successfully, refreshed the shared plan review bundle, and created a new timestamped review packet with unified modified times for the next confirmation review.
- Status: complete
- Files: plansView.js, journeyNodes.js, studyView.js, styles.css, cross-ai-review-bundles-latest/plan-thorough, review-packets/plan-thorough_2026-05-12_230642, CHANGELOG.md


## 2026-05-12 - Blueprint Compare + Mobile Study Selection Pass
- Reworked blueprint comparison cards to use shorter compare-first copy, normalized starting-stage values, and a lighter `Starting stage / Opening focus` summary block so the list reads less like stacked mini detail pages.
- Strengthened mobile Study selection by making the `Select` affordance read like a real touch control, giving the attached script its own visual container, and preserving the existing active-vs-blueprint color split.
- Re-ran `node --check`, the mobile UI audit, and the responsive UI audit successfully, refreshed the shared plan review packet, and created a new timestamped packet with unified modified times for the next confirmation review.
- Status: complete
- Files: plansView.js, styles.css, mobile-ui-audit.mjs, responsive-ui-audit.mjs, cross-ai-review-bundles-latest/plan-thorough, review-packets/plan-thorough_2026-05-12_212355, CHANGELOG.md

## 2026-05-12 - Plan Freeze Candidate Review Cleanup
- Removed the remaining Study-language and hierarchy leaks: desktop Study no longer repeats the selected-stage goal, mobile Study uses `Select / Selected` instead of `Open`, and plan-family copy now standardizes on `ordered steps`.
- Restored the mobile blueprint detail CTA zone to sit below the adoption content, kept lower path previews on later stages only, and softened blueprint compare labels into sentence case on phone so the comparison cards read less like raw field stacks.
- Re-ran `node --check`, the mobile UI audit, and the responsive UI audit successfully, updated the audit selectors to the current `Later stages` heading, spot-checked the regenerated screenshots, synced the shared plan packet, and created a fresh timestamped review folder with unified modified times.
- Status: complete
- Files: studyView.js, journeyNodes.js, plansView.js, activePlansView.js, activePlanEditorView.js, activePlanRevision.js, styles.css, mobile-ui-audit.mjs, responsive-ui-audit.mjs, cross-ai-review-bundles-latest/plan-thorough, review-packets/plan-thorough_2026-05-12_160713, CHANGELOG.md

## 2026-05-12 - Final Plan Study + Blueprint Compare Pass
- Removed the duplicate goal sentence from mobile Study, added a visible `Open / Selected` selection cue to stage nodes on touch screens, and tightened the inline script styling so phone Study reads more like a selected node with an attached script instead of a stacked chapter card.
- Compressed blueprint comparison cards with shorter sentence-safe copy, renamed the compare cue to `Opening focus`, surfaced `Study blueprint` higher in the mobile blueprint detail action zone, and introduced `Later stage` template labels so blueprint surfaces read less like live runtime screens.
- Updated the plan-family contracts to record the new mobile Study and blueprint-comparison rules, re-ran `node --check`, the mobile UI audit, and the responsive UI audit successfully, then refreshed the shared plan packet and created a new timestamped review folder for the next confirmation review.
- Status: complete
- Files: studyView.js, journeyNodes.js, plansView.js, styles.css, PLAN_SURFACE_REDESIGN_CONTRACT.md, PLAN_INTERACTION_CONTRACT.md, mobile-ui-audit.mjs, responsive-ui-audit.mjs, cross-ai-review-bundles-latest/plan-thorough, review-packets/plan-thorough_2026-05-12_143833, CHANGELOG.md

## 2026-05-12 - Plan Review Alignment + Packet Refresh
- Aligned the plan-family contract stack to the newer goal-first stage-object model by rewriting the plan redesign contract, extending the plan interaction contract with a normalized verb system, and clarifying in screen contracts that detail-page path previews may omit duplicated current/opening-stage goals.
- Applied the narrow plan-family UI pass: lighter path previews on active-plan and blueprint detail, consistent `View/Study/Create active plan` action labels, stronger recent-session navigation affordances, and a mobile Study tweak so the selected stage node still states the goal while the attached script owns the process.
- Re-ran `node --check`, the mobile UI audit, and the responsive UI audit successfully, then resynced the shared `cross-ai-review-bundles-latest/plan-thorough` packet with the latest screenshots and copied contracts for the pending external plan review.
- Status: complete
- Files: PLAN_SURFACE_REDESIGN_CONTRACT.md, PLAN_INTERACTION_CONTRACT.md, SCREEN_CONTRACTS.md, journeyNodes.js, activePlanDetailView.js, plansView.js, studyView.js, activePlansView.js, progressionEngine.js, displayModels.js, activePlanEditorView.js, styles.css, mobile-ui-audit.mjs, responsive-ui-audit.mjs, cross-ai-review-bundles-latest/plan-thorough, CHANGELOG.md

## 2026-05-12 - Plan Compact Translation + Mobile Study Cleanup
- Reworked the plan compact surfaces so blueprint cards compare name, goal, starting stage, and cadence without the old article-style adoption copy, while active-plan cards and plan detail now translate stage labels into clearer `Stage N / Name` wording
- Renamed path/history copy in the reviewed plan surfaces (`Plan stages`, `active plan`, `Milestone test ready`, `Felt strong`, `full repeats`) so the app no longer mixes internal journey/reflection language into compact user-facing screens
- Softened the mobile Study shell to feel more like a selected path node with an attached script, updated cadence text away from opaque `cycle` jargon, refreshed the mobile/responsive audits to match the new wording, and resynced the shared cross-AI review bundles to the new screenshots/docs
- Status: complete
- Files: plansView.js, activePlansView.js, activePlanDetailView.js, workoutView.js, routineView.js, journeyNodes.js, progressionEngine.js, displayModels.js, activePlanEditorView.js, styles.css, mobile-ui-audit.mjs, responsive-ui-audit.mjs, cross-ai-review-bundles-latest/plan-thorough, cross-ai-review-bundles-latest/ui-language, CHANGELOG.md

## 2026-05-12 - Cross-AI Review Bundle Parent Folder
- Added one shared parent folder, `cross-ai-review-bundles-latest/`, so review packets no longer need separate GPT and Claude copies just to change the prompt filename
- Kept the two review scopes inside that parent folder as AI-agnostic 20-file bundles: `plan-thorough/` and `ui-language/`, each with a single `PROMPT_FOR_ANY_AI.txt`
- Verified the copied docs and screenshots hash-match the latest source files
- Status: complete
- Files: cross-ai-review-bundles-latest/README.md, cross-ai-review-bundles-latest/plan-thorough, cross-ai-review-bundles-latest/ui-language, CHANGELOG.md

## 2026-05-12 - Phased Single-Pass Review Packet Prompts
- Rewrote the active GPT and Claude plan-review and UI-language-review packet prompts so a reviewer can receive the full folder at once but must still answer in four strict phases: blind read, task inference, contract check, and final decision
- This keeps the review practical for single-upload workflows while preserving the blind-first discipline needed to test whether the UI explains itself before the docs are consulted
- Status: complete
- Files: gpt-plan-thorough-review-bundle-latest/PROMPT_FOR_REVIEWER_GPT.txt, claude-plan-thorough-review-bundle-latest/PROMPT_FOR_CLAUDE.txt, gpt-ui-language-review-bundle-latest/PROMPT_FOR_REVIEWER_GPT.txt, claude-ui-language-review-bundle-latest/PROMPT_FOR_CLAUDE.txt, CHANGELOG.md

## 2026-05-12 - Layered Review Framework Docs
- Added reusable blind-review, task-review, contract-review, and final-decision prompt templates so screenshot reviews can separate what the UI communicates from what the team intended
- Rewrote `REVIEW_PROTOCOL.md` to make the layered screenshot review the default process for future GPT and Claude UI reviews
- Status: complete
- Files: BLIND_REVIEW_PROMPT.md, TASK_REVIEW_PROMPT.md, CONTRACT_REVIEW_PROMPT.md, FINAL_DECISION_TEMPLATE.md, REVIEW_PROTOCOL.md, CHANGELOG.md

## 2026-05-12 - Pre-Review Vocabulary Lock + Bundle Refresh
- Locked the public UI term to `Activity` across navigation, library/detail surfaces, routine authoring, workout history, workout player, and plan-update flows while keeping internal `exerciseId` storage unchanged
- Removed the last user-facing internal wording like `revision`, `Exercise profile`, and `Unknown Exercise`, then aligned the UI contracts so the review docs now match the app language
- Re-ran `node --check`, mobile UI audit, and responsive UI audit successfully, then refreshed the current GPT/Claude plan and UI-language review bundles so each folder is clean and back to exactly 20 files
- Status: complete
- Files: shell.js, exerciseView.js, routineView.js, routineDetailView.js, displayModels.js, plansView.js, activePlanEditorView.js, activePlanDetailView.js, activePlanRevisionView.js, workoutView.js, workoutPlayerView.js, app.js, activePlanRevision.js, UI_LANGUAGE_CONTRACT.md, MOBILE_COMPACT_VIEW_CONTRACT.md, SCREEN_CONTRACTS.md, UI_FRAMEWORK.md, ARCHITECTURE.md, CHANGELOG.md, gpt-plan-thorough-review-bundle-latest, claude-plan-thorough-review-bundle-latest, gpt-ui-language-review-bundle-latest, claude-ui-language-review-bundle-latest

## 2026-05-11 - Stage Surface Contract Pass
- Added `STAGE_SURFACE_CONTRACT.md` and `STAGE_STEP_CONTRACT.md` so stage cards and stage steps share one object grammar across detail, study, and editor previews
- Refactored plan stage surfaces so compact stage cards stay goal-first while ordered routine/rest process now lives in Study and editor script blocks
- Standardized routine and rest step rendering under one shared stage-step helper and updated the UI audits to enforce compact-goal vs detailed-process ownership
- Status: complete
- Files: stageStepViews.js, plansView.js, studyView.js, activePlanDetailView.js, styles.css, mobile-ui-audit.mjs, responsive-ui-audit.mjs, SCREEN_CONTRACTS.md, STAGE_SURFACE_CONTRACT.md, STAGE_STEP_CONTRACT.md, UI_FRAMEWORK.md, ARCHITECTURE.md, CHANGELOG.md

## 2026-05-11 - Mobile Compact Card Pass
- Compressed the mobile active-plan cards into clearer scan-first launch cards by replacing the heavy mission stack with state tags, a simple stage-progress track, and just the current-stage/progress facts the card actually needs
- Simplified mobile Study stage nodes so the rail now reads like selectable stages with one cue instead of mini chapters, while the attached expansion owns the ordered script on phone
- Reduced blueprint list cards into lighter compare cards with shorter goal copy, a tighter commitment tag, and a single compact summary block for `Best for` and `Opening cycle`
- Reordered workout history on mobile so plan/session pickers come before the selected detail, then auto-scroll the chosen detail into view after selection instead of snapping back to the top of the page
- Updated the mobile audit to protect the new workout-history ordering contract and re-ran both mobile and responsive audits successfully
- Status: complete
- Files: activePlansView.js, activePlanDetailView.js, plansView.js, workoutView.js, styles.css, mobile-ui-audit.mjs, CHANGELOG.md

## 2026-05-11 - Cross-App Mobile Language Cleanup Pass
- Removed internal and meta-facing language from key phone surfaces so exercise, workout history, study, and editor screens now lead with user-facing names instead of implementation vocabulary
- Compressed mobile compact cards across exercise, routines, active plans, and blueprint surfaces so list/index views answer item, state, and action without reading like mini detail pages
- Simplified mobile Study by hiding the desktop summary band and selection ring on phones, trimming stage-node explanation from the rail, and moving the deeper explanation into the selected-stage detail
- Cleaned workout history naming by removing raw IDs and zero-value noise from the main flow, and fixed set-breakdown rows to show only user-meaningful columns
- Re-ran `node --check` on all touched UI files plus the mobile and responsive audits after restoring the explicit blueprint adoption-thesis label required by the plan editor checks
- Status: complete
- Files: exerciseView.js, routineView.js, activePlansView.js, activePlanDetailView.js, studyView.js, journeyNodes.js, plansView.js, workoutView.js, styles.css, CHANGELOG.md

## 2026-05-11 - Cross-App UI Language Review Packets
- Created focused Claude and GPT review bundles for the new cross-app naming and mobile-compact contracts instead of reusing the heavier plan-only review packets
- Packed each folder with exactly 20 files: 15 current screenshots plus the prompt, review brief, and the three source-of-truth contracts needed for critique
- Verified that the copied screenshots and docs hash-match the latest source files so external reviews are grounded in the current UI and contracts
- Status: complete
- Files: claude-ui-language-review-bundle-latest, gpt-ui-language-review-bundle-latest, CHANGELOG.md

## 2026-05-11 - Cross-App UI Language + Mobile Compact Contracts
- Added `UI_LANGUAGE_CONTRACT.md` to define user-facing naming, compact labeling, and action-label rules across Exercise, Routine, Stage, Blueprint, and Active Plan
- Added `MOBILE_COMPACT_VIEW_CONTRACT.md` to lock portrait-phone compact-view priorities, fixed hierarchy, and attached-expansion behavior before the rest of the app is reviewed section by section
- Linked the new contracts from `ARCHITECTURE.md` and `UI_FRAMEWORK.md` so naming and compact mobile behavior are treated as default app rules instead of plan-only guidance
- Status: complete
- Files: UI_LANGUAGE_CONTRACT.md, MOBILE_COMPACT_VIEW_CONTRACT.md, ARCHITECTURE.md, UI_FRAMEWORK.md, CHANGELOG.md

## 2026-05-11 - Blueprint Authoring + Study Selection Cleanup
- Added explicit blueprint adoption inputs in the blueprint editor so the writer now authors the same adoption promise and audience framing that blueprint detail and the list rely on
- Compressed blueprint list cards by shortening the comparison copy, tightening the compare grid, and collapsing the opening-cycle hint into a lighter one-line summary
- Strengthened the Study selection affordance so selected vs unselected stage nodes read more like a real stateful selector instead of identical circles
- Status: complete
- Files: plansView.js, styles.css, mobile-ui-audit.mjs, responsive-ui-audit.mjs, CHANGELOG.md

## 2026-05-08 - Import Capability Hardening
- Training-plan JSON imports, full blueprint imports, and active-plan revision packages now reject unsupported routine prescriptions and invalid milestone test mode combinations instead of silently accepting them
- Full-plan import validation now happens before writes, so invalid imports stay atomic and do not partially add routines or plans
- Added a code-level import hardening check plus a visible revision-review Playwright audit covering blocked invalid revisions and successful valid revisions
- Status: complete
Files: schemaMigration.js, trainingPlanImport.js, planService.js, activePlanRevision.js, import-mode-hardening-check.mjs, revision-mode-hardening-audit.mjs, DECISIONS.md, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Exercise Modeling Documentation Clarified
- Tightened the existing docs so future sessions do not have to rediscover the exercise-classification rule from chat history
- Documented that exercises are stable movement identities, multi-mode support belongs in `supportedTrackingModes`, materially different variations should become separate exercises, and notes are for human guidance only
- Status: complete
Files: SPEC.md, DECISIONS.md, ONBOARDING.md, CHANGELOG.md

## 2026-05-08 - Exercise Capability Modes
- Added `supportedTrackingModes` to exercises while keeping `trackingType` as the default/preferred mode, so one exercise can support more than one valid prescription/test mode without storing plan-specific values on the base exercise
- Routine editing, stage milestone editors, CSV/import normalization, and the workout player now respect supported modes and the actual prescription fields instead of assuming the exercise default is the only valid mode
- Bird Dog-style exercises can now be prescribed or tested as reps or duration, while routine entries still stay the source of truth for exact targets
- Status: complete
Files: schemaMigration.js, defaultExerciseCatalog.js, trainingPlanImport.js, exerciseCatalogCsv.js, routineCsv.js, exerciseView.js, routineView.js, plansView.js, activePlanEditorView.js, workoutPlayerView.js, progressionEngine.js, app.js, activePlanRevision.js, SPEC.md, DECISIONS.md, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Dashboard Rest-State + History Upgrade
- Home rest-step cards now surface completed-stage states instead of staying visually stuck on generic rest CTAs; milestone-complete rest cards can now show review or stage-advance actions directly on the dashboard
- Active plan detail now exposes archive and remove-from-active-list actions, and final-stage completion promotes archiving as the primary action while still allowing the user to continue the current stage
- History is no longer a flat workout list; it now includes plan-aware filtering across active plans, archived plans, and removed-plan remnants so past journeys and sessions can be revisited together
- Added a visible Playwright audit covering dashboard rest-step completion, final-stage archive flow, active-plan removal, and the upgraded history slices for archived and removed plans
- Status: complete
Files: activePlansView.js, activePlanDetailView.js, workoutView.js, app.js, history-rest-audit.mjs, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Rest-Step + Completion Flow Hardening
- Reframed rest-day UI copy into neutral rest-step language and made stage-readiness explicit after a rest-step completion
- Active plan detail now promotes the single most relevant next action, so stage advancement becomes the clear primary CTA when a milestone is reached
- Finished sessions now persist before reflection, final sets no longer force an unnecessary last rest screen, and leaving the post-session screen no longer triggers an abandon-workout prompt
- Added a visible targeted Playwright audit covering rest-step completion, post-session exit behavior, reflection persistence, and the still-open mixed-tracking Bird Dog limitation
- Status: complete
Files: app.js, activePlansView.js, activePlanDetailView.js, narrativeService.js, workoutPlayerView.js, workoutRepository.js, workoutService.js, exploratory-ux-audit.mjs, CHANGELOG.md, ONBOARDING.md

## 2026-05-08 - Bootstrap Hardening + Final Regression
- Removed the destructive master-seed reinjection path so existing local libraries are no longer wiped just because a specific seed blueprint is missing
- Added a broad visible Playwright regression covering safe boot without reseeding, direct live-plan editing, routine execution, active-plan export, revision import, and continued progression after apply
- Added a reusable visible-audit PowerShell wrapper so future headed Playwright runs can reuse one stable command pattern instead of ad hoc browser-launch commands
- Status: complete
Files: app.js, run-visible-audit.ps1, final-regression-audit.mjs, CHANGELOG.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Direct Live Plan Editing
- Added a direct in-app live-plan editor for active plans, reusing the blueprint-style editor shell while freezing completed stages and allowing metadata plus current/future stage edits
- Live-plan saves now auto-apply clean edits, while risky current-stage changes route through the existing review/remap screen before writing to the active plan
- Successful direct edits now append `versionHistory` with `modifiedBy: "user"` and preserve sessions, runtime counters, and completed-stage history ownership
- Added a visible Playwright audit covering direct metadata save, frozen completed stages, manual remap review, return-to-editor behavior, and successful remap apply
- Status: complete
Files: app.js, activePlanDetailView.js, activePlanEditorView.js, activePlanRevisionView.js, activePlanRevision.js, planService.js, shell.js, live-plan-editor-audit.mjs, run-visible-audit.ps1, CHANGELOG.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Living-Plan Revision Import
- Added an import-first active-plan revision workflow with a dedicated review screen, active-plan detail entrypoint, and safe apply path that preserves local session history and runtime ownership
- Imported active-plan revisions now normalize shared-library dependencies by adding new body targets, exercises, and routines when needed, while never overwriting existing shared library items in place
- Current and future stages can be revised, completed stages stay frozen, stale revisions require explicit acknowledgement, and missing current-stage mappings force a manual anchor before apply
- Added a visible Playwright audit covering happy-path revision apply, stale warning acknowledgement, manual anchor remap, and blocking body-target conflict behavior
- Status: complete
Files: app.js, activePlanDetailView.js, activePlanRevisionView.js, activePlanRevision.js, planService.js, shell.js, schemaMigration.js, living-plan-revision-audit.mjs, CHANGELOG.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Responsive Layout Expansion Pass
- Expanded the shared layout system for short landscape phones, tablet portrait, tablet landscape, and a lightweight desktop smoke layout without breaking the phone-first execution flow
- Added responsive shell and content refinements for compact-height devices, wider active-plan grids, and a cleaner workout-history split at tablet portrait sizes
- Added a visible multi-viewport Playwright audit covering phone landscape, tablet portrait, tablet landscape, and desktop smoke checks with no horizontal overflow and no console or page errors
- Status: complete
Files: styles.css, responsive-ui-audit.mjs

## 2026-05-08 - UI Framework Hardening Pass
- Standardized the shared shell, page spacing, action rows, detail shells, sticky active-plan CTA container, and modal behavior so phone-sized screens either fit cleanly or scroll intentionally
- Rebuilt home, active-plan detail, exercise detail, routine editor, blueprint detail/editor, stage editor, and workout history around the same mobile-safe layout primitives and removed the remaining visible mojibake from the main UI
- Added a local SVG favicon and expanded the visible Playwright mobile audit to cover home plus active-plan detail in addition to exercises, routines, plans, editors, and workout history
- Verified on a visible phone-sized Playwright run with no console or page errors and no horizontal overflow across the audited screens
- Status: complete
Files: styles.css, shell.js, activePlansView.js, activePlanDetailView.js, exerciseView.js, routineView.js, plansView.js, workoutView.js, modal.js, mobile-ui-audit.mjs, index.html, favicon.svg, schemaMigration.js

## 2026-05-08 - Milestone Test State Machine
- Replaced flat stage milestones with an eligibility-plus-test model so stages can unlock an explicit milestone test before advancing
- Added stage-entry and standalone/custom exercise tests, plus plan-defined failure outcomes for stay, restart-stage, or goto-stage transitions
- Workout player now supports milestone-test sessions, failed-test handling, explicit stage restarts/demotions, and stage-history episode resets when a plan restarts a stage
- Verified in a visible Playwright audit across pass-and-advance, pass-and-stay, restart-stage failure, goto-stage demotion, rest-step completion, duration-based input, and active-plan export
- Status: complete
Files: schemaMigration.js, stageProgression.js, progressionEngine.js, plansView.js, workoutPlayerView.js, activePlanDetailView.js, dashboardView.js, journeyContext.js, app.js, SPEC.md, DECISIONS.md

## 2026-05-08 - Library + Planning Mobile UI Pass
- Rebuilt the Exercise Library, Routine Library, and Plan Blueprints list cards around the active-plan card rhythm for stronger hierarchy on phone-sized screens
- Moved blueprint activation into an above-the-fold summary card, fixed stage-editor mobile overflow, and made workout history surface the selected detail first on mobile
- Verified on a visible phone-sized Playwright audit across exercises, routines, plans, blueprint editor, stage editor, and workout history with no layout-related console/page errors
- Status: complete
Files: exerciseView.js, routineView.js, plansView.js, workoutView.js, styles.css, mobile-ui-audit.mjs

## 2026-05-08 - Mobile Workout Player Fit + Scroll Fix
- Workout player now uses an internal immersive scroll container on execution routes so tall mobile screens can still reach lower controls
- Added compact mobile layouts for pre-workout, active-set, and rest screens to keep key controls in view on phone-sized viewports
- Verified on a visible mobile Playwright pass with a duration-based exercise, pause/resume, partial, skip set, skip rest, milestone transition, reflection, and rest-day no-routine flow
- Status: complete
Files: workoutPlayerView.js, styles.css

## 2026-05-08 - Execution Mode + Journey Progress Polish
- Workout-player routes now remove the shell header and mobile nav structurally, with immersive main-content layout
- Active plan detail progress now reflects milestone-aware progress text instead of assuming every stage is cycle-based
- Dashboard, active-plan detail, and workout-player primary CTAs now inherit plan theme colors more consistently
- Status: complete
Files: shell.js, styles.css, activePlansView.js, activePlanDetailView.js, workoutPlayerView.js

## 2026-05-08 - Schema Alignment Pass
- Session writes now persist `reflectionRating` and legacy `perceivedDifficulty` reads migrate cleanly
- Workout player now resolves exercise names from `exerciseId` at render time, logs `partial` and `skipped` sets correctly, and advances `stageHistory` only on real stage transitions
- Training JSON imports now resolve routine entries against existing and same-file exercises, remap imported routine IDs in stage schedules, and fail atomically when any exercise reference is unresolved
- Added spec-shaped active-plan export from the active plan detail screen
- Status: complete
Files: workoutPlayerView.js, journeyContext.js, trainingPlanImport.js, planService.js, app.js, activePlanDetailView.js, workoutView.js, SPEC.md, DECISIONS.md, ONBOARDING.md

## 2026-05-08 - Ceremony + Reflection Layer
- Added session completion ceremony screen
- Added 3-button reflection step (Strong/Normal/Difficult)
- Added Clean Immersive Mode (hides nav during ceremony)
- Added continuity messaging for rest days
- Status: needs-review (reflectionRating persistence unverified)
Files: workoutPlayerView.js, styles.css

## 2026-05-08 - Stage Roadmap UI
- Added Stage Roadmap card to Active Plan detail screen
- Dot track showing completed/current/locked stages
- Current stage detail with milestone description
- Fixed grammar: "1 stage remaining" vs "stages remaining"
Files: activePlanDetailView.js

## 2026-05-08 - Dashboard Redesign
- Added "Good morning" greeting with context
- TODAY'S MISSION framing on plan cards
- Rest day cards visually differentiated
- RECOVERY FOCUS messaging for rest days
- Next session name resolved and displayed
Files: activePlansView.js, styles.css

## 2026-05-08 - Data Layer Migration
- Migrated exercise schema (mode -> trackingType, summary -> description)
- Migrated routine schema (exercises -> entries, field renames)
- Migrated plan blueprint schema (versioning, onFailure, requiresContinuous, predecessorStageId, typed schedule)
- Migrated active plan (removed activeState, flattened fields)
- Created bodyMapRepository with 14 muscle groups
- Sessions now write to workoutRepository not active plan
Files: all repositories, planService.js, activePlanService.js, workoutPlayerView.js







