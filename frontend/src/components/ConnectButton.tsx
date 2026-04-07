"use client";
import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { subtensor, subtensorTestnet } from "@/lib/config";

const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
const TARGET_CHAIN = IS_TESTNET ? subtensorTestnet : subtensor;

export default function ConnectButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== TARGET_CHAIN.id;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!isConnected) return (
    <div ref={ref} style={{ position:"relative" }}>
      <button 
        onClick={() => setOpen(v => !v)} 
        disabled={isPending} 
        className="btn-primary"
      >
        {isPending ? "CONNECTING..." : "CONNECT"}
      </button>
      
      {open && (
        <div className="wallet-dropdown">
          <div style={{ padding:"24px 20px", borderBottom:"3px solid #0f1419", background:"#0f1419" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", color:"#ffffff", marginBottom:4 }}>Connect Wallet</div>
            <div style={{ fontSize:9, color:"#9aa0ae", letterSpacing:"0.06em", textTransform: "uppercase" }}>{TARGET_CHAIN.name} · Genesis</div>
          </div>
          
          <div style={{ maxHeight:400, overflowY:"auto" }}>
            {connectors.map(c => (
              <button 
                key={c.uid} 
                onClick={() => { connect({ connector: c }); setOpen(false); }}
                className="wallet-option"
              >
                <div className="wallet-icon-box">
                  {c.name.slice(0,1).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0f1419", textTransform: "uppercase", letterSpacing: "0.04em" }}>{c.name}</div>
                  <div style={{ fontSize:10, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:2 }}>Safe Selection</div>
                </div>
                <div style={{ fontSize:16, fontWeight:700 }}>→</div>
              </button>
            ))}
          </div>
          
          <div style={{ padding:"16px 20px", background:"#f7f8fa" }}>
            <p style={{ fontSize:9, color:"#9aa0ae", letterSpacing:"0.06em", textTransform: "uppercase", fontWeight: 700 }}>Bittensor EVM · Chain 964</p>
          </div>
        </div>
      )}
    </div>
  );

  if (wrongNetwork) return (
    <button 
      onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
      className="btn-primary"
      style={{ background:"#fee2e2", color:"#b91c1c", borderColor:"#ef4444", boxShadow:"4px 4px 0px #ef4444" }}
    >
      Switch to Chain 964
    </button>
  );

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button 
        onClick={() => setOpen(v => !v)}
        className="btn-primary"
        style={{ background:"#fff", color:"#0f1419", display:"flex", alignItems:"center", gap:12 }}
      >
        <div style={{ width:8, height:8, background:"#00c49a", border:"1px solid #0f1419" }} />
        <span style={{ fontFamily:"monospace", fontSize:13 }}>
          {address?.slice(0,6)}...{address?.slice(-4)}
        </span>
      </button>

      {open && (
        <div className="wallet-dropdown" style={{ width:280 }}>
          <div style={{ padding:"24px 20px", borderBottom:"3px solid #0f1419", background:"#f7f8fa" }}>
            <div style={{ fontSize:9, color:"#9aa0ae", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.14em", fontWeight:700 }}>Active wallet</div>
            <div style={{ fontSize:14, fontFamily:"monospace", color:"#0f1419", fontWeight:700 }}>{address?.slice(0,12)}...</div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:16, padding:"6px 12px", background:"#0f1419", color:"#ffffff", fontSize:9, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>
              <div style={{ width:6, height:6, background:"#00c49a" }} />
              {TARGET_CHAIN.name}
            </div>
          </div>
          
          <button 
            onClick={() => { disconnect(); setOpen(false); }}
            className="wallet-option" 
            style={{ color:"#c0392b" }}
          >
            <div className="wallet-icon-box" style={{ borderColor:"#ef4444", color:"#ef4444" }}>✕</div>
            <div style={{ flex:1, fontSize: 13, textTransform: "uppercase", fontWeight:700 }}>Disconnect</div>
          </button>
        </div>
      )}
    </div>
  );
}
