import { Bot, InlineKeyboard } from "grammy";
import jwt from "jsonwebtoken";
import http from "http";

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;
const VERIFY_URL = process.env.VERIFY_URL ?? "https://staking.taocats.fun/verify";
const KICK_AFTER_MS = 5 * 60 * 1000; // 5 minutes to verify before kick

if (!BOT_TOKEN || !JWT_SECRET) {
  console.error("Missing TELEGRAM_BOT_TOKEN or JWT_SECRET");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ── Track pending users (userId → timer) ─────────────────────────────────────
const pendingUsers = new Map(); // userId → { chatId, timer }

// ── Helper: generate a signed verify link for a user ─────────────────────────
function makeVerifyLink(userId, chatId) {
  const token = jwt.sign({ userId, chatId }, JWT_SECRET, { expiresIn: "24h" });
  return `${VERIFY_URL}?token=${token}`;
}

// ── Helper: kick user from group ─────────────────────────────────────────────
async function kickUser(api, chatId, userId) {
  try {
    await api.banChatMember(chatId, userId);
    // Unban immediately so they can rejoin later after verifying
    await api.unbanChatMember(chatId, userId);
  } catch (e) {
    console.error("Kick failed:", e.message);
  }
}

// ── Mark user as verified (called externally or via bot flow) ─────────────────
export function markVerified(userId) {
  const entry = pendingUsers.get(userId);
  if (entry) {
    clearTimeout(entry.timer);
    pendingUsers.delete(userId);
  }
}

// ── New member joins group ────────────────────────────────────────────────────
bot.on("chat_member", async (ctx) => {
  const update    = ctx.chatMember;
  const oldStatus = update.old_chat_member.status;
  const newStatus = update.new_chat_member.status;
  const user      = update.new_chat_member.user;

  // Only handle fresh joins
  const wasInGroup = ["member", "administrator", "creator", "restricted"].includes(oldStatus);
  const isJoining  = newStatus === "member";
  if (!isJoining || wasInGroup || user.is_bot) return;

  const chatId = ctx.chat.id;
  const userId = user.id;

  // Cancel any existing timer for this user
  const existing = pendingUsers.get(userId);
  if (existing) clearTimeout(existing.timer);

  // Set kick timer — if they don't verify in 5 min, remove them
  const timer = setTimeout(async () => {
    if (pendingUsers.has(userId)) {
      pendingUsers.delete(userId);
      await kickUser(bot.api, chatId, userId);
      console.log(`Kicked unverified user ${userId} from ${chatId}`);
    }
  }, KICK_AFTER_MS);

  pendingUsers.set(userId, { chatId, timer });

  // Send welcome + verify button (NO restriction — they can read but not write until verified)
  const link = makeVerifyLink(userId, chatId);
  const keyboard = new InlineKeyboard().url("🐱 Verify TAO Cat Wallet", link);

  await ctx.reply(
    `👋 Welcome, ${user.first_name}!\n\n` +
    `This group is for verified TAO Cat NFT holders.\n\n` +
    `Connect your wallet to prove you hold at least 1 TAO Cat.\n` +
    `⏳ You have 5 minutes to verify or you'll be removed.`,
    { reply_markup: keyboard }
  );
});

// ── /verified command — called by API webhook after successful verification ───
bot.command("verified", async (ctx) => {
  // This won't be used directly — verification happens via API
});

// ── /chatid command ───────────────────────────────────────────────────────────
bot.command("chatid", (ctx) => ctx.reply(`Chat ID: \`${ctx.chat.id}\``, { parse_mode: "Markdown" }));

// ── /start in DM ─────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  const param  = ctx.match?.trim();
  const chatId = param ? parseInt(param, 10) : null;
  const userId = ctx.from.id;

  if (!chatId || isNaN(chatId)) {
    await ctx.reply(
      "Use the verification link from the TAO CAT group to get started, " +
      "or join the group first."
    );
    return;
  }

  const link     = makeVerifyLink(userId, chatId);
  const keyboard = new InlineKeyboard().url("🐱 Verify Wallet", link);
  await ctx.reply(
    "Click below to connect your wallet and verify your TAO Cat NFT:",
    { reply_markup: keyboard }
  );
});

// ── Error handler ─────────────────────────────────────────────────────────────
bot.catch((err) => {
  console.error("Bot error:", err.message);
});

// ── Internal HTTP server so the verify API can cancel kick timers ─────────────
// POST http://localhost:3001/verified  body: { userId, secret }
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? JWT_SECRET;
const httpServer = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/verified") {
    res.writeHead(404); res.end(); return;
  }
  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    try {
      const { userId, secret } = JSON.parse(body);
      if (secret !== INTERNAL_SECRET) { res.writeHead(403); res.end(); return; }
      const entry = pendingUsers.get(Number(userId));
      if (entry) {
        clearTimeout(entry.timer);
        pendingUsers.delete(Number(userId));
        console.log(`Verified signal received — kick timer cleared for user ${userId}`);
      }
      res.writeHead(200); res.end("ok");
    } catch { res.writeHead(400); res.end(); }
  });
});
httpServer.listen(3001, () => console.log("Internal webhook listening on :3001"));

// ── Start ─────────────────────────────────────────────────────────────────────
console.log("TAO CAT verify bot starting…");
bot.start({
  allowed_updates: ["chat_member", "message"],
});
