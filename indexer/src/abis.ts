export const MARKETPLACE_ABI = [
  // Events
  { name: "Listed",    type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "seller",     type: "address", indexed: true },
    { name: "price",      type: "uint256", indexed: false },
  ]},
  { name: "Delisted",  type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "seller",     type: "address", indexed: true },
  ]},
  { name: "Sold",      type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "seller",     type: "address", indexed: false },
    { name: "buyer",      type: "address", indexed: true },
    { name: "price",      type: "uint256", indexed: false },
    { name: "fee",        type: "uint256", indexed: false },
  ]},
  { name: "PriceUpdated", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "newPrice",   type: "uint256", indexed: false },
  ]},
  { name: "OfferMade", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "buyer",      type: "address", indexed: true },
    { name: "price",      type: "uint256", indexed: false },
    { name: "expiry",     type: "uint64",  indexed: false },
  ]},
  { name: "OfferAccepted", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "seller",     type: "address", indexed: false },
    { name: "buyer",      type: "address", indexed: true },
    { name: "price",      type: "uint256", indexed: false },
  ]},
  { name: "OfferCancelled", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: true },
    { name: "offerIndex", type: "uint256", indexed: false },
  ]},
  { name: "CollectionOfferMade", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "buyer",      type: "address", indexed: true },
    { name: "price",      type: "uint256", indexed: false },
    { name: "expiry",     type: "uint64",  indexed: false },
  ]},
  { name: "CollectionOfferAccepted", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "tokenId",    type: "uint256", indexed: false },
    { name: "seller",     type: "address", indexed: false },
    { name: "buyer",      type: "address", indexed: true },
    { name: "price",      type: "uint256", indexed: false },
  ]},
  { name: "CollectionOfferCancelled", type: "event", inputs: [
    { name: "collection", type: "address", indexed: true },
    { name: "offerIndex", type: "uint256", indexed: false },
  ]},
] as const;

export const ERC721_ABI = [
  { name: "Transfer", type: "event", inputs: [
    { name: "from",    type: "address", indexed: true },
    { name: "to",      type: "address", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true },
  ]},
  { name: "name",   type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "ownerOf", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
