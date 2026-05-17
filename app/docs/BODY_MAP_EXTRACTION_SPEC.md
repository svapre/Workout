# Body Map Extraction Spec

## Purpose

Build the body-map assets from the locked Gemini source images with:

- no visible green halo on dark UI backgrounds
- region masks that fit the visible silhouette
- deterministic cleanup for the Gemini sparkle / stray components
- no dependence on exact flat-background RGB or exact region-fill RGB

This spec is intentionally biased toward a repeatable offline asset-build pipeline rather than more image prompting.

## Locked Source Files

### Front

- Neutral: `C:\Users\Shivam\Downloads\Gemini_Generated_Image_qysxduqysxduqysx.png`
- Colored guide: `C:\Users\Shivam\Downloads\Gemini_Generated_Image_l8xzvvl8xzvvl8xz.png`

### Back

- Neutral: `C:\Users\Shivam\Downloads\Gemini_Generated_Image_qj31ewqj31ewqj31.png`
- Colored guide: `C:\Users\Shivam\Downloads\Gemini_Generated_Image_om2skiom2skiom2s.png`

## Renderer Contract

The current renderer expects these outputs:

- `app/web/assets/body-map/neutral-front-transparent.png`
- `app/web/assets/body-map/neutral-back-transparent.png`
- `app/web/assets/body-map/mask-front-neck.png`
- `app/web/assets/body-map/mask-front-shoulders.png`
- `app/web/assets/body-map/mask-front-chest.png`
- `app/web/assets/body-map/mask-front-biceps.png`
- `app/web/assets/body-map/mask-front-forearms.png`
- `app/web/assets/body-map/mask-front-core.png`
- `app/web/assets/body-map/mask-front-hip-flexors.png`
- `app/web/assets/body-map/mask-front-quads.png`
- `app/web/assets/body-map/mask-front-calves.png`
- `app/web/assets/body-map/mask-back-neck.png`
- `app/web/assets/body-map/mask-back-shoulders.png`
- `app/web/assets/body-map/mask-back-back.png`
- `app/web/assets/body-map/mask-back-triceps.png`
- `app/web/assets/body-map/mask-back-forearms.png`
- `app/web/assets/body-map/mask-back-lower-back.png`
- `app/web/assets/body-map/mask-back-glutes.png`
- `app/web/assets/body-map/mask-back-hamstrings.png`
- `app/web/assets/body-map/mask-back-calves.png`

The body art is rendered into these slots:

- Front slot: `x=14 y=12 width=92 height=225`
- Back slot: `x=144 y=12 width=92 height=225`

The renderer scales both neutral art and masks with `preserveAspectRatio="xMidYMid meet"`, so neutral art and masks only need to share the same canvas per view.

## Observed Problems In The Locked Sources

### Global issues

- The Gemini sparkle icon appears in the lower-right corner of several files and must be removed as a separate component.
- The background green is not consistent across all four files, so a single hardcoded key color is not reliable.
- The colored guides use slightly shaded fills, not perfectly flat fills, so exact RGB equality is not reliable for region extraction.

### Neutral-specific issues

- The neutral silhouettes have soft antialiased edges.
- Green contamination survives on edge pixels after a naive chroma key and is visible on dark previews.

### Colored-guide-specific issues

- Region boundaries are encoded more reliably by the dark separator lines than by exact region color.
- Region masks must be generated from the colored guides, but clipped back to the neutral silhouette.

## Core Design Rules

1. The neutral image is the source of truth for the visible outer silhouette.
2. The colored guide is the source of truth for internal region topology.
3. Background removal, despill, and region segmentation are separate stages.
4. Sparkle / watermark removal is a connected-component cleanup step, not part of chroma keying.
5. Region masks should be grown from seeds inside separator-line barriers, not from exact flat-color matching.

## Acceptance Gates Before Asset Build

Every input file must pass these checks before mask generation:

### A. File integrity

- PNG loads successfully in sRGB.
- Resolution is preserved at source size.
- No unexpected crop or canvas shift.

### B. Background plate quality

- Sample all four borders.
- Compute per-channel mean and standard deviation.
- Treat the file as keyable if the background plate is locally stable.
- Do not require the front and back greens to match each other.

### C. Largest-component body isolation

- Generate a rough foreground mask from the file-specific green plate.
- Label connected components.
- Keep the largest body component.
- Reject or remove any non-body component whose area is less than 1% of the kept body area.
- If a bottom-right component survives and is detached from the body, classify it as sparkle noise.

### D. Per-view silhouette fit

- Compare neutral and colored silhouette masks for the same view.
- Require IoU >= 0.97 before proceeding.
- If the pair falls below threshold, stop and replace the source image rather than compensating with warped masks.

## Offline Build Pipeline

### Stage 1: Source normalization

For each of the four source images:

1. Load full-resolution PNG.
2. Sample the border background plate.
3. Convert to HSV for key generation.
4. Generate a rough foreground mask using a file-specific green tolerance.
5. Run connected-component labeling.
6. Keep the largest body component.
7. Remove detached sparkle / watermark components.
8. Save a diagnostic preview showing the isolated body on a dark background.

### Stage 2: Neutral alpha extraction

For each neutral image:

1. Start from the largest-component foreground mask.
2. Apply a light morphological close to seal tiny holes in the silhouette.
3. Apply a light morphological open only if isolated noise remains.
4. Convert the cleaned silhouette to the body alpha.
5. Generate an edge band using erosion / dilation.
6. Perform despill only inside that edge band.
7. Preserve the original silhouette shape.
8. Save:
   - transparent neutral PNG
   - dark-background preview PNG
   - alpha PNG for debugging

### Stage 3: Colored-guide preparation

