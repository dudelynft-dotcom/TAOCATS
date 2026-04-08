"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { MINT_PRICE } from "@/lib/config";

// ── Launch countdown ──────────────────────────────────────────────────────────
// Launch: April 9 2026 1:00 PM UTC
const LAUNCH_TARGET = new Date("2026-04-09T13:00:00.000Z").getTime();

function useCountdown() {
  const [ms, setMs] = useState(() => Math.max(0, LAUNCH_TARGET - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setMs(Math.max(0, LAUNCH_TARGET - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    h:    pad(Math.floor(ms / 3_600_000)),
    m:    pad(Math.floor((ms % 3_600_000) / 60_000)),
    s:    pad(Math.floor((ms % 60_000) / 1000)),
    done: ms === 0,
  };
}

const SAMPLES = [1, 2, 3, 4, 5, 6, 7, 8];

// ── Pixel cat SVG ─────────────────────────────────────────────────────────────
function PixelCat({ size = 240, color = "#fff" }: { size?: number; color?: string }) {
  const grid = [
    "00011000000000011000","00111100000001111100","00111100000001111100","00111110000011111100",
    "00011111111111111000","00001111111111110000","00011111111111111100","00111111111111111110",
    "01111111001110011110","01111110000100001111","01111111001110011110","00111111111111111100",
    "00111111111111111100","00011111111111111000","00001111000011110000","00000110110011011000",
    "00000000111100000000","00000000011000000000","00001100000000011000","00111110000001111100",
    "00011100000000111000",
  ];
  const cols = grid[0].length, rows = grid.length;
  return (
    <svg width={size} height={Math.round(size * rows / cols)}
      viewBox={`0 0 ${cols} ${rows}`} fill={color} shapeRendering="crispEdges">
      {grid.map((row, r) => row.split("").map((c, ci) =>
        c === "1" ? <rect key={`${r}-${ci}`} x={ci} y={r} width={1} height={1} /> : null
      ))}
    </svg>
  );
}

export default function HomePage() {
  const cd = useCountdown();
  const [toast, setToast] = useState(false);

  function showToast() {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  return (
    <div style={{ background:"#000", minHeight:"100vh", color:"#fff", paddingTop:64 }}>

      {/* ── TOP BAR ── */}
      <div style={{ borderBottom:"1px solid #1c1c1c" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"10px 32px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.22em",
            color:"#3a3a3a", textTransform:"uppercase", fontFamily:"monospace" }}>
            TAO CATS // GENESIS
          </span>
          <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.22em",
            color:"#3a3a3a", textTransform:"uppercase", fontFamily:"monospace" }}>
            BITTENSOR EVM / CHAIN 964
          </span>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"48px 32px 64px" }}>

        {/* NFT GRID — centered row */}
        <div style={{ position:"relative", marginBottom:56, display:"flex", justifyContent:"center" }}>
          {/* faint pixel cat behind */}
          <div style={{ position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)", opacity:0.04, pointerEvents:"none" }}>
            <PixelCat size={380} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
            gap:3, maxWidth:520, position:"relative", zIndex:1 }}>
            {SAMPLES.slice(0,4).map(n => (
              <div key={n} style={{ aspectRatio:"1/1", overflow:"hidden",
                border:"1px solid #1c1c1c" }}>
                <Image src={`/samples/${n}.png`} alt="" width={130} height={130}
                  style={{ width:"100%", height:"100%", objectFit:"cover",
                    display:"block", filter:"brightness(0.75) saturate(0.8)" }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── TWO-COL BOTTOM ── */}
        <div className="teaser-grid">

          {/* LEFT — heading + stats + CTA */}
          <div>
            <h1 className="teaser-heading">
              4,699<br />PIXEL<br />CATS.
            </h1>

            <div style={{ marginBottom:28, borderTop:"1px solid #1c1c1c", paddingTop:20 }}>
              {[
                "ZERO INSIDER ALLOCATION.",
                "ZERO TEAM ALLOCATION.",
                "A PURE PERMISSIONLESS FAIR LAUNCH.",
              ].map(t => (
                <div key={t} style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em",
                  color:"#3a3a3a", marginBottom:7, fontFamily:"monospace" }}>
                  {t}
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button onClick={showToast}
                style={{ padding:"12px 28px", background:"#fff", color:"#000", border:"none",
                  fontWeight:800, fontSize:10, letterSpacing:"0.12em",
                  textTransform:"uppercase", cursor:"not-allowed",
                  opacity:0.35, fontFamily:"monospace" }}>
                MINT NOW · τ {MINT_PRICE}
              </button>
              <button onClick={showToast}
                style={{ padding:"12px 28px", background:"transparent", color:"#fff",
                  border:"1px solid #2a2a2a", fontWeight:800, fontSize:10,
                  letterSpacing:"0.12em", textTransform:"uppercase",
                  cursor:"not-allowed", opacity:0.35, fontFamily:"monospace" }}>
                VIEW MARKET
              </button>
            </div>
          </div>

          {/* RIGHT — status + countdown + contributors */}
          <div style={{ display:"flex", flexDirection:"column",
            justifyContent:"flex-end", alignItems:"flex-end" }}>

            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.22em",
              color:"#3a3a3a", marginBottom:16, fontFamily:"monospace",
              textTransform:"uppercase" }}>
              SYSTEM STATUS: INCOMING
            </div>

            {/* Countdown box */}
            <div style={{ border:"1px dashed #2a2a2a", padding:"28px 36px",
              marginBottom:20, display:"inline-block" }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.20em",
                color:"#3a3a3a", marginBottom:16, textAlign:"center",
                fontFamily:"monospace", textTransform:"uppercase" }}>
                LAUNCHING IN
              </div>
              <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>
                {[{ v:cd.h, l:"HR" }, { v:cd.m, l:"MIN" }, { v:cd.s, l:"SEC" }].map((t) => (
                  <div key={t.l} style={{ textAlign:"center" }}>
                    <div style={{ fontSize:"clamp(32px,4vw,52px)", fontWeight:900,
                      color:"#fff", lineHeight:1, letterSpacing:"-0.02em",
                      fontFamily:"monospace" }}>
                      {t.v}
                    </div>
                    <div style={{ fontSize:8, color:"#3a3a3a", fontWeight:700,
                      letterSpacing:"0.16em", marginTop:6, fontFamily:"monospace" }}>
                      {t.l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contributors line */}
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.16em",
              color:"#2e2e2e", lineHeight:2, fontFamily:"monospace",
              textTransform:"uppercase", textAlign:"right" }}>
              EARLY COMMUNITY MEMBERS<br />
              WILL BE RECOGNIZED AT LAUNCH
            </div>
          </div>

        </div>
      </div>

      {/* ── BOTTOM STRIP ── */}
      <div style={{ borderTop:"1px solid #1c1c1c", padding:"14px 32px",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        maxWidth:1400, margin:"0 auto" }}>
        <span style={{ fontSize:8, color:"#2a2a2a", fontWeight:700,
          letterSpacing:"0.18em", fontFamily:"monospace", textTransform:"uppercase" }}>
          4,699 SUPPLY · τ {MINT_PRICE} MINT · CHAIN 964
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#00c49a",
            boxShadow:"0 0 6px #00c49a" }} />
          <span style={{ fontSize:8, color:"#2a2a2a", fontWeight:700,
            letterSpacing:"0.18em", fontFamily:"monospace", textTransform:"uppercase" }}>
            LIVE ON BITTENSOR EVM
          </span>
        </div>
      </div>

      {/* ── TOAST ── */}
      <div style={{
        position:"fixed", bottom:32, left:"50%", transform:"translate(-50%,0)",
        background:"#fff", color:"#000", padding:"10px 28px",
        fontSize:11, fontWeight:800, letterSpacing:"0.12em",
        textTransform:"uppercase", zIndex:9998, pointerEvents:"none",
        fontFamily:"monospace",
        opacity: toast ? 1 : 0, transition:"opacity 0.25s ease",
      }}>
        COMING SOON
      </div>

    </div>
  );
}
