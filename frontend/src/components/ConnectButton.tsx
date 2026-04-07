"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from "wagmi";
import { formatEther } from "viem";
import { subtensor, subtensorTestnet } from "@/lib/config";

const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
const TARGET_CHAIN = IS_TESTNET ? subtensorTestnet : subtensor;
const LAST_WALLET_KEY = "tao_last_wallet";

function WalletIcon({ name, size = 34 }: { name: string; size?: number }) {
  const colors: Record<string, { bg: string; color: string }> = {
    "MetaMask":   { bg: "#fff3e0", color: "#e8710a" },
    "Rabby":      { bg: "#eef2ff", color: "#6366f1" },
    "Injected":   { bg: "#f0fdf4", color: "#16a34a" },
    "Phantom":    { bg: "#faf5ff", color: "#7c3aed" },
    "Keplr":      { bg: "#fef9e7", color: "#d97706" },
    "Backpack":   { bg: "#fff0f6", color: "#db2777" },
    "Talisman":   { bg: "#f0f9ff", color: "#0369a1" },
    "Leap":       { bg: "#f0fdf4", color: "#15803d" },
    "Ronin":      { bg: "#fff1f2", color: "#be123c" },
    "Nightly":    { bg: "#faf5ff", color: "#6d28d9" },
    "Magic Eden": { bg: "#fff7ed", color: "#ea580c" },
  };
  const key = Object.keys(colors).find(k => name.toLowerCase().includes(k.toLowerCase())) ?? "Injected";
  const col = colors[key];
  return (
    <div style={{ width:size, height:size, background:col.bg, border:`1.5px solid ${col.color}40`,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, borderRadius:3 }}>
      <span style={{ fontSize:size * 0.44, fontWeight:800, color:col.color, fontFamily:"monospace" }}>
        {name.slice(0,1).toUpperCase()}
      </span>
    </div>
  );
}

