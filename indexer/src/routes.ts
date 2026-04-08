import { Router } from "express";
import { db } from "./db";
import { formatEther } from "viem";

const router = Router();

function fmt(wei: string): string {
  try { return parseFloat(formatEther(BigInt(wei))).toFixed(4); }
  catch { return "0"; }
}

// ── Collections ──────────────────────────────────────────────────────────────

// GET /collections?page=0&limit=50&sort=volume|floor|sales|new
router.get("/collections", (req, res) => {
  const page  = parseInt(req.query.page as string)  || 0;
  const limit = parseInt(req.query.limit as string) || 50;
  const sort  = (req.query.sort as string) || "volume";

  const orderMap: Record<string, string> = {
    volume: "CAST(volume AS INTEGER) DESC",
    floor:  "CAST(floor_price AS INTEGER) ASC",
    sales:  "sales_count DESC",
    new:    "first_seen DESC",
  };
  const order = orderMap[sort] ?? orderMap.volume;

  const rows = db.prepare(`
    SELECT *, CAST(volume AS INTEGER) as vol_num
    FROM collections WHERE spam = 0
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(limit, page * limit) as any[];

  res.json(rows.map(r => ({
    address:    r.address,
    name:       r.name ?? "Unknown",
    symbol:     r.symbol ?? "???",
    verified:   !!r.verified,
    floor:      fmt(r.floor_price),
    volume:     fmt(r.volume),
    salesCount: r.sales_count,
    ownerCount: r.owner_count,
  })));
});

// GET /collections/:address
router.get("/collections/:address", (req, res) => {
  const addr = req.params.address.toLowerCase();
  const col  = db.prepare("SELECT * FROM collections WHERE address=?").get(addr) as any;
  if (!col) return res.status(404).json({ error: "Not found" });

  const listedCount = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE collection=? AND active=1").get(addr) as any).c;
  const ownerCount  = (db.prepare("SELECT COUNT(DISTINCT owner) as c FROM nft_owners WHERE collection=?").get(addr) as any).c;

  res.json({
    address:    col.address,
    name:       col.name ?? "Unknown",
    symbol:     col.symbol ?? "???",
    verified:   !!col.verified,
    floor:      fmt(col.floor_price),
    volume:     fmt(col.volume),
    salesCount: col.sales_count,
    listedCount,
    ownerCount,
  });
});

// GET /collections/:address/listings?page=0&limit=50&sort=price_asc|price_desc|id_asc
router.get("/collections/:address/listings", (req, res) => {
  const addr  = req.params.address.toLowerCase();
  const page  = parseInt(req.query.page as string)  || 0;
  const limit = parseInt(req.query.limit as string) || 50;
  const sort  = (req.query.sort as string) || "price_asc";

  const orderMap: Record<string, string> = {
    price_asc:  "CAST(price AS INTEGER) ASC",
    price_desc: "CAST(price AS INTEGER) DESC",
    id_asc:     "CAST(token_id AS INTEGER) ASC",
    id_desc:    "CAST(token_id AS INTEGER) DESC",
  };
  const order = orderMap[sort] ?? orderMap.price_asc;

  const rows = db.prepare(`
    SELECT token_id, seller, price FROM listings
    WHERE collection=? AND active=1
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(addr, limit, page * limit) as any[];

  res.json(rows.map(r => ({
    tokenId: r.token_id,
    seller:  r.seller,
    price:   fmt(r.price),
    priceWei: r.price,
  })));
});

// GET /collections/:address/activity?limit=50
router.get("/collections/:address/activity", (req, res) => {
  const addr  = req.params.address.toLowerCase();
  const limit = parseInt(req.query.limit as string) || 50;
  const rows  = db.prepare(`
    SELECT token_id, seller, buyer, price, fee, tx_hash, sold_at
    FROM sales WHERE collection=? ORDER BY sold_at DESC LIMIT ?
  `).all(addr, limit) as any[];
  res.json(rows.map(r => ({ ...r, price: fmt(r.price), fee: fmt(r.fee) })));
});

// GET /collections/:address/offers?type=nft|collection
router.get("/collections/:address/offers", (req, res) => {
  const addr = req.params.address.toLowerCase();
  const type = req.query.type as string;
  const now  = Math.floor(Date.now() / 1000);

  if (type === "collection") {
    const rows = db.prepare(`
      SELECT * FROM collection_offers
      WHERE collection=? AND active=1 AND expiry > ?
      ORDER BY CAST(price AS INTEGER) DESC
    `).all(addr, now) as any[];
    return res.json(rows.map(r => ({ ...r, price: fmt(r.price) })));
  }

  // Default: nft offers for specific token
  const tokenId = req.query.tokenId as string;
  if (!tokenId) return res.status(400).json({ error: "tokenId required for nft offers" });
  const rows = db.prepare(`
    SELECT * FROM nft_offers
    WHERE collection=? AND token_id=? AND active=1 AND expiry > ?
    ORDER BY CAST(price AS INTEGER) DESC
  `).all(addr, tokenId, now) as any[];
  res.json(rows.map(r => ({ ...r, price: fmt(r.price) })));
});

// ── Trending ─────────────────────────────────────────────────────────────────

// GET /trending?window=1h|6h|24h&limit=10
router.get("/trending", (req, res) => {
  const windowH = req.query.window === "6h" ? 6 : req.query.window === "24h" ? 24 : 1;
  const limit   = parseInt(req.query.limit as string) || 10;
  const since   = Math.floor(Date.now() / 1000) - windowH * 3600;

  // Volume delta in window
  const rows = db.prepare(`
    SELECT s.collection, COUNT(*) as trade_count, SUM(CAST(s.price AS INTEGER)) as window_vol
    FROM sales s
    WHERE s.sold_at >= ?
    GROUP BY s.collection
    ORDER BY window_vol DESC
    LIMIT ?
  `).all(since, limit) as any[];

  const result = rows.map(r => {
    const col = db.prepare("SELECT * FROM collections WHERE address=?").get(r.collection) as any;
    return {
      address:     r.collection,
      name:        col?.name ?? "Unknown",
      symbol:      col?.symbol ?? "???",
      verified:    !!col?.verified,
      floor:       fmt(col?.floor_price ?? "0"),
      windowVolume: fmt(r.window_vol.toString()),
      tradeCount:  r.trade_count,
    };
  });
  res.json(result);
});

// ── Top collections ───────────────────────────────────────────────────────────

// GET /top?sort=volume|floor|sales&limit=10
router.get("/top", (req, res) => {
  const sort  = (req.query.sort as string) || "volume";
  const limit = parseInt(req.query.limit as string) || 10;
  const orderMap: Record<string, string> = {
    volume: "CAST(volume AS INTEGER) DESC",
    floor:  "CAST(floor_price AS INTEGER) DESC",
    sales:  "sales_count DESC",
  };
  const rows = db.prepare(`
    SELECT * FROM collections WHERE spam=0
    ORDER BY ${orderMap[sort] ?? orderMap.volume}
    LIMIT ?
  `).all(limit) as any[];
  res.json(rows.map(r => ({
    address:    r.address,
    name:       r.name ?? "Unknown",
    symbol:     r.symbol ?? "???",
    verified:   !!r.verified,
    floor:      fmt(r.floor_price),
    volume:     fmt(r.volume),
    salesCount: r.sales_count,
  })));
});

// ── User portfolio ────────────────────────────────────────────────────────────

// GET /portfolio/:address?page=0&limit=50
router.get("/portfolio/:address", (req, res) => {
  const wallet = req.params.address.toLowerCase();
  const page   = parseInt(req.query.page as string)  || 0;
  const limit  = parseInt(req.query.limit as string) || 50;

  const owned = db.prepare(`
    SELECT n.collection, n.token_id, c.name, c.symbol, c.floor_price, c.verified,
           l.price as listed_price, l.active as is_listed
    FROM nft_owners n
    LEFT JOIN collections c ON c.address = n.collection
    LEFT JOIN listings l ON l.collection = n.collection AND l.token_id = n.token_id AND l.active = 1
    WHERE n.owner = ?
    LIMIT ? OFFSET ?
  `).all(wallet, limit, page * limit) as any[];

  // Portfolio value = sum of floor prices
  const totalValue = owned.reduce((acc: number, r: any) => {
    return acc + (r.floor_price ? parseInt(r.floor_price) : 0);
  }, 0);

  res.json({
    address:       wallet,
    totalItems:    owned.length,
    portfolioWei:  totalValue.toString(),
    portfolioTao:  fmt(totalValue.toString()),
    items: owned.map(r => ({
      collection:  r.collection,
      tokenId:     r.token_id,
      name:        r.name ?? "Unknown",
      symbol:      r.symbol ?? "???",
      verified:    !!r.verified,
      floor:       fmt(r.floor_price ?? "0"),
      isListed:    !!r.is_listed,
      listPrice:   r.listed_price ? fmt(r.listed_price) : null,
    })),
  });
});

// GET /portfolio/:address/offers  — offers made/received by this wallet
router.get("/portfolio/:address/offers", (req, res) => {
  const wallet = req.params.address.toLowerCase();
  const now    = Math.floor(Date.now() / 1000);

  const made = db.prepare(`
    SELECT 'nft' as type, collection, token_id, price, expiry FROM nft_offers
    WHERE buyer=? AND active=1 AND expiry > ?
    UNION ALL
    SELECT 'collection' as type, collection, null, price, expiry FROM collection_offers
    WHERE buyer=? AND active=1 AND expiry > ?
  `).all(wallet, now, wallet, now) as any[];

  res.json({ made: made.map(r => ({ ...r, price: fmt(r.price) })) });
});

// ── Stats ────────────────────────────────────────────────────────────────────

router.get("/stats", (_req, res) => {
  const totalCollections = (db.prepare("SELECT COUNT(*) as c FROM collections WHERE spam=0").get() as any).c;
  const totalListings    = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE active=1").get() as any).c;
  const totalSales       = (db.prepare("SELECT COUNT(*) as c FROM sales").get() as any).c;
  const totalVolumeRow   = db.prepare("SELECT SUM(CAST(price AS INTEGER)) as v FROM sales").get() as any;

  res.json({
    totalCollections,
    totalListings,
    totalSales,
    totalVolumeTao: fmt((totalVolumeRow.v ?? 0).toString()),
  });
});

export default router;
