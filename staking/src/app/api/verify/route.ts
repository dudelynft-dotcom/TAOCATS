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

// ── Generate single-use invite link ───────────────────────────────────────────
async function createSingleUseInviteLink(): Promise<string | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TG_CHAT_ID; // numeric chat ID of the private group
  if (!botToken || !chatId) return null;

  const expireDate = Math.floor(Date.now() / 1000) + 86_400; // 24h from now
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/createChatInviteLink`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:      chatId,
        expire_date:  expireDate,
        member_limit: 1, // single-use — can't be forwarded
      }),
    }
  );
  const json = await res.json();
  return json.ok ? json.result.invite_link : null;
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
  const { userId } = decoded ?? { userId: 0 };

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

  // 4. Signal bot to cancel kick timer (best-effort, never fail the response)
  if (userId) {
    try {
      const botWebhook = process.env.BOT_INTERNAL_URL ?? "http://localhost:3001";
      await fetch(`${botWebhook}/verified`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, secret: process.env.JWT_SECRET }),
      });
    } catch { /* bot might not be running — ignore */ }
  }

  // 5. Generate single-use invite link (falls back to static link if not configured)
  const singleUseLink = await createSingleUseInviteLink();
  const groupLink = singleUseLink ?? process.env.TG_GROUP_LINK ?? "";

  return NextResponse.json({
    ok: true,
    balance: totalOwned.toString(),
    groupLink,
  });
}
