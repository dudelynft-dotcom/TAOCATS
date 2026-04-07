"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MINT_PRICE, MAX_SUPPLY, MAX_PER_WALLET } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

const PREVIEWS = [3, 7, 11, 2, 9, 5];

export default function MintPage() {
  const [qty, setQty] = useState(1);
  const { address, isConnected } = useAccount();

  const { data: totalSupply }    = useReadContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply" });
  const { data: mintActive }     = useReadContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintActive" });
  const { data: mintedByWallet } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintedPerWallet",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const minted       = totalSupply ? Number(totalSupply) : 0;
  const walletMinted = mintedByWallet ? Number(mintedByWallet) : 0;
  const remaining    = MAX_SUPPLY - minted;
  const canMint      = MAX_PER_WALLET - walletMinted;
  const progress     = (minted / MAX_SUPPLY) * 100;
  const totalCost    = (parseFloat(MINT_PRICE) * qty).toFixed(2);
  const isSoldOut    = remaining === 0;

  function handleMint() {
    writeContract({
      address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mint",
      args: [BigInt(qty)],
      value: parseEther((parseFloat(MINT_PRICE) * qty).toString()),
    });
  }

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:56 }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"56px 24px" }}>

        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#9aa0ae", marginBottom:8 }}>Step 1/1</div>
        <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:"-0.01em", color:"#0f1419", textTransform:"uppercase", marginBottom:4 }}>Mint TAO Cat</h1>
        <div style={{ height:1, background:"#e0e3ea", margin:"20px 0 36px" }} />

        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
          style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"start" }}
          className="mint-grid">

          {/* Left — preview */}
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              <span className="tag-dark">Bittensor EVM</span>
              <span className="tag-outline">Open Mint</span>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:4, marginBottom:24 }}>
              {PREVIEWS.map(n => (
                <div key={n} className="nft-card" style={{ aspectRatio:"1/1" }}>
                  <Image src={`/samples/${n}.png`} alt={`Cat #${n}`} width={300} height={300}
                    style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                </div>
              ))}
            </div>

            <div style={{ fontSize:11, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.10em", textTransform:"uppercase", marginBottom:8 }}>Mint Progress</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#5a6478", marginBottom:6, fontWeight:600, letterSpacing:"0.04em" }}>
              <span>{minted.toLocaleString()} / {MAX_SUPPLY.toLocaleString()} minted</span>
              <span style={{ color:"#00c49a" }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height:3, background:"#e0e3ea" }}>
              <div className="progress-bar" style={{ width:`${progress}%`, height:"100%" }} />
            </div>
          </div>

          {/* Right — mint card */}
          <div>
            {/* Stats rows */}
            <div style={{ border:"1px solid #e0e3ea", marginBottom:20 }}>
              {[
                { label:"Price per Cat",   value:`τ ${MINT_PRICE}` },
                { label:"Wallet",          value:`${walletMinted} / ${MAX_PER_WALLET} minted` },
                { label:"Status",          value: mintActive ? (isSoldOut ? "Sold Out" : "Live") : "Paused", green: !!(mintActive && !isSoldOut) },
                { label:"Remaining",       value: remaining.toLocaleString() },
              ].map((s, i) => (
                <div key={s.label} className="data-row" style={{ borderTop: i > 0 ? "1px solid #e0e3ea" : "none" }}>
                  <span className="label">{s.label}</span>
                  <span className="value" style={{ color: s.green ? "#00c49a" : undefined }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Quantity */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Quantity</div>
              <div style={{ display:"flex", alignItems:"center", gap:0, border:"1px solid #e0e3ea" }}>
                <button onClick={() => setQty(Math.max(1, qty-1))}
                  style={{ width:44, height:44, background:"#f7f8fa", border:"none", borderRight:"1px solid #e0e3ea", color:"#0f1419", fontSize:18, cursor:"pointer", fontFamily:"monospace" }}>−</button>
                <span style={{ flex:1, textAlign:"center", fontSize:20, fontWeight:700, color:"#0f1419", fontFamily:"monospace" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(Math.min(canMint,10), qty+1))}
                  style={{ width:44, height:44, background:"#f7f8fa", border:"none", borderLeft:"1px solid #e0e3ea", color:"#0f1419", fontSize:18, cursor:"pointer", fontFamily:"monospace" }}>+</button>
              </div>
            </div>

            {/* Total */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:"#f7f8fa", border:"1px solid #e0e3ea", marginBottom:20 }}>
              <span style={{ color:"#9aa0ae", fontSize:11, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>Total Amount</span>
              <span style={{ fontWeight:700, fontSize:20, color:"#0f1419", fontFamily:"monospace" }}>τ {totalCost}</span>
            </div>

            {isSuccess ? (
              <div style={{ padding:20, background:"#d4f5e9", border:"1px solid #a8e6b8", textAlign:"center" }}>
                <div style={{ fontWeight:700, fontSize:13, color:"#0a7a5a", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>↗ Mint Successful</div>
                <div style={{ color:"#2d7a4a", fontSize:12 }}>Check your dashboard to see your cat</div>
              </div>
            ) : !isConnected ? (
              <div style={{ display:"flex", justifyContent:"center" }}><ConnectButton /></div>
            ) : (
              <button onClick={handleMint} className="btn-primary" style={{ width:"100%", fontSize:11 }}
                disabled={isPending || isConfirming || !mintActive || isSoldOut || canMint === 0}>
                {isPending ? "Confirm in wallet..." : isConfirming ? "Minting..." : isSoldOut ? "Sold Out" : !mintActive ? "Mint Not Active" : canMint === 0 ? "Wallet Limit Reached" : `Mint ${qty} Cat${qty > 1 ? "s" : ""} | τ ${totalCost}`}
              </button>
            )}

            <div style={{ marginTop:20, display:"flex", flexDirection:"column", gap:0, border:"1px solid #e0e3ea" }}>
              {[
                "Open mint, no whitelist",
                "100% of mint fees seed trading liquidity",
                "Token holders may share in marketplace volume rewards",
                "Art reveals after sellout",
              ].map((item, i) => (
                <div key={item} style={{ display:"flex", gap:12, fontSize:11, color:"#5a6478", padding:"10px 14px", borderTop: i > 0 ? "1px solid #e0e3ea" : "none", letterSpacing:"0.02em" }}>
                  <span style={{ color:"#00c49a", fontWeight:700, flexShrink:0 }}>›</span>{item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
