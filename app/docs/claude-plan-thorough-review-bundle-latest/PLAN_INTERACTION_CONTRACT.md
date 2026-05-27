# Plan Interaction Contract

Purpose: define one consistent tap vocabulary for the plan family so users can tell, from the UI alone, whether an element is static, expands inline, changes selection, or navigates deeper.

## Core Vocabulary

### Static Badge
- Job: communicate state or taxonomy only.
- Behavior: never tappable.
- Visual rule: compact badge treatment, no chevron, no hover-lift, no button chrome.
- Examples: `Current`, `Upcoming`, `Opening stage`, summary facts, stage-count badges.

### Navigation Node
- Job: move from a lighter plan view into Study with a specific stage pre-selected.
- Behavior: navigates to Study.
- Visual rule: card/node treatment plus explicit trailing navigation affordance.
- Examples: journey-path stage nodes on `Active Plan Detail` and `Blueprint Detail`.

### Selection Node
- Job: change which stage is open inside Study while keeping the user inside the same path context.
- Behavior: selects a stage; on desktop it updates the detail pane, on mobile it expands inline.
- Visual rule: selected-state styling, but no trailing navigation chevron.
- Examples: stage nodes inside `Active Plan Study` and `Blueprint Study`.

### Inline Disclosure
- Job: reveal more detail inside the current context.
- Behavior: expands/collapses inline.
- Visual rule: disclosure arrow/chevron that rotates or clearly indicates expansion.
- Examples: `Plan Tools`, `Plan Lifecycle`, future inline sections.

### Navigation Row
- Job: open the next level of detail.
- Behavior: navigates deeper.
- Visual rule: row or title with a trailing chevron.
- Examples: ordered routine rows inside Study schedules, recent-session rows, routine rows in future stage detail contexts.

### Navigation Chip
- Job: open a deeper detail view from a compact sequence preview.
- Behavior: navigates deeper.
- Visual rule: chip/pill styling that is visibly interactive and distinct from static labels.
- Examples: routine segments in cycle strips on detail and study surfaces.

## Plan-Family Rules

### Active Plans / Blueprint Lists
- Cycle hints are static.
- List cards are scan-first and should not hide routine-detail navigation inside compact comparison cards.
- Cards themselves may navigate to their owner surface.

### Active Plan Detail / Blueprint Detail
- The current or opening stage node owns the richer compact stage preview.
- Routine chips inside that preview navigate to `Routine Detail`.
- Journey-path nodes navigate to Study with the tapped stage pre-selected.
- Detail screens should not inline a full Stage Detail chapter.

### Study Surfaces
- Stage nodes are selection controls, not navigation cards.
- The selected stage owns the attached script/detail area.
- Routine chips inside selected-stage nodes navigate to `Routine Detail`.
- Ordered routine rows navigate to `Routine Detail` and must show a clear row-level affordance.

### Editors
- Stage preview nodes are previews first.
- Reorder, edit, and delete controls must be explicit and separate from preview content.
- Interactive editing controls must not masquerade as static preview chips.

## Composition Rules
- Upper levels may compose lower-level compact views and summaries.
- Upper levels must not inline lower-level detail views unless the local screen contract explicitly owns that detail.
- A summary is allowed to reference compact-view content, but it must not recreate a hidden one-off interaction model.

## Review Checklist
- Can a user tell which pills are tappable without trying them?
- Does every navigation target show a navigation affordance?
- Does every inline expansion show a disclosure affordance?
- If a user taps one stage, does the app answer with that stage selected?
- Are static badges visually distinct from tappable chips?
- Does each screen level reuse the same interaction vocabulary?