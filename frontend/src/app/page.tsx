"use client";
import Link from "next/link";
import Image from "next/image";
import { useReadContract } from "wagmi";
import { CONTRACTS, MAX_SUPPLY, MINT_PRICE, COLLECTION_NAME } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

const HERO_SAMPLES   = [1, 2, 3, 4, 5, 8, 7, 12];
const GRID_SAMPLES   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1500, 2000, 2500, 3000];

const TIERS = [
  { name:"LEGENDARY", pct:"~1%",  count:"~47",   color:"#7c3aed", bg:"#ede9fe", desc:"Ultra-rare traits, maximum rarity score" },
  { name:"EPIC",      pct:"~5%",  count:"~235",  color:"#1d4ed8", bg:"#dbeafe", desc:"Exceptional trait combinations" },
  { name:"RARE",      pct:"~10%", count:"~470",  color:"#0a7a5a", bg:"#d4f5e9", desc:"Distinctive and sought-after cats" },
  { name:"UNCOMMON",  pct:"~20%", count:"~940",  color:"#a16207", bg:"#fef3c7", desc:"Above average rarity score" },
  { name:"COMMON",    pct:"~64%", count:"~3,007",color:"#475569", bg:"#f1f5f9", desc:"The backbone of the collection" },
];

function PixelCatSilhouette({ size = 280 }: { size?: number }) {
  const px = Math.round(size / 24);
  const grid = [
    [0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,1,0],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,1,1,1,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1],
    [0,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,0,0,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0],
  ];
  return (
    <div style={{ display:"inline-block", lineHeight:0 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display:"flex" }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{ width:px, height:px, background: cell ? "#000" : "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data: totalSupply } = useReadContract({
    address: CONTRACTS.NFT, abi: NFT_ABI, functionName: "totalSupply",
  });
  const minted    = totalSupply ? Number(totalSupply) : 0;
  const progress  = (minted / MAX_SUPPLY) * 100;

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <section style={{ borderBottom:"1px solid #e0e3ea", padding:"100px 0 80px" }}>
        <div className="container-app" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:64, flexWrap:"wrap" }}>
          
          <div style={{ flex: "1 1 100%", maxWidth:600 }}>
            <div style={{ display:"flex", gap:10, marginBottom:32, flexWrap:"wrap" }}>
              <span style={{ background:"#000", color:"#fff", padding:"4px 12px", fontSize:10, fontWeight:700, letterSpacing:"0.1em" }}>LIVE ON BITTENSOR EVM</span>
              <span style={{ border:"1px solid #000", padding:"3px 12px", fontSize:10, fontWeight:700, letterSpacing:"0.1em" }}>CHAIN 964</span>
              <span style={{ border:"1px solid #000", padding:"3px 12px", fontSize:10, fontWeight:700, letterSpacing:"0.1em" }}>OPEN MINT</span>
            </div>
            
            <h1 style={{ fontSize:"clamp(60px, 10vw, 100px)", fontWeight:800, color:"#000", letterSpacing:"-0.04em", lineHeight:0.9, textTransform:"uppercase", marginBottom:32 }}>
              TAO<br/>CATS
            </h1>
            
            <div style={{ width:64, height:4, background:"#000", marginBottom:32 }} />

            <p style={{ fontSize:16, color:"#5a6478", maxWidth:500, marginBottom:20, lineHeight:1.6, fontFamily:"monospace" }}>
              4,699 generative pixel cats. The first NFT collection on Bittensor EVM.
            </p>
            <p style={{ fontSize:12, color:"#9aa0ae", maxWidth:500, marginBottom:48, lineHeight:1.8 }}>
              Hand-crafted pixel art layers, on-chain rarity, and the first built-in NFT marketplace on TAO. 
              No whitelist. No team allocation. Equal access for everyone.
            </p>

            <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:48 }}>
              <Link href="/mint" style={{ padding:"16px 40px", background:"#000", color:"#fff", fontWeight:700, fontSize:12, letterSpacing:"0.1em", textDecoration:"none", border:"2px solid #000" }}>
                MINT NOW | τ {MINT_PRICE}
              </Link>
              <Link href="/marketplace" style={{ padding:"16px 40px", background:"#fff", color:"#000", fontWeight:700, fontSize:12, letterSpacing:"0.1em", textDecoration:"none", border:"2px solid #000" }}>
                VIEW MARKET
              </Link>
            </div>

            <div style={{ maxWidth:450 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:8, color:"#9aa0ae" }}>
                <span>{minted.toLocaleString()} / {MAX_SUPPLY.toLocaleString()} MINTED</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height:4, background:"#f0f1f4" }}>
                <div style={{ width:`${progress}%`, height:"100%", background:"#000", transition:"width 1s ease-in-out" }} />
              </div>
            </div>
          </div>

          <div style={{ flex:"1 1 100%", maxWidth:320, margin:"0 auto", textAlign:"center" }}>
            <div className="hide-mobile" style={{ marginBottom:32 }}>
              <PixelCatSilhouette size={280} />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4, maxWidth:320, margin:"0 auto" }}>
              {HERO_SAMPLES.map(n => (
                <div key={n} style={{ border:"1.5px solid #000", overflow:"hidden", aspectRatio:"1/1" }}>
                  <Image src={`/samples/${n}.png`} alt="" width={80} height={80} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <section style={{ background:"#000", color:"#fff" }}>
        <div className="container-app" style={{ display:"flex", overflowX:"auto" }}>
          {[
            { label:"TOTAL SUPPLY", value:MAX_SUPPLY.toLocaleString() },
            { label:"MINT PRICE",   value:`τ ${MINT_PRICE}` },
            { label:"MINTED",       value:minted.toLocaleString() },
            { label:"REMAINING",    value:(MAX_SUPPLY-minted).toLocaleString() },
            { label:"CHAIN",        value:"Bittensor EVM" },
            { label:"TEAM TOKENS",  value:"Zero" },
            { label:"WHITELIST",    value:"None" },
          ].map((s, i) => (
            <div key={i} style={{ padding:"24px 40px", borderRight:"1px solid #1a1a1a", flexShrink:0 }}>
              <div style={{ fontSize:18, fontWeight:700 }}>{s.value}</div>
              <div style={{ fontSize:9, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COLLECTION PREVIEW ────────────────────────────────────────────────── */}
      <section className="container-app" style={{ padding:"80px 20px" }}>
        <div className="mobile-flex-col" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32, gap:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>COLLECTION PREVIEW</div>
            <h2 style={{ fontSize:36, fontWeight:800, textTransform:"uppercase" }}>4,699 PIXEL CATS</h2>
          </div>
          <Link href="/marketplace" style={{ fontSize:11, fontWeight:700, borderBottom:"2px solid #000", textDecoration:"none" }}>BROWSE ALL →</Link>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:4 }}>
          {GRID_SAMPLES.map(n => (
            <div key={n} style={{ border:"1px solid #eee", overflow:"hidden" }}>
              <div style={{ aspectRatio:"1/1", background:"#f7f8fa" }}>
                <Image src={`/samples/${typeof n === 'number' && n > 12 ? (n % 12 + 1) : n}.png`} alt="" width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ padding:"8px 12px", display:"flex", justifyContent:"space-between", borderTop:"1px solid #eee", background:"#fff" }}>
                <span style={{ fontWeight:700, fontSize:10 }}>#{n}</span>
                <span style={{ fontSize:8, color:"#9aa0ae", textTransform:"uppercase" }}>TAO CAT</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ABOUT SECTION ─────────────────────────────────────────────────────── */}
      <section style={{ background:"#0a0f14", color:"#fff", borderTop:"4px solid #000" }}>
        <div className="container-app" style={{ padding:"100px 20px" }}>
          <div className="responsive-grid grid-cols-2" style={{ gap:40, alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>ABOUT THE COLLECTION</div>
              <h2 style={{ fontSize:42, fontWeight:800, textTransform:"uppercase", lineHeight:1, marginBottom:32 }}>THE FIRST NFT<br/>ON BITTENSOR EVM</h2>
              <div style={{ width:40, height:3, background:"#fff", marginBottom:32 }} />
              <p style={{ color:"#9aa0ae", fontSize:14, lineHeight:1.8, marginBottom:24 }}>
                TAO Cats is the genesis NFT collection on Bittensor EVM (Chain 964). Built by the community, for the community, with zero insider advantage.
              </p>
              <div className="responsive-grid grid-cols-2" style={{ gap:32, borderTop:"1px solid #1a1a1a", paddingTop:32 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>4,699</div>
                  <div style={{ fontSize:9, color:"#5a6478", textTransform:"uppercase" }}>UNIQUE CATS</div>
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>6 Types</div>
                  <div style={{ fontSize:9, color:"#5a6478", textTransform:"uppercase" }}>ART LAYERS</div>
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>5 Tiers</div>
                  <div style={{ fontSize:9, color:"#5a6478", textTransform:"uppercase" }}>RARITY TIERS</div>
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:700, marginBottom:4 }}>Bittensor EVM</div>
                  <div style={{ fontSize:9, color:"#5a6478", textTransform:"uppercase" }}>BLOCKCHAIN</div>
                </div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2, background:"#000", border:"2px solid #000" }}>
              {[100, 500, 900, 1500, 2000, 2500].map(n => (
                <div key={n} style={{ aspectRatio:"1/1", background:"#000" }}>
                  <Image src={`/samples/${n % 12 + 1}.png`} alt="" width={300} height={300} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RARITY TIERS ─────────────────────────────────────────────────────── */}
      <section className="container-app" style={{ padding:"100px 20px" }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>ON-CHAIN RARITY</div>
          <h2 style={{ fontSize:32, fontWeight:800 }}>5 RARITY TIERS</h2>
        </div>
        <div className="responsive-grid grid-cols-5" style={{ gap:4 }}>
          {TIERS.map(t => (
            <div key={t.name} style={{ border:`1.5px solid ${t.color}`, padding:"24px", background:t.bg }}>
              <div style={{ width:12, height:12, background:t.color, marginBottom:20 }} />
              <h3 style={{ fontSize:12, fontWeight:800, color:t.color, marginBottom:8 }}>{t.name}</h3>
              <div style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>{t.count}</div>
              <div style={{ fontSize:10, color:"#9aa0ae", textTransform:"lowercase", marginBottom:16 }}>{t.pct} of supply</div>
              <p style={{ fontSize:11, color:"#5a6478", lineHeight:1.6 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW TO MINT ──────────────────────────────────────────────────────── */}
      <section style={{ background:"#fdfdfd", borderTop:"1px solid #eee" }}>
        <div className="container-app" style={{ padding:"100px 20px" }}>
          <h2 style={{ fontSize:32, fontWeight:800, marginBottom:48 }}>HOW TO MINT</h2>
          <div className="responsive-grid grid-cols-4" style={{ gap:1 }}>
            {[
              { s:"01", t:"ADD BITTENSOR EVM", d:"Add Chain ID 964 to MetaMask or any EVM-compatible wallet. Use the bridge to get TAO on EVM." },
              { s:"02", t:"MINT YOUR CATS", d:"Click Mint, choose quantity (up to 20 per wallet), confirm at τ 0.03 per cat. Transaction confirms in seconds." },
              { s:"03", t:"ART REVEALS", d:"All art is hidden until sellout. Once collectors mint 4,699 cats, full artwork reveals via IPFS." },
              { s:"04", t:"TRADE ON MARKET", d:"Buy and sell TAO Cats on the built-in marketplace natively on Bittensor EVM." },
            ].map(step => (
              <div key={step.s} style={{ padding:32, border:"1px solid #eee", background:"#fff" }}>
                <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", marginBottom:16 }}>STEP {step.s}</div>
                <h3 style={{ fontSize:14, fontWeight:800, marginBottom:16 }}>{step.t}</h3>
                <p style={{ fontSize:12, color:"#5a6478", lineHeight:1.8 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT DIFFERENT ───────────────────────────────────────────────────── */}
      <section className="container-app" style={{ padding:"100px 20px" }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:12 }}>WHY TAO CATS</div>
          <h2 style={{ fontSize:32, fontWeight:800 }}>BUILT DIFFERENT</h2>
        </div>
        <div className="responsive-grid grid-cols-3" style={{ gap:1, background: "#eee", border:"1px solid #eee" }}>
          {[
            { t:"NO TEAM ALLOCATION", d:"Every cat goes to public mint. Zero insider allocation, zero pre-mines, zero reserved supply. The founders participate as equals." },
            { t:"PIONEER COLLECTION", d:"TAO Cats is the first NFT collection deployed on Bittensor EVM. Being early in a new ecosystem has historical value." },
            { t:"ON-CHAIN RARITY", d:"Rarity scores are computed and stored on-chain by a dedicated Rarity contract. Immutable, verifiable, tamper-proof. No one can alter the scores after deployment." },
            { t:"BUILT-IN MARKETPLACE", d:"A full NFT marketplace ships with the collection. No third-party fees from day one. Buy, sell, and discover TAO Cats natively on the Bittensor EVM." },
            { t:"OPEN & PERMISSIONLESS", d:"No whitelist. No private sale. No KYC. Any wallet on Bittensor EVM can mint during the public mint window, equal access for everyone." },
            { t:"EARLY ECOSYSTEM POSITION", d:"Bittensor EVM is a nascent ecosystem. TAO Cats holders are positioned at the very beginning of what may become a thriving on-chain economy." },
          ].map(item => (
            <div key={item.t} style={{ padding:40, background:"#fff" }}>
              <div style={{ width:6, height:6, background:"#000", marginBottom:24 }} />
              <h3 style={{ fontSize:13, fontWeight:800, marginBottom:20, letterSpacing:"0.05em" }}>{item.t}</h3>
              <p style={{ fontSize:11, color:"#5a6478", lineHeight:1.8, fontFamily:"monospace" }}>{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ────────────────────────────────────────────────────────── */}
      <section style={{ background:"#0a0f14", color:"#fff", padding:"100px 20px", borderTop:"1px solid #1a1a1a" }}>
        <div className="container-app mobile-flex-col" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:40 }}>
          <div>
            <h2 style={{ fontSize:32, fontWeight:800, marginBottom:16 }}>READY TO MINT?</h2>
            <div style={{ fontSize:11, color:"#5a6478", letterSpacing:"0.1em", fontWeight:700 }}>
              τ {MINT_PRICE} PER CAT - UP TO 20 PER WALLET - {MAX_SUPPLY.toLocaleString()} TOTAL SUPPLY
            </div>
          </div>
          <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
            <Link href="/mint" style={{ padding:"16px 40px", background:"#fff", color:"#000", fontWeight:800, fontSize:11, letterSpacing:"0.1em", textDecoration:"none" }}>
              MINT NOW | τ {MINT_PRICE}
            </Link>
            <Link href="/marketplace" style={{ padding:"16px 40px", background:"#0a0f14", border:"1px solid #1a1a1a", color:"#fff", fontWeight:800, fontSize:11, letterSpacing:"0.1em", textDecoration:"none" }}>
              MARKETPLACE
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
