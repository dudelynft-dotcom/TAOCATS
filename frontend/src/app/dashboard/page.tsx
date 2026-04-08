"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useBalance } from "wagmi";
import { formatEther, parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS } from "@/lib/config";
import { NFT_ABI, MARKETPLACE_ABI, RARITY_ABI } from "@/lib/abis";

const TIER_COLOR: Record<string, { text: string; bg: string }> = {
  Legendary: { text: "#7c3aed", bg: "#ede9fe" },
  Epic:      { text: "#1d4ed8", bg: "#dbeafe" },
  Rare:      { text: "#059669", bg: "#d4f5e9" },
  Uncommon:  { text: "#a16207", bg: "#fef3c7" },
  Common:    { text: "#475569", bg: "#f1f5f9" },
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<"owned"|"listed"|"offers">("owned");
  const [sellId, setSellId]       = useState("");
  const [sellPrice, setSellPrice] = useState("");

  const { data: balData } = useBalance({ address, query: { enabled: !!address } });

  const { data: ownedTokens } = useReadContract({
    address: CONTRACTS.NFT as `0x${string}`, abi: NFT_ABI, functionName: "tokensOfOwner",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.NFT as `0x${string}`, abi: NFT_ABI, functionName: "totalSupply",
  });

  const { data: collectionInfo } = useReadContract({
    address: CONTRACTS.MARKETPLACE as `0x${string}`, abi: MARKETPLACE_ABI, functionName: "collections",
    args: [CONTRACTS.NFT as `0x${string}`],
    query: { enabled: !!CONTRACTS.MARKETPLACE && !!CONTRACTS.NFT },
  });

  const colInfo  = collectionInfo as [boolean,boolean,bigint,bigint,bigint] | undefined;
  const floorWei = colInfo?.[4] ?? BigInt(0);
  const floorTao = parseFloat(formatEther(floorWei));
  const tokenIds = (ownedTokens ?? []) as bigint[];

  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY as `0x${string}`, abi: RARITY_ABI, functionName: "rarityBatch",
    args: tokenIds.length > 0 ? [tokenIds] : undefined,
    query: { enabled: tokenIds.length > 0 && !!CONTRACTS.RARITY },
  });

  const { writeContract, isPending } = useWriteContract();

  const balance      = balData ? parseFloat(formatEther(balData.value)) : 0;
  const ownedCount   = tokenIds.length;
  const portfolioTao = floorTao * ownedCount;

  function handleList() {
    if (!sellId || !sellPrice) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({ address: CONTRACTS.MARKETPLACE as `0x${string}`, abi: MARKETPLACE_ABI as any,
      functionName: "list",
      args: [CONTRACTS.NFT as `0x${string}`, BigInt(sellId), parseEther(sellPrice)] });
  }

  if (!isConnected) {
    return (
      <div style={{ background:"#fff", minHeight:"100vh", paddingTop:80, display:"flex",
        alignItems:"center", justifyContent:"center" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.12em",
            textTransform:"uppercase", marginBottom:20 }}>
            Connect wallet to view dashboard
          </div>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:"#fff", minHeight:"100vh", paddingTop:80, paddingBottom:80 }}>
      <div className="container-app">

        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase",
            letterSpacing:"0.14em", marginBottom:8 }}>Dashboard</div>
          <h1 style={{ fontSize:"clamp(20px,4vw,32px)", fontWeight:800, color:"#0f1419",
            textTransform:"uppercase", letterSpacing:"-0.02em" }}>My Portfolio</h1>
          <div style={{ fontSize:10, fontFamily:"monospace", color:"#5a6478", marginTop:6 }}>
            {address?.slice(0,6)}...{address?.slice(-4)}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",
          gap:1, background:"#e0e3ea", marginBottom:40 }}>
          {[
            { l:"TAO Balance",      v:`τ ${balance.toFixed(4)}` },
            { l:"Cats Owned",       v:ownedCount.toString() },
            { l:"Portfolio Value",  v:`τ ${portfolioTao.toFixed(4)}` },
            { l:"Collection Floor", v: floorTao > 0 ? `τ ${floorTao.toFixed(3)}` : "—" },
            { l:"Total Minted",     v: totalSupply ? Number(totalSupply).toLocaleString() : "—" },
          ].map(s => (
            <div key={s.l} style={{ background:"#fff", padding:"20px 24px" }}>
              <div style={{ fontFamily:"monospace", fontSize:20, fontWeight:800, color:"#0f1419",
                marginBottom:4 }}>{s.v}</div>
              <div style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase",
                letterSpacing:"0.10em", fontWeight:700 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom:"2px solid #0f1419", marginBottom:32 }}>
          <div style={{ display:"flex" }}>
            {(["owned","listed","offers"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding:"12px 20px", background:"transparent", border:"none",
                  cursor:"pointer", fontSize:10, fontWeight:800, letterSpacing:"0.10em",
                  textTransform:"uppercase",
                  color: activeTab === t ? "#000" : "#9aa0ae",
                  borderBottom: activeTab === t ? "3px solid #000" : "3px solid transparent" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* OWNED */}
        {activeTab === "owned" && (
          ownedCount === 0 ? (
            <div style={{ textAlign:"center", padding:"80px 20px", border:"2px dashed #e0e3ea" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.10em",
                marginBottom:16 }}>NO TAO CATS IN WALLET</div>
              <Link href="/mint" style={{ padding:"12px 28px", background:"#0f1419", color:"#fff",
                fontSize:10, fontWeight:800, letterSpacing:"0.10em", textTransform:"uppercase",
                textDecoration:"none" }}>MINT NOW</Link>
            </div>
          ) : (
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:8 }}>
              {tokenIds.map((tid, i) => {
                const id   = Number(tid);
                const tier = rarityBatch?.[2]?.[i] as string | undefined;
                const rank = rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined;
                const tc   = tier ? TIER_COLOR[tier] : TIER_COLOR.Common;
                return (
                  <div key={id} style={{ border:"1.5px solid #e0e3ea", background:"#fff",
                    transition:"border-color 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor="#0f1419")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor="#e0e3ea")}>
                    <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative",
                      overflow:"hidden" }}>
                      <Image src={`/samples/${id % 12 + 1}.png`} alt={`#${id}`} fill
                        style={{ objectFit:"cover" }} />
                      {tier && (
                        <div style={{ position:"absolute", bottom:6, left:6, padding:"2px 8px",
                          background:tc.bg, color:tc.text,
                          fontSize:8, fontWeight:800, letterSpacing:"0.06em" }}>
                          {tier.toUpperCase()}
                        </div>
                      )}
                      {rank && (
                        <div style={{ position:"absolute", top:6, right:6, padding:"2px 6px",
                          background:"rgba(0,0,0,0.75)", color:"#fff",
                          fontSize:8, fontWeight:800 }}>#{rank}</div>
                      )}
                    </div>
                    <div style={{ padding:"10px 12px", display:"flex", justifyContent:"space-between",
                      alignItems:"center", borderTop:"1px solid #f0f1f4" }}>
                      <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:800 }}>#{id}</span>
                      <button onClick={() => { setSellId(id.toString()); setActiveTab("listed"); }}
                        style={{ fontSize:8, fontWeight:800, color:"#5a6478", background:"transparent",
                          border:"1px solid #e0e3ea", padding:"3px 8px", cursor:"pointer",
                          textTransform:"uppercase", letterSpacing:"0.06em" }}>
                        SELL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* LISTED / SELL */}
        {activeTab === "listed" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48 }} className="about-grid">
            <div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.10em", marginBottom:16 }}>
                YOUR TAO CATS
              </div>
              {ownedCount === 0 ? (
                <div style={{ padding:40, border:"2px dashed #eee", textAlign:"center",
                  fontSize:10, color:"#9aa0ae", fontWeight:700 }}>NO CATS IN WALLET</div>
              ) : (
                <div style={{ display:"grid",
                  gridTemplateColumns:"repeat(auto-fill, minmax(88px, 1fr))", gap:4 }}>
                  {tokenIds.map(tid => {
                    const id = Number(tid);
                    const selected = sellId === id.toString();
                    return (
                      <div key={id} onClick={() => setSellId(id.toString())}
                        style={{ border: selected ? "2.5px solid #000" : "1.5px solid #eee",
                          cursor:"pointer", aspectRatio:"1/1", position:"relative",
                          overflow:"hidden" }}>
                        <Image src={`/samples/${id % 12 + 1}.png`} alt="" fill
                          style={{ objectFit:"cover" }} />
                        {selected && (
                          <div style={{ position:"absolute", inset:0,
                            background:"rgba(0,0,0,0.35)", display:"flex",
                            alignItems:"center", justifyContent:"center" }}>
                            <span style={{ color:"#fff", fontWeight:800, fontSize:16 }}>✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={{ border:"2px solid #0f1419", padding:32 }}>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.10em", marginBottom:24 }}>
                LIST FOR SALE
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", display:"block",
                  marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Token ID</label>
                <input value={sellId} onChange={e => setSellId(e.target.value)}
                  placeholder="Select above or enter ID"
                  style={{ width:"100%", padding:"10px 12px", border:"2px solid #0f1419",
                    fontSize:13, fontWeight:700, fontFamily:"monospace" }} />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", display:"block",
                  marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Price (TAO)</label>
                <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00"
                  style={{ width:"100%", padding:"10px 12px", border:"2px solid #0f1419",
                    fontSize:13, fontWeight:700, fontFamily:"monospace" }} />
              </div>
              {floorTao > 0 && (
                <div style={{ padding:"8px 12px", background:"#f7f8fa", border:"1px solid #e0e3ea",
                  fontSize:9, color:"#5a6478", fontWeight:700, marginBottom:16 }}>
                  CURRENT FLOOR: τ {floorTao.toFixed(3)}
                </div>
              )}
              <button onClick={handleList} disabled={isPending || !sellId || !sellPrice}
                style={{ width:"100%", padding:14, background:"#0f1419", color:"#fff", border:"none",
                  fontSize:10, fontWeight:800, letterSpacing:"0.10em", cursor:"pointer",
                  textTransform:"uppercase", opacity:(!sellId || !sellPrice) ? 0.5 : 1 }}>
                {isPending ? "CONFIRMING..." : "LIST FOR SALE"}
              </button>
            </div>
          </div>
        )}

        {/* OFFERS */}
        {activeTab === "offers" && (
          <div style={{ textAlign:"center", padding:"60px 20px", border:"2px dashed #e0e3ea" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.10em",
              marginBottom:8 }}>OFFERS</div>
            <p style={{ fontSize:11, color:"#9aa0ae", marginBottom:24 }}>
              Make and manage offers from the marketplace.
            </p>
            <Link href="/marketplace?tab=offers"
              style={{ padding:"10px 24px", background:"#0f1419", color:"#fff", fontSize:10,
                fontWeight:800, letterSpacing:"0.10em", textTransform:"uppercase",
                textDecoration:"none" }}>
              GO TO OFFERS
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
