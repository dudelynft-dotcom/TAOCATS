"""
Pixel Art B&W Cat Generator - High Quality
Uses real layer artwork, pixelates to grid, converts to 3-tone B&W.
Every variant uses real layer combinations for maximum creativity.
"""

import os, random
from PIL import Image, ImageEnhance

OUTPUT_DIR  = "output"
LAYERS_DIR  = "layers"
PIXEL_SIZE  = 48          # internal grid
OUTPUT_SIZE = 768         # final image px
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── Palette — strict 2-color like Normies ─────────────────────────────────────
BG_COLOR  = (242, 242, 242)   # near-white background
FG_DARK   = (40,  40,  40)    # dark (treated as black)
FG_MID    = (40,  40,  40)    # same as dark — NO gray, pure 2-color
FG_LIGHT  = (242, 242, 242)   # white = same as background

# ── Layer config ───────────────────────────────────────────────────────────────
ALL_LAYERS = {
    "body":        {"required": True,  "prob": 1.0},
    "expressions": {"required": True,  "prob": 1.0},
    "heads":       {"required": True,  "prob": 1.0},
    "outfits":     {"required": False, "prob": 0.70},
    "eyewear":     {"required": False, "prob": 0.45},
}
# backgrounds deliberately excluded — we always use flat lavender BG
LAYER_ORDER = ["body", "expressions", "heads", "outfits", "eyewear"]

def get_layer_files(folder):
    path = os.path.join(LAYERS_DIR, folder)
    if not os.path.isdir(path):
        return []
    return sorted([os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith(".png")])

def pick_layers(rng: random.Random) -> dict:
    chosen = {}
    for layer in LAYER_ORDER:
        cfg   = ALL_LAYERS[layer]
        files = get_layer_files(layer)
        if not files:
            continue
        if not cfg["required"] and rng.random() > cfg["prob"]:
            continue
        chosen[layer] = rng.choice(files)
    return chosen

def composite_layers(layer_paths: dict) -> Image.Image:
    """Stack all chosen layers into one RGBA image."""
    canvas = None
    for layer in LAYER_ORDER:
        if layer not in layer_paths:
            continue
        img = Image.open(layer_paths[layer]).convert("RGBA")
        if canvas is None:
            canvas = img
        else:
            canvas = Image.alpha_composite(canvas, img)
    return canvas

def to_3tone_pixel(src: Image.Image, grid: int = PIXEL_SIZE) -> Image.Image:
    """
    Convert full-colour RGBA image to 3-tone pixel art (dark/mid/light).
    1. Boost contrast before downscaling for sharper edges
    2. Downscale to grid (nearest = chunky pixel blocks)
    3. Map each pixel to 3 tones based on luminance + alpha
    """
    # Pre-process: flatten onto white, boost contrast
    white_bg = Image.new("RGBA", src.size, (255, 255, 255, 255))
    flat = Image.alpha_composite(white_bg, src).convert("RGB")

    # Boost contrast and sharpness so details survive downscaling
    flat = ImageEnhance.Contrast(flat).enhance(1.6)
    flat = ImageEnhance.Sharpness(flat).enhance(2.0)

    # Downscale for pixel art
    small_flat  = flat.resize((grid, grid), Image.NEAREST)
    small_alpha = src.resize((grid, grid), Image.NEAREST).split()[3]

    result = Image.new("RGBA", (grid, grid), (0, 0, 0, 0))
    pf = small_flat.load()
    pa = small_alpha.load()
    pr = result.load()

    for y in range(grid):
        for x in range(grid):
            a = pa[x, y]
            if a < 30:
                pr[x, y] = (0, 0, 0, 0)  # transparent
                continue

            r, g, b = pf[x, y]
            lum = 0.299*r + 0.587*g + 0.114*b

            # Background layer: keep as flat BG color (handled separately)
            # Strict 2-color: bright pixels = white/bg, everything else = black
            if lum > 180:
                pr[x, y] = FG_LIGHT + (255,)
            else:
                pr[x, y] = FG_DARK + (255,)

    return result

def make_background(grid: int = PIXEL_SIZE) -> Image.Image:
    """Solid lavender background — no layer background used (keep clean)."""
    return Image.new("RGBA", (grid, grid), BG_COLOR + (255,))

