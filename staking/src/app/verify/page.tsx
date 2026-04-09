"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyInner() {
  const searchParams  = useSearchParams();
  const token         = searchParams.get("token") ?? "";

  const { address, isConnected } = useAccount();
  const { connect }               = useConnect();
  const { signMessageAsync }      = useSignMessage();

  const [step,     setStep]    = useState<"connect" | "sign" | "loading" | "success" | "error">("connect");
  const [errMsg,   setErrMsg]  = useState("");
  const [groupLink, setGroupLink] = useState("");

  // Advance to sign step once wallet is connected
  useEffect(() => {
    if (isConnected && step === "connect") setStep("sign");
  }, [isConnected]);

  async function handleSign() {
    if (!address || !token) return;
    setStep("loading");
    try {
      const message =
        `Verify TAO Cat NFT ownership\n\nWallet: ${address}\nToken: ${token}`;

      const signature = await signMessageAsync({ message });

      const res  = await fetch("/api/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token: token || undefined, address, signature }),
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
      if (e?.message?.includes("User rejected") || e?.code === 4001) {
        setErrMsg("Signature rejected. Try again.");
      } else {
        setErrMsg(e?.message ?? "Something went wrong.");
      }
      setStep("error");
    }
  }

  if (!token) {
    return <Card title="Invalid Link" sub="This verification link is missing a token. Use the link from the TAO CAT Telegram group." icon="⚠️" />;
  }

  if (step === "connect") {
    return (
      <Card title="Verify Ownership" sub="Connect the wallet that holds your TAO Cat NFT.">
        <button className="btn-black" style={{ marginTop: 24, padding: "14px 40px", fontSize: 12 }}
          onClick={() => connect({ connector: injected() })}>
          Connect Wallet
        </button>
      </Card>
    );
  }

  if (step === "sign") {
    return (
      <Card title="Sign to Verify" sub={`Connected: ${address?.slice(0, 6)}…${address?.slice(-4)}`}
        detail="Sign a message to prove wallet ownership. This is free — no gas required.">
        <button className="btn-black" style={{ marginTop: 24, padding: "14px 40px", fontSize: 12 }}
          onClick={handleSign}>
          Sign Message
        </button>
      </Card>
    );
  }

  if (step === "loading") {
    return (
      <Card title="Verifying…" sub="Checking your TAO Cat NFT balance on Bittensor EVM.">
        <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 16, height: 16, border: "2px solid rgba(15,20,25,0.15)",
            borderTopColor: "#0f1419", borderRadius: "50%",
            animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em" }}>Checking chain 964…</span>
        </div>
      </Card>
    );
  }

  if (step === "success") {
    return (
      <Card title="Verified! 🐱" sub="You hold a TAO Cat NFT. Welcome to the holders group." accent>
        {groupLink ? (
          <a href={groupLink} target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              marginTop: 24, padding: "16px 28px", background: "#0f1419", color: "#fff",
              textDecoration: "none", fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase",
              border: "2px solid #0f1419" }}>
            Join TAO CAT Holders →
          </a>
        ) : (
          <div style={{ marginTop: 20, padding: "12px 20px", background: "#f0fdf4",
            border: "1.5px solid #bbf7d0", fontSize: 12, color: "#065f46", fontWeight: 700, lineHeight: 1.8 }}>
            Verified! Return to Telegram to access the group.
          </div>
        )}
      </Card>
    );
  }

  // error
  return (
    <Card title="Verification Failed" sub={errMsg || "You don't hold a TAO Cat NFT in this wallet."}>
      <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
        <button className="btn-black" style={{ padding: "12px 28px", fontSize: 11 }}
          onClick={() => { setStep("sign"); setErrMsg(""); }}>
          Try Again
        </button>
        <a href="https://taocats.fun/mint" className="btn-ghost" style={{ textDecoration: "none", padding: "12px 24px", fontSize: 11 }}>
          Mint a Cat →
        </a>
      </div>
    </Card>
  );
}

// ── Simple card layout ─────────────────────────────────────────────────────────
function Card({ title, sub, detail, children, accent, icon }: {
  title: string; sub?: string; detail?: string;
  children?: React.ReactNode; accent?: boolean; icon?: string;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#fff", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, border: "2px solid #0f1419",
        boxShadow: "4px 4px 0 #0f1419", padding: "40px 36px", background: "#fff" }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, background: "#0f1419", display: "flex",
            alignItems: "center", justifyContent: "center" }}>
            <img src="https://taocats.fun/logo.png" width={24} height={24} alt=""
              style={{ imageRendering: "pixelated" }} />
          </div>
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 800,
            fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            TAO CAT <span style={{ color: "#94a3b8" }}>· VERIFY</span>
          </span>
        </div>

        {icon && <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>}

        <div style={{ fontFamily: "IBM Plex Mono, monospace" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0f1419",
            letterSpacing: "-0.02em", marginBottom: 10 }}>{title}</div>
          {sub && (
            <div style={{ fontSize: 12, color: accent ? "#065f46" : "#64748b",
              lineHeight: 1.8, marginBottom: detail ? 8 : 0 }}>{sub}</div>
          )}
          {detail && (
            <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.8 }}>{detail}</div>
          )}
          {children}
        </div>

        <div style={{ marginTop: 36, paddingTop: 20, borderTop: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 8, fontWeight: 700,
            color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Bittensor EVM · Chain 964
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
