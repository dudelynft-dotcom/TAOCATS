/**
 * Deploy BittensorCatRarity
 *   npx hardhat run scripts/deployRarity.ts --network subtensorTestnet
 *   npx hardhat run scripts/deployRarity.ts --network subtensor
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("BittensorCatRarity");
  const rarity  = await Factory.deploy();
  await rarity.waitForDeployment();

  const addr = await rarity.getAddress();
  console.log("\n✅ BittensorCatRarity deployed:", addr);
  console.log("\nUpdate frontend/.env.local:");
  console.log("NEXT_PUBLIC_RARITY_ADDRESS=" + addr);
}

main().catch(e => { console.error(e); process.exit(1); });
