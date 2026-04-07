# TAO CAT 🐱

**4,699 pixel cat NFTs on Bittensor EVM**
**τ 0.03 mint | No whitelist | Built-in Marketplace**

---

## Project Structure

```
TAO CAT/
├── contracts/          ← Solidity smart contracts (Hardhat)
│   ├── TaoCatNFT.sol        ERC-721, 4699 supply, 0.03 TAO mint
│   ├── CatMarketplace.sol   P2P trading, 2.5% fee
│   └── CatToken.sol         $CAT ERC-20, Community token
├── frontend/           ← Next.js 14 dApp
│   ├── /               Home page
│   ├── /mint           Mint page
│   ├── /marketplace    Trade page
│   └── /dashboard      Portfolio page
└── art-generator/      ← Python art engine
```

## Quick Start

### 1. Contracts
```bash
cd contracts
npm install
cp .env.example .env   # fill in your keys
npx hardhat compile
npx hardhat run scripts/deploy.ts --network subtensor
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
# Add your trait PNGs to layers/
python generate.py
# Upload output/ to IPFS via Pinata
```

## Tokenomics

| Item | Amount |
|------|--------|
| NFT Supply | 4,699 |
| Mint Price | τ 0.03 |
| Team Allocation | 0% |
| Marketplace Fee | 2.5% |

## Roadmap

1. Art creation & trait design
2. Deploy contracts to Bittensor EVM
3. Upload art to IPFS
4. Launch public mint
5. Reveal art after sellout
6. Launch $CAT community token
7. Marketplace activation
