"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { useContractWrite } from "@/lib/useContractWrite";
import { formatEther, parseEther, parseAbiItem } from "viem";
import ConnectButton from "@/components/ConnectButton";
import NftModal from "@/components/NftModal";
import { CONTRACTS } from "@/lib/config";
import { SIMPLE_MARKET_ABI, MARKETPLACE_ABI, RARITY_ABI } from "@/lib/abis";

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab      = "listings" | "activity" | "offers";
type SortBy   = "price_asc" | "price_desc" | "id_asc" | "id_desc";
type ViewMode = "grid" | "list";
type TxMode   = "buy" | "offer" | "collectionOffer" | null;

interface Listing {
  tokenId: bigint;
  id: number;
  price: bigint;
  seller: `0x${string}`;
  tier?: string;
  rank?: number;
  score?: number;
}

interface SaleRecord {
  tokenId: number;
  seller: string;
  buyer: string;
  price: bigint;
  blockNumber: number;
  txHash: string;
}

type ModalNft = { id: number; tier?: string; rank?: number; score?: number; price?: bigint; seller?: `0x${string}` };

const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#059669", Uncommon: "#a16207", Common: "#475569",
};
const TIER_BG: Record<string, string> = {
  Legendary: "#ede9fe", Epic: "#dbeafe", Rare: "#d4f5e9", Uncommon: "#fef3c7", Common: "#f1f5f9",
};

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

