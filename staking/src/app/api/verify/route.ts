import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createPublicClient, http, verifyMessage } from "viem";
import { defineChain } from "viem";

// ── Chain 964 ─────────────────────────────────────────────────────────────────
const subtensor = defineChain({
  id: 964,
  name: "Bittensor EVM",
  nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 },
  rpcUrls: { default: { http: ["https://lite.chain.opentensor.ai"] } },
});

const publicClient = createPublicClient({
  chain: subtensor,
  transport: http("https://lite.chain.opentensor.ai"),
});

const NFT_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const STAKING_ABI = [
  {
    name: "stakedTokensOf",
    type: "function",
    stateMutability: "view",
    inputs:  [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
] as const;

// ── JWT verify (no external dep — pure Node crypto) ───────────────────────────
function verifyJWT(token: string): { userId: number; chatId: number } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (sig !== expected) return null;

  let data: any;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  if (!data.userId || !data.chatId) return null;

  return { userId: data.userId, chatId: data.chatId };
}

// ── Unrestrict user in Telegram group ─────────────────────────────────────────
async function unrestrictUser(userId: number, chatId: number): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/restrictChatMember`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        permissions: {
          can_send_messages:        true,
          can_send_audios:          true,
          can_send_documents:       true,
          can_send_photos:          true,
          can_send_videos:          true,
          can_send_video_notes:     true,
          can_send_voice_notes:     true,
          can_send_polls:           true,
          can_send_other_messages:  true,
          can_add_web_page_previews:true,
          can_change_info:          false,
          can_invite_users:         true,
          can_pin_messages:         false,
        },
      }),
    }
  );
  const json = await res.json();
  return json.ok === true;
}

// ── POST /api/verify ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { token, address, signature } = body ?? {};
  if (!address || !signature) {
    return NextResponse.json({ error: "Missing address or signature." }, { status: 400 });
  }

  // 1. Verify JWT (optional — only needed for bot flow)
  let decoded: { userId: number; chatId: number } | null = null;
  if (token) {
    decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: "Verification link expired. Request a new one in Telegram." }, { status: 401 });
    }
  }
  const { userId, chatId } = decoded ?? { userId: 0, chatId: 0 };

  // 2. Verify wallet signature
  const message = `Verify TAO Cat NFT ownership\n\nWallet: ${address}\nToken: ${token ?? ""}`;
  let valid = false;
  try {
    valid = await verifyMessage({ address: address as `0x${string}`, message, signature });
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  if (!valid) {
    return NextResponse.json({ error: "Signature does not match wallet address." }, { status: 401 });
  }

  // 3. Check NFT balance — wallet holdings + staked NFTs both count
  const nftAddress     = process.env.NEXT_PUBLIC_NFT_ADDRESS     as `0x${string}`;
  const stakingAddress = process.env.NEXT_PUBLIC_STAKING_ADDRESS as `0x${string}`;
  if (!nftAddress) {
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  let walletBalance: bigint = 0n;
  let stakedCount:   bigint = 0n;

  try {
    walletBalance = await publicClient.readContract({
      address: nftAddress, abi: NFT_ABI,
      functionName: "balanceOf", args: [address as `0x${string}`],
    });
  } catch {
    return NextResponse.json({ error: "Could not read NFT balance. Try again." }, { status: 502 });
  }

  // Also check staked count if staking contract is configured
  if (stakingAddress) {
    try {
      const staked = await publicClient.readContract({
        address: stakingAddress, abi: STAKING_ABI,
        functionName: "stakedTokensOf", args: [address as `0x${string}`],
      });
      stakedCount = BigInt((staked as any[]).length);
    } catch { /* staking check is best-effort */ }
  }

  const totalOwned = walletBalance + stakedCount;

  if (totalOwned === 0n) {
    return NextResponse.json(
      { error: "No TAO Cat NFTs found in this wallet (held or staked). Buy or mint one at taocats.fun/mint" },
      { status: 403 }
    );
  }

  // 4. Unrestrict in Telegram (only when coming from bot link with valid userId/chatId)
  if (userId && chatId) {
    const ok = await unrestrictUser(userId, chatId);
    if (!ok) {
      return NextResponse.json(
        { error: "NFT verified but Telegram unrestrict failed. Contact an admin." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    balance: totalOwned.toString(),
    groupLink: process.env.TG_GROUP_LINK ?? "",
  });
}
