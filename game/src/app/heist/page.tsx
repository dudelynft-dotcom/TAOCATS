"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { DEMO_CATS } from "@/lib/mockData";
import type { Cat, CrewRole, Rarity } from "@/lib/types";
import { ROLE_LABEL, ROLE_ICON, ROLE_STAT } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────
const TOTAL_FLOORS = 9; // floors 0..8, rooftop = 8

const RARITY_COLOR: Record<string, string> = {
  Legendary: "#a855f7", Epic: "#4488ff", Rare: "#00c49a", Uncommon: "#ffaa00", Common: "#8899aa",
};

// Max floors per jump by rarity (+ random 0 or 1 bonus)
const JUMP_POWER: Record<Rarity, number> = {
  Legendary: 4, Epic: 3, Rare: 2, Uncommon: 2, Common: 1,
};

// $BITCAT per floor window looted
const FLOOR_LOOT: Record<Rarity, number> = {
  Legendary: 280, Epic: 190, Rare: 130, Uncommon: 80, Common: 45,
};

// ── Building component ────────────────────────────────────────────────────────
const FLOOR_H = 64; // px per floor
const BUILDING_W = 240;
const FLOORS = Array.from({ length: TOTAL_FLOORS }, (_, i) => i); // 0 = ground

// Window positions per floor (left, right)
function FloorWindows({ floor, looted, neon }: { floor: number; looted: boolean; neon: string }) {
  return (
    <>
      {[36, 160].map((x, wi) => (
        <div key={wi} style={{
          position: "absolute", left: x, top: 14, width: 28, height: 32,
          background: looted ? "rgba(0,0,0,0.6)" : neon,
          border: `2px solid ${looted ? "#1a2240" : neon}`,
          boxShadow: looted ? "none" : `0 0 12px ${neon}, inset 0 0 8px ${neon}40`,
          transition: "all 0.4s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {looted
            ? <span style={{ fontSize: 10, opacity: 0.3 }}>✗</span>
            : <span style={{ fontSize: 9, fontWeight: 700, color: "#000", fontFamily: "var(--mono)" }}>$</span>
          }
        </div>
      ))}
    </>
  );
}

function Building({
  playerFloor, opponentFloor,
  playerCat, opponentCat,
  lootedByPlayer, lootedByOpponent,
  playerJumping, opponentJumping,
  vaultName,
}: {
  playerFloor: number; opponentFloor: number;
  playerCat: Cat; opponentCat: Cat;
  lootedByPlayer: Set<number>; lootedByOpponent: Set<number>;
  playerJumping: boolean; opponentJumping: boolean;
  vaultName: string;
}) {
  const totalH = TOTAL_FLOORS * FLOOR_H + 60; // +60 for rooftop

  // Floor neon colors cycling
  const FLOOR_NEONS = ["#ffd700","#4488ff","#ff4444","#00ff87","#a855f7","#ffaa00","#4488ff","#00c49a","#ffd700"];

  return (
    <div style={{ position: "relative", width: BUILDING_W, height: totalH, flexShrink: 0 }}>

      {/* ── Rooftop ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 60,
        background: "linear-gradient(180deg, #0a0e1a 0%, #111830 100%)",
        border: "2px solid #ffd700",
        borderBottom: "none",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3,
        zIndex: 10,
      }}>
        <div style={{ fontSize: 18 }}>🏆</div>
        <div style={{ fontSize: 7, fontWeight: 700, color: "#ffd700", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          TERRACE
        </div>
        <div style={{ fontSize: 8, color: "#5a6890", fontWeight: 700, fontFamily: "var(--mono)" }}>{vaultName}</div>
        {/* Antenna */}
        <div style={{ position: "absolute", top: -24, left: "50%", transform: "translateX(-50%)", width: 2, height: 24, background: "#ffd700" }}>
          <div style={{ position: "absolute", top: 0, left: -6, width: 14, height: 2, background: "#ffd700" }} />
          <div style={{ position: "absolute", top: -1, left: -1, width: 4, height: 4, borderRadius: "50%",
            background: "#ffd700", boxShadow: "0 0 8px #ffd700", animation: "pulse 1s ease-in-out infinite" }} />
        </div>
      </div>

      {/* ── Floors ── */}
      {FLOORS.map((fl) => {
        const top = 60 + (TOTAL_FLOORS - 1 - fl) * FLOOR_H;
        const neon = FLOOR_NEONS[fl % FLOOR_NEONS.length];
        const looterP = lootedByPlayer.has(fl);
        const looterO = lootedByOpponent.has(fl);
        const isGround = fl === 0;
        return (
          <div key={fl} style={{
            position: "absolute", left: 0, right: 0, top, height: FLOOR_H,
            background: isGround
              ? "linear-gradient(180deg, #0a1020, #070c18)"
              : fl % 2 === 0 ? "#0d1428" : "#0a1020",
            borderLeft: "2px solid #1a2240",
            borderRight: "2px solid #1a2240",
            borderBottom: "2px solid #1a2240",
            overflow: "hidden",
          }}>
            {/* Floor number */}
            <div style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)",
              fontSize: 8, color: "#1a2240", fontWeight: 700, fontFamily: "var(--mono)" }}>
              {isGround ? "G" : fl}
            </div>
            {/* Brick texture lines */}
            {[0, 1, 2].map(r => (
              <div key={r} style={{ position: "absolute", top: 10 + r * 18, left: 16, right: 16,
                height: 1, background: "rgba(26,34,64,0.5)" }} />
            ))}
            {/* Windows */}
            {!isGround && <FloorWindows floor={fl} looted={looterP || looterO} neon={neon} />}
            {/* Ground floor door */}
            {isGround && (
              <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                width: 32, height: 44, background: "#070c18",
                border: "2px solid #1a2240", borderBottom: "none" }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                  width: 6, height: 6, borderRadius: "50%", background: "#ffd700",
                  boxShadow: "0 0 8px #ffd700" }} />
              </div>
            )}
            {/* Loot indicator */}
            {(looterP || looterO) && !isGround && (
              <div style={{ position: "absolute", top: 4, right: 6,
                fontSize: 9, color: "#ffd700", fontWeight: 700, fontFamily: "var(--mono)" }}>
                +$
              </div>
            )}
          </div>
        );
      })}

      {/* ── Player cat (left side) ── */}
      <CatSprite
        floor={playerFloor}
        totalFloors={TOTAL_FLOORS}
        floorH={FLOOR_H}
        rooftopH={60}
        color={RARITY_COLOR[playerCat.rarity]}
        jumping={playerJumping}
        side="left"
        name={playerCat.name}
        rarity={playerCat.rarity}
        isPlayer={true}
      />

      {/* ── Opponent cat (right side) ── */}
      <CatSprite
        floor={opponentFloor}
        totalFloors={TOTAL_FLOORS}
        floorH={FLOOR_H}
        rooftopH={60}
        color={RARITY_COLOR[opponentCat.rarity]}
        jumping={opponentJumping}
        side="right"
        name={opponentCat.name}
        rarity={opponentCat.rarity}
        isPlayer={false}
      />

    </div>
  );
}

