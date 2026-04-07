"""
Pinata IPFS uploader for BITTENSOR CAT — streaming large folder upload.
Reads JWT from contracts/.env automatically.
"""

import os, sys, json, re
from pathlib import Path

ROOT      = Path(__file__).parent.parent
ENV_FILE  = ROOT / "contracts" / ".env"
OUT_DIR   = Path(__file__).parent / "output"

# ── Read JWT from contracts/.env ──────────────────────────────────────────────
def read_jwt() -> str:
    jwt = os.environ.get("PINATA_JWT", "")
    if jwt:
        return jwt
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            m = re.match(r"^(?:PINATA_)?JWT\s*[:=]\s*(.+)", line.strip())
            if m:
                return m.group(1).strip()
    return ""

PINATA_JWT = read_jwt()

import requests

HEADERS = {"Authorization": f"Bearer {PINATA_JWT}"}


def upload_folder(folder: Path, pin_name: str) -> str:
    """Stream-upload a folder to Pinata and return its CID."""
    paths = sorted(p for p in folder.iterdir() if p.is_file())
    total = len(paths)
    print(f"\n  Uploading {total} files ({_human(sum(p.stat().st_size for p in paths))}) ...")

    # Build multipart lazily — requests streams each file as it sends
    files = [
        ("file", (f"{pin_name}/{p.name}", open(p, "rb"), _mime(p.suffix)))
        for p in paths
    ]
    try:
        resp = requests.post(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            headers=HEADERS,
            files=files,
            data={
                "pinataOptions":  json.dumps({"cidVersion": 1, "wrapWithDirectory": True}),
                "pinataMetadata": json.dumps({"name": pin_name}),
            },
            timeout=7200,   # 2-hour cap — plenty for 1 GB on a slow link
        )
    finally:
        for _, (_, fh, _) in files:
            fh.close()

    if resp.status_code != 200:
        print(f"  ERROR {resp.status_code}: {resp.text[:400]}")
        sys.exit(1)

    cid = resp.json()["IpfsHash"]
    print(f"  CID: {cid}")
    return cid


def _human(n: int) -> str:
    for unit in ("B","KB","MB","GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"

def _mime(ext: str) -> str:
    return {"png":"image/png","jpg":"image/jpeg","json":"application/json"}.get(
        ext.lstrip(".").lower(), "application/octet-stream")


def main():
    if not PINATA_JWT:
        print("ERROR: JWT not found in contracts/.env")
        sys.exit(1)

    # Auth check
    r = requests.get("https://api.pinata.cloud/data/testAuthentication",
                     headers=HEADERS, timeout=15)
    if r.status_code != 200:
        print(f"ERROR: Pinata auth failed — {r.text}")
        sys.exit(1)
    print("Pinata auth OK")

    images_dir   = OUT_DIR / "images"
    metadata_dir = OUT_DIR / "metadata"

    for d in (images_dir, metadata_dir):
        if not d.exists():
            print(f"ERROR: {d} not found — run generate.py first")
            sys.exit(1)

    # 1 — upload images
    print("\n[1/3] Uploading images...")
    img_cid = upload_folder(images_dir, "BTCAT-images")

    # 2 — patch metadata with real image IPFS links
    print("\n[2/3] Patching metadata with image CID...")
    for jf in sorted(metadata_dir.glob("*.json")):
        data = json.loads(jf.read_text())
        tid  = data.get("tokenId") or jf.stem
        data["image"] = f"ipfs://{img_cid}/BTCAT-images/{tid}.png"
        jf.write_text(json.dumps(data, separators=(",", ":")))
    print(f"  Patched {len(list(metadata_dir.glob('*.json')))} files")

    # 3 — upload metadata
    print("\n[3/3] Uploading metadata...")
    meta_cid = upload_folder(metadata_dir, "BTCAT-metadata")

    # Save results
    cids = {
        "images_cid":   img_cid,
        "metadata_cid": meta_cid,
        "base_uri":     f"ipfs://{meta_cid}/BTCAT-metadata/",
    }
    (OUT_DIR / "cids.json").write_text(json.dumps(cids, indent=2))

    print("\n" + "━"*54)
    print("  UPLOAD COMPLETE")
    print("━"*54)
    print(f"  Images CID:   {img_cid}")
    print(f"  Metadata CID: {meta_cid}")
    print(f"  BASE_URI:     ipfs://{meta_cid}/BTCAT-metadata/")
    print(f"\n  After deploy, call:")
    print(f"  nft.reveal('ipfs://{meta_cid}/BTCAT-metadata/')")
    print("━"*54)
    print("  Saved to art-generator/output/cids.json")


if __name__ == "__main__":
    main()
