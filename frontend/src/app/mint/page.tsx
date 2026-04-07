"use client";
import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MINT_PRICE, MAX_SUPPLY, MAX_PER_WALLET, COLLECTION_NAME } from "@/lib/config";
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
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>
      <div className="container-app" style={{ padding:"64px 20px" }}>

        <div style={{ textAlign:"center", marginBottom:48 }}>
          <h1 style={{ fontSize:40, marginBottom:8 }}>Mint Your Cat</h1>
          <div className="tag-outline">{COLLECTION_NAME} Genesis Mint</div>
        </div>

        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className="responsive-grid grid-cols-2" style={{ gap:48, alignItems:"start" }}>

          {/* Left — Visuals */}
          <div className="pixel-border" style={{ padding:32 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:32 }}>
              {PREVIEWS.map(n => (
                <div key={n} className="pixel-border" style={{ aspectRatio:"1/1" }}>
                  <Image src={`/samples/${n}.png`} alt={`Cat #${n}`} width={300} height={300}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))}
            </div>

            <div style={{ marginBottom:12, fontWeight:800, fontSize:12, textTransform:"uppercase" }}>Supply Allocation</div>
            <div style={{ height:16, background:"#f0f1f4", border:"2px solid #0f1419", marginBottom:8 }}>
              <div style={{ width:`${progress}%`, height:"100%", background:"#0f1419", transition:"width 1.5s ease" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700 }}>
              <span>{minted.toLocaleString()} MINTED</span>
              <span>{Math.round(progress)}% COMPLETE</span>
            </div>
          </div>

          {/* Right — Controls */}
          <div className="pixel-border brutal-shadow" style={{ padding:32, background:"#f7f8fa" }}>
            <div style={{ background:"#fff", border:"2px solid #0f1419", marginBottom:24 }}>
              {[
                { l:"Price", v:`τ ${MINT_PRICE} TAO` },
                { l:"Your Minted", v:`${walletMinted} / ${MAX_PER_WALLET}` },
                { l:"Network", v:"Bittensor EVM" },
                { l:"Available", v:remaining.toLocaleString() },
              ].map((s, i) => (
                <div key={s.l} style={{ display:"flex", justifyContent:"space-between", padding:"16px 20px", borderTop: i > 0 ? "1px solid #f0f1f4" : "none" }}>
                  <span style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase" }}>{s.l}</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>{s.v}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom:24 }}>
              <label className="section-label" style={{ marginBottom:12, display:"block" }}>Quantity</label>
              <div style={{ display:"flex", background:"#fff", border:"2px solid #0f1419" }}>
                <button onClick={() => setQty(Math.max(1, qty-1))} style={{ width:60, height:60, border:"none", borderRight:"2px solid #0f1419", background:"transparent", fontSize:24, fontWeight:400, cursor:"pointer" }}>-</button>
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, fontFamily:"monospace" }}>{qty}</div>
                <button onClick={() => setQty(Math.min(canMint, qty+1))} style={{ width:60, height:60, border:"none", borderLeft:"2px solid #0f1419", background:"transparent", fontSize:24, fontWeight:400, cursor:"pointer" }}>+</button>
              </div>
            </div>

            {isSuccess ? (
              <div className="pixel-border" style={{ padding:24, background:"#fff", textAlign:"center", borderColor:"#00c49a" }}>
                <h3 style={{ color:"#00c49a", marginBottom:8 }}>Mint Successful!</h3>
                <p style={{ fontSize:12, color:"#5a6478", marginBottom:20 }}>Your cat has been born. Join the collection reveal soon.</p>
                <Link href="/dashboard" className="btn-primary" style={{ width:"100%" }}>VIEW DASHBOARD</Link>
              </div>
            ) : !isConnected ? (
              <div style={{ display:"flex", justifyContent:"center" }}><ConnectButton /></div>
            ) : (
              <button 
                onClick={handleMint} 
                disabled={isPending || isConfirming || !mintActive || isSoldOut || canMint === 0}
                className="btn-primary" 
                style={{ width:"100%", padding:20, fontSize:14 }}
              >
                {isPending ? "CONFIRM..." : isConfirming ? "MINTING..." : isSoldOut ? "SOLD OUT" : canMint === 0 ? "LIMIT REACHED" : `MINT ${qty} CAT | τ ${totalCost}`}
              </button>
            )}

            <div style={{ marginTop:32, fontSize:11, color:"#9aa0ae", lineHeight:1.6, textAlign:"center", textTransform:"uppercase", letterSpacing:"0.05em" }}>
              Public Mint · Fair Launch · 4,699 Genesis Supply
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

import Link from "next/link";
