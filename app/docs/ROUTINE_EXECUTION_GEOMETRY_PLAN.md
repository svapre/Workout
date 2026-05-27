# Routine Execution Geometry Plan

## Purpose
Freeze the routine-detail execution layout before any more implementation passes.

This plan exists to stop screenshot-by-screenshot tweaking and replace it with one stable contract for:
- desktop
- tablet
- phone
- max-parameter work rows
- minimal one-parameter work rows

The goal is for Routine Detail to read like an executable script, not a stack of mini-cards and not a cramped equal-width table.

## Current Problems

### 1. Over-nested geometry
The routine detail surface still carries too much container chrome:
- entry card
- execution flow section
- round group
- row cells
- command chips

The hierarchy is understandable, but too much padding and too many borders are spent to express it.

### 2. Equal-width metric columns break on max-parameter rows
The current table model treats all metrics as peer columns. That causes long values like tempo to wrap awkwardly and forces secondary metrics to compete with primary ones.

### 3. Command rows and transition rows still feel chip-built
`Rest`, `Switch`, and `Next in flow` are semantically correct, but they still inherit too much of the token/chip treatment instead of reading like parts of one execution script.

### 4. Desktop and mobile still share the wrong mental model
Desktop wants a compact multicolumn script.
Phone wants a compressed vertical execution list.
We should preserve one contract, but not force identical row geometry across both.

## Research Conclusions

### Apple HIG
- Lists and tables are appropriate for grouped or hierarchical data.
- Row content should stay succinct and easy to scan.
- If items contain a large amount of text, avoid oversized rows and move heavier content into detail views.
- Multicolumn tables are appropriate when people need to work with complex data in separate columns.

### Material Design
- Lists should read as one continuous vertical column of rows.
- Lists are best for homogeneous content.
- The most distinguishing content should live on the left; supplemental information should sit to the right.
- Data tables should use one header row followed by rows of data.
- Text columns should read left-aligned; numeric columns should read right-aligned.
- Cards are useful as entry points to more detailed information, but they are poor for quickly scannable homogeneous content and should not be overloaded.

### Workout trackers and timers
- Hevy and Strong both treat rest as set-linked execution behavior, not as freeform prose.
- Strong models set-level structure directly through set numbers and optional set tags.
- SmartWOD makes named intervals, round counters, and phase changes explicit.

### Flow-based tooling analogy
- Node-RED subflows collapse grouped child steps into one reusable parent unit to reduce visual complexity.
- That maps well to unilateral or repeated routine groups:
  - one round group
  - multiple child rows inside it
  - lighter grouping treatment than a full nested card

## Frozen Contract

### Row types
Routine detail supports four visual row types:

1. `work`
- one executable work block

2. `switch`
- instruction between related work blocks inside the same entry

3. `rest`
- timer between work blocks inside the same entry

4. `transition`
- reset / handoff between entries

### Data priority

#### Primary data for work rows
Primary data belongs on the first line / first read:
- step label
- goal
- load

#### Secondary data for work rows
Secondary modifiers should never be given equal column weight with primary data:
- side, if not already encoded in the step label
- hold
- tempo
- effort

These belong in a secondary modifier area, not in peer columns with `Goal` and `Load`.

### Label rule
If the step label already encodes side, do not repeat `Side` as a peer metric.

Examples:
- `Left precision`
- `Right precision`
- `Alternating round 2`

In those cases, side should not consume a dedicated metric column.

## Layout Rules

### A. Entry-level structure
Keep:
- one activity entry card
- one activity visual
- one activity identity/header

Flatten:
- the execution area inside the entry

That means:
- no inner execution card background
- no metric chip dashboard for work rows
- no boxed row-inside-row treatment for max-parameter cases

### B. Desktop / wide tablet execution layout
Use one inset execution script table with these columns:

1. `Step`
2. `Goal`
3. `Load`
4. `Modifiers`

Notes:
- `Step` is the widest semantic column on the left.
- `Goal` and `Load` are compact columns.
- `Modifiers` is one flexible text column that can hold:
  - `Hold 2s/rep · Tempo 3-1-1-1 · Max reps`
- `Modifiers` is left-aligned and allowed to wrap.

This avoids forcing `Tempo`, `Hold`, and `Effort` into narrow equal-width cells.

#### Desktop work row example
`Left precision | 6+ reps | 14kg | Hold 2s/rep · Tempo 3-1-1-1`

#### Desktop minimal row example
`Wall sit | 45s | — | Quiet hold`

### C. Mobile execution layout
Do not use a multicolumn header-once table on phone.

Phone rows should become compact stacked script lines:

#### Line 1
- step label
- primary metrics inline

Example:
`Left precision   6+ reps   14kg`

#### Line 2
- modifier string

Example:
`Hold 2s/rep · Tempo 3-1-1-1`

This preserves vertical reading, uses width better, and removes the current equal-column squeeze.

### D. Command rows
`Switch` and `Rest` should stay distinct, but simpler than work rows.

#### Switch row
Pattern:
- command label
- one instruction value

Example:
`Switch  →  Right side`

#### Rest row
Pattern:
- command label
- one timer value

Example:
`Rest  ·  20s`

These rows should use lighter command styling than work rows, but should still read as part of the same execution script.

### E. Round grouping
Keep round grouping, but make it lighter than a card:
- left rail
- short `Round N` label
- no full inset box unless visually necessary

Round grouping is the "subflow" or "parentheses" treatment:
- enough to show belonging
- not enough to compete with the execution rows themselves

### F. Transition between entries
`Next in flow` should be its own structured transition block, but only say each thing once.

Use:
- reset time
- next activity
- cue

Do not repeat the same meaning in a second summary sentence if the structured line already communicates it.

Preferred pattern:
- `10s reset`
- `Next: Wall Sit`
- `Cue: Reset before quiet wall sit`

If we keep a sentence, it should replace the structured row, not duplicate it.

## Stress-Test Rules

### Max-parameter work row must fit without ugly wrapping
Required test:
- step label
- goal
- load
- hold
- tempo
- optional effort

Pass condition:
- primary row still reads quickly
- tempo never collapses into a narrow vertical stack
- no horizontal overflow

### Minimal work row must not look oversized
Required test:
- duration only

Pass condition:
- row stays compact
- no big empty container around one number

## Implementation Plan

### Phase 1
Refactor routine display data so each work row emits:
- `primaryMetrics`
- `secondaryModifiers`

Instead of treating every metric as a peer table column.

### Phase 2
Update routine detail renderer:
- desktop/tablet: `Step | Goal | Load | Modifiers`
- phone: stacked script row with inline primary metrics + modifier line

### Phase 3
Update command and transition rows:
- rest and switch become flatter command lines
- transition stops duplicating itself

### Phase 4
Validate against:
- `Parameter Extremes Routine`
- `Max Reps Check`
- normal repeated-set routine
- unilateral round routine

## Out Of Scope
This plan does not change:
- player block contract
- timed playback behavior
- sound / vibration cues
- editor block schema

Those are already on the correct path.

## Decision Summary
The routine-detail execution area should become:
- flatter than the current version
- denser than the old nested-card version
- table-like on desktop
- script-like on phone
- with primary metrics separated from secondary modifiers

This is the contract to implement next.
