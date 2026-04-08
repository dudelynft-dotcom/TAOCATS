/**
 * Deploy / redeploy BittensorCatNFT (0.01 TAO mint price)
 *
 * Usage:
 *   npx hardhat run scripts/deployNFT.ts --network subtensorTestnet
 *   npx hardhat run scripts/deployNFT.ts --network subtensor
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const UNREVEALED_URI = process.env.UNREVEALED_URI ?? "ipfs://QmPlaceholder/unrevealed.json";
const LIQUIDITY_RECEIVER = process.env.LIQUIDITY_RECEIVER;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const receiver = LIQUIDITY_RECEIVER ?? deployer.address;
  console.log("Liquidity receiver:", receiver);

  const NFT = await ethers.getContractFactory("BittensorCatNFT");
  const nft = await NFT.deploy(UNREVEALED_URI, receiver);
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log("BittensorCatNFT deployed:", address);

  // Activate mint immediately
  console.log("Activating mint...");
  const tx = await (nft as any).setMintActive(true);
  await tx.wait();
  console.log("Mint active: true");

  // Confirm price
  const price = await (nft as any).mintPrice();
  console.log("Mint price:", ethers.formatEther(price), "TAO");

  console.log("\n=== UPDATE THESE ENV VARS ===");
  console.log(`NEXT_PUBLIC_NFT_ADDRESS=${address}`);
  console.log("contracts/.env → NFT_ADDRESS=" + address);
}

main().catch(e => { console.error(e); process.exit(1); });
