"use client";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { MAX_SUPPLY, MINT_PRICE } from "@/lib/config";

// ── Launch countdown ──────────────────────────────────────────────────────────
// Launch: April 10 2026 11:00 AM UTC
const LAUNCH_TARGET = new Date("2026-04-10T11:00:00.000Z").getTime();

function useCountdown() {
  const [remaining, setRemaining] = useState(() => Math.max(0, LAUNCH_TARGET - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setRemaining(Math.max(0, LAUNCH_TARGET - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  const h  = Math.floor(remaining / 3_600_000);
  const m  = Math.floor((remaining % 3_600_000) / 60_000);
  const s  = Math.floor((remaining % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return remaining > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : null;
}

const MintProgress = dynamic(() => import("@/components/MintProgress"), { ssr: false });

const HERO_SAMPLES = [50, 100, 200, 300, 500, 700, 900, 1200];
const GRID_SAMPLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1500, 2000, 2500, 3000];

const TIERS = [
  { name:"Legendary", pct:"~1%",  count:"~47",    color:"#7c3aed", bg:"#ede9fe", desc:"Ultra-rare traits, maximum rarity score" },
  { name:"Epic",      pct:"~5%",  count:"~235",   color:"#1d4ed8", bg:"#dbeafe", desc:"Exceptional trait combinations" },
  { name:"Rare",      pct:"~10%", count:"~470",   color:"#059669", bg:"#d4f5e9", desc:"Distinctive and sought-after cats" },
  { name:"Uncommon",  pct:"~20%", count:"~940",   color:"#a16207", bg:"#fef3c7", desc:"Above average rarity score" },
  { name:"Common",    pct:"~64%", count:"~3,007", color:"#475569", bg:"#f1f5f9", desc:"The backbone of the collection" },
];

const HOW_IT_WORKS = [
  { step:"01", title:"Add Bittensor EVM",  desc:"Add Chain ID 964 to MetaMask or any EVM-compatible wallet. Use the official Bittensor bridge to get TAO on EVM." },
  { step:"02", title:"Mint Your Cats",     desc:`Click Mint, choose quantity (up to 20 per wallet), confirm at τ ${MINT_PRICE} per cat. Transaction confirms in seconds.` },
  { step:"03", title:"Art Reveals",        desc:"All art is hidden until sellout. Once all 4,699 cats are minted, the full artwork reveals on-chain via IPFS." },
  { step:"04", title:"Trade on Market",    desc:"Buy and sell TAO Cats on the built-in marketplace. The first NFT trading marketplace live on Bittensor EVM." },
];

// SVG pixel cat — same design, zero DOM overhead vs 484 divs
function PixelCat({ size = 220, color = "#0f1419" }: { size?: number; color?: string }) {
  const grid = [
    "00011000000000011000",
    "00111100000001111100",
    "00111100000001111100",
    "00111110000011111100",
    "00011111111111111000",
    "00001111111111110000",
    "00011111111111111100",
    "00111111111111111110",
    "01111111001110011110",
    "01111110000100001111",
    "01111111001110011110",
    "00111111111111111100",
    "00111111111111111100",
    "00011111111111111000",
    "00001111000011110000",
    "00000110110011011000",
    "00000000111100000000",
    "00000000011000000000",
    "00001100000000011000",
    "00111110000001111100",
    "00011100000000111000",
  ];
  const cols = grid[0].length;
  const rows = grid.length;
  const rects: React.ReactNode[] = [];
  grid.forEach((row, r) => {
    row.split("").forEach((cell, c) => {
      if (cell === "1") rects.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} />);
    });
  });
  return (
    <svg width={size} height={Math.round(size * rows / cols)} viewBox={`0 0 ${cols} ${rows}`} fill={color} shapeRendering="crispEdges">
      {rects}
    </svg>
  );
}

export default function HomePage() {
  const countdown = useCountdown();
  const [toast, setToast] = useState(false);

  function showToast() {
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:56 }}>

      {/* HERO */}
      <div style={{ background:"#ffffff", borderBottom:"3px solid #0f1419" }}>
        <div className="hero-inner" style={{ maxWidth:1400, margin:"0 auto", padding:"64px 40px 48px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:48, flexWrap:"wrap" }}>

          <div style={{ maxWidth:560, flex:1, minWidth:280 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
              <span style={{ padding:"3px 10px", background:"#0f1419", color:"#ffffff", fontSize:9, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase" }}>Live on Bittensor EVM</span>
              <span style={{ padding:"3px 10px", border:"1px solid #0f1419", color:"#0f1419", fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>Chain 964</span>
              <span style={{ padding:"3px 10px", border:"1px solid #0f1419", color:"#0f1419", fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>Open Mint</span>
            </div>

            <h1 style={{ fontSize:"clamp(40px,5vw,72px)", fontWeight:700, color:"#0f1419", letterSpacing:"-0.03em", lineHeight:0.95, textTransform:"uppercase", marginBottom:20 }}>
              TAO<br/>CATS
            </h1>
            <div style={{ width:48, height:4, background:"#0f1419", marginBottom:20 }} />
            <p style={{ color:"#5a6478", fontSize:14, lineHeight:1.8, marginBottom:8, fontWeight:500 }}>
              4,699 generative pixel cats. The first NFT collection on Bittensor EVM.
            </p>
            <p style={{ color:"#9aa0ae", fontSize:12, lineHeight:1.8, marginBottom:32 }}>
              Hand-crafted pixel art layers, on-chain rarity, and the first built-in NFT marketplace on TAO.
              No whitelist. No team allocation. Equal access for everyone.
            </p>

            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
              <button onClick={showToast}
                style={{ padding:"13px 32px", background:"#0f1419", color:"#ffffff",
                  fontWeight:700, fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase",
                  border:"2px solid #0f1419", cursor:"not-allowed", opacity:0.55 }}>
                Mint Now | τ {MINT_PRICE}
              </button>
              <button onClick={showToast}
                style={{ padding:"13px 32px", background:"transparent", color:"#0f1419",
                  fontWeight:700, fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase",
                  border:"2px solid #0f1419", cursor:"not-allowed", opacity:0.55 }}>
                View Market
              </button>
            </div>

            {/* Countdown */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#00c49a",
                boxShadow:"0 0 6px #00c49a", flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:700, color:"#5a6478", letterSpacing:"0.08em",
                textTransform:"uppercase" }}>
                {countdown
                  ? <>Launching in <span style={{ fontFamily:"monospace", color:"#0f1419", fontWeight:800 }}>{countdown}</span></>
                  : "Launching soon"}
              </span>
            </div>

            <MintProgress />
          </div>

          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:20, flexShrink:0 }}>
            <div className="hide-mobile">
              <PixelCat size={200} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:3, maxWidth:260 }}>
              {HERO_SAMPLES.map((n) => (
                <div key={n} style={{ border:"2px solid #0f1419", overflow:"hidden", aspectRatio:"1/1" }}>
                  <Image src={`/samples/${n}.png`} alt={`Cat #${n}`} width={64} height={64} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ borderBottom:"1px solid #0f1419", background:"#0f1419" }}>
        <div className="stats-bar-inner" style={{ maxWidth:1400, margin:"0 auto", padding:"0 40px", display:"flex", overflowX:"auto" }}>
          {[
            { label:"Total Supply",  value:"4,699" },
            { label:"Mint Price",    value:`τ ${MINT_PRICE}` },
            { label:"Minted",        value: "—" },
            { label:"Remaining",     value: "—" },
            { label:"Chain",         value:"Bittensor EVM" },
            { label:"Team Tokens",   value:"Zero" },
            { label:"Whitelist",     value:"None" },
          ].map((s, idx, arr) => (
            <div key={s.label} style={{ padding:"16px 28px", borderRight: idx < arr.length-1 ? "1px solid #2a3040" : "none", flexShrink:0, whiteSpace:"nowrap" }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#ffffff", fontFamily:"monospace", letterSpacing:"-0.01em" }}>{s.value}</div>
              <div style={{ fontSize:9, fontWeight:700, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.12em", marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COLLECTION PREVIEW */}
      <div className="section-pad" style={{ maxWidth:1400, margin:"0 auto", padding:"56px 40px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>Collection Preview</div>
            <h2 style={{ fontSize:28, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"-0.02em" }}>4,699 Pixel Cats</h2>
          </div>
          <Link href="/marketplace" style={{ fontSize:10, fontWeight:700, color:"#0f1419", letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none", borderBottom:"2px solid #0f1419", paddingBottom:2 }}>
            Browse All
          </Link>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:3 }}>
          {GRID_SAMPLES.map((n) => (
            <div key={n} style={{ border:"1px solid #e0e3ea", overflow:"hidden", cursor:"pointer", transition:"border-color 0.12s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor="#0f1419")}
              onMouseLeave={e => (e.currentTarget.style.borderColor="#e0e3ea")}>
              <div style={{ aspectRatio:"1/1", background:"#f7f8fa" }}>
                <Image src={`/samples/${n}.png`} alt={`Cat #${n}`} width={280} height={280} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              </div>
              <div style={{ padding:"7px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid #e0e3ea", background:"#ffffff" }}>
                <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:"#0f1419" }}>#{n}</span>
                <span style={{ fontSize:9, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.06em" }}>TAO Cat</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ABOUT */}
      <div style={{ background:"#0f1419", borderTop:"3px solid #0f1419" }}>
        <div className="section-pad" style={{ maxWidth:1400, margin:"0 auto", padding:"64px 40px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:64, alignItems:"center" }} className="about-grid">
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:12 }}>About the Collection</div>
              <h2 style={{ fontSize:36, fontWeight:700, color:"#ffffff", textTransform:"uppercase", letterSpacing:"-0.02em", lineHeight:1, marginBottom:24 }}>
                The First NFT<br/>on Bittensor EVM
              </h2>
              <div style={{ width:32, height:3, background:"#ffffff", marginBottom:24 }} />
              <p style={{ color:"#9aa0ae", fontSize:13, lineHeight:1.9, marginBottom:16 }}>
                TAO Cats is the genesis NFT collection on Bittensor EVM (Chain 964). Built by the community,
                for the community, with zero insider advantage.
              </p>
              <p style={{ color:"#9aa0ae", fontSize:13, lineHeight:1.9, marginBottom:32 }}>
                Each cat is algorithmically generated from hand-crafted pixel art layers: backgrounds, bodies,
                expressions, outfits, headwear, and eyewear, producing 4,699 unique combinations with
                mathematically proven on-chain rarity.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#2a3040" }}>
                {[
                  { label:"Unique Cats",   value:"4,699" },
                  { label:"Art Layers",    value:"6 Types" },
                  { label:"Rarity Tiers",  value:"5 Tiers" },
                  { label:"Blockchain",    value:"Bittensor EVM" },
                ].map(s => (
                  <div key={s.label} style={{ padding:"16px 20px", background:"#0f1419" }}>
                    <div style={{ fontFamily:"monospace", fontSize:18, fontWeight:700, color:"#ffffff", marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:9, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.12em", fontWeight:700 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:3 }}>
                {[100, 500, 900, 1500, 2000, 2500].map(n => (
                  <div key={n} style={{ border:"1px solid #2a3040", overflow:"hidden", aspectRatio:"1/1" }}>
                    <Image src={`/samples/${n}.png`} alt={`Cat #${n}`} width={200} height={200} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RARITY TIERS */}
      <div style={{ borderTop:"1px solid #e0e3ea", borderBottom:"1px solid #e0e3ea" }}>
        <div className="section-pad" style={{ maxWidth:1400, margin:"0 auto", padding:"64px 40px" }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>On-Chain Rarity</div>
            <h2 style={{ fontSize:28, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"-0.02em" }}>5 Rarity Tiers</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3 }} className="tiers-grid">
            {TIERS.map((t) => (
              <div key={t.name} style={{ border:`2px solid ${t.color}`, padding:"24px 20px", background:t.bg }}>
                <div style={{ width:10, height:10, background:t.color, marginBottom:14 }} />
                <div style={{ fontSize:13, fontWeight:700, color:t.color, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{t.name}</div>
                <div style={{ fontFamily:"monospace", fontSize:22, fontWeight:700, color:"#0f1419", marginBottom:4 }}>{t.count}</div>
                <div style={{ fontSize:10, color:"#9aa0ae", fontWeight:700, letterSpacing:"0.08em", marginBottom:12 }}>{t.pct} of supply</div>
                <p style={{ fontSize:11, color:"#5a6478", lineHeight:1.7 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW TO MINT */}
      <div style={{ background:"#f7f8fa", borderBottom:"1px solid #e0e3ea" }}>
        <div className="section-pad" style={{ maxWidth:1400, margin:"0 auto", padding:"64px 40px" }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>Getting Started</div>
            <h2 style={{ fontSize:28, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"-0.02em" }}>How to Mint</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:1, background:"#e0e3ea" }} className="how-grid">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} style={{ background:"#ffffff", padding:"28px 24px" }}>
                <div style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.10em", marginBottom:16 }}>STEP {s.step}</div>
                <div style={{ width:32, height:3, background:"#0f1419", marginBottom:14 }} />
                <h3 style={{ fontSize:13, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>{s.title}</h3>
                <p style={{ fontSize:12, color:"#5a6478", lineHeight:1.8 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY TAO CATS */}
      <div style={{ borderBottom:"1px solid #e0e3ea" }}>
        <div className="section-pad" style={{ maxWidth:1400, margin:"0 auto", padding:"64px 40px" }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8 }}>Why TAO Cats</div>
            <h2 style={{ fontSize:28, fontWeight:700, color:"#0f1419", textTransform:"uppercase", letterSpacing:"-0.02em" }}>Built Different</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"#e0e3ea" }} className="why-grid">
            {[
              { title:"No Team Allocation",   desc:"Every cat goes to public mint. Zero insider allocation, zero pre-mines, zero reserved supply. The founders participate as equals." },
              { title:"Pioneer Collection",   desc:"TAO Cats is the first NFT collection deployed on Bittensor EVM. Being early in a new ecosystem has historically been one of the most valuable positions in crypto." },
              { title:"On-Chain Rarity",      desc:"Rarity scores are computed and stored on-chain by a dedicated Rarity contract. Immutable, verifiable, tamper-proof. No one can alter the scores after deployment." },
              { title:"Built-In Marketplace", desc:"A full NFT marketplace ships with the collection. No third-party fees from day one. Buy, sell, and discover TAO Cats natively on the Bittensor EVM." },
              { title:"Open and Permissionless", desc:"No whitelist. No private sale. No KYC. Any wallet on Bittensor EVM can mint during the public mint window, equal access for everyone." },
              { title:"Early Ecosystem Position", desc:"Bittensor EVM is a nascent ecosystem. TAO Cats holders are positioned at the very beginning of what may become a thriving on-chain economy." },
            ].map((item) => (
              <div key={item.title} style={{ background:"#ffffff", padding:"28px 24px" }}>
                <div style={{ width:6, height:6, background:"#0f1419", marginBottom:16 }} />
                <h3 style={{ color:"#0f1419", fontWeight:700, fontSize:12, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>{item.title}</h3>
                <p style={{ color:"#5a6478", fontSize:12, lineHeight:1.8 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ background:"#0f1419" }}>
        <div className="section-pad" style={{ maxWidth:1400, margin:"0 auto", padding:"64px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:32, flexWrap:"wrap" }}>
          <div>
            <h2 style={{ fontSize:32, fontWeight:700, color:"#ffffff", textTransform:"uppercase", letterSpacing:"-0.02em", marginBottom:8 }}>Ready to Mint?</h2>
            <p style={{ color:"#5a6478", fontSize:13 }}>τ {MINT_PRICE} per cat · Up to 20 per wallet · {MAX_SUPPLY.toLocaleString()} total supply</p>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <Link
              href="/mint"
              style={{ padding:"14px 36px", background:"#ffffff", color:"#0f1419", fontWeight:700, fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", textDecoration:"none", display:"inline-block" }}>
              Mint Now | τ {MINT_PRICE}
            </Link>
            <Link
              href="/marketplace"
              style={{ padding:"14px 36px", background:"transparent", color:"#ffffff", border:"1px solid #2a3040", fontWeight:700, fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", textDecoration:"none", display:"inline-block" }}>
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ borderTop:"1px solid #1e2640", padding:"24px 40px", background:"#0f1419" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, background:"#ffffff", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
              <Image src="/logo.png" alt="TAO Cats" width={22} height={22} style={{ width:22, height:22, objectFit:"contain" }} />
            </div>
            <span style={{ fontWeight:700, letterSpacing:"0.12em", fontSize:11, textTransform:"uppercase", color:"#ffffff" }}>TAO CATS</span>
          </div>
          <div style={{ display:"flex", gap:24, alignItems:"center" }}>
            <Link href="/mint"        style={{ color:"#5a6478", fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none" }}>Mint</Link>
            <Link href="/marketplace" style={{ color:"#5a6478", fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none" }}>Market</Link>
            <Link href="/dashboard"   style={{ color:"#5a6478", fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none" }}>Dashboard</Link>
            <a href="https://x.com/CatsonTao" target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:6, color:"#fff", fontSize:10, fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase", textDecoration:"none",
                padding:"5px 12px", border:"1px solid #2a3040", background:"#1a1a2e", transition:"border-color 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor="#fff")}
              onMouseLeave={e => (e.currentTarget.style.borderColor="#2a3040")}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              @CatsonTao
            </a>
          </div>
          <p style={{ color:"#2a3040", fontSize:10, letterSpacing:"0.06em" }}>Bittensor EVM · Chain 964 · 4,699 Cats · 2025 TAO CATS</p>
        </div>
      </footer>

      {/* Coming soon toast */}
      <div style={{
        position:"fixed", bottom:32, left:"50%", transform:"translate(-50%, 0)",
        background:"#0f1419", color:"#fff",
        padding:"10px 24px", fontSize:11, fontWeight:800, letterSpacing:"0.10em",
        textTransform:"uppercase", zIndex:9998, pointerEvents:"none",
        opacity: toast ? 1 : 0,
        transition:"opacity 0.25s ease",
      }}>
        Coming Soon
      </div>

    </div>
  );
}
