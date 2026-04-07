"use client";
import { useState, useRef, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from "wagmi";
import { formatEther } from "viem";
import { subtensor, subtensorTestnet } from "@/lib/config";

const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
const TARGET_CHAIN = IS_TESTNET ? subtensorTestnet : subtensor;

function WalletIcon({ name, size = 44 }: { name: string; size?: number }) {
  const colors: Record<string, { bg: string; color: string }> = {
    "MetaMask":  { bg: "#fff3e0", color: "#e8710a" },
    "Rabby":     { bg: "#eef2ff", color: "#6366f1" },
    "Injected":  { bg: "#f0fdf4", color: "#16a34a" },
    "Phantom":   { bg: "#faf5ff", color: "#7c3aed" },
    "Keplr":     { bg: "#fef9e7", color: "#d97706" },
  };
  const key = Object.keys(colors).find(k => name.includes(k)) ?? "Injected";
  const col = colors[key];
  return (
    <div style={{ width:size, height:size, background:col.bg, border:`2px solid ${col.color}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontSize:size * 0.4, fontWeight:800, color:col.color, fontFamily:"monospace" }}>
        {name.slice(0,1).toUpperCase()}
      </span>
    </div>
  );
}

function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:998, backdropFilter:"blur(2px)" }} />
  );
}

export default function ConnectButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== TARGET_CHAIN.id;

  const { data: balance } = useBalance({ address, query: { enabled: !!address } });

  // Close modal when wallet connects
  useEffect(() => {
    if (isConnected) setOpen(false);
  }, [isConnected]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /* ── WRONG NETWORK ── */
  if (wrongNetwork) return (
    <button onClick={() => switchChain({ chainId: TARGET_CHAIN.id })} className="btn-primary"
      style={{ background:"#fff0f0", color:"#b91c1c", borderColor:"#ef4444", fontSize:10 }}>
      Switch Network
    </button>
  );

  /* ── NOT CONNECTED ── */
  if (!isConnected) return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)} disabled={isPending} className="btn-primary">
        {isPending ? "CONNECTING..." : "CONNECT"}
      </button>

      {open && (
        <>
          <Backdrop onClick={() => setOpen(false)} />
          <div style={{
            position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            width:380, background:"#fff", border:"2px solid #0f1419",
            boxShadow:"8px 8px 0 #0f1419", zIndex:999,
            fontFamily:"var(--font-mono), monospace",
          }}>
            {/* Header */}
            <div style={{ background:"#0f1419", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800, letterSpacing:"0.12em", color:"#fff", textTransform:"uppercase" }}>
                  Connect Wallet
                </div>
                <div style={{ fontSize:9, color:"#5a6478", letterSpacing:"0.10em", textTransform:"uppercase", marginTop:3 }}>
                  {TARGET_CHAIN.name}
                </div>
              </div>
              <button onClick={() => setOpen(false)}
                style={{ background:"transparent", border:"none", color:"#5a6478", cursor:"pointer", fontSize:18, lineHeight:1, padding:4 }}>
                ✕
              </button>
            </div>

            {/* Wallet list */}
            <div style={{ padding:"8px 0" }}>
              {connectors.map((c, i) => (
                <button key={c.uid} onClick={() => { connect({ connector: c }); }}
                  style={{
                    width:"100%", display:"flex", alignItems:"center", gap:16,
                    padding:"14px 24px", background:"#fff", border:"none",
                    borderBottom: i < connectors.length - 1 ? "1px solid #f0f1f4" : "none",
                    cursor:"pointer", textAlign:"left", transition:"background 0.1s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fa")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                  <WalletIcon name={c.name} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginTop:2 }}>
                      EVM Compatible
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="#0f1419" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div style={{ background:"#f7f8fa", borderTop:"1px solid #e0e3ea", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:9, color:"#9aa0ae", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>
                Bittensor EVM · Chain {TARGET_CHAIN.id}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:6, height:6, background:"#00c49a", borderRadius:"50%" }} />
                <span style={{ fontSize:9, color:"#00c49a", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>
                  {IS_TESTNET ? "Testnet" : "Mainnet"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ── CONNECTED ── */
  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{
          display:"flex", alignItems:"center", gap:10, padding:"8px 14px",
          background:"#fff", border:"2px solid #0f1419", cursor:"pointer",
          fontFamily:"monospace", transition:"all 0.1s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fa")}
        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
        <div style={{ width:8, height:8, background:"#00c49a", border:"1px solid #059669", borderRadius:"50%" }} />
        <span style={{ fontSize:11, fontWeight:700, color:"#0f1419", letterSpacing:"0.06em" }}>
          {address?.slice(0,6)}...{address?.slice(-4)}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5l3 3 3-3" stroke="#9aa0ae" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <>
          <Backdrop onClick={() => setOpen(false)} />
          <div style={{
            position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            width:340, background:"#fff", border:"2px solid #0f1419",
            boxShadow:"8px 8px 0 #0f1419", zIndex:999,
            fontFamily:"var(--font-mono), monospace",
          }}>
            {/* Header */}
            <div style={{ background:"#0f1419", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.12em", color:"#fff", textTransform:"uppercase" }}>
                  Connected
                </div>
                <div style={{ fontSize:9, color:"#5a6478", letterSpacing:"0.10em", textTransform:"uppercase", marginTop:3 }}>
                  {TARGET_CHAIN.name}
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:7, height:7, background:"#00c49a", borderRadius:"50%" }} />
                  <span style={{ fontSize:9, color:"#00c49a", fontWeight:700, letterSpacing:"0.10em" }}>LIVE</span>
                </div>
                <button onClick={() => setOpen(false)}
                  style={{ background:"transparent", border:"none", color:"#5a6478", cursor:"pointer", fontSize:18, lineHeight:1, padding:4 }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Address + balance */}
            <div style={{ padding:"20px 24px", borderBottom:"1px solid #f0f1f4" }}>
              <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8 }}>
                Wallet Address
              </div>
              <div style={{ fontSize:11, fontFamily:"monospace", color:"#0f1419", fontWeight:700, wordBreak:"break-all", marginBottom:12 }}>
                {address}
              </div>

              {/* Copy Address button */}
              <button onClick={copyAddress}
                style={{
                  display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
                  background: copied ? "#f0fdf4" : "#f7f8fa",
                  border: copied ? "1px solid #16a34a" : "1px solid #e0e3ea",
                  cursor:"pointer", fontSize:10, fontWeight:700,
                  color: copied ? "#16a34a" : "#5a6478", letterSpacing:"0.08em",
                  textTransform:"uppercase", transition:"all 0.15s", marginBottom:16,
                }}>
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="4" y="4" width="7" height="7" rx="1" stroke="#5a6478" strokeWidth="1.2"/>
                      <path d="M8 4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="#5a6478" strokeWidth="1.2"/>
                    </svg>
                    Copy Address
                  </>
                )}
              </button>

              {balance && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:"#f7f8fa", border:"1px solid #e0e3ea" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em" }}>Balance</span>
                  <span style={{ fontFamily:"monospace", fontSize:14, fontWeight:800, color:"#0f1419" }}>
                    τ {parseFloat(formatEther(balance.value)).toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            {/* Disconnect */}
            <button onClick={() => { disconnect(); setOpen(false); }}
              style={{
                width:"100%", padding:"16px 24px", background:"#fff", border:"none",
                display:"flex", alignItems:"center", gap:14, cursor:"pointer",
                transition:"background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
              <div style={{ width:36, height:36, border:"2px solid #ef4444", display:"flex", alignItems:"center", justifyContent:"center", color:"#ef4444", fontSize:14, fontWeight:800 }}>
                ✕
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#ef4444", textTransform:"uppercase", letterSpacing:"0.08em" }}>Disconnect</div>
                <div style={{ fontSize:9, color:"#9aa0ae", letterSpacing:"0.08em", textTransform:"uppercase", marginTop:2 }}>Sign out of wallet</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
