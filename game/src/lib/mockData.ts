import type { Cat, Vault, Player } from "./types";
import { getCatStats } from "./gameEngine";

export const DEMO_CATS: Cat[] = [
  { id: 1,    rarity: "Legendary", name: "Shadow",  image: "https://taocats.fun/samples/1.png",    stats: getCatStats("Legendary", 1) },
  { id: 50,   rarity: "Epic",      name: "Blaze",   image: "https://taocats.fun/samples/50.png",   stats: getCatStats("Epic",      50) },
  { id: 100,  rarity: "Rare",      name: "Cipher",  image: "https://taocats.fun/samples/100.png",  stats: getCatStats("Rare",      100) },
  { id: 200,  rarity: "Uncommon",  name: "Paws",    image: "https://taocats.fun/samples/200.png",  stats: getCatStats("Uncommon",  200) },
  { id: 300,  rarity: "Common",    name: "Mittens", image: "https://taocats.fun/samples/300.png",  stats: getCatStats("Common",    300) },
];

export const DEMO_VAULTS: Array<{ owner: string; name: string; balance: number; tier: 1|2|3|4|5; defense: number; guardCats: number }> = [
  { owner: "0x1234…5678", name: "VaultKing",    balance: 45000, tier: 4, defense: 72, guardCats: 3 },
  { owner: "0xabcd…ef01", name: "NightOwl",     balance: 12000, tier: 2, defense: 35, guardCats: 1 },
  { owner: "0x9876…5432", name: "CryptoSleuth", balance: 78000, tier: 5, defense: 88, guardCats: 5 },
  { owner: "0xdead…beef", name: "EasyMark",     balance:  3500, tier: 1, defense: 15, guardCats: 0 },
  { owner: "0xcafe…babe", name: "Ironpaws",     balance: 29000, tier: 3, defense: 55, guardCats: 2 },
  { owner: "0xf00d…cafe", name: "SilentClaw",   balance: 61000, tier: 4, defense: 68, guardCats: 4 },
];
