"""
BITTENSOR CAT -- Batched CAR uploader for Pinata free tier
Splits 4699 images into batches of BATCH_SIZE, each uploaded as its own CAR pin.
Reads PINATA_JWT from contracts/.env
"""

import os, sys, re, json, subprocess, tempfile, shutil, math
from pathlib import Path

ROOT     = Path(__file__).parent.parent
ENV_FILE = ROOT / "contracts" / ".env"
OUT_DIR  = Path(__file__).parent / "output"

BATCH_SIZE = 500   # ~110 MB per batch -- well within SSL limits


def read_jwt() -> str:
    jwt = os.environ.get("PINATA_JWT", "")
    if jwt:
        return jwt
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            m = re.match(r"^PINATA_JWT\s*[:=]\s*(.+)", line.strip())
            if m:
                return m.group(1).strip()
    return ""


JWT = read_jwt()

import requests

HEADERS = {"Authorization": f"Bearer {JWT}"}


def pack_car(files: list, batch_dir: Path, out_car: Path) -> str:
    """Copy files into a temp dir, pack as CAR, return root CID."""
    # Copy batch files into a flat temp dir
    for f in files:
        dst = batch_dir / f.name
        if f.resolve() != dst.resolve():
            shutil.copy2(f, dst)
    cmd = f'npx --yes ipfs-car pack "{batch_dir}" --output "{out_car}" --no-wrap'
    r = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    if r.returncode != 0:
        print(f"  ipfs-car error: {r.stderr.strip()[:200]}")
        sys.exit(1)
    cid = r.stdout.strip().split()[-1]
    mb  = out_car.stat().st_size / 1024 / 1024
    print(f"    CAR: {mb:.0f} MB  CID: {cid}")
    return cid


def upload_car(car_path: Path, pin_name: str) -> str:
    """Upload a CAR file to Pinata as a single pin. Returns CID."""
    with open(car_path, "rb") as f:
        resp = requests.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            headers={**HEADERS, "Content-Type": "application/car"},
            data=f,
            params={"pinataMetadata": json.dumps({"name": pin_name})},
            timeout=600,
        )
    if resp.status_code != 200:
        # fallback: multipart
        with open(car_path, "rb") as f:
            resp = requests.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                headers=HEADERS,
                files={"file": (car_path.name, f, "application/car")},
                data={"pinataMetadata": json.dumps({"name": pin_name})},
                timeout=600,
            )
    if resp.status_code != 200:
        print(f"  ERROR {resp.status_code}: {resp.text[:300]}")
        sys.exit(1)
    return resp.json()["IpfsHash"]


def main():
    if not JWT:
        print("ERROR: PINATA_JWT not found in contracts/.env")
        sys.exit(1)

    r = requests.get("https://api.pinata.cloud/data/testAuthentication",
                     headers=HEADERS, timeout=10)
    print(f"Pinata auth: {'OK' if r.status_code == 200 else 'FAILED'}")
    if r.status_code != 200:
        sys.exit(1)

    # Images are directly in output/ (not output/images/)
    images_dir   = OUT_DIR
    metadata_dir = OUT_DIR / "metadata"

    if not metadata_dir.exists():
        print(f"ERROR: {metadata_dir} missing"); sys.exit(1)

    all_images = sorted(
        [p for p in images_dir.glob("*.png") if p.stem.isdigit()],
        key=lambda p: int(p.stem)
    )
    total      = len(all_images)
    n_batches  = math.ceil(total / BATCH_SIZE)
    print(f"\n{total} images / {BATCH_SIZE} per batch = {n_batches} batches\n")

    # Map: filename -> CID of the batch it lives in
    file_cid: dict[str, str] = {}

    tmp = Path(tempfile.mkdtemp())
    try:
        # ── 1. Upload image batches ───────────────────────────────────────────
        for i in range(n_batches):
            batch = all_images[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
            label = f"BTCAT-images-{i+1:02d}of{n_batches:02d}"
            print(f"[Batch {i+1}/{n_batches}] {len(batch)} images -- {label}")

            batch_dir = tmp / f"batch_{i}"
            batch_dir.mkdir()
            out_car = tmp / f"batch_{i}.car"

            cid = pack_car(batch, batch_dir, out_car)
            pin_cid = upload_car(out_car, label)
            print(f"    Pinned as: {pin_cid}")

            for f in batch:
                file_cid[f.name] = pin_cid

            # Cleanup to save disk space
            shutil.rmtree(batch_dir)
            out_car.unlink()

        # ── 2. Patch metadata ─────────────────────────────────────────────────
        print(f"\nPatching {total} metadata files with batch CIDs...")
        for jf in sorted(metadata_dir.glob("*.json")):
            data = json.loads(jf.read_text())
            tid  = str(data.get("tokenId") or jf.stem)
            img  = f"{tid}.png"
            cid  = file_cid.get(img, "UNKNOWN")
            data["image"] = f"ipfs://{cid}/{img}"
            jf.write_text(json.dumps(data, separators=(",", ":")))
        print("  Done")

        # ── 3. Upload metadata ────────────────────────────────────────────────
        print("\n[Metadata] Packing...")
        meta_dir = tmp / "metadata_batch"
        meta_dir.mkdir()
        for jf in metadata_dir.glob("*.json"):
            shutil.copy2(jf, meta_dir / jf.name)
        meta_car = tmp / "metadata.car"
        pack_car(list(meta_dir.glob("*.json")), meta_dir, meta_car)
        print("[Metadata] Uploading...")
        meta_pin = upload_car(meta_car, "BTCAT-metadata")
        print(f"  Pinned as: {meta_pin}")

    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # ── Save results ──────────────────────────────────────────────────────────
    cids = {
        "image_batches": {name: cid for name, cid in file_cid.items()},
        "metadata_cid":  meta_pin,
        "base_uri":      f"ipfs://{meta_pin}/",
    }
    (OUT_DIR / "cids.json").write_text(json.dumps(cids, indent=2))

    print("\n" + "="*54)
    print("  UPLOAD COMPLETE")
    print("="*54)
    print(f"  Metadata CID: {meta_pin}")
    print(f"  BASE_URI:     ipfs://{meta_pin}/")
    print(f"\n  After sellout call:")
    print(f"  nft.reveal('ipfs://{meta_pin}/')")
    print("="*54)
    print("  Saved to output/cids.json")


if __name__ == "__main__":
    main()
