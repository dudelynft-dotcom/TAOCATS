import { createPublicClient, http, parseAbiItem, type Address, type Log } from "viem";
import { db } from "./db";
import { MARKETPLACE_ABI, ERC721_ABI } from "./abis";

const USE_TESTNET = process.env.USE_TESTNET === "true";
const RPC_URL = USE_TESTNET
  ? (process.env.TESTNET_RPC_URL ?? "https://test.chain.opentensor.ai")
  : (process.env.RPC_URL ?? "https://lite.chain.opentensor.ai");

const CHAIN_ID   = USE_TESTNET ? 945 : 964;
const CHAIN_NAME = USE_TESTNET ? "Bittensor Testnet" : "Bittensor EVM";

const MARKETPLACE = (process.env.MARKETPLACE_ADDRESS ?? "") as Address;
const TAO_CATS    = (process.env.TAO_CATS_ADDRESS ?? "") as Address;

const client = createPublicClient({
  chain: { id: CHAIN_ID, name: CHAIN_NAME, nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 }, rpcUrls: { default: { http: [RPC_URL] } } },
  transport: http(RPC_URL),
});

// ── DB helpers ──────────────────────────────────────────────────────────────

function getState(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM indexer_state WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

function setState(key: string, value: string) {
  db.prepare("INSERT OR REPLACE INTO indexer_state(key, value) VALUES(?,?)").run(key, value);
}

function upsertCollection(address: string, name?: string, symbol?: string) {
  db.prepare(`
    INSERT INTO collections(address, name, symbol)
    VALUES(?, ?, ?)
    ON CONFLICT(address) DO UPDATE SET
      name   = COALESCE(excluded.name, name),
      symbol = COALESCE(excluded.symbol, symbol)
  `).run(address.toLowerCase(), name ?? null, symbol ?? null);
}

async function fetchCollectionMeta(address: Address) {
  try {
    const [name, symbol] = await Promise.all([
      client.readContract({ address, abi: ERC721_ABI as any, functionName: "name" }).catch(() => "Unknown"),
      client.readContract({ address, abi: ERC721_ABI as any, functionName: "symbol" }).catch(() => "???"),
    ]);
    return { name: name as string, symbol: symbol as string };
  } catch {
    return { name: "Unknown", symbol: "???" };
  }
}

// ── Event handlers ───────────────────────────────────────────────────────────

function handleListed(log: any) {
  const { collection, tokenId, seller, price } = log.args;
  const col = collection.toLowerCase();
  upsertCollection(col);
  db.prepare(`
    INSERT OR REPLACE INTO listings(collection, token_id, seller, price, active, listed_at)
    VALUES(?, ?, ?, ?, 1, unixepoch())
  `).run(col, tokenId.toString(), seller.toLowerCase(), price.toString());
  updateFloor(col);
}

function handleDelisted(log: any) {
  const { collection, tokenId } = log.args;
  const col = collection.toLowerCase();
  db.prepare("UPDATE listings SET active=0 WHERE collection=? AND token_id=?")
    .run(col, tokenId.toString());
  updateFloor(col);
}

function handleSold(log: any) {
  const { collection, tokenId, seller, buyer, price, fee } = log.args;
  const col = collection.toLowerCase();
  db.prepare("UPDATE listings SET active=0 WHERE collection=? AND token_id=?")
    .run(col, tokenId.toString());
  db.prepare(`
    INSERT INTO sales(collection, token_id, seller, buyer, price, fee, tx_hash, block_num)
    VALUES(?,?,?,?,?,?,?,?)
  `).run(col, tokenId.toString(), seller.toLowerCase(), buyer.toLowerCase(),
     price.toString(), fee.toString(), log.transactionHash ?? "", Number(log.blockNumber ?? 0));
  // Update volume
  db.prepare(`
    UPDATE collections SET
      volume      = CAST(CAST(volume AS INTEGER) + ? AS TEXT),
      sales_count = sales_count + 1
    WHERE address = ?
  `).run(price.toString(), col);
  updateFloor(col);
  // Update ownership
  db.prepare(`
    INSERT OR REPLACE INTO nft_owners(collection, token_id, owner, updated_at)
    VALUES(?,?,?,unixepoch())
  `).run(col, tokenId.toString(), buyer.toLowerCase());
}

function handlePriceUpdated(log: any) {
  const { collection, tokenId, newPrice } = log.args;
  const col = collection.toLowerCase();
  db.prepare("UPDATE listings SET price=? WHERE collection=? AND token_id=? AND active=1")
    .run(newPrice.toString(), col, tokenId.toString());
  updateFloor(col);
}

function handleOfferMade(log: any) {
  const { collection, tokenId, buyer, price, expiry } = log.args;
  const col = collection.toLowerCase();
  // Get offer index from current count
  const cnt = (db.prepare("SELECT COUNT(*) as c FROM nft_offers WHERE collection=? AND token_id=?")
    .get(col, tokenId.toString()) as { c: number }).c;
  db.prepare(`
    INSERT INTO nft_offers(collection, token_id, buyer, price, expiry, offer_index)
    VALUES(?,?,?,?,?,?)
  `).run(col, tokenId.toString(), buyer.toLowerCase(), price.toString(), Number(expiry), cnt);
}

function handleOfferCancelled(log: any) {
  const { collection, tokenId, offerIndex } = log.args;
  db.prepare("UPDATE nft_offers SET active=0 WHERE collection=? AND token_id=? AND offer_index=?")
    .run(collection.toLowerCase(), tokenId.toString(), Number(offerIndex));
}

function handleOfferAccepted(log: any) {
  const { collection, tokenId } = log.args;
  db.prepare("UPDATE nft_offers SET active=0 WHERE collection=? AND token_id=?")
    .run(collection.toLowerCase(), tokenId.toString());
}

function handleCollectionOfferMade(log: any) {
  const { collection, buyer, price, expiry } = log.args;
  const col = collection.toLowerCase();
  const cnt = (db.prepare("SELECT COUNT(*) as c FROM collection_offers WHERE collection=?")
    .get(col) as { c: number }).c;
  db.prepare(`
    INSERT INTO collection_offers(collection, buyer, price, expiry, offer_index)
    VALUES(?,?,?,?,?)
  `).run(col, buyer.toLowerCase(), price.toString(), Number(expiry), cnt);
}

function handleCollectionOfferCancelled(log: any) {
  const { collection, offerIndex } = log.args;
  db.prepare("UPDATE collection_offers SET active=0 WHERE collection=? AND offer_index=?")
    .run(collection.toLowerCase(), Number(offerIndex));
}

function handleCollectionOfferAccepted(log: any) {
  const { collection, tokenId, seller, buyer, price } = log.args;
  const col = collection.toLowerCase();
  // Deactivate the accepted offer (first active offer for this buyer/price)
  db.prepare(`
    UPDATE collection_offers SET active=0
    WHERE collection=? AND buyer=? AND price=? AND active=1
    LIMIT 1
  `).run(col, buyer.toLowerCase(), price.toString());
  // Update ownership
  db.prepare(`
    INSERT OR REPLACE INTO nft_owners(collection, token_id, owner, updated_at)
    VALUES(?,?,?,unixepoch())
  `).run(col, tokenId.toString(), buyer.toLowerCase());
}

// Transfer event: track ownership for all known collections
async function handleTransfer(log: any, collectionAddress: string) {
  const { from, to, tokenId } = log.args;
  if (from === "0x0000000000000000000000000000000000000000") {
    // Mint — register new collection if unknown
    const col = collectionAddress.toLowerCase();
    const exists = db.prepare("SELECT 1 FROM collections WHERE address=?").get(col);
    if (!exists) {
      const meta = await fetchCollectionMeta(collectionAddress as Address);
      upsertCollection(col, meta.name, meta.symbol);
    }
  }
  if (to && tokenId !== undefined) {
    db.prepare(`
      INSERT OR REPLACE INTO nft_owners(collection, token_id, owner, updated_at)
      VALUES(?,?,?,unixepoch())
    `).run(collectionAddress.toLowerCase(), tokenId.toString(), to.toLowerCase());
  }
}

function updateFloor(collection: string) {
  const row = db.prepare(`
    SELECT MIN(CAST(price AS INTEGER)) as floor
    FROM listings WHERE collection=? AND active=1
  `).get(collection) as { floor: number | null };
  db.prepare("UPDATE collections SET floor_price=? WHERE address=?")
    .run(row.floor ? row.floor.toString() : "0", collection);
}

// ── Volume snapshots (for trending) ─────────────────────────────────────────

function snapshotVolumes() {
  const cols = db.prepare("SELECT address, volume, sales_count FROM collections").all() as any[];
  const stmt = db.prepare(`
    INSERT INTO volume_snapshots(collection, volume, sales_count)
    VALUES(?,?,?)
  `);
  const insertMany = db.transaction((rows: any[]) => {
    for (const r of rows) stmt.run(r.address, r.volume, r.sales_count);
  });
  insertMany(cols);
}

// ── Main polling loop ────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 12_000; // 12s
const BATCH_SIZE       = 500;

export async function startIndexer() {
  if (!MARKETPLACE) {
    console.warn("[indexer] MARKETPLACE_ADDRESS not set, skipping");
    return;
  }

  // Ensure TAO Cats is pre-registered
  if (TAO_CATS) upsertCollection(TAO_CATS.toLowerCase(), "TAO CAT", "TCAT");

  console.log(`[indexer] Starting on ${CHAIN_NAME} | Marketplace: ${MARKETPLACE}`);

  let lastBlock = BigInt(getState("last_block") ?? "0");
  if (lastBlock === 0n) {
    const current = await client.getBlockNumber();
    lastBlock = current - 5000n; // start ~5000 blocks back
    setState("last_block", lastBlock.toString());
  }

  // Hourly snapshot
  setInterval(snapshotVolumes, 60 * 60 * 1000);

  async function poll() {
    try {
      const latest = await client.getBlockNumber();
      if (latest <= lastBlock) return;

      const fromBlock = lastBlock + 1n;
      const toBlock   = fromBlock + BigInt(BATCH_SIZE) > latest ? latest : fromBlock + BigInt(BATCH_SIZE);

      // Fetch marketplace logs
      const logs = await client.getLogs({
        address: MARKETPLACE,
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        try {
          // Decode with viem
          const decoded = decodeMarketplaceLog(log);
          if (!decoded) continue;
          switch (decoded.eventName) {
            case "Listed":               handleListed(decoded); break;
            case "Delisted":             handleDelisted(decoded); break;
            case "Sold":                 handleSold(decoded); break;
            case "PriceUpdated":         handlePriceUpdated(decoded); break;
            case "OfferMade":            handleOfferMade(decoded); break;
            case "OfferCancelled":       handleOfferCancelled(decoded); break;
            case "OfferAccepted":        handleOfferAccepted(decoded); break;
            case "CollectionOfferMade":  handleCollectionOfferMade(decoded); break;
            case "CollectionOfferCancelled": handleCollectionOfferCancelled(decoded); break;
            case "CollectionOfferAccepted":  handleCollectionOfferAccepted(decoded); break;
          }
        } catch (e) {
          // skip malformed
        }
      }

      lastBlock = toBlock;
      setState("last_block", lastBlock.toString());
      if (logs.length > 0) console.log(`[indexer] Block ${fromBlock}-${toBlock}: ${logs.length} events`);

    } catch (e) {
      console.error("[indexer] poll error:", e);
    }
  }

  // Kick off immediately
  poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

// ── Log decoder ──────────────────────────────────────────────────────────────

import { decodeEventLog } from "viem";

function decodeMarketplaceLog(log: Log) {
  for (const abiItem of MARKETPLACE_ABI) {
    try {
      const decoded = decodeEventLog({ abi: [abiItem] as any, data: log.data, topics: log.topics });
      return decoded;
    } catch {
      // try next
    }
  }
  return null;
}
