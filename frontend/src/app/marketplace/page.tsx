"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import NftModal from "@/components/NftModal";
import { CONTRACTS } from "@/lib/config";
import { MARKETPLACE_ABI, NFT_ABI, RARITY_ABI } from "@/lib/abis";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab      = "listings" | "activity" | "offers";
type SortBy   = "price_asc" | "price_desc" | "id_asc" | "id_desc";
type ViewMode = "grid" | "list";

interface Listing {
  tokenId: bigint;
  id: number;
  price: bigint;
  seller: `0x${string}`;
  tier?: string;
  rank?: number;
  score?: number;
}

type ModalNft = { id: number; tier?: string; rank?: number; score?: number; price?: bigint; seller?: string };

const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#059669",
  Uncommon: "#a16207", Common: "#475569",
};
const TIER_BG: Record<string, string> = {
  Legendary: "#ede9fe", Epic: "#dbeafe", Rare: "#d4f5e9",
  Uncommon: "#fef3c7", Common: "#f1f5f9",
};

// ── Pixel Cat SVG ──────────────────────────────────────────────────────────────
function PixelCatSilhouette({ size = 100 }: { size?: number }) {
  const rows = ["000000011110000000111100","000000111111000011111100","000001111111100111111111","000001111111101111111111","000001111111111111111110","111111111111111111111111","111111110001111110001111","011111110001111110001111","001111111111111111111100"];
  const cols = 24;
  return (
    <svg width={size} height={Math.round(size * rows.length / cols)} viewBox={`0 0 ${cols} ${rows.length}`} fill="#fff" shapeRendering="crispEdges">
      {rows.map((row, r) => row.split("").map((c, ci) => c === "1" ? <rect key={`${r}-${ci}`} x={ci} y={r} width={1} height={1} /> : null))}
    </svg>
  );
}

