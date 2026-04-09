import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying BitcatToken with:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("BitcatToken");
  const token = await Factory.deploy();
  await token.waitForDeployment();

  const addr = await token.getAddress();
  console.log("BitcatToken deployed to:", addr);
  console.log("Total supply:", hre.ethers.formatEther(await token.totalSupply()), "BITCAT");
  console.log("\nAdd to .env:");
  console.log(`NEXT_PUBLIC_BITCAT_TOKEN_ADDRESS=${addr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
