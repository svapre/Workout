# Body Map Extraction Spec

## Purpose

Build the runtime body-map assets from the locked Style C Gemini images with:

- one visible neutral silhouette per view
- one direct mask source per supported region
- no dependence on splitting multiple colored regions out of one guide
- deterministic background removal and silhouette clipping

This spec describes the pipeline implemented by
`app/web/assets/body-map/build_raster_body_assets.py`.

## Locked Source Set

Source folder:

- `C:\Users\Shivam\.gemini\antigravity\brain\d17f62c1-8fe0-4a02-bb0c-ef30a37737d6`

### Neutral Bases

- Front neutral: `style_c_front_1778940979094.png`
- Back neutral: `style_c_back_1778940992570.png`

### Front Overlays

- `style_c_overlay_front_neck_v3_1778960382359.png`
- `style_c_overlay_front_shoulders_1778943613735.png`
- `style_c_overlay_front_chest_1778943631622.png`
- `style_c_overlay_front_biceps_1778943645846.png`
- `style_c_overlay_front_forearms_1778943659667.png`
- `style_c_overlay_front_core_v3_1778960396679.png`
- `style_c_overlay_front_hip_flexors_v4_1779014433251.png`
- `style_c_overlay_front_quads_v2_1778957985982.png`
- `style_c_overlay_front_calves_v2_1778958000461.png`

### Back Overlays

- `style_c_overlay_back_neck_v2_1778958121125.png`
- `style_c_overlay_back_shoulders_v2_1778958136732.png`
- `style_c_overlay_back_back_v2_1778958150558.png`
- `style_c_overlay_back_triceps_v3_1778960424896.png`
- `style_c_overlay_back_forearms_v2_1778957872277.png`
- `style_c_overlay_back_lower_back_v2_1778957886936.png`
- `style_c_overlay_back_glutes_v2_1778958215021.png`
- `style_c_overlay_back_hamstrings_v2_1778958230774.png`
- `style_c_overlay_back_calves_v2_1778958245471.png`

## Renderer Contract

The current renderer in `app/web/src/features/library/bodyVisuals.js` expects:

- `app/web/assets/body-map/neutral-front-transparent.png`
- `app/web/assets/body-map/neutral-back-transparent.png`
- front masks:
  - `mask-front-neck.png`
  - `mask-front-shoulders.png`
  - `mask-front-chest.png`
  - `mask-front-biceps.png`
  - `mask-front-forearms.png`
  - `mask-front-core.png`
  - `mask-front-hip-flexors.png`
  - `mask-front-quads.png`
  - `mask-front-calves.png`
- back masks:
  - `mask-back-neck.png`
  - `mask-back-shoulders.png`
  - `mask-back-back.png`
  - `mask-back-triceps.png`
  - `mask-back-forearms.png`
  - `mask-back-lower-back.png`
  - `mask-back-glutes.png`
  - `mask-back-hamstrings.png`
  - `mask-back-calves.png`

The body art is rendered into fixed front/back slots with
`preserveAspectRatio="xMidYMid meet"`, so the neutral and mask assets only
need to share the same per-view crop.

## Core Design Rules

1. The neutral image is the source of truth for the visible silhouette.
2. Each overlay image is the source of truth for exactly one region.
3. Region extraction is based on neutral-vs-overlay differencing, not on
   splitting multiple colors out of a combined guide.
4. The neutral silhouette clips every output mask.
5. Background removal is done per file from sampled border colors.

## Why The Pipeline Changed

The older combined-guide workflow failed in two repeatable ways:

- the front guide kept collapsing into broad region plates instead of
  muscle-shaped overlays
- extracting multiple regions from one guide introduced avoidable ambiguity
  around separator lines, shared colors, and shading drift

The locked overlay workflow fixes that by turning each region into a direct
source image that can be independently regenerated without destabilizing the
rest of the set.

## Build Outputs

The builder writes:

- runtime assets to `app/web/assets/body-map`
- cropped source copies to `art/body-map-build/style-c-overlays/source-copies`
- diagnostics and previews to
  `art/body-map-build/style-c-overlays/diagnostics`
- a metrics report to
  `art/body-map-build/style-c-overlays/report.json`

## Build Pipeline

### Stage 1: Neutral body isolation

For each neutral view:

1. Load the PNG at source resolution.
2. Sample the border pixels.
3. Compute per-file background mean, standard deviation, and threshold.
4. Build a rough foreground mask from background distance.
5. Keep the largest connected component as the body silhouette.
6. Crop to the neutral body bounds with padding.
7. Apply light cleanup (`close`, then `open`) as needed.

### Stage 2: Neutral cleanup

For the cropped neutral:

1. Use the cleaned silhouette as the alpha channel.
2. Clean the RGB near the edge band to reduce green contamination.
3. Save:
   - flat RGB neutral
   - transparent neutral
   - dark-background preview
   - alpha diagnostic

### Stage 3: Overlay body validation

For each region overlay:

1. Load the overlay PNG.
2. Sample its border background independently.
3. Isolate the largest body component.
4. Crop it to the neutral crop box.
5. Compare overlay body vs neutral body IoU.
6. Reject if silhouette drift is excessive.

Current acceptance threshold in the builder:

- body IoU must be `>= 0.97`

This is intentionally tolerant enough for minor edge differences while still
blocking a genuinely different figure family.

### Stage 4: Region isolation

For each overlay:

1. Compare overlay RGB against the corresponding neutral RGB.
2. Build a strong highlight candidate from:
   - high neutral-vs-overlay difference
   - high luminance
3. Build a softer candidate from:
   - moderate difference
   - moderate luminance
   - limited chroma
4. Grow the strong region into the soft candidate for a few iterations.
5. Fall back to a simpler threshold if the region collapses.
6. Apply light cleanup:
   - `close`
   - `open`
   - remove small components
7. Clip the final region back to the neutral silhouette.

This works because the locked overlay images use:

- the exact same neutral body
- one bright target region
- dark non-target body
- flat background

### Stage 5: Packaging

The builder writes:

- one mask PNG per supported region
- one transparent neutral PNG per view
- one flat RGB neutral PNG per view
- one neutral-pair preview for inspection

## Diagnostics

Each run should emit at least:

- neutral alpha preview
- neutral preview on dark background
- per-region mask image
- per-region preview composited on the neutral
- neutral-vs-overlay body overlap preview
- report JSON with mask pixel counts and overlay body IoU

## Acceptance Criteria

The asset build is acceptable only if:

1. The neutral cutout has no obvious green halo on dark previews.
2. Every region mask stays fully inside the neutral silhouette.
3. Each overlay body stays within the silhouette IoU gate.
4. Every region mask is non-empty.
5. Mobile and responsive audits pass with the regenerated runtime assets.

## Non-Goals

- No runtime segmentation.
- No hand-authored SVG conversion.
- No combined multicolor guide parsing.
- No mixing regions across different figure families.

## Operating Rule For Future Updates

If a region is wrong:

1. regenerate only that overlay image
2. keep the locked neutral for that view
3. rerun the builder

Do not reopen the combined-guide workflow unless the extraction contract is
being deliberately redesigned.
