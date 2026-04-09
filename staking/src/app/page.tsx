"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { useContractWrite } from "@/lib/useContractWrite";
import { CONTRACTS, MAIN_SITE, SEASON_DAYS } from "@/lib/config";
import { NFT_ABI, RARITY_ABI, STAKING_ABI, BITCAT_ABI } from "@/lib/abis";

// ── Tier helpers ──────────────────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  Legendary: "#a855f7", Epic: "#3b82f6", Rare: "#10b981",
  Uncommon: "#f59e0b", Common: "#5a6478",
};
const TIER_MULTI: Record<string, string> = {
  Legendary: "3×", Epic: "2×", Rare: "1.5×", Uncommon: "1.2×", Common: "1×",
};

function tierClass(tier: string) {
  return `tier-${tier?.toLowerCase() ?? "common"}`;
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function useCountdown(endTs: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const rem = Math.max(0, endTs * 1000 - now);
  const d   = Math.floor(rem / 86_400_000);
  const h   = Math.floor((rem % 86_400_000) / 3_600_000);
  const m   = Math.floor((rem % 3_600_000) / 60_000);
  const s   = Math.floor((rem % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (rem === 0) return { label: "SEASON ENDED", ended: true };
  if (d > 0) return { label: `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`, ended: false };
  return { label: `${pad(h)}:${pad(m)}:${pad(s)}`, ended: false };
}

// ── Pending rewards live tick ─────────────────────────────────────────────────
function useLivePending(onChain: bigint, dailyTotal: bigint, lastRefresh: number) {
  const [extra, setExtra] = useState(0n);
  useEffect(() => {
    setExtra(0n);
    if (dailyTotal === 0n) return;
    const perMs = dailyTotal / BigInt(86_400_000);
    const id = setInterval(() => {
      const elapsed = BigInt(Date.now() - lastRefresh);
      setExtra(perMs * elapsed);
    }, 500);
    return () => clearInterval(id);
  }, [dailyTotal, lastRefresh, onChain]);
  return onChain + extra;
}

// ── Connect button ────────────────────────────────────────────────────────────
function ConnectBtn() {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending } = useContractWrite();

  if (!isConnected)
    return (
      <button
        className="btn-teal pulse"
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).ethereum)
            (window as any).ethereum.request({ method: "eth_requestAccounts" });
        }}
      >
        Connect Wallet
      </button>
    );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00c49a", boxShadow: "0 0 6px #00c49a" }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9aa0ae", letterSpacing: "0.06em" }}>
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
    </div>
  );
}