// ── Cat sprite ────────────────────────────────────────────────────────────────
function CatSprite({ floor, totalFloors, floorH, rooftopH, color, jumping, side, name, rarity, isPlayer }:
  { floor: number; totalFloors: number; floorH: number; rooftopH: number; color: string;
    jumping: boolean; side: "left"|"right"; name: string; rarity: Rarity; isPlayer: boolean }) {

  const bottom = rooftopH + floor * floorH + 4;
  const left = side === "left" ? 4 : BUILDING_W - 32;

  // Pixel cat SVG — different expression per rarity
  const eyeColor = rarity === "Legendary" ? "#ffd700" : rarity === "Epic" ? "#4488ff" : "#fff";

  return (
    <div style={{
      position: "absolute",
      bottom,
      left,
      width: 28,
      height: 36,
      transition: jumping ? "bottom 0.35s cubic-bezier(0.34,1.56,0.64,1)" : "bottom 0.35s cubic-bezier(0.34,1.56,0.64,1)",
      zIndex: 20,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    }}>
      {/* Name tag */}
      <div style={{
        fontSize: 7, fontWeight: 700, color, letterSpacing: "0.06em",
        background: "rgba(5,8,16,0.9)", padding: "1px 4px",
        border: `1px solid ${color}40`, whiteSpace: "nowrap",
        position: "absolute", top: -14,
        [side === "left" ? "left" : "right"]: 0,
      }}>
        {isPlayer ? "YOU" : "OPP"}
      </div>

      {/* Cat pixel art */}
      <svg width="28" height="32" viewBox="0 0 14 16" shapeRendering="crispEdges"
        style={{ animation: jumping ? "float 0.3s ease-in-out" : "none" }}>
        {/* Ears */}
        <rect x="1" y="0" width="2" height="2" fill={color} />
        <rect x="11" y="0" width="2" height="2" fill={color} />
        {/* Head */}
        <rect x="1" y="1" width="12" height="8" fill={color} />
        {/* Eyes */}
        <rect x="3" y="3" width="2" height="2" fill={eyeColor} />
        <rect x="9" y="3" width="2" height="2" fill={eyeColor} />
        {/* Nose */}
        <rect x="6" y="5" width="2" height="1" fill="#ff88aa" />
        {/* Mouth */}
        <rect x="5" y="6" width="1" height="1" fill="#cc4466" />
        <rect x="8" y="6" width="1" height="1" fill="#cc4466" />
        {/* Body */}
        <rect x="2" y="9" width="10" height="7" fill={color} />
        {/* Arms */}
        <rect x="0" y="10" width="2" height="4" fill={color} />
        <rect x="12" y="10" width="2" height="4" fill={color} />
        {/* Legs */}
        <rect x="3" y="14" width="3" height="2" fill={color} />
        <rect x="8" y="14" width="3" height="2" fill={color} />
        {/* Tail */}
        <rect x="12" y="12" width="2" height="1" fill={color} />
        <rect x="13" y="11" width="1" height="2" fill={color} />
        {/* Shine on legendary */}
        {rarity === "Legendary" && <rect x="4" y="3" width="1" height="1" fill="#ffffff80" />}
      </svg>

      {/* Jump indicator */}
      {jumping && (
        <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
          fontSize: 10, animation: "coinfly 0.4s ease-out both" }}>✨</div>
      )}
    </div>
  );
}

