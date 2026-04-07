"""
Upload metadata CAR to Pinata.
All 10 image batches are already pinned from the previous run.
This script:
  1. Fixes metadata name/description (BITTENSOR CAT -> TAO Cat, removes $BTCAT)
  2. Packs metadata/ as a CAR
  3. Uploads to Pinata
  4. Saves output/cids.json
"""

import os, re, json, subprocess, tempfile, shutil
from pathlib import Path

ROOT        = Path(__file__).parent.parent
ENV_FILE    = ROOT / "contracts" / ".env"
OUT_DIR     = Path(__file__).parent / "output"
METADATA_DIR = OUT_DIR / "metadata"

# ── Batch CIDs from the completed image upload ────────────────────────────────
# Batches 1-10 already pinned, 500 images each (last batch = 199)
BATCH_CIDS = [
    "Qmf4EYsnownBeDzgwksRyTnC89VEbtbH4S8vZWKiH6feSV",  # 1-500
    "QmYnJLQBwDgXT2ANtrUvTaH9fXmPtikS8rWRE2UmN6S4rJ",  # 501-1000
    "QmTok22nDNBiLhXDM9B6WNqcD1qH2ozHv2WQj8bK6wufKr",  # 1001-1500
    "QmQ7iWfbeDgHu5xP52YYKbUhpGXG47dga5pp9dJkMSJwvd",  # 1501-2000
    "QmW1UavZCcRhcB9fGQbyuHzfjRGawQUBiNTUiQf51qZuMH",  # 2001-2500
    "QmRaQqkHieYEu3wrqgz9QTbExCngu8Ap6U5a3172w4sxek",  # 2501-3000
    "QmacGJjVZkTg6UKpaKwWifrw7pyz7ABpq5xqofDQnTisMz",  # 3001-3500
    "QmZAmFF4tZMSoouqYY6WMGhfAepmKn7eFmaY1ejJPLgk6t",  # 3501-4000
    "QmfLEhxctNWmNxTARoQXXFe2mrzDJgxtXiXa6hucbghJ1Q",  # 4001-4500
    "QmYNkJgpqQePsBgLq8dK8xRGVsG5MjUokXsSN6P8yf7GD4",  # 4501-4699
]
BATCH_SIZE = 500


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


import requests

JWT = read_jwt()
HEADERS = {"Authorization": f"Bearer {JWT}"}


def token_id_to_cid(tid: int) -> str:
    batch_index = (tid - 1) // BATCH_SIZE
    if batch_index >= len(BATCH_CIDS):
        batch_index = len(BATCH_CIDS) - 1
    return BATCH_CIDS[batch_index]


def fix_metadata():
    """Patch name, description, and image URL in all metadata files."""
    print(f"Fixing metadata in {METADATA_DIR}...")
    files = sorted(METADATA_DIR.glob("*.json"))
    for jf in files:
        data = json.loads(jf.read_text())
        tid  = int(data.get("tokenId") or jf.stem)
        cid  = token_id_to_cid(tid)

        data["name"]        = f"TAO Cat #{tid}"
        data["description"] = (
            "4,699 generative pixel cats on Bittensor EVM. "
            "The first NFT collection on the TAO ecosystem. "
            "100% of mint fees seed trading liquidity. No team allocation."
        )
        data["image"] = f"ipfs://{cid}/{tid}.png"

        jf.write_text(json.dumps(data, separators=(",", ":")))
    print(f"  Fixed {len(files)} files.")


def pack_car(src_dir: Path, out_car: Path) -> str:
    """Pack a directory as CAR, return root CID."""
    cmd = f'npx --yes ipfs-car pack "{src_dir}" --output "{out_car}" --no-wrap'
    r = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    if r.returncode != 0:
        print(f"  ipfs-car error:\n{r.stderr.strip()[:400]}")
        raise RuntimeError("ipfs-car failed")
    cid = r.stdout.strip().split()[-1]
    mb  = out_car.stat().st_size / 1024 / 1024
    print(f"  CAR: {mb:.1f} MB  CID: {cid}")
    return cid


def upload_car(car_path: Path, pin_name: str) -> str:
    """Upload a CAR file to Pinata. Returns IpfsHash."""
    print(f"  Uploading {car_path.name} ({car_path.stat().st_size//1024} KB)...")
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
        raise RuntimeError("Upload failed")
    return resp.json()["IpfsHash"]


def main():
    if not JWT:
        print("ERROR: PINATA_JWT not found in contracts/.env")
        return

    r = requests.get("https://api.pinata.cloud/data/testAuthentication",
                     headers=HEADERS, timeout=10)
    print(f"Pinata auth: {'OK' if r.status_code == 200 else 'FAILED'}")
    if r.status_code != 200:
        return

    if not METADATA_DIR.exists():
        print(f"ERROR: {METADATA_DIR} not found"); return

    # Step 1: fix metadata text
    fix_metadata()

    # Step 2: copy to temp, pack, upload
    tmp = Path(tempfile.mkdtemp())
    try:
        meta_stage = tmp / "metadata"
        meta_stage.mkdir()
        for jf in METADATA_DIR.glob("*.json"):
            shutil.copy2(jf, meta_stage / jf.name)

        print("\n[Metadata] Packing CAR...")
        meta_car = tmp / "metadata.car"
        pack_car(meta_stage, meta_car)

        print("[Metadata] Uploading...")
        meta_pin = upload_car(meta_car, "TAO-Cats-metadata")
        print(f"  Pinned as: {meta_pin}")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    # Step 3: build file->CID map for cids.json
    file_cid = {}
    for i in range(1, 4700):
        file_cid[f"{i}.png"] = token_id_to_cid(i)

    cids = {
        "image_batches": file_cid,
        "metadata_cid":  meta_pin,
        "base_uri":      f"ipfs://{meta_pin}/",
    }
    (OUT_DIR / "cids.json").write_text(json.dumps(cids, indent=2))

    print("\n" + "="*54)
    print("  UPLOAD COMPLETE")
    print("="*54)
    print(f"  Metadata CID : {meta_pin}")
    print(f"  BASE_URI     : ipfs://{meta_pin}/")
    print(f"\n  To reveal, call on your NFT contract:")
    print(f"  nft.reveal('ipfs://{meta_pin}/')")
    print("="*54)
    print("  Saved: output/cids.json")


if __name__ == "__main__":
    main()
