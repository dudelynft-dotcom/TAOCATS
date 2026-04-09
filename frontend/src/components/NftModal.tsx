"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useReadContract, usePublicClient } from "wagmi";
import { CONTRACTS } from "@/lib/config";
import { NFT_ABI } from "@/lib/abis";

const TIER_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  Legendary: { text: "#7c3aed", bg: "#ede9fe", border: "#7c3aed" },
  Epic:      { text: "#1d4ed8", bg: "#dbeafe", border: "#1d4ed8" },
  Rare:      { text: "#059669", bg: "#d4f5e9", border: "#059669" },
  Uncommon:  { text: "#a16207", bg: "#fef3c7", border: "#d97706" },
  Common:    { text: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
};

interface TraitItem { trait: string; value: string; }

// Fallback: deterministic preview traits before reveal
function getPreviewTraits(id: number): TraitItem[] {
  const BACKGROUNDS = ["Void","Sunset","Aurora","Cyber","Forest","Ocean","Desert","Neon","Sakura","Matrix"];
  const BODIES      = ["Tabby","Siamese","Bengal","Persian","Sphynx","Maine Coon","Scottish Fold","Ragdoll"];
  const EYES        = ["Laser","Sleepy","Wide","Sunglasses","Cyclops","Diamond","3D Glasses","Alien"];
  const HATS        = ["None","Cap","Crown","Wizard","Beanie","Top Hat","Halo","Headband","Party"];
  const MOUTHS      = ["Smile","Grumpy","Meow","Drool","Pipe","Gold Tooth","Fangs"];
  const ACCESSORIES = ["None","Gold Chain","Bow Tie","Scarf","Medal","Angel Wings","Devil Horns"];
  const h = (n: number) => Math.abs(((id ^ (n * 2654435761)) >>> 0) % 0xFFFFFF);
  return [
    { trait: "Background", value: BACKGROUNDS[h(1) % BACKGROUNDS.length] },
    { trait: "Body",       value: BODIES[h(2) % BODIES.length] },
    { trait: "Eyes",       value: EYES[h(3) % EYES.length] },
    { trait: "Hat",        value: HATS[h(4) % HATS.length] },
    { trait: "Mouth",      value: MOUTHS[h(5) % MOUTHS.length] },
    { trait: "Accessory",  value: ACCESSORIES[h(6) % ACCESSORIES.length] },
  ];
}

// Resolve IPFS URI to HTTP gateway URL
function ipfsToHttp(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (uri.startsWith("https://")) return uri;
  return uri;
}

interface Props {
  id: number;
  tier?: string;
  rank?: number;
  score?: number;
  price?: bigint;
  seller?: `0x${string}`;
  isConnected?: boolean;
  userAddress?: `0x${string}`;
  onBuy?: () => void;
  onMakeOffer?: (price: string, days: number) => void;
  isBuying?: boolean;
  action?: React.ReactNode;
  onClose: () => void;
}

