"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import ConnectButton from "@/components/ConnectButton";
import { CONTRACTS, MAX_SUPPLY, MINT_PRICE, COLLECTION_NAME } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

const SAMPLES = [1, 2, 3, 4, 1500, 2000, 2500, 3000];

export default function MintPage() {
  const [qty, setQty] = useState(1);
  const { isConnected } = useAccount();

  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply",
  });
  const minted    = totalSupply ? Number(totalSupply) : 0;
  const remaining = MAX_SUPPLY - minted;
  const progress  = (minted / MAX_SUPPLY) * 100;

  const { writeContract, isPending } = useWriteContract();

  function handleMint() {
    writeContract({ 
      address: CONTRACTS.NFT, 
      abi: NFT_ABI, 
      functionName: "mint", 
      args: [BigInt(qty)], 
      value: parseEther((qty * MINT_PRICE).toString()) 
    });
  }

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:80, paddingBottom:80 }}>
      <div className="container-app">
        
        <header style={{ textAlign:"center", marginBottom:48 }}>
          <h1 style={{ fontSize:42, fontWeight:800, letterSpacing:"-0.02em", marginBottom:12 }}>MINT YOUR CAT</h1>
          <div style={{ display:"inline-block", padding:"4px 24px", border:"1px solid #f0f1f4", fontSize:10, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.1em", textTransform:"uppercase" }}>
            {COLLECTION_NAME} Genesis Mint
          </div>
        </header>

        <div className="responsive-grid grid-cols-2" style={{ gap:40, alignItems:"start" }}>
          
          {/* Left Feature Card */}
          <div className="pixel-border" style={{ padding:20, background:"#fff" }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, background:"#0f1419", border:"2px solid #0f1419", marginBottom:24 }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} style={{ aspectRatio:"1/1", background:"#f7f8fa", overflow:"hidden" }}>
                  <Image src={`/samples/${n}.png`} alt="" width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))}
            </div>
            
            <div style={{ padding:"0 4px" }}>
              <div style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>Supply Allocation</div>
              <div style={{ height:12, background:"#f0f1f4", border:"1px solid #0f1419", position:"relative" }}>
                <div style={{ width:`${progress}%`, height:"100%", background:"#0f1419", transition:"width 1s ease-in-out" }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, fontSize:9, fontWeight:700, color:"#0f1419" }}>
                <span>{minted.toLocaleString()} MINTED</span>
                <span>{Math.round(progress)}% COMPLETE</span>
              </div>
            </div>
          </div>

          {/* Right Controls Card */}
          <div className="pixel-border brutal-shadow" style={{ background:"#fff", padding:0 }}>
            <div style={{ padding:32 }}>
              <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:32 }}>
                <tbody>
                  {[
                    { l:"PRICE",     v:`τ ${MINT_PRICE} TAO` },
                    { l:"YOUR MINTED", v:"0 / 20" },
                    { l:"NETWORK",   v:"Bittensor EVM" },
                    { l:"AVAILABLE",   v:remaining.toLocaleString() },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid #f0f1f4" }}>
                      <td style={{ padding:"16px 0", fontSize:9, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.05em" }}>{row.l}</td>
                      <td style={{ padding:"16px 0", fontSize:13, fontWeight:700, textAlign:"right", fontFamily:"monospace" }}>{row.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isConnected ? (
                <div style={{ textAlign:"center", padding:"20px 0" }}>
                  <ConnectButton />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:12 }}>Quantity</div>
                    <div style={{ display:"flex", border:"2px solid #0f1419" }}>
                      <button onClick={() => setQty(Math.max(1, qty-1))} style={{ width:60, height:60, border:"none", background:"#fff", borderRight:"2px solid #0f1419", fontSize:20, fontWeight:700, cursor:"pointer" }}>-</button>
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, fontFamily:"monospace" }}>{qty}</div>
                      <button onClick={() => setQty(Math.min(20, qty+1))} style={{ width:60, height:60, border:"none", background:"#fff", borderLeft:"2px solid #0f1419", fontSize:20, fontWeight:700, cursor:"pointer" }}>+</button>
                    </div>
                  </div>

                  <button onClick={handleMint} disabled={isPending} className="btn-primary" style={{ width:"100%", padding:24, fontSize:14, fontWeight:800 }}>
                    {isPending ? "CONFIRMING..." : `MINT ${qty} CAT | τ ${(qty * MINT_PRICE).toFixed(2)}`}
                  </button>
                </>
              )}
            </div>
            
            <div style={{ background:"#f7f8fa", borderTop:"1px solid #f0f1f4", padding:"16px", textAlign:"center", fontSize:9, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.15em" }}>
              PUBLIC MINT · FAIR LAUNCH · 4,699 GENESIS SUPPLY
            </div>
          </div>

        </div>

        <div style={{ textAlign:"center", marginTop:64 }}>
          <Link href="/" style={{ fontSize:12, fontWeight:700, color:"#0f1419", textDecoration:"none", borderBottom:"2px solid #0f1419" }}>
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  );
}
