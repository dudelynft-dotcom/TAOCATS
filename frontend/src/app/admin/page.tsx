"use client";
import { useState, useEffect } from "react";
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { CONTRACTS } from "@/lib/config";
import { NFT_ABI, SIMPLE_MARKET_ABI } from "@/lib/abis";
import { useContractWrite } from "@/lib/useContractWrite";

const OWNER_ADDRESS = "0x198c2d42c71e8046f34eca9a0f5c81b9f3db2afb";

type TxState = { hash?: `0x${string}`; pending: boolean; error?: string; success?: string };
const TX0: TxState = { pending: false };

function StatusRow({ tx, label }: { tx: TxState; label: string }) {
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: tx.hash, query: { enabled: !!tx.hash } });
  if (!tx.pending && !tx.hash && !tx.error) return null;
  return (
    <div style={{ marginTop: 8, padding: "8px 12px", background: tx.error ? "#fff0f0" : isSuccess ? "#f0fff8" : "#f5f5f5", border: `1px solid ${tx.error ? "#ffb3b3" : isSuccess ? "#b3ffd9" : "#e0e0e0"}`, fontSize: 11 }}>
      {tx.pending || isLoading ? (
        <span style={{ color: "#888" }}>⏳ {label}…</span>
      ) : tx.error ? (
        <span style={{ color: "#c00" }}>✗ {tx.error}</span>
      ) : isSuccess ? (
        <span style={{ color: "#007a4d" }}>✓ Done</span>
      ) : (
        <span style={{ color: "#555" }}>Tx: {tx.hash?.slice(0, 14)}…</span>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, isPending, data: txHash, error: writeError, reset } = useContractWrite();

  const isOwner = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  // NFT contract state
  const [mintActive, setMintActive]     = useState<boolean | null>(null);
  const [mintPrice, setMintPrice]       = useState<string>("");
  const [totalSupply, setTotalSupply]   = useState<number | null>(null);
  const [maxSupply, setMaxSupply]       = useState<number | null>(null);
  const [revealed, setRevealed]         = useState<boolean | null>(null);
  const [liquidityRcvr, setLiquidityRcvr] = useState<string>("");
  const [totalListings, setTotalListings] = useState<number | null>(null);

  // Input fields
  const [newPrice, setNewPrice]         = useState("");
  const [newReceiver, setNewReceiver]   = useState("");
  const [newUnrevealedURI, setNewUnrevealedURI] = useState("");
  const [baseURI, setBaseURI]           = useState("");
  const [newTreasury, setNewTreasury]   = useState("");

  // Per-action tx state
  const [activeTx, setActiveTx]         = useState<string>("");
  const [txStates, setTxStates]         = useState<Record<string, TxState>>({});

  function setTx(key: string, state: TxState) {
    setActiveTx(key);
    setTxStates(prev => ({ ...prev, [key]: state }));
  }

  async function fetchState() {
    if (!publicClient) return;
    try {
      const [active, price, supply, max, rev, rcvr, listings] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintActive" }),
        publicClient.readContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "mintPrice" }),
        publicClient.readContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply" }),
        publicClient.readContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "MAX_SUPPLY" }),
        publicClient.readContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "revealed" }),
        publicClient.readContract({ address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "liquidityReceiver" }),
        publicClient.readContract({ address: CONTRACTS.SIMPLE_MARKET, abi: SIMPLE_MARKET_ABI, functionName: "totalListings" }),
      ]);
      setMintActive(active as boolean);
      setMintPrice(formatEther(price as bigint));
      setTotalSupply(Number(supply));
      setMaxSupply(Number(max));
      setRevealed(rev as boolean);
      setLiquidityRcvr((rcvr as string).toLowerCase());
      setTotalListings(Number(listings));
    } catch { /* ignore */ }
  }

  useEffect(() => { if (publicClient) fetchState(); }, [publicClient]);

  // Watch for tx hash and refresh after success
  const latestHash = txStates[activeTx]?.hash;
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: latestHash, query: { enabled: !!latestHash } });
  useEffect(() => {
    if (txConfirmed) { fetchState(); setActiveTx(""); }
  }, [txConfirmed]);

  // Map writeError to tx state
  useEffect(() => {
    if (writeError && activeTx) {
      const msg = writeError.message?.slice(0, 120) || "Transaction failed";
      setTxStates(prev => ({ ...prev, [activeTx]: { ...prev[activeTx], pending: false, error: msg } }));
      reset();
    }
  }, [writeError]);

  useEffect(() => {
    if (txHash && activeTx) {
      setTxStates(prev => ({ ...prev, [activeTx]: { hash: txHash, pending: false } }));
      reset();
    }
  }, [txHash]);

  async function doWrite(key: string, params: Parameters<typeof writeContract>[0]) {
    setTx(key, { pending: true });
    await writeContract(params);
  }

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", paddingTop: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "#0f1419", marginBottom: 8 }}>CONNECT WALLET</div>
          <div style={{ fontSize: 11, color: "#888" }}>Admin access requires wallet connection</div>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", paddingTop: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⛔</div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "#c00", marginBottom: 8 }}>ACCESS DENIED</div>
          <div style={{ fontSize: 11, color: "#888" }}>Connected: {address?.slice(0, 8)}…{address?.slice(-6)}</div>
        </div>
      </div>
    );
  }

  const progress = totalSupply != null && maxSupply != null ? Math.round((totalSupply / maxSupply) * 100) : null;

  return (
    <div style={{ background: "#f8f8f8", minHeight: "100vh", paddingTop: 56 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Header */}
        <div style={{ borderBottom: "3px solid #0f1419", paddingBottom: 20, marginBottom: 32 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: "#888", marginBottom: 6, textTransform: "uppercase" }}>Admin Panel</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0f1419", letterSpacing: "-0.02em", textTransform: "uppercase", margin: 0 }}>TAO CATS</h1>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>Owner: {address?.slice(0, 10)}…{address?.slice(-6)}</div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Minted", value: totalSupply != null ? `${totalSupply} / ${maxSupply}` : "…" },
            { label: "Progress", value: progress != null ? `${progress}%` : "…" },
            { label: "Mint Status", value: mintActive == null ? "…" : mintActive ? "ACTIVE" : "PAUSED", color: mintActive == null ? "#888" : mintActive ? "#007a4d" : "#c00" },
            { label: "Marketplace", value: totalListings != null ? `${totalListings} listed` : "…" },
          ].map(s => (
            <div key={s.label} style={{ background: "#fff", border: "1px solid #e8e8e8", padding: "16px 18px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#888", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color ?? "#0f1419" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {progress != null && (
          <div style={{ height: 6, background: "#e8e8e8", marginBottom: 32 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#0f1419", transition: "width 0.4s" }} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* ── MINT CONTROL ── */}
          <Section title="MINT CONTROL">
            <Row label="Status">
              <div style={{ display: "flex", gap: 8 }}>
                <ActionBtn
                  label="ACTIVATE MINT"
                  active={mintActive === false}
                  onClick={() => doWrite("mint_toggle", { address: CONTRACTS.NFT, abi: NFT_ABI as any, functionName: "setMintActive", args: [true] })}
                  loading={activeTx === "mint_toggle" && (isPending || !!txStates["mint_toggle"]?.pending)}
                />
                <ActionBtn
                  label="PAUSE MINT"
                  active={mintActive === true}
                  variant="danger"
                  onClick={() => doWrite("mint_toggle", { address: CONTRACTS.NFT, abi: NFT_ABI as any, functionName: "setMintActive", args: [false] })}
                  loading={activeTx === "mint_toggle" && (isPending || !!txStates["mint_toggle"]?.pending)}
                />
              </div>
            </Row>
            <StatusRow tx={txStates["mint_toggle"] ?? TX0} label="Updating mint status" />

            <Row label="Mint Price">
              <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Current: τ {mintPrice || "…"}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="e.g. 3.33"
                  style={inputStyle}
                />
                <ActionBtn
                  label="UPDATE"
                  active={true}
                  onClick={() => {
                    if (!newPrice) return;
                    doWrite("set_price", { address: CONTRACTS.NFT, abi: NFT_ABI as any, functionName: "setMintPrice", args: [parseEther(newPrice)] });
                    setNewPrice("");
                  }}
                  loading={activeTx === "set_price" && isPending}
                />
              </div>
            </Row>
            <StatusRow tx={txStates["set_price"] ?? TX0} label="Setting price" />
          </Section>

          {/* ── TREASURY / RECEIVER ── */}
          <Section title="TREASURY">
            <Row label="Liquidity Receiver">
              <div style={{ fontSize: 10, color: "#555", marginBottom: 6, wordBreak: "break-all" }}>Current: {liquidityRcvr || "…"}</div>
              <input
                value={newReceiver}
                onChange={e => setNewReceiver(e.target.value)}
                placeholder="0x…"
                style={{ ...inputStyle, marginBottom: 8, width: "100%" }}
              />
              <ActionBtn
                label="SET RECEIVER"
                active={true}
                onClick={() => {
                  if (!newReceiver) return;
                  doWrite("set_receiver", { address: CONTRACTS.NFT, abi: NFT_ABI as any, functionName: "setLiquidityReceiver", args: [newReceiver as `0x${string}`] });
                  setNewReceiver("");
                }}
                loading={activeTx === "set_receiver" && isPending}
              />
            </Row>
            <StatusRow tx={txStates["set_receiver"] ?? TX0} label="Updating receiver" />

            <Row label="Market Treasury">
              <input
                value={newTreasury}
                onChange={e => setNewTreasury(e.target.value)}
                placeholder="0x…"
                style={{ ...inputStyle, marginBottom: 8, width: "100%" }}
              />
              <ActionBtn
                label="SET TREASURY"
                active={true}
                onClick={() => {
                  if (!newTreasury) return;
                  doWrite("set_treasury", { address: CONTRACTS.SIMPLE_MARKET, abi: SIMPLE_MARKET_ABI as any, functionName: "setTreasury", args: [newTreasury as `0x${string}`] });
                  setNewTreasury("");
                }}
                loading={activeTx === "set_treasury" && isPending}
              />
            </Row>
            <StatusRow tx={txStates["set_treasury"] ?? TX0} label="Updating treasury" />
          </Section>

          {/* ── REVEAL ── */}
          <Section title="NFT REVEAL">
            <Row label="Reveal Status">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: revealed == null ? "#f0f0f0" : revealed ? "#f0fff8" : "#fff8e0", border: `1px solid ${revealed ? "#b3ffd9" : "#ffe0b3"}` }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: revealed ? "#007a4d" : "#f59e0b" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: revealed ? "#007a4d" : "#b45309", letterSpacing: "0.1em" }}>
                  {revealed == null ? "LOADING" : revealed ? "REVEALED" : "UNREVEALED"}
                </span>
              </div>
            </Row>

            <Row label="Set Unrevealed URI">
              <input
                value={newUnrevealedURI}
                onChange={e => setNewUnrevealedURI(e.target.value)}
                placeholder="ipfs://…/unrevealed.json"
                style={{ ...inputStyle, marginBottom: 8, width: "100%" }}
              />
              <ActionBtn
                label="SET URI"
                active={true}
                onClick={() => {
                  if (!newUnrevealedURI) return;
                  doWrite("set_unrevealed", { address: CONTRACTS.NFT, abi: NFT_ABI as any, functionName: "setUnrevealedURI", args: [newUnrevealedURI] });
                  setNewUnrevealedURI("");
                }}
                loading={activeTx === "set_unrevealed" && isPending}
              />
            </Row>
            <StatusRow tx={txStates["set_unrevealed"] ?? TX0} label="Setting unrevealed URI" />

            <Row label="Reveal Collection">
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.5 }}>
                Calling this is <b>irreversible</b>. All NFTs will show their final art.<br />
                Set the baseURI pointing to your IPFS metadata folder.
              </div>
              <input
                value={baseURI}
                onChange={e => setBaseURI(e.target.value)}
                placeholder="ipfs://QmYour…/metadata/"
                style={{ ...inputStyle, marginBottom: 8, width: "100%" }}
              />
              <ActionBtn
                label={revealed ? "RE-REVEAL" : "REVEAL NOW"}
                active={true}
                variant="reveal"
                onClick={() => {
                  if (!baseURI) return;
                  if (!confirm("Reveal the collection? This sets the base URI for all token metadata.")) return;
                  doWrite("reveal", { address: CONTRACTS.NFT, abi: NFT_ABI as any, functionName: "reveal", args: [baseURI] });
                  setBaseURI("");
                }}
                loading={activeTx === "reveal" && isPending}
              />
            </Row>
            <StatusRow tx={txStates["reveal"] ?? TX0} label="Revealing collection" />
          </Section>

          {/* ── CONTRACT INFO ── */}
          <Section title="CONTRACT INFO">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "NFT Contract", value: CONTRACTS.NFT },
                { label: "Marketplace V2", value: CONTRACTS.SIMPLE_MARKET },
                { label: "Rarity Oracle", value: CONTRACTS.RARITY },
                { label: "Chain", value: process.env.NEXT_PUBLIC_USE_TESTNET === "true" ? "Testnet (945)" : "Mainnet (964)" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "#888", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#0f1419", fontFamily: "monospace", wordBreak: "break-all" }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <button
                onClick={fetchState}
                style={{ padding: "8px 16px", background: "transparent", border: "1.5px solid #0f1419", color: "#0f1419", fontWeight: 700, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer" }}
              >
                REFRESH STATE
              </button>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e8e8", padding: "20px 20px 16px" }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: "#888", textTransform: "uppercase", borderBottom: "2px solid #0f1419", paddingBottom: 8, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#555", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function ActionBtn({ label, active, onClick, loading, variant }: {
  label: string; active: boolean; onClick: () => void; loading?: boolean; variant?: "danger" | "reveal";
}) {
  const bg = variant === "danger" ? "#c00" : variant === "reveal" ? "#0f1419" : "#0f1419";
  return (
    <button
      onClick={onClick}
      disabled={loading || !active}
      style={{
        padding: "8px 14px",
        background: loading || !active ? "#e0e0e0" : bg,
        color: loading || !active ? "#888" : "#fff",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        border: "none",
        cursor: loading || !active ? "not-allowed" : "pointer",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "7px 10px",
  border: "1.5px solid #d0d0d0",
  background: "#fafafa",
  fontSize: 11,
  color: "#0f1419",
  outline: "none",
  width: 120,
};