export default function NftModal({
  id, tier, rank, score, price, seller,
  isConnected, userAddress, onBuy, onMakeOffer, isBuying,
  action, onClose,
}: Props) {
  const [offerOpen, setOfferOpen]     = useState(false);
  const [offerPrice, setOfferPrice]   = useState("");
  const [offerDays, setOfferDays]     = useState("7");
  const [imageUrl, setImageUrl]       = useState<string | null>(null);
  const [realTraits, setRealTraits]   = useState<TraitItem[] | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const publicClient = usePublicClient();

  // Check if collection is revealed
  const { data: revealed } = useReadContract({
    address: CONTRACTS.NFT as `0x${string}`,
    abi: NFT_ABI,
    functionName: "revealed",
  });

  // Fetch real metadata from tokenURI after reveal
  useEffect(() => {
    if (!revealed || !publicClient) return;
    setMetaLoading(true);

    publicClient.readContract({
      address: CONTRACTS.NFT as `0x${string}`,
      abi: NFT_ABI,
      functionName: "tokenURI",
      args: [BigInt(id)],
    }).then(async (uri) => {
      const metaUrl = ipfsToHttp(uri as string);
      if (!metaUrl) return;
      const res = await fetch(metaUrl);
      const data = await res.json();

      // Parse image
      if (data.image) setImageUrl(ipfsToHttp(data.image));

      // Parse attributes
      if (Array.isArray(data.attributes)) {
        const traits: TraitItem[] = data.attributes.map((a: { trait_type?: string; value?: unknown }) => ({
          trait: a.trait_type ?? "Trait",
          value: String(a.value ?? ""),
        }));
        setRealTraits(traits);
      }
    }).catch(() => {
      // Metadata fetch failed — keep placeholder
    }).finally(() => setMetaLoading(false));
  }, [revealed, id, publicClient]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const ts           = tier ? (TIER_STYLE[tier] ?? TIER_STYLE.Common) : null;
  const traits       = realTraits ?? getPreviewTraits(id);
  const isPreview    = !realTraits;
  const priceEth     = price ? parseFloat(formatEther(price)).toFixed(3) : null;
  const isSeller     = !!(seller && userAddress && seller.toLowerCase() === userAddress.toLowerCase());
  const hasActions   = !!(action || price != null);
  const displayImage = imageUrl ?? `/samples/${id % 12 + 1}.png`;

  function submitOffer() {
    if (!offerPrice || !onMakeOffer) return;
    onMakeOffer(offerPrice, parseInt(offerDays));
    setOfferOpen(false);
    setOfferPrice("");
  }

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"20px", overflowY:"auto" }}
      onClick={onClose}>
      <div
        style={{ background:"#fff", width:"100%", maxWidth:480, position:"relative",
          maxHeight:"calc(100vh - 40px)", overflowY:"auto", margin:"auto" }}
        onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 20px", borderBottom:"2px solid #0f1419",
          position:"sticky", top:0, background:"#fff", zIndex:2 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontFamily:"monospace", fontSize:16, fontWeight:800 }}>
              TAO CAT #{id}
            </span>
            {tier && ts && (
              <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px",
                background:ts.bg, color:ts.text, letterSpacing:"0.06em" }}>
                {tier.toUpperCase()}
              </span>
            )}
          </div>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", cursor:"pointer",
              fontSize:22, color:"#0f1419", padding:"0 6px", lineHeight:1, fontWeight:300 }}>
            ×
          </button>
        </div>

        {/* ── IMAGE ── */}
        <div style={{ aspectRatio:"1/1", position:"relative", overflow:"hidden", background:"#f7f8fa" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {revealed && imageUrl ? (
            // After reveal: use real IPFS image via regular <img> (external URL)
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayImage} alt={`TAO Cat #${id}`}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          ) : (
            <Image src={`/samples/${id % 12 + 1}.png`} alt={`TAO Cat #${id}`} fill
              style={{ objectFit:"cover" }} />
          )}
          {rank && (
            <div style={{ position:"absolute", top:0, right:0, padding:"8px 14px",
              background:"rgba(0,0,0,0.88)", color:"#fff", fontSize:13, fontWeight:800,
              letterSpacing:"0.04em" }}>
              RANK #{rank}
            </div>
          )}
          {tier && ts && (
            <div style={{ position:"absolute", bottom:12, left:12, padding:"5px 14px",
              background:ts.bg, color:ts.text, fontSize:10, fontWeight:800,
              letterSpacing:"0.08em", border:`1.5px solid ${ts.border}` }}>
              {tier.toUpperCase()}
            </div>
          )}
          {priceEth && (
            <div style={{ position:"absolute", bottom:12, right:12, padding:"5px 14px",
              background:"#0f1419", color:"#fff", fontSize:13, fontWeight:800,
              fontFamily:"monospace" }}>
              τ {priceEth}
            </div>
          )}
        </div>

        {/* ── RARITY STATS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"#e0e3ea" }}>
          {[
            { l:"TIER",  v: tier  ?? "—",                         color: ts?.text ?? "#0f1419" },
            { l:"RANK",  v: rank  ? `#${rank}`  : "—",            color: "#0f1419" },
            { l:"SCORE", v: score ? score.toLocaleString() : "—", color: "#0f1419" },
          ].map(s => (
            <div key={s.l} style={{ background:"#fff", padding:"14px 16px" }}>
              <div style={{ fontFamily:"monospace", fontSize:15, fontWeight:800, color:s.color }}>{s.v}</div>
              <div style={{ fontSize:8, color:"#9aa0ae", textTransform:"uppercase",
                letterSpacing:"0.10em", marginTop:3, fontWeight:700 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* ── TRAITS ── */}
        <div style={{ padding:"16px 20px", borderTop:"1px solid #f0f1f4" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.12em", color:"#9aa0ae",
              textTransform:"uppercase" }}>TRAITS</div>
            {isPreview && !metaLoading && (
              <span style={{ fontSize:8, fontWeight:700, color:"#f59e0b", letterSpacing:"0.06em",
                background:"#fef3c7", padding:"1px 6px" }}>
                PREVIEW · REVEALS AT MINTOUT
              </span>
            )}
            {metaLoading && (
              <span style={{ fontSize:8, fontWeight:700, color:"#9aa0ae", letterSpacing:"0.06em" }}>
                Loading…
              </span>
            )}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
            {traits.map(t => (
              <div key={t.trait} style={{ border:"1px solid #f0f1f4", padding:"8px 10px",
                background:"#fafafa" }}>
                <div style={{ fontSize:8, fontWeight:700, color:"#9aa0ae",
                  textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:3 }}>
                  {t.trait}
                </div>
                <div style={{ fontSize:11, fontWeight:800, color:"#0f1419" }}>
                  {t.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COLLECTION INFO ── */}
        <div style={{ padding:"8px 20px", background:"#f7f8fa",
          borderTop:"1px solid #f0f1f4", fontSize:9, color:"#9aa0ae",
          fontWeight:700, letterSpacing:"0.10em" }}>
          TAO CATS GENESIS · 4,699 SUPPLY · BITTENSOR EVM
        </div>

        {/* ── ACTIONS ── */}
        {hasActions && (
          <div style={{ padding:"16px 20px", borderTop:"2px solid #0f1419" }}>
            {action ? action : (
              <>
                {!isConnected ? (
                  <div style={{ textAlign:"center", padding:"10px 0", fontSize:11,
                    fontWeight:700, color:"#5a6478" }}>
                    Connect wallet to buy or make offer
                  </div>
                ) : isSeller ? (
                  <div style={{ padding:"12px", background:"#f7f8fa", textAlign:"center",
                    border:"1px solid #e0e3ea", fontSize:10, fontWeight:700, color:"#5a6478" }}>
                    YOUR LISTING · τ {priceEth}
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {onBuy && priceEth && (
                      <button onClick={onBuy} disabled={isBuying}
                        style={{ width:"100%", padding:"14px",
                          background: isBuying ? "#5a6478" : "#0f1419",
                          color:"#fff", border:"none", fontSize:11, fontWeight:800,
                          cursor: isBuying ? "not-allowed" : "pointer",
                          letterSpacing:"0.10em", textTransform:"uppercase" }}>
                        {isBuying ? "CONFIRMING..." : `BUY NOW · τ ${priceEth}`}
                      </button>
                    )}
                    {onMakeOffer && !offerOpen && (
                      <button onClick={() => setOfferOpen(true)}
                        style={{ width:"100%", padding:"11px", background:"#fff",
                          color:"#0f1419", border:"2px solid #0f1419", fontSize:10, fontWeight:800,
                          cursor:"pointer", letterSpacing:"0.10em", textTransform:"uppercase" }}>
                        MAKE OFFER
                      </button>
                    )}
                    {offerOpen && (
                      <div style={{ border:"2px solid #0f1419", padding:14 }}>
                        <div style={{ fontSize:9, fontWeight:800, letterSpacing:"0.10em",
                          marginBottom:10, color:"#0f1419" }}>MAKE AN OFFER</div>
                        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
                          <input value={offerPrice} onChange={e => setOfferPrice(e.target.value)}
                            placeholder="Price in TAO" autoFocus
                            style={{ flex:1, padding:"8px 10px", border:"1.5px solid #e0e3ea",
                              fontSize:13, fontFamily:"monospace", fontWeight:700 }} />
                          <select value={offerDays} onChange={e => setOfferDays(e.target.value)}
                            style={{ padding:"8px", border:"1.5px solid #e0e3ea", fontSize:11, fontWeight:700 }}>
                            <option value="1">1d</option>
                            <option value="3">3d</option>
                            <option value="7">7d</option>
                            <option value="14">14d</option>
                            <option value="30">30d</option>
                          </select>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={submitOffer} disabled={!offerPrice}
                            style={{ flex:1, padding:"10px", background:"#0f1419", color:"#fff",
                              border:"none", fontSize:9, fontWeight:800,
                              cursor: !offerPrice ? "not-allowed" : "pointer",
                              opacity: !offerPrice ? 0.5 : 1, letterSpacing:"0.08em",
                              textTransform:"uppercase" }}>
                            SUBMIT OFFER
                          </button>
                          <button onClick={() => { setOfferOpen(false); setOfferPrice(""); }}
                            style={{ padding:"10px 14px", background:"transparent",
                              border:"1.5px solid #e0e3ea", fontSize:9, fontWeight:800,
                              cursor:"pointer", color:"#9aa0ae" }}>
                            CANCEL
                          </button>
                        </div>
                        <div style={{ marginTop:8, fontSize:8, color:"#9aa0ae", fontWeight:700, lineHeight:1.5 }}>
                          Funds are held in the contract until accepted or cancelled.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
