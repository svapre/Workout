# Stage Step Contract

## Purpose
This contract defines the shared UI grammar for `StageStep` objects.
It exists so routine steps, rest steps, and future step types are treated
as the same family instead of ad hoc special cases.

## Parent Object
`StageStep`

Supported variants today:
- `routine`
- `rest`

Future variants may include:
- `milestone_test`
- `check_in`

## Shared Shell
Every stage step should render with the same base structure:
- step index
- kind label
- title
- support line
- affordance when the step is navigable

This shared shell must be used in:
- StageStudy
- StageDetail
- Stage editor preview
- Blueprint editor preview when a script is shown

## Routine Step

### Must contain
- `Step N`
- kind label: `Routine`
- routine title
- one support line summarizing focus and duration

### Interaction
- navigates to Routine Detail when a deeper read is available
- shows a navigation affordance

## Rest Step

### Must contain
- `Step N`
- kind label: `Rest`
- title: `Rest day` or another explicit rest label
- one support line describing the recovery step

### Interaction
- never navigates
- never shows a navigation affordance

## Rules
- Rest and routine steps must share the same shell.
- Different behavior should come from step type, not from unrelated layouts.
- Study and editor previews must not invent a separate one-off rest pattern.
- If a new step type is added later, it must be added here before it gets a
  new visual treatment.
