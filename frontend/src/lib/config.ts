import { defineChain } from "viem";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

// ── Bittensor EVM chains ───────────────────────────────────────────────────────
export const subtensor = defineChain({
  id: 964,
  name: "Bittensor EVM",
  nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://lite.chain.opentensor.ai"] },
    public:  { http: ["https://lite.chain.opentensor.ai"] },
  },
  blockExplorers: {
    default: { name: "TAO Explorer", url: "https://evm-explorer.tao.network" },
  },
  testnet: false,
});

export const subtensorTestnet = defineChain({
  id: 945,
  name: "Bittensor Testnet",
  nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://test.chain.opentensor.ai"] },
    public:  { http: ["https://test.chain.opentensor.ai"] },
  },
  testnet: true,
});

const IS_TESTNET = process.env.NEXT_PUBLIC_USE_TESTNET === "true";
export const activeChain = IS_TESTNET ? subtensorTestnet : subtensor;

export const wagmiConfig = createConfig({
  chains: [subtensor, subtensorTestnet],
  transports: {
    [subtensor.id]:        http("https://lite.chain.opentensor.ai"),
    [subtensorTestnet.id]: http("https://test.chain.opentensor.ai"),
  },
  connectors: [injected()],
  ssr: true,
});

// ── Contract addresses ────────────────────────────────────────────────────────
export const CONTRACTS = {
  NFT:         process.env.NEXT_PUBLIC_NFT_ADDRESS         as `0x${string}`,
  MARKETPLACE: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`,
  TOKEN:       process.env.NEXT_PUBLIC_BTCAT_TOKEN_ADDRESS as `0x${string}`,
  RARITY:      process.env.NEXT_PUBLIC_RARITY_ADDRESS      as `0x${string}`,
};

// ── Collection constants ──────────────────────────────────────────────────────
export const COLLECTION_NAME = "TAO CAT";
export const MAX_SUPPLY      = 4699;
export const MINT_PRICE      = "0.015";
export const MAX_PER_WALLET  = 20;

// ── Known verified collections on Bittensor EVM ───────────────────────────────
export type Collection = {
  address: `0x${string}`;
  name: string;
  symbol: string;
  verified: boolean;
  totalSupply: number;
  mintPrice?: string;
  imagePrefix?: string;
};

export const KNOWN_COLLECTIONS: Collection[] = [
  {
    address: process.env.NEXT_PUBLIC_NFT_ADDRESS as `0x${string}`,
    name: "TAO CAT",
    symbol: "TCAT",
    verified: true,
    totalSupply: 4699,
    mintPrice: "0.015",
    imagePrefix: "/samples/",
  },
];
