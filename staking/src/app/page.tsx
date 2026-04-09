"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt } from "wagmi";
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

// ── Live pending rewards ───────────────────────────────────────────────────────
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

// ── Cat image ─────────────────────────────────────────────────────────────────
function CatImg({ id, size = 96 }: { id: number; size?: number }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ width: size, height: size, background: "#f7f8fa", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      {!err ? (
        <Image
          src={`https://taocats.fun/samples/${id % 12 + 1}.png`}
          alt={`#${id}`} width={size} height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setErr(true)} unoptimized
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 9, color: "#9aa0ae" }}>#{id}</span>
        </div>
      )}
    </div>
  );
}

// ── Wallet connect button ──────────────────────────────────────────────────────
function ConnectBtn() {
  const { address, isConnected } = useAccount();
  if (!isConnected)
    return (
      <button className="btn-primary"
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).ethereum)
            (window as any).ethereum.request({ method: "eth_requestAccounts" });
        }}>
        Connect Wallet
      </button>
    );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", border: "1.5px solid #e0e3ea" }}>
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00c49a" }} className="pulse-dot" />
      <span style={{ fontSize: 11, fontWeight: 700, color: "#0f1419", letterSpacing: "0.06em" }}>
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
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

  const allIds = useMemo(() => [
    ...(unstakedIds ?? []),
    ...(stakedIds   ?? []),
  ], [unstakedIds, stakedIds]);

  const { data: rarityData } = useReadContract({
    address: RARITY_ADDR, abi: RARITY_ABI, functionName: "rarityBatch",
    args: [allIds],
    query: { enabled: contractsReady && allIds.length > 0 },
  });

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

  const tierMap = useMemo(() => {
    const m: Record<string, string> = {};
    if (!rarityData || !allIds.length) return m;
    allIds.forEach((id, i) => { m[String(id)] = rarityData[2][i] ?? "Common"; });
    return m;
  }, [rarityData, allIds]);

  const totalDailyRate = useMemo(() => {
    if (!dailyRates) return 0n;
    return dailyRates.reduce((acc, r) => acc + ((r.result as bigint) ?? 0n), 0n);
  }, [dailyRates]);

  const livePending  = useLivePending(pendingRaw ?? 0n, totalDailyRate, dataUpdatedAt);
  const countdown    = useCountdown(Number(endTime ?? 0));
  const unstakedArr  = Array.from(unstakedIds ?? []);
  const stakedCount  = stakedIdsArr.length;
  const boostTierNum = Number(boostTier ?? 0);
  const seasonPct    = endTime
    ? Math.max(0, Math.min(100, 100 - (Number(endTime) * 1000 - Date.now()) / (SEASON_DAYS * 86_400_000) * 100))
    : 0;
  const boostLabels  = ["No boost", "+5% boost", "+10% boost", "+15% boost"];

  // ── UI state ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lockOption,  setLockOption]  = useState<0|1|2>(0);
  const [txStatus,    setTxStatus]    = useState<string>("");

  const { writeContract, isPending: txPending } = useContractWrite();

  const refetchAll = useCallback(() => {
    refetchUnstaked(); refetchStaked(); refetchPending();
    refetchBalance(); refetchApproval(); refetchTotal();
  }, [refetchUnstaked, refetchStaked, refetchPending, refetchBalance, refetchApproval, refetchTotal]);

  const toggleSelect = (id: bigint) => {
    const key = String(id);
    setSelectedIds(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };
  const selectAll = () => setSelectedIds(new Set((unstakedIds ?? []).map(String)));
  const clearSel  = () => setSelectedIds(new Set());

  async function handleApprove() {
    setTxStatus("Approving…");
    await writeContract({ address: NFT_ADDR, abi: NFT_ABI as any, functionName: "setApprovalForAll", args: [STAKING_ADDR, true] });
    setTimeout(() => { refetchApproval(); setTxStatus(""); }, 4000);
  }
  async function handleStake() {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds).map(BigInt);
    setTxStatus(`Staking ${ids.length} cat${ids.length > 1 ? "s" : ""}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "stake", args: [ids, lockOption] });
    setSelectedIds(new Set());
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }
  async function handleUnstake(tokenId: bigint) {
    setTxStatus(`Unstaking #${tokenId}…`);
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "unstake", args: [[tokenId]] });
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }
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
  async function handleClaim() {
    setTxStatus("Claiming rewards…");
    await writeContract({ address: STAKING_ADDR, abi: STAKING_ABI as any, functionName: "claim", args: [] });
    setTimeout(() => { refetchAll(); setTxStatus(""); }, 4000);
  }

  const lockOptions = [
    { label: "No Lock",  sub: "Normal rate",   bonus: "" },
    { label: "7 Days",   sub: "+25% rewards",  bonus: "+25%" },
    { label: "30 Days",  sub: "+80% rewards",  bonus: "+80%" },
  ];

  // ── Contracts not configured ──
  if (!contractsReady) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://taocats.fun/logo.png" width={24} height={24} alt="" style={{ imageRendering: "pixelated" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.14em", color: "#0f1419", textTransform: "uppercase" }}>
            TAO CAT <span style={{ color: "#5a6478" }}>· STAKING</span>
          </span>
        </div>
        <div style={{ border: "2px solid #0f1419", padding: "40px 48px", textAlign: "center", maxWidth: 480 }}>
          <div style={{ width: 8, height: 8, background: "#0f1419", margin: "0 auto 24px" }} />
          <div style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "#0f1419", marginBottom: 12 }}>
            Season 1 Launching Soon
          </div>
          <p style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.9 }}>
            Staking contracts are being deployed. Follow{" "}
            <a href="https://x.com/CatsonTao" target="_blank" rel="noopener noreferrer" style={{ color: "#0f1419", fontWeight: 700 }}>@CatsonTao</a>
            {" "}for the launch announcement.
          </p>
          <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={MAIN_SITE + "/mint"} className="btn-primary" style={{ textDecoration: "none" }}>Mint a Cat →</a>
            <a href={MAIN_SITE + "/whitepaper.html#s12"} className="btn-outline" style={{ textDecoration: "none" }}>Tokenomics →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>

      {/* ── NAVBAR ── */}
      <nav style={{ background: "rgba(255,255,255,0.95)", borderBottom: "2px solid #0f1419",
        backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="page-inner" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 32, height: 32, background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="https://taocats.fun/logo.png" width={24} height={24} alt="TAO CAT"
                style={{ imageRendering: "pixelated" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", color: "#0f1419", textTransform: "uppercase" }}>TAO CAT</span>
              <span style={{ fontWeight: 800, fontSize: 12, letterSpacing: "0.14em", color: "#5a6478", textTransform: "uppercase" }}>· STAKING</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px",
              border: `1.5px solid ${countdown.ended ? "#fecaca" : "#e0e3ea"}`,
              background: countdown.ended ? "#fef2f2" : "transparent" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%",
                background: countdown.ended ? "#dc2626" : "#00c49a" }}
                className={countdown.ended ? "" : "pulse-dot"} />
              <span style={{ fontSize: 10, fontWeight: 700, color: countdown.ended ? "#dc2626" : "#0f1419",
                letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {countdown.ended ? "Season Ended" : "Season 1 Live"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <a href={MAIN_SITE} className="hide-mobile"
              style={{ fontSize: 10, fontWeight: 700, color: "#9aa0ae", letterSpacing: "0.08em",
                textTransform: "uppercase", textDecoration: "none" }}>
              taocats.fun ↗
            </a>
            <ConnectBtn />
          </div>
        </div>
      </nav>

      {/* ── STATS BAR ── */}
      <div style={{ borderBottom: "2px solid #0f1419" }}>
        <div className="page-inner">
          <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
            {[
              { label: "Total Staked",   value: totalStaked != null ? `${totalStaked} cats` : "—" },
              { label: "Season Ends",    value: countdown.label },
              { label: "Your Staked",    value: `${stakedCount} cats` },
              { label: "Trading Boost",  value: boostLabels[boostTierNum] },
              { label: "Your $BITCAT",   value: bitcatBalance
                  ? Number(formatEther(bitcatBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : "0" },
            ].map((s) => (
              <div key={s.label} className="stat-block">
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f1419", fontFamily: "monospace",
                  letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#9aa0ae", textTransform: "uppercase",
                  letterSpacing: "0.12em", marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${seasonPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="page-inner" style={{ paddingLeft: 0, paddingRight: 0 }}>
        <div className="staking-grid">

          {/* ══ LEFT — YOUR CATS ══ */}
          <div style={{ borderRight: "2px solid #0f1419" }}>

            {/* Panel header */}
            <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #e0e3ea" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", marginBottom: 5 }}>Your Collection</div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f1419" }}>
                    {unstakedArr.length} Unstaked
                    <span style={{ color: "#9aa0ae", fontWeight: 500 }}> / {stakedCount} Staked</span>
                  </h2>
                </div>
                {unstakedArr.length > 0 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-ghost" onClick={selectAll}>Select All</button>
                    <button className="btn-ghost" onClick={clearSel}>Clear</button>
                  </div>
                )}
              </div>

              {/* Lock option */}
              <div>
                <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", marginBottom: 8 }}>Lock Option</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  {lockOptions.map((opt, i) => (
                    <div key={i} className={`lock-option ${lockOption === i ? "active" : ""}`}
                      onClick={() => setLockOption(i as 0|1|2)}>
                      <div style={{ flex: 1 }}>
                        <div className="lock-label" style={{ fontSize: 11, fontWeight: 800,
                          color: lockOption === i ? "#fff" : "#0f1419" }}>{opt.label}</div>
                        <div className="lock-sub" style={{ fontSize: 9, color: lockOption === i ? "#9aa0ae" : "#9aa0ae",
                          marginTop: 2 }}>{opt.sub}</div>
                      </div>
                      {opt.bonus && (
                        <span className="lock-bonus" style={{ fontSize: 10, fontWeight: 800,
                          color: lockOption === i ? "#00c49a" : "#00c49a" }}>{opt.bonus}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cats grid */}
            <div className="scroll-panel" style={{ padding: "20px 28px" }}>
              {!isConnected ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 13, color: "#9aa0ae", marginBottom: 24, fontWeight: 700 }}>
                    Connect your wallet to see your cats
                  </div>
                  <ConnectBtn />
                </div>
              ) : unstakedArr.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div style={{ fontSize: 32, marginBottom: 16 }}>🐱</div>
                  <div style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.9, fontWeight: 600 }}>
                    {stakedCount > 0 ? "All your cats are staked!" : "No TAO Cats in this wallet."}
                  </div>
                  {stakedCount === 0 && (
                    <a href={`${MAIN_SITE}/mint`} className="btn-primary"
                      style={{ display: "inline-flex", marginTop: 20, textDecoration: "none" }}>
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
                      <div key={String(id)} className={`cat-card fade-in ${sel ? "selected" : ""}`}
                        onClick={() => toggleSelect(id)}>
                        <div style={{ position: "relative" }}>
                          <CatImg id={Number(id)} size={110} />
                          {sel && (
                            <div style={{ position: "absolute", top: 5, right: 5, width: 20, height: 20,
                              background: "#0f1419", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", lineHeight: 1 }}>✓</span>
                            </div>
                          )}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
                            background: "rgba(15,20,25,0.82)", padding: "3px 6px" }}>
                            <span style={{ fontSize: 8, fontWeight: 800,
                              color: TIER_COLOR[tier] ?? "#9aa0ae", textTransform: "uppercase" }}>
                              {tier} {TIER_MULTI[tier]}
                            </span>
                          </div>
                        </div>
                        <div style={{ padding: "6px 8px", background: sel ? "#0f1419" : "#fff" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 800,
                            color: sel ? "#fff" : "#0f1419" }}>#{String(id)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Stake footer */}
            {isConnected && unstakedArr.length > 0 && (
              <div style={{ padding: "16px 28px", borderTop: "2px solid #0f1419",
                display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {!isApproved ? (
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleApprove} disabled={txPending}>
                    {txPending ? <><span className="spinner" />Approving…</> : "Approve Staking Contract"}
                  </button>
                ) : (
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleStake}
                    disabled={txPending || selectedIds.size === 0 || countdown.ended}>
                    {txPending
                      ? <><span className="spinner" />{txStatus || "Staking…"}</>
                      : selectedIds.size > 0
                        ? `Stake ${selectedIds.size} Cat${selectedIds.size > 1 ? "s" : ""}${lockOption > 0 ? ` · ${lockOptions[lockOption].bonus}` : ""}`
                        : "Select cats above"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ══ RIGHT — REWARDS + STAKED ══ */}
          <div>

            {/* Rewards panel — dark accent block */}
            <div style={{ background: "#0f1419", padding: "28px 32px", borderBottom: "2px solid #0f1419" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
                <div>
                  <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", marginBottom: 10 }}>Pending Rewards</div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: "#fff", fontFamily: "monospace",
                    letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {isConnected
                      ? Number(formatEther(livePending)).toLocaleString(undefined, { maximumFractionDigits: 0 })
                      : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a6478", marginTop: 6, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase" }}>$BITCAT</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: "#5a6478", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", marginBottom: 10 }}>Daily Rate</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#00c49a", fontFamily: "monospace",
                    letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {stakedCount > 0 && totalDailyRate > 0n
                      ? `+${Number(formatEther(totalDailyRate)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "0"}
                  </div>
                  <div style={{ fontSize: 11, color: "#5a6478", marginTop: 6, fontWeight: 700,
                    letterSpacing: "0.08em", textTransform: "uppercase" }}>/ day</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: stakedCount > 0 ? 16 : 0 }}>
                <button className="btn-teal" style={{ flex: 1 }} onClick={handleClaim}
                  disabled={txPending || !isConnected || livePending === 0n}>
                  {txPending && txStatus.includes("Claim") ? <><span className="spinner" />Claiming…</> : "Claim All Rewards"}
                </button>
                {stakedCount > 0 && (
                  <button onClick={handleUnstakeAll} disabled={txPending || !isConnected}
                    style={{ padding: "12px 20px", background: "transparent", color: "#9aa0ae",
                      border: "1.5px solid #2a3040", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "inherit",
                      whiteSpace: "nowrap" }}>
                    Unstake Unlocked
                  </button>
                )}
              </div>

              {/* Bonus tags */}
              {stakedCount > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {stakedCount >= 3 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px",
                      border: "1px solid #2a3040", color: "#00c49a",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {stakedCount >= 10 ? "Collection +50%" : stakedCount >= 5 ? "Collection +20%" : "Collection +10%"}
                    </span>
                  )}
                  {boostTierNum > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px",
                      border: "1px solid #2a3040", color: "#f59e0b",
                      textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Trading {boostLabels[boostTierNum]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Staked cats list */}
            <div>
              <div style={{ padding: "20px 28px 14px", borderBottom: "1px solid #e0e3ea",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#9aa0ae", fontWeight: 700, letterSpacing: "0.14em",
                    textTransform: "uppercase", marginBottom: 4 }}>Currently Staking</div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f1419" }}>
                    {stakedCount} Cat{stakedCount !== 1 ? "s" : ""}
                  </h2>
                </div>
              </div>

              <div className="scroll-panel" style={{ padding: "12px 20px 20px" }}>
                {!isConnected ? (
                  <div style={{ textAlign: "center", padding: "48px 20px", color: "#9aa0ae",
                    fontSize: 12, fontWeight: 700 }}>
                    Connect to see staked cats
                  </div>
                ) : stakedCount === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.9, fontWeight: 600 }}>
                      No cats staked yet.
                    </div>
                    <div style={{ fontSize: 11, color: "#9aa0ae", marginTop: 6 }}>
                      Select cats on the left to start earning.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {stakedIdsArr.map((id, i) => {
                      const tier      = tierMap[String(id)] ?? "Common";
                      const daily     = (dailyRates?.[i]?.result as bigint) ?? 0n;
                      const info      = stakeInfos?.[i]?.result as any;
                      const lockUntil = Number(info?.lockUntil ?? 0);
                      const isLocked  = lockUntil > Math.floor(Date.now() / 1000);
                      const lockDate  = lockUntil > 0
                        ? new Date(lockUntil * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "";

                      return (
                        <div key={String(id)} className="fade-in"
                          style={{ border: "1.5px solid #e0e3ea", padding: "12px 16px",
                            display: "flex", gap: 14, alignItems: "center",
                            background: "#fff" }}>
                          <CatImg id={Number(id)} size={52} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 800,
                                color: "#0f1419" }}>#{String(id)}</span>
                              <span style={{ fontSize: 9, fontWeight: 800,
                                color: TIER_COLOR[tier] ?? "#9aa0ae",
                                background: TIER_BG[tier] ?? "#f8fafc",
                                padding: "2px 7px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                {tier}
                              </span>
                              {isLocked && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px",
                                  background: "#fffbeb", color: "#a16207",
                                  textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                  🔒 until {lockDate}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: "#00c49a", fontFamily: "monospace",
                              fontWeight: 700 }}>
                              +{Number(formatEther(daily)).toLocaleString(undefined, { maximumFractionDigits: 0 })} $BITCAT / day
                            </div>
                          </div>
                          <button className="btn-danger"
                            onClick={() => handleUnstake(id)}
                            disabled={txPending || isLocked}
                            style={{ opacity: isLocked ? 0.35 : 1 }}>
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

      {/* ── TX TOAST ── */}
      {(txPending || txStatus) && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "#0f1419", border: "2px solid #0f1419", padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 12, zIndex: 100, whiteSpace: "nowrap",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)" }}>
          {txPending && <span className="spinner" style={{ borderColor: "#2a3040", borderTopColor: "#fff" }} />}
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>
            {txStatus || "Transaction pending…"}
          </span>
        </div>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "2px solid #0f1419", padding: "20px 40px", marginTop: 0 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase",
            letterSpacing: "0.12em", color: "#9aa0ae" }}>
            TAO CAT STAKING · Season 1 · 90 Days · 1.725B $BITCAT Pool
          </span>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { href: MAIN_SITE,                          label: "Main Site" },
              { href: `${MAIN_SITE}/marketplace`,         label: "Marketplace" },
              { href: `${MAIN_SITE}/whitepaper.html`,     label: "Whitepaper" },
              { href: "https://x.com/CatsonTao",          label: "@CatsonTao" },
            ].map(l => (
              <a key={l.label} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                style={{ fontSize: 9, color: "#9aa0ae", textDecoration: "none", fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  transition: "color 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#0f1419")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9aa0ae")}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}
