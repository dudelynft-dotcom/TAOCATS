"use client";
import Image from "next/image";
import { useEffect } from "react";

const TIER_STYLE: Record<string, { text: string; bg: string }> = {
  Legendary: { text: "#7c3aed", bg: "#ede9fe" },
  Epic:      { text: "#1d4ed8", bg: "#dbeafe" },
  Rare:      { text: "#059669", bg: "#d4f5e9" },
  Uncommon:  { text: "#a16207", bg: "#fef3c7" },
  Common:    { text: "#475569", bg: "#f1f5f9" },
};

interface Props {
  id: number;
  tier?: string;
  rank?: number;
  score?: number;
  action?: React.ReactNode;
  onClose: () => void;
}

export default function NftModal({ id, tier, rank, score, action, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const ts = tier ? (TIER_STYLE[tier] ?? TIER_STYLE.Common) : TIER_STYLE.Common;

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={onClose}>
      <div
        style={{ background:"#fff", width:"100%", maxWidth:400, position:"relative" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 20px", borderBottom:"2px solid #0f1419" }}>
          <span style={{ fontFamily:"monospace", fontSize:16, fontWeight:800 }}>
            TAO CAT #{id}
          </span>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", cursor:"pointer",
              fontSize:18, lineHeight:1, color:"#0f1419", padding:"2px 6px", fontWeight:700 }}>
            ✕
          </button>
        </div>

        {/* Image */}
        <div style={{ aspectRatio:"1/1", position:"relative", overflow:"hidden" }}>
          <Image src={`/samples/${id % 12 + 1}.png`} alt={`#${id}`} fill
            style={{ objectFit:"cover" }} />
          {tier && (
            <div style={{ position:"absolute", bottom:12, left:12, padding:"4px 12px",
              background:ts.bg, color:ts.text, fontSize:10, fontWeight:800,
              letterSpacing:"0.08em" }}>
              {tier.toUpperCase()}
            </div>
          )}
          {rank && (
            <div style={{ position:"absolute", top:12, right:12, padding:"5px 12px",
              background:"rgba(0,0,0,0.85)", color:"#fff", fontSize:11, fontWeight:800,
              letterSpacing:"0.04em" }}>
              RANK #{rank}
            </div>
          )}
        </div>

        {/* Rarity stats */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
          gap:1, background:"#e0e3ea" }}>
          {[
            { l:"TIER",  v: tier  ?? "—",              color: tier ? ts.text : "#0f1419" },
            { l:"RANK",  v: rank  ? `#${rank}`  : "—", color: "#0f1419" },
            { l:"SCORE", v: score ? score.toLocaleString() : "—", color: "#0f1419" },
          ].map(s => (
            <div key={s.l} style={{ background:"#fff", padding:"14px 16px" }}>
              <div style={{ fontFamily:"monospace", fontSize:14, fontWeight:800, color:s.color }}>
                {s.v}
              </div>
              <div style={{ fontSize:8, color:"#9aa0ae", textTransform:"uppercase",
                letterSpacing:"0.10em", marginTop:3, fontWeight:700 }}>
                {s.l}
              </div>
            </div>
          ))}
        </div>

        {/* Collection line */}
        <div style={{ padding:"10px 20px", background:"#f7f8fa",
          borderTop:"1px solid #f0f1f4", fontSize:9, color:"#9aa0ae",
          fontWeight:700, letterSpacing:"0.10em" }}>
          TAO CATS GENESIS · 4,699 SUPPLY · BITTENSOR EVM
        </div>

        {/* Optional action (BUY / LIST) */}
        {action && (
          <div style={{ padding:"16px 20px", borderTop:"1px solid #f0f1f4" }}>
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