// ── Crew Assignment (simplified — pick 1 cat) ──────────────────────────────────
function CatPicker({ cats, selected, onSelect }: { cats: Cat[]; selected: Cat | null; onSelect: (c: Cat) => void }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: "#5a6890", fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", marginBottom: 12 }}>Choose Your Cat</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cats.map(cat => {
          const isSelected = selected?.id === cat.id;
          const color = RARITY_COLOR[cat.rarity];
          return (
            <div key={cat.id} onClick={() => onSelect(cat)}
              style={{
                padding: "12px 14px", cursor: "pointer",
                background: isSelected ? `${color}15` : "#0a0e1a",
                border: isSelected ? `1px solid ${color}` : "1px solid #1a2240",
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.15s",
                boxShadow: isSelected ? `0 0 20px ${color}20` : "none",
              }}>
              <div style={{ width: 44, height: 44, background: "#050810", flexShrink: 0,
                border: `1px solid ${color}40`, overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={cat.image} alt={cat.name}
                  style={{ width: 40, height: 40, imageRendering: "pixelated" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e8eaf6" }}>{cat.name}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, color, letterSpacing: "0.10em",
                    textTransform: "uppercase", padding: "1px 7px", border: `1px solid ${color}40`,
                    background: `${color}10` }}>{cat.rarity}</span>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 9, color: "#5a6890", fontWeight: 700 }}>
                    Jump: <span style={{ color }}>{JUMP_POWER[cat.rarity]} floors</span>
                  </span>
                  <span style={{ fontSize: 9, color: "#5a6890", fontWeight: 700 }}>
                    Loot: <span style={{ color: "#ffd700" }}>{FLOOR_LOOT[cat.rarity]} / floor</span>
                  </span>
                </div>
              </div>
              {isSelected && (
                <div style={{ fontSize: 18, color }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Race game ─────────────────────────────────────────────────────────────────
function BuildingRace({ playerCat, opponentCat, vaultName, vaultBalance, onFinish }:
  { playerCat: Cat; opponentCat: Cat; vaultName: string; vaultBalance: number;
    onFinish: (won: boolean, loot: number) => void }) {

  const [playerFloor,   setPlayerFloor]   = useState(0);
  const [opponentFloor, setOpponentFloor] = useState(0);
  const [playerJumping,   setPlayerJumping]   = useState(false);
  const [opponentJumping, setOpponentJumping] = useState(false);
  const [lootedByPlayer,   setLootedByPlayer]   = useState<Set<number>>(new Set());
  const [lootedByOpponent, setLootedByOpponent] = useState<Set<number>>(new Set());
  const [playerLoot,   setPlayerLoot]   = useState(0);
  const [opponentLoot, setOpponentLoot] = useState(0);
  const [finished, setFinished] = useState(false);
  const [jumpCount, setJumpCount] = useState(0);
  const [message, setMessage] = useState("JUMP to start climbing!");

  const playerFloorRef   = useRef(0);
  const opponentFloorRef = useRef(0);
  const finishedRef      = useRef(false);
  const playerLootRef    = useRef(0);

  function calcJump(rarity: Rarity): number {
    const base = JUMP_POWER[rarity];
    const bonus = Math.random() < 0.4 ? 1 : 0;
    return Math.min(base + bonus, TOTAL_FLOORS - 1);
  }

  function doOpponentJump() {
    if (finishedRef.current) return;
    const jumpFloors = calcJump(opponentCat.rarity);
    const newFloor   = Math.min(opponentFloorRef.current + jumpFloors, TOTAL_FLOORS - 1);
    opponentFloorRef.current = newFloor;
    setOpponentFloor(newFloor);
    setOpponentJumping(true);
    setTimeout(() => setOpponentJumping(false), 400);

    // Loot floors passed
    setLootedByOpponent(prev => {
      const next = new Set(prev);
      for (let f = opponentFloorRef.current - jumpFloors + 1; f <= newFloor; f++) {
        if (f > 0) next.add(f);
      }
      return next;
    });

    if (newFloor >= TOTAL_FLOORS - 1 && !finishedRef.current) {
      finishedRef.current = true;
      setFinished(true);
      setTimeout(() => onFinish(false, playerLootRef.current), 600);
    }
  }

  function handleJump() {
    if (finished || finishedRef.current) return;

    const jumpFloors = calcJump(playerCat.rarity);
    const newFloor   = Math.min(playerFloorRef.current + jumpFloors, TOTAL_FLOORS - 1);

    // Loot floors passed
    let earned = 0;
    setLootedByPlayer(prev => {
      const next = new Set(prev);
      for (let f = playerFloorRef.current + 1; f <= newFloor; f++) {
        if (!next.has(f) && f > 0) { next.add(f); earned += FLOOR_LOOT[playerCat.rarity]; }
      }
      return next;
    });

    playerFloorRef.current = newFloor;
    playerLootRef.current += earned;
    setPlayerFloor(newFloor);
    setPlayerLoot(prev => prev + earned);
    setPlayerJumping(true);
    setJumpCount(c => c + 1);

    // Message
    const msgs = ["Smooth moves!", "Going up!", "Cat burgling…", "Nice jump!", "Floor cleared!"];
    if (earned > 0) setMessage(`+${earned} $BITCAT from floor ${newFloor}!`);
    else setMessage(msgs[Math.floor(Math.random() * msgs.length)]);

    setTimeout(() => setPlayerJumping(false), 400);

    // Check win
    if (newFloor >= TOTAL_FLOORS - 1) {
      finishedRef.current = true;
      setFinished(true);
      setTimeout(() => onFinish(true, playerLootRef.current + Math.round(vaultBalance * 0.12)), 600);
      return;
    }

    // Opponent jumps with slight delay
    const oppDelay = 200 + Math.random() * 300;
    setTimeout(doOpponentJump, oppDelay);
  }

  // Scroll building to follow player
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      const targetScroll = Math.max(0, (TOTAL_FLOORS - playerFloor - 3) * FLOOR_H);
      scrollRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [playerFloor]);

  const playerProgress   = Math.round((playerFloor / (TOTAL_FLOORS - 1)) * 100);
  const opponentProgress = Math.round((opponentFloor / (TOTAL_FLOORS - 1)) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

      {/* HUD */}
      <div style={{ background: "#050810", borderBottom: "1px solid #1a2240",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        {/* Player */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: RARITY_COLOR[playerCat.rarity],
              letterSpacing: "0.10em", textTransform: "uppercase" }}>YOU · {playerCat.name}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#ffd700", fontFamily: "var(--mono)" }}>
              +{playerLoot.toLocaleString()} $BITCAT
            </span>
          </div>
          <div style={{ height: 6, background: "#1a2240", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${playerProgress}%`, borderRadius: 3,
              background: RARITY_COLOR[playerCat.rarity],
              boxShadow: `0 0 8px ${RARITY_COLOR[playerCat.rarity]}`,
              transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 8, color: "#5a6890", marginTop: 3, fontFamily: "var(--mono)" }}>
            Floor {playerFloor} / {TOTAL_FLOORS - 1}
          </div>
        </div>

        {/* VS */}
        <div style={{ fontSize: 11, fontWeight: 900, color: "#1a2240", flexShrink: 0 }}>VS</div>

        {/* Opponent */}
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: RARITY_COLOR[opponentCat.rarity],
              letterSpacing: "0.10em", textTransform: "uppercase" }}>OPP · {opponentCat.name}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#5a6890", fontFamily: "var(--mono)" }}>
              +{opponentLoot.toLocaleString()} $BITCAT
            </span>
          </div>
          <div style={{ height: 6, background: "#1a2240", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${opponentProgress}%`, borderRadius: 3,
              background: RARITY_COLOR[opponentCat.rarity],
              boxShadow: `0 0 8px ${RARITY_COLOR[opponentCat.rarity]}`,
              transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 8, color: "#5a6890", marginTop: 3, fontFamily: "var(--mono)", textAlign: "right" }}>
            Floor {opponentFloor} / {TOTAL_FLOORS - 1}
          </div>
        </div>
      </div>

      {/* Main race area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: 0 }}>

        {/* Building scroll area */}
        <div ref={scrollRef} style={{ flex: 1, overflow: "hidden", display: "flex",
          alignItems: "flex-start", justifyContent: "center", paddingTop: 40, paddingBottom: 20,
          background: "linear-gradient(180deg, #010308, #050d18 50%, #020508)" }}>
          {/* Night sky + moon */}
          <div style={{ position: "absolute", top: 80, right: "calc(50% + 160px)",
            width: 32, height: 32, borderRadius: "50%",
            background: "radial-gradient(circle at 40% 40%, #fffde7, #ffd700)",
            boxShadow: "0 0 20px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.1)" }} />
          {/* Stars */}
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              top: 60 + (i * 17 % 200),
              left: i % 2 === 0
                ? `calc(50% - ${140 + (i * 23 % 120)}px)`
                : `calc(50% + ${140 + (i * 19 % 120)}px)`,
              width: i % 4 === 0 ? 2 : 1, height: i % 4 === 0 ? 2 : 1,
              borderRadius: "50%", background: "#fff",
              opacity: 0.15 + (i % 3) * 0.15,
              animation: `pulse ${1.5 + i % 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}

          <Building
            playerFloor={playerFloor}
            opponentFloor={opponentFloor}
            playerCat={playerCat}
            opponentCat={opponentCat}
            lootedByPlayer={lootedByPlayer}
            lootedByOpponent={lootedByOpponent}
            playerJumping={playerJumping}
            opponentJumping={opponentJumping}
            vaultName={vaultName}
          />
        </div>

        {/* Side panel */}
        <div style={{ width: 180, background: "#050810", borderLeft: "1px solid #1a2240",
          display: "flex", flexDirection: "column", padding: "16px 14px", gap: 16, flexShrink: 0 }}>

          {/* Jump button */}
          <button onClick={handleJump} disabled={finished}
            style={{
              width: "100%", padding: "18px 0",
              background: finished ? "#1a2240" : "linear-gradient(135deg, #00ff87, #00c49a)",
              border: "none", color: finished ? "#5a6890" : "#000",
              fontWeight: 900, fontSize: 16, cursor: finished ? "not-allowed" : "pointer",
              fontFamily: "var(--font)", letterSpacing: "0.04em",
              boxShadow: finished ? "none" : "0 0 30px rgba(0,255,135,0.4), 0 4px 0 #006644",
              transform: playerJumping ? "scale(0.96)" : "scale(1)",
              transition: "all 0.1s",
            }}>
            {finished ? "DONE" : "⬆ JUMP"}
          </button>

          {/* Message */}
          <div style={{ padding: "10px 12px", background: "#0a0e1a", border: "1px solid #1a2240",
            fontSize: 10, color: "#00ff87", fontWeight: 700, lineHeight: 1.5,
            minHeight: 44, display: "flex", alignItems: "center" }}>
            {message}
          </div>

          {/* Your cat info */}
          <div style={{ background: "#0a0e1a", border: `1px solid ${RARITY_COLOR[playerCat.rarity]}30`,
            padding: "12px 12px" }}>
            <div style={{ fontSize: 8, color: "#5a6890", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", marginBottom: 8 }}>Your Cat</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: RARITY_COLOR[playerCat.rarity],
              marginBottom: 2 }}>{playerCat.name}</div>
            <div style={{ fontSize: 9, color: "#5a6890", marginBottom: 6 }}>{playerCat.rarity}</div>
            <div style={{ fontSize: 9, color: "#e8eaf6", fontWeight: 600, marginBottom: 3 }}>
              Jump: <span style={{ color: RARITY_COLOR[playerCat.rarity], fontFamily: "var(--mono)" }}>
                {JUMP_POWER[playerCat.rarity]}–{JUMP_POWER[playerCat.rarity] + 1} floors
              </span>
            </div>
            <div style={{ fontSize: 9, color: "#e8eaf6", fontWeight: 600 }}>
              Loot: <span style={{ color: "#ffd700", fontFamily: "var(--mono)" }}>
                {FLOOR_LOOT[playerCat.rarity]} / floor
              </span>
            </div>
          </div>

          {/* Jump counter */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "#e8eaf6" }}>
              {jumpCount}
            </div>
            <div style={{ fontSize: 8, color: "#5a6890", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase" }}>Jumps Used</div>
          </div>

          {/* Vault prize */}
          <div style={{ marginTop: "auto", padding: "10px 12px", background: "rgba(255,215,0,0.05)",
            border: "1px solid rgba(255,215,0,0.2)" }}>
            <div style={{ fontSize: 8, color: "#5a6890", fontWeight: 700, letterSpacing: "0.10em",
              textTransform: "uppercase", marginBottom: 4 }}>Vault Prize</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ffd700", fontFamily: "var(--mono)" }}>
              {Math.round(vaultBalance * 0.12).toLocaleString()}
            </div>
            <div style={{ fontSize: 8, color: "#ffaa00", fontWeight: 700 }}>$BITCAT if you win</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ won, loot, playerCat, vaultName }:
  { won: boolean; loot: number; playerCat: Cat; vaultName: string }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: won
        ? "radial-gradient(ellipse at 50% 30%, rgba(0,255,135,0.08) 0%, transparent 70%)"
        : "radial-gradient(ellipse at 50% 30%, rgba(255,68,68,0.08) 0%, transparent 70%)" }}>
      <div style={{ maxWidth: 420, width: "100%", margin: 24, animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>

        {/* Header */}
        <div style={{
          padding: "32px 28px 24px", marginBottom: 1,
          background: won
            ? "linear-gradient(135deg, #001a0d, #003320)"
            : "linear-gradient(135deg, #1a0000, #2d0000)",
          border: `2px solid ${won ? "#00ff87" : "#ff4444"}`,
          borderBottom: "none", textAlign: "center",
          boxShadow: `0 0 60px ${won ? "#00ff8720" : "#ff444420"}`,
        }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>{won ? "🏆" : "🚔"}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: won ? "#00ff87" : "#ff4444",
            fontFamily: "var(--mono)", letterSpacing: "0.02em", marginBottom: 6 }}>
            {won ? "HEIST SUCCESS" : "BUSTED"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,234,246,0.5)", fontWeight: 600 }}>
            {vaultName} vault · {playerCat.name}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1,
          background: "#1a2240", marginBottom: 16 }}>
          <div style={{ background: "#0a0e1a", padding: "18px 20px" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#ffd700",
              fontFamily: "var(--mono)", marginBottom: 4 }}>
              {won ? "+" : ""}{loot.toLocaleString()}
            </div>
            <div style={{ fontSize: 8, color: "#5a6890", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase" }}>$BITCAT EARNED</div>
          </div>
          <div style={{ background: "#0a0e1a", padding: "18px 20px" }}>
            <div style={{ fontSize: 26, fontWeight: 800,
              color: won ? "#00ff87" : "#ff4444",
              fontFamily: "var(--mono)", marginBottom: 4 }}>
              {won ? "WIN" : "LOSS"}
            </div>
            <div style={{ fontSize: 8, color: "#5a6890", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase" }}>RESULT</div>
          </div>
        </div>

        {won ? (
          <div style={{ padding: "12px 14px", background: "rgba(0,255,135,0.05)",
            border: "1px solid rgba(0,255,135,0.2)", marginBottom: 16,
            fontSize: 10, color: "#00ff87", lineHeight: 1.6 }}>
            ✅ {playerCat.name} reached the terrace first. Clean sweep — vault cracked.
          </div>
        ) : (
          <div style={{ padding: "12px 14px", background: "rgba(255,68,68,0.05)",
            border: "1px solid rgba(255,68,68,0.2)", marginBottom: 16,
            fontSize: 10, color: "#ff6666", lineHeight: 1.6 }}>
            🚔 The opponent reached the terrace first. {playerCat.name} escaped with partial loot.
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" style={{ flex: 1, padding: "14px", background: "rgba(0,255,135,0.08)",
            border: "1px solid rgba(0,255,135,0.25)", color: "#00ff87", textAlign: "center",
            fontWeight: 700, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            textDecoration: "none", display: "block" }}>
            🏙 CITY MAP
          </Link>
          <Link href="/heist" style={{ flex: 1, padding: "14px",
            background: won ? "#ffd700" : "#0a0e1a",
            border: won ? "none" : "1px solid #1a2240",
            color: won ? "#000" : "#e8eaf6", textAlign: "center",
            fontWeight: 800, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
            textDecoration: "none", display: "block" }}>
            🐱 HEIST AGAIN
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function HeistPageInner() {
  const params       = useSearchParams();
  const vaultName    = params.get("vault")    ?? "Iron Bank";
  const vaultTier    = Number(params.get("tier"))    || 2;
  const vaultDefense = Number(params.get("defense")) || 40;
  const vaultBalance = Number(params.get("balance")) || 10000;

  const [phase, setPhase]           = useState<"pick"|"race"|"result">("pick");
  const [playerCat, setPlayerCat]   = useState<Cat | null>(null);
  const [won,  setWon]              = useState(false);
  const [loot, setLoot]             = useState(0);

  // Random opponent cat (not the same as player)
  const [opponentCat] = useState<Cat>(() => {
    const idx = Math.floor(Math.random() * DEMO_CATS.length);
    return DEMO_CATS[idx];
  });

  function handleFinish(didWin: boolean, earnedLoot: number) {
    setWon(didWin);
    setLoot(earnedLoot);
    setPhase("result");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050810", color: "#e8eaf6",
      fontFamily: "var(--font)", display: "flex", flexDirection: "column" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #1a2240", background: "rgba(5,8,16,0.98)",
        padding: "0 24px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 52, flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ fontSize: 9, color: "#5a6890", fontWeight: 700, textDecoration: "none",
            letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ← City
          </Link>
          <span style={{ color: "#1a2240" }}>›</span>
          <span style={{ fontSize: 9, color: "#00ff87", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase" }}>Heist</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.04em",
          color: "#e8eaf6", fontFamily: "var(--mono)", textTransform: "uppercase" }}>
          CAT<span style={{ color: "#00ff87" }}>HEIST</span>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#ffd700", fontFamily: "var(--mono)" }}>
          TARGET: {vaultName}
        </div>
      </nav>

      {/* Content */}
      {phase === "pick" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 500, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div style={{ marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "#5a6890", fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase", marginBottom: 8 }}>Target: {vaultName}</div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "#e8eaf6", marginBottom: 6 }}>
                Choose Your Climber
              </h2>
              <p style={{ fontSize: 11, color: "#5a6890", lineHeight: 1.6 }}>
                Race an opponent to the rooftop. Higher rarity = bigger jumps.
                Loot each floor window on the way up.
              </p>
            </div>

            <CatPicker cats={DEMO_CATS} selected={playerCat} onSelect={setPlayerCat} />

            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <Link href="/" style={{ padding: "13px 20px", background: "transparent",
                border: "1px solid #1a2240", color: "#5a6890", fontWeight: 700, fontSize: 10,
                letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none",
                display: "block" }}>
                ← BACK
              </Link>
              <button onClick={() => playerCat && setPhase("race")} disabled={!playerCat}
                style={{ flex: 1, padding: "14px", fontFamily: "var(--font)",
                  background: playerCat ? "#00ff87" : "#1a2240",
                  border: "none", color: playerCat ? "#000" : "#5a6890",
                  fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase",
                  cursor: playerCat ? "pointer" : "not-allowed",
                  boxShadow: playerCat ? "0 0 30px rgba(0,255,135,0.35)" : "none",
                  transition: "all 0.15s" }}>
                🐱 START HEIST
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "race" && playerCat && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <BuildingRace
            playerCat={playerCat}
            opponentCat={opponentCat}
            vaultName={vaultName}
            vaultBalance={vaultBalance}
            onFinish={handleFinish}
          />
        </div>
      )}

      {phase === "result" && playerCat && (
        <ResultScreen won={won} loot={loot} playerCat={playerCat} vaultName={vaultName} />
      )}

    </div>
  );
}

export default function HeistPage() {
  return <Suspense><HeistPageInner /></Suspense>;
}
