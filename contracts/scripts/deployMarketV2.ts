/**
 * Deploy TaoCatsMarketV2
 *   npx hardhat run scripts/deployMarketV2.ts --network subtensorTestnet
 *   npx hardhat run scripts/deployMarketV2.ts --network subtensor
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const TREASURY = "0x198c2d42c71e8046f34eca9a0f5c81b9f3db2afb";

async function main() {
  const NFT_ADDRESS = process.env.NFT_ADDRESS ?? "";
  if (!NFT_ADDRESS) { console.error("Set NFT_ADDRESS in contracts/.env"); process.exit(1); }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("NFT:     ", NFT_ADDRESS);
  console.log("Treasury:", TREASURY);

  // Also update liquidityReceiver on NFT contract to treasury
  const nftAbi = ["function setLiquidityReceiver(address) external", "function liquidityReceiver() view returns (address)"];
  const nftContract = new ethers.Contract(NFT_ADDRESS, nftAbi, deployer);
  const currentReceiver = await nftContract.liquidityReceiver();
  console.log("\nCurrent liquidityReceiver:", currentReceiver);
  if (currentReceiver.toLowerCase() !== TREASURY.toLowerCase()) {
    console.log("Updating liquidityReceiver to treasury...");
    const tx = await nftContract.setLiquidityReceiver(TREASURY);
    await tx.wait();
    console.log("Updated:", tx.hash);
  } else {
    console.log("liquidityReceiver already set to treasury");
  }

  // Deploy market
  const Factory = await ethers.getContractFactory("TaoCatsMarketV2");
  const market  = await Factory.deploy(NFT_ADDRESS, TREASURY);
  await market.waitForDeployment();

  const addr = await market.getAddress();
  console.log("\n✅ TaoCatsMarketV2 deployed:", addr);
  console.log("\nUpdate frontend/.env.local:");
  console.log("NEXT_PUBLIC_SIMPLE_MARKET_ADDRESS=" + addr);
}

main().catch(e => { console.error(e); process.exit(1); });
