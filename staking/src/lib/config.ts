import { defineChain } from "viem";
import { createConfig, http, createStorage, cookieStorage } from "wagmi";
import { injected } from "wagmi/connectors";

export const subtensor = defineChain({
  id: 964,
  name: "Bittensor EVM",
  nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://taocats.fun/api/rpc?net=main"] },
    public:  { http: ["https://lite.chain.opentensor.ai"] },
  },
  blockExplorers: {
    default: { name: "TAO Explorer", url: "https://evm-explorer.tao.network" },
  },
  testnet: false,
});

export const wagmiConfig = createConfig({
  chains: [subtensor],
  transports: { [subtensor.id]: http("https://lite.chain.opentensor.ai") },
  connectors: [injected()],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
});

export const CONTRACTS = {
  NFT:     (process.env.NEXT_PUBLIC_NFT_ADDRESS     ?? "") as `0x${string}`,
  RARITY:  (process.env.NEXT_PUBLIC_RARITY_ADDRESS  ?? "") as `0x${string}`,
  STAKING: (process.env.NEXT_PUBLIC_STAKING_ADDRESS ?? "") as `0x${string}`,
  BITCAT:  (process.env.NEXT_PUBLIC_BITCAT_ADDRESS  ?? "") as `0x${string}`,
};

export const BASE_RATE_PER_DAY = 4_079;   // $BITCAT per cat per day (base)
export const SEASON_DAYS       = 90;
export const MAIN_SITE         = "https://taocats.fun";
