# Mobile Compact View Contract

Purpose: define the source-of-truth behavior for portrait-phone compact surfaces across the app.

This app is mobile-first. Portrait smartphone views are the primary design target. Tablet and desktop may add clarity, but they must not become the design source that mobile merely inherits.

## Device Priority
1. Phone portrait: source of truth
2. Tablet: adaptive expansion of the phone model
3. Desktop: broad overview / split-pane adaptation
4. Phone landscape: fallback only; no special product investment required beyond not breaking core flows

## Global Compact Rules

### Compact means scan-first
A compact mobile surface should answer:
- what is this?
- what state is it in?
- what do I do next?

A compact mobile surface should not try to answer:
- why the whole system exists
- how every step works
- deep philosophy or coaching rationale

### Standard footprint over variable essays
Compact cards and nodes should stay within a predictable size band.
They may grow a little for status or action state, but should not swing between tiny chips and mini articles.

### Fixed hierarchy
Compact mobile views should prefer this order:
1. identity
2. state
3. required action
4. one progress/process cue

### One compact process cue
Use one compact visual/process representation, not multiple stacked summaries.
Examples:
- one cycle strip
- one milestone progress line
- one next action row

Do not stack:
- long description text
- extra summary tiles
- repeated progress panels
- detail-level paragraphs

## Mobile Selection and Expansion

### Whole node is the target
On phone portrait, selected nodes should usually be selected by tapping the whole node, not by tapping a tiny secondary control.

### Expansion must read as attached
When a compact item expands inline, the expanded body must feel physically attached to the selected item.
It should read like one selected object opening downward, not like a second card dropped underneath.

### Do not duplicate the compact summary inside the expansion
The compact node owns:
- title
- state
- compact process cue
- milestone cue

The attached expansion owns:
- short purpose line
- ordered script
- one short support line

## Mobile Rules By Object

### Activity compact
Should show:
- clear movement/practice identity
- one or two high-signal tags

Should not show:
- full setup guidance
- long descriptions

### Routine compact
Should show:
- routine type or user-facing name
- cycle slot or context when relevant
- one cue for duration or effort shape

Should not show:
- full activity script inline

### Stage compact
Should show:
- `Stage N / Name`
- state
- milestone progress or unlock cue
- compact cycle map
- one required action when relevant

Should not show:
- long stage purpose paragraphs
- duplicated detail text
- vague routine names with no cycle-slot context

### Plan compact
Should show:
- plan identity
- current state or fit
- one required action
- one progress/commitment cue

Should not show:
- deep descriptive copy
- stacked mini-panels that recreate detail views

## Labeling Rules For Mobile Compact Views
- Prefer translated, user-facing labels over internal names.
- If a routine name is abstract, pair it with its role.
- Example: `Cycle day 1 routine / Arrival breath reset` instead of only `Attention Arrival`.
- Use `Rest day` plainly.
- Use `Cycle day N` instead of `Day N` unless the model is truly calendar-day based.

## Visual Rules
- Color may reinforce meaning but may not be the only cue.
- State must be visible without reading long paragraphs.
- Selected items must be obvious at a glance.
- Static labels and tappable controls must not share the same visual weight.
- Avoid tiny low-contrast helper text on mobile.

## Plan-Specific Mobile Rules

### Active Plan cards
Must prioritize:
- current stage
- required action now
- milestone progress / locked vs unlocked sense

Must avoid:
- long purpose text
- too many nested panels
- multiple representations of the same progress fact

### Plan Detail stage cards
Must be lighter than Study/detail.
They are overview cards, not explanations.

### Study on mobile
Should feel like:
- path + selected node + attached script

Should not feel like:
- large bordered chapter cards hanging on a rail

## Review Checklist
- Does the compact mobile view explain what the card/node represents without extra reading?
- Is the required action obvious?
- Is the selected item clearly selected and expanded?
- Are internal names translated into user-facing compact labels when needed?
- Is the compact process cue singular and easy to scan?
- Would this still work if the user only glanced at it for two seconds while training?
