"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useReadContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { useContractWrite } from "@/lib/useContractWrite";
import { parseEther, formatEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MAX_SUPPLY, MINT_PRICE, COLLECTION_NAME } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

const LAUNCH_TARGET = new Date("2026-04-09T15:00:00.000Z").getTime();

function useCountdown() {
  const [remaining, setRemaining] = useState(() => Math.max(0, LAUNCH_TARGET - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, LAUNCH_TARGET - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  const days = Math.floor(remaining / 86_400_000);
  const h    = Math.floor((remaining % 86_400_000) / 3_600_000);
  const m    = Math.floor((remaining % 3_600_000) / 60_000);
  const s    = Math.floor((remaining % 60_000) / 1000);
  const pad  = (n: number) => String(n).padStart(2, "0");
  if (remaining <= 0) return null;
  if (days > 0) return `${days}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function MintPage() {
  const [qty, setQty]               = useState(1);
  const countdown = useCountdown();
  const [mintedIds, setMintedIds]   = useState<number[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply",
  });
  const { data: mintActive } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintActive",
  });
  const { data: mintedByWallet, refetch: refetchWallet } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintedPerWallet",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });
  // Read live mint price from contract
  const { data: contractMintPrice } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintPrice",
  });

  const minted       = totalSupply ? Number(totalSupply) : 0;
  const remaining    = MAX_SUPPLY - minted;
  const progress     = (minted / MAX_SUPPLY) * 100;
  const walletMinted = mintedByWallet ? Number(mintedByWallet) : 0;
  const maxCanMint   = Math.max(0, 20 - walletMinted);

  // Use live contract price if available, fallback to config
  const livePriceWei = contractMintPrice ? contractMintPrice as bigint : parseEther(MINT_PRICE);
  const priceDisplay = parseFloat(formatEther(livePriceWei)).toFixed(4).replace(/\.?0+$/, "");
  const totalCostWei = livePriceWei * BigInt(qty);
  const totalCostDisplay = parseFloat(formatEther(totalCostWei)).toFixed(4).replace(/\.?0+$/, "");

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useContractWrite();

  const { isLoading: isConfirming, isSuccess: txSuccess, data: receipt } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Parse minted token IDs from receipt logs
  useEffect(() => {
    if (!txSuccess || !receipt || !address) return;

    const ids: number[] = [];
    for (const log of receipt.logs) {
      // Transfer event: topics[2] = tokenId (for ERC721)
      // topic[0] = Transfer sig, topic[1] = from(0x0 for mint), topic[2] = to, topic[3] = tokenId
      if (log.topics.length === 4) {
        const toAddr = "0x" + log.topics[2].slice(26);
        if (toAddr.toLowerCase() === address.toLowerCase()) {
          const tokenId = parseInt(log.topics[3], 16);
          if (!isNaN(tokenId) && tokenId > 0) ids.push(tokenId);
        }
      }
    }

    if (ids.length > 0) setMintedIds(ids);
    setShowSuccess(true);
    refetchSupply();
    refetchWallet();
  }, [txSuccess, receipt, address]);

  function handleMint() {
    setShowSuccess(false);
    setMintedIds([]);
    writeContract({
      address: CONTRACTS.NFT,
      abi: NFT_ABI,
      functionName: "mint",
      args: [BigInt(qty)],
      value: totalCostWei,
    });
  }

  const isBusy = isPending || isConfirming;

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:80, paddingBottom:80 }}>
      <div className="container-app">

        <header style={{ textAlign:"center", marginBottom:48 }}>
          <h1 style={{ fontSize:"clamp(28px,5vw,42px)", fontWeight:800, letterSpacing:"-0.02em", marginBottom:12 }}>
            MINT YOUR CAT
          </h1>
          <div style={{ display:"inline-block", padding:"4px 24px", border:"1px solid #e0e3ea",
            fontSize:10, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.1em", textTransform:"uppercase" }}>
            {COLLECTION_NAME} Genesis Mint
          </div>
        </header>

        {/* Success state */}
        {showSuccess && mintedIds.length > 0 && (
          <div style={{ border:"2px solid #0f1419", padding:"24px 32px", marginBottom:32, background:"#f7f8fa", textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.12em", color:"#0f1419", textTransform:"uppercase", marginBottom:8 }}>
              Minted Successfully
            </div>
            <div style={{ fontSize:22, fontWeight:800, fontFamily:"monospace", color:"#0f1419", marginBottom:12 }}>
              {mintedIds.length} Cat{mintedIds.length > 1 ? "s" : ""} Minted
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:16 }}>
              {mintedIds.map(id => (
                <span key={id} style={{ padding:"4px 12px", background:"#0f1419", color:"#fff",
                  fontFamily:"monospace", fontSize:12, fontWeight:700 }}>
                  #{id}
                </span>
              ))}
            </div>
            <div style={{ fontSize:10, color:"#5a6478", fontWeight:700, letterSpacing:"0.08em", marginBottom:16 }}>
              TX: <span style={{ fontFamily:"monospace" }}>{txHash?.slice(0,18)}...{txHash?.slice(-6)}</span>
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <Link href="/dashboard" style={{ padding:"8px 20px", background:"#0f1419", color:"#fff",
                fontSize:10, fontWeight:800, letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none" }}>
                View in Dashboard
              </Link>
              <button onClick={() => { setShowSuccess(false); reset(); }}
                style={{ padding:"8px 20px", border:"2px solid #0f1419", background:"transparent",
                  color:"#0f1419", fontSize:10, fontWeight:800, letterSpacing:"0.10em",
                  textTransform:"uppercase", cursor:"pointer" }}>
                Mint More
              </button>
            </div>
          </div>
        )}

        <div className="responsive-grid grid-cols-2" style={{ gap:40, alignItems:"start" }}>

          {/* Left: art grid + progress */}
          <div className="pixel-border" style={{ padding:20, background:"#fff" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2,
              background:"#0f1419", border:"2px solid #0f1419", marginBottom:24 }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} style={{ aspectRatio:"1/1", overflow:"hidden" }}>
                  <Image src={`/samples/${n}.png`} alt="" width={300} height={300}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))}
            </div>

            <div style={{ padding:"0 4px" }}>
              <div style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.1em", marginBottom:10, color:"#9aa0ae" }}>
                Supply Progress
              </div>
              <div style={{ height:10, background:"#f0f1f4", border:"1px solid #0f1419" }}>
                <div style={{ width:`${progress}%`, height:"100%", background:"#0f1419",
                  transition:"width 1s ease-in-out" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:8,
                fontSize:9, fontWeight:700, color:"#0f1419" }}>
                <span>{minted.toLocaleString()} / {MAX_SUPPLY.toLocaleString()} MINTED</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            <div style={{ marginTop:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#e0e3ea" }}>
              {[
                { l:"Remaining",   v: remaining.toLocaleString() },
                { l:"Your Minted", v: `${walletMinted} / 20` },
                { l:"Chain",       v: "Bittensor EVM" },
                { l:"Max / Wallet",v: "20" },
              ].map(s => (
                <div key={s.l} style={{ background:"#fff", padding:"12px 16px" }}>
                  <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:800, color:"#0f1419" }}>{s.v}</div>
                  <div style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: mint controls */}
          <div className="pixel-border brutal-shadow" style={{ background:"#fff", padding:0 }}>
            <div style={{ padding:32 }}>

              {/* Price + status */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"16px 0", borderBottom:"2px solid #0f1419", marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase",
                    letterSpacing:"0.10em", marginBottom:4 }}>Price per Cat</div>
                  <div style={{ fontFamily:"monospace", fontSize:28, fontWeight:800, color:"#0f1419" }}>
                    τ {priceDisplay}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase",
                    letterSpacing:"0.10em", marginBottom:4 }}>Mint Status</div>
                  {mintActive === undefined ? (
                    <span style={{ fontSize:11, fontWeight:700, color:"#9aa0ae" }}>...</span>
                  ) : mintActive ? (
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:"#16a34a" }}>
                      <span style={{ width:7, height:7, background:"#16a34a", borderRadius:"50%", display:"inline-block" }} />
                      OPEN
                    </span>
                  ) : (
                    <span style={{ fontSize:11, fontWeight:700, color:"#dc2626" }}>PAUSED</span>
                  )}
                </div>
              </div>

              {!isConnected ? (
                <div style={{ textAlign:"center", padding:"32px 0" }}>
                  <p style={{ fontSize:12, color:"#5a6478", marginBottom:20, fontWeight:500 }}>
                    Connect your wallet to mint
                  </p>
                  <ConnectButton />
                </div>

              ) : mintActive === false ? (
                <div style={{ padding:"28px 24px", background:"#f7f8fa", border:"2px solid #0f1419", textAlign:"center" }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:12 }}>
                    {countdown ? "Mint opens in" : "Mint starting soon"}
                  </div>
                  {countdown ? (
                    <div style={{ fontFamily:"monospace", fontSize:36, fontWeight:800, color:"#0f1419", letterSpacing:"0.04em" }}>
                      {countdown}
                    </div>
                  ) : (
                    <div style={{ fontSize:13, fontWeight:700, color:"#0f1419" }}>Launching shortly…</div>
                  )}
                  <div style={{ marginTop:14, fontSize:10, color:"#9aa0ae", fontWeight:700, letterSpacing:"0.08em" }}>
                    τ {MINT_PRICE} · UP TO 20 PER WALLET
                  </div>
                </div>

              ) : maxCanMint === 0 ? (
                <div style={{ padding:"24px", background:"#f0fdf4", border:"2px solid #16a34a", textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#15803d", textTransform:"uppercase" }}>
                    Wallet Limit Reached
                  </div>
                  <div style={{ fontSize:11, color:"#166534", marginTop:6 }}>You have minted 20/20 cats.</div>
                </div>

              ) : (
                <>
                  {/* Quantity selector */}
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase",
                      letterSpacing:"0.10em", marginBottom:10 }}>Quantity (max {maxCanMint})</div>
                    <div style={{ display:"flex", border:"2px solid #0f1419" }}>
                      <button onClick={() => setQty(Math.max(1, qty-1))}
                        style={{ width:56, height:56, border:"none", background:"#fff",
                          borderRight:"2px solid #0f1419", fontSize:20, fontWeight:700, cursor:"pointer" }}>
                        -
                      </button>
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:24, fontWeight:800, fontFamily:"monospace" }}>
                        {qty}
                      </div>
                      <button onClick={() => setQty(Math.min(maxCanMint, qty+1))}
                        style={{ width:56, height:56, border:"none", background:"#fff",
                          borderLeft:"2px solid #0f1419", fontSize:20, fontWeight:700, cursor:"pointer" }}>
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"12px 0", borderTop:"1px solid #f0f1f4", borderBottom:"1px solid #f0f1f4",
                    marginBottom:20 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      Total
                    </span>
                    <span style={{ fontFamily:"monospace", fontSize:18, fontWeight:800, color:"#0f1419" }}>
                      τ {totalCostDisplay}
                    </span>
                  </div>

                  {/* Mint button */}
                  <button onClick={handleMint} disabled={isBusy}
                    style={{
                      width:"100%", padding:"18px 24px",
                      background: isBusy ? "#5a6478" : "#0f1419",
                      color:"#fff", border:"none", cursor: isBusy ? "not-allowed" : "pointer",
                      fontSize:13, fontWeight:800, letterSpacing:"0.10em", textTransform:"uppercase",
                      transition:"opacity 0.1s",
                    }}>
                    {isPending    ? "CONFIRM IN WALLET..." :
                     isConfirming ? "CONFIRMING TX..." :
                     `MINT ${qty} CAT${qty > 1 ? "S" : ""} · τ ${totalCostDisplay}`}
                  </button>

                  {/* TX confirmation link */}
                  {txHash && !showSuccess && (
                    <div style={{ marginTop:12, padding:"10px 14px", background:"#f0f9ff",
                      border:"1px solid #0369a1", fontSize:9, fontWeight:700, color:"#0369a1",
                      letterSpacing:"0.06em", textAlign:"center" }}>
                      TX SUBMITTED · {isConfirming ? "WAITING FOR CONFIRMATION..." : "CONFIRMED"}
                      <br />
                      <span style={{ fontFamily:"monospace", fontSize:9, opacity:0.7 }}>
                        {txHash.slice(0,20)}...
                      </span>
                    </div>
                  )}

                  {/* Error */}
                  {writeError && !isBusy && (
                    <div style={{ marginTop:12, padding:"10px 14px", background:"#fff0f0",
                      border:"1px solid #ef4444", fontSize:10, color:"#b91c1c",
                      fontWeight:700, wordBreak:"break-all" }}>
                      {(writeError as Error).message?.slice(0, 200) ??
                        "Transaction failed. Check wallet and network."}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ background:"#f7f8fa", borderTop:"1px solid #f0f1f4", padding:"14px",
              textAlign:"center", fontSize:9, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.15em" }}>
              PUBLIC MINT · FAIR LAUNCH · NO TEAM ALLOCATION
            </div>
          </div>

        </div>

        <div style={{ textAlign:"center", marginTop:56 }}>
          <Link href="/" style={{ fontSize:11, fontWeight:700, color:"#0f1419",
            textDecoration:"none", borderBottom:"2px solid #0f1419" }}>
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
