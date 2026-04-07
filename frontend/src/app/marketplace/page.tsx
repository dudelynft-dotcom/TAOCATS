"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MINT_PRICE, COLLECTION_NAME } from "@/lib/config";
import { MARKETPLACE_ABI, NFT_ABI, RARITY_ABI } from "@/lib/abis";

type Tab      = "listings" | "activity" | "sell";
type SortBy   = "price_asc" | "price_desc" | "id_asc" | "id_desc";
type ViewMode = "grid" | "list";
type Listing  = { tokenId: bigint; id: number; price: bigint; seller: `0x${string}`; tier?: string; rank?: number };

const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#0a7a5a", Uncommon: "#a16207", Common: "#475569",
};

// CSS pixel cat silhouette component
function PixelCatSilhouette({ size = 120 }: { size?: number }) {
  const px = Math.round(size / 24);
  const grid = [
    [0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1],
    [0,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  ];
  return (
    <div style={{ display:"inline-block", lineHeight:0 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display:"flex" }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{ width:px, height:px, background: cell ? "#fff" : "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 5.26L19.18 4.5L19.94 8.59L23.2 11.68L19.94 14.77L19.18 18.86L15.09 18.1L12 21.36L8.91 18.1L4.82 18.86L4.06 14.77L0.8 11.68L4.06 8.59L4.82 4.5L8.91 5.26L12 2Z" fill="#000" />
      <path d="M9 12L11 14L15 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div style={{ padding:100, textAlign:"center" }}>LOADING...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (t === "sell" || t === "activity") ? t : "listings";
  });

  const [sort, setSort]         = useState<SortBy>("price_asc");
  const [view, setView]         = useState<ViewMode>("grid");
  const [sellId, setSellId]     = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const { data: listingPage } = useReadContract({
    address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI,
    functionName: "getActiveListingsPage", args: [BigInt(0), BigInt(200)],
  });
  const { data: myTokens } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "tokensOfOwner",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const tokenIds    = listingPage?.[0] ?? [];
  const listingData = listingPage?.[1] ?? [];
  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY, abi: RARITY_ABI, functionName: "rarityBatch",
    args: tokenIds.length > 0 ? [tokenIds] : undefined, query: { enabled: tokenIds.length > 0 },
  });

  const listings = useMemo((): Listing[] => {
    return tokenIds.map((tid, i) => {
      const l = listingData[i];
      return {
        tokenId: tid, id: Number(tid), price: l.price, seller: l.seller as `0x${string}`,
        tier: rarityBatch?.[2]?.[i] as string | undefined,
        rank: rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined,
      };
    }).filter(l => l.price > 0n);
  }, [tokenIds, listingData, rarityBatch]);

  const filtered = useMemo(() => {
    let out = [...listings];
    if (filterTier !== "all") out = out.filter(l => l.tier === filterTier);
    switch (sort) {
      case "price_asc":  out.sort((a,b) => a.price < b.price ? -1 : 1); break;
      case "price_desc": out.sort((a,b) => a.price > b.price ? -1 : 1); break;
      case "id_asc":     out.sort((a,b) => a.id - b.id); break;
      case "id_desc":    out.sort((a,b) => b.id - a.id); break;
    }
    return out;
  }, [listings, filterTier, sort]);

  function handleBuy(tokenId: bigint, price: bigint) {
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "buy", args: [tokenId], value: price });
  }
  function handleList() {
    if (!sellId || !sellPrice) return;
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "list", args: [BigInt(sellId), parseEther(sellPrice)] });
  }
  function handleDelist(tokenId: bigint) {
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "delist", args: [tokenId] });
  }

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>

      {/* ── TRADING SOON BANNER ── */}
      <div style={{ background:"#000", color:"#fff", padding:"40px 20px", display:"flex", alignItems:"center", justifyContent:"center", gap:48, overflow:"hidden", position:"relative" }}>
        <div style={{ opacity:0.1, position:"absolute", left:-20, top:-10 }}><PixelCatSilhouette size={240} /></div>
        <div style={{ textAlign:"center", zIndex:1 }}>
          <h2 style={{ fontSize:32, fontWeight:800, letterSpacing:"-0.02em", marginBottom:8 }}>TAO CATS TRADING SOON</h2>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:"#5a6478" }}>GENESIS COLLECTION</span>
            <div style={{ width:4, height:4, background:"#5a6478" }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:"#5a6478" }}>CHAIN 964</span>
          </div>
        </div>
        <div style={{ zIndex:1 }} className="hide-mobile"><PixelCatSilhouette size={120} /></div>
        <div style={{ opacity:0.1, position:"absolute", right:-20, bottom:-10 }}><PixelCatSilhouette size={240} /></div>
      </div>

      {/* ── PRO HEADER (DATA DENSE) ── */}
      <div style={{ borderBottom:"1px solid #eee", padding:"24px 0" }}>
        <div className="container-app" style={{ display:"flex", alignItems:"center", gap:40, overflowX:"auto", scrollbarWidth:"none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
            <div style={{ width:48, height:48, background:"#000", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Image src="/samples/1.png" alt="" width={48} height={48} />
            </div>
            <div style={{ display:"flex", flexDirection:"column" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <h1 style={{ fontSize:16, fontWeight:800 }}>TAO CAT</h1>
                <VerifiedBadge />
              </div>
              <div style={{ fontSize:9, color:"#9aa0ae", fontWeight:700 }}>4,699 GENESIS CATS · CHAIN 964</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:32, flexShrink:0 }}>
            {[
              { l:"FLOOR", v:`τ ${listings[0]?.price ? parseFloat(formatEther(listings[0].price)).toFixed(2) : "0.03"}` },
              { l:"LISTED", v: listings.length },
              { l:"TOTAL MINTED", v: "0" },
              { l:"MARKET FEE", v: "2.5%" },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize:15, fontWeight:800, fontFamily:"monospace" }}>{s.v}</div>
                <div style={{ fontSize:8, color:"#9aa0ae", fontWeight:800, letterSpacing:"0.05em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ borderBottom:"2px solid #000" }}>
        <div className="container-app" style={{ display:"flex" }}>
          {(["listings","activity","sell"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"16px 24px", background:"transparent", border:"none", cursor:"pointer", fontSize:11, fontWeight:800, letterSpacing:"0.1em",
                color: tab === t ? "#000" : "#9aa0ae", borderBottom: tab === t ? "3px solid #000" : "3px solid transparent" }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="container-app" style={{ display:"flex", minHeight:"60vh" }}>
        
        {tab === "listings" && (
          <>
            {/* Sidebar */}
            {sidebarOpen && (
              <div style={{ width:240, borderRight:"1px solid #eee", padding:"24px 24px 24px 0", flexShrink:0 }}>
                <div style={{ marginBottom:32 }}>
                  <div style={{ fontSize:10, fontWeight:800, marginBottom:16, letterSpacing:"0.1em" }}>RARITY TIER</div>
                  {["all","Legendary","Epic","Rare","Uncommon","Common"].map(tier => (
                    <button key={tier} onClick={() => setFilterTier(tier)}
                      style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", border: filterTier === tier ? "1.5px solid #000" : "1.5px solid transparent", 
                        background: filterTier === tier ? "#000" : "transparent", color: filterTier === tier ? "#fff" : "#5a6478", fontSize:11, fontWeight:700, marginBottom:4 }}>
                      {tier.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:800, marginBottom:16, letterSpacing:"0.1em" }}>PRICE FILTER</div>
                  <input placeholder="Max TAO" style={{ width:"100%", padding:10, border:"1.5px solid #000", fontSize:11, outline:"none" }} />
                </div>
              </div>
            )}

            <div style={{ flex:1, padding:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding:"6px 12px", border:"1.5px solid #000", fontSize:10, fontWeight:800 }}>
                  {sidebarOpen ? "HIDE FILTERS" : "SHOW FILTERS"}
                </button>
                <div style={{ display:"flex", gap:8 }}>
                  <select value={sort} onChange={e => setSort(e.target.value as SortBy)} style={{ padding:"6px 12px", border:"1.5px solid #000", fontSize:10, fontWeight:800 }}>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <div style={{ display:"flex", border:"1.5px solid #000" }}>
                    <button onClick={() => setView("grid")} style={{ padding:"6px 12px", background: view==="grid"?"#000":"#fff", color: view==="grid"?"#fff":"#000", border:"none" }}>GRID</button>
                    <button onClick={() => setView("list")} style={{ padding:"6px 12px", background: view==="list"?"#000":"#fff", color: view==="list"?"#fff":"#000", border:"none" }}>LIST</button>
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:100, border:"2px dashed #eee", color:"#9aa0ae", fontWeight:700 }}>No results matching your filters</div>
              ) : (
                <div style={view === "grid" ? { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:8 } : {}}>
                  {filtered.map(l => (
                    <div key={l.id} style={{ border:"1.5px solid #eee", background:"#fff" }}>
                      <div style={{ aspectRatio:"1/1" }}><Image src={`/samples/${l.id % 12 + 1}.png`} alt="" width={200} height={200} /></div>
                      <div style={{ padding:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
                          <span style={{ fontWeight:800, fontSize:12 }}>#{l.id}</span>
                          <span style={{ fontSize:10, fontWeight:700, color: TIER_COLOR[l.tier||'Common'] }}>{l.tier?.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize:14, fontWeight:800, marginBottom:12 }}>τ {parseFloat(formatEther(l.price)).toFixed(2)}</div>
                        <button onClick={() => handleBuy(l.tokenId, l.price)} style={{ width:"100%", padding:"10px", background:"#000", color:"#fff", border:"none", fontSize:10, fontWeight:800, cursor:"pointer" }}>BUY NOW</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "sell" && (
          <div style={{ flex:1, padding:40 }}>
            {!isConnected ? (
              <div style={{ textAlign:"center", padding:100, border:"2px dashed #eee" }}>
                <p style={{ marginBottom:24, fontWeight:700 }}>Connect wallet to list items</p>
                <ConnectButton />
              </div>
            ) : (
              <div className="responsive-grid grid-cols-2" style={{ gap:80 }}>
                <div>
                  <h3 style={{ fontSize:12, fontWeight:800, marginBottom:24 }}>YOUR COLLECTION</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(100px, 1fr))", gap:4 }}>
                    {myTokens?.map(tid => (
                      <div key={tid.toString()} onClick={() => setSellId(tid.toString())}
                        style={{ border: sellId === tid.toString() ? "2.5px solid #000" : "1.5px solid #eee", cursor:"pointer" }}>
                        <Image src={`/samples/${Number(tid) % 12 + 1}.png`} alt="" width={100} height={100} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border:"2px solid #000", padding:32 }}>
                  <h3 style={{ fontSize:12, fontWeight:800, marginBottom:32 }}>LIST ASSET</h3>
                  <div style={{ marginBottom:20 }}>
                    <label style={{ fontSize:10, fontWeight:800, color:"#9aa0ae", display:"block", marginBottom:8 }}>TOKEN ID</label>
                    <input value={sellId} onChange={e=>setSellId(e.target.value)} style={{ width:"100%", padding:12, border:"2px solid #000", fontSize:14, fontWeight:800 }} />
                  </div>
                  <div style={{ marginBottom:32 }}>
                    <label style={{ fontSize:10, fontWeight:800, color:"#9aa0ae", display:"block", marginBottom:8 }}>PRICE (TAO)</label>
                    <input value={sellPrice} onChange={e=>setSellPrice(e.target.value)} placeholder="0.00" style={{ width:"100%", padding:12, border:"2px solid #000", fontSize:14, fontWeight:800 }} />
                  </div>
                  <button onClick={handleList} disabled={isPending} className="btn-primary" style={{ width:"100%", padding:16 }}>
                    {isPending ? "CONFIRMING..." : "LIST FOR SALE"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div style={{ flex:1, padding:100, textAlign:"center" }}>
            <div style={{ width:120, height:120, background:"#f7f8fa", margin:"0 auto 32px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <PixelCatSilhouette size={80} />
            </div>
            <h2 style={{ fontSize:14, fontWeight:800, letterSpacing:"0.1em", color:"#9aa0ae" }}>ACTIVITY LOG COMING SOON</h2>
          </div>
        )}
      </div>

    </div>
  );
}
