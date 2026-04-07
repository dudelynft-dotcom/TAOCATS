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

  const dropdownStyle: React.CSSProperties = {
    position:"absolute", right:0, top:"calc(100% + 6px)", minWidth:200,
    background:"#ffffff", border:"1px solid #e0e3ea", borderRadius:4,
    overflow:"hidden", zIndex:100, boxShadow:"0 8px 32px rgba(0,0,0,0.10)",
  };
  const dropHeaderStyle: React.CSSProperties = {
    padding:"8px 16px 6px", fontSize:10, fontWeight:700, letterSpacing:"0.10em",
    textTransform:"uppercase", color:"#9aa0ae", borderBottom:"1px solid #e0e3ea", background:"#f7f8fa",
  };

  if (!isConnected) return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)} disabled={isPending}
        style={{ padding:"7px 16px", background:"#0f1419", color:"#fff", border:"none", borderRadius:2, cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", transition:"background 0.15s" }}>
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
      {open && (
        <div style={dropdownStyle}>
          <div style={dropHeaderStyle}>Select Wallet</div>
          {connectors.map(c => (
            <button key={c.uid} onClick={() => { connect({ connector: c }); setOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:"transparent", border:"none", cursor:"pointer", color:"#0f1419", fontSize:12, fontWeight:600, textAlign:"left", letterSpacing:"0.04em", transition:"background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fa")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <div style={{ width:26, height:26, borderRadius:2, background:"#f2f4f7", border:"1px solid #e0e3ea", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#5a6478" }}>
                {c.name.slice(0,2).toUpperCase()}
              </div>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (wrongNetwork) return (
    <button onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
      style={{ padding:"7px 16px", background:"#fde8e8", border:"1px solid #f5c6c6", color:"#c0392b", borderRadius:2, cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
      Wrong Network
    </button>
  );

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 14px", background:"#f7f8fa", border:"1px solid #e0e3ea", borderRadius:2, cursor:"pointer", color:"#0f1419", fontSize:11, fontWeight:600, letterSpacing:"0.04em", transition:"all 0.15s" }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#00c49a")}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#e0e3ea")}>
        <div style={{ width:8, height:8, borderRadius:"50%", background:"#00c49a", flexShrink:0 }} />
        <span style={{ fontFamily:"var(--font-mono), monospace", fontSize:11 }}>{address?.slice(0,6)}...{address?.slice(-4)}</span>
      </button>
      {open && (
        <div style={dropdownStyle}>
          <div style={{ padding:"10px 16px", borderBottom:"1px solid #e0e3ea", background:"#f7f8fa" }}>
            <div style={{ fontSize:10, color:"#9aa0ae", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:700 }}>Connected · {TARGET_CHAIN.name}</div>
            <div style={{ fontSize:11, fontFamily:"monospace", color:"#0f1419", fontWeight:600 }}>{address?.slice(0,10)}...{address?.slice(-4)}</div>
          </div>
          <button onClick={() => { disconnect(); setOpen(false); }}
            style={{ width:"100%", padding:"10px 16px", background:"transparent", border:"none", cursor:"pointer", color:"#c0392b", fontSize:11, fontWeight:700, textAlign:"left", letterSpacing:"0.06em", textTransform:"uppercase", transition:"background 0.1s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fde8e8")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
