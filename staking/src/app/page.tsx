"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import {
  useAccount, useReadContract, useReadContracts,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther } from "viem";
import { useContractWrite } from "@/lib/useContractWrite";
import { CONTRACTS, MAIN_SITE, SEASON_DAYS } from "@/lib/config";
import { NFT_ABI, RARITY_ABI, STAKING_ABI, BITCAT_ABI } from "@/lib/abis";

// ── Tier helpers ───────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  Legendary: "#7c3aed", Epic: "#1d4ed8", Rare: "#059669",
  Uncommon: "#a16207", Common: "#64748b",
};
const TIER_BG: Record<string, string> = {
  Legendary: "#f5f3ff", Epic: "#eff6ff", Rare: "#f0fdf4",
  Uncommon: "#fffbeb", Common: "#f8fafc",
};
const TIER_MULTI: Record<string, string> = {
  Legendary: "3×", Epic: "2×", Rare: "1.5×", Uncommon: "1.2×", Common: "1×",
};
const TIER_CARD_CLASS: Record<string, string> = {
  Legendary: "legendary", Epic: "epic", Rare: "rare", Uncommon: "uncommon", Common: "",
};

// ── Season countdown ───────────────────────────────────────────────────────────
function useCountdown(endTs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const rem = Math.max(0, endTs * 1000 - now);
  const d = Math.floor(rem / 86_400_000);
  const h = Math.floor((rem % 86_400_000) / 3_600_000);
  const m = Math.floor((rem % 3_600_000) / 60_000);
  const s = Math.floor((rem % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (rem === 0) return { label: "Season Ended", ended: true };
  if (d > 0) return { label: `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`, ended: false };
  return { label: `${pad(h)}:${pad(m)}:${pad(s)}`, ended: false };
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
    <div style={{ width: size, height: size, background: "#f7f8fa", position: "relative", overflow: "hidden", flexShrink: 0 }}>
      {!err ? (
        <Image
          src={`https://taocats.fun/samples/${id % 12 + 1}.png`}
          alt={`#${id}`} width={size} height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setErr(true)} unoptimized
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 9, color: "#9aa0ae" }}>#{id}</div>
      )}
    </div>
  );
}