export default function ConnectButton() {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(false);
  // position: fixed coords anchored to button bottom-right
  const [pos, setPos]         = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== TARGET_CHAIN.id;
  const { data: balance } = useBalance({ address, query: { enabled: !!address } });

  // Sort connectors: last-used first
  const lastUsed = typeof window !== "undefined" ? localStorage.getItem(LAST_WALLET_KEY) : null;
  const sortedConnectors = [...connectors].sort((a, b) => {
    if (a.name === lastUsed) return -1;
    if (b.name === lastUsed) return 1;
    return 0;
  });

  function calcPos() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
  }

  function toggleOpen() {
    calcPos();
    setOpen(v => !v);
  }

  // Auto-close when wallet connects
  useEffect(() => { if (isConnected) setOpen(false); }, [isConnected]);

  // Close on outside click
  const handleOutside = useCallback((e: MouseEvent) => {
    if (btnRef.current && !btnRef.current.closest("[data-wallet-root]")?.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      // Recalculate on scroll/resize
      window.addEventListener("scroll", calcPos, true);
      window.addEventListener("resize", calcPos);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", calcPos, true);
      window.removeEventListener("resize", calcPos);
    };
  }, [open, handleOutside]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, []);

  function copyAddress() {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const dropdownStyle: React.CSSProperties = {
    position: "fixed",
    top: pos.top,
    right: pos.right,
    width: 288,
    background: "#fff",
    border: "2px solid #0f1419",
    boxShadow: "5px 5px 0 #0f1419",
    zIndex: 99999,
    fontFamily: "var(--font-mono), monospace",
  };

  /* ── WRONG NETWORK ── */
  if (wrongNetwork) return (
    <button onClick={() => switchChain({ chainId: TARGET_CHAIN.id })} className="btn-primary"
      style={{ background:"#fff0f0", color:"#b91c1c", borderColor:"#ef4444", fontSize:10 }}>
      Switch Network
    </button>
  );

  /* ── NOT CONNECTED ── */
  if (!isConnected) return (
    <div data-wallet-root style={{ position:"relative" }}>
      <button ref={btnRef} onClick={toggleOpen} disabled={isPending} className="btn-primary">
        {isPending ? "CONNECTING..." : "CONNECT"}
      </button>

      {open && (
        <div style={dropdownStyle}>
          {/* Header */}
          <div style={{ background:"#0f1419", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.10em", color:"#fff", textTransform:"uppercase" }}>
              Connect Wallet
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:8, color:"#5a6478", letterSpacing:"0.08em" }}>{TARGET_CHAIN.name}</span>
              <button onClick={() => setOpen(false)} style={{ background:"transparent", border:"none", color:"#5a6478", cursor:"pointer", fontSize:15, lineHeight:1, padding:0 }}>✕</button>
            </div>
          </div>

          {/* Wallet list */}
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {sortedConnectors.map((c, i) => (
              <button key={c.uid}
                onClick={() => {
                  localStorage.setItem(LAST_WALLET_KEY, c.name);
                  connect({ connector: c });
                  setOpen(false);
                }}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:12,
                  padding:"10px 16px", background:"#fff", border:"none",
                  borderBottom: i < sortedConnectors.length - 1 ? "1px solid #f0f1f4" : "none",
                  cursor:"pointer", textAlign:"left", transition:"background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fa")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                <WalletIcon name={c.name} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {c.name}
                    {c.name === lastUsed && (
                      <span style={{ marginLeft:8, fontSize:8, color:"#00c49a", fontWeight:700 }}>LAST USED</span>
                    )}
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="#9aa0ae" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{ background:"#f7f8fa", borderTop:"1px solid #e0e3ea", padding:"8px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:8, color:"#9aa0ae", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Chain {TARGET_CHAIN.id}</span>
            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
              <div style={{ width:5, height:5, background:"#00c49a", borderRadius:"50%" }} />
              <span style={{ fontSize:8, color:"#00c49a", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                {IS_TESTNET ? "Testnet" : "Mainnet"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── CONNECTED ── */
  return (
    <div data-wallet-root style={{ position:"relative" }}>
      <button ref={btnRef} onClick={toggleOpen}
        style={{
          display:"flex", alignItems:"center", gap:8, padding:"7px 12px",
          background:"#fff", border:"2px solid #0f1419", cursor:"pointer",
          fontFamily:"monospace", transition:"all 0.1s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f7f8fa")}
        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
        <div style={{ width:7, height:7, background:"#00c49a", border:"1px solid #059669", borderRadius:"50%", flexShrink:0 }} />
        <span style={{ fontSize:11, fontWeight:700, color:"#0f1419", letterSpacing:"0.05em" }}>
          {address?.slice(0,6)}...{address?.slice(-4)}
        </span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform 0.15s", flexShrink:0 }}>
          <path d="M2 3.5l3 3 3-3" stroke="#9aa0ae" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={dropdownStyle}>
          {/* Header */}
          <div style={{ background:"#0f1419", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:6, height:6, background:"#00c49a", borderRadius:"50%" }} />
              <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.10em", color:"#fff", textTransform:"uppercase" }}>Connected</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:8, color:"#5a6478" }}>{TARGET_CHAIN.name}</span>
              <button onClick={() => setOpen(false)} style={{ background:"transparent", border:"none", color:"#5a6478", cursor:"pointer", fontSize:15, lineHeight:1, padding:0 }}>✕</button>
            </div>
          </div>

          {/* Address */}
          <div style={{ padding:"14px 16px", borderBottom:"1px solid #f0f1f4" }}>
            <div style={{ fontSize:8, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:5 }}>Wallet Address</div>
            <div style={{ fontSize:10, fontFamily:"monospace", color:"#0f1419", fontWeight:700, wordBreak:"break-all", marginBottom:8 }}>{address}</div>
            <button onClick={copyAddress}
              style={{
                display:"inline-flex", alignItems:"center", gap:5, padding:"5px 10px",
                background: copied ? "#f0fdf4" : "#f7f8fa",
                border: copied ? "1px solid #16a34a" : "1px solid #e0e3ea",
                cursor:"pointer", fontSize:9, fontWeight:700,
                color: copied ? "#16a34a" : "#5a6478",
                textTransform:"uppercase", letterSpacing:"0.06em",
              }}>
              {copied ? (
                <><svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied!</>
              ) : (
                <><svg width="9" height="9" viewBox="0 0 12 12" fill="none"><rect x="4" y="4" width="7" height="7" rx="1" stroke="#5a6478" strokeWidth="1.2"/><path d="M8 4V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5a1 1 0 001 1h2" stroke="#5a6478" strokeWidth="1.2"/></svg>Copy Address</>
              )}
            </button>
          </div>

          {/* Balance */}
          {balance && (
            <div style={{ padding:"10px 16px", borderBottom:"1px solid #f0f1f4", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.08em" }}>Balance</span>
              <span style={{ fontFamily:"monospace", fontSize:14, fontWeight:800, color:"#0f1419" }}>
                τ {parseFloat(formatEther(balance.value)).toFixed(4)}
              </span>
            </div>
          )}

          {/* Disconnect */}
          <button onClick={() => { disconnect(); setOpen(false); }}
            style={{
              width:"100%", padding:"12px 16px", background:"#fff", border:"none",
              display:"flex", alignItems:"center", gap:12, cursor:"pointer", transition:"background 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
            <div style={{ width:28, height:28, border:"2px solid #ef4444", display:"flex", alignItems:"center", justifyContent:"center", color:"#ef4444", fontSize:11, fontWeight:800, flexShrink:0 }}>✕</div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", textTransform:"uppercase", letterSpacing:"0.07em" }}>Disconnect</div>
              <div style={{ fontSize:8, color:"#9aa0ae", textTransform:"uppercase", marginTop:1 }}>Sign out of wallet</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
