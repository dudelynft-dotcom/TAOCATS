import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TAO CAT Whitepaper — Bittensor EVM NFT Collection",
  description:
    "Technical whitepaper for TAO CAT: 4,699 generative NFTs on Bittensor EVM with on-chain marketplace and rarity registry.",
  openGraph: {
    title: "TAO CAT Whitepaper",
    description: "4,699 generative pixel cats on Bittensor EVM. Zero team allocation. 100% mint revenue to liquidity.",
    url: "https://taocats.fun/whitepaper",
  },
};

const SECTIONS = [
  "Abstract",
  "Background: Bittensor and Its EVM Layer",
  "Collection Overview",
  "Artwork and Trait System",
  "Rarity Architecture",
  "Smart Contract Architecture",
  "Marketplace",
  "Economics and Value Flow",
  "Technical Infrastructure",
  "Fairness Guarantees",
  "Roadmap",
  "Contract Addresses",
  "Disclaimer",
];

export default function WhitepaperPage() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh", paddingTop: 56 }}>

      {/* ── HERO ── */}
      <div style={{ background: "#ffffff", borderBottom: "3px solid #0f1419" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "64px 40px 48px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9aa0ae", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>
            Official Documentation
          </div>
          <h1 style={{ fontSize: "clamp(40px,5vw,72px)", fontWeight: 700, color: "#0f1419", letterSpacing: "-0.03em", lineHeight: 0.95, textTransform: "uppercase", marginBottom: 20 }}>
            TAO CAT<br />Whitepaper
          </h1>
          <div style={{ width: 48, height: 4, background: "#0f1419", marginBottom: 20 }} />
          <p style={{ color: "#5a6478", fontSize: 14, lineHeight: 1.8, marginBottom: 4, fontWeight: 500, maxWidth: 560 }}>
            A Generative NFT Collection with On-Chain Marketplace and Rarity Registry on Bittensor EVM.
          </p>
          <p style={{ color: "#9aa0ae", fontSize: 11, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" }}>
            Version 1.0 &nbsp;·&nbsp; Bittensor EVM Mainnet &nbsp;·&nbsp; April 2026
          </p>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ borderBottom: "1px solid #0f1419", background: "#0f1419" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 40px", display: "flex", overflowX: "auto" }}>
          {[
            { label: "Total Supply", value: "4,699" },
            { label: "Mint Price",   value: "τ 0.01" },
            { label: "Chain",        value: "Bittensor EVM" },
            { label: "Chain ID",     value: "964" },
            { label: "Team Tokens",  value: "Zero" },
            { label: "Market Fee",   value: "1%" },
            { label: "Royalty",      value: "5.5%" },
          ].map((s, idx, arr) => (
            <div key={s.label} style={{ padding: "16px 28px", borderRight: idx < arr.length - 1 ? "1px solid #2a3040" : "none", flexShrink: 0, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", fontFamily: "monospace", letterSpacing: "-0.01em" }}>{s.value}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#5a6478", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "56px 40px 80px", display: "grid", gridTemplateColumns: "220px 1fr", gap: 48, alignItems: "start" }}>

        {/* SIDEBAR */}
        <aside style={{ position: "sticky", top: 80, borderRight: "2px solid #e0e3ea", paddingRight: 32 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#9aa0ae", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>Contents</div>
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 2 }}>
            {SECTIONS.map((title, i) => (
              <li key={i}>
                <a
                  href={`#s${i + 1}`}
                  style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 0", textDecoration: "none", color: "#5a6478", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", borderBottom: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#0f1419")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#5a6478")}
                >
                  <span style={{ fontFamily: "monospace", color: "#d0d5de", minWidth: 16 }}>{i + 1}.</span>
                  <span>{title}</span>
                </a>
              </li>
            ))}
          </ol>
          <div style={{ marginTop: 32, borderTop: "1px solid #e0e3ea", paddingTop: 20 }}>
            <Link href="/"
              style={{ display: "inline-block", padding: "9px 16px", background: "#0f1419", color: "#ffffff", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}>
              ← Back to Site
            </Link>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ minWidth: 0 }}>

          {/* 1. Abstract */}
          <Section id="s1" num="01" title="Abstract">
            <P>
              TAO CAT is a collection of 4,699 generative pixel cats deployed on <B>Bittensor EVM</B> (Chain ID: 964),
              the Ethereum-compatible execution layer of the Bittensor decentralized AI network. Each token is unique,
              algorithmically generated from a layered trait system, and carries an on-chain rarity score stored in a
              dedicated registry contract.
            </P>
            <P mt>
              The project is built around a single principle: <B>every value unit flows to the community</B>. The mint
              contract holds zero funds. There is no team allocation, no pre-mine, and no whitelist. One hundred percent
              of mint revenue is forwarded on-chain to a liquidity receiver at the moment of each mint.
            </P>
            <P mt>
              Beyond the collection, TAO CAT ships a complete on-chain ecosystem: a native marketplace with batch
              listing and floor-sweep capabilities, and a permanent on-chain rarity registry queryable by any contract.
            </P>
            <P mt>All contracts are immutable, non-upgradeable, and deployed on Bittensor EVM mainnet.</P>
          </Section>

          {/* 2. Background */}
          <Section id="s2" num="02" title="Background: Bittensor and Its EVM Layer">
            <Sub title="2.1  Bittensor Protocol">
              <P>
                Bittensor ($TAO) is a decentralized machine intelligence network. Miners compete to provide the best
                outputs for computational tasks. Validators assess quality and distribute $TAO emissions. The system
                creates a self-organizing, incentive-compatible marketplace for intelligence without a central authority.
              </P>
            </Sub>
            <Sub title="2.2  Bittensor EVM">
              <P mb>Bittensor EVM (Chain ID: 964) is the Ethereum-compatible smart contract layer. Key properties:</P>
              <Table headers={["Property", "Value"]} rows={[
                ["Chain ID", "964"],
                ["Native Token", "$TAO (18 decimals)"],
                ["EVM Version", "Cancun"],
                ["RPC", "https://lite.chain.opentensor.ai"],
                ["Block Explorer", "https://evm-explorer.tao.network"],
                ["Tooling", "Hardhat, ethers.js, wagmi, MetaMask"],
              ]} />
              <P mt>Gas fees are denominated in $TAO and are significantly cheaper than Ethereum mainnet.</P>
            </Sub>
            <Sub title="2.3  The NFT Landscape on Bittensor EVM">
              <P>
                The Bittensor EVM ecosystem is young. TAO CAT is an early generative NFT project on this chain,
                bringing high-quality, community-owned infrastructure: a fully on-chain marketplace and a permanent
                rarity system.
              </P>
            </Sub>
          </Section>

          {/* 3. Collection Overview */}
          <Section id="s3" num="03" title="Collection Overview">
            <Table headers={["Parameter", "Value"]} rows={[
              ["Collection Name", "TAO CAT"],
              ["Token Symbol", "TCAT"],
              ["Token Standard", "ERC-721 with ERC721Enumerable"],
              ["Total Supply", "4,699"],
              ["Blockchain", "Bittensor EVM (Chain ID: 964)"],
              ["Mint Price", "0.01 TAO per token"],
              ["Max Per Wallet", "20 tokens"],
              ["Team Allocation", "0%"],
              ["Mint Revenue Distribution", "100% forwarded to liquidity at mint time"],
              ["Website", "taocats.fun"],
            ]} />
            <Sub title="Supply Rationale">
              <P>
                4,699 creates genuine scarcity while supporting a meaningful community size — small enough for
                accessibility, large enough to sustain active secondary trading.
              </P>
            </Sub>
            <Sub title="Pricing Rationale">
              <P>
                At 0.01 TAO per token, the mint is priced for maximum participation. Total mint revenue of 46.99 TAO
                flows entirely to liquidity, not to any team wallet.
              </P>
            </Sub>
          </Section>

          {/* 4. Artwork */}
          <Section id="s4" num="04" title="Artwork and Trait System">
            <Sub title="4.1  Aesthetic Approach">
              <P mb>Each image is rendered at 1000×1000px pixel art. Six independent visual layers:</P>
              <Table headers={["Layer", "Description"]} rows={[
                ["Background", "Color field or environment behind the cat"],
                ["Body", "Base fur color and physical form"],
                ["Head", "Headwear: hats, helmets, accessories"],
                ["Expression", "Facial expression and emotional character"],
                ["Outfit", "Clothing and worn items"],
                ["Eyewear", "Glasses, goggles, visors, eye accessories"],
              ]} />
            </Sub>
            <Sub title="4.2  Generation Process">
              <OL items={[
                "Assigns trait values per layer from a weighted probability distribution",
                "Ensures no two tokens share an identical six-layer combination",
                "Produces a deterministic output per token ID — fully reproducible and auditable",
              ]} />
            </Sub>
            <Sub title="4.3  Metadata Format">
              <P mb>Each token follows the ERC-721 metadata standard, served at:</P>
              <Code>{`https://taocats.fun/api/metadata/{tokenId}`}</Code>
              <Code mt>{`{
  "name": "TAO CAT #{tokenId}",
  "image": "https://taocats.fun/nft-images/{tokenId}.jpg",
  "attributes": [
    { "trait_type": "Background",   "value": "..." },
    { "trait_type": "Body",         "value": "..." },
    { "trait_type": "Head",         "value": "..." },
    { "trait_type": "Expression",   "value": "..." },
    { "trait_type": "Outfit",       "value": "..." },
    { "trait_type": "Eyewear",      "value": "..." },
    { "trait_type": "Rarity Tier",  "value": "..." },
    { "trait_type": "Rarity Score", "value": 0, "display_type": "number" },
    { "trait_type": "Rank",         "value": 0, "display_type": "number" }
  ]
}`}</Code>
            </Sub>
          </Section>

          {/* 5. Rarity */}
          <Section id="s5" num="05" title="Rarity Architecture">
            <Sub title="5.1  Scoring Methodology">
              <P mb>Statistical rarity method. For each trait layer, frequency is computed across all 4,699 tokens:</P>
              <Code>{`RarityScore(token) = Σ ( 1 / frequency(trait_value_in_layer) )`}</Code>
              <P mt>A token with many low-frequency traits scores higher. Method consistent with rarity.tools standard.</P>
            </Sub>
            <Sub title="5.2  Rarity Tiers">
              <Table headers={["Tier", "Score Percentile", "Approx. Count"]} rows={[
                ["Common",    "0th – 40th",    "~1,880 tokens"],
                ["Uncommon",  "40th – 70th",   "~1,410 tokens"],
                ["Rare",      "70th – 90th",   "~940 tokens"],
                ["Epic",      "90th – 98th",   "~376 tokens"],
                ["Legendary", "98th – 100th",  "~93 tokens"],
              ]} />
            </Sub>
            <Sub title="5.3  On-Chain Rarity Registry">
              <P>
                Rarity data is written permanently to the <Mono>BittensorCatRarity</Mono> contract
                at <Mono>0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9</Mono>. Stores score, global rank (1 = rarest),
                and tier per token. Written once after mint — cannot be modified. Queryable by any contract or wallet.
              </P>
            </Sub>
          </Section>

          {/* 6. Smart Contracts */}
          <Section id="s6" num="06" title="Smart Contract Architecture">
            <P mb>All contracts: Solidity 0.8.24 · Cancun EVM · 200-run optimizer · OpenZeppelin 5.x · No proxy patterns.</P>

            <Sub title="6.1  BittensorCatNFT">
              <Label>Address</Label>
              <Mono block>0x2797341aaceAA2cE87D226E41B2fb8800FEE5184</Mono>
              <P mt mb>Core ERC-721 contract. Extends <Mono>ERC721Enumerable</Mono> and <Mono>ReentrancyGuard</Mono>.</P>
              <Label>Zero fund retention</Label>
              <Code mt>{`function _forwardToLiquidity() private {
    uint256 balance = address(this).balance;
    if (balance > 0) {
        (bool ok,) = payable(liquidityReceiver).call{value: balance}("");
        require(ok, "Liquidity forward failed");
        emit FundsForwardedToLiquidity(balance);
    }
}`}</Code>
              <Label mt>Automatic overpayment refund</Label>
              <Code mt>{`uint256 paid   = mintPrice * quantity;
uint256 excess = msg.value - paid;
if (excess > 0) {
    (bool refunded,) = payable(msg.sender).call{value: excess}("");
    require(refunded, "Refund failed");
}`}</Code>
              <Label mt>One-way reveal</Label>
              <Code mt>{`function reveal(string calldata baseURI) external onlyOwner {
    require(!revealed, "Already revealed");
    _baseTokenURI = baseURI;
    revealed = true;
    emit Revealed(baseURI);
}`}</Code>
            </Sub>

            <Sub title="6.2  BittensorCatRarity">
              <Label>Address</Label>
              <Mono block>0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9</Mono>
              <P mt>On-chain rarity registry. Stores score, rank, and tier for all 4,699 tokens. Read functions public.</P>
            </Sub>

            <Sub title="6.3  TaoCatsMarketV2">
              <Label>Address</Label>
              <Mono block>0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475</Mono>
              <P mt mb>Fully on-chain marketplace. No off-chain order books, no signed messages, no trusted relay.</P>
              <Table headers={["Component", "Rate", "Recipient"]} rows={[
                ["Marketplace fee", "1.0%", "Treasury"],
                ["Creator royalty", "5.5%", "Treasury"],
                ["Total deducted", "6.5%", "—"],
                ["Seller receives", "93.5%", "Seller wallet"],
              ]} />
              <Code mt>{`uint256 public constant MARKET_FEE_BPS  = 100;   // 1.0%
uint256 public constant ROYALTY_BPS     = 550;   // 5.5%
uint256 public constant TOTAL_FEE_BPS   = 650;   // 6.5%
uint256 public constant BPS_DENOMINATOR = 10_000;`}</Code>
            </Sub>
          </Section>

          {/* 7. Marketplace */}
          <Section id="s7" num="07" title="Marketplace">
            <Sub title="7.1  Trade Execution Flow">
              <Code>{`1. Seller → approve(marketplaceAddress, tokenId)
2. Seller → list(tokenId, priceInTAO)
3. Contract stores: Listing{ seller, price }
4. Buyer  → buy(tokenId) with msg.value >= listing.price
5. Contract: sellerAmount = price × 0.935  |  fee = price × 0.065
6. Transfers: TAO → seller  |  TAO → treasury  |  NFT → buyer
7. Listing deleted`}</Code>
              <P mt>Steps 5–7 occur atomically. Any failure reverts the entire transaction.</P>
            </Sub>
            <Sub title="7.2  sweepFloor">
              <Code>{`function sweepFloor(uint256[] calldata tokenIds) external payable nonReentrant`}</Code>
              <P mt>Purchases multiple floor listings in one transaction. Each seller paid individually. Excess TAO refunded.</P>
            </Sub>
            <Sub title="7.3  listBatch">
              <Code>{`function listBatch(uint256[] calldata tokenIds, uint256[] calldata prices) external`}</Code>
              <P mt>Lists multiple tokens simultaneously. Requires prior approval.</P>
            </Sub>
          </Section>

          {/* 8. Economics */}
          <Section id="s8" num="08" title="Economics and Value Flow">
            <Sub title="8.1  Value Flow">
              <div style={{ background: "#0f1419", border: "2px solid #0f1419", padding: "28px 32px", fontFamily: "monospace", fontSize: 12, color: "#9aa0ae", lineHeight: 2.2 }}>
                {[
                  { label: "MINT (0.01 TAO × 4,699 = 46.99 TAO)", accent: true },
                  { label: "↓  100% forwarded in same transaction", indent: true },
                  { label: "LIQUIDITY RECEIVER WALLET", accent: true },
                  { label: "↓  seeds on-chain liquidity pool", indent: true },
                  { label: "ON-CHAIN LIQUIDITY POOL", accent: true },
                  { label: "↓  secondary trading generates", indent: true },
                  { label: "MARKETPLACE FEES  (6.5% per sale)", accent: true },
                  { label: "↓  funds treasury for", indent: true },
                  { label: "ONGOING ECOSYSTEM DEVELOPMENT", accent: true },
                ].map((row, i) => (
                  <div key={i} style={{ color: row.accent ? "#ffffff" : "#5a6478", paddingLeft: row.indent ? 20 : 0, fontWeight: row.accent ? 700 : 500 }}>
                    {row.label}
                  </div>
                ))}
              </div>
            </Sub>
            <Sub title="8.2  Zero-Extraction Design">
              <Table headers={["Excluded Feature", "Reason"]} rows={[
                ["Team NFT allocation", "Team receives no reserved allocation"],
                ["Pre-mine or reserve supply", "All tokens publicly minted at same price"],
                ["`withdraw()` in NFT contract", "Mint funds cannot be redirected"],
                ["Upgradeable proxy contracts", "Eliminates post-deploy logic changes"],
                ["Whitelist or guaranteed allocations", "Equal access for all participants"],
              ]} />
            </Sub>
          </Section>

          {/* 9. Technical */}
          <Section id="s9" num="09" title="Technical Infrastructure">
            <Table headers={["Component", "Technology"]} rows={[
              ["Framework", "Next.js 14 (App Router)"],
              ["Web3 Interaction", "wagmi v2 + viem"],
              ["Data Fetching", "TanStack Query v5"],
              ["Styling", "Tailwind CSS"],
              ["Hosting", "Vercel (global CDN)"],
              ["Solidity Version", "0.8.24"],
              ["EVM Target", "Cancun"],
              ["Build Framework", "Hardhat"],
              ["Base Libraries", "OpenZeppelin 5.x"],
              ["Optimizer", "Enabled, 200 runs"],
            ]} />
            <Sub title="9.1  Metadata System">
              <P>
                Token metadata served by a Next.js API route. Reads pre-generated JSON per token ID, constructs
                absolute image URL from request host. Images cached at Vercel CDN edge with{" "}
                <Mono>Cache-Control: public, max-age=31536000, immutable</Mono>.
              </P>
            </Sub>
            <Sub title="9.2  RPC Proxy">
              <P>
                Custom JSON-RPC proxy at <Mono>taocats.fun/api/rpc</Mono> handles Bittensor EVM gas estimation
                edge cases. Ensures mint and marketplace transactions simulate correctly across all wallets.
              </P>
            </Sub>
          </Section>

          {/* 10. Fairness */}
          <Section id="s10" num="10" title="Fairness Guarantees">
            <div style={{ display: "grid", gap: 2, background: "#e0e3ea" }}>
              {[
                {
                  title: "Mint Funds Cannot Be Diverted",
                  body: "BittensorCatNFT has no withdraw() function. _forwardToLiquidity() runs unconditionally at end of every mint. liquidityReceiver is set at construction with no setter. Verify: inspect ABI for absence of withdraw or setLiquidityReceiver.",
                },
                {
                  title: "No Post-Deploy Logic Changes",
                  body: "None of the contracts use TransparentUpgradeableProxy, UUPSUpgradeable, or any proxy pattern. Bytecode at each address is final. Verify: confirm absence of proxy patterns on block explorer.",
                },
                {
                  title: "Equal Access to Mint",
                  body: "No whitelist check in mint(). Admission criteria apply identically to all addresses: mint active, quantity 1–20, wallet under 20-token cap, supply not reached, sufficient TAO attached.",
                },
                {
                  title: "On-Chain Rarity Immutability",
                  body: "Rarity registry has no update function. Once scores, ranks, and tiers are written they are permanent. Verify: inspect rarity contract for absence of setter functions after initial population.",
                },
              ].map((g) => (
                <div key={g.title} style={{ background: "#ffffff", padding: "24px 28px" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, background: "#00c49a", flexShrink: 0, marginTop: 5 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f1419", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{g.title}</div>
                      <p style={{ fontSize: 12, color: "#5a6478", lineHeight: 1.8 }}>{g.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* 11. Roadmap */}
          <Section id="s11" num="11" title="Roadmap">
            <div style={{ display: "grid", gap: 2, background: "#e0e3ea" }}>
              {[
                {
                  phase: "Phase 1", title: "Deployment", status: "COMPLETED",
                  items: [
                    [true,  "Deploy BittensorCatNFT on Bittensor EVM mainnet"],
                    [true,  "Deploy BittensorCatRarity"],
                    [true,  "Deploy TaoCatsMarketV2 and TaoCatsMarket"],
                    [true,  "Launch taocats.fun with mint, marketplace, and activity UI"],
                    [true,  "Open public mint at 0.01 TAO"],
                  ],
                },
                {
                  phase: "Phase 2", title: "Reveal", status: "IN PROGRESS",
                  items: [
                    [false, "Execute collection reveal (set baseURI in NFT contract)"],
                    [false, "Write rarity scores and ranks to BittensorCatRarity"],
                    [false, "Enable marketplace trading on taocats.fun"],
                  ],
                },
                {
                  phase: "Phase 3", title: "Marketplace Enhancement", status: "UPCOMING",
                  items: [
                    [false, "Surface on-chain rarity in marketplace listings"],
                    [false, "Real-time on-chain activity feed"],
                    [false, "Trait-based search and filtering"],
                    [false, "Volume, floor history, and wallet analytics"],
                  ],
                },
                {
                  phase: "Phase 4", title: "Ecosystem Integration", status: "UPCOMING",
                  items: [
                    [false, "Integration with Bittensor EVM wallets and explorers"],
                    [false, "Collaborations with Bittensor subnet projects"],
                    [false, "Cross-subnet utility exploration for TAO CAT holders"],
                  ],
                },
              ].map((ph) => (
                <div key={ph.phase} style={{ background: "#ffffff" }}>
                  <div style={{ background: "#f7f8fa", borderBottom: "1px solid #e0e3ea", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#9aa0ae" }}>{ph.phase}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#0f1419", textTransform: "uppercase", letterSpacing: "0.08em" }}>{ph.title}</span>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.10em", padding: "3px 10px",
                      background: ph.status === "COMPLETED" ? "#0f1419" : ph.status === "IN PROGRESS" ? "#00c49a" : "#f7f8fa",
                      color: ph.status === "COMPLETED" ? "#ffffff" : ph.status === "IN PROGRESS" ? "#0f1419" : "#9aa0ae",
                      border: "1px solid " + (ph.status === "UPCOMING" ? "#e0e3ea" : "transparent"),
                    }}>{ph.status}</span>
                  </div>
                  <ul style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {(ph.items as [boolean, string][]).map(([done, text], i) => (
                      <li key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                        <span style={{ fontFamily: "monospace", fontSize: 10, color: done ? "#00c49a" : "#d0d5de", flexShrink: 0 }}>{done ? "✓" : "○"}</span>
                        <span style={{ fontSize: 12, color: done ? "#9aa0ae" : "#5a6478", textDecoration: done ? "line-through" : "none" }}>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* 12. Contract Addresses */}
          <Section id="s12" num="12" title="Contract Addresses">
            <P mb>All contracts deployed on <B>Bittensor EVM (Chain ID: 964)</B>.</P>
            <Table headers={["Contract", "Address"]} rows={[
              ["TAO CAT NFT (TCAT)", "0x2797341aaceAA2cE87D226E41B2fb8800FEE5184"],
              ["Rarity Registry",    "0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9"],
              ["MarketV2",           "0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475"],
              ["Simple Market",      "0xfFF9F5eD81f805da27c022290C188eb6Fa3Ac7dE"],
            ]} />
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 4 }}>
              <a href="https://evm-explorer.tao.network" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#5a6478", fontWeight: 700, letterSpacing: "0.06em" }}>
                Block Explorer → evm-explorer.tao.network
              </a>
              <a href="https://taocats.fun" style={{ fontSize: 11, color: "#5a6478", fontWeight: 700, letterSpacing: "0.06em" }}>
                Website → taocats.fun
              </a>
            </div>
          </Section>

          {/* 13. Disclaimer */}
          <Section id="s13" num="13" title="Disclaimer">
            <div style={{ background: "#f7f8fa", border: "2px solid #e0e3ea", padding: "24px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <P>TAO CAT is an experimental digital collectible project. The NFTs described in this document are not financial instruments, securities, or investment contracts. Holding a TAO CAT token does not represent ownership in any company or legal entity.</P>
                <P>The smart contracts extend OpenZeppelin 5.x and follow established Solidity security practices. However, these contracts have not undergone a formal third-party security audit. Users interact with them at their own risk.</P>
                <P>Nothing in this document constitutes financial advice. Participants should conduct independent research before minting, trading, or holding any asset described herein.</P>
              </div>
            </div>
          </Section>

        </main>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #1e2640", padding: "24px 40px", background: "#0f1419" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontWeight: 700, letterSpacing: "0.12em", fontSize: 11, textTransform: "uppercase", color: "#ffffff" }}>TAO CATS — Whitepaper v1.0</span>
          <p style={{ color: "#2a3040", fontSize: 10, letterSpacing: "0.06em" }}>Bittensor EVM · Chain 964 · 4,699 Cats</p>
        </div>
      </footer>

    </div>
  );
}

/* ── Helper components ── */

function Section({ id, num, title, children }: { id: string; num: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
      <div style={{ borderBottom: "2px solid #0f1419", marginBottom: 28, paddingBottom: 12, display: "flex", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#d0d5de" }}>{num}</span>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f1419", textTransform: "uppercase", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#9aa0ae", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function P({ children, mt, mb }: { children: React.ReactNode; mt?: boolean; mb?: boolean }) {
  return <p style={{ fontSize: 13, color: "#5a6478", lineHeight: 1.9, marginTop: mt ? 12 : 0, marginBottom: mb ? 12 : 0 }}>{children}</p>;
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "#0f1419", fontWeight: 700 }}>{children}</strong>;
}

function Mono({ children, block }: { children: React.ReactNode; block?: boolean }) {
  return (
    <span style={{
      fontFamily: "monospace", fontSize: 11, color: "#0f1419", background: "#f2f4f7",
      padding: "2px 6px", display: block ? "block" : "inline", marginTop: block ? 6 : 0, wordBreak: "break-all",
    }}>
      {children}
    </span>
  );
}

function Label({ children, mt }: { children: React.ReactNode; mt?: boolean }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 700, color: "#9aa0ae", textTransform: "uppercase", letterSpacing: "0.14em", marginTop: mt ? 16 : 0 }}>
      {children}
    </div>
  );
}

function Code({ children, mt }: { children: string; mt?: boolean }) {
  return (
    <pre style={{ background: "#0f1419", color: "#00c49a", padding: "20px 24px", fontSize: 12, overflowX: "auto", fontFamily: "monospace", lineHeight: 1.8, marginTop: mt ? 12 : 0 }}>
      <code>{children}</code>
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #e0e3ea" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f7f8fa", borderBottom: "2px solid #0f1419" }}>
            {headers.map(h => (
              <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 9, fontWeight: 700, color: "#0f1419", textTransform: "uppercase", letterSpacing: "0.12em", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e0e3ea", background: i % 2 === 0 ? "#ffffff" : "#fafafa" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 16px", color: "#5a6478", fontFamily: "monospace", fontSize: 11, verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OL({ items }: { items: string[] }) {
  return (
    <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8, paddingLeft: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 700, color: "#9aa0ae", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}.</span>
          <span style={{ fontSize: 13, color: "#5a6478", lineHeight: 1.8 }}>{item}</span>
        </li>
      ))}
    </ol>
  );
}
