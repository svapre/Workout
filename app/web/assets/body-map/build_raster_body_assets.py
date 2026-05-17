from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json

import numpy as np
from PIL import Image

ROOT = Path(r"d:\code\Workout")
GEMINI_DIR = Path(r"C:\Users\Shivam\.gemini\antigravity\brain\d17f62c1-8fe0-4a02-bb0c-ef30a37737d6")

DST_DIR = ROOT / "app" / "web" / "assets" / "body-map"
BUILD_DIR = ROOT / "art" / "body-map-build" / "style-c-overlays"
DIAG_DIR = BUILD_DIR / "diagnostics"
SOURCE_DIR = BUILD_DIR / "source-copies"

for directory in (DST_DIR, BUILD_DIR, DIAG_DIR, SOURCE_DIR):
    directory.mkdir(parents=True, exist_ok=True)

DARK_BG = np.array((12, 20, 35, 255), dtype=np.uint8)
BODY_IOU_THRESHOLD = 0.97
PAIR_PAD = 18

FRONT_MASK_MAP = {
    "bm_neck": "mask-front-neck.png",
    "bm_shoulders": "mask-front-shoulders.png",
    "bm_chest": "mask-front-chest.png",
    "bm_biceps": "mask-front-biceps.png",
    "bm_forearms": "mask-front-forearms.png",
    "bm_core": "mask-front-core.png",
    "bm_hip_flexors": "mask-front-hip-flexors.png",
    "bm_quads": "mask-front-quads.png",
    "bm_calves": "mask-front-calves.png",
}

BACK_MASK_MAP = {
    "bm_neck": "mask-back-neck.png",
    "bm_shoulders": "mask-back-shoulders.png",
    "bm_back": "mask-back-back.png",
    "bm_triceps": "mask-back-triceps.png",
    "bm_forearms": "mask-back-forearms.png",
    "bm_lower_back": "mask-back-lower-back.png",
    "bm_glutes": "mask-back-glutes.png",
    "bm_hamstrings": "mask-back-hamstrings.png",
    "bm_calves": "mask-back-calves.png",
}

REGION_PREVIEW_COLORS = {
    "bm_neck": (126, 207, 192),
    "bm_shoulders": (232, 132, 124),
    "bm_chest": (107, 157, 199),
    "bm_back": (107, 157, 199),
    "bm_biceps": (212, 169, 83),
    "bm_triceps": (212, 169, 83),
    "bm_forearms": (155, 141, 199),
    "bm_core": (127, 176, 105),
    "bm_lower_back": (127, 176, 105),
    "bm_hip_flexors": (199, 139, 139),
    "bm_glutes": (199, 139, 139),
    "bm_quads": (196, 149, 106),
    "bm_hamstrings": (196, 149, 106),
    "bm_calves": (139, 157, 175),
}


@dataclass(frozen=True)
class BackgroundStats:
    mean: np.ndarray
    std: np.ndarray
    threshold: float


@dataclass(frozen=True)
class ViewSpec:
    view: str
    neutral_src: Path
    neutral_out: Path
    neutral_rgb_out: Path
    overlay_sources: dict[str, Path]
    mask_map: dict[str, str]


