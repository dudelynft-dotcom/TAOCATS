"""
Full-body standing pixel art cat generator.
Style: like reference image 1 (full body, arms out, accessories)
Colors: black & white on flat background (like reference image 2)
Grid: 24x32 sprite, upscaled to 480x640
"""

import os, random
from PIL import Image, ImageDraw

OUTPUT_DIR = "output_pixel_bw"
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCALE = 20          # each pixel = 20x20 px  → 480x640 final
W, H  = 24, 32      # sprite grid width x height

# ── Palette ────────────────────────────────────────────────────────────────────
BG   = (232, 235, 245)   # lavender-gray background (image 2 style)
BLK  = (28,  30,  46)    # near-black (body outline + fill)
WHT  = (255, 255, 255)   # white (eyes, belly, highlights)
LGT  = (185, 190, 210)   # light gray (shading, accessories)
MID  = (120, 125, 145)   # mid gray
PAW  = (28,  30,  46)    # paw print color

# ── Randomizable traits ────────────────────────────────────────────────────────
EAR_SHAPES   = ["pointed", "round", "wide"]
EYE_STYLES   = ["round", "angry", "wide", "wink"]
MOUTH_STYLES = ["smile", "open", "flat", "frown"]
BODY_STYLES  = ["fat", "slim", "normal"]
ARM_STYLES   = ["wings", "fists", "claws", "spread"]
LEG_STYLES   = ["wide", "normal", "crossed"]
ACCESSORY    = ["none", "scarf", "bow", "collar", "armor"]
HAT_STYLES   = ["none", "cap", "crown", "beanie", "propeller", "horns"]
TAIL_STYLES  = ["up", "curl", "wavy"]

def draw_pixel(canvas, x, y, color, scale=SCALE):
    if 0 <= x < W and 0 <= y < H:
        px, py = x * scale, y * scale
        for dy in range(scale):
            for dx in range(scale):
                canvas[px + dx, py + dy] = color

def draw_rect(canvas, x1, y1, x2, y2, color):
    for y in range(y1, y2+1):
        for x in range(x1, x2+1):
            draw_pixel(canvas, x, y, color)

def draw_outline_rect(canvas, x1, y1, x2, y2, fill, outline):
    draw_rect(canvas, x1, y1, x2, y2, fill)
    for x in range(x1, x2+1):
        draw_pixel(canvas, x, y1, outline)
        draw_pixel(canvas, x, y2, outline)
    for y in range(y1, y2+1):
        draw_pixel(canvas, x1, y, outline)
        draw_pixel(canvas, x2, y, outline)

