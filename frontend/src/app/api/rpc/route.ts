import { NextRequest, NextResponse } from "next/server";

const UPSTREAMS: Record<string, string> = {
  test: "https://test.chain.opentensor.ai",
  main: "https://lite.chain.opentensor.ai",
};

export async function POST(req: NextRequest) {
  const net = req.nextUrl.searchParams.get("net") ?? "test";
  const upstream = UPSTREAMS[net] ?? UPSTREAMS.test;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ jsonrpc:"2.0", id:null, error:{ code:-32700, message:"Parse error" } }); }

  const isBatch = Array.isArray(body);
  const requests = isBatch ? (body as unknown[]) : [body];

  const results = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requests.map(async (r: any) => {
      // Bypass eth_estimateGas — always return 500 000 gas to avoid simulation failures
      if (r.method === "eth_estimateGas") {
        return { jsonrpc:"2.0", id:r.id, result:"0x7A120" };
      }

      // For eth_call: try the real RPC first (so reads work), fall back to 0x on internal error
      if (r.method === "eth_call") {
        try {
          const res = await fetch(upstream, {
            method: "POST",
            headers: { "Content-Type":"application/json" },
            body: JSON.stringify(r),
            signal: AbortSignal.timeout(8_000),
          });
          const data = await res.json();
          // If RPC returns internal error (simulation failure), swallow it
          if (data?.error?.code === -32603 || data?.error?.message?.toLowerCase().includes("internal")) {
            return { jsonrpc:"2.0", id:r.id, result:"0x" };
          }
          return data;
        } catch {
          return { jsonrpc:"2.0", id:r.id, result:"0x" };
        }
      }

      // Everything else — forward as-is
      try {
        const res = await fetch(upstream, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify(r),
          signal: AbortSignal.timeout(15_000),
        });
        return await res.json();
      } catch (e) {
        return { jsonrpc:"2.0", id:r.id, error:{ code:-32603, message:"Upstream error", data:String(e) } };
      }
    })
  );

  return NextResponse.json(isBatch ? results : results[0]);
}
