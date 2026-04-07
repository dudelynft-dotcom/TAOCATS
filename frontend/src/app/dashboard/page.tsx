"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MAX_SUPPLY, COLLECTION_NAME } from "@/lib/config";
import { NFT_ABI, MARKETPLACE_ABI, RARITY_ABI } from "@/lib/abis";

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
  const portfolioVal = floorPrice && owned > 0 ? parseFloat(formatEther(floorPrice)) * owned : null;

  if (!isConnected) return (
    <div style={{ minHeight:"100vh", paddingTop:64, background:"#ffffff", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="pixel-border" style={{ maxWidth:440, width:"100%", padding:48, textAlign:"center", background:"#f7f8fa" }}>
        <h2 style={{ fontSize:24, marginBottom:16 }}>Connect Wallet</h2>
        <p style={{ color:"#5a6478", fontSize:13, marginBottom:32 }}>View your {COLLECTION_NAME} collection, rarity metrics, and estimated portfolio value.</p>
        <ConnectButton />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", paddingTop:64, background:"#ffffff" }}>
      <div className="container-app" style={{ padding:"64px 20px" }}>

        {/* Header Section */}
        <div style={{ marginBottom:48 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:20 }}>
            <div>
              <h1 style={{ fontSize:32, marginBottom:8 }}>Dashboard</h1>
              <div className="tag-outline" style={{ fontFamily:"monospace" }}>{address?.slice(0,14)}...</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div className="section-label">Balance</div>
              <div style={{ fontSize:24, fontWeight:800 }}>{taoBalance ? `τ ${parseFloat(formatEther(taoBalance.value)).toFixed(4)}` : "-"}</div>
            </div>
          </div>
          <div style={{ height:4, background:"#0f1419", marginTop:32 }} />
        </div>

        {/* Top Stats */}
        <div className="responsive-grid grid-cols-4" style={{ marginBottom:48 }}>
          {[
            { l:"Owned", v:owned },
            { l:"Floor Price", v: floorPrice ? `τ ${parseFloat(formatEther(floorPrice)).toFixed(2)}` : "None" },
            { l:"Portfolio Est.", v: portfolioVal ? `τ ${portfolioVal.toFixed(2)}` : "-" },
            { l:"Mint Progress", v: `${Math.round(progress)}%` },
          ].map(s => (
            <div key={s.l} className="pixel-border" style={{ padding:24, background:"#fff" }}>
              <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{s.v}</div>
              <div className="section-label">{s.l}</div>
            </div>
          ))}
        </div>

        {/* My Collection */}
        <div style={{ marginBottom:64 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
            <h2 style={{ fontSize:20 }}>Your Collection ({owned})</h2>
            <Link href="/marketplace?tab=sell" className="btn-outline" style={{ padding:"8px 16px" }}>Sell Items</Link>
          </div>

          {owned === 0 ? (
            <div className="pixel-border" style={{ padding:64, textAlign:"center", background:"#f7f8fa" }}>
              <p style={{ marginBottom:24, color:"#9aa0ae" }}>You don't own any cats yet.</p>
              <Link href="/mint" className="btn-primary">MINT A CAT</Link>
            </div>
          ) : (
            <div className="responsive-grid grid-cols-4">
              {myTokens?.map((tokenId, i) => {
                const id   = Number(tokenId);
                const tier = rarityBatch?.[2]?.[i] as string | undefined;
                return (
                  <motion.div key={tokenId.toString()} 
                    initial={{ opacity:0, scale:0.95 }}
                    animate={{ opacity:1, scale:1 }}
                    transition={{ delay: i * 0.05 }}
                    className="pixel-border brutal-shadow-hover">
                    <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative" }}>
                      <Image src={`/samples/${id % 12 + 1}.png`} alt="" width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      {tier && <div className="tag-dark" style={{ position:"absolute", top:8, left:8, fontSize:8 }}>{tier}</div>}
                    </div>
                    <div style={{ padding:16, borderTop:"2px solid #0f1419" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <span style={{ fontWeight:800 }}>#{id}</span>
                        <span style={{ fontSize:10, color:"#9aa0ae" }}>RANK {rarityBatch?.[1]?.[i]?.toString() ?? "?"}</span>
                      </div>
                      <Link href="/marketplace?tab=sell" className="btn-outline" style={{ width:"100%", padding:"6px", fontSize:10 }}>LIST FOR SALE</Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Holder Benefits */}
        <div className="pixel-border" style={{ padding:32, background:"#0f1419", color:"#fff" }}>
          <h2 style={{ color:"#fff", fontSize:20, marginBottom:16 }}>Early Adopter Status</h2>
          <p style={{ color:"#9aa0ae", fontSize:13, lineHeight:1.8, maxWidth:600 }}>
            As a holder of {COLLECTION_NAME}, you are part of the genesis NFT movement on Bittensor. 
            All marketplace fees are redistributed to ecosystem development. Reveal of full art and rarity 
            metadata occurs after the collection sellout.
          </p>
        </div>

      </div>
    </div>
  );
}
