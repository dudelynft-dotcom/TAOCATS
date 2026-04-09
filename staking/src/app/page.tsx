"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  useAccount, useReadContract, useReadContracts,
  useWaitForTransactionReceipt, useConnect, useDisconnect,
  useChainId, useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther } from "viem";
import { useContractWrite } from "@/lib/useContractWrite";
import { CONTRACTS, MAIN_SITE, SEASON_DAYS, subtensor } from "@/lib/config";
import { NFT_ABI, RARITY_ABI, STAKING_ABI, BITCAT_ABI } from "@/lib/abis";

// ── Tier helpers ───────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  Legendary: "#a855f7", Epic: "#3b82f6", Rare: "#10b981",
  Uncommon: "#f59e0b", Common: "#94a3b8",
};
const TIER_BG: Record<string, string> = {
  Legendary: "#faf5ff", Epic: "#eff6ff", Rare: "#f0fdf4",
  Uncommon: "#fffbeb", Common: "#f8fafc",
};
const TIER_MULTI: Record<string, string> = {
  Legendary: "3×", Epic: "2×", Rare: "1.5×", Uncommon: "1.2×", Common: "1×",
};
const TIER_BORDER: Record<string, string> = {
  Legendary: "#a855f7", Epic: "#3b82f6", Rare: "#10b981",
  Uncommon: "#f59e0b", Common: "#e2e8f0",
};

// ── Season countdown ───────────────────────────────────────────────────────────
function useCountdown(endTs: number | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (endTs === undefined) return { label: "—", ended: false, loading: true };
  const rem = Math.max(0, endTs * 1000 - now);
  const d = Math.floor(rem / 86_400_000);
  const h = Math.floor((rem % 86_400_000) / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  const s = Math.floor((rem % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (rem === 0) return { label: "Season Ended", ended: true, loading: false };
  if (d > 0) return { label: `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`, ended: false, loading: false };
  return { label: `${pad(h)}:${pad(m)}:${pad(s)}`, ended: false, loading: false };
}

// ── Live reward tick ───────────────────────────────────────────────────────────
function useLivePending(onChain: bigint, dailyTotal: bigint, lastRefresh: number) {
  const [extra, setExtra] = useState(0n);
  useEffect(() => {
    setExtra(0n);
    if (dailyTotal === 0n) return;
    const perMs = dailyTotal / BigInt(86_400_000);
    const id = setInterval(() => {
      setExtra(perMs * BigInt(Date.now() - lastRefresh));
    }, 500);
    return () => clearInterval(id);
  }, [dailyTotal, lastRefresh, onChain]);
  return onChain + extra;
}

// ── Cat image ──────────────────────────────────────────────────────────────────
function CatImg({ id, size = 130 }: { id: number; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, background: "#f1f5f9", position: "relative", overflow: "hidden", flexShrink: 0 }}>
      {!err ? (
        <Image
          src={`https://taocats.fun/samples/${id % 12 + 1}.png`}
          alt={`#${id}`} width={size} height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setErr(true)} unoptimized
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>#{id}</div>
      )}
    </div>
  );
}

