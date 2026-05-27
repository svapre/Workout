# Plan Family Review Brief

## What this packet is for
This packet is for a thorough review of the **entire plan section**, not just the main four runtime/template screens.

It includes:
- active-plans list
- Active Plan Detail
- Active Plan Study
- plans / blueprint list
- Blueprint Detail
- Blueprint Study
- Blueprint editor
- Stage editor

## Why this review matters
The plan section now spans both:
- **consumer/runtime surfaces**
- **template/adoption surfaces**
- **authoring surfaces**
- **entry/index surfaces**

If these components are not coherent together, the whole plan system still feels fragmented even if individual screens improved.

## Current local direction
- `Active Plan Detail` should be the low-friction day-to-day screen.
- `Study` should explain the progression as a journey.
- `Blueprint Detail` should help users evaluate and adopt a plan.
- `Editors` should let users author the same structure without turning the experience into a bloated document or form maze.
- `Entry screens` should make it easy to compare runtime plans and blueprint options quickly.

## What changed recently
1. The old roadmap/list treatment was replaced with a journey-rail model.
2. Visible stage nodes now try to show:
   - objective
   - milestone
   - routine/rest strip
   - cycle estimate
3. Detail screens now use a lighter path preview so they do not repeat the full stage node below the main current/opening-stage block.
4. Active Plan Detail now keeps the CTA close to the current-stage node.
5. Study now uses attached inline expansion on mobile and a two-pane rail + detail layout on larger screens.
6. The sequence strip now uses directional arrows and explicit order markers.
7. Stage Editor was rebuilt around the same stage object that Study explains, with step-based authoring language and a live preview.
8. Blueprint Editor stage rows now preview the same stage object the user later studies.
9. Active-plans list and blueprint list were reworked to be more scan-first and comparison-friendly.

## What this review should decide
1. Does the **whole plan family** now make sense as one coherent subsystem?
2. Are the list screens now good enough as entry points?
3. Are Active and Blueprint owner surfaces now right for runtime vs template?
4. Do the Study screens explain the journey clearly enough?
5. Do the editor surfaces now author the same model that Study explains?
6. Which plan components are ready for beautification right now, and which still need framework work?

## Screenshot set
1. `01-mobile-active-plans-list.png`
2. `02-mobile-active-plan-detail.png`
3. `03-mobile-active-plan-study.png`
4. `04-mobile-plans-list.png`
5. `05-mobile-blueprint-detail.png`
6. `06-mobile-blueprint-study.png`
7. `07-mobile-blueprint-editor.png`
8. `08-mobile-stage-editor.png`
9. `09-desktop-active-plans-list.png`
10. `10-desktop-active-plan-detail.png`
11. `11-desktop-active-plan-study.png`
12. `12-desktop-blueprint-detail.png`
13. `13-desktop-blueprint-study.png`
14. `14-tablet-landscape-blueprint-editor.png`
15. `15-tablet-landscape-stage-editor.png`

## Current internal read before external review
- `Active Plan Detail`, `Blueprint Detail`, and the editors are much stronger than before.
- The latest pass specifically targeted the remaining weak plan entry points: active-plans list and blueprint list.
- The key remaining question is whether the **whole plan family now feels coherent enough to freeze the framework**, or whether one more narrow pass is still needed before beautification.