def draw_paw(canvas_px, ox, oy, color=FG_DARK):
    """Draw a pixel paw print at grid position (ox, oy)."""
    pixels = canvas_px.load()
    w, h   = canvas_px.size
    # toe beans: 4 small dots in arc above main pad
    toes = [(0,0),(2,0),(4,0),(1,-1),(3,-1)]
    pad  = [(0,1),(1,1),(2,1),(3,1),(4,1),(0,2),(1,2),(2,2),(3,2),(4,2),(1,3),(2,3),(3,3)]
    for dx, dy in toes + pad:
        px_, py_ = ox+dx, oy+dy
        if 0 <= px_ < w and 0 <= py_ < h:
            pixels[px_, py_] = color + (255,)

def add_paw_prints(canvas: Image.Image, rng: random.Random, count: int = 3) -> Image.Image:
    """Add scattered paw prints to the background before compositing."""
    result = canvas.copy()
    w, h   = result.size
    margin = max(6, w // 12)
    cx, cy = w // 2, h // 2
    placed = []

    for _ in range(count * 6):  # many attempts
        if len(placed) >= count:
            break
        ox = rng.randint(margin, w - margin - 5)
        oy = rng.randint(margin, h - margin - 4)
        # Avoid center (where cat is)
        if abs(ox - cx) < w//3 and abs(oy - cy) < h//3:
            continue
        # Avoid overlap with previous
        if any(abs(ox-px) < 8 and abs(oy-py) < 8 for px,py in placed):
            continue
        placed.append((ox, oy))
        draw_paw(result, ox, oy, FG_DARK)

    return result

def upscale_nearest(img: Image.Image, target: int = OUTPUT_SIZE) -> Image.Image:
    """Upscale pixel art with nearest-neighbour to keep chunky blocks."""
    return img.resize((target, target), Image.NEAREST)

def generate(seed: int, filename: str):
    rng = random.Random(seed)

    # 1. Pick layers
    layer_paths = pick_layers(rng)

    # 2. Composite all layers (full colour)
    composite = composite_layers(layer_paths)
    if composite is None:
        print(f"  ERROR: no layers composited for seed {seed}")
        return

    # 3. Convert composite to 3-tone pixel art (skip background layer)
    # Remove background from composite so we can handle it separately
    pixel_cat = to_3tone_pixel(composite, PIXEL_SIZE)

    # 4. Create flat lavender background at pixel grid size
    bg = make_background(PIXEL_SIZE)

    # 5. Add paw prints to background
    paw_count = rng.randint(2, 4)
    bg = add_paw_prints(bg, rng, count=paw_count)

    # 6. Composite cat onto background
    final_grid = Image.alpha_composite(bg, pixel_cat)

    # 7. Upscale to final output size
    final = upscale_nearest(final_grid.convert("RGB"), OUTPUT_SIZE)

    out_path = os.path.join(OUTPUT_DIR, filename)
    final.save(out_path, "PNG")
    layers_used = list(layer_paths.keys())
    print(f"  {filename}  layers: {layers_used}")
    return out_path

if __name__ == "__main__":
    import time

    TOTAL = 4699

    # ── Wipe old output folder cleanly ────────────────────────────────────────
    print(f"Clearing old output in '{OUTPUT_DIR}/'...")
    if os.path.isdir(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f.endswith(".png"):
                os.remove(os.path.join(OUTPUT_DIR, f))
    print("Cleared.\n")

    print(f"Generating {TOTAL} B&W pixel art cats...\n")
    t0 = time.time()
    failed = 0

    for token_id in range(1, TOTAL + 1):
        try:
            generate(seed=token_id * 7 + 13, filename=f"{token_id}.png")
        except Exception as e:
            print(f"  ERROR token {token_id}: {e}")
            failed += 1

        if token_id % 100 == 0:
            elapsed = time.time() - t0
            rate    = token_id / elapsed
            eta     = (TOTAL - token_id) / rate
            print(f"  [{token_id}/{TOTAL}]  {rate:.1f} img/s  ETA {eta/60:.1f} min")

    elapsed = time.time() - t0
    print(f"\nDone! {TOTAL - failed}/{TOTAL} cats generated in {elapsed/60:.1f} min.")
    if failed:
        print(f"  {failed} failed — check errors above.")
