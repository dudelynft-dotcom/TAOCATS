import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db";
import { startIndexer } from "./indexer";
import routes from "./routes";

const PORT = parseInt(process.env.PORT ?? "3001");

async function main() {
  // Init database
  initDb();
  console.log("[db] Initialized");

  // Start event indexer
  startIndexer().catch(console.error);

  // HTTP API
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api", routes);

  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.listen(PORT, () => {
    console.log(`[api] Listening on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
