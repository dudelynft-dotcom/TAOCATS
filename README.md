# TAO BEAR 🐻

**1969 generative bear NFTs on TAO EVM**
**$3.33 mint | No whitelist | 100% fees → $BEAR liquidity**

---

## Project Structure

```
TAO BEAR/
├── contracts/          ← Solidity smart contracts (Hardhat)
│   ├── TaoBearNFT.sol       ERC-721, 1969 supply, $3.33 mint
│   ├── BearMarketplace.sol  P2P trading, 2.5% fee → $BEAR liquidity
│   └── BearToken.sol        $BEAR ERC-20, 100% to NFT holders
├── frontend/           ← Next.js 14 dApp
│   ├── /               Home page
│   ├── /mint           Mint page
│   ├── /marketplace    Trade page
│   └── /dashboard      Portfolio page
└── art-generator/      ← Python generative art engine
```

## Quick Start

### 1. Contracts
```bash
cd contracts
npm install
cp .env.example .env   # fill in your keys
npx hardhat compile
npx hardhat run scripts/deploy.ts --network taoTestnet
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in contract addresses
npm run dev
```

### 3. Art
```bash
cd art-generator
pip install Pillow
# Add your trait PNGs to layers/ (see README_ART.md)
python generate.py
# Upload output/ to IPFS via Pinata
```

## Tokenomics

| Item | Amount |
|------|--------|
| NFT Supply | 1,969 |
| Mint Price | $3.33 (in TAO) |
| Total Mint Revenue | ~$6,526 |
| Team Allocation | 0% |
| $BEAR to NFT Holders | 100% |
| Marketplace Fee | 2.5% → $BEAR liquidity |

## Roadmap

1. Art creation & trait design
2. Deploy contracts to TAO EVM testnet
3. Upload art to IPFS
4. Launch mint — no whitelist
5. Reveal art after sellout
6. Seed $BEAR/TAO liquidity pool with mint fees
7. Airdrop $BEAR to all NFT holders
8. DAO governance for NFT holders
