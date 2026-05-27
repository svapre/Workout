# UI Framework

## Purpose
This file defines the shared UI framework for the Workout App.
It exists to prevent visual drift while the product grows.

This file works together with the shared contracts:
- UI_FRAMEWORK.md defines hierarchy, spacing, and interaction tone
- SCREEN_CONTRACTS.md defines what each owner layer is allowed to show
- UI_LANGUAGE_CONTRACT.md defines user-facing naming and label responsibilities
- MOBILE_COMPACT_VIEW_CONTRACT.md defines portrait-phone compact-view limits
- STAGE_SURFACE_CONTRACT.md defines what stage cards may show at each depth
- STAGE_STEP_CONTRACT.md defines the shared shell for routine and rest steps

Use this file before changing:
- shared layout rules
- button hierarchy
- panel/card structure
- major screen composition
- motion patterns

## Product Posture
- Calm
- High-trust
- Execution-first
- Mobile-first

The app should feel like a focused training console, not a social feed,
game lobby, or analytics dashboard.

Portrait phone views are the primary truth. Tablet and desktop may expand
clarity, but should not push compact mobile surfaces into becoming afterthoughts.

## Design Direction
- Material-style structure for hierarchy, grouping, and adaptive layout
- Apple-like restraint for density, control count, and visual calm
- Plan identity through accent color, icon, and selective highlights

Do not fully mimic either platform. The goal is a blended custom system.

## Core Rules

### 1. One Primary Action
Every screen should have one clearly dominant action.
If two actions feel equally important, the screen structure is probably wrong.

### 2. One Dominant Content Block
Each screen should have one block that tells the user what matters most.
Secondary tools must not compete with that block.

### 3. Supporting Actions Are Grouped
Supporting actions should be grouped by purpose:
- review
- tools
- status/lifecycle
- danger

Do not present unrelated actions as a flat list of equal buttons.

### 4. Danger Is Isolated
Destructive actions must be visually separated from normal support actions.
They should never look like ordinary workflow buttons.

### 5. Scroll Intentionally
If a screen cannot fit naturally on current phones, make it intentionally
scrollable. Never allow clipped or unreachable controls.

## Layout System
- Use the shared spacing scale only: `4, 8, 12, 16, 24, 32, 40`
- Prefer one vertical scroll direction per screen
- Avoid nested same-axis scrolling
- Respect mobile safe areas
- Keep primary actions reachable on phones

## Surface Grammar

### Hero Card
Used for the main next-action or mission block on a screen.

### Panel
Used for grouped content and section-level structure.

### Metric Card
Used for compact numeric or state summaries.

### Detail Card
Used for richer retrospective or descriptive content.

### Support Panel
Used for grouped secondary actions or supporting context.

Do not invent one-off card styles when one of these already fits.

## Screen Contract Reminder
- Plan and active-plan overview screens are not reading surfaces
- Study screens are not routine-detail replacements
- Routine detail is not an editor-first surface
- Activity detail is the first landing zone for new activity metadata

See SCREEN_CONTRACTS.md before adding new inline lower-level detail.

## Button Hierarchy

### Primary
- strongest emphasis
- usually filled
- one per screen section

### Secondary
- supporting action
- outlined or softly filled
- quieter than primary

### Tertiary
- low-emphasis text/icon action
- used for light dismissal or low-priority support

### Danger
- destructive only
- never used for routine forward flow

## Typography Roles
Use a small stable set of roles:
- display
- screen title
- section title
- body
- meta

Avoid tiny, low-contrast helper text on mobile.

## Color Rules
- Neutral surfaces do most of the work
- Accent color communicates plan identity and focus
- Semantic colors are reserved for success, warning, and error
- Do not introduce feature-specific colors when shared tokens are enough

## Motion Rules
- Motion confirms change; it does not decorate
- Keep execution-mode motion restrained
- Ceremony/completion can be warmer, but still controlled
- Remove motion that slows task completion

## Screen Archetypes

### Home / Active Plans
- dominant mission framing
- supporting plan cards underneath

### Active Plan Detail
- progress, state, and next action first
- review/tools/lifecycle grouped separately

### Workout Player
- immersive
- single-task
- minimal chrome

### Editors
- stacked sections
- clear save/apply behavior

### History
- list-detail retrospective workspace

### Libraries
- scan, compare, select, edit

## Accessibility Baseline
- Touch targets should meet mobile-safe minimums
- Adjacent tappable controls need breathing room
- Do not rely on color alone to communicate meaning
- Critical text and actions need strong contrast
- No horizontal scrolling for core flows

## Anti-Drift Rules
- No screen gets two competing primary CTAs
- No new local component style without checking whether it should become shared
- No feature-specific spacing scale
- No complex multi-step work inside cramped modals
- No hidden primary action that requires hunting

## Implementation Order
1. Update shared tokens and primitives first
2. Apply to Home, Active Plan Detail, and Workout Player
3. Apply to Plans, Routines, Activities, and History
4. Add restrained motion after hierarchy and layout are stable
5. Re-run visible Playwright audits across phone, tablet, and desktop fallback
