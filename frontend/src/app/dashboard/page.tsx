"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { formatEther, parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import NftModal from "@/components/NftModal";
import { CONTRACTS } from "@/lib/config";
import { NFT_ABI, MARKETPLACE_ABI, RARITY_ABI, ERC721_ABI } from "@/lib/abis";

const TIER_STYLE: Record<string, { text: string; bg: string }> = {
  Legendary: { text: "#7c3aed", bg: "#ede9fe" },
  Epic:      { text: "#1d4ed8", bg: "#dbeafe" },
  Rare:      { text: "#059669", bg: "#d4f5e9" },
  Uncommon:  { text: "#a16207", bg: "#fef3c7" },
  Common:    { text: "#475569", bg: "#f1f5f9" },
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab]     = useState<"owned"|"offers">("owned");
  const [modalNft, setModalNft]       = useState<{ id:number; tier?:string; rank?:number; score?:number } | null>(null);
  const [listingId, setListingId]     = useState<number | null>(null);
  const [listPrice, setListPrice]     = useState("");
  const [delistId, setDelistId]       = useState<number | null>(null);
  const [pendingList, setPendingList] = useState(false);

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

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: CONTRACTS.NFT as `0x${string}`, abi: ERC721_ABI,
    functionName: "isApprovedForAll",
    args: address && CONTRACTS.MARKETPLACE ? [address, CONTRACTS.MARKETPLACE as `0x${string}`] : undefined,
    query: { enabled: !!address && !!CONTRACTS.MARKETPLACE },
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

  // Fetch all active listings to know which tokens are currently listed
  const { data: listingPage, refetch: refetchListings } = useReadContract({
    address: CONTRACTS.MARKETPLACE as `0x${string}`, abi: MARKETPLACE_ABI,
    functionName: "getListingsPage",
    args: [CONTRACTS.NFT as `0x${string}`, BigInt(0), BigInt(500)],
    query: { enabled: !!CONTRACTS.MARKETPLACE && !!CONTRACTS.NFT },
  });

  const listedIds = useMemo(() => {
    const [ids, data] = (listingPage as unknown as [bigint[], { active: boolean }[]]) ?? [[], []];
    const set = new Set<number>();
    ids.forEach((id, i) => { if (data[i]?.active) set.add(Number(id)); });
    return set;
  }, [listingPage]);

  const { writeContract, isPending, data: txHash, reset: resetWrite, error: writeError } = useWriteContract();
  const { isSuccess: txDone, isLoading: isConfirming, isError: txFailed, error: txError } = useWaitForTransactionReceipt({ hash: txHash });

  // After approval confirms, auto-submit the pending list
  useEffect(() => {
    if (txDone && pendingList && listingId != null && listPrice) {
      setPendingList(false);
      refetchApproval();
      doList(listingId, listPrice);
    } else if (txDone) {
      resetWrite();
      setListingId(null);
      setListPrice("");
      setDelistId(null);
      refetchListings();
    }
  }, [txDone]);

  const balance      = balData ? parseFloat(formatEther(balData.value)) : 0;
  const ownedCount   = tokenIds.length;
  const portfolioTao = floorTao * ownedCount;

  const GAS = BigInt(500_000); // explicit gas — skips eth_call simulation on Bittensor RPC

  function doList(id: number, price: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({ address: CONTRACTS.MARKETPLACE as `0x${string}`, abi: MARKETPLACE_ABI as any,
      functionName: "list",
      args: [CONTRACTS.NFT as `0x${string}`, BigInt(id), parseEther(price)],
      gas: GAS });
  }

  function handleList(id: number, price: string) {
    if (!price || !id) return;
    if (!isApproved) {
      setPendingList(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      writeContract({ address: CONTRACTS.NFT as `0x${string}`, abi: ERC721_ABI as any,
        functionName: "setApprovalForAll",
        args: [CONTRACTS.MARKETPLACE as `0x${string}`, true],
        gas: GAS });
    } else {
      doList(id, price);
    }
  }

  function handleDelist(id: number) {
    setDelistId(id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    writeContract({ address: CONTRACTS.MARKETPLACE as `0x${string}`, abi: MARKETPLACE_ABI as any,
      functionName: "delist",
      args: [CONTRACTS.NFT as `0x${string}`, BigInt(id)],
      gas: GAS });
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

      {/* NFT Detail Modal */}
      {modalNft && (
        <NftModal
          id={modalNft.id}
          tier={modalNft.tier}
          rank={modalNft.rank}
          score={modalNft.score}
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
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 }}>
              {tokenIds.map((tid, i) => {
                const id    = Number(tid);
                const tier  = rarityBatch?.[2]?.[i] as string | undefined;
                const rank  = rarityBatch?.[1]?.[i] ? Number(rarityBatch[1][i]) : undefined;
                const score = rarityBatch?.[0]?.[i] ? Number(rarityBatch[0][i]) : undefined;
                const ts    = tier ? (TIER_STYLE[tier] ?? TIER_STYLE.Common) : TIER_STYLE.Common;
                const isListing = listingId === id;

                return (
                  <div key={id} style={{ border:"1.5px solid #e0e3ea", background:"#fff" }}>
                    {/* Image — click to open rarity modal */}
                    <div
                      style={{ aspectRatio:"1/1", background:"#f7f8fa", position:"relative",
                        overflow:"hidden", cursor:"pointer" }}
                      onClick={() => setModalNft({ id, tier, rank, score })}>
                      <Image src={`/samples/${id % 12 + 1}.png`} alt={`#${id}`} fill
                        style={{ objectFit:"cover" }} />
                      {/* Rank badge — top right, always shown */}
                      {rank ? (
                        <div style={{ position:"absolute", top:0, right:0, padding:"5px 9px",
                          background:"#0f1419", color:"#fff", fontSize:9, fontWeight:800,
                          letterSpacing:"0.04em" }}>
                          #{rank}
                        </div>
                      ) : null}
                      {/* Tier badge — bottom left */}
                      {tier && (
                        <div style={{ position:"absolute", bottom:6, left:6, padding:"3px 9px",
                          background:ts.bg, color:ts.text,
                          fontSize:8, fontWeight:800, letterSpacing:"0.06em" }}>
                          {tier.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div style={{ padding:"10px 12px", borderTop:"1px solid #f0f1f4" }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom: isListing ? 10 : 0 }}>
                        <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:800 }}>#{id}</span>
                        {rank && (
                          <span style={{ fontSize:8, color:"#9aa0ae", fontWeight:700 }}>RANK #{rank}</span>
                        )}
                      </div>

                      {/* Inline list form */}
                      {isListing ? (
                        <div>
                          <div style={{ display:"flex", gap:4, marginBottom:6 }}>
                            <input
                              value={listPrice}
                              onChange={e => setListPrice(e.target.value)}
                              placeholder="Price in TAO"
                              autoFocus
                              style={{ flex:1, padding:"7px 10px", border:"1.5px solid #0f1419",
                                fontSize:12, fontFamily:"monospace", fontWeight:700 }} />
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            <button
                              onClick={() => handleList(id, listPrice)}
                              disabled={isPending || isConfirming || !listPrice}
                              style={{ flex:1, padding:"8px 6px", background:"#0f1419",
                                color:"#fff", border:"none", fontSize:9, fontWeight:800,
                                cursor: (!listPrice || isPending || isConfirming) ? "not-allowed" : "pointer",
                                letterSpacing:"0.06em", opacity: !listPrice ? 0.5 : 1,
                                textTransform:"uppercase" }}>
                              {isConfirming
                                ? "CONFIRMING..."
                                : isPending
                                  ? (pendingList ? "APPROVING..." : "LISTING...")
                                  : (!isApproved ? "APPROVE & LIST" : "LIST")}
                            </button>
                            <button
                              onClick={() => { setListingId(null); setListPrice(""); }}
                              style={{ padding:"8px 10px", background:"transparent",
                                border:"1.5px solid #e0e3ea", fontSize:9, fontWeight:800,
                                cursor:"pointer", color:"#5a6478" }}>
                              ✕
                            </button>
                          </div>
                          {floorTao > 0 && (
                            <div style={{ marginTop:6, fontSize:8, color:"#9aa0ae", fontWeight:700 }}>
                              FLOOR: τ {floorTao.toFixed(3)}
                            </div>
                          )}
                          {(writeError || (txFailed && txError)) && listingId === id && (
                            <div style={{ marginTop:6, padding:"6px 8px", background:"#fff0f0",
                              border:"1px solid #ef4444", fontSize:8, color:"#b91c1c", fontWeight:700,
                              wordBreak:"break-word" }}>
                              {((writeError || txError) as Error)?.message?.slice(0, 120) ?? "Transaction failed"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display:"flex", gap:4, marginTop:8 }}>
                          <button
                            onClick={() => { setListingId(id); setListPrice(""); }}
                            style={{ flex:1, padding:"7px 8px", background:"#0f1419",
                              color:"#fff", border:"none", fontSize:8, fontWeight:800,
                              cursor:"pointer", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                            LIST FOR SALE
                          </button>
                          {listedIds.has(id) && (
                            <button
                              onClick={() => handleDelist(id)}
                              disabled={isPending && delistId === id}
                              style={{ padding:"7px 10px", background:"transparent",
                                border:"1.5px solid #e0e3ea", fontSize:8, fontWeight:800,
                                cursor:"pointer", color:"#9aa0ae", textTransform:"uppercase" }}
                              title="Cancel listing">
                              {isPending && delistId === id ? "..." : "DELIST"}
                            </button>
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
