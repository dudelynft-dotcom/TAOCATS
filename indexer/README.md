# TAO Marketplace Indexer

Event-driven indexer + REST API for the TAO Marketplace on Bittensor EVM.

## Setup

```bash
cd indexer
npm install
cp .env.example .env
# Edit .env with your contract addresses
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/collections | List all collections (sort=volume/floor/sales/new) |
| GET | /api/collections/:address | Collection details + stats |
| GET | /api/collections/:address/listings | Active listings (sort=price_asc/desc/id_asc/desc) |
| GET | /api/collections/:address/activity | Sales history |
| GET | /api/collections/:address/offers | NFT or collection offers |
| GET | /api/trending?window=1h/6h/24h | Trending by volume delta |
| GET | /api/top?sort=volume/floor/sales | Top collections all-time |
| GET | /api/portfolio/:wallet | Owned NFTs + portfolio value |
| GET | /api/portfolio/:wallet/offers | Offers made/received |
| GET | /api/stats | Platform-wide stats |
| GET | /health | Health check |
