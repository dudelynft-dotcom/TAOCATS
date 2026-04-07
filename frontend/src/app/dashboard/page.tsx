"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useBalance } from "wagmi";
import { formatEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MAX_SUPPLY } from "@/lib/config";
import { NFT_ABI, MARKETPLACE_ABI, RARITY_ABI } from "@/lib/abis";

const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#00c49a", Uncommon: "#a16207", Common: "#475569",
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
    <div style={{ minHeight:"100vh", paddingTop:56, background:"#ffffff", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ maxWidth:400, width:"100%", padding:"0 24px" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#9aa0ae", marginBottom:8 }}>Dashboard</div>
        <h2 style={{ fontSize:22, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"-0.01em", marginBottom:4 }}>Connect Wallet</h2>
        <div style={{ height:1, background:"#e0e3ea", margin:"16px 0 20px" }} />
        <p style={{ color:"#5a6478", fontSize:12, marginBottom:28, lineHeight:1.8, letterSpacing:"0.02em" }}>Connect to view your cats, rarity scores, and portfolio</p>
        <ConnectButton />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", paddingTop:56, background:"#ffffff" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#9aa0ae", marginBottom:6 }}>Dashboard</div>
          <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.01em", color:"#0f1419", textTransform:"uppercase", marginBottom:4 }}>
            My Portfolio
          </h1>
          <p style={{ color:"#9aa0ae", fontFamily:"monospace", fontSize:11, letterSpacing:"0.06em" }}>
            {address?.slice(0,6)}...{address?.slice(-4)}
          </p>
          <div style={{ height:1, background:"#e0e3ea", marginTop:20 }} />
        </div>

        {/* Wallet + Balance row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#e0e3ea", marginBottom:1 }}>
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0 }}
            style={{ padding:"20px 24px", background:"#ffffff" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:6 }}>Wallet Address</div>
            <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:"#0f1419", letterSpacing:"0.04em", wordBreak:"break-all" }}>
              {address}
            </div>
          </motion.div>
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.04 }}
            style={{ padding:"20px 24px", background:"#ffffff" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:6 }}>TAO Balance</div>
            <div style={{ fontFamily:"monospace", fontSize:24, fontWeight:700, color:"#0f1419", letterSpacing:"-0.01em" }}>
              {taoBalance ? `τ ${parseFloat(formatEther(taoBalance.value)).toFixed(4)}` : "-"}
            </div>
            {taoBalance && (
              <div style={{ fontSize:10, color:"#9aa0ae", fontWeight:600, letterSpacing:"0.06em", marginTop:3 }}>
                {taoBalance.symbol} · Bittensor EVM
              </div>
            )}
          </motion.div>
        </div>

        {/* Stats */}
        <div style={{ border:"1px solid #e0e3ea", marginBottom:36, display:"grid", gridTemplateColumns:"repeat(4,1fr)" }} className="dash-stats">
          {[
            { label:"Cats Owned",       value: owned.toString() },
            { label:"Total Minted",     value: `${minted.toLocaleString()}/${MAX_SUPPLY.toLocaleString()}` },
            { label:"Listed on Market", value: listed.toString() },
            { label:"Mint Progress",    value: `${Math.round(progress)}%` },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:0.08 + i*0.06 }}
              style={{ padding:"24px 20px", borderRight: i < 3 ? "1px solid #e0e3ea" : "none" }}>
              <div style={{ fontSize:26, fontWeight:700, color:"#0f1419", letterSpacing:"-0.02em", fontFamily:"monospace", marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Portfolio value */}
        {owned > 0 && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}
            style={{ border:"1px solid #e0e3ea", marginBottom:36, padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4 }}>Estimated Portfolio Value</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span style={{ fontFamily:"monospace", fontSize:32, fontWeight:700, color:"#0f1419", letterSpacing:"-0.02em" }}>
                  {portfolioVal !== null ? `τ ${portfolioVal.toFixed(2)}` : "-"}
                </span>
                {floorPrice && (
                  <span style={{ fontSize:11, color:"#9aa0ae", fontFamily:"monospace" }}>
                    ({owned} cats × τ {parseFloat(formatEther(floorPrice)).toFixed(2)} floor)
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:4 }}>Floor Price</div>
              <div style={{ fontFamily:"monospace", fontSize:20, fontWeight:700, color:"#00c49a" }}>
                {floorPrice ? `τ ${parseFloat(formatEther(floorPrice)).toFixed(2)}` : "No listings"}
              </div>
            </div>
          </motion.div>
        )}

        {/* My Cats */}
        <div style={{ marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#9aa0ae", marginBottom:4 }}>Wallet NFTs</div>
              <h2 style={{ fontSize:16, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.04em" }}>
                My Cats <span style={{ color:"#9aa0ae", fontWeight:400 }}>({owned})</span>
              </h2>
            </div>
            {owned > 0 && (
              <Link href="/marketplace?tab=sell" style={{ fontSize:11, fontWeight:700, color:"#00c49a", letterSpacing:"0.08em", textTransform:"uppercase", textDecoration:"none" }}>
                List for Sale →
              </Link>
            )}
          </div>
          <div style={{ height:1, background:"#e0e3ea", marginBottom:20 }} />

          {owned === 0 ? (
            <div style={{ padding:"56px 24px", textAlign:"center", border:"1px solid #e0e3ea", background:"#f7f8fa" }}>
              <p style={{ fontWeight:700, color:"#0f1419", fontSize:13, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>No Cats Yet</p>
              <p style={{ color:"#9aa0ae", fontSize:12, marginBottom:24, letterSpacing:"0.02em" }}>Mint your first TAO Cat to get started</p>
              <Link href="/mint" className="btn-primary">Mint a Cat</Link>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:6 }}>
              {myTokens?.map((tokenId, i) => {
                const id   = Number(tokenId);
                const tier = rarityBatch?.[2]?.[i] as string | undefined;
                const rank = rarityBatch?.[1]?.[i];
                return (
                  <motion.div key={tokenId.toString()} initial={{ opacity:0, scale:0.96 }}
                    animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.03 }} className="nft-card">
                    <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative" }}>
                      <Image src={id <= 12 ? `/samples/${id}.png` : `/samples/1.png`} alt={`Cat #${id}`}
                        width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      {tier && (
                        <div style={{ position:"absolute", top:5, left:5, padding:"2px 6px", fontSize:8, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", background: TIER_BG[tier] || "#f2f4f7", color: TIER_COLOR[tier] || "#475569" }}>
                          {tier}
                        </div>
                      )}
                    </div>
                    <div style={{ padding:"10px 10px", display:"flex", flexDirection:"column", gap:5 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div style={{ fontWeight:700, fontSize:12, color:"#0f1419", fontFamily:"monospace" }}>#{id}</div>
                        {rank && <div style={{ color:"#9aa0ae", fontSize:9, letterSpacing:"0.04em" }}>Rank #{rank.toString()}</div>}
                      </div>
                      {floorPrice && (
                        <div style={{ fontSize:10, color:"#5a6478", fontFamily:"monospace" }}>
                          ~τ {parseFloat(formatEther(floorPrice)).toFixed(2)}
                        </div>
                      )}
                      <Link href="/marketplace"
                        style={{ display:"block", textAlign:"center", padding:"5px 0", border:"1px solid #e0e3ea", color:"#0f1419", borderRadius:2, fontSize:10, fontWeight:700, textDecoration:"none", letterSpacing:"0.08em", textTransform:"uppercase", background:"#f7f8fa", transition:"all 0.15s" }}>
                        List
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rewards hint */}
        <div style={{ border:"1px solid #e0e3ea" }}>
          <div style={{ padding:"14px 20px", background:"#f7f8fa", borderBottom:"1px solid #e0e3ea", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", color:"#9aa0ae" }}>
            Holder Rewards
          </div>
          <div style={{ padding:"24px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
            <div>
              <p style={{ color:"#5a6478", fontSize:12, maxWidth:560, lineHeight:1.8, letterSpacing:"0.02em" }}>
                TAO Cats holders are positioned early in the TAO ecosystem. No team allocation.
                Marketplace trading volume may reward early participants. Stay tuned.
              </p>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:28, fontWeight:700, color:"#0f1419", fontFamily:"monospace", letterSpacing:"-0.02em" }}>
                {owned}
              </div>
              <div style={{ color:"#9aa0ae", fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>Cats Owned</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
