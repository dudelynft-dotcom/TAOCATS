"""
NFT.Storage uploader for BITTENSOR CAT
Reads API key from contracts/.env (NFT_STORAGE_API_KEY=...)

Steps:
  1. Pack images/   folder into a CAR file → upload → get images CID
  2. Patch metadata with real ipfs:// image links
  3. Pack metadata/ folder into a CAR file → upload → get metadata CID
  4. Save both CIDs to output/cids.json
"""

import os, sys, re, json, subprocess, tempfile, shutil
from pathlib import Path

ROOT        = Path(__file__).parent.parent
ENV_FILE    = ROOT / "contracts" / ".env"
OUT_DIR     = Path(__file__).parent / "output"
NFTS_URL    = "https://api.nft.storage/upload"


# ── Read API key from contracts/.env ─────────────────────────────────────────
def read_key() -> str:
    key = os.environ.get("NFT_STORAGE_API_KEY", "")
    if key:
        return key
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            m = re.match(r"^NFT_STORAGE_API_KEY\s*[:=]\s*(.+)", line.strip())
            if m:
                return m.group(1).strip()
    return ""


API_KEY = read_key()

import requests


def pack_car(folder: Path, car_path: Path) -> str:
    """Use ipfs-car to pack a folder into a CARv1 file. Returns root CID."""
    print(f"  Packing {folder.name}/ into CAR file...")
    result = subprocess.run(
        ["npx", "--yes", "ipfs-car", "pack", str(folder),
         "--output", str(car_path), "--no-wrap"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"  ipfs-car error: {result.stderr}")
        sys.exit(1)
    # ipfs-car prints the root CID to stdout
    cid = result.stdout.strip().split()[-1]
    size = car_path.stat().st_size / (1024 * 1024)
    print(f"  CAR packed: {size:.1f} MB  |  root CID: {cid}")
    return cid


def upload_car(car_path: Path, label: str) -> str:
    """Upload a CAR file to NFT.Storage and return the root CID."""
    print(f"  Uploading {label} CAR ({car_path.stat().st_size/(1024*1024):.1f} MB)...")
    with open(car_path, "rb") as f:
        resp = requests.post(
            NFTS_URL,
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type":  "application/car",
            },
            data=f,
            timeout=7200,
        )
    if not resp.ok:
        print(f"  ERROR {resp.status_code}: {resp.text[:400]}")
        sys.exit(1)
    cid = resp.json()["value"]["cid"]
    print(f"  Upload OK — CID: {cid}")
    return cid


def main():
    if not API_KEY:
        print("ERROR: NFT_STORAGE_API_KEY not found in contracts/.env")
        sys.exit(1)

    # Auth check
    r = requests.get("https://api.nft.storage/", headers={"Authorization": f"Bearer {API_KEY}"}, timeout=10)
    print(f"NFT.Storage auth: {'OK' if r.ok else 'FAILED — ' + r.text}")
    if not r.ok:
        sys.exit(1)

    images_dir   = OUT_DIR / "images"
    metadata_dir = OUT_DIR / "metadata"

    for d in (images_dir, metadata_dir):
        if not d.exists():
            print(f"ERROR: {d} not found — run generate.py first"); sys.exit(1)

    tmp = Path(tempfile.mkdtemp())
    try:
        # ── 1. Pack & upload images ───────────────────────────────────────────
        print("\n[1/3] Packing images...")
        img_car = tmp / "images.car"
        img_cid = pack_car(images_dir, img_car)
        print("\n      Uploading images to NFT.Storage...")
        upload_car(img_car, "images")

        # ── 2. Patch metadata with real image CIDs ────────────────────────────
        print("\n[2/3] Patching metadata with image CID...")
        count = 0
        for jf in sorted(metadata_dir.glob("*.json")):
            data = json.loads(jf.read_text())
            tid  = data.get("tokenId") or jf.stem
            data["image"] = f"ipfs://{img_cid}/{tid}.png"
            jf.write_text(json.dumps(data, separators=(",", ":")))
            count += 1
        print(f"  Patched {count} metadata files")

        # ── 3. Pack & upload metadata ─────────────────────────────────────────
        print("\n[3/3] Packing metadata...")
        meta_car = tmp / "metadata.car"
        meta_cid = pack_car(metadata_dir, meta_car)
        print("\n      Uploading metadata to NFT.Storage...")
        upload_car(meta_car, "metadata")

    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # ── Save results ──────────────────────────────────────────────────────────
    cids = {
        "images_cid":   img_cid,
        "metadata_cid": meta_cid,
        "base_uri":     f"ipfs://{meta_cid}/",
    }
    (OUT_DIR / "cids.json").write_text(json.dumps(cids, indent=2))

    print("\n" + "━"*54)
    print("  UPLOAD COMPLETE")
    print("━"*54)
    print(f"  Images CID:   {img_cid}")
    print(f"  Metadata CID: {meta_cid}")
    print(f"  BASE_URI:     ipfs://{meta_cid}/")
    print(f"\n  After sellout, call:")
    print(f"  nft.reveal('ipfs://{meta_cid}/')")
    print("━"*54)
    print(f"  Saved to output/cids.json")


if __name__ == "__main__":
    main()