// ── Cat image ─────────────────────────────────────────────────────────────────
function CatImg({ id, size = 96 }: { id: number; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, background: "#141920", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      {!err ? (
        <Image
          src={`https://taocats.fun/samples/${id}.png`}
          alt={`#${id}`}
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setErr(true)}
          unoptimized
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 10, color: "#5a6478" }}>#{id}</span>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StakingPage() {
  const { address, isConnected } = useAccount();

  const NFT_ADDR     = CONTRACTS.NFT;
  const STAKING_ADDR = CONTRACTS.STAKING;
  const RARITY_ADDR  = CONTRACTS.RARITY;
  const BITCAT_ADDR  = CONTRACTS.BITCAT;

  const contractsReady = !!(NFT_ADDR && STAKING_ADDR && RARITY_ADDR && BITCAT_ADDR);

  // ── Contract reads ──
  const { data: totalStaked, refetch: refetchTotal } = useReadContract({
    address: STAKING_ADDR, abi: STAKING_ABI, functionName: "totalStaked",
    query: { enabled: contractsReady },
  });

  const { data: endTime } = useReadContract({
    address: STAKING_ADDR, abi: STAKING_ABI, functionName: "endTime",
    query: { enabled: contractsReady },
  });

  const { data: unstakedIds, refetch: refetchUnstaked } = useReadContract({
    address: NFT_ADDR, abi: NFT_ABI, functionName: "tokensOfOwner", args: [address!],
    query: { enabled: contractsReady && !!address },
  });

  const { data: stakedIds, refetch: refetchStaked } = useReadContract({
    address: STAKING_ADDR, abi: STAKING_ABI, functionName: "stakedTokensOf", args: [address!],
    query: { enabled: contractsReady && !!address },
  });

  const { data: pendingRaw, refetch: refetchPending, dataUpdatedAt } = useReadContract({
    address: STAKING_ADDR, abi: STAKING_ABI, functionName: "pendingRewardsOf", args: [address!],
    query: { enabled: contractsReady && !!address, refetchInterval: 30_000 },
  });

  const { data: bitcatBalance, refetch: refetchBalance } = useReadContract({
    address: BITCAT_ADDR, abi: BITCAT_ABI, functionName: "balanceOf", args: [address!],
    query: { enabled: contractsReady && !!address },
  });

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_ADDR, abi: NFT_ABI, functionName: "isApprovedForAll",
    args: [address!, STAKING_ADDR],
    query: { enabled: contractsReady && !!address },
  });

  const { data: boostTier } = useReadContract({
    address: STAKING_ADDR, abi: STAKING_ABI, functionName: "tradingBoostTier", args: [address!],
    query: { enabled: contractsReady && !!address },
  });

  // Rarity for all user cats
  const allIds = useMemo(() => [
    ...(unstakedIds ?? []),
    ...(stakedIds   ?? []),
  ], [unstakedIds, stakedIds]);

  const { data: rarityData } = useReadContract({
    address: RARITY_ADDR, abi: RARITY_ABI, functionName: "rarityBatch",
    args: [allIds],
    query: { enabled: contractsReady && allIds.length > 0 },
  });

  // Per-staked-token daily rates
  const stakedIdsArr = useMemo(() => Array.from(stakedIds ?? []), [stakedIds]);

  const { data: dailyRates } = useReadContracts({
    contracts: stakedIdsArr.map((id) => ({
      address: STAKING_ADDR, abi: STAKING_ABI, functionName: "dailyRateOf", args: [id],
    })),
    query: { enabled: contractsReady && stakedIdsArr.length > 0 },
  });

  const { data: stakeInfos } = useReadContracts({
    contracts: stakedIdsArr.map((id) => ({
      address: STAKING_ADDR, abi: STAKING_ABI, functionName: "stakes", args: [id],
    })),
    query: { enabled: contractsReady && stakedIdsArr.length > 0 },
  });

  // Derived maps
  const tierMap = useMemo(() => {
    const m: Record<string, string> = {};
    if (!rarityData || !allIds.length) return m;
    allIds.forEach((id, i) => {
      m[String(id)] = rarityData[2][i] ?? "Common";
    });
    return m;
  }, [rarityData, allIds]);

  const totalDailyRate = useMemo(() => {
    if (!dailyRates) return 0n;
    return dailyRates.reduce((acc, r) => acc + ((r.result as bigint) ?? 0n), 0n);
  }, [dailyRates]);

  // Live pending rewards
  const livePending = useLivePending(pendingRaw ?? 0n, totalDailyRate, dataUpdatedAt);

  const countdown = useCountdown(Number(endTime ?? 0));

  // ── UI state ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lockOption, setLockOption]   = useState<0 | 1 | 2>(0);
  const [txStatus, setTxStatus]       = useState<string>("");

  const { writeContract, isPending: txPending } = useContractWrite();

  const refetchAll = useCallback(() => {
    refetchUnstaked(); refetchStaked(); refetchPending();
    refetchBalance(); refetchApproval(); refetchTotal();
  }, [refetchUnstaked, refetchStaked, refetchPending, refetchBalance, refetchApproval, refetchTotal]);

  // Toggle cat selection
  const toggleSelect = (id: bigint) => {
    const key = String(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set((unstakedIds ?? []).map(String)));
  const clearSel  = () => setSelectedIds(new Set());

  // ── Approve ──
  async function handleApprove() {
    setTxStatus("Approving…");
    await writeContract({ address: NFT_ADDR, abi: NFT_ABI as any, functionName: "setApprovalForAll", args: [STAKING_ADDR, true] });
    setTimeout(() => { refetchApproval(); setTxStatus(""); }, 4000);
  }

  // ── Stake ──
  async function handleStake() {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds).map(BigInt);
    setTxStatus(`Staking ${ids.length} cat${ids.length > 1 ? "s" : ""}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "stake", args: [ids, lockOption] });
    setSelectedIds(new Set());
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }

  // ── Unstake single ──
  async function handleUnstake(tokenId: bigint) {
    setTxStatus(`Unstaking #${tokenId}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [[tokenId]] });
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }

  // ── Unstake all unlocked ──
  async function handleUnstakeAll() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const ids = stakedIdsArr.filter((id, i) => {
      const info = stakeInfos?.[i]?.result as any;
      return !info || BigInt(info.lockUntil ?? 0) <= now;
    });
    if (!ids.length) return;
    setTxStatus(`Unstaking ${ids.length} cats…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [ids] });
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }

  // ── Claim ──
  async function handleClaim() {
    setTxStatus("Claiming rewards…");
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "claim", args: [] });
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }

  const unstakedArr = Array.from(unstakedIds ?? []);
  const stakedCount = stakedIdsArr.length;
  const seasonPct   = endTime ? Math.max(0, Math.min(100, 100 - (Number(endTime) * 1000 - Date.now()) / (SEASON_DAYS * 86_400_000) * 100)) : 0;

  const lockLabels = [
    { label: "No Lock",  sub: "Normal rewards",  bonus: "" },
    { label: "7 Days",   sub: "+25% bonus",       bonus: "+25%" },
    { label: "30 Days",  sub: "+80% bonus",       bonus: "+80%" },
  ];

  const boostLabels = ["No boost", "+5% boost", "+10% boost", "+15% boost"];
  const boostTierNum = Number(boostTier ?? 0);

  // ── Not ready ──
  if (!contractsReady) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="https://taocats.fun/logo.png" width={32} height={32} alt="TAO CAT" style={{ imageRendering: "pixelated" }} />
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: "0.14em", color: "#fff", textTransform: "uppercase" }}>TAO CAT STAKING</span>
        </div>
        <div style={{ border: "2px solid #00c49a", padding: "32px 40px", textAlign: "center", maxWidth: 480 }}>
          <div style={{ width: 10, height: 10, background: "#00c49a", margin: "0 auto 20px", animation: "pulse-teal 2s infinite" }} />
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#fff", marginBottom: 10 }}>Season 1 Launching Soon</div>
          <p style={{ fontSize: 12, color: "#9aa0ae", lineHeight: 1.8 }}>
            Staking contracts are being deployed. Check back shortly or follow{" "}
            <a href="https://x.com/CatsonTao" target="_blank" rel="noopener noreferrer" style={{ color: "#00c49a" }}>@CatsonTao</a>
            {" "}for the launch announcement.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={MAIN_SITE + "/mint"} style={{ padding: "10px 20px", border: "1px solid #2a3040", color: "#9aa0ae", textDecoration: "none", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Mint a Cat →
            </a>
            <a href={MAIN_SITE + "/whitepaper.html#s14"} style={{ padding: "10px 20px", border: "1px solid #00c49a", color: "#00c49a", textDecoration: "none", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Read Tokenomics →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 80 }}>

      {/* ── TOP BAR ── */}
      <div style={{ background: "#0f1419", borderBottom: "2px solid #2a3040", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="page-inner" style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="https://taocats.fun/logo.png" width={28} height={28} alt="TAO CAT"
              style={{ imageRendering: "pixelated", border: "1px solid #2a3040" }} />
            <div>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", color: "#fff", textTransform: "uppercase" }}>TAO CAT</span>
              <span style={{ fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", color: "#00c49a", textTransform: "uppercase" }}> · STAKING</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", border: "1px solid #2a3040", marginLeft: 8 }}>
              <div style={{ width: 6, height: 6, background: countdown.ended ? "#ef4444" : "#00c49a", borderRadius: "50%" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#9aa0ae", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {countdown.ended ? "Season Ended" : "Season 1 Active"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href={MAIN_SITE} style={{ fontSize: 10, fontWeight: 700, color: "#5a6478", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}
              className="hide-mobile">
              taocats.fun ↗
            </a>
            <ConnectBtn />
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ background: "#0f1419", borderBottom: "1px solid #1e2640" }}>
        <div className="page-inner">
          <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
            {[
              { label: "Total Staked",   value: `${totalStaked?.toString() ?? "—"} cats` },
              { label: "Season Ends",    value: countdown.label },
              { label: "Your Staked",    value: `${stakedCount} cats` },
              { label: "Trading Boost",  value: boostLabels[boostTierNum] },
              { label: "Your $BITCAT",   value: bitcatBalance ? Number(formatEther(bitcatBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0" },
            ].map((s) => (
              <div key={s.label} className="stat-block">
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#5a6478", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Season progress */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${seasonPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="page-inner" style={{ paddingTop: 2 }}>
        <div className="staking-grid">

          {/* ══ LEFT: YOUR CATS ══ */}
          <div style={{ background: "#0f1419", borderRight: "2px solid #1a2030" }}>
            {/* Panel header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #1a2030" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Your Collection</div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                    {unstakedArr.length} Unstaked &nbsp;
                    <span style={{ color: "#5a6478", fontWeight: 500 }}>/ {stakedCount} Staked</span>
                  </h2>
                </div>
                {unstakedArr.length > 0 && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 9 }} onClick={selectAll}>All</button>
                    <button className="btn-outline" style={{ padding: "6px 12px", fontSize: 9 }} onClick={clearSel}>Clear</button>
                  </div>
                )}
              </div>

              {/* Lock option */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Lock Option</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
                  {lockLabels.map((opt, i) => (
                    <div key={i} className={`lock-option ${lockOption === i ? "active" : ""}`}
                      onClick={() => setLockOption(i as 0|1|2)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: lockOption === i ? "#00c49a" : "#fff" }}>{opt.label}</div>
                        <div style={{ fontSize: 9, color: "#5a6478", marginTop: 2 }}>{opt.sub}</div>
                      </div>
                      {opt.bonus && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#00c49a" }}>{opt.bonus}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cats grid */}
            <div className="scroll-panel" style={{ padding: "16px 24px" }}>
              {!isConnected ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ fontSize: 12, color: "#5a6478", marginBottom: 20 }}>Connect wallet to see your cats</div>
                  <ConnectBtn />
                </div>
              ) : unstakedArr.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>🐱</div>
                  <div style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.8 }}>
                    {stakedCount > 0 ? "All your cats are staked!" : "No TAO Cats in this wallet."}
                  </div>
                  {stakedCount === 0 && (
                    <a href={`${MAIN_SITE}/mint`} style={{ display: "inline-block", marginTop: 16, padding: "10px 20px", border: "1px solid #00c49a", color: "#00c49a", textDecoration: "none", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Mint a Cat →
                    </a>
                  )}
                </div>
              ) : (
                <div className="cats-grid">
                  {unstakedArr.map((id) => {
                    const tier = tierMap[String(id)] ?? "Common";
                    const sel  = selectedIds.has(String(id));
                    return (
                      <div key={String(id)} className={`cat-card ${sel ? "selected" : ""} fade-in`}
                        onClick={() => toggleSelect(id)}>
                        <div style={{ position: "relative" }}>
                          <CatImg id={Number(id)} size={120} />
                          {sel && (
                            <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, background: "#00c49a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: "#000" }}>✓</span>
                            </div>
                          )}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(10,13,18,0.85)", padding: "3px 6px" }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: TIER_COLOR[tier] ?? "#5a6478", textTransform: "uppercase" }}>
                              {tier} {TIER_MULTI[tier]}
                            </span>
                          </div>
                        </div>
                        <div style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#fff" }}>#{String(id)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stake action footer */}
            {isConnected && (unstakedArr.length > 0 || selectedIds.size > 0) && (
              <div style={{ padding: "16px 24px", borderTop: "1px solid #1a2030", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!isApproved ? (
                  <button className="btn-teal" style={{ flex: 1 }} onClick={handleApprove} disabled={txPending}>
                    {txPending ? "Approving…" : "Approve Staking Contract"}
                  </button>
                ) : (
                  <button className="btn-teal" style={{ flex: 1 }} onClick={handleStake}
                    disabled={txPending || selectedIds.size === 0 || countdown.ended}>
                    {txPending ? txStatus || "Staking…" : `Stake ${selectedIds.size > 0 ? selectedIds.size + " Cat" + (selectedIds.size > 1 ? "s" : "") : "(select cats)"}`}
                    {selectedIds.size > 0 && lockOption > 0 && (
                      <span style={{ color: "#00c49a" }}>&nbsp;· {lockLabels[lockOption].bonus}</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ══ RIGHT: STAKED + REWARDS ══ */}
          <div style={{ background: "#0f1419" }}>
            {/* Rewards panel */}
            <div style={{ background: "#0a1a14", border: "2px solid rgba(0,196,154,0.20)", margin: "0", padding: "24px 28px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#00c49a", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Pending Rewards</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {isConnected
                      ? Number(formatEther(livePending)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a6478", marginTop: 4 }}>$BITCAT accumulating</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Daily Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#00c49a", fontFamily: "monospace" }}>
                    {stakedCount > 0 && totalDailyRate > 0n
                      ? `+${Number(formatEther(totalDailyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "0"}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a6478", marginTop: 4 }}>$BITCAT / day</div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn-teal" style={{ flex: 1 }} onClick={handleClaim}
                  disabled={txPending || !isConnected || (livePending === 0n)}>
                  {txPending && txStatus.includes("Claim") ? "Claiming…" : "Claim All Rewards"}
                </button>
                {stakedCount > 0 && (
                  <button className="btn-outline" onClick={handleUnstakeAll} disabled={txPending || !isConnected}>
                    Unstake Unlocked
                  </button>
                )}
              </div>

              {/* Bonus breakdown */}
              {stakedCount > 0 && (
                <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {stakedCount >= 3 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", border: "1px solid #2a3040", color: "#00c49a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {stakedCount >= 10 ? "Collection +50%" : stakedCount >= 5 ? "Collection +20%" : "Collection +10%"}
                    </span>
                  )}
                  {boostTierNum > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", border: "1px solid #2a3040", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Trading {boostLabels[boostTierNum]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Staked list */}
            <div style={{ borderTop: "2px solid #1a2030" }}>
              <div style={{ padding: "16px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Currently Staking</div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{stakedCount} Cat{stakedCount !== 1 ? "s" : ""}</h2>
                </div>
              </div>

              <div className="scroll-panel" style={{ padding: "0 16px 16px" }}>
                {!isConnected ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#5a6478", fontSize: 12 }}>
                    Connect to see staked cats
                  </div>
                ) : stakedCount === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.8 }}>No cats staked yet.</div>
                    <div style={{ fontSize: 11, color: "#2a3040", marginTop: 8 }}>Select cats on the left to start earning.</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {stakedIdsArr.map((id, i) => {
                      const tier      = tierMap[String(id)] ?? "Common";
                      const daily     = (dailyRates?.[i]?.result as bigint) ?? 0n;
                      const info      = stakeInfos?.[i]?.result as any;
                      const lockUntil = Number(info?.lockUntil ?? 0);
                      const isLocked  = lockUntil > Math.floor(Date.now() / 1000);
                      const lockDate  = lockUntil > 0 ? new Date(lockUntil * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

                      return (
                        <div key={String(id)} className="fade-in" style={{ background: "#141920", border: "1px solid #1a2030", padding: "12px 14px", display: "flex", gap: 12, alignItems: "center" }}>
                          <CatImg id={Number(id)} size={56} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#fff" }}>#{String(id)}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: TIER_COLOR[tier], textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                {tier}
                              </span>
                              {isLocked && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", background: "#1a2030", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  🔒 {lockDate}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: "#00c49a", fontFamily: "monospace" }}>
                              +{Number(formatEther(daily)).toLocaleString(undefined, { maximumFractionDigits: 0 })} / day
                            </div>
                          </div>
                          <button
                            className={isLocked ? "btn-danger" : "btn-danger"}
                            onClick={() => handleUnstake(id)}
                            disabled={txPending || isLocked}
                            style={{ whiteSpace: "nowrap", opacity: isLocked ? 0.4 : 1 }}
                          >
                            {isLocked ? "Locked" : "Unstake"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TX STATUS TOAST ── */}
      {(txPending || txStatus) && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0f1419", border: "2px solid #00c49a", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12, zIndex: 100, whiteSpace: "nowrap" }}>
          {txPending && <div style={{ width: 8, height: 8, background: "#00c49a", animation: "pulse-teal 1s infinite" }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{txStatus || "Transaction pending…"}</span>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ marginTop: 40, borderTop: "1px solid #1a2030", padding: "20px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#2a3040" }}>TAO CAT STAKING · Season 1 · 90 Days · 1.725B $BITCAT Pool</span>
          <div style={{ display: "flex", gap: 20 }}>
            <a href={MAIN_SITE} style={{ fontSize: 10, color: "#5a6478", textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Main Site</a>
            <a href={`${MAIN_SITE}/marketplace`} style={{ fontSize: 10, color: "#5a6478", textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Marketplace</a>
            <a href={`${MAIN_SITE}/whitepaper.html`} style={{ fontSize: 10, color: "#5a6478", textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Whitepaper</a>
            <a href="https://x.com/CatsonTao" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "#5a6478", textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>@CatsonTao</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
