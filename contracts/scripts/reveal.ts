/**
 * TAO Cats — Reveal Art (call AFTER sellout)
 *   npx hardhat run scripts/reveal.ts --network subtensorTestnet
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const NFT_ADDRESS = process.env.NFT_ADDRESS ?? "";
const BASE_URI    = process.env.BASE_URI ?? "";

async function main() {
  if (!NFT_ADDRESS) { console.error("Set NFT_ADDRESS in contracts/.env"); process.exit(1); }
  if (!BASE_URI)    { console.error("Set BASE_URI in contracts/.env");    process.exit(1); }

  const [owner] = await ethers.getSigners();
  const nft = new ethers.Contract(NFT_ADDRESS, [
    "function reveal(string) external",
    "function revealed() view returns (bool)",
    "function totalSupply() view returns (uint256)",
    "function MAX_SUPPLY() view returns (uint256)",
  ], owner);

  const supply = await nft.totalSupply();
  const max    = await nft.MAX_SUPPLY();
  console.log(`Supply: ${supply}/${max}`);
  if (supply < max) {
    console.log("WARNING: Collection not fully minted yet. Reveal anyway? Edit script to override.");
    process.exit(1);
  }

  console.log("Revealing with BASE_URI:", BASE_URI);
  const tx = await nft.reveal(BASE_URI);
  await tx.wait();
  console.log("Revealed! tx:", tx.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
