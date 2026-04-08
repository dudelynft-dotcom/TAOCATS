// ─── TAO Cats NFT ─────────────────────────────────────────────────────────────
export const NFT_ABI = [
  { name: "mint",              type: "function", stateMutability: "payable",
    inputs: [{ name: "quantity", type: "uint256" }], outputs: [] },
  { name: "totalSupply",       type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "mintActive",        type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "bool" }] },
  { name: "mintedPerWallet",   type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "tokensOfOwner",     type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256[]" }] },
  { name: "tokenURI",          type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "remainingSupply",   type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "mintCostFor",       type: "function", stateMutability: "view",
    inputs: [{ name: "quantity", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "mintPrice",         type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "MINT_PRICE",        type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "MAX_SUPPLY",        type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "revealed",          type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "bool" }] },
  // Admin
  { name: "setMintActive",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "_active", type: "bool" }], outputs: [] },
  { name: "setMintPrice",        type: "function", stateMutability: "nonpayable", inputs: [{ name: "_price", type: "uint256" }], outputs: [] },
  { name: "setLiquidityReceiver",type: "function", stateMutability: "nonpayable", inputs: [{ name: "_receiver", type: "address" }], outputs: [] },
  { name: "setUnrevealedURI",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "_uri", type: "string" }], outputs: [] },
  { name: "reveal",              type: "function", stateMutability: "nonpayable", inputs: [{ name: "baseURI", type: "string" }], outputs: [] },
  { name: "liquidityReceiver",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  // Events
  { name: "CatMinted",         type: "event",
    inputs: [{ name: "minter", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
  { name: "Transfer",          type: "event",
    inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
] as const;

// ─── Universal Marketplace ────────────────────────────────────────────────────
export const MARKETPLACE_ABI = [
  // Listings
  { name: "list",         type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [] },
  { name: "delist",       type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "updatePrice",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "newPrice", type: "uint256" }], outputs: [] },
  { name: "buy",          type: "function", stateMutability: "payable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] },
  // NFT Offers
  { name: "makeOffer",    type: "function", stateMutability: "payable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "expiry", type: "uint64" }], outputs: [] },
  { name: "acceptOffer",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "offerIndex", type: "uint256" }], outputs: [] },
  { name: "cancelOffer",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "offerIndex", type: "uint256" }], outputs: [] },
  // Collection Offers
  { name: "makeCollectionOffer",    type: "function", stateMutability: "payable",
    inputs: [{ name: "collection", type: "address" }, { name: "expiry", type: "uint64" }], outputs: [] },
  { name: "acceptCollectionOffer",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "offerIndex", type: "uint256" }], outputs: [] },
  { name: "cancelCollectionOffer",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "collection", type: "address" }, { name: "offerIndex", type: "uint256" }], outputs: [] },
  // View
  { name: "getListingsPage",        type: "function", stateMutability: "view",
    inputs: [{ name: "collection", type: "address" }, { name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
    outputs: [
      { name: "tokenIds", type: "uint256[]" },
      { name: "data",     type: "tuple[]", components: [
        { name: "seller", type: "address" }, { name: "price", type: "uint256" }, { name: "active", type: "bool" }
      ]},
    ]},
  { name: "getNftOffers",           type: "function", stateMutability: "view",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }],
    outputs: [{ type: "tuple[]", components: [
      { name: "buyer", type: "address" }, { name: "price", type: "uint256" }, { name: "expiry", type: "uint64" }, { name: "active", type: "bool" }
    ]}]},
  { name: "getCollectionOffers",    type: "function", stateMutability: "view",
    inputs: [{ name: "collection", type: "address" }],
    outputs: [{ type: "tuple[]", components: [
      { name: "buyer", type: "address" }, { name: "price", type: "uint256" }, { name: "expiry", type: "uint64" }, { name: "active", type: "bool" }
    ]}]},
  { name: "listings",               type: "function", stateMutability: "view",
    inputs: [{ name: "collection", type: "address" }, { name: "tokenId", type: "uint256" }],
    outputs: [{ name: "seller", type: "address" }, { name: "price", type: "uint256" }, { name: "active", type: "bool" }]},
  { name: "activeListingCount",     type: "function", stateMutability: "view",
    inputs: [{ name: "collection", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "feePercent",             type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "collections",            type: "function", stateMutability: "view",
    inputs: [{ name: "collection", type: "address" }],
    outputs: [
      { name: "verified",   type: "bool"    },
      { name: "spam",       type: "bool"    },
      { name: "volume",     type: "uint256" },
      { name: "salesCount", type: "uint256" },
      { name: "floorPrice", type: "uint256" },
    ]},
  // Events
  { name: "Listed",      type: "event",
    inputs: [{ name: "collection", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "price", type: "uint256" }] },
  { name: "Sold",        type: "event",
    inputs: [{ name: "collection", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address" }, { name: "buyer", type: "address", indexed: true }, { name: "price", type: "uint256" }, { name: "fee", type: "uint256" }] },
  { name: "Delisted",    type: "event",
    inputs: [{ name: "collection", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }] },
  { name: "OfferMade",   type: "event",
    inputs: [{ name: "collection", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "price", type: "uint256" }, { name: "expiry", type: "uint64" }] },
  { name: "OfferAccepted", type: "event",
    inputs: [{ name: "collection", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address" }, { name: "buyer", type: "address", indexed: true }, { name: "price", type: "uint256" }] },
] as const;

// ─── Rarity ───────────────────────────────────────────────────────────────────
export const RARITY_ABI = [
  { name: "scoreOf",    type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "rankOf",     type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "tierOf",     type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "rarityOf",   type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "score", type: "uint256" }, { name: "rank", type: "uint256" }, { name: "tier", type: "string" }] },
  { name: "rarityBatch", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [{ name: "scores", type: "uint256[]" }, { name: "ranks", type: "uint256[]" }, { name: "tiers", type: "string[]" }] },
] as const;

// ─── TaoCatsMarketV2 ─────────────────────────────────────────────────────────
export const SIMPLE_MARKET_ABI = [
  // Write
  { name: "list",       type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [] },
  { name: "listBatch",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "tokenIds", type: "uint256[]" }, { name: "prices", type: "uint256[]" }], outputs: [] },
  { name: "delist",     type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "buy",        type: "function", stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "sweepFloor", type: "function", stateMutability: "payable",
    inputs: [{ name: "tokenIds", type: "uint256[]" }], outputs: [] },
  // View
  { name: "getListing", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "seller", type: "address" }, { name: "price", type: "uint256" }] },
  { name: "isListed",   type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "totalListings", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ type: "uint256" }] },
  { name: "sweepCost",  type: "function", stateMutability: "view",
    inputs: [{ name: "tokenIds", type: "uint256[]" }], outputs: [{ name: "total", type: "uint256" }] },
  { name: "getPage",    type: "function", stateMutability: "view",
    inputs: [{ name: "offset", type: "uint256" }, { name: "limit", type: "uint256" }],
    outputs: [
      { name: "tokenIds", type: "uint256[]" },
      { name: "sellers",  type: "address[]" },
      { name: "prices",   type: "uint256[]" },
    ]},
  { name: "listings",   type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "seller", type: "address" }, { name: "price", type: "uint256" }] },
  { name: "MARKET_FEE_BPS", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "ROYALTY_BPS",    type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "TOTAL_FEE_BPS",  type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "treasury",       type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  // Admin
  { name: "setTreasury",    type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "_treasury", type: "address" }], outputs: [] },
  // Events
  { name: "Listed",    type: "event",
    inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "price", type: "uint256" }] },
  { name: "Sold",      type: "event",
    inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "price", type: "uint256" }] },
  { name: "Delisted",  type: "event",
    inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }] },
] as const;

// ─── ERC-721 generic ─────────────────────────────────────────────────────────
export const ERC721_ABI = [
  { name: "name",               type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol",             type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "totalSupply",        type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf",          type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "ownerOf",            type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { name: "isApprovedForAll",   type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], outputs: [{ type: "bool" }] },
  { name: "setApprovalForAll",  type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
  { name: "tokenURI",           type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { name: "Transfer",           type: "event",
    inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "tokenId", type: "uint256", indexed: true }] },
] as const;