VIEW_SPECS = (
    ViewSpec(
        view="front",
        neutral_src=GEMINI_DIR / "style_c_front_1778940979094.png",
        neutral_out=DST_DIR / "neutral-front-transparent.png",
        neutral_rgb_out=DST_DIR / "neutral-front.png",
        overlay_sources={
            "bm_neck": GEMINI_DIR / "style_c_overlay_front_neck_v3_1778960382359.png",
            "bm_shoulders": GEMINI_DIR / "style_c_overlay_front_shoulders_1778943613735.png",
            "bm_chest": GEMINI_DIR / "style_c_overlay_front_chest_1778943631622.png",
            "bm_biceps": GEMINI_DIR / "style_c_overlay_front_biceps_1778943645846.png",
            "bm_forearms": GEMINI_DIR / "style_c_overlay_front_forearms_1778943659667.png",
            "bm_core": GEMINI_DIR / "style_c_overlay_front_core_v3_1778960396679.png",
            "bm_hip_flexors": GEMINI_DIR / "style_c_overlay_front_hip_flexors_v4_1779014433251.png",
            "bm_quads": GEMINI_DIR / "style_c_overlay_front_quads_v2_1778957985982.png",
            "bm_calves": GEMINI_DIR / "style_c_overlay_front_calves_v2_1778958000461.png",
        },
        mask_map=FRONT_MASK_MAP,
    ),
    ViewSpec(
        view="back",
        neutral_src=GEMINI_DIR / "style_c_back_1778940992570.png",
        neutral_out=DST_DIR / "neutral-back-transparent.png",
        neutral_rgb_out=DST_DIR / "neutral-back.png",
        overlay_sources={
            "bm_neck": GEMINI_DIR / "style_c_overlay_back_neck_v2_1778958121125.png",
            "bm_shoulders": GEMINI_DIR / "style_c_overlay_back_shoulders_v2_1778958136732.png",
            "bm_back": GEMINI_DIR / "style_c_overlay_back_back_v2_1778958150558.png",
            "bm_triceps": GEMINI_DIR / "style_c_overlay_back_triceps_v3_1778960424896.png",
            "bm_forearms": GEMINI_DIR / "style_c_overlay_back_forearms_v2_1778957872277.png",
            "bm_lower_back": GEMINI_DIR / "style_c_overlay_back_lower_back_v2_1778957886936.png",
            "bm_glutes": GEMINI_DIR / "style_c_overlay_back_glutes_v2_1778958215021.png",
            "bm_hamstrings": GEMINI_DIR / "style_c_overlay_back_hamstrings_v2_1778958230774.png",
            "bm_calves": GEMINI_DIR / "style_c_overlay_back_calves_v2_1778958245471.png",
        },
        mask_map=BACK_MASK_MAP,
    ),
)


def load_rgb(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.uint8)


def save_rgb(path: Path, rgb: np.ndarray) -> None:
    Image.fromarray(rgb.astype(np.uint8), "RGB").save(path)


def save_rgba(path: Path, rgb: np.ndarray, alpha: np.ndarray) -> None:
    rgba = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    rgba[..., :3] = rgb.astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(path)


def save_mask(path: Path, mask: np.ndarray) -> None:
    Image.fromarray(np.where(mask, 255, 0).astype(np.uint8), "L").save(path)


def composite_on_dark(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    base = np.zeros((*rgb.shape[:2], 4), dtype=np.uint8)
    base[:] = DARK_BG
    rgba = np.zeros_like(base)
    rgba[..., :3] = rgb.astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    fg_alpha = rgba[..., 3:4].astype(np.float32) / 255.0
    out_rgb = np.round(
        rgba[..., :3].astype(np.float32) * fg_alpha
        + base[..., :3].astype(np.float32) * (1.0 - fg_alpha)
    ).astype(np.uint8)
    out = np.zeros_like(base)
    out[..., :3] = out_rgb
    out[..., 3] = 255
    return out


def border_pixels(rgb: np.ndarray, margin: int = 8) -> np.ndarray:
    h, w = rgb.shape[:2]
    strips = [
        rgb[:margin, :, :].reshape(-1, 3),
        rgb[h - margin :, :, :].reshape(-1, 3),
        rgb[:, :margin, :].reshape(-1, 3),
        rgb[:, w - margin :, :].reshape(-1, 3),
    ]
    return np.concatenate(strips, axis=0).astype(np.float32)


def compute_background_stats(rgb: np.ndarray) -> BackgroundStats:
    samples = border_pixels(rgb)
    mean = samples.mean(axis=0)
    std = samples.std(axis=0)
    threshold = max(24.0, 10.0 + 6.0 * float(np.max(std)))
    return BackgroundStats(mean=mean, std=std, threshold=threshold)


def background_mask(rgb: np.ndarray, stats: BackgroundStats) -> np.ndarray:
    diff = rgb.astype(np.float32) - stats.mean[None, None, :]
    distance = np.sqrt((diff ** 2).sum(axis=2))
    return distance <= stats.threshold


def largest_component(mask: np.ndarray) -> tuple[np.ndarray, list[int]]:
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    best: list[tuple[int, int]] = []
    component_sizes: list[int] = []
    for y in range(h):
        for x in range(w):
            if visited[y, x] or not mask[y, x]:
                continue
            stack = [(x, y)]
            visited[y, x] = True
            component: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        nx = cx + dx
                        ny = cy + dy
                        if nx < 0 or ny < 0 or nx >= w or ny >= h:
                            continue
                        if visited[ny, nx] or not mask[ny, nx]:
                            continue
                        visited[ny, nx] = True
                        stack.append((nx, ny))
            component_sizes.append(len(component))
            if len(component) > len(best):
                best = component
    out = np.zeros((h, w), dtype=bool)
    for x, y in best:
        out[y, x] = True
    component_sizes.sort(reverse=True)
    return out, component_sizes


def bbox_from_mask(mask: np.ndarray, pad: int = 0) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask)
    if xs.size == 0:
        raise RuntimeError("Could not determine bounding box from empty mask")
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(mask.shape[1], int(xs.max()) + 1 + pad)
    y1 = min(mask.shape[0], int(ys.max()) + 1 + pad)
    return x0, y0, x1, y1


