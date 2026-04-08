/**
 * Deploy TaoMarketplace.sol (universal multi-collection marketplace)
 *
 * Usage:
 *   npx hardhat run scripts/deployMarketplace.ts --network subtensorTestnet
 *   npx hardhat run scripts/deployMarketplace.ts --network subtensor
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Fee receiver = deployer by default, update via setFeeReceiver after deploy
  const feeReceiver = process.env.FEE_RECEIVER ?? deployer.address;

  console.log("Deploying TaoMarketplace...");
  const Marketplace = await ethers.getContractFactory("TaoMarketplace");
  const marketplace = await Marketplace.deploy(feeReceiver);
  await marketplace.waitForDeployment();

  const address = await marketplace.getAddress();
  console.log("TaoMarketplace deployed:", address);

  // Pre-register and verify TAO Cats collection if address is set
  const taoCats = process.env.NFT_ADDRESS;
  if (taoCats) {
    console.log("Setting TAO Cats as verified collection...");
    const tx = await (marketplace as any).setVerified(taoCats, true);
    await tx.wait();
    console.log("TAO Cats verified.");
  }

  console.log("\n=== UPDATE THESE ENV VARS ===");
  console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${address}`);
  console.log("Vercel: Settings → Environment Variables");
}

main().catch(e => { console.error(e); process.exit(1); });