// ── Connect wallet button ──────────────────────────────────────────────────────
function ConnectBtn({ large }: { large?: boolean }) {
  const { address, isConnected } = useAccount();
  if (!isConnected) {
    return (
      <button
        className={large ? "btn-black" : "btn-black"}
        style={large ? { padding: "14px 32px", fontSize: 12 } : {}}
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).ethereum)
            (window as any).ethereum.request({ method: "eth_requestAccounts" });
        }}>
        Connect Wallet
      </button>
    );
  }
  return (
    <div className="wallet-btn">
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00c49a", flexShrink: 0 }}
        className="pulse-dot" />
      <span>{address?.slice(0, 6)}…{address?.slice(-4)}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StakingPage() {
  const { address, isConnected } = useAccount();

  const NFT_ADDR     = CONTRACTS.NFT;
  const STAKING_ADDR = CONTRACTS.STAKING;
  const RARITY_ADDR  = CONTRACTS.RARITY;
  const BITCAT_ADDR  = CONTRACTS.BITCAT;
  const ready        = !!(NFT_ADDR && STAKING_ADDR && RARITY_ADDR && BITCAT_ADDR);

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
  const countdown    = useCountdown(Number(endTime ?? 0));
  const stakedCount  = stakedArr.length;
  const boostNum     = Number(boostTier ?? 0);
  const boostLabels  = ["No boost", "+5% boost", "+10% boost", "+15% boost"];
  const seasonPct    = endTime ? Math.max(0, Math.min(100, 100 - (Number(endTime) * 1000 - Date.now()) / (SEASON_DAYS * 86_400_000) * 100)) : 0;

  // ── TX state ──
  const [sel,        setSel]       = useState<Set<string>>(new Set());
  const [lockOpt,    setLockOpt]   = useState<0|1|2>(0);
  const [txStatus,   setTxStatus]  = useState("");
  const [pendingTx,  setPendingTx] = useState<`0x${string}` | undefined>();

  const { writeContract, isPending: txPending, data: txHash } = useContractWrite();

  // Wait for tx confirmation then refetch
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: pendingTx });
  const lastTxType = useRef("");

  useEffect(() => {
    if (!txConfirmed || !pendingTx) return;
    const type = lastTxType.current;
    setTimeout(() => {
      rfUnstaked(); rfStaked(); rfPending(); rfBal(); rfApproval(); rfTotal();
      setTxStatus("");
      setPendingTx(undefined);
    }, 2000);
    if (type === "stake") setSel(new Set());
  }, [txConfirmed]);

  // Track tx hash from writeContract
  useEffect(() => {
    if (txHash) setPendingTx(txHash);
  }, [txHash]);

  const refetchAll = useCallback(() => {
    rfUnstaked(); rfStaked(); rfPending(); rfBal(); rfApproval(); rfTotal();
  }, [rfUnstaked, rfStaked, rfPending, rfBal, rfApproval, rfTotal]);

  const toggle     = (id: bigint) => setSel(p => { const n = new Set(p); n.has(String(id)) ? n.delete(String(id)) : n.add(String(id)); return n; });
  const selectAll  = () => setSel(new Set((unstakedIds ?? []).map(String)));
  const clearSel   = () => setSel(new Set());

  async function handleApprove() {
    lastTxType.current = "approve";
    setTxStatus("Approving — confirm in wallet…");
    await writeContract({ address: NFT_ADDR, abi: NFT_ABI as any, functionName: "setApprovalForAll", args: [STAKING_ADDR, true] });
  }
  async function handleStake() {
    if (!sel.size) return;
    lastTxType.current = "stake";
    setTxStatus(`Staking ${sel.size} cat${sel.size > 1 ? "s" : ""}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "stake", args: [Array.from(sel).map(BigInt), lockOpt] });
  }
  async function handleUnstake(id: bigint) {
    lastTxType.current = "unstake";
    setTxStatus(`Unstaking #${id}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [[id]] });
  }
  async function handleClaim() {
    lastTxType.current = "claim";
    setTxStatus("Claiming $BITCAT…");
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "claim", args: [] });
  }

  const lockOptions = [
    { label: "No Lock",  sub: "Flexible",      bonus: "" },
    { label: "7 Days",   sub: "Lock 7 days",   bonus: "+25%" },
    { label: "30 Days",  sub: "Lock 30 days",  bonus: "+80%" },
  ];

  const isBusy = txPending || (!!pendingTx && !txConfirmed);

  // ── Not ready state ──
  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 28, padding: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://taocats.fun/logo.png" width={26} height={26} alt="" style={{ imageRendering: "pixelated" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            TAO CAT <span style={{ color: "#9aa0ae" }}>· STAKING</span>
          </span>
        </div>
        <div style={{ border: "2px solid #0f1419", padding: "40px 52px", textAlign: "center", maxWidth: 460 }}>
          <div style={{ width: 8, height: 8, background: "#0f1419", margin: "0 auto 24px" }} />
          <div style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Season 1 Launching Soon</div>
          <p style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.9 }}>
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

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 34, height: 34, background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="https://taocats.fun/logo.png" width={26} height={26} alt="" style={{ imageRendering: "pixelated" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>TAO CAT</span>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", color: "#9aa0ae", textTransform: "uppercase" }}>· STAKING</span>
            </div>
            {/* Season badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px",
              border: `1.5px solid ${countdown.ended ? "#fecaca" : "#e8eaed"}`,
              background: countdown.ended ? "#fef2f2" : "transparent" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: countdown.ended ? "#dc2626" : "#00c49a", flexShrink: 0 }}
                className={countdown.ended ? "" : "pulse-dot"} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                color: countdown.ended ? "#dc2626" : "#0f1419" }}>
                {countdown.ended ? "Season Ended" : "Season 1 Live"}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <a href={MAIN_SITE} className="hide-mobile"
              style={{ fontSize: 10, fontWeight: 700, color: "#9aa0ae", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
              taocats.fun ↗
            </a>
            <ConnectBtn />
          </div>
        </div>
      </nav>

      {/* ── STATS BAR ── */}
      <div className="stats-bar">
        <div className="stats-inner">
          {[
            { lbl: "Total Staked",   val: totalStaked != null ? `${totalStaked}` : "—",                     unit: "cats" },
            { lbl: "Season Ends",    val: countdown.label,                                                    unit: "" },
            { lbl: "Your Staked",    val: `${stakedCount}`,                                                   unit: "cats" },
            { lbl: "Daily Earning",  val: stakedCount > 0 && totalDailyRate > 0n ? `+${Number(formatEther(totalDailyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "0", unit: "$BITCAT" },
            { lbl: "Your $BITCAT",   val: bitcatBal ? Number(formatEther(bitcatBal)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0", unit: "" },
          ].map(s => (
            <div key={s.lbl} className="stat-cell">
              <div className="stat-val">
                {s.val}{s.unit && <span style={{ fontSize: 11, fontWeight: 600, color: "#9aa0ae", marginLeft: 5 }}>{s.unit}</span>}
              </div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
        <div className="season-bar"><div className="season-fill" style={{ width: `${seasonPct}%` }} /></div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="main-grid">

        {/* ══ LEFT — YOUR CATS ══ */}
        <div className="left-panel">
          <div className="panel-head">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 5 }}>Your Collection</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f1419" }}>
                  {unstakedArr.length} Unstaked
                  <span style={{ color: "#c4c8d0", fontWeight: 500, fontSize: 16 }}> / {stakedCount} Staked</span>
                </h2>
              </div>
              {unstakedArr.length > 0 && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn-ghost" onClick={selectAll}>All</button>
                  <button className="btn-ghost" onClick={clearSel}>Clear</button>
                </div>
              )}
            </div>

            {/* Lock option */}
            <div>
              <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Lock Option</div>
              <div className="lock-grid">
                {lockOptions.map((opt, i) => (
                  <div key={i} className={`lock-opt ${lockOpt === i ? "active" : ""}`}
                    onClick={() => setLockOpt(i as 0|1|2)}>
                    <div className="lo-title">{opt.label}</div>
                    <div className="lo-sub">{opt.sub}</div>
                    {opt.bonus && <div className="lo-bonus">{opt.bonus}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="scroll-panel">
            {!isConnected ? (
              <div style={{ textAlign: "center", padding: "72px 20px" }}>
                <div style={{ fontSize: 13, color: "#9aa0ae", fontWeight: 700, marginBottom: 24 }}>Connect wallet to see your cats</div>
                <ConnectBtn large />
              </div>
            ) : unstakedArr.length === 0 ? (
              <div style={{ textAlign: "center", padding: "72px 20px" }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>🐱</div>
                <div style={{ fontSize: 13, color: "#5a6478", fontWeight: 700, lineHeight: 1.8 }}>
                  {stakedCount > 0 ? "All your cats are staked!" : "No TAO Cats in this wallet."}
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
                  const tier     = tierMap[String(id)] ?? "Common";
                  const isSel    = sel.has(String(id));
                  const cardCls  = TIER_CARD_CLASS[tier] ?? "";
                  return (
                    <div key={String(id)}
                      className={`cat-card fade-up ${cardCls} ${isSel ? "selected" : ""}`}
                      onClick={() => toggle(id)}>
                      <div style={{ position: "relative" }}>
                        <CatImg id={Number(id)} size={130} />
                        {/* Checkmark */}
                        {isSel && (
                          <div style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22,
                            background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        )}
                        {/* Rarity overlay */}
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                          background: "rgba(15,20,25,0.75)", padding: "4px 8px",
                          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 8, fontWeight: 800, color: TIER_COLOR[tier] ?? "#9aa0ae", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {tier}
                          </span>
                          <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", opacity: 0.7 }}>
                            {TIER_MULTI[tier]}
                          </span>
                        </div>
                      </div>
                      <div className={`cat-footer ${isSel ? "selected-footer" : ""}`}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 800,
                          color: isSel ? "#fff" : "#0f1419" }}>#{String(id)}</span>
                        {isSel && <span style={{ fontSize: 9, color: "#00c49a", fontWeight: 700 }}>✓ selected</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stake CTA */}
          {isConnected && unstakedArr.length > 0 && (
            <div style={{ padding: "16px 28px", borderTop: "2px solid #0f1419",
              display: "flex", gap: 10, alignItems: "center" }}>
              {!isApproved ? (
                <button className="btn-black" style={{ flex: 1 }} onClick={handleApprove} disabled={isBusy}>
                  {isBusy && txStatus.includes("Approv") ? <><span className="spinner" />Approving…</> : "Approve Staking Contract"}
                </button>
              ) : (
                <button className="btn-black" style={{ flex: 1 }} onClick={handleStake}
                  disabled={isBusy || sel.size === 0 || countdown.ended}>
                  {isBusy && txStatus.includes("Stak") ? <><span className="spinner" />{txStatus}</> :
                    sel.size > 0
                      ? `Stake ${sel.size} Cat${sel.size > 1 ? "s" : ""}${lockOpt > 0 ? ` · ${lockOptions[lockOpt].bonus}` : ""}`
                      : "Select cats to stake"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══ RIGHT — REWARDS + STAKED ══ */}
        <div className="right-panel">

          {/* Rewards */}
          <div className="rewards-box">
            <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              Pending Rewards
            </div>
            <div className={`rewards-number ${stakedCount > 0 && isConnected ? "ticking" : ""}`}>
              {isConnected
                ? Number(formatEther(livePending)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                : "—"}
            </div>
            <div style={{ fontSize: 10, color: "#5a6478", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: 20 }}>$BITCAT</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", borderTop: "1px solid #1e2a20", borderBottom: "1px solid #1e2a20",
              marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Daily Rate</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#00c49a", fontFamily: "monospace" }}>
                  {stakedCount > 0 && totalDailyRate > 0n
                    ? `+${Number(formatEther(totalDailyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : "0"} <span style={{ fontSize: 10, fontWeight: 600, color: "#5a6478" }}>/ day</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Claimed</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>
                  {bitcatBal ? Number(formatEther(bitcatBal)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: stakedCount > 0 ? 14 : 0 }}>
              <button className="btn-teal" style={{ flex: 1 }} onClick={handleClaim}
                disabled={isBusy || !isConnected || livePending === 0n}>
                {isBusy && txStatus.includes("Claim") ? <><span className="spinner dark" style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: "#000" }} />Claiming…</> : "Claim All Rewards"}
              </button>
              {stakedCount > 0 && (
                <button onClick={async () => {
                  const now = BigInt(Math.floor(Date.now() / 1000));
                  const ids = stakedArr.filter((id, i) => {
                    const info = stakeInfos?.[i]?.result as any;
                    return !info || BigInt(info.lockUntil ?? 0) <= now;
                  });
                  if (!ids.length) return;
                  lastTxType.current = "unstake_all";
                  setTxStatus(`Unstaking ${ids.length} cats…`);
                  await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [ids] });
                }} disabled={isBusy || !isConnected}
                  style={{ padding: "12px 16px", background: "transparent", color: "#9aa0ae",
                    border: "1.5px solid #2a3040", fontSize: 9, fontWeight: 700, cursor: "pointer",
                    letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                  Unstake All
                </button>
              )}
            </div>

            {/* Bonus tags */}
            {stakedCount >= 3 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px",
                  border: "1px solid #2a3040", color: "#00c49a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {stakedCount >= 10 ? "Collection +50%" : stakedCount >= 5 ? "Collection +20%" : "Collection +10%"}
                </span>
                {boostNum > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px",
                    border: "1px solid #2a3040", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Trading {boostLabels[boostNum]}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Staked cats */}
          <div style={{ borderTop: "none" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #e8eaed" }}>
              <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Currently Staking</div>
              <h3 style={{ fontSize: 18, fontWeight: 800 }}>{stakedCount} Cat{stakedCount !== 1 ? "s" : ""}</h3>
            </div>

            <div className="staked-list scroll-panel">
              {!isConnected ? (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#9aa0ae", fontSize: 12, fontWeight: 700 }}>
                  Connect to see staked cats
                </div>
              ) : stakedCount === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#5a6478", fontWeight: 700 }}>No cats staked yet.</div>
                  <div style={{ fontSize: 11, color: "#9aa0ae", marginTop: 6 }}>Select cats on the left.</div>
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
                    <div key={String(id)} className="staked-item fade-up">
                      <CatImg id={Number(id)} size={48} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800 }}>#{String(id)}</span>
                          <span style={{ fontSize: 8, fontWeight: 800, padding: "2px 6px",
                            background: TIER_BG[tier] ?? "#f8fafc", color: TIER_COLOR[tier] ?? "#64748b",
                            textTransform: "uppercase", letterSpacing: "0.06em" }}>{tier}</span>
                          {isLocked && (
                            <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 7px",
                              background: "#fffbeb", color: "#a16207", textTransform: "uppercase" }}>
                              🔒 {lockDate}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "#00c49a", fontFamily: "monospace", fontWeight: 700 }}>
                          +{Number(formatEther(daily)).toLocaleString(undefined, { maximumFractionDigits: 0 })} / day
                        </div>
                      </div>
                      <button className="btn-unstake" onClick={() => handleUnstake(id)}
                        disabled={isBusy || isLocked}
                        style={{ opacity: isLocked ? 0.35 : 1 }}>
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

      {/* ── TX TOAST ── */}
      {(isBusy || txStatus) && (
        <div className="toast">
          {isBusy && <span className="spinner" />}
          <span>{txStatus || "Waiting for confirmation…"}</span>
          {pendingTx && !txConfirmed && (
            <span style={{ color: "#9aa0ae", fontSize: 10 }}>· tx pending</span>
          )}
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "2px solid #0f1419", padding: "18px 32px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto", display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "#c4c8d0" }}>
            TAO CAT STAKING · Season 1 · 90 Days · 1.725B $BITCAT Pool
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              [MAIN_SITE, "Main Site"],
              [`${MAIN_SITE}/marketplace`, "Marketplace"],
              [`${MAIN_SITE}/whitepaper.html`, "Whitepaper"],
              ["https://x.com/CatsonTao", "@CatsonTao"],
            ].map(([href, label]) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 9, color: "#9aa0ae", textDecoration: "none", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0f1419")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9aa0ae")}>
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