def crop_rgb(rgb: np.ndarray, bbox: tuple[int, int, int, int]) -> np.ndarray:
    x0, y0, x1, y1 = bbox
    return rgb[y0:y1, x0:x1, :]


def crop_mask(mask: np.ndarray, bbox: tuple[int, int, int, int]) -> np.ndarray:
    x0, y0, x1, y1 = bbox
    return mask[y0:y1, x0:x1]


def calc_iou(a: np.ndarray, b: np.ndarray) -> float:
    inter = np.logical_and(a, b).sum(dtype=np.int64)
    union = np.logical_or(a, b).sum(dtype=np.int64)
    if union == 0:
        return 0.0
    return float(inter) / float(union)


def binary_dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        padded = np.pad(out, 1, constant_values=False)
        h, w = out.shape
        neighbors = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                neighbors.append(padded[1 + dy : 1 + dy + h, 1 + dx : 1 + dx + w])
        out = np.logical_or.reduce(neighbors)
    return out


def binary_erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        padded = np.pad(out, 1, constant_values=False)
        h, w = out.shape
        neighbors = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                neighbors.append(padded[1 + dy : 1 + dy + h, 1 + dx : 1 + dx + w])
        out = np.logical_and.reduce(neighbors)
    return out


def binary_open(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    return binary_dilate(binary_erode(mask, iterations), iterations)


def binary_close(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    return binary_erode(binary_dilate(mask, iterations), iterations)


def clean_neutral_rgb(rgb: np.ndarray, body_mask: np.ndarray) -> np.ndarray:
    out = rgb.astype(np.float32).copy()
    interior = binary_erode(body_mask, 4)
    if not interior.any():
        interior = body_mask
    mean_color = out[interior].mean(axis=0)
    inside_edge = body_mask & ~binary_erode(body_mask, 2)
    if inside_edge.any():
        edge_pixels = out[inside_edge]
        avg_rb = (edge_pixels[:, 0] + edge_pixels[:, 2]) * 0.5
        green_excess = np.maximum(0.0, edge_pixels[:, 1] - avg_rb)
        edge_pixels[:, 1] -= green_excess * 0.9
        edge_pixels = edge_pixels * 0.68 + mean_color[None, :] * 0.32
        out[inside_edge] = edge_pixels
    out[~body_mask] = mean_color
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


def remove_small_components(mask: np.ndarray, min_pixels: int) -> np.ndarray:
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    cleaned = mask.copy()
    for y in range(h):
        for x in range(w):
            if visited[y, x] or not mask[y, x]:
                continue
            stack = [(x, y)]
            visited[y, x] = True
            component: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                component.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    if visited[ny, nx] or not mask[ny, nx]:
                        continue
                    visited[ny, nx] = True
                    stack.append((nx, ny))
            if len(component) < min_pixels:
                for cx, cy in component:
                    cleaned[cy, cx] = False
    return cleaned


def isolate_overlay_region(overlay_rgb: np.ndarray, neutral_rgb: np.ndarray, neutral_body: np.ndarray) -> np.ndarray:
    overlayf = overlay_rgb.astype(np.float32)
    neutralf = neutral_rgb.astype(np.float32)
    diff = np.abs(overlayf - neutralf).sum(axis=2)
    luma = overlayf[..., 0] * 0.2126 + overlayf[..., 1] * 0.7152 + overlayf[..., 2] * 0.0722
    chroma = overlayf.max(axis=2) - overlayf.min(axis=2)

    strong = neutral_body & (diff > 40.0) & (luma > 180.0)
    soft = neutral_body & (diff > 16.0) & (luma > 120.0) & (chroma < 95.0)

    mask = strong.copy()
    for _ in range(3):
        grown = mask | (binary_dilate(mask, 1) & soft)
        if np.array_equal(grown, mask):
            break
        mask = grown

    if mask.sum() < 128:
        mask = neutral_body & (diff > 20.0) & (luma > 135.0)

    mask = binary_close(mask, 1)
    mask = binary_open(mask, 1)
    mask = remove_small_components(mask, min_pixels=24)
    return mask & neutral_body


def overlay_mask_preview(base_rgb: np.ndarray, base_alpha: np.ndarray, mask: np.ndarray, color: tuple[int, int, int]) -> np.ndarray:
    composite = composite_on_dark(base_rgb, base_alpha)
    out = composite.copy().astype(np.uint8)
    alpha = 180.0 / 255.0
    overlay = np.array(color, dtype=np.float32)
    existing = out[..., :3].astype(np.float32)
    blended = np.round(overlay * alpha + existing * (1.0 - alpha)).astype(np.uint8)
    out[mask, :3] = blended[mask]
    return out


def save_body_overlap_preview(path: Path, neutral_mask: np.ndarray, overlay_mask: np.ndarray) -> None:
    h, w = neutral_mask.shape
    preview = np.zeros((h, w, 4), dtype=np.uint8)
    preview[..., 3] = 255
    both = neutral_mask & overlay_mask
    neutral_only = neutral_mask & ~overlay_mask
    overlay_only = overlay_mask & ~neutral_mask
    preview[both, :3] = np.array((79, 209, 197), dtype=np.uint8)
    preview[neutral_only, :3] = np.array((246, 173, 85), dtype=np.uint8)
    preview[overlay_only, :3] = np.array((252, 129, 129), dtype=np.uint8)
    Image.fromarray(preview, "RGBA").save(path)


def process_view(spec: ViewSpec) -> dict[str, object]:
    neutral_rgb_full = load_rgb(spec.neutral_src)
    neutral_stats = compute_background_stats(neutral_rgb_full)
    neutral_fg = ~background_mask(neutral_rgb_full, neutral_stats)
    neutral_body_full, neutral_components = largest_component(neutral_fg)
    bbox = bbox_from_mask(neutral_body_full, PAIR_PAD)

    neutral_rgb = crop_rgb(neutral_rgb_full, bbox)
    neutral_body = crop_mask(neutral_body_full, bbox)
    neutral_clean_rgb = clean_neutral_rgb(neutral_rgb, neutral_body)
    neutral_alpha = np.where(neutral_body, 255, 0).astype(np.uint8)

    save_rgb(spec.neutral_rgb_out, neutral_clean_rgb)
    save_rgba(spec.neutral_out, neutral_clean_rgb, neutral_alpha)
    save_rgb(SOURCE_DIR / f"{spec.view}-neutral-cropped.png", neutral_rgb)
    save_mask(DIAG_DIR / f"{spec.view}-neutral-alpha.png", neutral_body)
    Image.fromarray(composite_on_dark(neutral_clean_rgb, neutral_alpha), "RGBA").save(
        DIAG_DIR / f"{spec.view}-neutral-preview-dark.png"
    )

    region_metrics: dict[str, int] = {}
    overlay_metrics: dict[str, object] = {}

    for region_id, overlay_src in spec.overlay_sources.items():
        overlay_rgb_full = load_rgb(overlay_src)
        overlay_stats = compute_background_stats(overlay_rgb_full)
        overlay_fg = ~background_mask(overlay_rgb_full, overlay_stats)
        overlay_body_full, overlay_components = largest_component(overlay_fg)
        overlay_body = crop_mask(overlay_body_full, bbox)
        overlay_rgb = crop_rgb(overlay_rgb_full, bbox)

        body_iou = calc_iou(neutral_body, overlay_body)
        if body_iou < BODY_IOU_THRESHOLD:
            raise RuntimeError(
                f"{spec.view} {region_id} overlay silhouette IoU {body_iou:.6f} "
                f"fell below threshold {BODY_IOU_THRESHOLD:.3f}"
            )

        region_mask = isolate_overlay_region(overlay_rgb, neutral_rgb, neutral_body)
        if region_mask.sum() == 0:
            raise RuntimeError(f"{spec.view} {region_id} produced an empty overlay mask")

        save_mask(DST_DIR / spec.mask_map[region_id], region_mask)
        save_mask(DIAG_DIR / f"{spec.view}-{region_id}-mask.png", region_mask)
        save_rgb(SOURCE_DIR / f"{spec.view}-{region_id}-overlay-cropped.png", overlay_rgb)
        Image.fromarray(
            overlay_mask_preview(
                neutral_clean_rgb,
                neutral_alpha,
                region_mask,
                REGION_PREVIEW_COLORS[region_id],
            ),
            "RGBA",
        ).save(DIAG_DIR / f"{spec.view}-{region_id}-preview.png")
        save_body_overlap_preview(DIAG_DIR / f"{spec.view}-{region_id}-body-overlap.png", neutral_body, overlay_body)

        region_metrics[region_id] = int(region_mask.sum())
        overlay_metrics[region_id] = {
            "source": str(overlay_src),
            "body_iou": body_iou,
            "overlay_components": overlay_components,
            "background_mean": overlay_stats.mean.round(3).tolist(),
            "background_std": overlay_stats.std.round(3).tolist(),
        }

    return {
        "view": spec.view,
        "neutral_source": str(spec.neutral_src),
        "bbox": list(bbox),
        "neutral_components": neutral_components,
        "neutral_background_mean": neutral_stats.mean.round(3).tolist(),
        "neutral_background_std": neutral_stats.std.round(3).tolist(),
        "region_pixels": region_metrics,
        "overlays": overlay_metrics,
    }


def build_neutral_pair_preview() -> None:
    front = np.asarray(Image.open(DST_DIR / "neutral-front-transparent.png").convert("RGBA"), dtype=np.uint8)
    back = np.asarray(Image.open(DST_DIR / "neutral-back-transparent.png").convert("RGBA"), dtype=np.uint8)
    gap = np.zeros((max(front.shape[0], back.shape[0]), 24, 4), dtype=np.uint8)
    gap[..., 3] = 0
    height = max(front.shape[0], back.shape[0])

    def pad_to_height(rgba: np.ndarray, target_height: int) -> np.ndarray:
        if rgba.shape[0] == target_height:
            return rgba
        top = (target_height - rgba.shape[0]) // 2
        bottom = target_height - rgba.shape[0] - top
        return np.pad(rgba, ((top, bottom), (0, 0), (0, 0)), mode="constant")

    preview = np.concatenate(
        [pad_to_height(front, height), gap, pad_to_height(back, height)],
        axis=1,
    )
    Image.fromarray(preview, "RGBA").save(DST_DIR / "neutral-pair.png")


def main() -> None:
    report = {"pipeline": "style-c-overlays", "views": []}
    for spec in VIEW_SPECS:
        report["views"].append(process_view(spec))
    build_neutral_pair_preview()
    report_path = BUILD_DIR / "report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
