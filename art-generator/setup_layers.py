"""
TAO BEAR — Layer Setup Wizard
Run this once to place your layer PNG files in the right folders.
It opens a file picker for each layer slot.

Usage:
  python setup_layers.py
"""

import shutil
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox
    HAS_TK = True
except ImportError:
    HAS_TK = False

LAYERS = Path("./layers")

SLOTS = [
    {
        "label": "Bear Head",
        "hint":  "Select your bear head PNG (cream bear face with ears)",
        "dest":  LAYERS / "head" / "bear_base.png",
    },
    {
        "label": "Outfit / Jacket",
        "hint":  "Select your outfit/jacket PNG (the body layer)",
        "dest":  LAYERS / "outfits" / "open_jacket.png",
    },
    {
        "label": "Eyewear / Sunglasses",
        "hint":  "Select your sunglasses PNG (aviator glasses)",
        "dest":  LAYERS / "eyewear" / "aviator.png",
    },
    {
        "label": "Headgear / Headphones",
        "hint":  "Select your headphones PNG",
        "dest":  LAYERS / "headgear" / "headphones.png",
    },
]

def run_gui():
    root = tk.Tk()
    root.withdraw()  # hide main window

    saved = 0
    for slot in SLOTS:
        slot["dest"].parent.mkdir(parents=True, exist_ok=True)

        # Skip if already placed
        if slot["dest"].exists():
            print(f"  [OK] {slot['label']} already saved -> {slot['dest']}")
            saved += 1
            continue

        messagebox.showinfo(
            "TAO BEAR — Layer Setup",
            f"Step: {slot['label']}\n\n{slot['hint']}"
        )

        path = filedialog.askopenfilename(
            title=f"Select: {slot['label']}",
            filetypes=[("PNG files", "*.png"), ("All image files", "*.png;*.jpg;*.jpeg;*.webp")]
        )

        if path:
            shutil.copy(path, slot["dest"])
            print(f"  [SAVED] {slot['label']} -> {slot['dest']}")
            saved += 1
        else:
            print(f"  [SKIP]  {slot['label']} (no file selected)")

    root.destroy()

    print()
    if saved == len(SLOTS):
        print("All layers saved!")
        print("Run now: python generate.py preview")
    else:
        print(f"{saved}/{len(SLOTS)} layers saved.")
        print("Re-run this script to fill in the remaining slots.")
        print("Or run: python generate.py preview (missing slots will be blank)")


def run_cli():
    """Fallback if tkinter is unavailable — manual path entry."""
    print("TAO BEAR — Layer Setup (type paths manually)\n")
    for slot in SLOTS:
        slot["dest"].parent.mkdir(parents=True, exist_ok=True)
        if slot["dest"].exists():
            print(f"  [OK] {slot['label']} already at {slot['dest']}")
            continue
        path = input(f"  Path to your {slot['label']} PNG: ").strip().strip('"')
        if path and Path(path).exists():
            shutil.copy(path, slot["dest"])
            print(f"  [SAVED] -> {slot['dest']}")
        else:
            print(f"  [SKIP]")
    print("\nDone. Run: python generate.py preview")


if __name__ == "__main__":
    if HAS_TK:
        run_gui()
    else:
        run_cli()
