# TAO BEAR — Art Layer Guide

## Folder Structure
```
layers/
  background/   ← Background layer (1000x1000 PNG, RGBA)
  fur/          ← Body/fur color layer
  outfit/       ← Clothing layer
  eyes/         ← Eyes layer
  mouth/        ← Mouth layer
  accessory/    ← Hat/jewelry layer
```

## File naming
Each file must match EXACTLY the trait names in generate.py:
- `layers/fur/Brown.png`
- `layers/fur/Diamond.png`
- `layers/eyes/Laser Red.png`
etc.

## Image specs
- Size: 1000 x 1000 px
- Format: PNG with transparency (RGBA)
- Each layer draws ON TOP of the previous

## Recommended art style: Cartoon bears
Bold black outlines, flat colors, vibrant palette.
Reference: Pudgy Penguins / Cool Cats style.

## Rarity tiers
| Weight | Rarity |
|--------|--------|
| 40-55  | Common |
| 15-30  | Uncommon |
| 5-14   | Rare |
| 2-4    | Epic |
| 1      | Legendary |

## Run generator
```bash
pip install Pillow
python generate.py
```
