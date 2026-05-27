# Blind Mobile UI/UX Deep Review Results

*Recorded on: 2026-05-27*  
*Target Packet: `blind-poco-x6-deep_2026-05-27_081500` (17 screens, curated Poco X6 mobile-portrait)*

---

## 1. What each screen is trying to do (grouped by flow)

**Home / Today flow (Screens 1–2):** Screen 1 is the dashboard — it tells the user their current training status, which plans are ready, and surfaces the active plan card with a one-tap "Start workout" CTA. Screen 2 is the continuation of the same scroll: it reveals the locked next stage and a recent sessions panel. Together they answer "what do I do today?"

**Plan guide / stage detail (Screen 3):** Breaks down the active plan's stages and ordered steps inside each stage. Purpose is orientation — showing where the user is in the full arc and what each cycle step contains.

**Activity library & detail (Screens 4–5):** Screen 4 is a searchable/filterable catalogue of all movements and practices. Screen 5 (mid-scroll on an activity detail) shows the muscle diagram, tags, focus, equipment, tracking mode, and collapsible profile/context sections.

**Routine detail & editor (Screens 6–8):** Screen 6 is a read-only routine overview (muscle map, metadata). Screen 7 exposes the editable ordered-entry list with per-entry controls. Screen 8 finishes the list and shows the destructive/save action footer.

**Plan templates & template editor (Screens 9–11):** Screen 9 is the template library. Screen 10 is a template detail/preview. Screen 11 is the stage list in edit mode with move/edit/delete controls per stage.

**Stage editing (Screen 12):** Form for editing a single stage — name, progress rule, objective, and the cycle/step builder below the fold.

**History (Screens 13–14):** Screen 13 is the history overview with aggregate stats and a plan-picker. Screen 14 is a plan-scoped history view with a weekly calendar strip and plan-level stats.

**Session start modal (Screen 15):** A pre-flight summary sheet showing all exercises and set counts before the user commits to starting the routine.

**Live workout player (Screens 16–17):** Screen 16 is the active set view — exercise name, set counter, rep target, and CTA buttons. Screen 17 is the rest timer between sets, showing countdown and next-up context.

---

## 2. Main objects and relationships

The model is: a **Plan Template** (blueprint) contains **Stages** (unlockable phases) which contain ordered **Steps** (either a Routine reference or a rest day). A **Routine** holds ordered **Activity Entries** — each entry pointing at a library **Activity** with a specific set/rep config. When a template is activated it becomes an **Active Plan**, which logs **Sessions**, each session logging individual **Set logs** (reps, weight, result).

---

## 3. Interactive vs. static elements

**Observed interactive signals:**
- Teal/filled buttons ("Start workout", "Save Changes") are the strongest CTA hierarchy. Dark-outlined pill buttons ("View plan guide", "Open history") are secondary.
- Cards with an orange or teal left-border stripe (plan cards on Home) appear tappable — but there is no chevron, affordance text, or state change indicated. *Unclear whether the card body itself is tappable or only the buttons inside it.*
- The "Open →" link on the Activity Library card (Screen 4) is the only text-link affordance visible.
- Collapsible sections ("Activity Profile", "Supporting Context", Screen 5) use a "V" label — **Observed weak affordance**: the chevron is uppercase text, not an icon, and blends with the all-caps heading style.
- "Move Earlier / Move Later / Remove" buttons in the routine editor (Screens 7–8) are visually distinct from static metadata text beneath the exercise name.
- The stage cards in Screen 11 are expandable — tapping shows the action buttons — but there is no visible collapsed/expanded toggle indicator. **Observed ambiguity.**
- Bottom tab bar is clearly a nav; the active state uses teal + underline, inactive states are white.

**How interactive elements differ from data labels (Observed):**
Buttons use a rounded-rectangle border (full border). Data labels use no border or a dark background chip (e.g., "STAGE 1 / FOUNDATION"). The system is consistent enough to be learnable but the distinction breaks down for full-width card rows that look like buttons but may just be display sections.

---

## 4. What happens when major elements are tapped

