"use client";
import { useReadContract } from "wagmi";
import { CONTRACTS, MAX_SUPPLY, MINT_PRICE } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

export default function MintProgress() {
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.NFT,
    abi: NFT_ABI,
    functionName: "totalSupply",
  });

  const minted   = totalSupply ? Number(totalSupply) : 0;
  const progress = (minted / MAX_SUPPLY) * 100;

  return (
    <div style={{ maxWidth: 400 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
        <span>{minted.toLocaleString()} / {MAX_SUPPLY.toLocaleString()} minted</span>
        <span style={{ color:"#0f1419" }}>{Math.round(progress)}%</span>
      </div>
      <div style={{ height:4, background:"#e0e3ea" }}>
        <div style={{ width:`${progress}%`, height:"100%", background:"#0f1419", transition:"width 0.6s" }} />
      </div>
    </div>
  );
}
