"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MINT_PRICE } from "@/lib/config";
import { MARKETPLACE_ABI, NFT_ABI, RARITY_ABI } from "@/lib/abis";

type Tab      = "listings" | "activity" | "sell";
type SortBy   = "price_asc" | "price_desc" | "id_asc" | "id_desc";
type ViewMode = "grid" | "list";
type Listing  = { tokenId: bigint; id: number; price: bigint; seller: `0x${string}`; tier?: string; rank?: number };

const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#059669", Uncommon: "#a16207", Common: "#475569",
};
const TIER_BG: Record<string, string> = {
  Legendary: "#ede9fe", Epic: "#dbeafe", Rare: "#d4f5e9", Uncommon: "#fef3c7", Common: "#f1f5f9",
};

// CSS pixel cat row for banner decoration
function BannerCats() {
  const cats = [
    // each cat is a tiny 8x8 pixel pattern [row][col]
    // Cat A - sitting
    [[0,1,1,0,0,1,1,0],[1,1,1,1,1,1,1,1],[1,1,0,1,1,0,1,1],[1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,0],[0,0,1,1,1,1,0,0],[0,1,0,0,0,0,1,0],[1,1,0,0,0,0,1,1]],
    // Cat B - facing right
    [[0,0,1,1,1,0,0,0],[0,1,1,1,1,1,0,0],[1,1,0,1,0,1,1,0],[1,1,1,1,1,1,1,0],[0,1,1,1,1,1,0,0],[0,1,0,0,0,1,0,0],[0,1,0,0,0,1,0,0],[1,1,0,0,0,1,1,0]],
    // Cat C - peeking
    [[0,1,0,0,0,0,1,0],[0,1,0,0,0,0,1,0],[1,1,1,1,1,1,1,1],[1,0,1,1,1,1,0,1],[1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,0],[0,0,1,0,0,1,0,0],[0,1,1,0,0,1,1,0]],
    // Cat D - ears up
    [[1,0,0,0,0,0,0,1],[1,1,0,0,0,0,1,1],[0,1,1,1,1,1,1,0],[0,1,0,1,1,0,1,0],[0,1,1,1,1,1,1,0],[0,0,1,1,1,1,0,0],[0,0,1,0,0,1,0,0],[0,1,1,1,1,1,1,0]],
    // Cat E - walking
    [[0,0,1,1,1,0,0,0],[0,1,1,1,1,1,1,0],[1,1,0,1,0,1,0,1],[1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,0],[1,0,1,1,1,0,1,0],[1,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0]],
  ];
  const PX = 10;
  return (
    <div style={{ display:"flex", gap:32, alignItems:"flex-end", opacity:0.15 }}>
      {cats.map((cat, ci) => (
        <div key={ci} style={{ lineHeight:0 }}>
          {cat.map((row, ri) => (
            <div key={ri} style={{ display:"flex" }}>
              {row.map((cell, pi) => (
                <div key={pi} style={{ width:PX, height:PX, background: cell ? "#ffffff" : "transparent" }} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div style={{ background:"#ffffff", minHeight:"100vh", padding:40, textAlign:"center", fontSize:12, color:"#9aa0ae", letterSpacing:"0.1em" }}>
        LOADING MARKETPLACE...
      </div>
    }>
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

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "sell" || t === "activity") setTab(t);
  }, [searchParams]);

  const [sort, setSort]         = useState<SortBy>("price_asc");
  const [view, setView]         = useState<ViewMode>("grid");
  const [sellId, setSellId]     = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { address, isConnected } = useAccount();

  const { data: listingPage } = useReadContract({
    address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI,
    functionName: "getActiveListingsPage", args: [BigInt(0), BigInt(200)],
  });
  const { data: myTokens } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "tokensOfOwner",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply",
  });

  const tokenIds    = listingPage?.[0] ?? [];
  const listingData = listingPage?.[1] ?? [];

  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY, abi: RARITY_ABI, functionName: "rarityBatch",
    args: tokenIds.length > 0 ? [tokenIds] : undefined,
    query: { enabled: tokenIds.length > 0 },
  });

  const listings = useMemo((): Listing[] => {
    const result: Listing[] = [];
    tokenIds.forEach((tokenId, i) => {
      const l = listingData[i];
      if (!l?.active) return;
      result.push({
        tokenId,
        id: Number(tokenId),
        price: l.price,
        seller: l.seller as `0x${string}`,
        tier: rarityBatch?.[2]?.[i] as string | undefined,
        rank: rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined,
      });
    });
    return result;
  }, [tokenIds, listingData, rarityBatch]);

  const floorPrice   = listings.length > 0 ? listings.reduce((min: bigint, l: Listing) => l.price < min ? l.price : min, listings[0].price) : null;
  const totalVolume  = listings.reduce((sum: bigint, l: Listing) => sum + l.price, BigInt(0));
  const minted       = totalSupply ? Number(totalSupply) : 0;

  const filtered = useMemo(() => {
    let out = [...listings];
    if (filterTier !== "all") out = out.filter((l: Listing) => l.tier === filterTier);
    if (maxPrice) { try { const max = parseEther(maxPrice); out = out.filter((l: Listing) => l.price <= max); } catch {} }
    switch (sort) {
      case "price_asc":  out.sort((a, b) => a.price < b.price ? -1 : 1); break;
      case "price_desc": out.sort((a, b) => a.price > b.price ? -1 : 1); break;
      case "id_asc":     out.sort((a, b) => a.id - b.id); break;
      case "id_desc":    out.sort((a, b) => b.id - a.id); break;
    }
    return out;
  }, [listings, filterTier, maxPrice, sort]);

  const { writeContract, isPending } = useWriteContract();

  function handleBuy(tokenId: bigint, price: bigint) {
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "buy", args: [tokenId], value: price });
  }
  function handleDelist(tokenId: bigint) {
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "delist", args: [tokenId] });
  }
  function handleList() {
    if (!sellId || !sellPrice) return;
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "list", args: [BigInt(sellId), parseEther(sellPrice)] });
  }

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:56 }}>

      {/* ── TRADING SOON BANNER ── */}
      {!bannerDismissed && (
        <div style={{ background:"#0f1419", overflow:"hidden", position:"relative", borderBottom:"2px solid #1e2640" }}>
          {/* Pixel cat decorations */}
          <div style={{ position:"absolute", right:120, bottom:0, pointerEvents:"none" }}>
            <BannerCats />
          </div>
          <div style={{ maxWidth:1400, margin:"0 auto", padding:"32px 40px", position:"relative", zIndex:1 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:24 }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div style={{ width:8, height:8, background:"#ffffff", animation:"none" }} />
                  <span style={{ fontSize:9, fontWeight:700, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.16em" }}>
                    Bittensor EVM · Chain 964 · First NFT Marketplace on TAO
                  </span>
                </div>
                <h2 style={{ fontSize:"clamp(22px,3vw,40px)", fontWeight:700, color:"#ffffff", textTransform:"uppercase", letterSpacing:"-0.02em", lineHeight:1, marginBottom:10 }}>
                  TAO CATS
                </h2>
                <p style={{ fontSize:13, fontWeight:700, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.10em" }}>
                  Trading Soon
                </p>
                <div style={{ display:"flex", alignItems:"center", gap:20, marginTop:16, flexWrap:"wrap" }}>
                  {[
                    { label:"Supply", value:"4,699" },
                    { label:"Mint",   value:`τ ${MINT_PRICE}` },
                    { label:"Minted", value: minted.toLocaleString() },
                    { label:"Fee",    value:"2.5%" },
                  ].map(s => (
                    <div key={s.label} style={{ borderLeft:"1px solid #2a3040", paddingLeft:16 }}>
                      <div style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color:"#ffffff", letterSpacing:"-0.01em" }}>{s.value}</div>
                      <div style={{ fontSize:8, fontWeight:700, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.12em", marginTop:1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Large pixel cat silhouette */}
              <div style={{ flexShrink:0, opacity:0.6 }}>
                <PixelCatLarge />
              </div>
            </div>
          </div>
          <button onClick={() => setBannerDismissed(true)}
            style={{ position:"absolute", top:12, right:16, background:"transparent", border:"none", color:"#5a6478", cursor:"pointer", fontSize:18, lineHeight:1, padding:"4px 8px", zIndex:2 }}>
            x
          </button>
        </div>
      )}

      {/* ── COLLECTION HEADER ── */}
      <div style={{ borderBottom:"1px solid #e0e3ea", background:"#ffffff" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 24px" }}>

          {/* Identity row */}
          <div style={{ display:"flex", alignItems:"center", gap:16, padding:"20px 0 14px" }}>
            <div style={{ width:44, height:44, border:"1px solid #0f1419", overflow:"hidden", flexShrink:0 }}>
              <Image src="/samples/50.png" alt="TAO Cats" width={44} height={44} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                <h1 style={{ fontSize:16, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.06em" }}>TAO Cats</h1>
                {/* Verified badge */}
                <span style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"1px 6px", background:"#0f1419", color:"#ffffff", fontSize:9, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>
                  ✓ VERIFIED
                </span>
                <span style={{ padding:"1px 6px", border:"1px solid #e0e3ea", color:"#9aa0ae", fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>TAOC</span>
              </div>
              <p style={{ fontSize:10, color:"#9aa0ae", letterSpacing:"0.06em", fontFamily:"monospace" }}>4,699 unique pixel cats · Bittensor EVM · Chain 964</p>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:"flex", gap:0, borderTop:"1px solid #e0e3ea" }}>
            {[
              { label:"Floor",        value: floorPrice ? `τ ${parseFloat(formatEther(floorPrice)).toFixed(2)}` : `τ ${MINT_PRICE}` },
              { label:"Listed",       value: listings.length.toString() },
              { label:"Total Listed", value: listings.length > 0 ? `τ ${parseFloat(formatEther(totalVolume)).toFixed(0)}` : "-" },
              { label:"Supply",       value: "4,699" },
              { label:"Minted",       value: minted.toLocaleString() },
              { label:"Fee",          value: "2.5%" },
            ].map((s) => (
              <div key={s.label} style={{ padding:"14px 22px", borderRight:"1px solid #e0e3ea", borderBottom:"1px solid #e0e3ea" }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#0f1419", fontFamily:"monospace", letterSpacing:"-0.01em" }}>{s.value}</div>
                <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:"flex" }}>
            {(["listings","activity","sell"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"11px 18px", background:"transparent", border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase",
                  color: tab === t ? "#0f1419" : "#9aa0ae",
                  borderBottom: tab === t ? "2px solid #0f1419" : "2px solid transparent",
                  transition:"color 0.12s" }}>
                {t === "sell" ? "List for Sale" : t === "activity" ? "Activity" : "Browse"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── LISTINGS ── */}
      {tab === "listings" && (
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 24px", display:"flex", gap:0 }}>

          {/* Sidebar */}
          {sidebarOpen && (
            <div style={{ width:196, flexShrink:0, borderRight:"1px solid #e0e3ea", minHeight:"calc(100vh - 300px)", paddingTop:20 }}>
              <div style={{ padding:"0 14px", display:"flex", flexDirection:"column", gap:24 }}>

                <div>
                  <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:10 }}>Rarity Tier</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                    {["all","Legendary","Epic","Rare","Uncommon","Common"].map(tier => {
                      const active = filterTier === tier;
                      const count  = tier === "all" ? listings.length : listings.filter((l: Listing) => l.tier === tier).length;
                      return (
                        <button key={tier} onClick={() => setFilterTier(tier)}
                          style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 9px", border:"1px solid", cursor:"pointer", fontSize:11, fontWeight:600, transition:"all 0.10s", letterSpacing:"0.04em",
                            background: active ? (tier === "all" ? "#0f1419" : TIER_BG[tier]) : "transparent",
                            borderColor: active ? (tier === "all" ? "#0f1419" : TIER_COLOR[tier] || "#e0e3ea") : "#e0e3ea",
                            color: active ? (tier === "all" ? "#ffffff" : TIER_COLOR[tier]) : "#5a6478" }}>
                          {tier === "all" ? "All" : tier}
                          <span style={{ fontSize:10, fontFamily:"monospace", color: active && tier === "all" ? "#ffffff" : "#9aa0ae" }}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:10 }}>Max Price (TAO)</div>
                  <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    placeholder="0.00" type="number" step="0.01"
                    style={{ width:"100%", background:"#ffffff", border:"1px solid #e0e3ea", padding:"7px 10px", color:"#0f1419", fontSize:12, outline:"none", fontFamily:"monospace" }}
                    onFocus={e => (e.target.style.borderColor="#0f1419")}
                    onBlur={e => (e.target.style.borderColor="#e0e3ea")} />
                  {maxPrice && (
                    <button onClick={() => setMaxPrice("")} style={{ marginTop:5, fontSize:9, color:"#9aa0ae", background:"transparent", border:"none", cursor:"pointer", padding:0, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>
                      Clear x
                    </button>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Content */}
          <div style={{ flex:1, minWidth:0, padding:"14px 0 14px 14px" }}>

            {/* Toolbar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:10, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={() => setSidebarOpen(v => !v)}
                  style={{ padding:"4px 10px", background:"transparent", border:"1px solid #e0e3ea", color:"#5a6478", cursor:"pointer", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  {sidebarOpen ? "Hide" : "Filter"}
                </button>
                <span style={{ fontSize:10, color:"#9aa0ae", fontFamily:"monospace" }}>{filtered.length} results</span>
                {(filterTier !== "all" || maxPrice) && (
                  <button onClick={() => { setFilterTier("all"); setMaxPrice(""); }}
                    style={{ padding:"3px 8px", background:"transparent", border:"1px solid #e0e3ea", color:"#9aa0ae", cursor:"pointer", fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                    Clear all x
                  </button>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <select value={sort} onChange={e => setSort(e.target.value as SortBy)}
                  style={{ padding:"4px 8px", background:"#ffffff", border:"1px solid #e0e3ea", color:"#5a6478", fontSize:10, cursor:"pointer", outline:"none", fontFamily:"monospace" }}>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="id_asc">ID: Ascending</option>
                  <option value="id_desc">ID: Descending</option>
                </select>
                <div style={{ display:"flex", border:"1px solid #e0e3ea" }}>
                  {(["grid","list"] as ViewMode[]).map(v => (
                    <button key={v} onClick={() => setView(v)}
                      style={{ padding:"4px 9px", border:"none", cursor:"pointer", fontSize:12, background: view === v ? "#0f1419" : "#ffffff", color: view === v ? "#ffffff" : "#9aa0ae", transition:"all 0.10s", borderRight: v === "grid" ? "1px solid #e0e3ea" : "none" }}>
                      {v === "grid" ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <rect x="0" y="0" width="5" height="5"/><rect x="7" y="0" width="5" height="5"/>
                          <rect x="0" y="7" width="5" height="5"/><rect x="7" y="7" width="5" height="5"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                          <rect x="0" y="0" width="12" height="2"/><rect x="0" y="5" width="12" height="2"/>
                          <rect x="0" y="10" width="12" height="2"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"72px 0", border:"1px solid #e0e3ea", background:"#f7f8fa" }}>
                <div style={{ fontSize:10, color:"#9aa0ae", marginBottom:14, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:700 }}>No listings match your filters</div>
                <button onClick={() => { setFilterTier("all"); setMaxPrice(""); }}
                  style={{ padding:"6px 16px", background:"transparent", border:"1px solid #0f1419", color:"#0f1419", cursor:"pointer", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  Clear Filters
                </button>
              </div>
            )}

            {/* Grid view */}
            {view === "grid" && filtered.length > 0 && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))", gap:4 }}>
                {filtered.map((item) => {
                  const isOwner = address?.toLowerCase() === item.seller.toLowerCase();
                  const imgId   = item.id <= 12 ? item.id : (item.id % 12) + 1;
                  return (
                    <div key={item.tokenId.toString()} className="nft-card">
                      <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative" }}>
                        <Image src={`/samples/${imgId}.png`} alt={`Cat #${item.id}`}
                          width={296} height={296} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                        {item.tier && (
                          <div style={{ position:"absolute", top:4, left:4, padding:"2px 5px", fontSize:8, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", background: TIER_BG[item.tier] || "#f2f4f7", color: TIER_COLOR[item.tier] || "#475569" }}>
                            {item.tier}
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"8px 10px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:"#0f1419", fontFamily:"monospace" }}>#{item.id}</div>
                            {item.rank && <div style={{ fontSize:9, color:"#9aa0ae" }}>Rank #{item.rank}</div>}
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:12, fontWeight:700, color:"#0f1419", fontFamily:"monospace" }}>τ {parseFloat(formatEther(item.price)).toFixed(2)}</div>
                          </div>
                        </div>
                        {isOwner ? (
                          <button onClick={() => handleDelist(item.tokenId)} disabled={isPending}
                            style={{ width:"100%", padding:"5px 0", background:"transparent", border:"1px solid #fca5a5", color:"#c0392b", cursor:"pointer", fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                            Delist
                          </button>
                        ) : (
                          <button onClick={() => handleBuy(item.tokenId, item.price)} disabled={!isConnected || isPending}
                            style={{ width:"100%", padding:"5px 0", background: isConnected ? "#0f1419" : "#f2f4f7", color: isConnected ? "#ffffff" : "#9aa0ae", border:"none", cursor: isConnected ? "pointer":"not-allowed", fontSize:9, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                            Buy Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List view */}
            {view === "list" && filtered.length > 0 && (
              <div style={{ border:"1px solid #e0e3ea" }}>
                <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 100px 90px 90px 100px", padding:"8px 14px", borderBottom:"1px solid #e0e3ea", background:"#f7f8fa", fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em" }}>
                  <div></div><div>Item</div><div style={{ textAlign:"right" }}>Price</div>
                  <div style={{ textAlign:"center" }}>Tier</div><div style={{ textAlign:"center" }}>Rank</div><div style={{ textAlign:"right" }}>Action</div>
                </div>
                {filtered.map((item) => {
                  const isOwner = address?.toLowerCase() === item.seller.toLowerCase();
                  const imgId   = item.id <= 12 ? item.id : (item.id % 12) + 1;
                  return (
                    <div key={item.tokenId.toString()}
                      style={{ display:"grid", gridTemplateColumns:"40px 1fr 100px 90px 90px 100px", padding:"9px 14px", borderBottom:"1px solid #e0e3ea", alignItems:"center" }}
                      onMouseEnter={e => (e.currentTarget.style.background="#f7f8fa")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                      <div style={{ width:32, height:32, border:"1px solid #e0e3ea", overflow:"hidden" }}>
                        <Image src={`/samples/${imgId}.png`} alt="" width={32} height={32} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      </div>
                      <div style={{ fontFamily:"monospace", fontWeight:700, fontSize:12, color:"#0f1419" }}>#{item.id}</div>
                      <div style={{ textAlign:"right", fontFamily:"monospace", fontWeight:700, fontSize:12, color:"#0f1419" }}>τ {parseFloat(formatEther(item.price)).toFixed(2)}</div>
                      <div style={{ textAlign:"center" }}>
                        {item.tier ? (
                          <span style={{ fontSize:8, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color: TIER_COLOR[item.tier], padding:"2px 5px", background: TIER_BG[item.tier] }}>{item.tier}</span>
                        ) : <span style={{ color:"#c8cdd8", fontSize:11 }}>-</span>}
                      </div>
                      <div style={{ textAlign:"center", fontFamily:"monospace", fontSize:11, color:"#9aa0ae" }}>{item.rank ? `#${item.rank}` : "-"}</div>
                      <div style={{ textAlign:"right" }}>
                        {isOwner ? (
                          <button onClick={() => handleDelist(item.tokenId)} disabled={isPending}
                            style={{ padding:"3px 10px", background:"transparent", border:"1px solid #fca5a5", color:"#c0392b", cursor:"pointer", fontSize:9, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                            Delist
                          </button>
                        ) : (
                          <button onClick={() => handleBuy(item.tokenId, item.price)} disabled={!isConnected || isPending}
                            style={{ padding:"3px 10px", background:"#0f1419", color:"#fff", border:"none", cursor: isConnected ? "pointer":"not-allowed", fontSize:9, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>
                            Buy
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVITY ── */}
      {tab === "activity" && (
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px" }}>
          <div style={{ border:"1px solid #e0e3ea" }}>
            <div style={{ display:"grid", gridTemplateColumns:"40px 1fr 110px 200px 80px", padding:"8px 18px", borderBottom:"1px solid #e0e3ea", background:"#f7f8fa", fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.12em" }}>
              <div></div><div>Item</div><div style={{ textAlign:"right" }}>Price</div><div>From / To</div><div>Time</div>
            </div>
            <div style={{ padding:"48px 0", textAlign:"center" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>On-chain activity indexing coming soon</div>
              <div style={{ fontSize:11, color:"#c8cdd8" }}>Trades and transfers will appear here</div>
            </div>
          </div>
        </div>
      )}

      {/* ── SELL ── */}
      {tab === "sell" && (
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"24px" }}>
          {!isConnected ? (
            <div style={{ maxWidth:400, padding:"48px 32px", border:"1px solid #e0e3ea", textAlign:"center" }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#9aa0ae", marginBottom:8 }}>Step 1/1</div>
              <p style={{ fontWeight:700, fontSize:14, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>Connect Wallet</p>
              <div style={{ height:1, background:"#e0e3ea", margin:"14px 0 18px" }} />
              <p style={{ color:"#5a6478", fontSize:12, marginBottom:24, lineHeight:1.8 }}>To list your cats for sale on the marketplace</p>
              <ConnectButton />
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, maxWidth:900 }} className="sell-grid">

              {/* Your cats */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 }}>
                  Your Cats ({myTokens?.length ?? 0})
                </div>
                {myTokens && myTokens.length > 0 ? (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(76px,1fr))", gap:3 }}>
                    {myTokens.map(id => {
                      const nid = Number(id);
                      const imgId = nid <= 12 ? nid : (nid % 12) + 1;
                      const selected = sellId === id.toString();
                      return (
                        <div key={id.toString()} onClick={() => setSellId(id.toString())}
                          style={{ border:`2px solid ${selected ? "#0f1419" : "#e0e3ea"}`, overflow:"hidden", cursor:"pointer", transition:"all 0.10s", background: selected ? "#f7f8fa" : "#fff" }}>
                          <div style={{ aspectRatio:"1/1" }}>
                            <Image src={`/samples/${imgId}.png`} alt="" width={76} height={76} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                          </div>
                          <div style={{ padding:"2px 0", textAlign:"center", fontFamily:"monospace", fontSize:9, color: selected ? "#0f1419" : "#9aa0ae", fontWeight:700 }}>
                            #{id.toString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding:28, textAlign:"center", border:"1px solid #e0e3ea", background:"#f7f8fa" }}>
                    <p style={{ color:"#9aa0ae", fontSize:12 }}>No cats in wallet</p>
                  </div>
                )}
              </div>

              {/* Form */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 }}>Listing Details</div>
                <div style={{ border:"1px solid #e0e3ea" }}>
                  <div style={{ padding:"12px 16px", background:"#f7f8fa", borderBottom:"1px solid #e0e3ea" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.06em" }}>List Cat for Sale</div>
                    <div style={{ fontSize:10, color:"#9aa0ae", marginTop:2 }}>2.5% fee on every sale</div>
                  </div>
                  <div style={{ padding:"18px 16px", display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:7 }}>Token ID</div>
                      <input value={sellId} onChange={e => setSellId(e.target.value)} placeholder="e.g. 420"
                        style={{ width:"100%", background:"#fff", border:"1px solid #e0e3ea", padding:"8px 12px", color:"#0f1419", fontSize:13, outline:"none", fontFamily:"monospace" }}
                        onFocus={e => (e.target.style.borderColor="#0f1419")}
                        onBlur={e => (e.target.style.borderColor="#e0e3ea")} />
                    </div>
                    <div>
                      <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:7 }}>Price (TAO)</div>
                      <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00" type="number" step="0.01"
                        style={{ width:"100%", background:"#fff", border:"1px solid #e0e3ea", padding:"8px 12px", color:"#0f1419", fontSize:13, outline:"none", fontFamily:"monospace" }}
                        onFocus={e => (e.target.style.borderColor="#0f1419")}
                        onBlur={e => (e.target.style.borderColor="#e0e3ea")} />
                    </div>
                    {sellPrice && (
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", background:"#f7f8fa", border:"1px solid #e0e3ea" }}>
                        <div style={{ padding:"9px 14px", borderRight:"1px solid #e0e3ea" }}>
                          <div style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", fontWeight:700, marginBottom:2 }}>You Receive</div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#0f1419", fontFamily:"monospace" }}>τ {(parseFloat(sellPrice) * 0.975).toFixed(3)}</div>
                        </div>
                        <div style={{ padding:"9px 14px" }}>
                          <div style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", fontWeight:700, marginBottom:2 }}>Fee (2.5%)</div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#9aa0ae", fontFamily:"monospace" }}>τ {(parseFloat(sellPrice) * 0.025).toFixed(3)}</div>
                        </div>
                      </div>
                    )}
                    <button onClick={handleList} disabled={!sellId || !sellPrice || isPending}
                      style={{ width:"100%", padding:"10px 0", background: sellId && sellPrice ? "#0f1419" : "#f2f4f7", color: sellId && sellPrice ? "#ffffff" : "#c8cdd8", border:"none", cursor: sellId && sellPrice ? "pointer":"not-allowed", fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>
                      {isPending ? "Confirm in wallet..." : "List Cat for Sale"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// Pixel cat silhouette for banner (larger, 16x16 grid)
function PixelCatLarge() {
  const grid = [
    [0,0,1,0,0,0,0,0,0,0,0,0,1,0,0,0],
    [0,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0],
    [0,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1],
    [0,1,1,1,0,0,1,1,1,0,0,0,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0],
    [0,0,0,1,0,1,1,0,0,1,1,0,1,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
    [0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
    [0,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0],
    [0,0,1,0,0,0,0,0,0,0,0,0,0,1,0,0],
  ];
  const PX = 9;
  return (
    <div style={{ lineHeight:0 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display:"flex" }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{ width:PX, height:PX, background: cell ? "#ffffff" : "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
