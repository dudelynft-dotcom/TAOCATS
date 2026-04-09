# TAO CAT Whitepaper

**A Generative NFT Collection with On-Chain Marketplace and Rarity Registry on Bittensor EVM**

**Version 1.0 | Bittensor EVM Mainnet | April 2026**

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Background: Bittensor and Its EVM Layer](#2-background-bittensor-and-its-evm-layer)
3. [Collection Overview](#3-collection-overview)
4. [Artwork and Trait System](#4-artwork-and-trait-system)
5. [Rarity Architecture](#5-rarity-architecture)
6. [Smart Contract Architecture](#6-smart-contract-architecture)
7. [Marketplace](#7-marketplace)
8. [Economics and Value Flow](#8-economics-and-value-flow)
9. [Technical Infrastructure](#9-technical-infrastructure)
10. [Fairness Guarantees](#10-fairness-guarantees)
11. [Roadmap](#11-roadmap)
12. [Contract Addresses](#12-contract-addresses)
13. [Disclaimer](#13-disclaimer)

---

## 1. Abstract

TAO CAT is a collection of 4,699 generative pixel cats deployed on **Bittensor EVM** (Chain ID: 964), the Ethereum-compatible execution layer of the Bittensor decentralized AI network. Each token is unique, algorithmically generated from a layered trait system, and carries an on-chain rarity score stored in a dedicated registry contract.

The project is built around a single principle: **every value unit flows to the community**. The mint contract holds zero funds. There is no team allocation, no pre-mine, and no whitelist. Mint revenue is forwarded on-chain at the moment of each mint and does not remain in the contract.

Beyond the collection, TAO CAT ships a complete on-chain ecosystem: a native marketplace with batch listing and floor-sweep capabilities, and a permanent on-chain rarity registry queryable by any contract.

All contracts are immutable, non-upgradeable, and deployed on Bittensor EVM mainnet.

---

## 2. Background: Bittensor and Its EVM Layer

### 2.1 Bittensor Protocol

Bittensor ($TAO) is a decentralized machine intelligence network. Participants called miners compete to provide the best outputs for computational tasks (language modeling, image generation, data indexing, and others). Validators assess the quality of miner outputs and distribute $TAO emissions accordingly. The system creates a self-organizing, incentive-compatible marketplace for intelligence that operates without a central authority.

As of 2026, Bittensor operates hundreds of specialized subnets, each dedicated to a distinct computational domain. The $TAO token is the native unit of value and governance across the entire network.

### 2.2 Bittensor EVM

Bittensor EVM (Chain ID: 964) is the Ethereum-compatible smart contract layer of Bittensor. It shares $TAO as its native currency and inherits Bittensor's validator security model. Key properties:

| Property | Value |
|----------|-------|
| Chain ID | 964 |
| Native Token | $TAO (18 decimals) |
| EVM Version | Cancun |
| RPC | https://lite.chain.opentensor.ai |
| Block Explorer | https://evm-explorer.tao.network |
| Tooling | Full Ethereum compatibility (Hardhat, ethers.js, wagmi, MetaMask) |

Because Bittensor EVM is fully EVM-compatible, any Solidity contract that runs on Ethereum runs on Bittensor EVM without modification. Gas fees are denominated in $TAO and are significantly cheaper than Ethereum mainnet.

### 2.3 The NFT Landscape on Bittensor EVM

The Bittensor EVM ecosystem is young. While the broader Bittensor network has a large and growing community of AI researchers, miners, and validators, on-chain culture and NFT infrastructure are still forming. TAO CAT is an early generative NFT project on this chain, focused on bringing high-quality, community-owned NFT infrastructure to the Bittensor ecosystem: a fully on-chain marketplace and a permanent rarity system.

---

## 3. Collection Overview

| Parameter | Value |
|-----------|-------|
| Collection Name | TAO CAT |
| Token Symbol | TCAT |
| Token Standard | ERC-721 with ERC721Enumerable |
| Total Supply | 4,699 |
| Blockchain | Bittensor EVM (Chain ID: 964) |
| Mint Price | 0.01 TAO per token |
| Max Per Wallet | 20 tokens |
| Team Allocation | 0% |
| Website | taocats.fun |

### Supply Rationale

A supply of 4,699 creates genuine scarcity while supporting a meaningful community size. The collection is small enough that holding multiple tokens is accessible to early participants, while large enough to sustain active secondary market trading.

### Pricing Rationale

At 0.01 TAO per token, the mint is priced for accessibility across the Bittensor community: miners, validators, subnet operators, researchers, and $TAO holders of all sizes. The price is intentionally low because the objective is maximum participation and community ownership, not maximum revenue extraction. No mint revenue remains in the contract after any mint transaction.

---

## 4. Artwork and Trait System

### 4.1 Aesthetic Approach

TAO CAT uses pixel art as its visual language. Each image is rendered at 1000x1000 pixels. Pixel art is chosen for its cultural resonance with digital-native communities, its clarity and recognizability at small display sizes, and its suitability for layered, algorithmic generation without quality degradation.

Every cat is composed of six independent visual layers:

| Layer | Description |
|-------|-------------|
| Background | Color field or environment behind the cat |
| Body | Base fur color and physical form |
| Head | Headwear including hats, helmets, and accessories |
| Expression | Facial expression and emotional character |
| Outfit | Clothing and worn items |
| Eyewear | Glasses, goggles, visors, and eye accessories |

### 4.2 Generation Process

Images are generated programmatically from a library of hand-designed PNG trait assets. The generation algorithm:

1. Assigns trait values to each layer according to a weighted probability distribution
2. Ensures no two tokens share an identical combination across all six layers
3. Produces a deterministic output for each token ID, making the generation fully reproducible and auditable

The generation is not black-box random. Given the seed and the trait library, the output for any token ID can be independently verified.

### 4.3 Metadata Format

Each token's metadata follows the ERC-721 metadata standard and is served at:

```
https://taocats.fun/api/metadata/{tokenId}
```

The response structure:

```json
{
  "name": "TAO CAT #{tokenId}",
  "description": "...",
  "image": "https://taocats.fun/nft-images/{tokenId}.jpg",
  "attributes": [
    { "trait_type": "Background", "value": "..." },
    { "trait_type": "Body", "value": "..." },
    { "trait_type": "Head", "value": "..." },
    { "trait_type": "Expression", "value": "..." },
    { "trait_type": "Outfit", "value": "..." },
    { "trait_type": "Eyewear", "value": "..." },
    { "trait_type": "Rarity Tier", "value": "..." },
    { "trait_type": "Rarity Score", "value": 0, "display_type": "number" },
    { "trait_type": "Rank", "value": 0, "display_type": "number" }
  ]
}
```

Images are served with one-year immutable cache headers via a global CDN, ensuring fast load times worldwide.

---

## 5. Rarity Architecture

### 5.1 Scoring Methodology

Each token's rarity score is computed using the statistical rarity method. For each trait layer, the frequency of that trait value across the entire 4,699-token collection is calculated. The rarity score for a token is the sum of the inverse frequencies of all its trait values:

```
RarityScore(token) = sum over all layers of (1 / frequency(trait_value_in_layer))
```

Where `frequency(trait_value)` is the number of tokens with that trait value divided by 4,699.

A token with many low-frequency traits scores higher than one with common traits. This methodology is consistent with rarity tools used across the broader NFT ecosystem (Rarity Tools, rarity.tools standard).

### 5.2 Rarity Tiers

Tokens are classified into five tiers based on their final rarity score:

| Tier | Score Percentile | Approx. Count |
|------|-----------------|---------------|
| Common | 0th to 40th | ~1,880 tokens |
| Uncommon | 40th to 70th | ~1,410 tokens |
| Rare | 70th to 90th | ~940 tokens |
| Epic | 90th to 98th | ~376 tokens |
| Legendary | 98th to 100th | ~93 tokens |

### 5.3 On-Chain Rarity Registry

Rarity data is not stored in a centralized database or off-chain API. It is written permanently to the `BittensorCatRarity` contract at address `0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9`. For each token, the contract stores:

- Rarity score (uint256)
- Global rank from 1 (rarest) to 4,699 (most common)
- Rarity tier (enum: Common, Uncommon, Rare, Epic, Legendary)

Rarity data is written once by the owner after mint completion and cannot be modified afterward. Any smart contract, marketplace, aggregator, or wallet on Bittensor EVM can query the rarity of any token trustlessly, without relying on any off-chain source.

---

## 6. Smart Contract Architecture

All contracts are written in Solidity 0.8.24, compiled with Cancun EVM target, and optimized with 200 runs. All contracts extend OpenZeppelin 5.x libraries for security-critical functionality. No contract uses an upgradeable proxy pattern.

### 6.1 BittensorCatNFT

**Address:** `0x2797341aaceAA2cE87D226E41B2fb8800FEE5184`

The core ERC-721 token contract. It extends `ERC721Enumerable` (enabling on-chain iteration over holdings) and `ReentrancyGuard` (protecting the mint function from reentrancy attacks).

**Design properties:**

**Sequential token IDs.** Tokens are minted from ID 1 to 4,699 in sequential order. There are no gaps and no randomized ID assignment. This makes the collection enumerable and verifiable.

**Zero fund retention.** The contract has no `withdraw()` function. The contract balance is always zero after any mint transaction — mint funds are forwarded on-chain within the same transaction they are received.

**Automatic overpayment refund.** If a minter submits more TAO than required (common with gas estimation buffers), the excess is refunded atomically within the same transaction:

```solidity
uint256 paid   = mintPrice * quantity;
uint256 excess = msg.value - paid;
if (excess > 0) {
    (bool refunded,) = payable(msg.sender).call{value: excess}("");
    require(refunded, "Refund failed");
}
```

**Two-phase metadata.** Before collection reveal, all tokens resolve to a single `unrevealedURI`. After the owner calls `reveal(baseURI)`, each token resolves to `baseURI + tokenId`. The reveal is a one-way operation enforced by a boolean state variable:

```solidity
function reveal(string calldata baseURI) external onlyOwner {
    require(!revealed, "Already revealed");
    _baseTokenURI = baseURI;
    revealed = true;
    emit Revealed(baseURI);
}
```

**Per-wallet limit.** Each wallet address may mint a maximum of 20 tokens across all transactions. This limit is enforced via an on-chain mapping and cannot be bypassed by splitting transactions from the same address.

### 6.2 BittensorCatRarity

**Address:** `0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9`

The on-chain rarity registry. Stores score, rank, and tier for each of the 4,699 tokens. Data is written by the owner after mint and locked permanently. Read functions are public and callable by any address or contract.

### 6.3 TaoCatsMarketV2

**Address:** `0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475`

A purpose-built, fully on-chain marketplace for TAO CAT. Every listing, purchase, and cancellation is an on-chain transaction. There are no off-chain order books, no signed messages, and no trusted relay.

**Fee structure:**

| Component | Rate | Recipient |
|-----------|------|-----------|
| Marketplace fee | 1.0% | Treasury |
| Creator royalty | 5.5% | Treasury |
| Total deducted | 6.5% | |
| Seller receives | 93.5% | Seller wallet |

Fees are enforced in the contract's `buy()` function and cannot be bypassed. The fee split is hardcoded as constants:

```solidity
uint256 public constant MARKET_FEE_BPS  = 100;   // 1.0%
uint256 public constant ROYALTY_BPS     = 550;   // 5.5%
uint256 public constant TOTAL_FEE_BPS   = 650;   // 6.5%
uint256 public constant BPS_DENOMINATOR = 10_000;
```

**Batch operations:**

`listBatch(tokenIds[], prices[])` lists multiple tokens in a single transaction. This reduces the cost and friction of listing an entire portfolio.

`sweepFloor(tokenIds[])` buys multiple listed tokens in a single transaction. Each seller is paid individually within the same transaction. Fees are distributed atomically. This function enables efficient floor accumulation without multiple separate transactions.

---

## 7. Marketplace

### 7.1 Architecture

The TAO CAT marketplace at taocats.fun/marketplace operates entirely on-chain. State transitions (listings, purchases, cancellations) are Bittensor EVM transactions. There is no off-chain component to the marketplace's core trading logic.

### 7.2 Trade Execution Flow

The following sequence describes a standard trade:

```
1. Seller calls approve(marketplaceAddress, tokenId) on the NFT contract
2. Seller calls list(tokenId, priceInTAO) on the marketplace contract
3. Contract stores: Listing{ seller: address, price: uint256 }
4. Buyer calls buy(tokenId) with msg.value >= listing.price
5. Contract computes: sellerAmount = price * 0.935, fee = price * 0.065
6. Contract transfers: TAO to seller, TAO to treasury, NFT to buyer
7. Listing is deleted
```

All steps from (5) to (7) occur atomically within a single transaction. If any step fails, the entire transaction reverts.

### 7.3 sweepFloor

```solidity
function sweepFloor(uint256[] calldata tokenIds) external payable nonReentrant
```

Purchases multiple floor listings in a single transaction. For each token ID in the array, the contract verifies the listing exists, transfers the NFT to the buyer, pays the seller, and distributes fees. If the total value sent exceeds the sum of listing prices, the excess is refunded.

### 7.4 listBatch

```solidity
function listBatch(uint256[] calldata tokenIds, uint256[] calldata prices) external
```

Lists multiple tokens simultaneously. Requires prior approval of the marketplace address. Each token ID is mapped to its corresponding price in the input arrays.

---

## 8. Economics and Value Flow

### 8.1 Value Flow

```
MINT (0.01 TAO per token)
            |
            | Forwarded on-chain at mint time
            v
  Community Ecosystem
            |
            | Secondary trading generates
            v
  Marketplace Fees (6.5% per secondary sale)
            |
            | Funds treasury for
            v
  Ongoing Development and Ecosystem Growth
```

### 8.2 Holder Value Streams

A TAO CAT holder has two independent sources of value:

**1. NFT appreciation.** As Bittensor EVM activity grows, demand for early, well-designed collections with proven on-chain infrastructure increases. Floor price appreciation reflects the growth of the underlying ecosystem.

**2. Marketplace royalty flow.** Every secondary sale generates 6.5% in fees directed to the treasury. This fee supports ongoing development of the marketplace, rarity tooling, and ecosystem integrations, which in turn benefits all holders.

### 8.3 Zero-Extraction Design

The following mechanisms have been deliberately excluded:

| Excluded Feature | Reason |
|-----------------|--------|
| Team NFT allocation | Team receives no reserved allocation |
| Pre-mine or reserve supply | All tokens are publicly minted at the same price |
| `withdraw()` function in NFT contract | Ensures mint funds cannot be held by contract |
| Upgradeable proxy contracts | Eliminates post-deploy logic changes |
| Whitelist or guaranteed allocations | Equal access for all participants |

---

## 9. Technical Infrastructure

### 9.1 Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Web3 Interaction | wagmi v2 + viem |
| Data Fetching | TanStack Query v5 |
| Styling | Tailwind CSS |
| Hosting | Vercel (global CDN) |
| Domain | taocats.fun |

### 9.2 RPC Proxy

Bittensor EVM has specific behavior around gas estimation that can cause transaction simulation failures in standard wallets such as MetaMask. TAO CAT ships a custom JSON-RPC proxy at `taocats.fun/api/rpc` that proxies requests to `lite.chain.opentensor.ai`. The proxy handles estimation edge cases transparently, ensuring mint and marketplace transactions simulate and execute correctly across all supported wallets.

### 9.3 Smart Contract Build Configuration

| Parameter | Value |
|-----------|-------|
| Solidity Version | 0.8.24 |
| EVM Target | Cancun |
| Base Libraries | OpenZeppelin 5.x |
| Optimizer | Enabled, 200 runs |

### 9.4 Metadata System

Token metadata is served dynamically by a Next.js API route. The route reads the pre-generated JSON file for each token ID and constructs a fully resolved response with an absolute image URL derived from the request host header. This approach ensures correctness regardless of the deployment domain.

Images are served as static assets from a global CDN with the following response headers:

```
Cache-Control: public, max-age=31536000, immutable
Content-Type: image/jpeg
```

The 1-year immutable cache ensures images are served at CDN edge with zero origin latency after the first request.

---

## 10. Fairness Guarantees

Each guarantee below is enforceable on-chain and verifiable by reading the deployed contract bytecode or source.

### 10.1 Mint Funds Cannot Be Retained

The `BittensorCatNFT` contract contains no `withdraw()` function and no payable function other than `mint()`. The contract balance is always zero after any mint transaction — funds are forwarded within the same transaction they are received. Verification: inspect the contract ABI for absence of any `withdraw` function.

### 10.2 No Post-Deploy Logic Changes

None of the contracts use `TransparentUpgradeableProxy`, `UUPSUpgradeable`, or any proxy pattern. The bytecode at each address is the final bytecode. Verification: confirm absence of proxy patterns by inspecting contract storage slots and ABI on block explorer.

### 10.3 Equal Access to Mint

There is no `require(whitelist[msg.sender])` or similar check in the `mint()` function. The only admission criteria are: mint is active, quantity is between 1 and 20, wallet has not exceeded the 20-token cap, total supply has not been reached, and sufficient TAO is attached. These conditions apply identically to every address.

### 10.4 On-Chain Rarity Immutability

The rarity registry stores data with no update function. Once scores, ranks, and tiers are written by the owner, they are permanent. Verification: inspect the rarity contract for absence of any setter functions callable after initial population.

---

## 11. Roadmap

### Phase 1: Deployment (Completed)

- [x] Deploy BittensorCatNFT on Bittensor EVM mainnet
- [x] Deploy BittensorCatRarity
- [x] Deploy TaoCatsMarketV2 and TaoCatsMarket
- [x] Launch taocats.fun with mint, marketplace, and activity UI
- [x] Open public mint at 0.01 TAO

### Phase 2: Reveal (In Progress)

- [ ] Execute collection reveal (set baseURI in NFT contract)
- [ ] Write rarity scores and ranks to BittensorCatRarity
- [ ] Enable marketplace trading on taocats.fun

### Phase 3: Marketplace Enhancement

- [ ] Surface on-chain rarity data in marketplace listings and token pages
- [ ] On-chain activity feed with real-time sale and listing events
- [ ] Trait-based search and filtering in collection explorer
- [ ] Improved analytics: volume, floor history, wallet holdings

### Phase 4: Ecosystem Integration

- [ ] Integration with Bittensor EVM wallets and explorers
- [ ] Collaborations with other Bittensor subnet projects
- [ ] Exploration of cross-subnet utility for TAO CAT holders

---

## 12. Contract Addresses

All contracts are deployed on **Bittensor EVM (Chain ID: 964)**.

| Contract | Address |
|----------|---------|
| TAO CAT NFT (TCAT) | `0x2797341aaceAA2cE87D226E41B2fb8800FEE5184` |
| Rarity Registry | `0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9` |
| MarketV2 | `0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475` |
| Simple Market | `0xfFF9F5eD81f805da27c022290C188eb6Fa3Ac7dE` |

Block Explorer: https://evm-explorer.tao.network

Website: https://taocats.fun

---

## 13. Disclaimer

TAO CAT is an experimental digital collectible project. The NFTs described in this document are not financial instruments, securities, or investment contracts. Holding a TAO CAT token does not represent ownership in any company or legal entity, and does not carry any rights to dividends, profits, or future revenue.

The smart contracts in this project extend OpenZeppelin 5.x libraries and follow established Solidity security practices. However, these contracts have not undergone a formal third-party security audit. Users interact with them at their own risk.

Bittensor EVM is an emerging blockchain network. It may experience network instability, protocol changes, or other events outside the control of the TAO CAT project. The team makes no guarantees regarding uninterrupted availability of the network, this application, or the metadata hosting infrastructure.

Nothing in this document constitutes financial advice. Participants should conduct independent research before minting, trading, or holding any asset described herein.

---

**TAO CAT | taocats.fun | Bittensor EVM (Chain ID: 964)**
