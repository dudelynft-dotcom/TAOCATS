"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { useContractWrite } from "@/lib/useContractWrite";
import { formatEther, parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import NftModal from "@/components/NftModal";
import { CONTRACTS } from "@/lib/config";
import { NFT_ABI, SIMPLE_MARKET_ABI, RARITY_ABI, ERC721_ABI } from "@/lib/abis";

const TIER_STYLE: Record<string, { text: string; bg: string }> = {
  Legendary: { text: "#7c3aed", bg: "#ede9fe" },
  Epic:      { text: "#1d4ed8", bg: "#dbeafe" },
  Rare:      { text: "#059669", bg: "#d4f5e9" },
  Uncommon:  { text: "#a16207", bg: "#fef3c7" },
  Common:    { text: "#475569", bg: "#f1f5f9" },
};

const MARKET = () => CONTRACTS.SIMPLE_MARKET as `0x${string}`;
const NFT    = () => CONTRACTS.NFT           as `0x${string}`;

// ── Step tracking for the 2-step listing flow ─────────────────────────────────
// "idle"     → nothing happening
// "approving" → waiting for setApprovalForAll tx
// "approved"  → approval confirmed, ready to list
// "listing"   → waiting for list tx
// "listed"    → list confirmed
type Step = "idle" | "approving" | "approved" | "listing" | "listed";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState<"owned"|"offers">("owned");
  const [modalNft, setModalNft]   = useState<{ id:number; tier?:string; rank?:number; score?:number } | null>(null);

  // Listing state — one NFT at a time
  const [listingId, setListingId] = useState<number | null>(null);
  const [listPrice, setListPrice] = useState("");
  const [step, setStep]           = useState<Step>("idle");

  // Cancel (delist) state
  const [cancelId, setCancelId]   = useState<number | null>(null);

  const { data: balData } = useBalance({ address, query: { enabled: !!address } });

  const { data: ownedTokens, refetch: refetchOwned } = useReadContract({
    address: NFT(), abi: NFT_ABI, functionName: "tokensOfOwner",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { data: totalSupply } = useReadContract({
    address: NFT(), abi: NFT_ABI, functionName: "totalSupply",
  });

  // Approval check against the NEW simple market
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT(), abi: ERC721_ABI,
    functionName: "isApprovedForAll",
    args: address ? [address, MARKET()] : undefined,
    query: { enabled: !!address && !!CONTRACTS.SIMPLE_MARKET },
  });

  // All listings from the simple market
  const { data: pageData, refetch: refetchListings } = useReadContract({
    address: MARKET(), abi: SIMPLE_MARKET_ABI, functionName: "getPage",
    args: [BigInt(0), BigInt(500)],
    query: { enabled: !!CONTRACTS.SIMPLE_MARKET },
  });

  const tokenIds = (ownedTokens ?? []) as bigint[];

  const { data: rarityBatch } = useReadContract({
    address: CONTRACTS.RARITY as `0x${string}`, abi: RARITY_ABI, functionName: "rarityBatch",
    args: tokenIds.length > 0 ? [tokenIds] : undefined,
    query: { enabled: tokenIds.length > 0 && !!CONTRACTS.RARITY },
  });

  // Map tokenId → price for tokens currently listed
  const listedMap = useMemo(() => {
    const map = new Map<number, bigint>();
    if (!pageData) return map;
    const [ids, , prices] = pageData as [bigint[], `0x${string}`[], bigint[]];
    ids.forEach((id, i) => map.set(Number(id), prices[i]));
    return map;
  }, [pageData]);

  // ── Write hook (one instance, used for all txs) ────────────────────────────
  const { writeContract, isPending, data: txHash, reset: resetWrite, error: writeError } = useContractWrite();
  const { isSuccess: txDone, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  // ── After each tx confirms ─────────────────────────────────────────────────
  useEffect(() => {
    if (!txDone) return;

    if (step === "approving") {
      // Approval confirmed → move to "approved" step, user clicks LIST manually
      refetchApproval();
      setStep("approved");
      resetWrite();
    } else if (step === "listing") {
      // List confirmed → done
      setStep("listed");
      resetWrite();
      refetchListings();
      refetchOwned();
    } else if (cancelId != null) {
      // Cancel confirmed
      setCancelId(null);
      resetWrite();
      refetchListings();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txDone]);

  const balance    = balData ? parseFloat(formatEther(balData.value)) : 0;
  const ownedCount = tokenIds.length;

  // ── Approve marketplace ────────────────────────────────────────────────────
  function handleApprove() {
    setStep("approving");
    writeContract({
      address: NFT(), abi: ERC721_ABI,
      functionName: "setApprovalForAll",
      args: [MARKET(), true],
    });
  }

  // ── List NFT ───────────────────────────────────────────────────────────────
  function handleList() {
    if (!listPrice || listingId == null) return;
    setStep("listing");
    writeContract({
      address: MARKET(), abi: SIMPLE_MARKET_ABI,
      functionName: "list",
      args: [BigInt(listingId), parseEther(listPrice)],
    });
  }

  // ── Cancel (delist) ────────────────────────────────────────────────────────
  function handleCancel(id: number) {
    setCancelId(id);
    setStep("idle");
    writeContract({
      address: MARKET(), abi: SIMPLE_MARKET_ABI,
      functionName: "cancel",
      args: [BigInt(id)],
    });
  }

  function openListForm(id: number) {
    resetWrite();
    setListingId(id);
    setListPrice("");
    setStep(isApproved ? "approved" : "idle");
  }

  function closeListForm() {
    resetWrite();
    setListingId(null);
    setListPrice("");
    setStep("idle");
  }

  const isBusy = isPending || isConfirming;

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

      {modalNft && (
        <NftModal
          id={modalNft.id} tier={modalNft.tier}
          rank={modalNft.rank} score={modalNft.score}
          onClose={() => setModalNft(null)}
        />
      )}

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
            { l:"TAO Balance",   v:`τ ${balance.toFixed(4)}` },
            { l:"Cats Owned",    v:ownedCount.toString() },
            { l:"Listed",        v: listedMap.size.toString() },
            { l:"Total Minted",  v: totalSupply ? Number(totalSupply).toLocaleString() : "—" },
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
            {(["owned","offers"] as const).map(t => (
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
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 }}>
              {tokenIds.map((tid, i) => {
                const id        = Number(tid);
                const tier      = rarityBatch?.[2]?.[i] as string | undefined;
                const rank      = rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined;
                const score     = rarityBatch?.[0]?.[i] ? Number(rarityBatch[0][i]) : undefined;
                const ts        = tier ? (TIER_STYLE[tier] ?? TIER_STYLE.Common) : TIER_STYLE.Common;
                const isActive  = listingId === id;
                const listedPrice = listedMap.get(id);
                const isCancelling = cancelId === id && isBusy;

                return (
                  <div key={id} style={{ border:"1.5px solid #e0e3ea", background:"#fff" }}>

                    {/* Image */}
                    <div style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative",
                      overflow:"hidden", cursor:"pointer" }}
                      onClick={() => setModalNft({ id, tier, rank, score })}>
                      <Image src={`/samples/${id % 12 + 1}.png`} alt={`#${id}`} fill
                        style={{ objectFit:"cover" }} />
                      {rank && (
                        <div style={{ position:"absolute", top:0, right:0, padding:"5px 9px",
                          background:"#0f1419", color:"#fff", fontSize:9, fontWeight:800 }}>
                          #{rank}
                        </div>
                      )}
                      {tier && (
                        <div style={{ position:"absolute", bottom:6, left:6, padding:"3px 9px",
                          background:ts.bg, color:ts.text, fontSize:8, fontWeight:800,
                          letterSpacing:"0.06em" }}>
                          {tier.toUpperCase()}
                        </div>
                      )}
                      {listedPrice && (
                        <div style={{ position:"absolute", top:0, left:0, padding:"4px 8px",
                          background:"#16a34a", color:"#fff", fontSize:8, fontWeight:800 }}>
                          LISTED
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div style={{ padding:"10px 12px", borderTop:"1px solid #f0f1f4" }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:8 }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:800 }}>#{id}</span>
                        {listedPrice ? (
                          <span style={{ fontSize:10, fontWeight:800, fontFamily:"monospace",
                            color:"#16a34a" }}>
                            τ {parseFloat(formatEther(listedPrice)).toFixed(3)}
                          </span>
                        ) : rank ? (
                          <span style={{ fontSize:8, color:"#9aa0ae", fontWeight:700 }}>RANK #{rank}</span>
                        ) : null}
                      </div>

                      {/* ── If already listed: show Cancel button ── */}
                      {listedPrice && !isActive ? (
                        <button
                          onClick={() => handleCancel(id)}
                          disabled={isCancelling}
                          style={{ width:"100%", padding:"7px", background:"transparent",
                            border:"1.5px solid #e0e3ea", fontSize:8, fontWeight:800,
                            cursor: isCancelling ? "not-allowed" : "pointer",
                            color:"#9aa0ae", textTransform:"uppercase" }}>
                          {isCancelling ? "CANCELLING..." : "CANCEL LISTING"}
                        </button>

                      ) : !isActive ? (
                        /* ── Not listed, not open: show LIST FOR SALE button ── */
                        <button
                          onClick={() => openListForm(id)}
                          style={{ width:"100%", padding:"7px", background:"#0f1419",
                            color:"#fff", border:"none", fontSize:8, fontWeight:800,
                            cursor:"pointer", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                          LIST FOR SALE
                        </button>

                      ) : (
                        /* ── Listing form — explicit 2-step flow ── */
                        <div>
                          {/* Step indicator */}
                          <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                            {["1. Approve","2. List"].map((s, si) => {
                              const done = si === 0
                                ? (step === "approved" || step === "listing" || step === "listed" || isApproved)
                                : step === "listed";
                              const active = si === 0
                                ? (step === "idle" && !isApproved)
                                : (step === "approved" || step === "approving" && isApproved);
                              return (
                                <div key={s} style={{ flex:1, padding:"3px 0", textAlign:"center",
                                  fontSize:8, fontWeight:800,
                                  background: done ? "#0f1419" : active ? "#f0f9ff" : "#f7f8fa",
                                  color: done ? "#fff" : active ? "#0369a1" : "#9aa0ae",
                                  border: active ? "1px solid #0369a1" : "1px solid transparent" }}>
                                  {s}
                                </div>
                              );
                            })}
                          </div>

                          {/* Price input */}
                          <input
                            value={listPrice}
                            onChange={e => setListPrice(e.target.value)}
                            placeholder="Price in TAO"
                            autoFocus
                            style={{ width:"100%", padding:"7px 10px", border:"1.5px solid #0f1419",
                              fontSize:12, fontFamily:"monospace", fontWeight:700,
                              marginBottom:6, boxSizing:"border-box" }} />

                          {/* Buttons */}
                          <div style={{ display:"flex", gap:4, marginBottom:6 }}>
                            {/* Step 1: Approve (skip if already approved) */}
                            {!isApproved && step !== "approved" ? (
                              <button
                                onClick={handleApprove}
                                disabled={isBusy}
                                style={{ flex:1, padding:"8px 6px", background:"#0369a1",
                                  color:"#fff", border:"none", fontSize:8, fontWeight:800,
                                  cursor: isBusy ? "not-allowed" : "pointer",
                                  letterSpacing:"0.06em", textTransform:"uppercase" }}>
                                {step === "approving" && isBusy ? "APPROVING..." : "1. APPROVE"}
                              </button>
                            ) : (
                              /* Step 2: List */
                              <button
                                onClick={handleList}
                                disabled={isBusy || !listPrice}
                                style={{ flex:1, padding:"8px 6px", background:"#0f1419",
                                  color:"#fff", border:"none", fontSize:8, fontWeight:800,
                                  cursor: (isBusy || !listPrice) ? "not-allowed" : "pointer",
                                  opacity: !listPrice ? 0.5 : 1,
                                  letterSpacing:"0.06em", textTransform:"uppercase" }}>
                                {step === "listing" && isBusy
                                  ? "LISTING..."
                                  : step === "listed"
                                    ? "✓ LISTED"
                                    : "2. LIST NFT"}
                              </button>
                            )}

                            {/* Close */}
                            <button onClick={closeListForm}
                              style={{ padding:"8px 10px", background:"transparent",
                                border:"1.5px solid #e0e3ea", fontSize:9, fontWeight:800,
                                cursor:"pointer", color:"#9aa0ae" }}>
                              ✕
                            </button>
                          </div>

                          {/* Status messages */}
                          {step === "approving" && !isBusy && !writeError && (
                            <div style={{ fontSize:8, color:"#0369a1", fontWeight:700, marginTop:4 }}>
                              Approval confirmed. Now click "2. LIST NFT".
                            </div>
                          )}
                          {step === "listed" && (
                            <div style={{ fontSize:8, color:"#16a34a", fontWeight:700, marginTop:4 }}>
                              ✓ Listed successfully!
                            </div>
                          )}

                          {/* Error */}
                          {writeError && (
                            <div style={{ marginTop:6, padding:"6px 8px", background:"#fff0f0",
                              border:"1px solid #ef4444", fontSize:8, color:"#b91c1c",
                              fontWeight:700, wordBreak:"break-word", lineHeight:1.5 }}>
                              {(writeError as Error).message?.slice(0, 200) ?? "Transaction failed"}
                            </div>
                          )}

                          {/* Confirming indicator */}
                          {isConfirming && (
                            <div style={{ fontSize:8, color:"#9aa0ae", fontWeight:700, marginTop:4 }}>
                              Confirming on-chain...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
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
