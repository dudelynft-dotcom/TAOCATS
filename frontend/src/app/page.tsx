"use client";
import Link from "next/link";
import Image from "next/image";
import { useReadContract } from "wagmi";
import { CONTRACTS, MAX_SUPPLY, MINT_PRICE, COLLECTION_NAME } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

// Selected sample IDs for display
const HERO_SAMPLES   = [50, 100, 200, 300, 500, 700, 900, 1200];
const GRID_SAMPLES   = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const TIERS = [
  { name:"Legendary", pct:"~1%",  count:"~47",   color:"#000", bg:"#fff", desc:"Ultra-rare traits, maximum rarity score" },
  { name:"Epic",      pct:"~5%",  count:"~235",  color:"#000", bg:"#fff", desc:"Exceptional trait combinations" },
  { name:"Rare",      pct:"~10%", count:"~470",  color:"#000", bg:"#fff", desc:"Distinctive and sought-after cats" },
  { name:"Uncommon",  pct:"~20%", count:"~940",  color:"#000", bg:"#fff", desc:"Above average rarity score" },
  { name:"Common",    pct:"~64%", count:"~3,007",color:"#000", bg:"#fff", desc:"The backbone of the collection" },
];

const HOW_IT_WORKS = [
  { step:"01", title:"Add Bittensor EVM",  desc:"Add Chain ID 964 to your wallet. Use the bridge to get TAO on EVM." },
  { step:"02", title:"Mint Your Cats",     desc:`Choose quantity (up to 20 per wallet) at τ ${MINT_PRICE} per cat.` },
  { step:"03", title:"Art Reveals",        desc:"Art is revealed on-chain after all 4,699 cats are minted." },
  { step:"04", title:"Trade on Market",    desc:"Buy and sell TAO Cats on the built-in marketplace." },
];

