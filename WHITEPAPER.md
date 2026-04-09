# TAO CAT Whitepaper

**A Generative NFT Collection with On-Chain Marketplace, Rarity Registry, and Community Token on Bittensor EVM**

**Version 1.0 | Bittensor EVM Mainnet | April 2026**

---

## Table of Contents

1. [Abstract](#1-abstract)
2. [Background: Bittensor and Its EVM Layer](#2-background-bittensor-and-its-evm-layer)
3. [Collection Overview](#3-collection-overview)
4. [Artwork and Trait System](#4-artwork-and-trait-system)
5. [Rarity Architecture](#5-rarity-architecture)
6. [Smart Contract Architecture](#6-smart-contract-architecture)
7. [The $BTCAT Token](#7-the-btcat-token)
8. [Marketplace](#8-marketplace)
9. [Economics and Value Flow](#9-economics-and-value-flow)
10. [Technical Infrastructure](#10-technical-infrastructure)
11. [Fairness Guarantees](#11-fairness-guarantees)
12. [Roadmap](#12-roadmap)
13. [Contract Addresses](#13-contract-addresses)
14. [Disclaimer](#14-disclaimer)

---

## 1. Abstract

TAO CAT is a collection of 4,699 generative pixel cats deployed on **Bittensor EVM** (Chain ID: 964), the Ethereum-compatible execution layer of the Bittensor decentralized AI network. Each token is unique, algorithmically generated from a layered trait system, and carries an on-chain rarity score stored in a dedicated registry contract.

The project is built around a single principle: **every value unit flows to the community**. The mint contract holds zero funds. There is no team allocation, no pre-mine, and no whitelist. One hundred percent of mint revenue is forwarded on-chain to a liquidity receiver at the moment of each mint. The $BTCAT community token is distributed entirely to NFT holders, with no portion reserved for any team, advisor, or investor.

Beyond the collection, TAO CAT ships a complete on-chain ecosystem: a native marketplace with batch listing and floor-sweep capabilities, a permanent on-chain rarity registry queryable by any contract, and an ERC-20 community token backed by the liquidity seeded from mint proceeds.

All four contracts are immutable, non-upgradeable, and deployed on Bittensor EVM mainnet.

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

The Bittensor EVM ecosystem is young. While the broader Bittensor network has a large and growing community of AI researchers, miners, and validators, on-chain culture and NFT infrastructure are still forming. TAO CAT is an early generative NFT project on this chain, focused on bringing high-quality, community-owned NFT infrastructure to the Bittensor ecosystem: a fully on-chain marketplace, a permanent rarity system, and a community token with no team allocation.

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
| Mint Revenue Distribution | 100% forwarded to liquidity at mint time |
| Website | taocats.fun |

### Supply Rationale

A supply of 4,699 creates genuine scarcity while supporting a meaningful community size. The collection is small enough that holding multiple tokens is accessible to early participants, while large enough to sustain active secondary market trading and broad $BTCAT distribution.

### Pricing Rationale

At 0.01 TAO per token, the mint is priced for accessibility across the Bittensor community: miners, validators, subnet operators, researchers, and $TAO holders of all sizes. The price is intentionally low because the objective is maximum participation and community ownership, not maximum revenue extraction. Total mint revenue of 46.99 TAO (4,699 tokens x 0.01 TAO) flows entirely to liquidity, not to any team wallet.

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

Images are served as JPEG (quality 85, 1000x1000px) with one-year immutable cache headers via Vercel's global CDN.

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

**Zero fund retention.** The contract has no `withdraw()` function and no mechanism for the owner to extract ETH/TAO. Every call to `mint()` immediately invokes `_forwardToLiquidity()`, which transfers the full contract balance to the `liquidityReceiver` address before the function returns. The contract balance is always zero after any mint transaction.

```solidity
function _forwardToLiquidity() private {
    uint256 balance = address(this).balance;
    if (balance > 0) {
        (bool ok,) = payable(liquidityReceiver).call{value: balance}("");
        require(ok, "Liquidity forward failed");
        emit FundsForwardedToLiquidity(balance);
    }
}
```

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

### 6.4 BtcatToken

**Address:** `0x5246088E136F44c739bDBeade6b638697b88B073`

The $BTCAT ERC-20 community token. See Section 7 for full specification.

---

## 7. The $BTCAT Token

### 7.1 Specification

| Parameter | Value |
|-----------|-------|
| Name | BTCAT |
| Symbol | $BTCAT |
| Decimals | 18 |
| Total Supply | 4,699,000,000 |
| Per-NFT Entitlement | 1,000,000 $BTCAT |
| Team Allocation | 0% |
| Chain | Bittensor EVM (Chain ID: 964) |
| Contract | `0x5246088E136F44c739bDBeade6b638697b88B073` |

The total supply is derived directly from collection size: 4,699 tokens multiplied by 1,000,000 $BTCAT per token. There is no additional supply, no inflation mechanism, and no reserve.

### 7.2 Distribution Mechanism

The distribution process is enforced by the contract and consists of the following steps:

1. The owner deploys the distributor contract
2. The owner calls `setDistributor(distributorAddress)` on the $BTCAT contract
3. The function transfers 100% of the supply to the distributor and sets `distributorLocked = true`
4. From this point, the distributor address cannot be changed and no further minting is possible
5. NFT holders call the distributor to claim their 1,000,000 $BTCAT per held token

The lock is enforced as follows:

```solidity
function setDistributor(address _distributor) external onlyOwner {
    require(!distributorLocked, "Distributor already locked");
    require(_distributor != address(0), "Zero address");
    distributor       = _distributor;
    distributorLocked = true;
    _transfer(msg.sender, _distributor, balanceOf(msg.sender));
    emit DistributorSet(_distributor);
}
```

After `setDistributor` is called, the deployer holds zero $BTCAT. Every token is in the distributor. No entity can reassign it.

### 7.3 Liquidity Bootstrapping

Every 0.01 TAO paid during minting is forwarded directly to the `liquidityReceiver` address in the same transaction. At full mint, this accumulates to 46.99 TAO. These funds are used to seed the $BTCAT / TAO trading pair on Bittensor EVM, providing immediate on-chain liquidity at launch. The liquidity is community-funded: every minter collectively contributes to the pool that backs the token they receive.

### 7.4 Token Utility

$BTCAT functions as the community token of the TAO CAT ecosystem. Its initial utility is as a claim on participation in the project. Future utility will be governed by community proposals and may include governance voting weight, marketplace fee discounts, and access to future drops or collaborations.

---

## 8. Marketplace

### 8.1 Architecture

The TAO CAT marketplace at taocats.fun/marketplace operates entirely on-chain. State transitions (listings, purchases, cancellations) are Bittensor EVM transactions. There is no off-chain component to the marketplace's core trading logic.

### 8.2 Trade Execution Flow

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

### 8.3 sweepFloor

```solidity
function sweepFloor(uint256[] calldata tokenIds) external payable nonReentrant
```

Purchases multiple floor listings in a single transaction. For each token ID in the array, the contract verifies the listing exists, transfers the NFT to the buyer, pays the seller, and distributes fees. If the total value sent exceeds the sum of listing prices, the excess is refunded.

### 8.4 listBatch

```solidity
function listBatch(uint256[] calldata tokenIds, uint256[] calldata prices) external
```

Lists multiple tokens simultaneously. Requires prior approval of the marketplace address. Each token ID is mapped to its corresponding price in the input arrays.

---

## 9. Economics and Value Flow

### 9.1 Value Flow Diagram

```
MINT (0.01 TAO per token x 4,699 tokens)
            |
            | 100% at mint time (on-chain, same transaction)
            v
  Liquidity Receiver Wallet (46.99 TAO total)
            |
            | Used to seed
            v
  $BTCAT / TAO Trading Pair
            |
            | Distributed to
            v
  NFT Holders (1,000,000 $BTCAT per token)
            |
            | Trade on marketplace
            v
  Marketplace (6.5% fee per secondary sale)
            |
            | Funds treasury for
            v
  Ongoing Development and Ecosystem Growth
```

### 9.2 Holder Value Streams

A TAO CAT holder has three independent sources of value:

**1. NFT appreciation.** As Bittensor EVM activity grows, demand for early, well-designed collections with proven on-chain infrastructure increases. Floor price appreciation reflects the growth of the underlying ecosystem.

**2. $BTCAT allocation.** Each token entitles its holder to 1,000,000 $BTCAT. This allocation is proportional: every holder of any token receives an equal share. The $BTCAT token is backed by the TAO liquidity pool seeded from mint proceeds.

**3. Marketplace royalty flow.** Every secondary sale generates 6.5% in fees directed to the treasury. This fee supports ongoing development of the marketplace, rarity tooling, and ecosystem integrations, which in turn benefits all holders.

### 9.3 Zero-Extraction Design

The following mechanisms have been deliberately excluded:

| Excluded Feature | Reason |
|-----------------|--------|
| Team token allocation | Team receives no $BTCAT or NFT allocation |
| Pre-mine or reserve supply | All tokens are publicly minted at the same price |
| `withdraw()` function in NFT contract | Ensures mint funds cannot be redirected |
| Upgradeable proxy contracts | Eliminates post-deploy logic changes |
| Vesting schedules with cliff unlocks | No tokens vest to insiders |
| Whitelist or guaranteed allocations | Equal access for all participants |

---

## 10. Technical Infrastructure

### 10.1 Frontend

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Web3 Interaction | wagmi v2 + viem |
| Data Fetching | TanStack Query v5 |
| Styling | Tailwind CSS |
| Hosting | Vercel (global CDN) |
| Domain | taocats.fun |

### 10.2 RPC Proxy

Bittensor EVM has specific behavior around gas estimation that can cause transaction simulation failures in standard wallets such as MetaMask. TAO CAT ships a custom JSON-RPC proxy at `taocats.fun/api/rpc` that proxies requests to `lite.chain.opentensor.ai`. The proxy handles estimation edge cases transparently, ensuring mint and marketplace transactions simulate and execute correctly across all supported wallets.

Configuration:
- Mainnet: `taocats.fun/api/rpc?net=main`
- Testnet: `taocats.fun/api/rpc?net=test`

### 10.3 Smart Contract Build Configuration

| Parameter | Value |
|-----------|-------|
| Solidity Version | 0.8.24 |
| EVM Target | Cancun |
| Framework | Hardhat |
| Base Libraries | OpenZeppelin 5.x |
| Optimizer | Enabled, 200 runs |
| Deployment Network | subtensor (hardhat network name) |

### 10.4 Metadata System

Token metadata is served dynamically by a Next.js API route. The route reads the pre-generated JSON file for each token ID and constructs a fully resolved response with an absolute image URL derived from the request host header. This approach ensures correctness regardless of the deployment domain.

Images are served as static assets from Vercel's CDN with the following response headers:

```
Cache-Control: public, max-age=31536000, immutable
Content-Type: image/jpeg
```

The 1-year immutable cache ensures images are served at CDN edge with zero origin latency after the first request.

---

## 11. Fairness Guarantees

Each guarantee below is enforceable on-chain and verifiable by reading the deployed contract bytecode or source.

### 11.1 Mint Funds Cannot Be Diverted

The `BittensorCatNFT` contract contains no `withdraw()` function and no payable function other than `mint()`. The `_forwardToLiquidity()` internal function is called unconditionally at the end of every mint. The `liquidityReceiver` address is set at construction and cannot be changed post-deploy (there is no setter function for it). Verification: inspect the contract ABI for absence of any `withdraw` or `setLiquidityReceiver` function.

### 11.2 No Team Token Allocation

The $BTCAT contract mints the full supply to the deployer in the constructor. The `setDistributor()` function, which must be called before any distribution, transfers the full balance to the distributor contract and sets `distributorLocked = true`. After this call, the deployer holds zero $BTCAT permanently. Verification: check the token transfer events on block explorer from the deployment transaction through `setDistributor`.

### 11.3 No Post-Deploy Logic Changes

None of the four contracts use `TransparentUpgradeableProxy`, `UUPSUpgradeable`, or any proxy pattern. The bytecode at each address is the final bytecode. Verification: confirm absence of proxy patterns by inspecting contract storage slots and ABI on block explorer.

### 11.4 Equal Access to Mint

There is no `require(whitelist[msg.sender])` or similar check in the `mint()` function. The only admission criteria are: mint is active, quantity is between 1 and 20, wallet has not exceeded the 20-token cap, total supply has not been reached, and sufficient TAO is attached. These conditions apply identically to every address.

### 11.5 On-Chain Rarity Immutability

The rarity registry stores data with no update function. Once scores, ranks, and tiers are written by the owner, they are permanent. Verification: inspect the rarity contract for absence of any setter functions callable after initial population.

---

## 12. Roadmap

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

### Phase 3: Token Distribution

- [ ] Deploy $BTCAT distributor contract
- [ ] Call setDistributor to transfer full supply and lock
- [ ] Enable claim interface for NFT holders (1,000,000 $BTCAT per token)
- [ ] Seed $BTCAT / TAO liquidity pool with 46.99 TAO from mint

### Phase 4: Marketplace Enhancement

- [ ] Surface on-chain rarity data in marketplace listings and token pages
- [ ] On-chain activity feed with real-time sale and listing events
- [ ] Trait-based search and filtering in collection explorer
- [ ] Improved analytics: volume, floor history, wallet holdings

### Phase 5: Ecosystem Integration

- [ ] Integration with Bittensor EVM wallets and explorers
- [ ] Community governance proposals for treasury usage
- [ ] Collaborations with other Bittensor subnet projects
- [ ] Exploration of cross-subnet utility for TAO CAT holders

---

## 13. Contract Addresses

All contracts are deployed on **Bittensor EVM (Chain ID: 964)**.

| Contract | Address |
|----------|---------|
| TAO CAT NFT (TCAT) | `0x2797341aaceAA2cE87D226E41B2fb8800FEE5184` |
| Rarity Registry | `0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9` |
| MarketV2 | `0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475` |
| Simple Market | `0xfFF9F5eD81f805da27c022290C188eb6Fa3Ac7dE` |
| $BTCAT Token | `0x5246088E136F44c739bDBeade6b638697b88B073` |

Block Explorer: https://evm-explorer.tao.network

Website: https://taocats.fun

Source: https://github.com/dudelynft-dotcom/TAOCATS

---

## 14. Disclaimer

TAO CAT is an experimental digital collectible project. The NFTs described in this document are not financial instruments, securities, or investment contracts. Holding a TAO CAT token does not represent ownership in any company or legal entity, and does not carry any rights to dividends, profits, or future revenue.

The $BTCAT token described herein is a community token with no guaranteed monetary value. Secondary market prices for both the NFTs and $BTCAT are determined entirely by market participants and may be zero.

The smart contracts in this project extend OpenZeppelin 5.x libraries and follow established Solidity security practices. However, these contracts have not undergone a formal third-party security audit. Users interact with them at their own risk.

Bittensor EVM is an emerging blockchain network. It may experience network instability, protocol changes, or other events outside the control of the TAO CAT project. The team makes no guarantees regarding uninterrupted availability of the network, this application, or the metadata hosting infrastructure.

Nothing in this document constitutes financial advice. Participants should conduct independent research before minting, trading, or holding any asset described herein.

---

**TAO CAT | taocats.fun | Bittensor EVM (Chain ID: 964)**
