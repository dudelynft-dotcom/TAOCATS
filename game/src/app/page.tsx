"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DEMO_VAULTS, DEMO_CATS } from "@/lib/mockData";

// ── Rain particle ──────────────────────────────────────────────────────────────
function RainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const drops: { x: number; y: number; speed: number; length: number; opacity: number }[] = [];
    for (let i = 0; i < 120; i++) drops.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      speed: 4 + Math.random() * 6, length: 10 + Math.random() * 20,
      opacity: 0.03 + Math.random() * 0.07,
    });
    let raf: number;
    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const d of drops) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(0,255,135,${d.opacity})`;
        ctx.lineWidth = 1;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 1, d.y + d.length);
        ctx.stroke();
        d.y += d.speed;
        if (d.y > canvas!.height) { d.y = -d.length; d.x = Math.random() * canvas!.width; }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, opacity:0.6 }} />;
}

// ── Building silhouettes (isometric city) ─────────────────────────────────────
const BUILDINGS = [
  { left:"5%",  bottom:0, width:80,  height:340, color:"#0d1530", windows:[[20,60],[20,100],[20,140],[50,60],[50,100],[50,140]], neon:"#00ff87" },
  { left:"12%", bottom:0, width:60,  height:200, color:"#0a1228", windows:[[10,40],[10,80],[35,40],[35,80]], neon:"#4488ff" },
  { left:"20%", bottom:0, width:100, height:420, color:"#0f1830", windows:[[15,60],[15,110],[15,160],[15,210],[60,60],[60,110],[60,160]], neon:"#ffd700" },
  { left:"32%", bottom:0, width:70,  height:280, color:"#0a1220", windows:[[10,50],[10,100],[10,150],[45,50],[45,100]], neon:"#a855f7" },
  { left:"42%", bottom:0, width:90,  height:380, color:"#0d1530", windows:[[15,60],[15,120],[15,180],[55,60],[55,120],[55,180],[55,240]], neon:"#00ff87" },
  { left:"54%", bottom:0, width:65,  height:240, color:"#081018", windows:[[10,45],[10,90],[40,45],[40,90],[40,135]], neon:"#ff4444" },
  { left:"63%", bottom:0, width:110, height:460, color:"#0f1a35", windows:[[20,70],[20,130],[20,190],[20,250],[70,70],[70,130],[70,190]], neon:"#4488ff" },
  { left:"76%", bottom:0, width:75,  height:300, color:"#0a1225", windows:[[12,55],[12,105],[12,155],[48,55],[48,105]], neon:"#ffd700" },
  { left:"85%", bottom:0, width:85,  height:360, color:"#0d1530", windows:[[15,65],[15,125],[15,185],[55,65],[55,125]], neon:"#00c49a" },
  { left:"94%", bottom:0, width:55,  height:180, color:"#080e1a", windows:[[8,40],[8,80],[35,40]], neon:"#a855f7" },
];

function CityBackground() {
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), 800); return () => clearInterval(id); }, []);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1, overflow:"hidden" }}>
      {/* Sky gradient */}
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg, #010308 0%, #050d1a 40%, #0a1020 100%)" }} />
      {/* Stars */}
      {Array.from({length:60}).map((_,i) => (
        <div key={i} style={{
          position:"absolute", borderRadius:"50%",
          width: i%5===0?2:1, height: i%5===0?2:1,
          background:"#fff",
          left:`${(i*37+13)%100}%`, top:`${(i*23+7)%45}%`,
          opacity: 0.2 + (i%3)*0.2,
          animation:`pulse ${1.5+i%3}s ease-in-out infinite`,
          animationDelay:`${i*0.1}s`,
        }} />
      ))}
      {/* Ground fog */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:120,
        background:"linear-gradient(0deg, rgba(0,20,40,0.8) 0%, transparent 100%)" }} />
      {/* Buildings */}
      {BUILDINGS.map((b,i) => (
        <div key={i} style={{ position:"absolute", left:b.left, bottom:b.bottom, width:b.width, height:b.height, background:b.color }}>
          {/* Windows */}
          {b.windows.map(([wx,wy],wi) => (
            <div key={wi} style={{
              position:"absolute", left:wx, bottom:wy, width:8, height:12,
              background: (tick + i + wi) % 5 === 0 ? "transparent" : b.neon,
              opacity: (tick + i + wi) % 5 === 0 ? 0 : 0.7,
              transition:"all 0.4s",
              boxShadow: `0 0 8px ${b.neon}`,
            }} />
          ))}
          {/* Roof neon sign */}
          <div style={{ position:"absolute", top:-4, left:8, right:8, height:4, background:b.neon,
            opacity:0.6, boxShadow:`0 0 12px ${b.neon}, 0 0 30px ${b.neon}40` }} />
        </div>
      ))}
      {/* Ground */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:60,
        background:"linear-gradient(0deg, #020508, #050d18)" }}>
        {/* Road markings */}
        {Array.from({length:20}).map((_,i) => (
          <div key={i} style={{ position:"absolute", bottom:28, left:`${i*5+2}%`, width:"3%", height:3,
            background:"rgba(255,215,0,0.15)" }} />
        ))}
      </div>
    </div>
  );
}

// ── Vault target card ─────────────────────────────────────────────────────────
const TIER_COLOR = ["","#8899aa","#00c49a","#4488ff","#a855f7","#ffd700"];
const RISK_LABEL = ["","EASY","MEDIUM","HARD","EXTREME","LEGENDARY"];

function VaultCard({ vault, index, onClick }: { vault: typeof DEMO_VAULTS[0]; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const tierColor = TIER_COLOR[vault.tier];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(15,25,50,0.95)" : "rgba(10,14,26,0.9)",
        border: `1px solid ${hovered ? tierColor : "#1a2240"}`,
        padding:"16px 18px", cursor:"pointer", position:"relative", overflow:"hidden",
        transition:"all 0.2s", transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? `0 8px 30px ${tierColor}30` : "none",
        animation: `slideUp 0.4s ${index*0.06}s cubic-bezier(0.16,1,0.3,1) both`,
      }}>
      {/* Tier stripe */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:tierColor,
        boxShadow:`0 0 10px ${tierColor}` }} />
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:"#5a6890", letterSpacing:"0.12em",
            textTransform:"uppercase", marginBottom:4 }}>
            {vault.owner}
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:"#e8eaf6" }}>{vault.name}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:9, fontWeight:700, color:tierColor, letterSpacing:"0.12em",
            textTransform:"uppercase", marginBottom:3 }}>
            {RISK_LABEL[vault.tier]} VAULT
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#ffd700", fontFamily:"var(--mono)" }}>
            {vault.balance.toLocaleString()} <span style={{ fontSize:9, color:"#ffaa00" }}>$BITCAT</span>
          </div>
        </div>
      </div>
      {/* Defense bar */}
      <div style={{ marginBottom:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
          <span style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>Defense</span>
          <span style={{ fontSize:8, color: vault.defense > 70 ? "#ff4444" : vault.defense > 40 ? "#ffaa00" : "#00ff87",
            fontWeight:700, fontFamily:"var(--mono)" }}>{vault.defense}%</span>
        </div>
        <div style={{ height:3, background:"#1a2240", borderRadius:2 }}>
          <div style={{ height:"100%", width:`${vault.defense}%`, borderRadius:2,
            background: vault.defense > 70 ? "#ff4444" : vault.defense > 40 ? "#ffaa00" : "#00ff87",
            transition:"width 0.6s" }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ fontSize:9, color:"#5a6890", fontWeight:700 }}>
          🐱 {vault.guardCats} guards
        </div>
        <div style={{ fontSize:9, color:"#5a6890", fontWeight:700 }}>
          🏛 Tier {vault.tier}
        </div>
      </div>
      {hovered && (
        <div style={{ position:"absolute", bottom:12, right:14,
          fontSize:9, fontWeight:700, color:tierColor, letterSpacing:"0.10em", textTransform:"uppercase" }}>
          PLAN HEIST →
        </div>
      )}
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <div style={{ display:"flex", gap:1, background:"#0a0e1a", borderBottom:"1px solid #1a2240" }}>
      {[
        { label:"Your $BITCAT", value:"12,450",   color:"#ffd700" },
        { label:"Heists Done",  value:"7",         color:"#00ff87" },
        { label:"Success Rate", value:"71%",        color:"#4488ff" },
        { label:"Gang",         value:"Solo",       color:"#a855f7" },
        { label:"Level",        value:"4",          color:"#00c49a" },
      ].map(s => (
        <div key={s.label} style={{ flex:1, padding:"10px 16px", borderRight:"1px solid #1a2240" }}>
          <div style={{ fontSize:15, fontWeight:700, color:s.color, fontFamily:"var(--mono)" }}>{s.value}</div>
          <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", marginTop:2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CityMapPage() {
  const [selectedVault, setSelectedVault] = useState<typeof DEMO_VAULTS[0] | null>(null);
  const [tab, setTab] = useState<"city"|"crew"|"vault">("city");

  return (
    <div style={{ minHeight:"100vh", position:"relative" }}>
      <CityBackground />
      <RainCanvas />

      {/* Scanline overlay */}
      <div style={{ position:"fixed", inset:0, zIndex:2, pointerEvents:"none",
        backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />

      {/* Content */}
      <div style={{ position:"relative", zIndex:10, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* Top nav */}
        <nav style={{ borderBottom:"1px solid #1a2240", background:"rgba(5,8,16,0.95)",
          backdropFilter:"blur(20px)", padding:"0 24px", display:"flex", alignItems:"center",
          justifyContent:"space-between", height:56, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ fontSize:18, fontWeight:900, letterSpacing:"0.04em", color:"#e8eaf6",
              fontFamily:"var(--mono)", textTransform:"uppercase" }}>
              CAT<span style={{ color:"#00ff87" }}>HEIST</span>
            </div>
            <div style={{ padding:"2px 10px", background:"rgba(0,255,135,0.08)", border:"1px solid rgba(0,255,135,0.2)",
              fontSize:8, fontWeight:700, color:"#00ff87", letterSpacing:"0.14em", textTransform:"uppercase" }}>
              BETA
            </div>
          </div>
          <div style={{ display:"flex", gap:4 }}>
            {(["city","crew","vault"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  padding:"6px 16px", background: tab===t ? "rgba(0,255,135,0.1)" : "transparent",
                  border: tab===t ? "1px solid rgba(0,255,135,0.3)" : "1px solid transparent",
                  color: tab===t ? "#00ff87" : "#5a6890", cursor:"pointer",
                  fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
                  fontFamily:"var(--font)", transition:"all 0.15s",
                }}>
                {t === "city" ? "🏙 City" : t === "crew" ? "🐱 My Crew" : "🏦 My Vault"}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8,
            padding:"6px 14px", border:"1px solid #1a2240", background:"rgba(10,14,26,0.8)" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#00ff87",
              boxShadow:"0 0 8px #00ff87", animation:"pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize:9, fontWeight:700, color:"#e8eaf6", letterSpacing:"0.08em" }}>0x7959...55FF</span>
          </div>
        </nav>

        <StatsBar />

        {/* City map title */}
        {tab === "city" && (
          <div style={{ padding:"20px 24px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:"#5a6890", letterSpacing:"0.16em",
                textTransform:"uppercase", marginBottom:6 }}>— Sector 7 — Tonight's Targets</div>
              <h1 style={{ fontSize:22, fontWeight:800, color:"#e8eaf6", letterSpacing:"-0.01em" }}>
                Choose Your Target
              </h1>
            </div>
            <div style={{ fontSize:9, color:"#5a6890", fontWeight:700, textAlign:"right" }}>
              <div style={{ color:"#ffd700", fontSize:13, fontWeight:700, fontFamily:"var(--mono)", marginBottom:2 }}>
                {DEMO_VAULTS.reduce((a,v) => a+v.balance,0).toLocaleString()}
              </div>
              TOTAL AVAILABLE $BITCAT
            </div>
          </div>
        )}

        {/* Tab content */}
        <div style={{ flex:1, padding:"0 24px 24px", overflowY:"auto" }}>

          {tab === "city" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:10 }}>
              {DEMO_VAULTS.map((vault, i) => (
                <VaultCard key={i} vault={vault} index={i} onClick={() => setSelectedVault(vault)} />
              ))}
            </div>
          )}

          {tab === "crew" && <CrewTab />}
          {tab === "vault" && <VaultTab />}

        </div>

        {/* City floor with cats walking */}
        <div style={{ height:60, background:"rgba(2,5,8,0.9)", borderTop:"1px solid #0d1525",
          display:"flex", alignItems:"center", justifyContent:"center", gap:32, flexShrink:0 }}>
          <a href="https://taocats.fun" style={{ fontSize:9, color:"#5a6890", fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase", textDecoration:"none" }}>
            taocats.fun
          </a>
          <div style={{ fontSize:9, color:"#1a2240", fontWeight:700, letterSpacing:"0.10em" }}>·</div>
          <span style={{ fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>
            CAT HEIST · BETA · BITTENSOR EVM
          </span>
          <div style={{ fontSize:9, color:"#1a2240", fontWeight:700, letterSpacing:"0.10em" }}>·</div>
          <a href="https://x.com/CatsonTao" style={{ fontSize:9, color:"#5a6890", fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase", textDecoration:"none" }}>
            @CatsonTao
          </a>
        </div>
      </div>

      {/* Target selected modal */}
      {selectedVault && (
        <TargetModal vault={selectedVault} onClose={() => setSelectedVault(null)} />
      )}
    </div>
  );
}

// ── Target modal ──────────────────────────────────────────────────────────────
function TargetModal({ vault, onClose }: { vault: typeof DEMO_VAULTS[0]; onClose: () => void }) {
  const tierColor = TIER_COLOR[vault.tier];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center",
      background:"rgba(0,0,0,0.85)", backdropFilter:"blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#0a0e1a", border:`1px solid ${tierColor}`, width:"100%", maxWidth:460,
          margin:24, animation:"slideUp 0.25s cubic-bezier(0.16,1,0.3,1) both" }}>
        {/* Header */}
        <div style={{ borderBottom:`1px solid #1a2240`, padding:"20px 24px", background:"#050810",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:9, color:tierColor, fontWeight:700, letterSpacing:"0.14em",
              textTransform:"uppercase", marginBottom:4 }}>TARGET ACQUIRED</div>
            <div style={{ fontSize:20, fontWeight:800, color:"#e8eaf6" }}>{vault.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#5a6890",
            cursor:"pointer", fontSize:20, padding:4 }}>✕</button>
        </div>
        {/* Info */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#1a2240", marginBottom:20 }}>
            {[
              { l:"Vault Balance",  v:`${vault.balance.toLocaleString()} $BITCAT`, c:"#ffd700" },
              { l:"Vault Tier",     v:`Tier ${vault.tier} — ${RISK_LABEL[vault.tier]}`, c:tierColor },
              { l:"Defense Score",  v:`${vault.defense}/100`, c: vault.defense>70?"#ff4444":vault.defense>40?"#ffaa00":"#00ff87" },
              { l:"Guard Cats",     v:`${vault.guardCats} deployed`, c:"#e8eaf6" },
            ].map(s => (
              <div key={s.l} style={{ background:"#0a0e1a", padding:"14px 16px" }}>
                <div style={{ fontSize:14, fontWeight:700, color:s.c, fontFamily:"var(--mono)", marginBottom:3 }}>{s.v}</div>
                <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ padding:"12px 14px", background:"rgba(255,215,0,0.05)", border:"1px solid rgba(255,215,0,0.15)",
            marginBottom:20, fontSize:11, color:"#ffaa00", lineHeight:1.6, fontWeight:500 }}>
            💡 Max loot: ~{Math.round(vault.balance * 0.12).toLocaleString()} $BITCAT on a clean run.
            Defense is {vault.defense > 70 ? "high — bring a full crew" : vault.defense > 40 ? "moderate — 3 cats recommended" : "low — easy target"}.
          </div>
          <Link href={`/heist?vault=${encodeURIComponent(vault.name)}&tier=${vault.tier}&defense=${vault.defense}&balance=${vault.balance}`}
            style={{ display:"block", width:"100%", padding:"16px", background:tierColor, color:"#000",
              textAlign:"center", fontWeight:800, fontSize:12, letterSpacing:"0.14em",
              textTransform:"uppercase", textDecoration:"none",
              boxShadow:`0 0 30px ${tierColor}50` }}>
            🐱 ASSEMBLE CREW & PLAN HEIST
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Crew tab ──────────────────────────────────────────────────────────────────
const RARITY_COLOR: Record<string,string> = {
  Legendary:"#a855f7", Epic:"#4488ff", Rare:"#00c49a", Uncommon:"#ffaa00", Common:"#8899aa"
};
function CrewTab() {
  return (
    <div style={{ animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
      <div style={{ marginBottom:16, fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase" }}>
        Your TAO Cats
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:10 }}>
        {DEMO_CATS.map(cat => (
          <div key={cat.id} style={{ background:"#0a0e1a", border:`1px solid ${RARITY_COLOR[cat.rarity]}30`,
            padding:16, position:"relative" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2,
              background:RARITY_COLOR[cat.rarity], boxShadow:`0 0 10px ${RARITY_COLOR[cat.rarity]}` }} />
            <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:14 }}>
              <div style={{ width:52, height:52, background:"#050810", border:`1px solid ${RARITY_COLOR[cat.rarity]}40`,
                overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={cat.image} alt={cat.name} style={{ width:48, height:48, imageRendering:"pixelated" }} />
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#e8eaf6", marginBottom:2 }}>{cat.name}</div>
                <div style={{ fontSize:9, fontWeight:700, color:RARITY_COLOR[cat.rarity], letterSpacing:"0.10em", textTransform:"uppercase" }}>
                  {cat.rarity}
                </div>
                <div style={{ fontSize:8, color:"#5a6890", fontFamily:"var(--mono)", marginTop:2 }}>#{cat.id}</div>
              </div>
            </div>
            {/* Stats */}
            {(Object.entries(cat.stats) as [string, number][]).map(([k, v]) => (
              <div key={k} style={{ marginBottom:5 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span style={{ fontSize:7, color:"#5a6890", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.10em" }}>{k}</span>
                  <span style={{ fontSize:7, color:"#e8eaf6", fontWeight:700, fontFamily:"var(--mono)" }}>{v}</span>
                </div>
                <div style={{ height:3, background:"#1a2240", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${v}%`, borderRadius:2, background:RARITY_COLOR[cat.rarity],
                    boxShadow:`0 0 6px ${RARITY_COLOR[cat.rarity]}80` }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vault tab ─────────────────────────────────────────────────────────────────
function VaultTab() {
  return (
    <div style={{ animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both", maxWidth:540 }}>
      <div style={{ background:"#0a0e1a", border:"1px solid #1a2240", marginBottom:10 }}>
        <div style={{ borderBottom:"1px solid #1a2240", padding:"16px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#e8eaf6" }}>My Vault</div>
          <div style={{ fontSize:9, color:"#00ff87", fontWeight:700, letterSpacing:"0.10em",
            textTransform:"uppercase", padding:"3px 10px", border:"1px solid rgba(0,255,135,0.3)",
            background:"rgba(0,255,135,0.05)" }}>
            TIER 2
          </div>
        </div>
        <div style={{ padding:"20px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"#1a2240" }}>
          {[
            { l:"Balance",    v:"12,450 $BITCAT", c:"#ffd700" },
            { l:"Defense",    v:"35 / 100",       c:"#ffaa00" },
            { l:"Guard Cats", v:"1 deployed",      c:"#e8eaf6" },
            { l:"Last Robbed",v:"Never",           c:"#00ff87" },
          ].map(s => (
            <div key={s.l} style={{ background:"#0a0e1a", padding:"14px 16px" }}>
              <div style={{ fontSize:14, fontWeight:700, color:s.c, fontFamily:"var(--mono)", marginBottom:3 }}>{s.v}</div>
              <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"16px 20px" }}>
          <button style={{ width:"100%", padding:"12px", background:"rgba(68,136,255,0.1)",
            border:"1px solid rgba(68,136,255,0.3)", color:"#4488ff", fontWeight:700,
            fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", cursor:"pointer", fontFamily:"var(--font)" }}>
            🛡 UPGRADE VAULT DEFENSE
          </button>
        </div>
      </div>
      <div style={{ padding:"12px 14px", background:"rgba(255,68,68,0.05)", border:"1px solid rgba(255,68,68,0.15)",
        fontSize:10, color:"#ff4444", lineHeight:1.6 }}>
        ⚠️ Your vault defense is low. Other players can rob up to 12% of your balance. Deploy more guard cats or upgrade.
      </div>
    </div>
  );
}