// ── Buy Success Popup ──────────────────────────────────────────────────────────
function BuySuccessPopup({ id, price, txHash, onClose }: {
  id: number; price: bigint; txHash: string; onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 10_000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:10000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div style={{ background:"#fff", maxWidth:380, width:"100%", textAlign:"center",
        padding:"40px 32px" }}
        onClick={e => e.stopPropagation()}>
        {/* Checkmark */}
        <div style={{ width:64, height:64, background:"#0f1419", borderRadius:"50%",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M5 13L9 17L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.12em", color:"#16a34a",
          textTransform:"uppercase", marginBottom:8 }}>Purchase Successful</div>
        <div style={{ fontFamily:"monospace", fontSize:28, fontWeight:800, color:"#0f1419",
          marginBottom:6 }}>TAO CAT #{id}</div>
        <div style={{ fontSize:13, color:"#5a6478", fontWeight:700, marginBottom:20 }}>
          You paid <span style={{ color:"#0f1419", fontFamily:"monospace" }}>
            τ {parseFloat(formatEther(price)).toFixed(3)}
          </span>
        </div>
        <div style={{ fontSize:9, color:"#9aa0ae", fontFamily:"monospace", marginBottom:28,
          wordBreak:"break-all" }}>
          TX: {txHash.slice(0,20)}...{txHash.slice(-8)}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <Link href="/dashboard"
            style={{ flex:1, padding:"12px", background:"#0f1419", color:"#fff",
              fontSize:9, fontWeight:800, letterSpacing:"0.10em", textTransform:"uppercase",
              textDecoration:"none", display:"block", textAlign:"center" }}>
            VIEW IN DASHBOARD
          </Link>
          <button onClick={onClose}
            style={{ flex:1, padding:"12px", background:"transparent",
              border:"2px solid #0f1419", fontSize:9, fontWeight:800,
              letterSpacing:"0.10em", textTransform:"uppercase", cursor:"pointer",
              color:"#0f1419" }}>
            CONTINUE
          </button>
        </div>
      </div>
    </div>
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

  // Buy success popup
  const [buySuccess, setBuySuccess]   = useState<{ id: number; price: bigint; txHash: string } | null>(null);
  const [buyingId, setBuyingId]       = useState<number | null>(null);
  const [txMode, setTxMode]           = useState<TxMode>(null);

  // Activity
  const [sales, setSales]             = useState<SaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Offers form
  const [offerTokenId, setOfferTokenId] = useState("");
  const [offerPrice, setOfferPrice]     = useState("");
  const [offerDays, setOfferDays]       = useState("7");
  const [offerType, setOfferType]       = useState<"nft"|"collection">("nft");
  const [offerSuccess, setOfferSuccess] = useState(false);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => { setSidebarOpen(window.innerWidth >= 768); }, []);

  // ── Contract reads ──────────────────────────────────────────────────────────
  const marketAddr    = (CONTRACTS.SIMPLE_MARKET ?? "") as `0x${string}`;
  const oldMarketAddr = (CONTRACTS.MARKETPLACE   ?? "") as `0x${string}`;
  const nftAddr       = (CONTRACTS.NFT           ?? "") as `0x${string}`;

  const { data: pageData, refetch: refetchListings } = useReadContract({
    address: marketAddr, abi: SIMPLE_MARKET_ABI,
    functionName: "getPage",
    args: [BigInt(0), BigInt(500)],
    query: { enabled: !!marketAddr },
  });

  const [tokenIds, sellers, prices] =
    (pageData as [bigint[], `0x${string}`[], bigint[]]) ?? [[], [], []];

  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY as `0x${string}`, abi: RARITY_ABI, functionName: "rarityBatch",
    args: tokenIds.length > 0 ? [tokenIds as bigint[]] : undefined,
    query: { enabled: tokenIds.length > 0 && !!CONTRACTS.RARITY },
  });

  // ── Write contracts ─────────────────────────────────────────────────────────
  const { writeContract, isPending, error: writeError, reset: resetWrite, data: txHash } = useContractWrite();
  const { isSuccess: txDone, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });
  const isBusy = isPending || isConfirming;

  useEffect(() => {
    if (!txDone) return;
    if (txMode === "buy" && buyingId != null && txHash) {
      const listing = listings.find(l => l.id === buyingId);
      setBuySuccess({ id: buyingId, price: listing?.price ?? BigInt(0), txHash });
      setModalNft(null);
    }
    if (txMode === "offer" || txMode === "collectionOffer") {
      setOfferSuccess(true);
      setOfferPrice("");
      setOfferTokenId("");
    }
    setBuyingId(null);
    setTxMode(null);
    refetchListings();
    resetWrite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txDone]);

  // ── Activity: fetch Sold events ─────────────────────────────────────────────
  useEffect(() => {
    if (!publicClient || !marketAddr || tab !== "activity") return;
    setLoadingSales(true);
    setSales([]);
    publicClient.getLogs({
      address: marketAddr,
      event: parseAbiItem("event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)"),
      fromBlock: BigInt(0),
    }).then(logs => {
      const parsed: SaleRecord[] = [...logs].reverse().slice(0, 100).map(log => ({
        tokenId:     Number((log.args as { tokenId: bigint }).tokenId),
        seller:      (log.args as { seller: string }).seller,
        buyer:       (log.args as { buyer: string }).buyer,
        price:       (log.args as { price: bigint }).price,
        blockNumber: Number(log.blockNumber),
        txHash:      log.transactionHash ?? "",
      }));
      setSales(parsed);
    }).catch(() => setSales([]))
      .finally(() => setLoadingSales(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, marketAddr]);

  // ── Listings ────────────────────────────────────────────────────────────────
  const listings = useMemo((): Listing[] => {
    return tokenIds.map((tid, i) => ({
      tokenId: tid,
      id:      Number(tid),
      price:   prices[i] as bigint,
      seller:  sellers[i] as `0x${string}`,
      tier:    rarityBatch?.[2]?.[i] as string | undefined,
      rank:    rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined,
      score:   rarityBatch?.[0]?.[i] ? Number(rarityBatch[0][i]) : undefined,
    }));
  }, [tokenIds, sellers, prices, rarityBatch]);

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

  const floorPrice = prices.length > 0
    ? formatEther(prices.reduce((min, p) => p < min ? p : min, prices[0]))
    : null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleBuy(tokenId: bigint, id: number) {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;
    setBuyingId(id);
    setTxMode("buy");
    writeContract({
      address: marketAddr, abi: SIMPLE_MARKET_ABI,
      functionName: "buy", args: [tokenId], value: listing.price,
    });
  }

  function handleMakeOfferFromModal(tokenId: number, offerPriceStr: string, days: number) {
    if (!offerPriceStr) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
    setTxMode("offer");
    writeContract({
      address: oldMarketAddr, abi: MARKETPLACE_ABI,
      functionName: "makeOffer",
      args: [nftAddr, BigInt(tokenId), expiry],
      value: parseEther(offerPriceStr),
    });
  }

  function handleMakeCollectionOffer() {
    if (!offerPrice) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + parseInt(offerDays) * 86400);
    setTxMode("collectionOffer");
    writeContract({
      address: oldMarketAddr, abi: MARKETPLACE_ABI,
      functionName: "makeCollectionOffer",
      args: [nftAddr, expiry],
      value: parseEther(offerPrice),
    });
  }

  function handleMakeNftOffer() {
    if (!offerPrice || !offerTokenId) return;
    const expiry = BigInt(Math.floor(Date.now() / 1000) + parseInt(offerDays) * 86400);
    setTxMode("offer");
    writeContract({
      address: oldMarketAddr, abi: MARKETPLACE_ABI,
      functionName: "makeOffer",
      args: [nftAddr, BigInt(offerTokenId), expiry],
      value: parseEther(offerPrice),
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>

      {/* Buy success popup */}
      {buySuccess && (
        <BuySuccessPopup
          id={buySuccess.id} price={buySuccess.price} txHash={buySuccess.txHash}
          onClose={() => setBuySuccess(null)}
        />
      )}

      {/* NFT Detail Modal */}
      {modalNft && (
        <NftModal
          id={modalNft.id}
          tier={modalNft.tier}
          rank={modalNft.rank}
          score={modalNft.score}
          price={modalNft.price}
          seller={modalNft.seller}
          isConnected={isConnected}
          userAddress={address}
          onBuy={() => handleBuy(BigInt(modalNft.id), modalNft.id)}
          onMakeOffer={(price, days) => handleMakeOfferFromModal(modalNft.id, price, days)}
          isBuying={isBusy && buyingId === modalNft.id}
          onClose={() => setModalNft(null)}
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
                { l:"SALES",  v: sales.length || "—" },
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

        {/* ────────── LISTINGS TAB ────────── */}
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
                      style={{ border:"1.5px solid #eee", background:"#fff", cursor:"pointer",
                        transition:"border-color 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor="#000")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor="#eee")}>
                      <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative", overflow:"hidden" }}>
                        <Image src={`/samples/${l.id % 12 + 1}.png`} alt={`#${l.id}`} fill style={{ objectFit:"cover" }} />
                        {l.rank && (
                          <div style={{ position:"absolute", top:0, right:0, padding:"5px 8px",
                            background:"#0f1419", color:"#fff", fontSize:9, fontWeight:800 }}>
                            #{l.rank}
                          </div>
                        )}
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
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                          <span style={{ fontWeight:800, fontSize:12, fontFamily:"monospace" }}>#{l.id}</span>
                          {l.rank && <span style={{ fontSize:8, color:"#9aa0ae", fontWeight:700 }}>#{l.rank}</span>}
                        </div>
                        <div style={{ fontSize:14, fontWeight:800, fontFamily:"monospace", marginBottom:8 }}>
                          τ {parseFloat(formatEther(l.price)).toFixed(3)}
                        </div>
                        {isConnected ? (
                          <button
                            onClick={e => { e.stopPropagation(); handleBuy(l.tokenId, l.id); }}
                            disabled={isBusy && buyingId === l.id}
                            style={{ width:"100%", padding:"8px", background:"#000", color:"#fff",
                              border:"none", fontSize:9, fontWeight:800, cursor:"pointer",
                              letterSpacing:"0.08em" }}>
                            {isBusy && buyingId === l.id ? "..." : "BUY NOW"}
                          </button>
                        ) : (
                          <div style={{ fontSize:9, color:"#9aa0ae", fontWeight:700,
                            textAlign:"center", padding:"8px 0" }}>
                            CONNECT TO BUY
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
                      {isConnected && (
                        <button
                          onClick={e => { e.stopPropagation(); handleBuy(l.tokenId, l.id); }}
                          disabled={isBusy && buyingId === l.id}
                          style={{ padding:"8px 16px", background:"#000", color:"#fff", border:"none",
                            fontSize:9, fontWeight:800, cursor:"pointer", flexShrink:0 }}>
                          {isBusy && buyingId === l.id ? "..." : "BUY"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ────────── ACTIVITY TAB ────────── */}
        {tab === "activity" && (
          <div style={{ paddingTop:24 }}>
            <div style={{ fontSize:10, fontWeight:800, letterSpacing:"0.10em",
              marginBottom:20, color:"#0f1419" }}>RECENT SALES</div>

            {loadingSales ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#9aa0ae",
                fontSize:11, fontWeight:700 }}>
                Loading sales...
              </div>
            ) : sales.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", border:"2px dashed #eee" }}>
                <div style={{ display:"inline-block", opacity:0.2, marginBottom:16 }}>
                  <PixelCatSilhouette size={64} />
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.1em" }}>
                  NO SALES YET
                </div>
                <p style={{ fontSize:11, color:"#9aa0ae", marginTop:8 }}>
                  First sales will appear here once NFTs are bought and sold.
                </p>
              </div>
            ) : (
              <>
                {/* Header row */}
                <div style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr 1fr 100px",
                  gap:0, background:"#0f1419", padding:"8px 16px",
                  fontSize:8, fontWeight:800, color:"#9aa0ae", letterSpacing:"0.10em" }}>
                  <div>NFT</div>
                  <div>PRICE</div>
                  <div>FROM</div>
                  <div>TO</div>
                  <div>TX</div>
                </div>
                <div style={{ border:"1.5px solid #eee", borderTop:"none" }}>
                  {sales.map((s, i) => (
                    <div key={i}
                      style={{ display:"grid", gridTemplateColumns:"60px 1fr 1fr 1fr 100px",
                        gap:0, padding:"12px 16px", alignItems:"center",
                        borderBottom: i < sales.length-1 ? "1px solid #f0f1f4" : "none",
                        transition:"background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background="#f7f8fa")}
                      onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                      {/* NFT image + id */}
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:32, height:32, background:"#f7f8fa",
                          position:"relative", flexShrink:0, overflow:"hidden" }}>
                          <Image src={`/samples/${s.tokenId % 12 + 1}.png`} alt=""
                            fill style={{ objectFit:"cover" }} />
                        </div>
                        <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:800 }}>
                          #{s.tokenId}
                        </span>
                      </div>
                      {/* Price */}
                      <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:800, color:"#0f1419" }}>
                        τ {parseFloat(formatEther(s.price)).toFixed(3)}
                      </div>
                      {/* Seller */}
                      <div style={{ fontSize:10, fontFamily:"monospace", color:"#5a6478" }}>
                        {s.seller.slice(0,6)}...{s.seller.slice(-4)}
                      </div>
                      {/* Buyer */}
                      <div style={{ fontSize:10, fontFamily:"monospace", color:"#5a6478" }}>
                        {s.buyer.slice(0,6)}...{s.buyer.slice(-4)}
                      </div>
                      {/* TX */}
                      <div style={{ fontSize:9, fontFamily:"monospace", color:"#9aa0ae",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {s.txHash.slice(0,10)}...
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ────────── OFFERS TAB ────────── */}
        {tab === "offers" && (
          <div style={{ paddingTop:32 }}>
            {!isConnected ? (
              <div style={{ textAlign:"center", padding:80, border:"2px dashed #eee" }}>
                <p style={{ marginBottom:24, fontWeight:700, color:"#5a6478" }}>
                  Connect wallet to make offers
                </p>
                <ConnectButton />
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48 }} className="about-grid">
                {/* Offer form */}
                <div style={{ border:"2px solid #000", padding:32 }}>
                  <div style={{ fontSize:10, fontWeight:800, marginBottom:24, letterSpacing:"0.10em" }}>
                    MAKE AN OFFER
                  </div>

                  {/* Type toggle */}
                  <div style={{ display:"flex", border:"1.5px solid #000", marginBottom:20 }}>
                    <button onClick={() => { setOfferType("nft"); setOfferSuccess(false); }}
                      style={{ flex:1, padding:"8px", background: offerType==="nft"?"#000":"#fff",
                        color: offerType==="nft"?"#fff":"#000", border:"none", cursor:"pointer",
                        fontSize:9, fontWeight:800 }}>
                      NFT OFFER
                    </button>
                    <button onClick={() => { setOfferType("collection"); setOfferSuccess(false); }}
                      style={{ flex:1, padding:"8px", background: offerType==="collection"?"#000":"#fff",
                        color: offerType==="collection"?"#fff":"#000", border:"none", cursor:"pointer",
                        fontSize:9, fontWeight:800 }}>
                      COLLECTION OFFER
                    </button>
                  </div>

                  {offerType === "nft" && (
                    <div style={{ marginBottom:14 }}>
                      <label style={{ fontSize:9, fontWeight:800, color:"#9aa0ae", display:"block",
                        marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        Token ID
                      </label>
                      <input value={offerTokenId} onChange={e => setOfferTokenId(e.target.value)}
                        placeholder="e.g. 42"
                        style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #eee",
                          fontSize:13, fontFamily:"monospace", boxSizing:"border-box" }} />
                    </div>
                  )}

                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:9, fontWeight:800, color:"#9aa0ae", display:"block",
                      marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      Offer Price (TAO)
                    </label>
                    <input value={offerPrice} onChange={e => setOfferPrice(e.target.value)}
                      placeholder="0.00"
                      style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #eee",
                        fontSize:13, fontFamily:"monospace", boxSizing:"border-box" }} />
                  </div>

                  <div style={{ marginBottom:24 }}>
                    <label style={{ fontSize:9, fontWeight:800, color:"#9aa0ae", display:"block",
                      marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      Expires In
                    </label>
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

                  <button
                    onClick={offerType === "nft" ? handleMakeNftOffer : handleMakeCollectionOffer}
                    disabled={isBusy || !offerPrice || (offerType === "nft" && !offerTokenId)}
                    style={{ width:"100%", padding:14, background:"#000", color:"#fff", border:"none",
                      fontSize:10, fontWeight:800, letterSpacing:"0.10em", cursor:"pointer",
                      opacity: (!offerPrice || (offerType === "nft" && !offerTokenId)) ? 0.5 : 1,
                      textTransform:"uppercase" }}>
                    {isBusy ? "CONFIRMING..." : `MAKE ${offerType.toUpperCase()} OFFER`}
                  </button>

                  {writeError && (
                    <div style={{ marginTop:12, padding:"8px 12px", background:"#fff0f0",
                      border:"1px solid #ef4444", fontSize:9, color:"#b91c1c", fontWeight:700,
                      wordBreak:"break-word" }}>
                      {(writeError as Error).message?.slice(0, 200)}
                    </div>
                  )}
                  {offerSuccess && (
                    <div style={{ marginTop:12, padding:"12px 16px", background:"#f0fdf4",
                      border:"2px solid #16a34a", fontSize:10, color:"#166534", fontWeight:800,
                      textAlign:"center" }}>
                      ✓ Offer submitted! The NFT owner will be notified.
                    </div>
                  )}

                  <div style={{ marginTop:14, padding:"10px 12px", background:"#f7f8fa",
                    border:"1px solid #f0f1f4", fontSize:8, color:"#9aa0ae", fontWeight:700,
                    lineHeight:1.6 }}>
                    Your TAO is locked in the contract until the offer is accepted or you cancel it.
                    Offers expire automatically after the selected duration.
                  </div>
                </div>

                {/* How offers work */}
                <div>
                  <div style={{ fontSize:10, fontWeight:800, marginBottom:16, letterSpacing:"0.10em" }}>
                    HOW OFFERS WORK
                  </div>
                  {[
                    { t:"NFT Offer", d:"Offer a specific price for a single token by entering its ID. Funds are locked in the contract until accepted or cancelled." },
                    { t:"Collection Offer", d:"Offer to buy any TAO Cat at your price. The first seller to accept gets the deal — you receive a random cat from the collection." },
                    { t:"Accept Offer", d:"NFT owners can accept any active offer on their token directly from their dashboard." },
                    { t:"Cancel Anytime", d:"Cancel your offer before expiry to get your TAO back instantly. No fees on cancellation." },
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
