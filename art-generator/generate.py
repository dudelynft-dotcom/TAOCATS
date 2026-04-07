"""
BITTENSOR CAT - Generative Art Engine v5  (Layer Compositor)
=========================================================
Uses real CATCENTS PNG layer assets (2084x2084 RGBA).
Composition order (back -> front):
  Background -> Body -> Head -> Expressions -> Outfit -> Sunglasses

Layer folders (art-generator/layers/):
  backgrounds/   11 files
  body/           9 files
  heads/         37 files
  expressions/   15 files
  outfits/       41 files
  eyewear/       23 files

Usage:
  python generate.py preview    -> preview.png
  python generate.py sheet      -> preview_sheet.png (4x4 grid)
  python generate.py extreme    -> extreme_preview.png (3x3 showcase)
  python generate.py            -> output/ (all 4699 NFTs + JSON metadata)
"""

import json, math, random, sys
from PIL import Image
from pathlib import Path

# ---- CONFIG ------------------------------------------------------------------
OUT_SIZE  = 1000       # final output px (downsampled from 2084)
TOTAL     = 4699
OUT_DIR   = Path("./output")
LAYERS    = Path("./layers")
BASE_URI  = "ipfs://YOUR_CID_HERE/"
COLL_DESC = ("4699 generative bear NFTs on Bittensor EVM. "
             "100% of mint fees fund $BTCAT liquidity. No team tokens.")

# ---- LAYER REGISTRY ----------------------------------------------------------
def _scan(folder):
    """Return sorted list of PNG paths in a layer folder."""
    p = LAYERS / folder
    if not p.exists():
        return []
    return sorted(p.glob("*.png"), key=lambda x: x.name)

LAYER_FILES = {
    "background": _scan("backgrounds"),
    "body":       _scan("body"),
    "head":       _scan("heads"),
    "expression": _scan("expressions"),
    "outfit":     _scan("outfits"),
    "eyewear":    _scan("eyewear"),
}

def _check():
    missing = [k for k, v in LAYER_FILES.items() if not v]
    if missing:
        print(f"WARNING: empty layer folders: {missing}")
        print(f"  Expected layers/ subfolders: backgrounds, body, heads,")
        print(f"  expressions, outfits, eyewear")
    else:
        total = sum(len(v) for v in LAYER_FILES.values())
        print(f"Layers loaded: " +
              ", ".join(f"{k}={len(v)}" for k, v in LAYER_FILES.items()) +
              f"  ({total} total)")

# ---- LAYER CACHE -------------------------------------------------------------
_cache: dict = {}

def load(path: Path) -> Image.Image:
    """Load + cache a layer at output resolution."""
    if path in _cache:
        return _cache[path]
    img = Image.open(path).convert("RGBA")
    if img.size != (OUT_SIZE, OUT_SIZE):
        img = img.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
    _cache[path] = img
    return img

# ---- RARITY ------------------------------------------------------------------
# Weights: lower index files are more common, higher are rarer
# We assign rarity scores so rarer combos get higher scores.
def trait_score(layer_key: str, idx: int) -> int:
    """Score based on index position within a layer folder (higher = rarer)."""
    total = len(LAYER_FILES[layer_key])
    if total == 0:
        return 0
    # Linear: index 0 = 0pts, last index = max_pts
    max_pts = {"background": 20, "body": 25, "head": 30,
               "expression": 20, "outfit": 35, "eyewear": 40}
    return int((idx / max(1, total - 1)) * max_pts.get(layer_key, 20))

def rarity_tier(score: int) -> str:
    if score >= 140: return "Legendary"
    if score >= 100: return "Epic"
    if score >=  65: return "Rare"
    if score >=  35: return "Uncommon"
    return "Common"

# ---- TRAIT SELECTION ---------------------------------------------------------
# Each layer uses weighted random selection:
# earlier files (lower index) are more common, later ones rarer.
def _weights(n: int) -> list:
    """Exponential rarity: item 0 is most common, last is rarest."""
    w = [max(1, int(100 * (0.72 ** i))) for i in range(n)]
    return w

def pick_traits(seed: int) -> dict:
    rng = random.Random(seed)
    result = {}
    for key, files in LAYER_FILES.items():
        if not files:
            result[key] = None
            result[f"_{key}_idx"] = -1
            continue
        weights = _weights(len(files))
        idx = rng.choices(range(len(files)), weights=weights, k=1)[0]
        # Eyewear: 35% chance of None (no sunglasses)
        if key == "eyewear" and rng.random() < 0.35:
            result[key] = None
            result[f"_{key}_idx"] = -1
        else:
            result[key] = files[idx]
            result[f"_{key}_idx"] = idx
    return result

# ---- COMPOSE -----------------------------------------------------------------
def compose(_token_id: int, traits: dict) -> Image.Image:
    """
    Composite all layers onto a 1000x1000 canvas.
    Order: Background -> Body -> Head -> Expression -> Outfit -> Eyewear
    """
    canvas = Image.new("RGBA", (OUT_SIZE, OUT_SIZE), (0, 0, 0, 255))

    for key in ("background", "body", "head", "expression", "outfit", "eyewear"):
        path = traits.get(key)
        if path is None:
            continue
        layer = load(path)
        canvas.alpha_composite(layer)

    return canvas.convert("RGB")

