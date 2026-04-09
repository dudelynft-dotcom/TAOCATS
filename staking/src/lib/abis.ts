export const NFT_ABI = [
  { name: "tokensOfOwner",   type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "isApprovedForAll", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
  { name: "ownerOf", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
] as const;

export const RARITY_ABI = [
  { name: "scoreOf", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "tierOf",  type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "rarityBatch", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [
      { name: "scores", type: "uint256[]" },
      { name: "ranks",  type: "uint256[]" },
      { name: "tiers",  type: "string[]"  },
    ]},
] as const;

export const STAKING_ABI = [
  // Write
  { name: "stake",    type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "tokenIds", type: "uint256[]" }, { name: "lockOption", type: "uint8" }], outputs: [] },
  { name: "unstake",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "tokenIds", type: "uint256[]" }], outputs: [] },
  { name: "claim",    type: "function", stateMutability: "nonpayable",
    inputs: [], outputs: [] },
  // View
  { name: "pendingRewardsOf", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "stakedTokensOf", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "dailyRateOf", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "stakes", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "owner",     type: "address" },
      { name: "stakedAt",  type: "uint64"  },
      { name: "lockUntil", type: "uint64"  },
      { name: "lastClaim", type: "uint64"  },
    ]},
  { name: "totalStaked",      type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "endTime",          type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "tradingBoostTier", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint8" }] },
  // Events
  { name: "Staked",   type: "event",
    inputs: [{ name: "owner", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "lockUntil", type: "uint64" }] },
  { name: "Unstaked", type: "event",
    inputs: [{ name: "owner", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
  { name: "Claimed",  type: "event",
    inputs: [{ name: "owner", type: "address", indexed: true }, { name: "amount", type: "uint256" }] },
] as const;

export const BITCAT_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "symbol",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;
