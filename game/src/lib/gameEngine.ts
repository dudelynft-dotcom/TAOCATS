import type { Cat, CatStats, CrewRole, Vault, HeistResult, HeistEvent, HeistOutcome, Rarity } from "./types";
import { ROLE_STAT } from "./types";

// ── Rarity base stats ─────────────────────────────────────────────────────────
const RARITY_BASE: Record<Rarity, CatStats> = {
  Legendary: { stealth: 90, speed: 88, luck: 92, muscle: 85, wit: 88 },
  Epic:      { stealth: 72, speed: 70, luck: 74, muscle: 68, wit: 70 },
  Rare:      { stealth: 58, speed: 55, luck: 60, muscle: 54, wit: 56 },
  Uncommon:  { stealth: 44, speed: 42, luck: 46, muscle: 40, wit: 42 },
  Common:    { stealth: 28, speed: 26, luck: 30, muscle: 25, wit: 27 },
};

export function getCatStats(rarity: Rarity, id: number): CatStats {
  const base = RARITY_BASE[rarity];
  // Small variance per cat ID so each cat feels unique
  const v = (id % 10) - 5; // -5 to +4
  return {
    stealth: Math.min(99, base.stealth + v),
    speed:   Math.min(99, base.speed   + v),
    luck:    Math.min(99, base.luck    + Math.abs(v)),
    muscle:  Math.min(99, base.muscle  + v),
    wit:     Math.min(99, base.wit     + v),
  };
}

// ── Crew power score ──────────────────────────────────────────────────────────
export function crewPower(cats: Cat[]): number {
  if (!cats.length) return 0;
  let total = 0;
  for (const cat of cats) {
    const stat = cat.role ? cat.stats[ROLE_STAT[cat.role]] : 30;
    total += stat;
  }
  return Math.round(total / cats.length);
}

// ── Run heist ─────────────────────────────────────────────────────────────────
export function runHeist(crew: Cat[], vault: Vault): HeistResult {
  const events: HeistEvent[] = [];
  const rng = () => Math.random() * 100;

  const ghost     = crew.find(c => c.role === "ghost");
  const wheelman  = crew.find(c => c.role === "wheelman");
  const muscle    = crew.find(c => c.role === "muscle");
  const hacker    = crew.find(c => c.role === "hacker");
  const lookout   = crew.find(c => c.role === "lookout");

  const stealthScore  = ghost    ? ghost.stats.stealth  : 20;
  const speedScore    = wheelman ? wheelman.stats.speed  : 20;
  const muscleScore   = muscle   ? muscle.stats.muscle   : 20;
  const hackScore     = hacker   ? hacker.stats.wit      : 20;
  const luckScore     = lookout  ? lookout.stats.luck    : 20;

  const defenseNeeded = vault.defense + vault.tier * 10;

  let success = true;
  const jailedCats: number[] = [];
  let injuredCat: number | undefined;

  // Phase 1 — Approach
  const approachRoll = rng();
  const approachNeeded = Math.max(10, defenseNeeded * 0.4);
  const approachOk = approachRoll > approachNeeded - stealthScore * 0.3;
  events.push({
    type: "approach", text: "Scouts approach the target building",
    success: approachOk, roll: Math.round(approachRoll), needed: Math.round(approachNeeded),
  });
  if (!approachOk) {
    // Detected early — alarm triggered
    events.push({ type: "alarm", text: "Security detected the crew early!", success: false });
    const escapeRoll = rng();
    const escapeOk = escapeRoll > 100 - speedScore;
    if (!escapeOk && crew.length > 0) {
      const caught = crew[Math.floor(Math.random() * crew.length)];
      jailedCats.push(caught.id);
    }
    return { outcome: "caught", loot: 0, xp: 5, events, jailedCats };
  }

  // Phase 2 — Entry (muscle or hacker)
  const entryScore = Math.max(muscleScore, hackScore);
  const entryRoll = rng();
  const entryNeeded = Math.max(15, defenseNeeded * 0.6);
  const entryOk = entryRoll > entryNeeded - entryScore * 0.35;
  events.push({
    type: "entry", text: muscle ? "Muscle cracks the security door" : "Hacker disables the alarm system",
    success: entryOk, roll: Math.round(entryRoll), needed: Math.round(entryNeeded),
  });
  if (!entryOk) {
    success = false;
    events.push({ type: "alarm", text: "Alarm triggered! Partial abort.", success: false });
  }

  // Phase 3 — Vault
  if (success) {
    const vaultRoll = rng();
    const vaultNeeded = Math.max(20, defenseNeeded * 0.5);
    const vaultOk = vaultRoll > vaultNeeded - muscleScore * 0.2;
    const luckBonus = 1 + (luckScore / 200);
    events.push({
      type: "vault", text: "Cracking the vault…",
      success: vaultOk, roll: Math.round(vaultRoll), needed: Math.round(vaultNeeded),
    });

    // Phase 4 — Escape
    const escapeRoll = rng();
    const escapeNeeded = Math.max(10, defenseNeeded * 0.3);
    const escapeOk = escapeRoll > escapeNeeded - speedScore * 0.4;
    events.push({
      type: "escape", text: "Racing to the getaway car…",
      success: escapeOk, roll: Math.round(escapeRoll), needed: Math.round(escapeNeeded),
    });

    if (vaultOk && escapeOk) {
      const baseLoot = Math.round(vault.balance * 0.1 * luckBonus * (0.8 + Math.random() * 0.4));
      events.push({ type: "success", text: "Clean getaway! Vault cracked.", success: true });
      return { outcome: "clean", loot: baseLoot, xp: 25 + crew.length * 5, events, jailedCats };
    } else if (vaultOk || escapeOk) {
      const partialLoot = Math.round(vault.balance * 0.04 * luckBonus);
      if (!escapeOk && crew.length > 0) {
        injuredCat = crew[Math.floor(Math.random() * crew.length)].id;
      }
      return { outcome: "partial", loot: partialLoot, xp: 12, events, injuredCat, jailedCats };
    }
  }

  // Caught
  const caughtCount = Math.min(crew.length, Math.floor(Math.random() * 2) + 1);
  for (let i = 0; i < caughtCount; i++) jailedCats.push(crew[i].id);
  return { outcome: "caught", loot: 0, xp: 5, events, jailedCats };
}

// ── XP to level ───────────────────────────────────────────────────────────────
export function xpForLevel(level: number): number {
  return level * level * 100;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}
