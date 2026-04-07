import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",           // Bittensor EVM recommended version
    settings: {
      optimizer:  { enabled: true, runs: 200 },
      evmVersion: "cancun",      // Bittensor EVM uses Cancun
    },
  },
  networks: {
    // ── Bittensor EVM Mainnet (Subtensor) ────────────────────────────────────
    subtensor: {
      url:      process.env.TAO_RPC_URL || "https://lite.chain.opentensor.ai",
      chainId:  964,              // UTF-8 for TAO symbol
      accounts: process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY!]
        : [],
      gasPrice: "auto",
    },

    // ── Bittensor EVM Testnet ─────────────────────────────────────────────────
    subtensorTestnet: {
      url:      process.env.TAO_TESTNET_RPC_URL || "https://test.chain.opentensor.ai",
      chainId:  945,
      accounts: process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY!]
        : [],
      gasPrice: "auto",
    },

    // ── Local development ─────────────────────────────────────────────────────
    localnet: {
      url:      "http://localhost:9944/",
      chainId:  964,
      accounts: process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY!]
        : [],
    },

    hardhat: {
      chainId: 964,
    },
  },

  // Block explorer verification (update when Subtensor explorer supports it)
  etherscan: {
    apiKey: {
      subtensor: process.env.TAO_EXPLORER_API_KEY || "no-key-needed",
    },
    customChains: [
      {
        network:  "subtensor",
        chainId:  964,
        urls: {
          apiURL:     "https://evm-explorer.tao.network/api",   // update when live
          browserURL: "https://evm-explorer.tao.network",
        },
      },
    ],
  },
};

export default config;
