/**
 * Quick-activate: just flips mintActive=true on the deployed NFT.
 * Use setup.ts for full post-deploy configuration.
 *   npx hardhat run scripts/activate.ts --network subtensorTestnet
 */
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const NFT_ADDRESS = process.env.NFT_ADDRESS ?? "0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9";

const ABI = [
  "function setMintActive(bool) external",
  "function mintActive() view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function mintPrice() view returns (uint256)",
];

async function main() {
  const [owner] = await ethers.getSigners();
  const nft = new ethers.Contract(NFT_ADDRESS, ABI, owner);

  console.log("mintActive before:", await nft.mintActive());
  console.log("mintPrice:        ", ethers.formatEther(await nft.mintPrice()), "TAO");
  console.log("totalSupply:      ", (await nft.totalSupply()).toString());

  const active = await nft.mintActive();
  if (!active) {
    const tx = await nft.setMintActive(true);
    await tx.wait();
    console.log("setMintActive(true):", tx.hash);
  }

  console.log("mintActive after: ", await nft.mintActive());
}

main().catch(console.error);