# ---- METADATA ----------------------------------------------------------------
def make_metadata(token_id: int, traits: dict, score: int, rank: int) -> dict:
    def label(key):
        path = traits.get(key)
        if path is None:
            return "None"
        # Use filename without extension as trait value
        return path.stem.replace("-01", "").replace("-", " ").strip()

    attrs = [
        {"trait_type": "Background", "value": label("background")},
        {"trait_type": "Body",       "value": label("body")},
        {"trait_type": "Head",       "value": label("head")},
        {"trait_type": "Expression", "value": label("expression")},
        {"trait_type": "Outfit",     "value": label("outfit")},
        {"trait_type": "Eyewear",    "value": label("eyewear")},
        {"trait_type": "Rarity Tier",  "value": rarity_tier(score)},
        {"trait_type": "Rarity Score", "value": score, "display_type": "number"},
        {"trait_type": "Rank",         "value": rank,  "display_type": "number"},
    ]
    return {
        "name":        f"BITTENSOR CAT #{token_id}",
        "description": COLL_DESC,
        "image":       f"{BASE_URI}{token_id}.png",
        "attributes":  attrs,
    }

# ---- GRID --------------------------------------------------------------------
def make_grid(images: list, cols: int, cell: int) -> Image.Image:
    rows = math.ceil(len(images) / cols)
    grid = Image.new("RGB", (cols * cell, rows * cell), (20, 20, 28))
    for i, img in enumerate(images):
        r, c = divmod(i, cols)
        grid.paste(img.resize((cell, cell), Image.LANCZOS), (c * cell, r * cell))
    return grid

# ---- MAIN --------------------------------------------------------------------
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "generate"
    _check()

    rng = random.Random(42)

    if mode == "preview":
        t = pick_traits(rng.randint(0, 10**9))
        compose(1, t).save("preview.png")
        print("Saved: preview.png")
        for key in ("background", "body", "head", "expression", "outfit", "eyewear"):
            p = t.get(key)
            print(f"  {key:12s} = {p.name if p else 'None'}")

    elif mode == "sheet":
        print("Generating 4x4 preview sheet (16 bears)...")
        imgs = [compose(i + 1, pick_traits(rng.randint(0, 10**9))) for i in range(16)]
        make_grid(imgs, 4, 500).save("preview_sheet.png")
        print("Saved: preview_sheet.png  (2000x2000)")

    elif mode == "extreme":
        print("Generating 3x3 showcase (9 varied bears)...")
        seeds, seen = [], set()
        for _ in range(500):
            if len(seeds) >= 9:
                break
            s = rng.randint(0, 10**9)
            t = pick_traits(s)
            k = (t.get("head"), t.get("outfit"), t.get("eyewear"))
            if k not in seen:
                seen.add(k)
                seeds.append(s)
        imgs = [compose(i + 1, pick_traits(s)) for i, s in enumerate(seeds)]
        make_grid(imgs, 3, 600).save("extreme_preview.png")
        print("Saved: extreme_preview.png  (1800x1800)")

    else:
        OUT_DIR.mkdir(exist_ok=True)
        (OUT_DIR / "images").mkdir(exist_ok=True)
        (OUT_DIR / "metadata").mkdir(exist_ok=True)
        print(f"Generating all {TOTAL} BITTENSOR CAT NFTs...")

        # Pass 1: compute all traits + rarity scores
        all_traits, all_scores = [], []
        for i in range(1, TOTAL + 1):
            t = pick_traits(i * 7919)
            s = sum(trait_score(k, t[f"_{k}_idx"])
                    for k in ("background","body","head","expression","outfit","eyewear")
                    if t.get(f"_{k}_idx", -1) >= 0)
            all_traits.append(t)
            all_scores.append(s)

        # Assign global ranks (1 = rarest)
        order = sorted(range(TOTAL), key=lambda i: -all_scores[i])
        ranks = [0] * TOTAL
        for pos, idx in enumerate(order):
            ranks[idx] = pos + 1

        # Pass 2: render + save
        for i, (t, s, rank) in enumerate(zip(all_traits, all_scores, ranks)):
            tid = i + 1
            compose(tid, t).save(OUT_DIR / "images" / f"{tid}.png")
            meta = make_metadata(tid, t, s, rank)
            with open(OUT_DIR / "metadata" / f"{tid}.json", "w") as f:
                json.dump(meta, f, indent=2)
            if tid % 100 == 0 or tid == TOTAL:
                print(f"  [{tid:4d}/{TOTAL}]  {tid / TOTAL * 100:.1f}%")

        # Rarity export for on-chain contract
        rarity_export = {
            str(i + 1): {
                "score": all_scores[i],
                "rank":  ranks[i],
                "tier":  rarity_tier(all_scores[i]),
            }
            for i in range(TOTAL)
        }
        with open(OUT_DIR / "rarity.json", "w") as f:
            json.dump(rarity_export, f, indent=2)

        print(f"\nDone! All files in {OUT_DIR}/")
        print("  1. Upload output/images/   to Pinata -> get CID")
        print("  2. Upload output/metadata/ to Pinata -> get CID")
        print("  3. Update BASE_URI at top of this file -> regenerate metadata")
        print("  4. Use rarity.json to call BittensorCatRarity.setRarity() on-chain")


if __name__ == "__main__":
    main()
