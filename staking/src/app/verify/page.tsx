"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyInner() {
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const { address, isConnected } = useAccount();
  const { connect }               = useConnect();
  const { signMessageAsync }      = useSignMessage();

  const [step,      setStep]      = useState<"connect" | "sign" | "loading" | "success" | "error">("connect");
  const [errMsg,    setErrMsg]    = useState("");
  const [groupLink, setGroupLink] = useState("");

  useEffect(() => {
    if (isConnected && step === "connect") setStep("sign");
  }, [isConnected]);

  async function handleSign() {
    if (!address) return;
    setStep("loading");
    try {
      const message  = `Verify TAO Cat NFT ownership\n\nWallet: ${address}\nToken: ${token}`;
      const signature = await signMessageAsync({ message });
      const res  = await fetch("/api/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token || undefined, address, signature }),
      });
      const json = await res.json();
      if (res.ok) {
        if (json.groupLink) setGroupLink(json.groupLink);
        setStep("success");
      } else {
        setErrMsg(json.error ?? "Verification failed.");
        setStep("error");
      }
    } catch (e: any) {
      setErrMsg(
        e?.message?.includes("rejected") || e?.code === 4001
          ? "Signature rejected. Try again."
          : e?.message ?? "Something went wrong."
      );
      setStep("error");
    }
  }

  const steps = [
    { id: "connect", label: "Connect" },
    { id: "sign",    label: "Sign"    },
    { id: "loading", label: "Verify"  },
    { id: "success", label: "Access"  },
  ];
  const stepIdx = steps.findIndex(s => s.id === step);

  return (
    <div style={{
      minHeight: "100vh", background: "#fff",
      fontFamily: "IBM Plex Mono, Courier New, monospace",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Top bar ── */}
      <div style={{ borderBottom: "2px solid #0f1419", padding: "0 40px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="https://taocats.fun" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#0f1419",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="https://taocats.fun/logo.png" width={24} height={24} alt=""
              style={{ imageRendering: "pixelated" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "#0f1419" }}>
            TAO CAT <span style={{ color: "#94a3b8" }}>· VERIFY</span>
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          padding: "4px 12px", border: "1.5px solid #bbf7d0", background: "#f0fdf4" }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: "#065f46",
            letterSpacing: "0.12em", textTransform: "uppercase" }}>Bittensor EVM · 964</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* Progress steps */}
          {step !== "error" && (
            <div style={{ display: "flex", alignItems: "center", marginBottom: 40 }}>
              {steps.map((s, i) => {
                const done    = i < stepIdx || step === "success";
                const active  = i === stepIdx && step !== "success";
                const future  = i > stepIdx && step !== "success";
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: done || step === "success" ? "#0f1419" : active ? "#0f1419" : "#f1f5f9",
                        border: `2px solid ${done || step === "success" ? "#0f1419" : active ? "#0f1419" : "#e2e8f0"}`,
                        transition: "all 0.3s",
                      }}>
                        {done || step === "success"
                          ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          : <span style={{ fontSize: 9, fontWeight: 800, color: active ? "#fff" : "#94a3b8" }}>{i + 1}</span>
                        }
                      </div>
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.10em",
                        textTransform: "uppercase",
                        color: done || active || step === "success" ? "#0f1419" : "#94a3b8" }}>
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div style={{ flex: 1, height: 2, margin: "0 6px", marginBottom: 22,
                        background: done || step === "success" ? "#0f1419" : "#e2e8f0",
                        transition: "background 0.3s" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── CONNECT ── */}
          {step === "connect" && (
            <div style={{ border: "2px solid #0f1419", boxShadow: "4px 4px 0 #0f1419", padding: "44px 40px" }}>
              <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.18em",
                textTransform: "uppercase", marginBottom: 14 }}>Step 1 of 3</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f1419",
                letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16 }}>
                Verify Your<br />TAO Cat
              </h1>
              <div style={{ width: 40, height: 3, background: "#0f1419", marginBottom: 20 }} />
              <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.9, marginBottom: 32 }}>
                Connect the wallet holding your TAO Cat NFT to prove ownership and unlock the private holders group.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2,
                background: "#e2e8f0", marginBottom: 32 }}>
                {[["4,699", "Total Supply"], ["5", "Rarity Tiers"], ["Free", "To Verify"]].map(([v, l]) => (
                  <div key={l} style={{ background: "#fff", padding: "14px 16px" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#0f1419", letterSpacing: "-0.02em" }}>{v}</div>
                    <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => connect({ connector: injected() })}
                style={{ width: "100%", padding: "16px", background: "#0f1419", color: "#fff",
                  border: "2px solid #0f1419", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                  transition: "opacity 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Connect Wallet →
              </button>
            </div>
          )}

          {/* ── SIGN ── */}
          {step === "sign" && (
            <div style={{ border: "2px solid #0f1419", boxShadow: "4px 4px 0 #0f1419", padding: "44px 40px" }}>
              <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.18em",
                textTransform: "uppercase", marginBottom: 14 }}>Step 2 of 3</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0f1419",
                letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16 }}>
                Sign to<br />Prove Ownership
              </h1>
              <div style={{ width: 40, height: 3, background: "#0f1419", marginBottom: 20 }} />

              {/* Connected wallet display */}
              <div style={{ padding: "14px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", flexShrink: 0 }} />
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#0f1419", fontWeight: 700 }}>
                  {address?.slice(0, 10)}…{address?.slice(-8)}
                </span>
              </div>

              <div style={{ padding: "14px 16px", background: "#fffbeb", border: "1.5px solid #fde68a",
                fontSize: 11, color: "#92400e", lineHeight: 1.8, marginBottom: 28 }}>
                This is a <strong>free signature</strong> — no gas, no transaction. Just proves you own this wallet.
              </div>

              <button onClick={handleSign}
                style={{ width: "100%", padding: "16px", background: "#0f1419", color: "#fff",
                  border: "2px solid #0f1419", cursor: "pointer", fontFamily: "inherit",
                  fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                  transition: "opacity 0.12s" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                Sign Message →
              </button>
              <button onClick={() => setStep("connect")}
                style={{ width: "100%", marginTop: 10, padding: "12px", background: "transparent",
                  color: "#94a3b8", border: "1.5px solid #e2e8f0", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  textTransform: "uppercase" }}>
                Use Different Wallet
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {step === "loading" && (
            <div style={{ border: "2px solid #0f1419", boxShadow: "4px 4px 0 #0f1419",
              padding: "60px 40px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, border: "3px solid #f1f5f9",
                borderTopColor: "#0f1419", borderRadius: "50%", margin: "0 auto 28px",
                animation: "spin 0.8s linear infinite" }} />
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f1419",
                letterSpacing: "-0.01em", marginBottom: 10 }}>Checking NFT Ownership</div>
              <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.8 }}>
                Querying Bittensor EVM (Chain 964)…<br />
                Checking wallet + staked NFTs
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <div style={{ border: "2px solid #0f1419", boxShadow: "4px 4px 0 #0f1419", overflow: "hidden" }}>
              {/* Green header */}
              <div style={{ background: "#0f1419", padding: "32px 40px" }}>
                <div style={{ width: 48, height: 48, background: "#10b981",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#fff",
                  letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 8 }}>
                  Verified!
                </div>
                <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.8 }}>
                  TAO Cat NFT confirmed. You're in.
                </div>
              </div>
              {/* CTA */}
              <div style={{ padding: "32px 40px" }}>
                <div style={{ fontSize: 8, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", marginBottom: 16 }}>Your Access</div>
                {groupLink ? (
                  <a href={groupLink} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "18px 24px", background: "#0f1419", color: "#fff",
                      textDecoration: "none", border: "2px solid #0f1419",
                      transition: "opacity 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.10em",
                        textTransform: "uppercase", marginBottom: 4 }}>TAO CAT Holders Group</div>
                      <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600 }}>Tap to open in Telegram</div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                ) : (
                  <div style={{ padding: "16px 20px", background: "#f0fdf4",
                    border: "1.5px solid #bbf7d0", fontSize: 12, color: "#065f46",
                    fontWeight: 700, lineHeight: 1.8 }}>
                    Verified! Return to Telegram to access the group.
                  </div>
                )}
                <div style={{ marginTop: 16, fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
                  Welcome to the TAO CAT community 🐱
                </div>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === "error" && (
            <div style={{ border: "2px solid #ef4444", boxShadow: "4px 4px 0 #ef4444", overflow: "hidden" }}>
              <div style={{ background: "#ef4444", padding: "28px 40px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff",
                  letterSpacing: "-0.01em" }}>Verification Failed</div>
              </div>
              <div style={{ padding: "32px 40px" }}>
                <div style={{ padding: "14px 16px", background: "#fef2f2",
                  border: "1.5px solid #fecaca", fontSize: 12, color: "#991b1b",
                  fontWeight: 600, lineHeight: 1.8, marginBottom: 28 }}>
                  {errMsg || "No TAO Cat NFTs found in this wallet."}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { setStep("sign"); setErrMsg(""); }}
                    style={{ flex: 1, padding: "14px", background: "#0f1419", color: "#fff",
                      border: "2px solid #0f1419", cursor: "pointer", fontFamily: "inherit",
                      fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                    Try Again
                  </button>
                  <a href="https://taocats.fun/mint"
                    style={{ flex: 1, padding: "14px", background: "transparent", color: "#0f1419",
                      border: "2px solid #0f1419", cursor: "pointer", fontFamily: "inherit",
                      fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase",
                      textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Mint a Cat →
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700,
          letterSpacing: "0.10em", textTransform: "uppercase" }}>
          TAO CAT · NFT Holder Verification
        </span>
        <a href="https://taocats.fun" style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700,
          letterSpacing: "0.10em", textTransform: "uppercase", textDecoration: "none" }}>
          taocats.fun ↗
        </a>
      </div>

    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#fff" }} />}>
      <VerifyInner />
    </Suspense>
  );
}
