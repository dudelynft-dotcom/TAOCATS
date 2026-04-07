/**
 * TAO Cats — Post-Deploy Setup
 * Run after deploy.ts to activate mint and set unrevealed URI.
 *
 *   npx hardhat run scripts/setup.ts --network subtensorTestnet
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const NFT_ADDRESS = process.env.NFT_ADDRESS ?? "";

const ABI = [
  "function setMintActive(bool) external",
  "function setUnrevealedURI(string) external",
  "function setMintPrice(uint256) external",
  "function mintActive() view returns (bool)",
  "function mintPrice() view returns (uint256)",
  "function unrevealedURI() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function reveal(string) external",
];

// Unrevealed metadata — points to the single JSON for all tokens pre-reveal
// Update UNREVEALED_URI in contracts/.env after uploading unrevealed.json to IPFS
const UNREVEALED_URI = process.env.UNREVEALED_URI ?? "ipfs://PLACEHOLDER/unrevealed.json";
const MINT_PRICE_TAO = "0.015"; // 0.015 TAO

async function main() {
  if (!NFT_ADDRESS) {
    console.error("Set NFT_ADDRESS in contracts/.env first");
    process.exit(1);
  }

  const [owner] = await ethers.getSigners();
  const nft = new ethers.Contract(NFT_ADDRESS, ABI, owner);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TAO CATS — Post-Deploy Setup");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("NFT:   ", NFT_ADDRESS);
  console.log("Owner: ", owner.address);

  // 1. Set mint price
  const currentPrice = await nft.mintPrice();
  const targetPrice  = ethers.parseEther(MINT_PRICE_TAO);
  if (currentPrice !== targetPrice) {
    console.log(`\n[1] Setting mintPrice to ${MINT_PRICE_TAO} TAO...`);
    const tx = await nft.setMintPrice(targetPrice);
    await tx.wait();
    console.log("    Done:", tx.hash);
  } else {
    console.log(`\n[1] mintPrice already ${MINT_PRICE_TAO} TAO`);
  }

  // 2. Set unrevealed URI
  const currentURI = await nft.unrevealedURI();
  if (currentURI !== UNREVEALED_URI) {
    console.log("\n[2] Setting unrevealedURI...");
    const tx = await nft.setUnrevealedURI(UNREVEALED_URI);
    await tx.wait();
    console.log("    Done:", UNREVEALED_URI);
  } else {
    console.log("\n[2] unrevealedURI already set");
  }

  // 3. Activate mint
  const active = await nft.mintActive();
  if (!active) {
    console.log("\n[3] Activating mint...");
    const tx = await nft.setMintActive(true);
    await tx.wait();
    console.log("    Done:", tx.hash);
  } else {
    console.log("\n[3] Mint already active");
  }

  // Summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  STATUS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("mintActive:    ", await nft.mintActive());
  console.log("mintPrice:     ", ethers.formatEther(await nft.mintPrice()), "TAO");
  console.log("unrevealedURI: ", await nft.unrevealedURI());
  console.log("totalSupply:   ", (await nft.totalSupply()).toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\nMint is LIVE. Update frontend .env.local and Vercel env vars.");
}

main().catch((e) => { console.error(e); process.exit(1); });
