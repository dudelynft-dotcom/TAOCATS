export type Rarity = "Legendary" | "Epic" | "Rare" | "Uncommon" | "Common";

export interface CatStats {
  stealth:  number; // avoid detection
  speed:    number; // escape success
  luck:     number; // bonus loot
  muscle:   number; // break defenses
  wit:      number; // hack security
}

export interface Cat {
  id:      number;
  rarity:  Rarity;
  name:    string;
  image:   string;
  stats:   CatStats;
  role?:   CrewRole;
  jailed?: boolean;
  jailUntil?: number; // unix ms
  injured?: boolean;
  injuredUntil?: number;
}

export type CrewRole = "ghost" | "wheelman" | "muscle" | "hacker" | "lookout";

export const ROLE_STAT: Record<CrewRole, keyof CatStats> = {
  ghost:     "stealth",
  wheelman:  "speed",
  muscle:    "muscle",
  hacker:    "wit",
  lookout:   "luck",
};

export const ROLE_LABEL: Record<CrewRole, string> = {
  ghost:    "The Ghost",
  wheelman: "Wheel Man",
  muscle:   "The Muscle",
  hacker:   "The Hacker",
  lookout:  "Lookout",
};

export const ROLE_ICON: Record<CrewRole, string> = {
  ghost:    "👻",
  wheelman: "🚗",
  muscle:   "💪",
  hacker:   "💻",
  lookout:  "🔭",
};

export interface Vault {
  ownerId:   string;
  ownerName: string;
  balance:   number; // $BITCAT
  tier:      1 | 2 | 3 | 4 | 5;
  defense:   number; // 0–100
  guardCats: number; // count
  lastRobbed?: number;
}

export type HeistOutcome = "clean" | "partial" | "caught";

export interface HeistResult {
  outcome:     HeistOutcome;
  loot:        number;
  xp:          number;
  events:      HeistEvent[];
  injuredCat?: number; // cat id
  jailedCats:  number[];
}

export interface HeistEvent {
  type:    "approach" | "entry" | "vault" | "escape" | "alarm" | "caught" | "success";
  text:    string;
  success: boolean;
  roll?:   number;
  needed?: number;
}

export interface Player {
  address:   string;
  name:      string;
  level:     number;
  xp:        number;
  bitcat:    number;
  vault:     Vault;
  cats:      Cat[];
  gangId?:   string;
  heistCount: number;
  wins:       number;
}
