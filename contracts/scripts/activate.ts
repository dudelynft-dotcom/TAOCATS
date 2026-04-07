import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

const NFT_ADDRESS = "0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9";

const ABI = [
  "function setMintActive(bool) external",
  "function mintActive() view returns (bool)",
  "function totalSupply() view returns (uint256)",
  "function MINT_PRICE() view returns (uint256)",
];

async function main() {
  const [owner] = await ethers.getSigners();
  const nft = new ethers.Contract(NFT_ADDRESS, ABI, owner);

  const before = await nft.mintActive();
  console.log("mintActive before:", before);

  if (!before) {
    const tx = await nft.setMintActive(true);
    await tx.wait();
    console.log("setMintActive(true) tx:", tx.hash);
  }

  console.log("mintActive after: ", await nft.mintActive());
  console.log("totalSupply:      ", (await nft.totalSupply()).toString());
  console.log("MINT_PRICE:       ", ethers.formatEther(await nft.MINT_PRICE()), "TAO");
}

main().catch(console.error);