| Element | Screen | Inferred behavior |
|---|---|---|
| "Start workout" (teal) | 1, 2 | Opens session pre-flight modal (Screen 15) |
| "View plan guide" | 1 | Navigates to Screen 3 (Plan Guide) |
| Plan card (SB header area) | 1 | Unclear — may expand card or go to plan detail |
| "2 Plans" pill (top right) | 1 | Unclear — possibly switches between active plans |
| Routine step row (e.g., Strength Foundation A → ) | 3 | Opens Screen 6 (Routine Detail) |
| "Open →" on activity card | 4 | Opens activity detail (Screen 5) |
| "Activity Profile" / "Supporting Context" | 5 | Expands section in-place |
| "Move Earlier / Move Later" | 7, 8 | Reorders the entry in the list |
| "Remove" (red text) | 7, 8 | Removes entry from routine (destructive, no visible confirm) |
| "Delete Routine" | 8 | Deletes the template permanently |
| "Save Changes" (teal) | 8, 11 | Persists edits |
| "Discard Changes" | 8, 11 | Reverts all edits |
| "Open template" (teal/orange) | 9 | Opens Screen 10 (template detail) |
| Day cell in calendar (Screen 14) | 14 | Selects that day's session and updates the panel below |
| "Start routine" | 15 | Dismisses modal and begins live player (Screen 16) |
| "Complete Set" | 16 | Logs the set as complete, triggers rest timer (Screen 17) |
| "Partial" (orange) | 16 | Logs a partial completion — exact behavior unclear |
| "Skip Set" | 16 | Advances without logging the set |
| "Skip Rest" | 17 | Jumps directly to the next set |
| "End session" (dark red) | 16, 17 | Exits the live player — likely prompts confirmation |

---

## 5. Vague, duplicated, technical, or misleading labels

**Observed issues:**

- **"2 READY / 0 REST" pills (Screen 1):** The meaning of "READY" vs "REST" in this context is not self-evident without prior knowledge of the plan cycle. A first-time user won't know if "0 REST" means no rest days scheduled or the rest-day step has been completed. `Vague`
- **"3 PLANNED STEPS" (Screen 1):** "Steps" and "stages" coexist — both are structural concepts but at different hierarchy levels. New users can easily conflate them. `Duplicated concept risk`
- **"Tap this stage to open Study" (Screen 2):** "Study" appears nowhere else in the visible UI. It sounds like a mode or feature that has an internal/product name leaking through. `Technical/internal`
- **"STAGE IDENTITY / Stage goal" (Screen 12):** "Stage identity" is a section heading and "Stage goal" is a subheading for the same form. Both labels describe the same thing — the purpose of a stage. `Duplicated`
- **"How progress works" → "Advance when cleared" (Screen 12):** The dropdown option is opaque. "Cleared" means different things in fitness contexts. The label does no work explaining the mechanic. `Vague`
- **"Routine notes" (Screen 7, implied):** The textarea with "This should be the first session the audit lands on" reads like developer test data, not real content — but it reveals that "audit" is a concept in the system with no visible explanation. `Technical/internal`
- **"V" as a chevron (Screen 5):** Using capital "V" as a collapse/expand indicator is unconventional and visually inconsistent with standard mobile affordances. `Misleading`
- **"Import plan package" (Screen 1) vs "Import Template" (Screen 9) vs "Import Catalog" (Screen 4):** Three different "import" actions with slightly different nouns across three screens — creates uncertainty about what is being imported where. `Duplicated/inconsistent`
- **"1 of 4 cycle completions complete" (Screen 1):** "Completions complete" is redundant phrasing. `Duplicated word`
- **"Stage progress: 1 of 2" with a two-dot progress bar (Screen 1):** The progress bar appears to track stages (1 of 2) but the label says "stage progress." It's actually *plan* progress at the stage level. Small but `Vague`.

---

## 6. Mobile-first vs. dense/desktop-derived screens

The live player (Screens 16–17) is the most mobile-native surface in the app — large touch targets, minimal chrome, just the essential action. The routine editor and template stage editor are the clearest outliers: stacking three to four full-width buttons per list item creates very long scroll distances with no swipe-to-reorder, no drag handle, and no quick action model.

---

## Cross-screen task evaluation

