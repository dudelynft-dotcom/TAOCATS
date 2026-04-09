"use client";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import type { Abi } from "viem";
import { subtensor } from "./config";

// Thin wrapper around wagmi's useWriteContract so the rest of the app
// doesn't need changing. The key difference from the old walletClient approach:
// wagmi's useWriteContract handles connector/walletClient lifecycle internally,
// so it works correctly after cookie-based reconnect on refresh.
export function useContractWrite() {
  const { writeContractAsync, isPending, data, reset: wagmiReset } = useWriteContract();
  const [error, setError] = useState<Error | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function writeContract(params: { address: `0x${string}`; abi: Abi | readonly any[]; functionName: string; args?: readonly any[]; value?: bigint; gas?: bigint }) {
    setError(null);
    try {
      await writeContractAsync({
        address:      params.address,
        abi:          params.abi as Abi,
        functionName: params.functionName,
        args:         params.args,
        value:        params.value,
        gas:          params.gas ?? BigInt(500_000),
        chainId:      subtensor.id,
      });
    } catch (e) {
      setError(e as Error);
    }
  }

  function reset() {
    wagmiReset();
    setError(null);
  }

  return { writeContract, isPending, data, error, reset };
}
