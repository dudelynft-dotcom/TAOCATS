import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? "./indexer.db";

export const db = new Database(path.resolve(DB_PATH));

export function initDb() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Known collections
    CREATE TABLE IF NOT EXISTS collections (
      address     TEXT PRIMARY KEY,
      name        TEXT,
      symbol      TEXT,
      verified    INTEGER DEFAULT 0,
      spam        INTEGER DEFAULT 0,
      floor_price TEXT DEFAULT '0',
      volume      TEXT DEFAULT '0',
      sales_count INTEGER DEFAULT 0,
      owner_count INTEGER DEFAULT 0,
      first_seen  INTEGER DEFAULT (unixepoch())
    );

    -- Active listings
    CREATE TABLE IF NOT EXISTS listings (
      collection  TEXT NOT NULL,
      token_id    TEXT NOT NULL,
      seller      TEXT NOT NULL,
      price       TEXT NOT NULL,
      active      INTEGER DEFAULT 1,
      listed_at   INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (collection, token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_listings_collection ON listings(collection, active);
    CREATE INDEX IF NOT EXISTS idx_listings_price      ON listings(collection, price, active);

    -- Sales history
    CREATE TABLE IF NOT EXISTS sales (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      collection  TEXT NOT NULL,
      token_id    TEXT NOT NULL,
      seller      TEXT NOT NULL,
      buyer       TEXT NOT NULL,
      price       TEXT NOT NULL,
      fee         TEXT NOT NULL,
      tx_hash     TEXT NOT NULL,
      block_num   INTEGER NOT NULL,
      sold_at     INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_sales_collection ON sales(collection);
    CREATE INDEX IF NOT EXISTS idx_sales_buyer      ON sales(buyer);
    CREATE INDEX IF NOT EXISTS idx_sales_seller     ON sales(seller);

    -- NFT Offers
    CREATE TABLE IF NOT EXISTS nft_offers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      collection  TEXT NOT NULL,
      token_id    TEXT NOT NULL,
      buyer       TEXT NOT NULL,
      price       TEXT NOT NULL,
      expiry      INTEGER NOT NULL,
      offer_index INTEGER NOT NULL,
      active      INTEGER DEFAULT 1,
      created_at  INTEGER DEFAULT (unixepoch())
    );

    -- Collection Offers
    CREATE TABLE IF NOT EXISTS collection_offers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      collection  TEXT NOT NULL,
      buyer       TEXT NOT NULL,
      price       TEXT NOT NULL,
      expiry      INTEGER NOT NULL,
      offer_index INTEGER NOT NULL,
      active      INTEGER DEFAULT 1,
      created_at  INTEGER DEFAULT (unixepoch())
    );

    -- Volume snapshots (hourly, for trending)
    CREATE TABLE IF NOT EXISTS volume_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      collection  TEXT NOT NULL,
      volume      TEXT NOT NULL,
      sales_count INTEGER NOT NULL,
      snapshot_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_collection ON volume_snapshots(collection, snapshot_at);

    -- NFT ownership index
    CREATE TABLE IF NOT EXISTS nft_owners (
      collection  TEXT NOT NULL,
      token_id    TEXT NOT NULL,
      owner       TEXT NOT NULL,
      updated_at  INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (collection, token_id)
    );
    CREATE INDEX IF NOT EXISTS idx_owners_owner ON nft_owners(owner);

    -- Indexer state (last processed block per chain)
    CREATE TABLE IF NOT EXISTS indexer_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
