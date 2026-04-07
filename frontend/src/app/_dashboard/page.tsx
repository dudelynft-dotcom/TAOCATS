"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MAX_SUPPLY, COLLECTION_NAME } from "@/lib/config";
import { NFT_ABI, MARKETPLACE_ABI, RARITY_ABI } from "@/lib/abis";

const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#0a7a5a", Uncommon: "#a16207", Common: "#475569",
};
const TIER_BG: Record<string, string> = {
  Legendary: "#ede9fe", Epic: "#dbeafe", Rare: "#d4f5e9", Uncommon: "#fef3c7", Common: "#f1f5f9",
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const { data: taoBalance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  const { data: myTokens } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "tokensOfOwner",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply",
  });
  const { data: listingPage } = useReadContract({
    address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI,
    functionName: "getActiveListingsPage", args: [BigInt(0), BigInt(200)],
  });
  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY, abi: RARITY_ABI, functionName: "rarityBatch",
    args: myTokens ? [myTokens] : undefined, query: { enabled: !!myTokens?.length },
  });

  const owned    = myTokens?.length ?? 0;
  const minted   = totalSupply ? Number(totalSupply) : 0;
  const progress = (minted / MAX_SUPPLY) * 100;

  // Floor price from active listings
  const tokenIds    = listingPage?.[0] ?? [];
  const listingData = listingPage?.[1] ?? [];
  const activePrices: bigint[] = [];
  tokenIds.forEach((_, i) => {
    const l = listingData[i];
    if (l?.active) activePrices.push(l.price);
  });
  const floorPrice   = activePrices.length > 0 ? activePrices.reduce((m, p) => p < m ? p : m, activePrices[0]) : null;
  const listed       = activePrices.length;
  const portfolioVal = floorPrice && owned > 0 ? parseFloat(formatEther(floorPrice)) * owned : null;

  if (!isConnected) return (
    <div style={{ minHeight:"100vh", paddingTop:64, background:"#ffffff", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ maxWidth:400, width:"100%", padding:"0 24px", textAlign:"center" }}>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:16 }}>Connect Wallet</h2>
        <p style={{ color:"#5a6478", fontSize:12, marginBottom:32 }}>Connect to view your {COLLECTION_NAME} portfolio.</p>
        <ConnectButton />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", paddingTop:64, background:"#ffffff" }}>
      <div className="container-app" style={{ padding:"40px 20px" }}>

        <div style={{ marginBottom:32 }}>
          <h1 style={{ fontSize:28, fontWeight:700, marginBottom:4 }}>Dashboard</h1>
          <p style={{ color:"#9aa0ae", fontFamily:"monospace", fontSize:11 }}>{address}</p>
        </div>

        {/* Stats Grid */}
        <div className="responsive-grid grid-cols-4" style={{ gap:1, background: "#e0e3ea", border: "1px solid #e0e3ea", marginBottom:40 }}>
          {[
            { label:"Cats Owned", value: owned.toString() },
            { label:"Total Minted", value: `${minted.toLocaleString()}/${MAX_SUPPLY.toLocaleString()}` },
            { label:"Listed Inventory", value: listed.toString() },
            { label:"Balance", value: taoBalance ? `τ ${parseFloat(formatEther(taoBalance.value)).toFixed(2)}` : "-" },
          ].map(s => (
            <div key={s.label} style={{ padding:24, background:"#fff" }}>
              <div style={{ fontSize:22, fontWeight:700, fontFamily:"monospace" }}>{s.value}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Portfolio Value */}
        {owned > 0 && (
          <div style={{ border:"1px solid #e0e3ea", padding:24, marginBottom:40, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", marginBottom:4 }}>Portfolio Value Estimate</div>
              <div style={{ fontSize:32, fontWeight:700, fontFamily:"monospace" }}>
                {portfolioVal !== null ? `τ ${portfolioVal.toFixed(2)}` : "-"}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", marginBottom:4 }}>Floor Price</div>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:"#00c49a" }}>
                {floorPrice ? `τ ${parseFloat(formatEther(floorPrice)).toFixed(2)}` : "No Listing"}
              </div>
            </div>
          </div>
        )}

        {/* Inventory */}
        <div style={{ marginBottom:40 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
            <h2 style={{ fontSize:18, fontWeight:700 }}>My Collection ({owned})</h2>
            <Link href="/marketplace?tab=sell" style={{ fontSize:11, fontWeight:700, color:"#0f1419", textDecoration:"none", borderBottom:"2px solid #0f1419" }}>List Items →</Link>
          </div>

          {owned === 0 ? (
            <div style={{ padding:60, textAlign:"center", border:"1px solid #e0e3ea", background:"#f7f8fa" }}>
              <p style={{ marginBottom:24, color:"#9aa0ae" }}>No cats found in this wallet.</p>
              <Link href="/mint" className="btn-primary" style={{ padding:"12px 32px", textDecoration:"none", display:"inline-block" }}>Mint Now</Link>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))", gap:4 }}>
              {myTokens?.map((tokenId, i) => {
                const id = Number(tokenId);
                const tier = rarityBatch?.[2]?.[i] as string | undefined;
                return (
                  <div key={tokenId.toString()} style={{ border:"1px solid #e0e3ea" }}>
                    <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative" }}>
                      <Image src={`/samples/${id % 12 + 1}.png`} alt="" width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      {tier && (
                        <div style={{ position:"absolute", top:5, left:5, padding:"2px 6px", fontSize:8, fontWeight:700, background: TIER_BG[tier], color: TIER_COLOR[tier] }}>
                          {tier}
                        </div>
                      )}
                    </div>
                    <div style={{ padding:10, borderTop:"1px solid #e0e3ea" }}>
                      <div style={{ fontWeight:700, fontSize:12 }}>#{id}</div>
                      <Link href="/marketplace?tab=sell" style={{ display:"block", textAlign:"center", marginTop:10, padding:"6px", border:"1px solid #0f1419", fontSize:9, fontWeight:700, textDecoration:"none", color:"#0f1419" }}>LIST</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
