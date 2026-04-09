import { Bot, InlineKeyboard } from "grammy";
import jwt from "jsonwebtoken";

const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;
const VERIFY_URL = process.env.VERIFY_URL ?? "https://staking.taocats.fun/verify";

if (!BOT_TOKEN || !JWT_SECRET) {
  console.error("Missing TELEGRAM_BOT_TOKEN or JWT_SECRET");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ── Helper: generate a signed verify link for a user ─────────────────────────
function makeVerifyLink(userId, chatId) {
  const token = jwt.sign({ userId, chatId }, JWT_SECRET, { expiresIn: "24h" });
  return `${VERIFY_URL}?token=${token}`;
}

// ── Helper: restrict a new member (no send rights) ───────────────────────────
async function restrictUser(api, chatId, userId) {
  await api.restrictChatMember(chatId, userId, {
    permissions: {
      can_send_messages:       false,
      can_send_audios:         false,
      can_send_documents:      false,
      can_send_photos:         false,
      can_send_videos:         false,
      can_send_video_notes:    false,
      can_send_voice_notes:    false,
      can_send_polls:          false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info:         false,
      can_invite_users:        false,
      can_pin_messages:        false,
    },
  });
}

// ── New member joins group ────────────────────────────────────────────────────
bot.on("chat_member", async (ctx) => {
  const update    = ctx.chatMember;
  const oldStatus = update.old_chat_member.status;
  const newStatus = update.new_chat_member.status;
  const user      = update.new_chat_member.user;

  // Only handle fresh joins (not re-joins of existing members or admins)
  const wasInGroup = ["member", "administrator", "creator", "restricted"].includes(oldStatus);
  const isJoining  = newStatus === "member";
  if (!isJoining || wasInGroup || user.is_bot) return;

  const chatId = ctx.chat.id;
  const userId = user.id;

  try {
    await restrictUser(ctx.api, chatId, userId);
  } catch {
    // Bot might not have admin rights yet — still send the link
  }

  const link = makeVerifyLink(userId, chatId);
  const keyboard = new InlineKeyboard().url("🐱 Verify TAO Cat Wallet", link);

  await ctx.reply(
    `👋 Welcome, ${user.first_name}!\n\n` +
    `This group is for verified TAO Cat NFT holders.\n\n` +
    `Connect your wallet to prove you hold at least 1 TAO Cat and unlock full chat access.`,
    { reply_markup: keyboard }
  );
});

// ── /start in DM (user can also verify via DM) ───────────────────────────────
bot.command("start", async (ctx) => {
  if (ctx.chat.type !== "private") return;

  // token param: /start <encoded_chatId>
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

// ── Start ─────────────────────────────────────────────────────────────────────
console.log("TAO CAT verify bot starting…");
bot.start({
  allowed_updates: ["chat_member", "message"],
});