function VerifiedBadge() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L15.09 5.26L19.18 4.5L19.94 8.59L23.2 11.68L19.94 14.77L19.18 18.86L15.09 18.1L12 21.36L8.91 18.1L4.82 18.86L4.06 14.77L0.8 11.68L4.06 8.59L4.82 4.5L8.91 5.26L12 2Z" fill="#000"/>
      <path d="M9 12L11 14L15 10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  return (
    <Suspense fallback={<div style={{ padding:100, textAlign:"center", fontWeight:700 }}>LOADING...</div>}>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return (t === "activity" || t === "offers") ? t as Tab : "listings";
  });
  const [sort, setSort]               = useState<SortBy>("price_asc");
  const [view, setView]               = useState<ViewMode>("grid");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterTier, setFilterTier]   = useState("all");
  const [modalNft, setModalNft]       = useState<ModalNft | null>(null);

  // Offer form
  const [offerTokenId, setOfferTokenId] = useState("");
  const [offerPrice, setOfferPrice]     = useState("");
  const [offerDays, setOfferDays]       = useState("7");
  const [offerType, setOfferType]       = useState<"nft"|"collection">("nft");

  const { address, isConnected } = useAccount();

  useEffect(() => { setSidebarOpen(window.innerWidth >= 768); }, []);

  // ── Contract reads ────────────────────────────────────────────────────────
  const nftCollection = (CONTRACTS.NFT ?? "") as `0x${string}`;
  const marketAddr    = (CONTRACTS.MARKETPLACE ?? "") as `0x${string}`;

  const { data: listingPage, refetch: refetchListings } = useReadContract({
    address: marketAddr, abi: MARKETPLACE_ABI,
    functionName: "getListingsPage",
    args: [nftCollection, BigInt(0), BigInt(200)],
    query: { enabled: !!marketAddr && !!nftCollection },
  });

  const { data: collectionInfo } = useReadContract({
    address: marketAddr, abi: MARKETPLACE_ABI, functionName: "collections",
    args: [nftCollection], query: { enabled: !!marketAddr && !!nftCollection },
  });

  const [tokenIds, listingData] = (listingPage as [bigint[], {seller:`0x${string}`;price:bigint;active:boolean}[]]) ?? [[], []];

  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY as `0x${string}`, abi: RARITY_ABI, functionName: "rarityBatch",
    args: tokenIds.length > 0 ? [tokenIds as bigint[]] : undefined,
    query: { enabled: tokenIds.length > 0 && !!CONTRACTS.RARITY },
  });

  // ── Write contracts ────────────────────────────────────────────────────────
  const { writeContract, isPending, error: writeError, reset: resetWrite, data: txHash } = useWriteContract();
  const { isSuccess: txDone } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (txDone) { refetchListings(); resetWrite(); } }, [txDone]);

  // ── Listings ──────────────────────────────────────────────────────────────
  const listings = useMemo((): Listing[] => {
    return (tokenIds as bigint[]).map((tid, i) => {
      const l = listingData[i] as any;
      if (!l || !l.active) return null;
      return {
        tokenId: tid, id: Number(tid), price: l.price as bigint,
        seller: l.seller as `0x${string}`,
        tier:  rarityBatch?.[2]?.[i] as string | undefined,
        rank:  rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined,
        score: rarityBatch?.[0]?.[i] ? Number(rarityBatch[0][i]) : undefined,
      };
    }).filter(Boolean) as Listing[];
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

  const colInfo    = collectionInfo as [boolean,boolean,bigint,bigint,bigint] | undefined;
  const floorPrice = colInfo?.[4] ? formatEther(colInfo[4]) : null;
  const volume     = colInfo?.[2] ? parseFloat(formatEther(colInfo[2])).toFixed(2) : "0";

  const GAS = BigInt(500_000); // explicit gas — skips eth_call simulation on Bittensor RPC

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleBuy(tokenId: bigint, price: bigint) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({ address: marketAddr, abi: MARKETPLACE_ABI as any, functionName: "buy",
      args: [nftCollection, tokenId], value: price, gas: GAS });
  }

  function handleMakeOffer() {
    if (!offerPrice) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + parseInt(offerDays) * 86400);
    if (offerType === "nft" && offerTokenId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ address: marketAddr, abi: MARKETPLACE_ABI as any, functionName: "makeOffer",
        args: [nftCollection, BigInt(offerTokenId), expiry], value: parseEther(offerPrice), gas: GAS });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ address: marketAddr, abi: MARKETPLACE_ABI as any, functionName: "makeCollectionOffer",
        args: [nftCollection, expiry], value: parseEther(offerPrice), gas: GAS });
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>

      {/* NFT Detail Modal */}
      {modalNft && (
        <NftModal
          id={modalNft.id}
          tier={modalNft.tier}
          rank={modalNft.rank}
          score={modalNft.score}
          onClose={() => setModalNft(null)}
          action={
            modalNft.price != null ? (
              isConnected && modalNft.seller?.toLowerCase() !== address?.toLowerCase() ? (
                <button
                  onClick={() => { handleBuy(BigInt(modalNft.id), modalNft.price!); setModalNft(null); }}
                  disabled={isPending}
                  style={{ width:"100%", padding:"14px", background:"#0f1419", color:"#fff",
                    border:"none", fontSize:10, fontWeight:800, cursor:"pointer",
                    letterSpacing:"0.10em", textTransform:"uppercase" }}>
                  {isPending ? "CONFIRMING..." : `BUY NOW · τ ${parseFloat(formatEther(modalNft.price)).toFixed(3)}`}
                </button>
              ) : !isConnected ? (
                <ConnectButton />
              ) : (
                <div style={{ padding:"10px", background:"#f7f8fa", textAlign:"center",
                  fontSize:10, fontWeight:700, color:"#5a6478" }}>YOUR LISTING</div>
              )
            ) : undefined
          }
        />
      )}

      {/* ── BANNER ── */}
      <div style={{ background:"#000", color:"#fff", padding:"28px 20px", position:"relative", overflow:"hidden" }}>
        <div style={{ opacity:0.08, position:"absolute", left:-10, top:-15, pointerEvents:"none" }}>
          <PixelCatSilhouette size={200} />
        </div>
        <div style={{ opacity:0.08, position:"absolute", right:-10, bottom:-10, pointerEvents:"none" }}>
          <PixelCatSilhouette size={200} />
        </div>
        <div style={{ textAlign:"center", position:"relative", zIndex:1 }}>
          <h2 style={{ fontSize:"clamp(18px,4vw,28px)", fontWeight:800, letterSpacing:"-0.02em", marginBottom:6 }}>
            TAO CATS MARKETPLACE
          </h2>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, flexWrap:"wrap" }}>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.2em", color:"#5a6478" }}>GENESIS COLLECTION</span>
            <div style={{ width:3, height:3, background:"#5a6478", borderRadius:"50%" }} />
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.2em", color:"#5a6478" }}>BITTENSOR EVM · CHAIN 964</span>
            <div style={{ width:3, height:3, background:"#5a6478", borderRadius:"50%" }} />
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.2em", color:"#5a6478" }}>2.5% MARKETPLACE FEE</span>
          </div>
        </div>
      </div>

      {/* ── COLLECTION HEADER ── */}
      <div style={{ borderBottom:"2px solid #000" }}>
        <div className="container-app" style={{ padding:"20px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{ width:52, height:52, background:"#000", flexShrink:0, overflow:"hidden" }}>
              <Image src="/samples/1.png" alt="" width={52} height={52} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            </div>
            <div style={{ flex:1, minWidth:160 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <h1 style={{ fontSize:16, fontWeight:800, textTransform:"uppercase" }}>TAO CAT</h1>
                <VerifiedBadge />
              </div>
              <div style={{ fontSize:9, color:"#9aa0ae", fontWeight:700, letterSpacing:"0.08em", marginTop:2 }}>
                4,699 GENESIS CATS · CHAIN 964
              </div>
            </div>
            <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
              {[
                { l:"FLOOR",  v: floorPrice ? `τ ${parseFloat(floorPrice).toFixed(3)}` : "—" },
                { l:"LISTED", v: listings.length },
                { l:"VOLUME", v: `τ ${volume}` },
                { l:"FEE",    v: "2.5%" },
              ].map(s => (
                <div key={s.l} style={{ minWidth:60 }}>
                  <div style={{ fontSize:15, fontWeight:800, fontFamily:"monospace" }}>{s.v}</div>
                  <div style={{ fontSize:8, color:"#9aa0ae", fontWeight:800, letterSpacing:"0.06em" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ borderBottom:"2px solid #000" }}>
        <div className="container-app" style={{ display:"flex", overflowX:"auto", scrollbarWidth:"none" }}>
          {(["listings","activity","offers"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"14px 20px", background:"transparent", border:"none", cursor:"pointer",
                fontSize:10, fontWeight:800, letterSpacing:"0.10em", whiteSpace:"nowrap",
                color: tab === t ? "#000" : "#9aa0ae",
                borderBottom: tab === t ? "3px solid #000" : "3px solid transparent" }}>
              {t.toUpperCase()}
            </button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", paddingRight:4 }}>
            <Link href="/dashboard"
              style={{ padding:"8px 16px", background:"#0f1419", color:"#fff", fontSize:9,
                fontWeight:800, letterSpacing:"0.10em", textDecoration:"none",
                textTransform:"uppercase", whiteSpace:"nowrap" }}>
              LIST MY CATS →
            </Link>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="container-app" style={{ paddingTop:0, paddingBottom:80 }}>

        {/* LISTINGS TAB */}
        {tab === "listings" && (
          <div style={{ display:"flex", minHeight:"60vh" }}>
            {/* Sidebar */}
            {sidebarOpen && (
              <div className="marketplace-sidebar" style={{ width:220, borderRight:"1px solid #eee",
                padding:"24px 24px 24px 0", flexShrink:0 }}>
                <div style={{ fontSize:10, fontWeight:800, marginBottom:14, letterSpacing:"0.10em" }}>RARITY TIER</div>
                {["all","Legendary","Epic","Rare","Uncommon","Common"].map(tier => (
                  <button key={tier} onClick={() => setFilterTier(tier)}
                    style={{ display:"block", width:"100%", textAlign:"left", padding:"7px 12px",
                      border: filterTier === tier ? "1.5px solid #000" : "1.5px solid transparent",
                      background: filterTier === tier ? "#000" : "transparent",
                      color: filterTier === tier ? "#fff" : "#5a6478",
                      fontSize:10, fontWeight:700, marginBottom:3, cursor:"pointer",
                      textTransform:"uppercase", letterSpacing:"0.06em" }}>
                    {tier === "all" ? "All Tiers" : tier}
                    {tier !== "all" && (
                      <span style={{ float:"right", opacity:0.5, fontSize:8 }}>
                        {listings.filter(l => l.tier === tier).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex:1, paddingTop:20 }}>
              {/* Controls */}
              <div className="marketplace-controls" style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:8 }}>
                <button onClick={() => setSidebarOpen(!sidebarOpen)}
                  style={{ padding:"6px 12px", border:"1.5px solid #000", fontSize:9, fontWeight:800, cursor:"pointer", background:"#fff" }}>
                  {sidebarOpen ? "HIDE FILTERS" : "SHOW FILTERS"}
                </button>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <span style={{ fontSize:9, color:"#9aa0ae", fontWeight:700 }}>
                    {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                  </span>
                  <select value={sort} onChange={e => setSort(e.target.value as SortBy)}
                    style={{ padding:"6px 10px", border:"1.5px solid #000", fontSize:9, fontWeight:800, background:"#fff" }}>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price_desc">Price: High → Low</option>
                    <option value="id_asc">ID: Low → High</option>
                    <option value="id_desc">ID: High → Low</option>
                  </select>
                  <div style={{ display:"flex", border:"1.5px solid #000" }}>
                    <button onClick={() => setView("grid")} style={{ padding:"6px 10px",
                      background: view==="grid"?"#000":"#fff", color: view==="grid"?"#fff":"#000",
                      border:"none", cursor:"pointer", fontSize:9, fontWeight:800 }}>GRID</button>
                    <button onClick={() => setView("list")} style={{ padding:"6px 10px",
                      background: view==="list"?"#000":"#fff", color: view==="list"?"#fff":"#000",
                      border:"none", cursor:"pointer", fontSize:9, fontWeight:800 }}>LIST</button>
                  </div>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div style={{ textAlign:"center", padding:"80px 20px", border:"2px dashed #eee" }}>
                  <PixelCatSilhouette size={64} />
                  <div style={{ marginTop:20, fontSize:11, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.1em" }}>
                    NO LISTINGS YET
                  </div>
                  <p style={{ fontSize:11, color:"#9aa0ae", marginTop:8 }}>
                    Own a TAO Cat?{" "}
                    <Link href="/dashboard" style={{ color:"#0f1419", fontWeight:700 }}>List it from your dashboard →</Link>
                  </p>
                </div>
              ) : view === "grid" ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:8 }}>
                  {filtered.map(l => (
                    <div key={l.id}
                      onClick={() => setModalNft({ id:l.id, tier:l.tier, rank:l.rank, score:l.score, price:l.price, seller:l.seller })}
                      style={{ border:"1.5px solid #eee", background:"#fff",
                        transition:"border-color 0.1s", cursor:"pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor="#000")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor="#eee")}>
                      <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative", overflow:"hidden" }}>
                        <Image src={`/samples/${l.id % 12 + 1}.png`} alt={`#${l.id}`} fill style={{ objectFit:"cover" }} />
                        {/* Rank badge — top right, prominent */}
                        {l.rank && (
                          <div style={{ position:"absolute", top:0, right:0, padding:"5px 8px",
                            background:"#0f1419", color:"#fff", fontSize:9, fontWeight:800,
                            letterSpacing:"0.04em" }}>
                            #{l.rank}
                          </div>
                        )}
                        {/* Tier badge — bottom left */}
                        {l.tier && (
                          <div style={{ position:"absolute", bottom:6, left:6, padding:"3px 8px",
                            background: TIER_BG[l.tier] ?? "#f1f5f9",
                            color: TIER_COLOR[l.tier] ?? "#475569",
                            fontSize:8, fontWeight:800, letterSpacing:"0.06em" }}>
                            {l.tier.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                          <span style={{ fontWeight:800, fontSize:12, fontFamily:"monospace" }}>#{l.id}</span>
                          {l.rank && (
                            <span style={{ fontSize:8, color:"#9aa0ae", fontWeight:700 }}>RANK #{l.rank}</span>
                          )}
                        </div>
                        <div style={{ fontSize:14, fontWeight:800, fontFamily:"monospace", marginBottom:8 }}>
                          τ {parseFloat(formatEther(l.price)).toFixed(3)}
                        </div>
                        {isConnected && l.seller.toLowerCase() !== address?.toLowerCase() ? (
                          <button
                            onClick={e => { e.stopPropagation(); handleBuy(l.tokenId, l.price); }}
                            disabled={isPending}
                            style={{ width:"100%", padding:"8px", background:"#000", color:"#fff",
                              border:"none", fontSize:9, fontWeight:800, cursor:"pointer",
                              letterSpacing:"0.08em" }}>
                            {isPending ? "..." : "BUY NOW"}
                          </button>
                        ) : (
                          <div style={{ fontSize:9, color:"#9aa0ae", fontWeight:700, textAlign:"center", padding:"8px 0" }}>
                            {l.seller.toLowerCase() === address?.toLowerCase() ? "YOUR LISTING" : "CONNECT TO BUY"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List view */
                <div style={{ border:"1.5px solid #eee" }}>
                  {filtered.map((l, i) => (
                    <div key={l.id}
                      onClick={() => setModalNft({ id:l.id, tier:l.tier, rank:l.rank, score:l.score, price:l.price, seller:l.seller })}
                      style={{ display:"flex", alignItems:"center", gap:16, padding:"12px 16px",
                        borderBottom: i < filtered.length-1 ? "1px solid #eee" : "none",
                        cursor:"pointer", transition:"background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="#f7f8fa")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                      <div style={{ width:48, height:48, background:"#f7f8fa", position:"relative", flexShrink:0 }}>
                        <Image src={`/samples/${l.id % 12 + 1}.png`} alt="" fill style={{ objectFit:"cover" }} />
                      </div>
                      <span style={{ fontFamily:"monospace", fontWeight:800, fontSize:13, flex:1 }}>#{l.id}</span>
                      {l.tier && (
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px",
                          background: TIER_BG[l.tier] ?? "#f1f5f9",
                          color: TIER_COLOR[l.tier] ?? "#475569" }}>
                          {l.tier.toUpperCase()}
                        </span>
                      )}
                      {l.rank && (
                        <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px",
                          background:"#0f1419", color:"#fff" }}>
                          #{l.rank}
                        </span>
                      )}
                      <span style={{ fontFamily:"monospace", fontWeight:800, fontSize:14 }}>
                        τ {parseFloat(formatEther(l.price)).toFixed(3)}
                      </span>
                      {isConnected && l.seller.toLowerCase() !== address?.toLowerCase() && (
                        <button
                          onClick={e => { e.stopPropagation(); handleBuy(l.tokenId, l.price); }}
                          disabled={isPending}
                          style={{ padding:"8px 16px", background:"#000", color:"#fff", border:"none",
                            fontSize:9, fontWeight:800, cursor:"pointer", flexShrink:0 }}>
                          BUY
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {tab === "activity" && (
          <div style={{ paddingTop:40, textAlign:"center" }}>
            <div style={{ display:"inline-block", opacity:0.3, marginBottom:24 }}>
              <PixelCatSilhouette size={80} />
            </div>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.10em", color:"#9aa0ae" }}>
              ACTIVITY LOG — COMING SOON
            </div>
            <p style={{ fontSize:11, color:"#9aa0ae", marginTop:8 }}>
              Live trading activity will appear here once the indexer is deployed.
            </p>
          </div>
        )}

        {/* OFFERS TAB */}
        {tab === "offers" && (
          <div style={{ paddingTop:32 }}>
            {!isConnected ? (
              <div style={{ textAlign:"center", padding:80, border:"2px dashed #eee" }}>
                <p style={{ marginBottom:24, fontWeight:700, color:"#5a6478" }}>Connect wallet to make offers</p>
                <ConnectButton />
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48 }} className="about-grid">
                <div style={{ border:"2px solid #000", padding:32 }}>
                  <div style={{ fontSize:10, fontWeight:800, marginBottom:24, letterSpacing:"0.10em" }}>MAKE AN OFFER</div>

                  {/* Offer type toggle */}
                  <div style={{ display:"flex", border:"1.5px solid #000", marginBottom:20 }}>
                    <button onClick={() => setOfferType("nft")}
                      style={{ flex:1, padding:"8px", background: offerType==="nft"?"#000":"#fff",
                        color: offerType==="nft"?"#fff":"#000", border:"none", cursor:"pointer",
                        fontSize:9, fontWeight:800 }}>
                      NFT OFFER
                    </button>
                    <button onClick={() => setOfferType("collection")}
                      style={{ flex:1, padding:"8px", background: offerType==="collection"?"#000":"#fff",
                        color: offerType==="collection"?"#fff":"#000", border:"none", cursor:"pointer",
                        fontSize:9, fontWeight:800 }}>
                      COLLECTION OFFER
                    </button>
                  </div>

                  {offerType === "nft" && (
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontSize:9, fontWeight:800, color:"#9aa0ae", display:"block",
                        marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Token ID</label>
                      <input value={offerTokenId} onChange={e => setOfferTokenId(e.target.value)}
                        placeholder="e.g. 42"
                        style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #eee",
                          fontSize:13, fontFamily:"monospace" }} />
                    </div>
                  )}

                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:9, fontWeight:800, color:"#9aa0ae", display:"block",
                      marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Offer Price (TAO)</label>
                    <input value={offerPrice} onChange={e => setOfferPrice(e.target.value)}
                      placeholder="0.00"
                      style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #eee",
                        fontSize:13, fontFamily:"monospace" }} />
                  </div>

                  <div style={{ marginBottom:24 }}>
                    <label style={{ fontSize:9, fontWeight:800, color:"#9aa0ae", display:"block",
                      marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>Expires In</label>
                    <select value={offerDays} onChange={e => setOfferDays(e.target.value)}
                      style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #eee",
                        fontSize:11, fontWeight:700 }}>
                      <option value="1">1 Day</option>
                      <option value="3">3 Days</option>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                    </select>
                  </div>

                  <button onClick={handleMakeOffer} disabled={isPending || !offerPrice}
                    style={{ width:"100%", padding:14, background:"#000", color:"#fff", border:"none",
                      fontSize:10, fontWeight:800, letterSpacing:"0.10em", cursor:"pointer",
                      opacity: !offerPrice ? 0.5 : 1 }}>
                    {isPending ? "CONFIRMING..." : `MAKE ${offerType.toUpperCase()} OFFER`}
                  </button>

                  {writeError && (
                    <div style={{ marginTop:12, padding:"8px 12px", background:"#fff0f0",
                      border:"1px solid #ef4444", fontSize:9, color:"#b91c1c", fontWeight:700 }}>
                      {(writeError as Error).message?.slice(0, 150)}
                    </div>
                  )}
                  {txDone && (
                    <div style={{ marginTop:12, padding:"8px 12px", background:"#f0fdf4",
                      border:"1px solid #16a34a", fontSize:9, color:"#166534", fontWeight:700 }}>
                      Offer submitted successfully.
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize:10, fontWeight:800, marginBottom:16, letterSpacing:"0.10em" }}>
                    HOW OFFERS WORK
                  </div>
                  {[
                    { t:"NFT Offer", d:"Offer a specific price for a single token. Funds are locked in the contract until accepted or cancelled." },
                    { t:"Collection Offer", d:"Offer to buy any TAO Cat at your price. The first seller to accept gets the deal." },
                    { t:"Accept Offer", d:"NFT owners can accept any active offer on their token from the dashboard." },
                    { t:"Cancel Anytime", d:"Cancel your offer before expiry to get your TAO back instantly." },
                  ].map(item => (
                    <div key={item.t} style={{ marginBottom:16, paddingBottom:16, borderBottom:"1px solid #f0f1f4" }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#0f1419", marginBottom:4 }}>{item.t}</div>
                      <p style={{ fontSize:11, color:"#5a6478", lineHeight:1.7 }}>{item.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