For each colored guide:

1. Repeat Stage 1 body isolation.
2. Clip the guide to its own largest body component.
3. Build a separator-line barrier mask by thresholding dark outline pixels.
4. Keep the separator lines as topology barriers for region fills.
5. Do not use a single exact RGB value per region.

### Stage 4: Region seed manifest

Create a fixed manifest of normalized seed points per view.

This is required so the extraction process does not depend on interactive guesses.

For bilateral regions, store two seeds and union the results.

Example structure:

```json
{
  "front": {
    "bm_neck": [[0.50, 0.16]],
    "bm_shoulders": [[0.32, 0.24], [0.68, 0.24]],
    "bm_chest": [[0.40, 0.31], [0.60, 0.31]],
    "bm_biceps": [[0.24, 0.40], [0.76, 0.40]],
    "bm_forearms": [[0.19, 0.55], [0.81, 0.55]],
    "bm_core": [[0.50, 0.47]],
    "bm_hip_flexors": [[0.38, 0.67], [0.62, 0.67]],
    "bm_quads": [[0.40, 0.77], [0.60, 0.77]],
    "bm_calves": [[0.42, 0.93], [0.58, 0.93]]
  },
  "back": {
    "bm_neck": [[0.50, 0.14]],
    "bm_shoulders": [[0.32, 0.23], [0.68, 0.23]],
    "bm_back": [[0.40, 0.34], [0.60, 0.34]],
    "bm_triceps": [[0.24, 0.40], [0.76, 0.40]],
    "bm_forearms": [[0.19, 0.56], [0.81, 0.56]],
    "bm_lower_back": [[0.50, 0.50]],
    "bm_glutes": [[0.42, 0.62], [0.58, 0.62]],
    "bm_hamstrings": [[0.40, 0.77], [0.60, 0.77]],
    "bm_calves": [[0.42, 0.92], [0.58, 0.92]]
  }
}
```

The exact coordinates can be tuned once, then frozen.

### Stage 5: Region mask generation

For each region in each view:

1. Convert normalized seeds to source-image coordinates.
2. Use the separator-line mask as a flood-fill barrier.
3. Run flood fill from each seed with a tolerant color range.
4. Union bilateral fills where needed.
5. Keep only the connected component that contains the seed.
6. Clip the resulting region to the neutral alpha.
7. Save a raw per-region mask.

Important:

- The region fill is allowed to ignore small shading changes.
- The separator lines, not the exact fill colors, should stop region growth.

### Stage 6: Region edge fitting

Raw flood-fill masks will usually stop at the inner side of the separator line.

To avoid visible dark gaps between adjacent highlights:

1. Build all region cores first.
2. Compute the set of body pixels still uncovered inside the neutral silhouette.
3. Reassign uncovered separator-line-adjacent pixels to the nearest region core.
4. Allow masks to meet at shared borders, but never overlap outside the neutral silhouette.

The target is:

- no gap between neighboring highlighted regions where the art clearly indicates a shared boundary
- no bleed across separator lines

### Stage 7: Output packaging

Export per view:

- transparent neutral art
- 9 region masks
- debug overlays

Preferred format:

- neutral art: RGBA PNG
- region masks: white-on-transparent PNG

Do not downsample until after alpha extraction and region generation are complete.

## Despill / Halo Strategy

Use a dedicated edge cleanup stage instead of trying to “key cleaner” in one pass.

Recommended approach:

1. Build the body alpha from the best silhouette mask.
2. Compute a narrow edge band near the silhouette boundary.
3. Only in that band, detect pixels where green contamination dominates relative to nearby interior pixels.
4. Replace the edge RGB using nearby in-body color statistics or a decontaminated neutralized value.
5. Keep the alpha geometry stable.

Do not solve spill by simply shrinking the alpha until the halo disappears.
That trades green fringe for a visibly eroded silhouette.

## Back-Plate Specific Rule

The back pair uses a duller green background than the front pair.

Therefore:

- sample background from each file separately
- build the green key from that file’s border samples
- never reuse front-key thresholds for the back

## Diagnostics To Generate On Every Run

The asset build should emit:

- body-only preview on dark background
- alpha-only preview
- silhouette overlap preview for each neutral / colored pair
- per-region color overlay preview
- per-region mask preview against the neutral body

These diagnostics should be stored alongside the build outputs so visual regressions are easy to spot.

## Hard Acceptance Criteria

The asset set is acceptable only if all of the following are true:

1. No visible green halo is apparent on a dark preview at 200% zoom.
2. No detached sparkle / watermark component remains.
3. The colored and neutral silhouettes for a given view overlap at IoU >= 0.97.
4. Every region mask is fully contained within the neutral silhouette.
5. No two region masks overlap by more than a trivial edge tolerance.
6. The union of region masks matches the visible colored-guide topology.
7. The generated previews look correct before any app integration happens.

## Fallbacks

### If chroma keying is unstable

Use the rough chroma mask as initialization for a secondary refinement step such as graph-cut / grab-cut style foreground refinement.

### If a single region keeps leaking

- tighten the separator barrier for that view
- adjust only that region’s seed points or fill tolerance
- do not redraw the full art set

### If the pair fails silhouette overlap

Reject the source image and regenerate it.
Do not compensate by warping masks.

## Non-Goals

- No hand-drawn SVG conversion in this pipeline.
- No runtime segmentation.
- No dependence on showing the colored guide in the product UI.
- No image compositing from mixed source files unless the silhouettes are proven identical.

## Implementation Note

The first implementation should focus on:

1. exact neutral cutouts
2. exact region masks
3. deterministic diagnostics

Only after those pass should the assets replace the current `app/web/assets/body-map` files.