- **Determine what to do next/today right from the home screen**: `Easy` — Prominent "Start workout" teal CTA card.
- **Understand current stage & progression rule of active plan**: `Mixed` — Staged progress and cycles are tracked but cycle logic vs stage bar is slightly ambiguous.
- **Select a stage and understand how stage study works inline on phone**: `Fragile` — Reference to "Study" with no explanation or clear entrance indicator.
- **Browse exercise library and inspect a specific exercise's details**: `Easy` — Smooth categorization, clean layouts, and nice muscle target highlights.
- **Edit a reusable routine (add/reorder/modify sets)**: `Fragile` — Heavy vertical stack of 3-4 full-width reordering buttons per item leads to extremely long scrolling.
- **Create, configure, or edit a master blueprint and stages**: `Fragile` — Stage reordering relies on the same stack of buttons per node.
- **Analyze workout history and view logged sets**: `Easy` / `Mixed` — Nice weekly summary and selected-session panel, though granular logs aren't fully drillable from stats cards.
- **Start and execute a live workout using the player**: `Easy` — Exceedingly clear big button controls for start, set completion, skip, and rest.

---

## Top 5 Observed mobile UX problems (ranked by severity)

**#1 — Routine and stage editor uses stacked full-width buttons per item (Screens 7, 8, 11)**
Each entry renders three to four full-width pill buttons (Move Earlier, Move Later, Remove/Delete) directly beneath the item. With four routine entries, this means approximately 12 full-width buttons stacked in a single scrollable list. There is no drag-to-reorder handle, no swipe action, and no contextual action sheet. The visual weight of the buttons competes with the content itself. On a 390pt portrait phone this creates 5–6 full screens of scroll just to manage a basic routine — deeply at odds with mobile editing patterns.

**#2 — "Study" is referenced but never defined or navigable (Screen 2)**
"Tap this stage to open Study" appears on a locked stage card with no other visible reference to what Study is, where it lives, or what it does. This reads as an internal product term that was not translated into user-facing language. For a user trying to prepare for the next stage, this is a dead end.

**#3 — "Remove" and "Delete" actions have no visible confirmation (Screens 7, 8)**
Tapping "Remove" on a routine entry or "Delete Routine" on Screen 8 appears to be immediate and irreversible based on what's visible. There is no undo indicator, no confirmation sheet, and no visual warning state. "Delete Routine" is styled with a dark-red background but no explanatory copy beyond a generic sentence about the planning library.

**#4 — The "Partial" action in the live player has no tooltip, label, or inline explanation (Screen 16)**
During a live workout the user sees three action-level choices: Complete Set, Partial, and Skip Set. "Partial" is orange (implying caution) but its exact behavior — does it prompt a rep count? does it flag the set? — is entirely opaque. For a user mid-set, pausing to figure this out is friction at the worst possible moment.

**#5 — Progress bar on the home plan card is ambiguous (Screen 1)**
The two-dot progress bar with "Stage progress: 1 of 2" visually suggests binary stage completion. But the plan also tracks cycle completions (1 of 4) shown as a separate data tile. The two metrics can seem contradictory — a user is on stage 1 but has only done 1 of 4 cycles. The relationship between "stage progress" and "cycle completions" is not visually explained, and a user could reasonably think they need to complete all 4 cycles before progressing and also think the progress bar says they're already halfway through.

---

## What is still Unclear from the screenshots

- **What "Study" is** — referenced in locked stage hint text (Screen 2) but never shown or explained.
- **Whether plan cards on the home screen are tappable** — no chevron, no tap state indicator.
- **How a new activity entry is added** to a routine — no "Add activity" button is visible in Screens 7–8.
- **What "Partial" logs** — a reduced rep count, a flag, or something else.
- **Whether "Remove" and "Delete" have confirmation dialogs** — none are shown.
- **How stage editing connects to the cycle/step builder** — the "Cycle Builder / Ordered steps" section is cut off at the bottom of Screen 12.
- **What the "2 Plans" pill on the home plan card does** — possibly switches between plans, possibly a count label only.
- **How session set logs are accessed in history** — Screen 14 shows aggregate stats but no drill-down path is visible.
- **What the top-right hamburger/filter icon does** on Screen 6 (highlighted teal, "Routines" tab active) — it appears context-specific but its action is unclear.

---

## Final UX verdict

**One narrow pass**

The core daily loop — see today's plan, start a workout, complete sets, rest — is genuinely well executed and mobile-native. The live player (Screens 16–17) is strong. The home dashboard is clear. But the moment a user steps outside that loop — into editing, into plan building, into understanding progression mechanics — the experience becomes fragile. The routine and stage editors are the most urgent issues: they use a desktop-style button-stack pattern that is incompatible with comfortable portrait-mode editing. Fix those two editors, define "Study," add Remove confirmations, and explain "Partial" — and this app would rate as no clear blocker.
