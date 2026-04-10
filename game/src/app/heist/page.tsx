"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DEMO_CATS } from "@/lib/mockData";
import { runHeist } from "@/lib/gameEngine";
import type { Cat, CrewRole, HeistResult, HeistEvent } from "@/lib/types";
import { ROLE_LABEL, ROLE_ICON, ROLE_STAT } from "@/lib/types";

const RARITY_COLOR: Record<string,string> = {
  Legendary:"#a855f7", Epic:"#4488ff", Rare:"#00c49a", Uncommon:"#ffaa00", Common:"#8899aa"
};
const ROLES: CrewRole[] = ["ghost","wheelman","muscle","hacker","lookout"];

// ── Crew Assembly ─────────────────────────────────────────────────────────────
function CrewAssembly({ cats, crew, onAssign, onRemove }:
  { cats: Cat[]; crew: Partial<Record<CrewRole,Cat>>; onAssign:(role:CrewRole, cat:Cat)=>void; onRemove:(role:CrewRole)=>void }) {
  const [selectedRole, setSelectedRole] = useState<CrewRole | null>(null);

  const assignedIds = new Set(Object.values(crew).map(c => c?.id));

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, height:"100%" }}>
      {/* Left — roles */}
      <div>
        <div style={{ fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.14em",
          textTransform:"uppercase", marginBottom:14 }}>Crew Roles</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ROLES.map(role => {
            const assigned = crew[role];
            const isSelected = selectedRole === role;
            return (
              <div key={role}
                onClick={() => setSelectedRole(isSelected ? null : role)}
                style={{
                  padding:"12px 14px", cursor:"pointer",
                  background: isSelected ? "rgba(0,255,135,0.08)" : assigned ? "rgba(10,14,26,0.95)" : "#0a0e1a",
                  border: isSelected ? "1px solid #00ff87" : assigned ? "1px solid #1a2240" : "1px dashed #1a2240",
                  transition:"all 0.15s", position:"relative",
                }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:18 }}>{ROLE_ICON[role]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:700, color: isSelected ? "#00ff87" : "#e8eaf6",
                      marginBottom:2 }}>{ROLE_LABEL[role]}</div>
                    <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.10em", textTransform:"uppercase" }}>
                      Uses: {ROLE_STAT[role]}
                    </div>
                  </div>
                  {assigned ? (
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ fontSize:9, fontWeight:700, color:RARITY_COLOR[assigned.rarity] }}>{assigned.name}</div>
                      <button onClick={e => { e.stopPropagation(); onRemove(role); }}
                        style={{ background:"none", border:"none", color:"#5a6890", cursor:"pointer", fontSize:14, padding:2 }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ fontSize:8, color:"#5a6890", fontWeight:600 }}>
                      {isSelected ? "↓ pick below" : "empty"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right — cat picker */}
      <div>
        <div style={{ fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.14em",
          textTransform:"uppercase", marginBottom:14 }}>
          {selectedRole ? `Select cat for ${ROLE_LABEL[selectedRole]}` : "Your Cats"}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {cats.map(cat => {
            const isAssigned = assignedIds.has(cat.id) && !crew[selectedRole ?? "ghost"]?.id.toString().includes(cat.id.toString());
            const isCurrentRole = selectedRole && crew[selectedRole]?.id === cat.id;
            return (
              <div key={cat.id}
                onClick={() => { if (selectedRole && !isAssigned) { onAssign(selectedRole, cat); setSelectedRole(null); } }}
                style={{
                  padding:"10px 12px", cursor: selectedRole && !isAssigned ? "pointer" : "default",
                  background:"#0a0e1a",
                  border:`1px solid ${isCurrentRole ? "#00ff87" : isAssigned ? "#0f1525" : RARITY_COLOR[cat.rarity]+"30"}`,
                  opacity: isAssigned ? 0.35 : 1,
                  transition:"all 0.15s",
                  display:"flex", alignItems:"center", gap:10,
                }}>
                <div style={{ width:36, height:36, background:"#050810", flexShrink:0,
                  border:`1px solid ${RARITY_COLOR[cat.rarity]}40`, overflow:"hidden",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <img src={cat.image} alt={cat.name} style={{ width:32, height:32, imageRendering:"pixelated" }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#e8eaf6" }}>{cat.name}</span>
                    <span style={{ fontSize:7, fontWeight:700, color:RARITY_COLOR[cat.rarity],
                      letterSpacing:"0.10em", textTransform:"uppercase" }}>{cat.rarity}</span>
                  </div>
                  {selectedRole && (
                    <div style={{ fontSize:9, color:"#00c49a", fontWeight:700, fontFamily:"var(--mono)" }}>
                      {ROLE_STAT[selectedRole]}: {cat.stats[ROLE_STAT[selectedRole]]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Heist animation ───────────────────────────────────────────────────────────
function HeistAnimation({ events, onDone }: { events: HeistEvent[]; onDone: () => void }) {
  const [step, setStep] = useState(-1);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setStep(0), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (step < 0) return;
    if (step >= events.length) { setTimeout(onDone, 800); return; }
    const delay = step === 0 ? 0 : 900;
    const t = setTimeout(() => setStep(s => s + 1), delay);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    const id = setInterval(() => setDots(d => d.length < 3 ? d+"." : ""), 400);
    return () => clearInterval(id);
  }, []);

  const EVENT_ICON: Record<string, string> = {
    approach:"🚶", entry:"🔓", vault:"💰", escape:"🚗", alarm:"🚨", caught:"🚔", success:"✅"
  };

  return (
    <div style={{ padding:"32px 0", display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
      {/* Animated vault building */}
      <div style={{ width:120, height:160, position:"relative", marginBottom:32 }}>
        <div style={{ position:"absolute", inset:0, background:"#0d1530",
          border:"2px solid #1a2240" }} />
        {/* Windows */}
        {[[20,30],[20,60],[20,90],[70,30],[70,60],[70,90]].map(([x,y],i) => (
          <div key={i} style={{ position:"absolute", left:x, bottom:y, width:12, height:16,
            background: step > 1 ? "#ff4444" : "#ffd700",
            opacity: step > 2 ? 1 : 0.4 + (step * 0.2),
            boxShadow: step > 1 ? "0 0 12px #ff4444" : "0 0 8px #ffd700",
            transition:"all 0.5s" }} />
        ))}
        {/* Vault door */}
        <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:30, height:40, background:"#1a2240",
          border: step > 2 ? "2px solid #00ff87" : "2px solid #2a3458",
          transition:"border-color 0.5s",
          boxShadow: step > 2 ? "0 0 20px #00ff8780" : "none" }} />
        {/* Alarm flash */}
        {step > 1 && events[step-1]?.type === "alarm" && (
          <div style={{ position:"absolute", inset:0, background:"rgba(255,68,68,0.15)",
            animation:"pulse 0.3s ease-in-out infinite" }} />
        )}
      </div>

      {/* Events log */}
      <div style={{ width:"100%", maxWidth:400 }}>
        {events.slice(0, step + 1).map((ev, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"flex-start", gap:12, padding:"10px 14px", marginBottom:6,
            background: ev.success ? "rgba(0,255,135,0.05)" : "rgba(255,68,68,0.05)",
            border: `1px solid ${ev.success ? "rgba(0,255,135,0.2)" : "rgba(255,68,68,0.2)"}`,
            animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both",
          }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{EVENT_ICON[ev.type] ?? "🐱"}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:600, color: ev.success ? "#e8eaf6" : "#ff8888",
                marginBottom: ev.roll ? 4 : 0 }}>{ev.text}</div>
              {ev.roll !== undefined && (
                <div style={{ fontSize:9, color:"#5a6890", fontFamily:"var(--mono)", fontWeight:700 }}>
                  Roll: <span style={{ color: ev.success ? "#00ff87" : "#ff4444" }}>{ev.roll}</span>
                  {" "}· Needed: {ev.needed}
                  {" · "}<span style={{ color: ev.success ? "#00ff87" : "#ff4444" }}>
                    {ev.success ? "SUCCESS" : "FAILED"}
                  </span>
                </div>
              )}
            </div>
            <div style={{ fontSize:11, flexShrink:0 }}>{ev.success ? "✓" : "✗"}</div>
          </div>
        ))}
        {step < events.length && (
          <div style={{ padding:"10px 14px", border:"1px solid #1a2240",
            fontSize:10, color:"#5a6890", fontWeight:700, fontFamily:"var(--mono)" }}>
            {dots || "Processing"}{dots}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Results screen ────────────────────────────────────────────────────────────
function ResultsScreen({ result, vaultName }: { result: HeistResult; vaultName: string }) {
  const isClean   = result.outcome === "clean";
  const isPartial = result.outcome === "partial";
  const isCaught  = result.outcome === "caught";

  const headerBg    = isClean ? "linear-gradient(135deg, #003320, #005530)" :
                      isPartial ? "linear-gradient(135deg, #332200, #553300)" :
                      "linear-gradient(135deg, #330000, #550000)";
  const borderColor = isClean ? "#00ff87" : isPartial ? "#ffd700" : "#ff4444";
  const icon        = isClean ? "💰" : isPartial ? "⚡" : "🚔";
  const title       = isClean ? "CLEAN GETAWAY" : isPartial ? "PARTIAL SCORE" : "BUSTED";

  const [coins, setCoins] = useState<{id:number;x:number;y:number}[]>([]);
  useEffect(() => {
    if (isClean) {
      setCoins(Array.from({length:12}, (_,i) => ({ id:i, x:20+Math.random()*60, y:20+Math.random()*60 })));
    }
  }, []);

  return (
    <div style={{ animation:"slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
      {/* Header */}
      <div style={{ background:headerBg, border:`2px solid ${borderColor}`,
        padding:"28px 28px 24px", marginBottom:20, position:"relative", overflow:"hidden",
        boxShadow:`0 0 40px ${borderColor}30` }}>
        {/* Coin particles */}
        {coins.map(c => (
          <div key={c.id} style={{ position:"absolute", left:`${c.x}%`, top:`${c.y}%`,
            fontSize:16, animation:`coinfly ${0.6+Math.random()*0.8}s ease-out ${Math.random()*0.4}s both` }}>
            🪙
          </div>
        ))}
        <div style={{ fontSize:36, marginBottom:10 }}>{icon}</div>
        <div style={{ fontSize:26, fontWeight:900, color:"#e8eaf6", letterSpacing:"-0.01em",
          fontFamily:"var(--mono)", marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:11, color:"rgba(232,234,246,0.6)", fontWeight:600 }}>
          {vaultName} vault — {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1,
        background:"#1a2240", marginBottom:16 }}>
        <div style={{ background:"#0a0e1a", padding:"16px 18px" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#ffd700", fontFamily:"var(--mono)", marginBottom:3 }}>
            +{result.loot.toLocaleString()}
          </div>
          <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>
            $BITCAT EARNED
          </div>
        </div>
        <div style={{ background:"#0a0e1a", padding:"16px 18px" }}>
          <div style={{ fontSize:22, fontWeight:800, color:"#00c49a", fontFamily:"var(--mono)", marginBottom:3 }}>
            +{result.xp}
          </div>
          <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>
            XP GAINED
          </div>
        </div>
        <div style={{ background:"#0a0e1a", padding:"16px 18px" }}>
          <div style={{ fontSize:22, fontWeight:800,
            color: isClean ? "#00ff87" : isPartial ? "#ffaa00" : "#ff4444",
            fontFamily:"var(--mono)", marginBottom:3 }}>
            {isClean ? "0" : result.jailedCats.length}
          </div>
          <div style={{ fontSize:8, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>
            CATS JAILED
          </div>
        </div>
      </div>

      {/* Status messages */}
      {result.injuredCat && (
        <div style={{ padding:"12px 14px", background:"rgba(255,170,0,0.08)",
          border:"1px solid rgba(255,170,0,0.25)", marginBottom:10,
          fontSize:10, color:"#ffaa00", fontWeight:600 }}>
          ⚠️ Cat #{result.injuredCat} was injured during escape. 12h recovery.
        </div>
      )}
      {result.jailedCats.length > 0 && (
        <div style={{ padding:"12px 14px", background:"rgba(255,68,68,0.08)",
          border:"1px solid rgba(255,68,68,0.25)", marginBottom:10,
          fontSize:10, color:"#ff6666", fontWeight:600 }}>
          🚔 Cat{result.jailedCats.length > 1 ? "s" : ""} #{result.jailedCats.join(", #")} jailed for 24h.
          Pay $BITCAT to release early.
        </div>
      )}
      {isClean && (
        <div style={{ padding:"12px 14px", background:"rgba(0,255,135,0.05)",
          border:"1px solid rgba(0,255,135,0.2)", marginBottom:10,
          fontSize:10, color:"#00ff87", fontWeight:600 }}>
          ✅ Perfect run. No traces left. Your reputation grows.
        </div>
      )}

      {/* Actions */}
      <div style={{ display:"flex", gap:10, marginTop:20 }}>
        <Link href="/" style={{ flex:1, padding:"14px", background:"rgba(0,255,135,0.1)",
          border:"1px solid rgba(0,255,135,0.3)", color:"#00ff87", textAlign:"center",
          fontWeight:700, fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase",
          textDecoration:"none", display:"block" }}>
          🏙 BACK TO CITY
        </Link>
        <Link href="/heist" style={{ flex:1, padding:"14px", background:"#ffd700",
          border:"none", color:"#000", textAlign:"center", fontWeight:800,
          fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", textDecoration:"none", display:"block" }}>
          🐱 PLAN NEXT HEIST
        </Link>
      </div>
    </div>
  );
}

// ── Main heist page ───────────────────────────────────────────────────────────
function HeistPageInner() {
  const params  = useSearchParams();
  const router  = useRouter();
  const vaultName    = params.get("vault")    ?? "Unknown Vault";
  const vaultTier    = Number(params.get("tier"))    || 2;
  const vaultDefense = Number(params.get("defense")) || 40;
  const vaultBalance = Number(params.get("balance")) || 10000;

  const [phase, setPhase]   = useState<"assemble"|"briefing"|"animating"|"results">("assemble");
  const [crew,  setCrew]    = useState<Partial<Record<CrewRole,Cat>>>({});
  const [result, setResult] = useState<HeistResult | null>(null);

  function assignCat(role: CrewRole, cat: Cat) {
    setCrew(prev => ({ ...prev, [role]: { ...cat, role } }));
  }
  function removeCat(role: CrewRole) {
    setCrew(prev => { const next = { ...prev }; delete next[role]; return next; });
  }

  function startHeist() {
    const crewCats = Object.values(crew).filter(Boolean) as Cat[];
    if (!crewCats.length) return;
    const vault = { ownerId:"target", ownerName:vaultName, balance:vaultBalance,
      tier:vaultTier as 1|2|3|4|5, defense:vaultDefense, guardCats:0 };
    const r = runHeist(crewCats, vault);
    setResult(r);
    setPhase("animating");
  }

  const crewCount = Object.values(crew).filter(Boolean).length;

  return (
    <div style={{ minHeight:"100vh", background:"#050810", color:"#e8eaf6",
      fontFamily:"var(--font)", display:"flex", flexDirection:"column" }}>

      {/* Nav */}
      <nav style={{ borderBottom:"1px solid #1a2240", background:"rgba(5,8,16,0.98)",
        padding:"0 24px", display:"flex", alignItems:"center",
        justifyContent:"space-between", height:56, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Link href="/" style={{ fontSize:9, color:"#5a6890", fontWeight:700, textDecoration:"none",
            letterSpacing:"0.12em", textTransform:"uppercase" }}>
            ← City
          </Link>
          <div style={{ color:"#1a2240", fontSize:14 }}>›</div>
          <span style={{ fontSize:9, color:"#00ff87", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase" }}>
            Heist
          </span>
        </div>
        <div style={{ fontSize:14, fontWeight:900, letterSpacing:"0.04em", color:"#e8eaf6",
          fontFamily:"var(--mono)", textTransform:"uppercase" }}>
          CAT<span style={{ color:"#00ff87" }}>HEIST</span>
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:"#ffd700", fontFamily:"var(--mono)" }}>
          TARGET: {vaultName}
        </div>
      </nav>

      {/* Phase progress */}
      {phase !== "results" && (
        <div style={{ display:"flex", background:"#0a0e1a", borderBottom:"1px solid #1a2240" }}>
          {(["assemble","briefing","animating"] as const).map((p, i) => (
            <div key={p} style={{ flex:1, padding:"10px 0", textAlign:"center",
              borderRight: i < 2 ? "1px solid #1a2240" : "none",
              background: phase === p ? "rgba(0,255,135,0.05)" : "transparent" }}>
              <div style={{ fontSize:8, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
                color: phase === p ? "#00ff87" : i < ["assemble","briefing","animating"].indexOf(phase) ? "#00c49a" : "#5a6890" }}>
                {i+1}. {p === "assemble" ? "Assemble Crew" : p === "briefing" ? "Briefing" : "Execute"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, padding:24, overflowY:"auto", maxWidth:760, margin:"0 auto", width:"100%" }}>

        {phase === "assemble" && (
          <div style={{ animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.16em",
                textTransform:"uppercase", marginBottom:6 }}>Target: {vaultName}</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#e8eaf6" }}>Assemble Your Crew</h2>
            </div>
            <CrewAssembly cats={DEMO_CATS} crew={crew} onAssign={assignCat} onRemove={removeCat} />
            <div style={{ marginTop:24, display:"flex", gap:10, alignItems:"center" }}>
              <div style={{ flex:1, fontSize:10, color:"#5a6890", fontWeight:600 }}>
                {crewCount === 0 ? "Assign at least 1 cat to continue" :
                 `${crewCount} cat${crewCount>1?"s":""} assigned — more cats = better odds`}
              </div>
              <button onClick={() => setPhase("briefing")} disabled={crewCount === 0}
                style={{ padding:"14px 28px", background: crewCount > 0 ? "#00ff87" : "#1a2240",
                  color: crewCount > 0 ? "#000" : "#5a6890", border:"none",
                  fontWeight:800, fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase",
                  cursor: crewCount > 0 ? "pointer" : "not-allowed", fontFamily:"var(--font)",
                  transition:"all 0.15s", boxShadow: crewCount > 0 ? "0 0 20px #00ff8750" : "none" }}>
                CONFIRM CREW →
              </button>
            </div>
          </div>
        )}

        {phase === "briefing" && (
          <div style={{ animation:"slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both", maxWidth:480, margin:"0 auto" }}>
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:9, color:"#00ff87", fontWeight:700, letterSpacing:"0.16em",
                textTransform:"uppercase", marginBottom:6 }}>Pre-Heist Briefing</div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#e8eaf6", marginBottom:4 }}>Ready to Execute</h2>
              <p style={{ fontSize:11, color:"#5a6890", lineHeight:1.6 }}>
                Your crew is assembled. Review the plan before going in.
              </p>
            </div>

            {/* Target summary */}
            <div style={{ background:"#0a0e1a", border:"1px solid #1a2240", padding:"16px 18px", marginBottom:16 }}>
              <div style={{ fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", marginBottom:10 }}>Target</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:11, color:"#e8eaf6", fontWeight:600 }}>{vaultName}</span>
                <span style={{ fontSize:11, color:"#ffd700", fontWeight:700, fontFamily:"var(--mono)" }}>
                  {vaultBalance.toLocaleString()} $BITCAT
                </span>
              </div>
              <div style={{ height:3, background:"#1a2240", marginBottom:4, borderRadius:2 }}>
                <div style={{ height:"100%", width:`${vaultDefense}%`, borderRadius:2,
                  background: vaultDefense>70?"#ff4444":vaultDefense>40?"#ffaa00":"#00ff87" }} />
              </div>
              <div style={{ fontSize:8, color:"#5a6890", fontWeight:700 }}>
                Defense: {vaultDefense}/100 · Tier {vaultTier}
              </div>
            </div>

            {/* Crew summary */}
            <div style={{ background:"#0a0e1a", border:"1px solid #1a2240", padding:"16px 18px", marginBottom:24 }}>
              <div style={{ fontSize:9, color:"#5a6890", fontWeight:700, letterSpacing:"0.12em",
                textTransform:"uppercase", marginBottom:10 }}>Your Crew</div>
              {(Object.entries(crew) as [CrewRole, Cat][]).map(([role, cat]) => (
                <div key={role} style={{ display:"flex", alignItems:"center", gap:10,
                  padding:"6px 0", borderBottom:"1px solid #1a2240" }}>
                  <span style={{ fontSize:16 }}>{ROLE_ICON[role]}</span>
                  <span style={{ fontSize:9, color:"#5a6890", fontWeight:700, width:80,
                    textTransform:"uppercase", letterSpacing:"0.08em" }}>{ROLE_LABEL[role]}</span>
                  <span style={{ flex:1, fontSize:11, fontWeight:700, color:RARITY_COLOR[cat.rarity] }}>{cat.name}</span>
                  <span style={{ fontSize:9, color:"#00c49a", fontFamily:"var(--mono)", fontWeight:700 }}>
                    {ROLE_STAT[role]}: {cat.stats[ROLE_STAT[role]]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setPhase("assemble")}
                style={{ padding:"12px 20px", background:"transparent", border:"1px solid #1a2240",
                  color:"#5a6890", fontWeight:700, fontSize:10, letterSpacing:"0.12em",
                  textTransform:"uppercase", cursor:"pointer", fontFamily:"var(--font)" }}>
                ← EDIT CREW
              </button>
              <button onClick={startHeist}
                style={{ flex:1, padding:"16px", background:"#ffd700", border:"none",
                  color:"#000", fontWeight:900, fontSize:13, letterSpacing:"0.12em",
                  textTransform:"uppercase", cursor:"pointer", fontFamily:"var(--font)",
                  boxShadow:"0 0 30px rgba(255,215,0,0.4)" }}>
                🐱 EXECUTE HEIST
              </button>
            </div>
          </div>
        )}

        {phase === "animating" && result && (
          <div style={{ maxWidth:480, margin:"0 auto" }}>
            <div style={{ marginBottom:20, textAlign:"center" }}>
              <div style={{ fontSize:9, color:"#ff4444", fontWeight:700, letterSpacing:"0.16em",
                textTransform:"uppercase", marginBottom:6, animation:"pulse 1s ease-in-out infinite" }}>
                ● HEIST IN PROGRESS
              </div>
              <h2 style={{ fontSize:20, fontWeight:800, color:"#e8eaf6" }}>Executing Plan…</h2>
            </div>
            <HeistAnimation events={result.events} onDone={() => setPhase("results")} />
          </div>
        )}

        {phase === "results" && result && (
          <div style={{ maxWidth:480, margin:"0 auto" }}>
            <ResultsScreen result={result} vaultName={vaultName} />
          </div>
        )}

      </div>
    </div>
  );
}

export default function HeistPage() {
  return <Suspense><HeistPageInner /></Suspense>;
}
