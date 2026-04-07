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
  Legendary: "#000", Epic: "#000", Rare: "#000", Uncommon: "#000", Common: "#000",
};

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div style={{ background:"#ffffff", minHeight:"100vh", padding:80, textAlign:"center", fontSize:12, color:"#9aa0ae", letterSpacing:"0.1em" }}>
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
  function handleList() {
    if (!sellId || !sellPrice) return;
    writeContract({ address: CONTRACTS.MARKETPLACE, abi: MARKETPLACE_ABI, functionName: "list", args: [BigInt(sellId), parseEther(sellPrice)] });
  }

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom:"4px solid #0f1419", background:"#fff" }}>
        <div className="container-app">
          <div style={{ display:"flex", alignItems:"center", gap:16, padding:"40px 0" }}>
            <div style={{ width:64, height:64, border:"3px solid #0f1419", overflow:"hidden" }}>
              <Image src="/samples/1.png" alt={COLLECTION_NAME} width={64} height={64} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <div>
              <h1 style={{ fontSize:24, marginBottom:4 }}>{COLLECTION_NAME} Market</h1>
              <div style={{ display:"flex", gap:12, fontSize:11, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.1em" }}>
                <span>4,699 Genesis Cats</span>
                <span>Chain 964</span>
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:2, overflowX:"auto", borderTop:"2px solid #0f1419" }}>
            {[
              { label:"Floor", value: floorPrice ? `τ ${parseFloat(formatEther(floorPrice)).toFixed(2)}` : `τ ${MINT_PRICE}` },
              { label:"Listed", value: listings.length },
              { label:"Total Minted", value: minted.toLocaleString() },
              { label:"Market Fee", value: "2.5%" }
            ].map(s => (
              <div key={s.label} style={{ padding:"16px 24px", borderRight:"2px solid #f0f1f4", flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:700 }}>{s.value}</div>
                <div style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", borderTop:"2px solid #f0f1f4" }}>
            {(["listings","activity","sell"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding:"14px 24px", background:"transparent", border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em",
                  color: tab === t ? "#0f1419" : "#9aa0ae",
                  borderBottom: tab === t ? "4px solid #0f1419" : "4px solid transparent",
                }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-app" style={{ padding:"40px 0" }}>
        
        {/* ── BROWSE TAB ── */}
        {tab === "listings" && (
          <div style={{ display:"flex", gap:40, flexDirection: sidebarOpen ? "row" : "column" }} className="responsive-flex">
            <style jsx>{`
              @media (max-width: 768px) {
                .responsive-flex { flex-direction: column !important; }
                .sidebar { width: 100% !important; }
              }
            `}</style>

            {/* Sidebar */}
            {sidebarOpen && (
              <div className="sidebar" style={{ width:240, flexShrink:0 }}>
                <div style={{ marginBottom:32 }}>
                  <h3 className="section-label" style={{ marginBottom:16 }}>Rarity Tier</h3>
                  <div style={{ display:"grid", gap:8 }}>
                    {["all","Legendary","Epic","Rare","Uncommon","Common"].map(tier => (
                      <button key={tier} onClick={() => setFilterTier(tier)}
                        className="pixel-border"
                        style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, textTransform:"uppercase",
                          background: filterTier === tier ? "#0f1419" : "#fff",
                          color: filterTier === tier ? "#fff" : "#0f1419"
                        }}>
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="section-label" style={{ marginBottom:16 }}>Price Filter</h3>
                  <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                    placeholder="Max TAO" type="number" step="0.01" className="pixel-border"
                    style={{ width:"100%", padding:10, fontSize:12, outline:"none" }} />
                </div>
              </div>
            )}

            {/* Main Content */}
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:32, flexWrap:"wrap", gap:16 }}>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-outline" style={{ padding:"8px 16px" }}>
                  {sidebarOpen ? "Hide Filters" : "Show Filters"}
                </button>
                <div style={{ display:"flex", gap:12 }}>
                  <select value={sort} onChange={e => setSort(e.target.value as SortBy)} 
                    className="pixel-border" style={{ padding:"8px 12px", fontSize:11, fontWeight:700 }}>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <div className="pixel-border" style={{ display:"flex" }}>
                    <button onClick={() => setView("grid")} style={{ padding:"8px 12px", background: view === "grid" ? "#0f1419" : "#fff", color: view === "grid" ? "#fff" : "#0f1419", border:"none" }}>GRID</button>
                    <button onClick={() => setView("list")} style={{ padding:"8px 12px", background: view === "list" ? "#0f1419" : "#fff", color: view === "list" ? "#fff" : "#0f1419", border:"none" }}>LIST</button>
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:100, border:"2px dashed #f0f1f4", color:"#9aa0ae" }}>No results matching your filters</div>
              ) : (
                <div className={view === "grid" ? "responsive-grid grid-cols-4" : ""}>
                  {filtered.map(l => (
                    <div key={l.tokenId.toString()} 
                      className={view === "grid" ? "pixel-border brutal-shadow-hover" : ""}
                      style={view === "list" ? { display:"flex", alignItems:"center", padding:16, borderBottom:"2px solid #f0f1f4", gap:20 } : {}}>
                      
                      <div style={view === "grid" ? { aspectRatio:"1/1", background:"#f7f8fa" } : { width:48, height:48, border:"2px solid #0f1419" }}>
                        <Image src={`/samples/${Number(l.tokenId) % 12 + 1}.png`} alt="" width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      </div>
                      
                      <div style={{ flex:1, padding: view === "grid" ? 16 : 0 }}>
                        <div style={{ fontWeight:800, fontSize: view === "grid" ? 14 : 16 }}>#{l.id}</div>
                        <div style={{ fontSize:10, color:"#9aa0ae", textTransform:"uppercase", marginBottom: view === "grid" ? 12 : 0 }}>Genesis Pool</div>
                        {view === "list" && <div style={{ fontWeight:700, fontSize:14 }}>τ {parseFloat(formatEther(l.price)).toFixed(2)}</div>}
                      </div>

                      <div style={view === "grid" ? { padding:"0 16px 16px" } : {}}>
                        {view === "grid" && <div style={{ fontWeight:800, fontSize:18, marginBottom:12 }}>τ {parseFloat(formatEther(l.price)).toFixed(2)}</div>}
                        <button onClick={() => handleBuy(l.tokenId, l.price)} 
                          className="btn-primary" 
                          style={{ width: view === "grid" ? "100%" : "auto", padding:"8px 24px" }}>
                          BUY
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SELL TAB ── */}
        {tab === "sell" && (
          <div className="responsive-grid grid-cols-2" style={{ alignItems:"start" }}>
            <div className="pixel-border" style={{ padding:32 }}>
              <h2 style={{ fontSize:20, marginBottom:24 }}>Your Inventory</h2>
              {!isConnected ? (
                <div style={{ textAlign:"center", padding:40 }}>
                  <p style={{ marginBottom:24, color:"#9aa0ae" }}>Connect wallet to view your cats</p>
                  <ConnectButton />
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(80px, 1fr))", gap:8 }}>
                  {myTokens?.map(id => (
                    <div key={id.toString()} onClick={() => setSellId(id.toString())}
                      className="pixel-border brutal-shadow-hover"
                      style={{ cursor:"pointer", background: sellId === id.toString() ? "#0f1419" : "#fff", height:80 }}>
                      <Image src={`/samples/${Number(id) % 12 + 1}.png`} alt="" width={80} height={80} style={{ width:"100%", height:"100%", objectFit:"cover", opacity: sellId === id.toString() ? 0.5 : 1 }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pixel-border" style={{ padding:32, background:"#f7f8fa" }}>
              <h2 style={{ fontSize:20, marginBottom:24 }}>List Item</h2>
              <div style={{ display:"grid", gap:20 }}>
                <div>
                  <label className="section-label" style={{ marginBottom:8, display:"block" }}>Token ID</label>
                  <input value={sellId} onChange={e => setSellId(e.target.value)} placeholder="0" className="pixel-border" style={{ width:"100%", padding:12 }} />
                </div>
                <div>
                  <label className="section-label" style={{ marginBottom:8, display:"block" }}>Price (TAO)</label>
                  <input value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="0.00" className="pixel-border" style={{ width:"100%", padding:12 }} />
                </div>
                <button onClick={handleList} disabled={!sellId || !sellPrice || isPending} className="btn-primary" style={{ marginTop:12 }}>
                  {isPending ? "CONFIRMING..." : "LIST FOR SALE"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {tab === "activity" && (
          <div style={{ textAlign:"center", padding:120, border:"4px solid #f0f1f4" }}>
            <h2 style={{ fontSize:24, color:"#9aa0ae" }}>ON-CHAIN ACTIVITY LOG COMING SOON</h2>
          </div>
        )}
      </div>
    </div>
  );
}
