import { ethers } from "hardhat";

/**
 * BITTENSOR CAT — Deployment Script
 * Target: Bittensor EVM (Subtensor) | Chain ID 964
 * RPC: https://lite.chain.opentensor.ai
 *
 * Run:
 *   npx hardhat run scripts/deploy.ts --network subtensorTestnet  (testnet first)
 *   npx hardhat run scripts/deploy.ts --network subtensor          (mainnet)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const balance    = await ethers.provider.getBalance(deployer.address);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  BITTENSOR CAT — Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Deployer:  ", deployer.address);
  console.log("Balance:   ", ethers.formatEther(balance), "TAO");
  console.log("Network:   ", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:  ", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Liquidity receiver — set to your DEX liquidity pool or multisig
  // BEFORE launching: replace this with the real $BTCAT/TAO pool address
  // ethers.getAddress() forces a checksummed hex string, bypassing Hardhat ENS resolution
  const LIQUIDITY_RECEIVER = ethers.getAddress(process.env.LIQUIDITY_RECEIVER || deployer.address);
  const UNREVEALED_URI     = process.env.UNREVEALED_URI ?? "ipfs://PLACEHOLDER/unrevealed.json";

  // ── 1. Deploy $BTCAT Token ────────────────────────────────────────────────
  console.log("\n[1/4] Deploying BtcatToken ($BTCAT)...");
  const BtcatToken = await ethers.getContractFactory("BtcatToken");
  const btcatToken = await BtcatToken.deploy();
  await btcatToken.waitForDeployment();
  const btcatAddr  = await btcatToken.getAddress();
  console.log("      ✓ $BTCAT Token:", btcatAddr);

  // ── 2. Deploy NFT ────────────────────────────────────────────────────────
  console.log("\n[2/4] Deploying BittensorCatNFT...");
  const BittensorCatNFT = await ethers.getContractFactory("BittensorCatNFT");
  const nft        = await BittensorCatNFT.deploy(UNREVEALED_URI, LIQUIDITY_RECEIVER);
  await nft.waitForDeployment();
  const nftAddr    = await nft.getAddress();
  console.log("      ✓ BittensorCatNFT:", nftAddr);

  // ── 3. Deploy Marketplace ────────────────────────────────────────────────
  console.log("\n[3/4] Deploying BittensorCatMarketplace...");
  const BittensorCatMarketplace = await ethers.getContractFactory("BittensorCatMarketplace");
  const marketplace     = await BittensorCatMarketplace.deploy(ethers.getAddress(nftAddr), LIQUIDITY_RECEIVER);
  await marketplace.waitForDeployment();
  const mktAddr         = await marketplace.getAddress();
  console.log("      ✓ BittensorCatMarketplace:", mktAddr);

  // ── 4. Deploy On-chain Rarity Registry ───────────────────────────────────
  console.log("\n[4/4] Deploying BittensorCatRarity (on-chain rarity registry)...");
  const BittensorCatRarity = await ethers.getContractFactory("BittensorCatRarity");
  const rarity        = await BittensorCatRarity.deploy();
  await rarity.waitForDeployment();
  const rarityAddr    = await rarity.getAddress();
  console.log("      ✓ BittensorCatRarity:", rarityAddr);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("$BTCAT Token:       ", btcatAddr);
  console.log("BITTENSOR CAT NFT:      ", nftAddr);
  console.log("Bittensor Cat Marketplace:  ", mktAddr);
  console.log("Rarity Registry:   ", rarityAddr);
  console.log("Liquidity Receiver:", LIQUIDITY_RECEIVER);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n📋 NEXT STEPS:");
  console.log("  1. Add these to frontend/.env.local:");
  console.log(`     NEXT_PUBLIC_NFT_ADDRESS=${nftAddr}`);
  console.log(`     NEXT_PUBLIC_MARKETPLACE_ADDRESS=${mktAddr}`);
  console.log(`     NEXT_PUBLIC_BTCAT_TOKEN_ADDRESS=${btcatAddr}`);
  console.log(`     NEXT_PUBLIC_RARITY_ADDRESS=${rarityAddr}`);
  console.log("  2. Generate 4699 cats: cd art-generator && python generate.py");
  console.log("  3. Upload output/images/ to Pinata → get images CID");
  console.log("  4. Upload output/metadata/ to Pinata → get metadata CID");
  console.log("  5. Call nft.setMintActive(true) to open mint");
  console.log("  6. After sellout: nft.reveal('ipfs://METADATA_CID/')");
  console.log("  7. Use output/rarity.json to call rarity.setRarity() in batches");
  console.log("  8. Call rarity.lockRarity() — immutable forever after");
  console.log("  9. Seed $BTCAT/TAO liquidity pool with the ~32,860 TAO raised");
  console.log(" 10. Deploy distributor + call btcatToken.setDistributor(addr)");
  console.log(" 11. Airdrop $BTCAT proportionally to all 4699 NFT holders");

  console.log("\n💡 TOKENOMICS RECAP:");
  console.log("  4699 NFTs × 6.99 TAO = ~32,860 TAO → $BTCAT liquidity");
  console.log("  $BTCAT supply: 4,699,000,000 (1M per NFT)");
  console.log("  Team tokens: 0%  |  Whitelist: none");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
