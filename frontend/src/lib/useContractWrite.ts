"use client";
import { useState } from "react";
import { useWalletClient } from "wagmi";
import type { Abi } from "viem";

/**
 * Drop-in replacement for wagmi's useWriteContract that bypasses
 * the automatic simulateContract (eth_call) step — required because
 * the Bittensor EVM RPC returns errors for eth_call simulations.
 *
 * Uses viem walletClient.writeContract directly → goes straight to
 * eth_sendTransaction without any pre-simulation.
 */
export function useContractWrite() {
  const { data: walletClient } = useWalletClient();
  const [isPending, setIsPending]   = useState(false);
  const [data, setData]             = useState<`0x${string}` | undefined>();
  const [error, setError]           = useState<Error | null>(null);

  function reset() {
    setData(undefined);
    setError(null);
    setIsPending(false);
  }

  async function writeContract(params: {
    address:      `0x${string}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    abi:          Abi | readonly any[];
    functionName: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args?:        readonly any[];
    value?:       bigint;
    gas?:         bigint;
  }) {
    if (!walletClient) { setError(new Error("Wallet not connected")); return; }
    try {
      setIsPending(true);
      setError(null);
      setData(undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hash = await (walletClient as any).writeContract({
        ...params,
        gas:     params.gas ?? BigInt(200_000),
        account: walletClient.account,
        chain:   walletClient.chain,
      });
      setData(hash as `0x${string}`);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsPending(false);
    }
  }

  return { writeContract, isPending, data, error, reset };
}