// ── Connect / wallet modal button ─────────────────────────────────────────────
function ConnectBtn({ large }: { large?: boolean }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!isConnected) {
    return (
      <button
        className="btn-black"
        style={large ? { padding: "16px 40px", fontSize: 13, letterSpacing: "0.10em" } : {}}
        onClick={() => connect({ connector: injected() })}>
        Connect Wallet
      </button>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
          border: `1.5px solid ${open ? "#0f1419" : "#e2e8f0"}`,
          background: open ? "#0f1419" : "#fff",
          cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", flexShrink: 0 }}
          className="pulse-dot" />
        <span style={{ fontSize: 11, fontWeight: 700, color: open ? "#fff" : "#0f1419", letterSpacing: "0.04em" }}>
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke={open ? "#9aa0ae" : "#94a3b8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 100,
            background: "#fff", border: "2px solid #0f1419", minWidth: 280,
            boxShadow: "4px 4px 0 #0f1419" }}>

            <div style={{ padding: "16px 18px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.14em",
                textTransform: "uppercase", marginBottom: 8 }}>Connected Wallet</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#0f1419", fontWeight: 700,
                wordBreak: "break-all", lineHeight: 1.7, background: "#f8fafc", padding: "8px 10px" }}>
                {address}
              </div>
            </div>

            <div style={{ padding: "6px" }}>
              <button onClick={copy}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "11px 12px", background: "transparent", border: "none",
                  cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="1" stroke="#0f1419" strokeWidth="2"/>
                  <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" stroke="#0f1419" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#0f1419", letterSpacing: "0.05em" }}>
                  {copied ? "Copied!" : "Copy Address"}
                </span>
                {copied && <span style={{ marginLeft: "auto", fontSize: 11, color: "#10b981", fontWeight: 800 }}>✓</span>}
              </button>

              <button onClick={() => { disconnect(); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "11px 12px", background: "transparent", border: "none",
                  cursor: "pointer", fontFamily: "inherit" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="16,17 21,12 16,7" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", letterSpacing: "0.05em" }}>Disconnect</span>
              </button>
            </div>

            <div style={{ padding: "10px 18px", borderTop: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", gap: 8, background: "#f8fafc" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, letterSpacing: "0.10em",
                textTransform: "uppercase" }}>Bittensor EVM · Chain 964</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Stat cell ─────────────────────────────────────────────────────────────────
function StatCell({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="stat-cell">
      <div className="stat-lbl">{label}</div>
      <div className="stat-val" style={accent ? { color: "#10b981" } : {}}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8", marginLeft: 5 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const NFT_ADDR     = CONTRACTS.NFT;
  const STAKING_ADDR = CONTRACTS.STAKING;
  const RARITY_ADDR  = CONTRACTS.RARITY;
  const BITCAT_ADDR  = CONTRACTS.BITCAT;
  const ready        = !!(NFT_ADDR && STAKING_ADDR && RARITY_ADDR && BITCAT_ADDR);
  const wrongChain   = isConnected && chainId !== subtensor.id;

  // ── Reads ──
  const { data: totalStaked,   refetch: rfTotal }    = useReadContract({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "totalStaked",      query: { enabled: ready } });
  const { data: endTime }                             = useReadContract({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "endTime",          query: { enabled: ready } });
  const { data: unstakedIds,   refetch: rfUnstaked }  = useReadContract({ address: NFT_ADDR,     abi: NFT_ABI,     functionName: "tokensOfOwner",    args: [address!], query: { enabled: ready && !!address } });
  const { data: stakedIds,     refetch: rfStaked }    = useReadContract({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "stakedTokensOf",   args: [address!], query: { enabled: ready && !!address } });
  const { data: pendingRaw,    refetch: rfPending, dataUpdatedAt } = useReadContract({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "pendingRewardsOf", args: [address!], query: { enabled: ready && !!address, refetchInterval: 30_000 } });
  const { data: bitcatBal,     refetch: rfBal }       = useReadContract({ address: BITCAT_ADDR,  abi: BITCAT_ABI,  functionName: "balanceOf",        args: [address!], query: { enabled: ready && !!address } });
  const { data: isApproved,    refetch: rfApproval }  = useReadContract({ address: NFT_ADDR,     abi: NFT_ABI,     functionName: "isApprovedForAll", args: [address!, STAKING_ADDR], query: { enabled: ready && !!address } });
  const { data: boostTier }                           = useReadContract({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "tradingBoostTier", args: [address!], query: { enabled: ready && !!address } });

  const allIds      = useMemo(() => [...(unstakedIds ?? []), ...(stakedIds ?? [])], [unstakedIds, stakedIds]);
  const stakedArr   = useMemo(() => Array.from(stakedIds ?? []), [stakedIds]);
  const unstakedArr = Array.from(unstakedIds ?? []);

  const { data: rarityData } = useReadContract({ address: RARITY_ADDR, abi: RARITY_ABI, functionName: "rarityBatch", args: [allIds], query: { enabled: ready && allIds.length > 0 } });
  const { data: dailyRates } = useReadContracts({ contracts: stakedArr.map(id => ({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "dailyRateOf", args: [id] })), query: { enabled: ready && stakedArr.length > 0 } });
  const { data: stakeInfos } = useReadContracts({ contracts: stakedArr.map(id => ({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: "stakes",     args: [id] })), query: { enabled: ready && stakedArr.length > 0 } });

  const tierMap = useMemo(() => {
    const m: Record<string, string> = {};
    if (!rarityData) return m;
    allIds.forEach((id, i) => { m[String(id)] = rarityData[2][i] ?? "Common"; });
    return m;
  }, [rarityData, allIds]);

  const totalDailyRate = useMemo(() =>
    (dailyRates ?? []).reduce((acc, r) => acc + ((r.result as bigint) ?? 0n), 0n),
  [dailyRates]);

  const livePending  = useLivePending(pendingRaw ?? 0n, totalDailyRate, dataUpdatedAt);
  const countdown    = useCountdown(endTime !== undefined ? Number(endTime) : undefined);
  const stakedCount  = stakedArr.length;
  const boostNum     = Number(boostTier ?? 0);
  const boostLabels  = ["No boost", "+5% boost", "+10% boost", "+15% boost"];
  const seasonPct    = endTime ? Math.max(0, Math.min(100, 100 - (Number(endTime) * 1000 - Date.now()) / (SEASON_DAYS * 86_400_000) * 100)) : 0;

  // ── TX state ──
  const [sel,       setSel]      = useState<Set<string>>(new Set());
  const [lockOpt,   setLockOpt]  = useState<0|1|2>(0);
  const [txStatus,  setTxStatus] = useState("");
  const [txError,   setTxError]  = useState("");
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>();

  const { writeContract, isPending: txPending, data: txHash, error: writeError, reset: resetWrite } = useContractWrite();

  // Surface write errors
  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message ?? String(writeError);
    // User rejected
    if (msg.includes("User rejected") || msg.includes("user rejected") || msg.includes("4001")) {
      setTxError("Transaction rejected.");
    } else if (msg.includes("Wallet not connected") || msg.includes("wallet not connected")) {
      setTxError("Wallet not authorized — please reconnect.");
    } else if (msg.includes("does not match the target chain") || msg.includes("chain") && msg.includes("id:")) {
      // Auto-switch and clear error so user can retry
      switchChainAsync({ chainId: subtensor.id })
        .then(() => setTxError("Switched to Bittensor EVM — click Approve again."))
        .catch(() => setTxError("Switch to Bittensor EVM (chain 964) in your wallet."));
      return;
    } else {
      setTxError(msg.slice(0, 80));
    }
    setTxStatus("");
    const t = setTimeout(() => { setTxError(""); resetWrite(); }, 5000);
    return () => clearTimeout(t);
  }, [writeError]);

  // Wait for tx confirmation
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: pendingTx });
  const lastTxType = useRef("");

  useEffect(() => {
    if (!txConfirmed || !pendingTx) return;
    const type = lastTxType.current;
    setTimeout(() => {
      rfUnstaked(); rfStaked(); rfPending(); rfBal(); rfApproval(); rfTotal();
      setTxStatus(""); setPendingTx(undefined);
    }, 2000);
    if (type === "stake") setSel(new Set());
  }, [txConfirmed]);

  useEffect(() => {
    if (txHash) setPendingTx(txHash);
  }, [txHash]);

  const refetchAll = useCallback(() => {
    rfUnstaked(); rfStaked(); rfPending(); rfBal(); rfApproval(); rfTotal();
  }, [rfUnstaked, rfStaked, rfPending, rfBal, rfApproval, rfTotal]);

  const toggle    = (id: bigint) => setSel(p => { const n = new Set(p); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n; });
  const selectAll = () => setSel(new Set((unstakedIds ?? []).map(String)));
  const clearSel  = () => setSel(new Set());

  async function ensureChain() {
    const provider = (window as any).ethereum;
    if (!provider) { setTxError("No wallet detected."); return false; }
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x3C4" }], // 964
      });
      return true;
    } catch (err: any) {
      // 4902 = chain not added yet → add it
      if (err?.code === 4902 || err?.code === -32603) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x3C4",
              chainName: "Bittensor EVM",
              nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 },
              rpcUrls: ["https://lite.chain.opentensor.ai"],
              blockExplorerUrls: ["https://evm-explorer.tao.network"],
            }],
          });
          return true;
        } catch {
          setTxError("Failed to add Bittensor EVM to wallet.");
          return false;
        }
      }
      setTxError("Switch to Bittensor EVM (chain 964) in your wallet.");
      return false;
    }
  }

  async function handleApprove() {
    if (!await ensureChain()) return;
    lastTxType.current = "approve";
    setTxError(""); setTxStatus("Confirm in wallet…");
    await writeContract({ address: NFT_ADDR, abi: NFT_ABI as any, functionName: "setApprovalForAll", args: [STAKING_ADDR, true], gas: BigInt(60_000) });
  }
  async function handleStake() {
    if (!sel.size || !await ensureChain()) return;
    lastTxType.current = "stake";
    setTxError(""); setTxStatus(`Staking ${sel.size} cat${sel.size > 1 ? "s" : ""}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "stake", args: [Array.from(sel).map(BigInt), lockOpt], gas: BigInt(80_000 + sel.size * 120_000) });
  }
  async function handleUnstake(id: bigint) {
    if (!await ensureChain()) return;
    lastTxType.current = "unstake";
    setTxError(""); setTxStatus(`Unstaking #${id}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [[id]], gas: BigInt(120_000) });
  }
  async function handleClaim() {
    if (!await ensureChain()) return;
    lastTxType.current = "claim";
    setTxError(""); setTxStatus("Claiming $BITCAT…");
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "claim", args: [], gas: BigInt(100_000) });
  }

  const lockOptions = [
    { label: "Flexible", sub: "No lock period",  bonus: "" },
    { label: "7 Days",   sub: "7 day lock",       bonus: "+25%" },
    { label: "30 Days",  sub: "30 day lock",       bonus: "+80%" },
  ];

  const isBusy = txPending || (!!pendingTx && !txConfirmed);

  // ── Not ready state ──
  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24, padding: 40, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://taocats.fun/logo.png" width={28} height={28} alt="" style={{ imageRendering: "pixelated" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            TAO CAT <span style={{ color: "#94a3b8" }}>· STAKING</span>
          </span>
        </div>
        <div style={{ border: "2px solid #0f1419", padding: "48px 56px", textAlign: "center", maxWidth: 440, boxShadow: "4px 4px 0 #0f1419" }}>
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Season 1 Launching Soon</div>
          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 2 }}>
            Follow <a href="https://x.com/CatsonTao" target="_blank" rel="noopener noreferrer" style={{ color: "#0f1419", fontWeight: 700 }}>@CatsonTao</a> for the launch announcement.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center" }}>
            <a href={MAIN_SITE + "/mint"} className="btn-black" style={{ textDecoration: "none" }}>Mint a Cat →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>

      {/* ── WRONG CHAIN BANNER ── */}
      {wrongChain && (
        <div style={{ background: "#fef3c7", borderBottom: "2px solid #f59e0b", padding: "10px 32px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", letterSpacing: "0.04em" }}>
            Wrong network detected. Switch to Bittensor EVM (Chain 964) to stake.
          </span>
          <button onClick={() => switchChainAsync({ chainId: subtensor.id }).catch(() => {})}
            style={{ padding: "6px 16px", background: "#f59e0b", border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
              fontFamily: "inherit", color: "#000" }}>
            Switch Network
          </button>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href={MAIN_SITE} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src="https://taocats.fun/logo.png" width={28} height={28} alt="" style={{ imageRendering: "pixelated" }} />
              </div>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#0f1419" }}>
                TAO CAT <span style={{ color: "#94a3b8" }}>· STAKING</span>
              </span>
            </a>
            {!countdown.loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
                border: `1.5px solid ${countdown.ended ? "#fecaca" : "#bbf7d0"}`,
                background: countdown.ended ? "#fef2f2" : "#f0fdf4" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: countdown.ended ? "#ef4444" : "#10b981", flexShrink: 0 }}
                  className={countdown.ended ? "" : "pulse-dot"} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
                  color: countdown.ended ? "#ef4444" : "#065f46" }}>
                  {countdown.ended ? "Season Ended" : "Season 1 · Live"}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <a href={MAIN_SITE + "/marketplace"} className="hide-mobile"
              style={{ fontSize: 10, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em",
                textTransform: "uppercase", textDecoration: "none", transition: "color 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#0f1419")}
              onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
              Marketplace ↗
            </a>
            <ConnectBtn />
          </div>
        </div>
      </nav>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          <StatCell label="Total Staked" value={totalStaked != null ? `${totalStaked}` : "—"} unit="cats" />
          <StatCell label="Season Ends" value={countdown.label} accent={!countdown.ended} />
          <StatCell label="Your Staked" value={`${stakedCount}`} unit="cats" />
          <StatCell label="Daily Earning" value={
            stakedCount > 0 && totalDailyRate > 0n
              ? `+${Number(formatEther(totalDailyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "0"
          } unit="$BITCAT" accent={stakedCount > 0 && totalDailyRate > 0n} />
          <StatCell label="Your $BITCAT" value={
            bitcatBal ? Number(formatEther(bitcatBal)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"
          } />
        </div>
        {/* Season progress */}
        <div style={{ height: 3, background: "#f1f5f9" }}>
          <div style={{ height: "100%", background: "#0f1419", width: `${seasonPct}%`, transition: "width 1s" }} />
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="main-grid">

        {/* ══ LEFT — YOUR CATS ══ */}
        <div className="left-panel">

          {/* Header */}
          <div className="panel-head">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>Your Collection</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: "#0f1419", letterSpacing: "-0.02em" }}>
                    {unstakedArr.length}
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginLeft: 6 }}>unstaked</span>
                  </span>
                  {stakedCount > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>
                      · {stakedCount} staking
                    </span>
                  )}
                </div>
              </div>
              {unstakedArr.length > 0 && (
                <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
                  <button className="btn-ghost" onClick={selectAll}>Select All</button>
                  {sel.size > 0 && <button className="btn-ghost" onClick={clearSel}>Clear</button>}
                </div>
              )}
            </div>

            {/* Lock option */}
            <div>
              <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
                Lock Period
              </div>
              <div className="lock-grid">
                {lockOptions.map((opt, i) => (
                  <div key={i} className={`lock-opt ${lockOpt === i ? "active" : ""}`}
                    onClick={() => setLockOpt(i as 0|1|2)}>
                    <div className="lo-title">{opt.label}</div>
                    <div className="lo-sub">{opt.sub}</div>
                    {opt.bonus && <div className="lo-bonus">{opt.bonus}</div>}
                    {!opt.bonus && <div style={{ fontSize: 9, color: lockOpt === i ? "#6b7280" : "#cbd5e1", marginTop: 4, fontWeight: 600 }}>no bonus</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cat grid */}
          <div className="scroll-panel">
            {!isConnected ? (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <div style={{ width: 56, height: 56, background: "#f1f5f9", border: "2px solid #e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", fontSize: 24 }}>🐱</div>
                <div style={{ fontSize: 14, color: "#0f1419", fontWeight: 800, marginBottom: 8 }}>Connect Your Wallet</div>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 28, lineHeight: 1.8 }}>Connect to view and stake your TAO Cats.</div>
                <ConnectBtn large />
              </div>
            ) : unstakedArr.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>
                  {stakedCount > 0 ? "🎉" : "🐱"}
                </div>
                <div style={{ fontSize: 14, color: "#0f1419", fontWeight: 800, marginBottom: 8 }}>
                  {stakedCount > 0 ? "All Cats Are Staking!" : "No TAO Cats Found"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.8 }}>
                  {stakedCount > 0
                    ? `${stakedCount} cat${stakedCount > 1 ? "s" : ""} earning $BITCAT rewards.`
                    : "No TAO Cats in this wallet."}
                </div>
                {stakedCount === 0 && (
                  <a href={`${MAIN_SITE}/mint`} className="btn-black" style={{ display: "inline-flex", marginTop: 24, textDecoration: "none" }}>
                    Mint a Cat →
                  </a>
                )}
              </div>
            ) : (
              <div className="cats-grid">
                {unstakedArr.map((id) => {
                  const tier    = tierMap[String(id)] ?? "Common";
                  const isSel   = sel.has(String(id));
                  const border  = isSel ? "#0f1419" : TIER_BORDER[tier] ?? "#e2e8f0";
                  return (
                    <div key={String(id)}
                      className="cat-card fade-up"
                      style={{ borderColor: border }}
                      onClick={() => toggle(id)}>
                      <div style={{ position: "relative" }}>
                        <CatImg id={Number(id)} size={130} />
                        {isSel && (
                          <div style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24,
                            background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "2px 2px 0 rgba(0,0,0,0.3)" }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                          background: "linear-gradient(transparent, rgba(15,20,25,0.85))",
                          padding: "16px 8px 6px",
                          display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: TIER_COLOR[tier] ?? "#94a3b8",
                            textTransform: "uppercase", letterSpacing: "0.08em",
                            textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                            {tier}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", opacity: 0.85 }}>
                            {TIER_MULTI[tier]}
                          </span>
                        </div>
                      </div>
                      <div className={`cat-footer ${isSel ? "selected-footer" : ""}`}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800,
                          color: isSel ? "#fff" : "#0f1419" }}>#{String(id)}</span>
                        {isSel
                          ? <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>✓</span>
                          : <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>tap</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stake CTA */}
          {isConnected && (unstakedArr.length > 0 || isApproved === false) && (
            <div style={{ padding: "16px 24px", borderTop: "2px solid #0f1419",
              display: "flex", gap: 8, alignItems: "center", background: "#fafafa" }}>
              {!isApproved ? (
                <div style={{ flex: 1 }}>
                  <button className="btn-black" style={{ width: "100%" }}
                    onClick={handleApprove} disabled={isBusy || wrongChain}>
                    {isBusy && lastTxType.current === "approve"
                      ? <><span className="spinner" />Waiting for wallet…</>
                      : wrongChain
                      ? "Switch to Chain 964 first"
                      : "Approve Staking Contract"}
                  </button>
                  <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 7, textAlign: "center", lineHeight: 1.6 }}>
                    One-time approval to let the staking contract move your NFTs.
                  </div>
                </div>
              ) : (
                <button className="btn-black" style={{ flex: 1 }}
                  onClick={handleStake}
                  disabled={isBusy || sel.size === 0 || countdown.ended || wrongChain}>
                  {isBusy && lastTxType.current === "stake"
                    ? <><span className="spinner" />{txStatus}</>
                    : sel.size > 0
                    ? `Stake ${sel.size} Cat${sel.size > 1 ? "s" : ""}${lockOpt > 0 ? ` · ${lockOptions[lockOpt].bonus} bonus` : ""}`
                    : "Select cats to stake"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══ RIGHT — REWARDS + STAKED ══ */}
        <div className="right-panel">

          {/* Rewards hero */}
          <div className="rewards-box">
            <div style={{ fontSize: 8, color: "#4b5563", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
              Pending Rewards
            </div>
            <div className={`rewards-number ${stakedCount > 0 && isConnected ? "ticking" : ""}`}>
              {isConnected
                ? Number(formatEther(livePending)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "—"}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.14em",
              textTransform: "uppercase", marginBottom: 24 }}>$BITCAT</div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
              border: "1px solid #1e2a20", marginBottom: 20 }}>
              {[
                { lbl: "Daily Rate", val: stakedCount > 0 && totalDailyRate > 0n
                    ? `+${Number(formatEther(totalDailyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : "0", unit: "/ day", accent: true },
                { lbl: "In Wallet", val: bitcatBal
                    ? Number(formatEther(bitcatBal)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "0", unit: "$BITCAT", accent: false },
              ].map(s => (
                <div key={s.lbl} style={{ padding: "14px 16px", borderRight: s.lbl === "Daily Rate" ? "1px solid #1e2a20" : "none" }}>
                  <div style={{ fontSize: 8, color: "#4b5563", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>{s.lbl}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: s.accent ? "#00c49a" : "#fff", fontFamily: "monospace" }}>
                    {s.val} <span style={{ fontSize: 9, fontWeight: 600, color: "#4b5563" }}>{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-teal" style={{ flex: 1 }} onClick={handleClaim}
                disabled={isBusy || !isConnected || livePending === 0n || wrongChain}>
                {isBusy && lastTxType.current === "claim"
                  ? <><span className="spinner dark" />Claiming…</>
                  : "Claim Rewards"}
              </button>
              {stakedCount > 0 && (
                <button onClick={async () => {
                  if (!await ensureChain()) return;
                  const now = BigInt(Math.floor(Date.now() / 1000));
                  const ids = stakedArr.filter((id, i) => {
                    const info = stakeInfos?.[i]?.result as any;
                    return !info || BigInt(info.lockUntil ?? 0) <= now;
                  });
                  if (!ids.length) return;
                  lastTxType.current = "unstake_all";
                  setTxError(""); setTxStatus(`Unstaking ${ids.length} cats…`);
                  await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [ids] });
                }} disabled={isBusy || !isConnected || wrongChain}
                  style={{ padding: "0 16px", background: "transparent", color: "#6b7280",
                    border: "1.5px solid #374151", fontSize: 9, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "inherit",
                    whiteSpace: "nowrap", transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#9ca3af"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#374151"; e.currentTarget.style.color = "#6b7280"; }}>
                  Unstake All
                </button>
              )}
            </div>

            {/* Bonus tags */}
            {isConnected && stakedCount >= 3 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px",
                  border: "1px solid #16a34a", color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em",
                  background: "rgba(22,163,74,0.08)" }}>
                  {stakedCount >= 10 ? "Collection Bonus +50%" : stakedCount >= 5 ? "Collection Bonus +20%" : "Collection Bonus +10%"}
                </span>
                {boostNum > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "4px 10px",
                    border: "1px solid #d97706", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em",
                    background: "rgba(217,119,6,0.08)" }}>
                    Trading {boostLabels[boostNum]}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Staked cats list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #f1f5f9",
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>Currently Staking</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f1419" }}>
                  {stakedCount} Cat{stakedCount !== 1 ? "s" : ""}
                </div>
              </div>
              {isConnected && (
                <button onClick={refetchAll} title="Refresh"
                  style={{ width: 32, height: 32, background: "transparent", border: "1.5px solid #e2e8f0",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "border-color 0.12s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#0f1419")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M1 4v6h6" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="staked-list scroll-panel">
              {!isConnected ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Connect wallet to see staked cats</div>
                </div>
              ) : stakedCount === 0 ? (
                <div style={{ padding: "48px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>No cats staked yet.</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Select cats on the left to start earning.</div>
                </div>
              ) : (
                stakedArr.map((id, i) => {
                  const tier      = tierMap[String(id)] ?? "Common";
                  const daily     = (dailyRates?.[i]?.result as bigint) ?? 0n;
                  const info      = stakeInfos?.[i]?.result as any;
                  const lockUntil = Number(info?.lockUntil ?? 0);
                  const isLocked  = lockUntil > Math.floor(Date.now() / 1000);
                  const lockDate  = lockUntil > 0 ? new Date(lockUntil * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

                  return (
                    <div key={String(id)} className="staked-item fade-up"
                      style={{ borderLeft: `3px solid ${TIER_BORDER[tier] ?? "#e2e8f0"}` }}>
                      <CatImg id={Number(id)} size={46} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800, color: "#0f1419" }}>#{String(id)}</span>
                          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 7px",
                            background: TIER_BG[tier] ?? "#f8fafc", color: TIER_COLOR[tier] ?? "#64748b",
                            textTransform: "uppercase", letterSpacing: "0.08em", border: `1px solid ${TIER_BORDER[tier]}20` }}>
                            {tier}
                          </span>
                          {isLocked && (
                            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px",
                              background: "#fffbeb", color: "#92400e", textTransform: "uppercase",
                              border: "1px solid #fcd34d" }}>
                              Locked · {lockDate}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#10b981", fontFamily: "monospace", fontWeight: 700 }}>
                          +{Number(formatEther(daily)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginLeft: 4 }}>$BITCAT / day</span>
                        </div>
                      </div>
                      <button className="btn-unstake" onClick={() => handleUnstake(id)}
                        disabled={isBusy || isLocked}
                        style={{ opacity: isLocked ? 0.35 : 1, cursor: isLocked ? "not-allowed" : "pointer" }}>
                        {isLocked ? "Locked" : "Unstake"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── TX TOAST / ERROR TOAST ── */}
      {txError && (
        <div className="toast" style={{ background: "#ef4444", gap: 12 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{txError}</span>
          {txError.includes("reconnect") && (
            <button onClick={() => { setTxError(""); connect({ connector: injected() }); }}
              style={{ padding: "4px 12px", background: "#fff", color: "#ef4444",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Reconnect
            </button>
          )}
        </div>
      )}
      {!txError && (isBusy || txStatus) && (
        <div className="toast">
          {isBusy && <span className="spinner" />}
          <span>{txStatus || "Waiting for confirmation…"}</span>
          {pendingTx && !txConfirmed && (
            <span style={{ color: "#6b7280", fontSize: 10 }}>· tx pending</span>
          )}
        </div>
      )}
      {!txError && txConfirmed && (
        <div className="toast" style={{ background: "#065f46" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#4ade80" strokeWidth="2"/>
            <path d="M7 12l4 4 6-7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: "#4ade80" }}>Transaction confirmed!</span>
        </div>
      )}

      {/* ── TELEGRAM HOLDER ACCESS BANNER ── */}
      <div style={{ borderTop: "1px solid #1e2640", background: "#080b0f", padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#229ED9",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.289c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.23 14.168l-2.964-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.59.418z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#ffffff", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Holder-Only Telegram
            </div>
            <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 600 }}>
              Hold or stake a TAO Cat → get private group access
            </div>
          </div>
        </div>
        <a href="/verify"
          style={{ padding: "9px 22px", background: "rgba(0,196,154,0.1)", color: "#00c49a",
            border: "1px solid rgba(0,196,154,0.3)", fontWeight: 700, fontSize: 9,
            letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            transition: "all 0.12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,196,154,0.18)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,196,154,0.6)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(0,196,154,0.1)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,196,154,0.3)"; }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00c49a",
            boxShadow: "0 0 6px #00c49a", display: "inline-block", flexShrink: 0 }} />
          Verify Ownership →
        </a>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #1a1f2e", padding: "18px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        background: "#080b0f" }}>
        <span style={{ fontSize: 9, color: "#2a3040", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          TAO CAT Staking · Season 1 · 90 Days
        </span>
        <div style={{ display: "flex", gap: 20 }}>
          <a href={MAIN_SITE} style={{ fontSize: 9, color: "#2a3040", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none" }}>taocats.fun</a>
          <a href="https://x.com/CatsonTao" target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "#2a3040", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none" }}>Twitter</a>
        </div>
      </footer>

    </div>
  );
}
