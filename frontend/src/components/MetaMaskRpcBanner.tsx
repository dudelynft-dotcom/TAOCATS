"use client";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const TESTNET_PROXY  = "https://taocats.fun/api/rpc?net=test";
const MAINNET_PROXY  = "https://taocats.fun/api/rpc?net=main";
const TESTNET_ID_HEX = "0x3B1"; // 945
const MAINNET_ID_HEX = "0x3C4"; // 964

/**
 * Shown to MetaMask users. Offers to reconfigure the Bittensor chain RPC
 * to our proxy, which handles eth_call/eth_estimateGas failures gracefully.
 * Without this, MetaMask blocks transactions because the Bittensor RPC
 * returns "internal error" for eth_call simulation.
 */
export default function MetaMaskRpcBanner() {
  const { isConnected, chainId } = useAccount();
  const [visible, setVisible]   = useState(false);
  const [done, setDone]         = useState(false);

  const isMetaMask = typeof window !== "undefined" && !!(window as any).ethereum?.isMetaMask;
  const isBittensor = chainId === 945 || chainId === 964;

  useEffect(() => {
    if (isConnected && isMetaMask && isBittensor && !done) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [isConnected, isMetaMask, isBittensor, done]);

  async function fixRpc() {
    const win = window as any;
    if (!win.ethereum) return;

    const isTestnet = chainId === 945;
    try {
      await win.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: isTestnet ? TESTNET_ID_HEX : MAINNET_ID_HEX,
          chainName: isTestnet ? "Bittensor EVM Testnet" : "Bittensor EVM",
          nativeCurrency: { name: "TAO", symbol: "TAO", decimals: 18 },
          rpcUrls: [isTestnet ? TESTNET_PROXY : MAINNET_PROXY],
          blockExplorerUrls: isTestnet ? [] : ["https://evm-explorer.tao.network"],
        }],
      });
      setDone(true);
      setVisible(false);
    } catch {
      // user rejected or already configured — ignore
    }
  }

  if (!visible) return null;

  return (
    <div style={{
      position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)",
      zIndex:9999, background:"#0f1419", color:"#fff",
      padding:"12px 20px", maxWidth:480, width:"calc(100% - 40px)",
      display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
    }}>
      <div style={{ flex:1, fontSize:10, fontWeight:700, lineHeight:1.5 }}>
        MetaMask detected. Bittensor RPC blocks transaction simulation.
        Click Fix to enable transactions.
      </div>
      <button onClick={fixRpc}
        style={{ padding:"8px 18px", background:"#fff", color:"#0f1419",
          border:"none", fontSize:10, fontWeight:800, cursor:"pointer",
          letterSpacing:"0.08em", textTransform:"uppercase", flexShrink:0 }}>
        FIX RPC
      </button>
      <button onClick={() => setVisible(false)}
        style={{ background:"transparent", border:"none", color:"#9aa0ae",
          cursor:"pointer", fontSize:16, padding:"4px" }}>
        ✕
      </button>
    </div>
  );
}
