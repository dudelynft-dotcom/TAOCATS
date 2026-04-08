/**
 * Deploy TaoCatsMarket — simple single-collection marketplace
 *
 *   npx hardhat run scripts/deployMarket.ts --network subtensorTestnet
 *   npx hardhat run scripts/deployMarket.ts --network subtensor
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const NFT_ADDRESS = process.env.NFT_ADDRESS ?? "";
  if (!NFT_ADDRESS) {
    console.error("Set NFT_ADDRESS in contracts/.env");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("NFT:     ", NFT_ADDRESS);

  const Factory = await ethers.getContractFactory("TaoCatsMarket");
  const market  = await Factory.deploy(NFT_ADDRESS, deployer.address);
  await market.waitForDeployment();

  const addr = await market.getAddress();
  console.log("\n✅ TaoCatsMarket deployed:", addr);
  console.log("\nAdd to frontend/.env.local:");
  console.log("NEXT_PUBLIC_SIMPLE_MARKET_ADDRESS=" + addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
