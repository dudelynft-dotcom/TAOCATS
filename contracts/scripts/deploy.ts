import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

/**
 * TAO Cats — Deployment Script
 * Run:
 *   npx hardhat run scripts/deploy.ts --network subtensorTestnet
 *   npx hardhat run scripts/deploy.ts --network subtensor
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);
  const network    = await ethers.provider.getNetwork();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TAO CATS — Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(balance), "TAO");
  console.log("Chain ID: ", network.chainId.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const LIQUIDITY_RECEIVER = ethers.getAddress(
    process.env.LIQUIDITY_RECEIVER || deployer.address
  );
  const UNREVEALED_URI = process.env.UNREVEALED_URI ?? "ipfs://PLACEHOLDER/unrevealed.json";

  // 1. Token
  console.log("\n[1/4] Deploying BtcatToken...");
  const BtcatToken = await ethers.getContractFactory("BtcatToken");
  const token      = await BtcatToken.deploy();
  await token.waitForDeployment();
  const tokenAddr  = await token.getAddress();
  console.log("      BtcatToken:", tokenAddr);

  // 2. NFT
  console.log("\n[2/4] Deploying BittensorCatNFT (TAO CAT / TCAT)...");
  const NFT    = await ethers.getContractFactory("BittensorCatNFT");
  const nft    = await NFT.deploy(UNREVEALED_URI, LIQUIDITY_RECEIVER);
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("      NFT:", nftAddr);
  console.log("      mintPrice:", ethers.formatEther(await nft.mintPrice()), "TAO");

  // 3. Marketplace
  console.log("\n[3/4] Deploying BittensorCatMarketplace...");
  const Marketplace = await ethers.getContractFactory("BittensorCatMarketplace");
  const marketplace = await Marketplace.deploy(
    ethers.getAddress(nftAddr), LIQUIDITY_RECEIVER
  );
  await marketplace.waitForDeployment();
  const mktAddr = await marketplace.getAddress();
  console.log("      Marketplace:", mktAddr);

  // 4. Rarity
  console.log("\n[4/4] Deploying BittensorCatRarity...");
  const Rarity    = await ethers.getContractFactory("BittensorCatRarity");
  const rarity    = await Rarity.deploy();
  await rarity.waitForDeployment();
  const rarityAddr = await rarity.getAddress();
  console.log("      Rarity:", rarityAddr);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`NFT_ADDRESS=${nftAddr}`);
  console.log(`MARKETPLACE_ADDRESS=${mktAddr}`);
  console.log(`BTCAT_TOKEN_ADDRESS=${tokenAddr}`);
  console.log(`RARITY_ADDRESS=${rarityAddr}`);

  console.log("\n📋 NEXT STEPS:");
  console.log("  1. Copy the addresses above into contracts/.env");
  console.log("  2. Run: npx hardhat run scripts/setup.ts --network subtensorTestnet");
  console.log("  3. Copy NEXT_PUBLIC_ vars into frontend/.env.local and Vercel");
  console.log("  4. After sellout: nft.reveal('ipfs://Qmf4PHejaDT8wXLHSy7YjiBoPd6NW4c4BDpkGAz7SUdZoR/')");
}

main().catch((e) => { console.error(e); process.exit(1); });