function PixelCatSilhouette({ size = 220 }: { size?: number }) {
  const px = Math.round(size / 22);
  const grid = [
    [0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
    [0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,0,0,1,1,1,1,1,0],
    [0,1,1,1,1,1,1,1,0,0,0,0,1,0,0,0,0,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,0,0,1,1,1,0,0,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,0,0,1,1,1,1,1,0,0,0,0,0,1,1,1,1,0,0,0,0],
    [0,0,0,0,0,1,1,0,1,1,0,0,0,1,1,0,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0],
    [0,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0],
  ];
  return (
    <div style={{ display:"inline-block", lineHeight:0 }} className="pixel-cat-container">
      {grid.map((row, ri) => (
        <div key={ri} style={{ display:"flex" }}>
          {row.map((cell, ci) => (
            <div key={ci} style={{ width:px, height:px, background: cell ? "#0f1419" : "transparent" }} />
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
  const remaining = MAX_SUPPLY - minted;
  const progress  = (minted / MAX_SUPPLY) * 100;

  return (
    <div style={{ background:"#ffffff", minHeight:"100vh", paddingTop:64 }}>

      {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
      <section className="pixel-border" style={{ background:"#ffffff", borderBottomWidth:4 }}>
        <div className="container-app" style={{ padding:"80px 20px", display:"flex", alignItems:"center", flexWrap:"wrap", gap:64 }}>
          
          <div style={{ flex: "1 1 500px" }}>
            <div style={{ display:"flex", gap:10, marginBottom:24 }}>
              <span className="tag-dark">Bittensor EVM</span>
              <span className="tag-outline">Chain 964</span>
            </div>
            
            <h1 style={{ fontSize:"clamp(48px, 8vw, 84px)", lineHeight:0.9, marginBottom:24 }}>
              {COLLECTION_NAME}
            </h1>
            <p style={{ fontSize:16, color:"#5a6478", maxWidth:500, marginBottom:40 }}>
              4,699 pixel cats. The pioneer NFT collection built for the Bittensor ecosystem.
              Verifiable rarity, built-in trading, and 100% community access.
            </p>

            <div style={{ display:"flex", gap:16, flexWrap:"wrap", marginBottom:48 }}>
              <Link href="/mint" className="btn-primary">
                Mint Now | τ {MINT_PRICE}
              </Link>
              <Link href="/marketplace" className="btn-outline">
                View Gallery
              </Link>
            </div>

            <div style={{ maxWidth:400 }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:8 }}>
                <span>Minting Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height:12, background:"#f0f1f4", border:"2px solid #0f1419" }}>
                <div style={{ width:`${progress}%`, height:"100%", background:"#0f1419", transition:"width 1s cubic-bezier(0.4,0,0.2,1)" }} />
              </div>
            </div>
          </div>

          <div style={{ flex:"0 0 auto", margin:"0 auto" }} className="hide-mobile">
            <PixelCatSilhouette size={280} />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      <section style={{ background:"#0f1419", color:"#fff", borderBottom:"4px solid #0f1419" }}>
        <div className="container-app" style={{ display:"flex", overflowX:"auto" }}>
          {[
            { label:"Total Supply", value:MAX_SUPPLY },
            { label:"Mint Price",  value:`τ ${MINT_PRICE}` },
            { label:"Minted",      value:minted },
            { label:"Available",   value:remaining },
            { label:"Limit",       value:"20 per wal" },
          ].map((s, i) => (
            <div key={i} style={{ padding:"24px 40px", borderRight:"1px solid #2a3040", flexShrink:0 }}>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"monospace" }}>{s.value}</div>
              <div style={{ fontSize:10, color:"#5a6478", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PREVIEW GRID ─────────────────────────────────────────────────────── */}
      <section className="container-app" style={{ padding:"100px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:48 }}>
          <div>
            <div className="tag-outline" style={{ marginBottom:12 }}>The Collection</div>
            <h2 style={{ fontSize:32 }}>4,699 Unique Variations</h2>
          </div>
          <Link href="/marketplace" className="hide-mobile" style={{ textDecoration:"none", fontWeight:700, borderBottom:"2px solid #0f1419" }}>Browse Market →</Link>
        </div>

        <div className="responsive-grid grid-cols-4">
          {GRID_SAMPLES.map(n => (
            <div key={n} className="pixel-border brutal-shadow-hover" style={{ overflow:"hidden" }}>
              <div style={{ aspectRatio:"1/1", background:"#f7f8fa" }}>
                <Image src={`/samples/${n}.png`} alt={`Cat #${n}`} width={300} height={300} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              </div>
              <div style={{ padding:"12px", display:"flex", justifyContent:"space-between", borderTop:"2px solid #0f1419" }}>
                <span style={{ fontWeight:700 }}>#{n}</span>
                <span style={{ fontSize:10, color:"#9aa0ae" }}>RARITY POOL</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── RARITY TIERS ─────────────────────────────────────────────────────── */}
      <section style={{ background:"#f7f8fa", borderTop:"4px solid #0f1419", borderBottom:"4px solid #0f1419" }}>
        <div className="container-app" style={{ padding:"100px 20px" }}>
          <div style={{ textAlign:"center", marginBottom:64 }}>
            <h2 style={{ fontSize:40 }}>Rarity Distribution</h2>
            <p style={{ color:"#5a6478" }}>Mathematically proven scarcity tiers enforced on-chain.</p>
          </div>
          <div className="responsive-grid grid-cols-4" style={{ gap:16 }}>
            {TIERS.map(t => (
              <div key={t.name} className="pixel-border" style={{ padding:"32px 24px", background:"#fff" }}>
                <h3 style={{ fontSize:16, marginBottom:8 }}>{t.name}</h3>
                <div style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>{t.pct}</div>
                <div style={{ fontSize:11, color:"#9aa0ae", textTransform:"uppercase", marginBottom:16 }}>{t.count} Units</div>
                <p style={{ fontSize:12, color:"#5a6478", lineHeight:1.8 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section className="container-app" style={{ padding:"100px 20px" }}>
        <h2 style={{ fontSize:32, marginBottom:48 }}>How to Participate</h2>
        <div className="responsive-grid grid-cols-4">
          {HOW_IT_WORKS.map(s => (
            <div key={s.step} className="pixel-border" style={{ padding:"32px 24px" }}>
              <div style={{ fontSize:48, fontWeight:800, opacity:0.1, lineHeight:1, marginBottom:-20 }}>{s.step}</div>
              <h3 style={{ fontSize:14, marginBottom:12, position:"relative" }}>{s.title}</h3>
              <p style={{ fontSize:13, color:"#5a6478", lineHeight:1.8 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ background:"#0f1419", color:"#fff", padding:"120px 20px", textAlign:"center" }}>
        <div className="container-app">
          <h2 style={{ fontSize:48, color:"#fff", marginBottom:16 }}>Ready to Connect?</h2>
          <p style={{ color:"#9aa0ae", marginBottom:48 }}>Join the first NFT community on the Bittensor EVM.</p>
          <Link href="/mint" className="btn-primary" style={{ background:"#fff", color:"#0f1419" }}>
            Start Minting →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:"4px solid #0f1419", padding:"64px 20px" }}>
        <div className="container-app" style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:40 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:40, height:40, background:"#0f1419", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Image src="/logo.png" alt="TAO CAT" width={32} height={32} />
              </div>
              <span style={{ fontWeight:800, letterSpacing:"0.1em" }}>TAO CAT</span>
            </div>
            <p style={{ fontSize:12, color:"#9aa0ae", maxWidth:300 }}>
              The premier NFT collection on Bittensor EVM. 4,699 unique pixel cats.
            </p>
          </div>
          <div style={{ display:"flex", gap:64 }}>
            {[
              { t:"Explore", links:[{n:"Mint",h:"/mint"},{n:"Market",h:"/marketplace"},{n:"Portfolio",h:"/dashboard"}] },
              { t:"Ecosystem", links:[{n:"Bittensor",h:"https://bittensor.com"},{n:"Explorer",h:"https://evm-explorer.tao.network"}] }
            ].map(col => (
              <div key={col.t}>
                <div style={{ fontSize:11, fontWeight:700, color:"#9aa0ae", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:16 }}>{col.t}</div>
                {col.links.map(l => (
                  <Link key={l.n} href={l.h} style={{ display:"block", color:"#0f1419", textDecoration:"none", fontSize:13, marginBottom:8 }}>{l.n}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="container-app" style={{ marginTop:64, paddingTop:32, borderTop:"1px solid #f0f1f4", fontSize:11, color:"#9aa0ae", display:"flex", justifyContent:"space-between" }}>
          <span>© 2025 TAO CAT COLLECTION</span>
          <span>CHAIN ID 964</span>
        </div>
      </footer>
    </div>
  );
}
