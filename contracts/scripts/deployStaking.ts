import hre from "hardhat";

async function main() {
  const NFT_ADDRESS    = process.env.NFT_ADDRESS    ?? "";
  const BITCAT_ADDRESS = process.env.BITCAT_ADDRESS ?? "";
  const RARITY_ADDRESS = process.env.RARITY_ADDRESS ?? "";

  if (!NFT_ADDRESS || !BITCAT_ADDRESS || !RARITY_ADDRESS) {
    throw new Error("Set NFT_ADDRESS, BITCAT_ADDRESS, RARITY_ADDRESS in env");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying BitcatStaking with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("BitcatStaking");
  const staking = await Factory.deploy(NFT_ADDRESS, BITCAT_ADDRESS, RARITY_ADDRESS);
  await staking.waitForDeployment();

  const addr = await staking.getAddress();
  console.log("BitcatStaking deployed to:", addr);

  // Fund the staking contract with S1 allocation (1,725,000,000 BITCAT)
  console.log("\nFunding staking contract with S1 allocation...");
  const token = await hre.ethers.getContractAt("BitcatToken", BITCAT_ADDRESS);
  const tx = await token.fundStaking(addr);
  await tx.wait();
  console.log("Funded. Staking contract balance:", hre.ethers.formatEther(
    await (await hre.ethers.getContractAt("BitcatToken", BITCAT_ADDRESS)).balanceOf(addr)
  ), "BITCAT");

  console.log("\nSeason start:", new Date().toISOString());
  console.log("Season end  :", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
  console.log("\nAdd to .env:");
  console.log(`NEXT_PUBLIC_STAKING_ADDRESS=${addr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