def generate_cat(seed: int = 42) -> Image.Image:
    rng = random.Random(seed)

    ear_shape   = rng.choice(EAR_SHAPES)
    eye_style   = rng.choice(EYE_STYLES)
    mouth_style = rng.choice(MOUTH_STYLES)
    body_style  = rng.choice(BODY_STYLES)
    arm_style   = rng.choice(ARM_STYLES)
    leg_style   = rng.choice(LEG_STYLES)
    accessory   = rng.choice(ACCESSORY)
    hat_style   = rng.choice(HAT_STYLES)
    tail_style  = rng.choice(TAIL_STYLES)
    has_whiskers = rng.random() > 0.3
    has_blush    = rng.random() > 0.5
    inner_ear_color = WHT if rng.random() > 0.4 else LGT

    img = Image.new("RGB", (W * SCALE, H * SCALE), BG)
    c   = img.load()

    # ── EARS ──────────────────────────────────────────────────────────────────
    # Head center: x=7..16, y=3..11
    if ear_shape == "pointed":
        # Left ear
        draw_pixel(c, 7, 2, BLK); draw_pixel(c, 8, 2, BLK)
        draw_pixel(c, 6, 3, BLK); draw_pixel(c, 7, 3, BLK); draw_pixel(c, 8, 3, BLK)
        draw_pixel(c, 7, 3, inner_ear_color)
        # Right ear
        draw_pixel(c, 15, 2, BLK); draw_pixel(c, 16, 2, BLK)
        draw_pixel(c, 15, 3, BLK); draw_pixel(c, 16, 3, BLK); draw_pixel(c, 17, 3, BLK)
        draw_pixel(c, 16, 3, inner_ear_color)
    elif ear_shape == "round":
        draw_pixel(c, 6, 3, BLK); draw_pixel(c, 7, 3, BLK); draw_pixel(c, 8, 3, BLK)
        draw_pixel(c, 7, 2, BLK); draw_pixel(c, 7, 3, inner_ear_color)
        draw_pixel(c, 15, 3, BLK); draw_pixel(c, 16, 3, BLK); draw_pixel(c, 17, 3, BLK)
        draw_pixel(c, 16, 2, BLK); draw_pixel(c, 16, 3, inner_ear_color)
    else:  # wide
        for x in range(5, 9): draw_pixel(c, x, 3, BLK)
        for x in range(6, 8): draw_pixel(c, x, 2, BLK)
        draw_pixel(c, 6, 3, inner_ear_color); draw_pixel(c, 7, 3, inner_ear_color)
        for x in range(15, 19): draw_pixel(c, x, 3, BLK)
        for x in range(16, 18): draw_pixel(c, x, 2, BLK)
        draw_pixel(c, 15, 3, inner_ear_color); draw_pixel(c, 16, 3, inner_ear_color)

    # ── HEAD ──────────────────────────────────────────────────────────────────
    # Big round head: cols 6-17, rows 3-12
    draw_rect(c, 7, 4, 16, 11, WHT)
    # Outline
    for x in range(7, 17): draw_pixel(c, x, 3, BLK); draw_pixel(c, x, 12, BLK)
    for y in range(3, 13): draw_pixel(c, 6, y, BLK); draw_pixel(c, 17, y, BLK)
    # Round corners
    draw_pixel(c, 7, 3, BLK); draw_pixel(c, 16, 3, BLK)
    draw_pixel(c, 6, 4, BLK); draw_pixel(c, 17, 4, BLK)
    draw_pixel(c, 6, 11, BLK); draw_pixel(c, 17, 11, BLK)
    draw_pixel(c, 7, 12, BLK); draw_pixel(c, 16, 12, BLK)

    # ── EYES ──────────────────────────────────────────────────────────────────
    if eye_style == "round":
        # Left eye
        draw_rect(c, 8, 6, 10, 8, WHT)
        draw_rect(c, 9, 7, 9, 7, BLK)  # pupil
        for x in [8,9,10]: draw_pixel(c, x, 6, BLK); draw_pixel(c, x, 8, BLK)
        draw_pixel(c, 8, 7, BLK); draw_pixel(c, 10, 7, BLK)
        # Right eye
        draw_rect(c, 13, 6, 15, 8, WHT)
        draw_rect(c, 14, 7, 14, 7, BLK)
        for x in [13,14,15]: draw_pixel(c, x, 6, BLK); draw_pixel(c, x, 8, BLK)
        draw_pixel(c, 13, 7, BLK); draw_pixel(c, 15, 7, BLK)
    elif eye_style == "angry":
        draw_pixel(c, 8, 6, BLK); draw_pixel(c, 9, 7, BLK); draw_pixel(c, 10, 7, BLK)
        draw_pixel(c, 8, 8, BLK); draw_pixel(c, 9, 8, BLK); draw_pixel(c, 10, 8, BLK)
        draw_pixel(c, 9, 7, WHT); draw_pixel(c, 9, 8, WHT)
        draw_pixel(c, 15, 6, BLK); draw_pixel(c, 13, 7, BLK); draw_pixel(c, 14, 7, BLK)
        draw_pixel(c, 13, 8, BLK); draw_pixel(c, 14, 8, BLK); draw_pixel(c, 15, 8, BLK)
        draw_pixel(c, 14, 7, WHT); draw_pixel(c, 14, 8, WHT)
    elif eye_style == "wide":
        for y in range(6, 9):
            for x in range(8, 11): draw_pixel(c, x, y, WHT)
            for x in range(13, 16): draw_pixel(c, x, y, WHT)
        draw_rect(c, 8, 6, 10, 8, WHT)
        draw_pixel(c, 9, 7, BLK); draw_pixel(c, 9, 6, BLK); draw_pixel(c, 8, 6, BLK); draw_pixel(c, 10, 6, BLK)
        draw_pixel(c, 8, 8, BLK); draw_pixel(c, 10, 8, BLK)
        draw_rect(c, 13, 6, 15, 8, WHT)
        draw_pixel(c, 14, 7, BLK); draw_pixel(c, 14, 6, BLK); draw_pixel(c, 13, 6, BLK); draw_pixel(c, 15, 6, BLK)
        draw_pixel(c, 13, 8, BLK); draw_pixel(c, 15, 8, BLK)
    else:  # wink
        # Left: normal eye
        draw_rect(c, 8, 6, 10, 8, WHT)
        draw_pixel(c, 9, 7, BLK)
        for x in [8,9,10]: draw_pixel(c, x, 6, BLK); draw_pixel(c, x, 8, BLK)
        draw_pixel(c, 8, 7, BLK); draw_pixel(c, 10, 7, BLK)
        # Right: wink line
        draw_pixel(c, 13, 7, BLK); draw_pixel(c, 14, 7, BLK); draw_pixel(c, 15, 7, BLK)

    # ── BLUSH ─────────────────────────────────────────────────────────────────
    if has_blush:
        draw_pixel(c, 8, 9, LGT); draw_pixel(c, 7, 9, LGT)
        draw_pixel(c, 15, 9, LGT); draw_pixel(c, 16, 9, LGT)

    # ── NOSE ──────────────────────────────────────────────────────────────────
    draw_pixel(c, 11, 9, BLK); draw_pixel(c, 12, 9, BLK)

    # ── MOUTH ─────────────────────────────────────────────────────────────────
    if mouth_style == "smile":
        draw_pixel(c, 10, 10, BLK); draw_pixel(c, 13, 10, BLK)
        draw_pixel(c, 11, 11, BLK); draw_pixel(c, 12, 11, BLK)
    elif mouth_style == "open":
        draw_pixel(c, 10, 10, BLK); draw_pixel(c, 11, 10, BLK); draw_pixel(c, 12, 10, BLK); draw_pixel(c, 13, 10, BLK)
        draw_pixel(c, 10, 11, BLK); draw_pixel(c, 13, 11, BLK)
        draw_pixel(c, 11, 11, WHT); draw_pixel(c, 12, 11, WHT)  # teeth
    elif mouth_style == "frown":
        draw_pixel(c, 10, 11, BLK); draw_pixel(c, 13, 11, BLK)
        draw_pixel(c, 11, 10, BLK); draw_pixel(c, 12, 10, BLK)
    else:  # flat
        draw_pixel(c, 10, 10, BLK); draw_pixel(c, 11, 10, BLK); draw_pixel(c, 12, 10, BLK); draw_pixel(c, 13, 10, BLK)

    # ── WHISKERS ──────────────────────────────────────────────────────────────
    if has_whiskers:
        draw_pixel(c, 5, 9, BLK); draw_pixel(c, 5, 10, BLK)
        draw_pixel(c, 4, 8, BLK); draw_pixel(c, 4, 11, BLK)
        draw_pixel(c, 18, 9, BLK); draw_pixel(c, 18, 10, BLK)
        draw_pixel(c, 19, 8, BLK); draw_pixel(c, 19, 11, BLK)

    # ── HAT ───────────────────────────────────────────────────────────────────
    if hat_style == "cap":
        draw_rect(c, 7, 3, 16, 4, BLK)
        draw_rect(c, 9, 1, 14, 3, BLK)
        draw_pixel(c, 8, 3, BLK); draw_pixel(c, 17, 3, BLK)  # brim
        draw_rect(c, 10, 2, 13, 3, LGT)  # stripe
    elif hat_style == "crown":
        draw_pixel(c, 8, 2, BLK); draw_pixel(c, 11, 1, BLK); draw_pixel(c, 12, 1, BLK); draw_pixel(c, 15, 2, BLK)
        for x in range(8, 16): draw_pixel(c, x, 3, BLK)
        draw_pixel(c, 9, 2, WHT); draw_pixel(c, 11, 2, WHT); draw_pixel(c, 13, 2, WHT)
    elif hat_style == "beanie":
        draw_rect(c, 8, 1, 15, 4, BLK)
        draw_rect(c, 9, 2, 14, 3, LGT)
        draw_pixel(c, 11, 0, BLK); draw_pixel(c, 12, 0, BLK)  # pom pom
    elif hat_style == "propeller":
        draw_rect(c, 9, 2, 14, 4, BLK)
        draw_pixel(c, 11, 1, BLK); draw_pixel(c, 12, 1, BLK)
        draw_pixel(c, 9, 1, LGT); draw_pixel(c, 10, 0, LGT)   # propeller blade L
        draw_pixel(c, 13, 1, LGT); draw_pixel(c, 14, 0, LGT)  # propeller blade R
    elif hat_style == "horns":
        draw_pixel(c, 8, 2, BLK); draw_pixel(c, 8, 1, BLK)
        draw_pixel(c, 15, 2, BLK); draw_pixel(c, 15, 1, BLK)
        draw_pixel(c, 9, 3, BLK); draw_pixel(c, 14, 3, BLK)

    # ── NECK / ACCESSORY ──────────────────────────────────────────────────────
    # Neck
    draw_rect(c, 10, 12, 13, 13, BLK)
    draw_rect(c, 10, 12, 13, 13, WHT)
    for x in [10, 13]: draw_pixel(c, x, 12, BLK); draw_pixel(c, x, 13, BLK)

    if accessory == "scarf":
        draw_rect(c, 8, 12, 15, 13, BLK)
        draw_rect(c, 9, 12, 14, 13, LGT)
        draw_pixel(c, 11, 14, BLK); draw_pixel(c, 12, 14, BLK); draw_pixel(c, 12, 15, BLK)
    elif accessory == "bow":
        draw_pixel(c, 8, 12, BLK); draw_pixel(c, 9, 12, BLK)
        draw_pixel(c, 14, 12, BLK); draw_pixel(c, 15, 12, BLK)
        draw_pixel(c, 11, 12, BLK); draw_pixel(c, 12, 12, BLK)  # center
        draw_pixel(c, 8, 13, BLK); draw_pixel(c, 9, 13, BLK)
        draw_pixel(c, 14, 13, BLK); draw_pixel(c, 15, 13, BLK)
    elif accessory == "collar":
        draw_rect(c, 8, 12, 15, 13, BLK)
        draw_pixel(c, 11, 13, LGT); draw_pixel(c, 12, 13, LGT)  # tag
    elif accessory == "armor":
        draw_rect(c, 7, 12, 16, 14, BLK)
        draw_rect(c, 8, 12, 15, 14, LGT)
        draw_pixel(c, 11, 13, BLK); draw_pixel(c, 12, 13, BLK)

    # ── BODY ──────────────────────────────────────────────────────────────────
    bw = 7 if body_style == "fat" else (5 if body_style == "slim" else 6)
    bx1 = (W - bw*2) // 2
    bx2 = bx1 + bw*2 - 1
    by1, by2 = 13, 21

    draw_rect(c, bx1, by1, bx2, by2, BLK)
    draw_rect(c, bx1+1, by1+1, bx2-1, by2-1, WHT)
    # Belly oval
    bcx = W // 2
    draw_rect(c, bcx-2, by1+2, bcx+2, by2-2, LGT)
    # Buttons
    draw_pixel(c, bcx, by1+3, BLK)
    draw_pixel(c, bcx, by1+5, BLK)
    draw_pixel(c, bcx, by1+7, BLK)

    # ── ARMS ──────────────────────────────────────────────────────────────────
    if arm_style == "wings":
        # Left wing (like image 1 - spread wide with layers)
        draw_rect(c, 1, 14, 5, 19, BLK)
        draw_rect(c, 2, 15, 4, 18, LGT)
        draw_pixel(c, 1, 14, BLK); draw_pixel(c, 0, 16, BLK); draw_pixel(c, 1, 18, BLK)
        draw_rect(c, 2, 16, 3, 17, WHT)
        # Right wing
        draw_rect(c, W-6, 14, W-2, 19, BLK)
        draw_rect(c, W-5, 15, W-3, 18, LGT)
        draw_pixel(c, W-2, 14, BLK); draw_pixel(c, W-1, 16, BLK); draw_pixel(c, W-2, 18, BLK)
        draw_rect(c, W-4, 16, W-3, 17, WHT)
    elif arm_style == "fists":
        # Left arm + fist
        draw_rect(c, 3, 14, 5, 18, BLK)
        draw_rect(c, 1, 16, 4, 19, BLK)
        draw_rect(c, 2, 17, 3, 18, WHT)  # knuckle highlight
        # Right arm + fist
        draw_rect(c, W-6, 14, W-4, 18, BLK)
        draw_rect(c, W-5, 16, W-2, 19, BLK)
        draw_rect(c, W-4, 17, W-3, 18, WHT)
    elif arm_style == "claws":
        # Left
        draw_rect(c, 2, 14, 5, 18, BLK)
        draw_pixel(c, 1, 19, BLK); draw_pixel(c, 2, 19, BLK); draw_pixel(c, 4, 19, BLK)
        draw_pixel(c, 1, 20, BLK); draw_pixel(c, 4, 20, BLK)
        # Right
        draw_rect(c, W-6, 14, W-3, 18, BLK)
        draw_pixel(c, W-2, 19, BLK); draw_pixel(c, W-3, 19, BLK); draw_pixel(c, W-5, 19, BLK)
        draw_pixel(c, W-2, 20, BLK); draw_pixel(c, W-5, 20, BLK)
    else:  # spread
        draw_rect(c, 2, 14, 5, 20, BLK)
        draw_rect(c, 3, 15, 4, 19, LGT)
        draw_rect(c, W-6, 14, W-3, 20, BLK)
        draw_rect(c, W-5, 15, W-4, 19, LGT)

    # ── LEGS ──────────────────────────────────────────────────────────────────
    if leg_style == "wide":
        # Left leg
        draw_rect(c, bx1, 21, bx1+3, 26, BLK)
        draw_rect(c, bx1+1, 22, bx1+2, 25, LGT)
        # Left foot
        draw_rect(c, bx1-1, 26, bx1+4, 28, BLK)
        draw_rect(c, bx1, 27, bx1+3, 27, LGT)
        # Right leg
        draw_rect(c, bx2-3, 21, bx2, 26, BLK)
        draw_rect(c, bx2-2, 22, bx2-1, 25, LGT)
        # Right foot
        draw_rect(c, bx2-4, 26, bx2+1, 28, BLK)
        draw_rect(c, bx2-3, 27, bx2, 27, LGT)
    elif leg_style == "normal":
        draw_rect(c, bx1+1, 21, bx1+3, 26, BLK)
        draw_rect(c, bx1, 26, bx1+4, 28, BLK)
        draw_rect(c, bx1+1, 27, bx1+3, 27, LGT)
        draw_rect(c, bx2-3, 21, bx2-1, 26, BLK)
        draw_rect(c, bx2-4, 26, bx2, 28, BLK)
        draw_rect(c, bx2-3, 27, bx2-1, 27, LGT)
    else:  # crossed
        draw_rect(c, bx1+1, 21, bx1+3, 28, BLK)
        draw_rect(c, bx1+2, 22, bx1+2, 27, LGT)
        draw_rect(c, bx2-3, 21, bx2-1, 28, BLK)
        draw_rect(c, bx2-2, 22, bx2-2, 27, LGT)
        # feet
        draw_rect(c, bx1, 27, bx1+5, 29, BLK)
        draw_rect(c, bx2-5, 27, bx2, 29, BLK)

    # ── TAIL ──────────────────────────────────────────────────────────────────
    if tail_style == "up":
        draw_pixel(c, bx2+1, 21, BLK); draw_pixel(c, bx2+2, 20, BLK)
        draw_pixel(c, bx2+2, 19, BLK); draw_pixel(c, bx2+2, 18, BLK)
        draw_pixel(c, bx2+1, 17, BLK); draw_pixel(c, bx2+2, 16, BLK); draw_pixel(c, bx2+3, 16, BLK)
    elif tail_style == "curl":
        draw_pixel(c, bx2+1, 21, BLK); draw_pixel(c, bx2+2, 20, BLK)
        draw_pixel(c, bx2+3, 19, BLK); draw_pixel(c, bx2+3, 18, BLK)
        draw_pixel(c, bx2+2, 17, BLK); draw_pixel(c, bx2+1, 18, BLK)
    else:  # wavy
        draw_pixel(c, bx2+1, 22, BLK); draw_pixel(c, bx2+2, 21, BLK)
        draw_pixel(c, bx2+3, 21, BLK); draw_pixel(c, bx2+3, 20, BLK)
        draw_pixel(c, bx2+2, 19, BLK); draw_pixel(c, bx2+1, 19, BLK)
        draw_pixel(c, bx2+1, 18, BLK)

    return img

# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating full-body pixel art B&W cats...\n")

    seeds = [7, 42, 99, 256, 512, 1337]
    names = ["sample_1", "sample_2", "sample_3", "sample_4", "sample_5", "sample_6"]

    for seed, name in zip(seeds, names):
        img = generate_cat(seed=seed)
        path = os.path.join(OUTPUT_DIR, f"{name}.png")
        img.save(path, "PNG")
        print(f"  Saved: {path}  (traits: seed={seed})")

    print("\nDone! Open output_pixel_bw/ to review.")
