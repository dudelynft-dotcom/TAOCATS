import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TAO CAT Whitepaper — Bittensor EVM NFT Collection",
  description:
    "Technical whitepaper for TAO CAT: 4,699 generative NFTs on Bittensor EVM with on-chain marketplace and rarity registry.",
  openGraph: {
    title: "TAO CAT Whitepaper",
    description:
      "4,699 generative pixel cats on Bittensor EVM. Zero team allocation. 100% mint revenue to liquidity.",
    url: "https://taocats.fun/whitepaper",
  },
};

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Top bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
            ← taocats.fun
          </a>
          <span className="text-xs text-gray-400 font-mono">v1.0 | Chain ID: 964</span>
        </div>
      </div>

      {/* Cover */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">🐱</div>
          <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-4">TAO CAT</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            A Generative NFT Collection with On-Chain Marketplace and Rarity Registry on Bittensor EVM
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>Version 1.0</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Bittensor EVM Mainnet</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>April 2026</span>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            {[
              { label: "Total Supply", value: "4,699" },
              { label: "Mint Price", value: "0.01 TAO" },
              { label: "Team Allocation", value: "0%" },
              { label: "Liquidity from Mint", value: "100%" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <nav className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Contents</h2>
          <ol className="space-y-2 text-sm">
            {[
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
            ].map((title, i) => (
              <li key={i}>
                <a
                  href={`#section-${i + 1}`}
                  className="flex items-baseline gap-3 hover:text-gray-900 text-gray-600 transition-colors"
                >
                  <span className="font-mono text-xs text-gray-400 w-5 shrink-0">{i + 1}.</span>
                  <span>{title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-20">

        <Section id="section-1" number="01" title="Abstract">
          <p>
            TAO CAT is a collection of 4,699 generative pixel cats deployed on <b>Bittensor EVM</b> (Chain ID: 964),
            the Ethereum-compatible execution layer of the Bittensor decentralized AI network. Each token is unique,
            algorithmically generated from a layered trait system, and carries an on-chain rarity score stored in a
            dedicated registry contract.
          </p>
          <p className="mt-4">
            The project is built around a single principle: <b>every value unit flows to the community</b>. The mint
            contract holds zero funds. There is no team allocation, no pre-mine, and no whitelist. One hundred percent
            of mint revenue is forwarded on-chain to a liquidity receiver at the moment of each mint.
          </p>
          <p className="mt-4">
            Beyond the collection, TAO CAT ships a complete on-chain ecosystem: a native marketplace with batch
            listing and floor-sweep capabilities, and a permanent on-chain rarity registry queryable by any contract.
          </p>
          <p className="mt-4">All contracts are immutable, non-upgradeable, and deployed on Bittensor EVM mainnet.</p>
        </Section>

        <Section id="section-2" number="02" title="Background: Bittensor and Its EVM Layer">
          <SubSection title="2.1 Bittensor Protocol">
            <p>
              Bittensor ($TAO) is a decentralized machine intelligence network. Participants called miners compete to
              provide the best outputs for computational tasks. Validators assess the quality of miner outputs and
              distribute $TAO emissions accordingly. The system creates a self-organizing, incentive-compatible
              marketplace for intelligence that operates without a central authority.
            </p>
          </SubSection>
          <SubSection title="2.2 Bittensor EVM">
            <p className="mb-4">
              Bittensor EVM (Chain ID: 964) is the Ethereum-compatible smart contract layer of Bittensor. It shares
              $TAO as its native currency and inherits Bittensor&apos;s validator security model.
            </p>
            <Table
              headers={["Property", "Value"]}
              rows={[
                ["Chain ID", "964"],
                ["Native Token", "$TAO (18 decimals)"],
                ["EVM Version", "Cancun"],
                ["RPC", "https://lite.chain.opentensor.ai"],
                ["Block Explorer", "https://evm-explorer.tao.network"],
                ["Tooling", "Hardhat, ethers.js, wagmi, MetaMask"],
              ]}
            />
          </SubSection>
          <SubSection title="2.3 The NFT Landscape on Bittensor EVM">
            <p>
              The Bittensor EVM ecosystem is young. TAO CAT is an early generative NFT project on this chain,
              focused on bringing high-quality, community-owned NFT infrastructure: a fully on-chain marketplace
              and a permanent rarity system.
            </p>
          </SubSection>
        </Section>

        <Section id="section-3" number="03" title="Collection Overview">
          <Table
            headers={["Parameter", "Value"]}
            rows={[
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
            ]}
          />
          <SubSection title="Supply Rationale">
            <p>
              A supply of 4,699 creates genuine scarcity while supporting a meaningful community size. Small enough
              that holding multiple tokens is accessible to early participants; large enough to sustain active
              secondary market trading.
            </p>
          </SubSection>
          <SubSection title="Pricing Rationale">
            <p>
              At 0.01 TAO per token, the mint is priced for accessibility. Total mint revenue of 46.99 TAO flows
              entirely to liquidity, not to any team wallet.
            </p>
          </SubSection>
        </Section>

        <Section id="section-4" number="04" title="Artwork and Trait System">
          <SubSection title="4.1 Aesthetic Approach">
            <p className="mb-4">
              TAO CAT uses pixel art as its visual language. Each image is rendered at 1000x1000 pixels.
              Every cat is composed of six independent visual layers:
            </p>
            <Table
              headers={["Layer", "Description"]}
              rows={[
                ["Background", "Color field or environment behind the cat"],
                ["Body", "Base fur color and physical form"],
                ["Head", "Headwear including hats, helmets, and accessories"],
                ["Expression", "Facial expression and emotional character"],
                ["Outfit", "Clothing and worn items"],
                ["Eyewear", "Glasses, goggles, visors, and eye accessories"],
              ]}
            />
          </SubSection>
          <SubSection title="4.2 Generation Process">
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Assigns trait values to each layer according to a weighted probability distribution</li>
              <li>Ensures no two tokens share an identical combination across all six layers</li>
              <li>Produces a deterministic output for each token ID, making generation fully reproducible and auditable</li>
            </ol>
          </SubSection>
          <SubSection title="4.3 Metadata Format">
            <p className="mb-4">Each token&apos;s metadata follows the ERC-721 standard and is served at:</p>
            <Code>{`https://taocats.fun/api/metadata/{tokenId}`}</Code>
            <Code className="mt-3">{`{
  "name": "TAO CAT #{tokenId}",
  "image": "https://taocats.fun/nft-images/{tokenId}.jpg",
  "attributes": [
    { "trait_type": "Background", "value": "..." },
    { "trait_type": "Body",       "value": "..." },
    { "trait_type": "Head",       "value": "..." },
    { "trait_type": "Expression", "value": "..." },
    { "trait_type": "Outfit",     "value": "..." },
    { "trait_type": "Eyewear",    "value": "..." },
    { "trait_type": "Rarity Tier","value": "..." },
    { "trait_type": "Rarity Score","value": 0, "display_type": "number" },
    { "trait_type": "Rank",       "value": 0, "display_type": "number" }
  ]
}`}</Code>
          </SubSection>
        </Section>

        <Section id="section-5" number="05" title="Rarity Architecture">
          <SubSection title="5.1 Scoring Methodology">
            <p className="mb-4">
              Each token&apos;s rarity score uses the statistical rarity method. For each trait layer,
              the frequency of that trait value across the entire 4,699-token collection is calculated:
            </p>
            <Code>{`RarityScore(token) = sum over all layers of (1 / frequency(trait_value_in_layer))`}</Code>
          </SubSection>
          <SubSection title="5.2 Rarity Tiers">
            <Table
              headers={["Tier", "Score Percentile", "Approx. Count"]}
              rows={[
                ["Common", "0th to 40th", "~1,880 tokens"],
                ["Uncommon", "40th to 70th", "~1,410 tokens"],
                ["Rare", "70th to 90th", "~940 tokens"],
                ["Epic", "90th to 98th", "~376 tokens"],
                ["Legendary", "98th to 100th", "~93 tokens"],
              ]}
            />
          </SubSection>
          <SubSection title="5.3 On-Chain Rarity Registry">
            <p>
              Rarity data is written permanently to the <code className="bg-gray-100 px-1 rounded text-sm">BittensorCatRarity</code> contract
              at <Addr>0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9</Addr>. For each token the contract stores:
              rarity score, global rank (1 = rarest), and rarity tier. Data is written once and cannot be modified.
              Any smart contract or wallet on Bittensor EVM can query rarity trustlessly.
            </p>
          </SubSection>
        </Section>

        <Section id="section-6" number="06" title="Smart Contract Architecture">
          <p className="text-gray-600 mb-6">
            All contracts: Solidity 0.8.24, Cancun EVM, 200-run optimizer, OpenZeppelin 5.x. No upgradeable proxy patterns.
          </p>

          <SubSection title="6.1 BittensorCatNFT">
            <p className="mb-2 text-sm text-gray-500">Address: <Addr>0x2797341aaceAA2cE87D226E41B2fb8800FEE5184</Addr></p>
            <p className="mb-4">Core ERC-721 contract extending <code className="bg-gray-100 px-1 rounded text-sm">ERC721Enumerable</code> and <code className="bg-gray-100 px-1 rounded text-sm">ReentrancyGuard</code>.</p>
            <p className="font-semibold mb-2 text-sm">Zero fund retention:</p>
            <Code>{`function _forwardToLiquidity() private {
    uint256 balance = address(this).balance;
    if (balance > 0) {
        (bool ok,) = payable(liquidityReceiver).call{value: balance}("");
        require(ok, "Liquidity forward failed");
        emit FundsForwardedToLiquidity(balance);
    }
}`}</Code>
            <p className="font-semibold mb-2 mt-4 text-sm">Automatic overpayment refund:</p>
            <Code>{`uint256 paid   = mintPrice * quantity;
uint256 excess = msg.value - paid;
if (excess > 0) {
    (bool refunded,) = payable(msg.sender).call{value: excess}("");
    require(refunded, "Refund failed");
}`}</Code>
            <p className="font-semibold mb-2 mt-4 text-sm">One-way reveal:</p>
            <Code>{`function reveal(string calldata baseURI) external onlyOwner {
    require(!revealed, "Already revealed");
    _baseTokenURI = baseURI;
    revealed = true;
    emit Revealed(baseURI);
}`}</Code>
          </SubSection>

          <SubSection title="6.2 BittensorCatRarity">
            <p className="mb-2 text-sm text-gray-500">Address: <Addr>0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9</Addr></p>
            <p>On-chain rarity registry. Stores score, rank, and tier for all 4,699 tokens. Read functions are public and callable by any address or contract.</p>
          </SubSection>

          <SubSection title="6.3 TaoCatsMarketV2">
            <p className="mb-2 text-sm text-gray-500">Address: <Addr>0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475</Addr></p>
            <p className="mb-4">Fully on-chain marketplace. No off-chain order books, no signed messages, no trusted relay.</p>
            <Table
              headers={["Component", "Rate", "Recipient"]}
              rows={[
                ["Marketplace fee", "1.0%", "Treasury"],
                ["Creator royalty", "5.5%", "Treasury"],
                ["Total deducted", "6.5%", ""],
                ["Seller receives", "93.5%", "Seller wallet"],
              ]}
            />
            <Code className="mt-4">{`uint256 public constant MARKET_FEE_BPS  = 100;   // 1.0%
uint256 public constant ROYALTY_BPS     = 550;   // 5.5%
uint256 public constant TOTAL_FEE_BPS   = 650;   // 6.5%
uint256 public constant BPS_DENOMINATOR = 10_000;`}</Code>
          </SubSection>
        </Section>

        <Section id="section-7" number="07" title="Marketplace">
          <SubSection title="7.1 Trade Execution Flow">
            <Code>{`1. Seller calls approve(marketplaceAddress, tokenId)
2. Seller calls list(tokenId, priceInTAO)
3. Contract stores: Listing{ seller, price }
4. Buyer calls buy(tokenId) with msg.value >= listing.price
5. Contract: sellerAmount = price * 0.935, fee = price * 0.065
6. Contract transfers: TAO to seller, TAO to treasury, NFT to buyer
7. Listing is deleted`}</Code>
            <p className="mt-4 text-sm text-gray-600">Steps 5 to 7 occur atomically. Any failure reverts the entire transaction.</p>
          </SubSection>
          <SubSection title="7.2 sweepFloor">
            <Code>{`function sweepFloor(uint256[] calldata tokenIds) external payable nonReentrant`}</Code>
            <p className="mt-3 text-gray-700">Purchases multiple floor listings in one transaction. Each seller is paid individually. Excess TAO refunded automatically.</p>
          </SubSection>
          <SubSection title="7.3 listBatch">
            <Code>{`function listBatch(uint256[] calldata tokenIds, uint256[] calldata prices) external`}</Code>
            <p className="mt-3 text-gray-700">Lists multiple tokens simultaneously with a single transaction. Requires prior approval.</p>
          </SubSection>
        </Section>

        <Section id="section-8" number="08" title="Economics and Value Flow">
          <SubSection title="8.1 Value Flow">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 font-mono text-sm text-gray-700 leading-loose">
              <div className="text-center space-y-1">
                <div className="font-bold text-gray-900">MINT (0.01 TAO x 4,699 tokens = 46.99 TAO)</div>
                <div className="text-gray-400">↓ 100% forwarded at mint time (same transaction)</div>
                <div className="font-bold text-gray-900">Liquidity Receiver Wallet</div>
                <div className="text-gray-400">↓ Seeds on-chain liquidity pool</div>
                <div className="font-bold text-gray-900">On-Chain Liquidity Pool</div>
                <div className="text-gray-400">↓ Secondary trading generates</div>
                <div className="font-bold text-gray-900">Marketplace Fees (6.5% per sale)</div>
                <div className="text-gray-400">↓ Funds treasury for</div>
                <div className="font-bold text-gray-900">Ongoing Ecosystem Development</div>
              </div>
            </div>
          </SubSection>
          <SubSection title="8.2 Zero-Extraction Design">
            <Table
              headers={["Excluded Feature", "Reason"]}
              rows={[
                ["Team NFT allocation", "Team receives no reserved allocation"],
                ["Pre-mine or reserve supply", "All tokens publicly minted at the same price"],
                ["`withdraw()` in NFT contract", "Mint funds cannot be redirected"],
                ["Upgradeable proxy contracts", "Eliminates post-deploy logic changes"],
                ["Whitelist or guaranteed allocations", "Equal access for all participants"],
              ]}
            />
          </SubSection>
        </Section>

        <Section id="section-9" number="09" title="Technical Infrastructure">
          <Table
            headers={["Component", "Technology"]}
            rows={[
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
            ]}
          />
          <SubSection title="9.1 Metadata System">
            <p>
              Token metadata is served by a Next.js API route that reads pre-generated JSON files for each token ID
              and constructs a fully resolved response with an absolute image URL. Images are served from
              Vercel&apos;s CDN with{" "}
              <code className="bg-gray-100 px-1 rounded text-sm">Cache-Control: public, max-age=31536000, immutable</code>.
            </p>
          </SubSection>
          <SubSection title="9.2 RPC Proxy">
            <p>
              A custom JSON-RPC proxy at <code className="bg-gray-100 px-1 rounded text-sm">taocats.fun/api/rpc</code> handles
              Bittensor EVM gas estimation edge cases, ensuring mint and marketplace transactions simulate correctly
              across all wallets.
            </p>
          </SubSection>
        </Section>

        <Section id="section-10" number="10" title="Fairness Guarantees">
          <div className="space-y-4">
            {[
              {
                title: "Mint Funds Cannot Be Diverted",
                body: "BittensorCatNFT has no withdraw() function. _forwardToLiquidity() is called unconditionally at the end of every mint. The liquidityReceiver address is set at construction with no setter. Verify: inspect contract ABI for absence of any withdraw or setLiquidityReceiver function.",
              },
              {
                title: "No Post-Deploy Logic Changes",
                body: "None of the contracts use TransparentUpgradeableProxy, UUPSUpgradeable, or any proxy pattern. The bytecode at each address is final. Verify: confirm absence of proxy patterns on block explorer.",
              },
              {
                title: "Equal Access to Mint",
                body: "There is no whitelist check in the mint() function. The only criteria are: mint is active, quantity between 1 and 20, wallet under 20-token cap, supply not reached, sufficient TAO attached. These apply identically to every address.",
              },
              {
                title: "On-Chain Rarity Immutability",
                body: "The rarity registry has no update function. Once scores, ranks, and tiers are written, they are permanent. Verify: inspect the rarity contract for absence of setter functions callable after initial population.",
              },
            ].map((g) => (
              <div key={g.title} className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">{g.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="section-11" number="11" title="Roadmap">
          <div className="space-y-6">
            {[
              {
                phase: "Phase 1", title: "Deployment", status: "completed",
                items: [
                  { done: true, text: "Deploy BittensorCatNFT on Bittensor EVM mainnet" },
                  { done: true, text: "Deploy BittensorCatRarity" },
                  { done: true, text: "Deploy TaoCatsMarketV2 and TaoCatsMarket" },
                  { done: true, text: "Launch taocats.fun with mint, marketplace, and activity UI" },
                  { done: true, text: "Open public mint at 0.01 TAO" },
                ],
              },
              {
                phase: "Phase 2", title: "Reveal", status: "in-progress",
                items: [
                  { done: false, text: "Execute collection reveal (set baseURI in NFT contract)" },
                  { done: false, text: "Write rarity scores and ranks to BittensorCatRarity" },
                  { done: false, text: "Enable marketplace trading on taocats.fun" },
                ],
              },
              {
                phase: "Phase 3", title: "Marketplace Enhancement", status: "upcoming",
                items: [
                  { done: false, text: "Surface on-chain rarity in marketplace listings" },
                  { done: false, text: "Real-time on-chain activity feed" },
                  { done: false, text: "Trait-based search and filtering" },
                  { done: false, text: "Volume, floor history, and wallet analytics" },
                ],
              },
              {
                phase: "Phase 4", title: "Ecosystem Integration", status: "upcoming",
                items: [
                  { done: false, text: "Integration with Bittensor EVM wallets and explorers" },
                  { done: false, text: "Collaborations with Bittensor subnet projects" },
                  { done: false, text: "Cross-subnet utility exploration for TAO CAT holders" },
                ],
              },
            ].map((phase) => (
              <div key={phase.phase} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className={`px-6 py-3 flex items-center justify-between ${
                  phase.status === "completed" ? "bg-green-50 border-b border-green-100" :
                  phase.status === "in-progress" ? "bg-blue-50 border-b border-blue-100" :
                  "bg-gray-50 border-b border-gray-100"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-400">{phase.phase}</span>
                    <span className="font-semibold text-gray-900">{phase.title}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    phase.status === "completed" ? "bg-green-100 text-green-700" :
                    phase.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {phase.status === "completed" ? "Completed" :
                     phase.status === "in-progress" ? "In Progress" : "Upcoming"}
                  </span>
                </div>
                <ul className="px-6 py-4 space-y-2">
                  {phase.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className={`mt-0.5 shrink-0 ${item.done ? "text-green-500" : "text-gray-300"}`}>
                        {item.done ? "✓" : "○"}
                      </span>
                      <span className={item.done ? "line-through text-gray-400" : ""}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="section-12" number="12" title="Contract Addresses">
          <p className="text-sm text-gray-500 mb-4">All contracts deployed on <b>Bittensor EVM (Chain ID: 964)</b>.</p>
          <Table
            headers={["Contract", "Address"]}
            rows={[
              ["TAO CAT NFT (TCAT)", "0x2797341aaceAA2cE87D226E41B2fb8800FEE5184"],
              ["Rarity Registry", "0xF71287025f79f9cEec21f5F451A5C1FcE46D34a9"],
              ["MarketV2", "0xa6B87FA663D8DF0Cc8caA0347431d8599Dc8D475"],
              ["Simple Market", "0xfFF9F5eD81f805da27c022290C188eb6Fa3Ac7dE"],
            ]}
          />
          <div className="mt-4 flex flex-col gap-1 text-sm">
            <a href="https://evm-explorer.tao.network" target="_blank" rel="noopener noreferrer"
               className="text-gray-500 hover:text-gray-900 underline">
              Block Explorer: evm-explorer.tao.network
            </a>
            <a href="https://taocats.fun" className="text-gray-500 hover:text-gray-900 underline">
              Website: taocats.fun
            </a>
          </div>
        </Section>

        <Section id="section-13" number="13" title="Disclaimer">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-900 leading-relaxed space-y-3">
            <p>
              TAO CAT is an experimental digital collectible project. The NFTs described in this document are not
              financial instruments, securities, or investment contracts. Holding a TAO CAT token does not represent
              ownership in any company or legal entity.
            </p>
            <p>
              The smart contracts extend OpenZeppelin 5.x and follow established Solidity security practices.
              However, these contracts have not undergone a formal third-party security audit. Users interact with
              them at their own risk.
            </p>
            <p>
              Nothing in this document constitutes financial advice. Participants should conduct independent research
              before minting, trading, or holding any asset described herein.
            </p>
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-bold text-gray-900">TAO CAT</span> — Bittensor EVM (Chain ID: 964)
          </div>
          <a href="https://taocats.fun" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            taocats.fun
          </a>
        </div>
      </div>
    </main>
  );
}

function Section({ id, number, title, children }: { id: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-baseline gap-4 mb-6 pb-4 border-b border-gray-100">
        <span className="font-mono text-xs text-gray-300 select-none">{number}</span>
        <h2 className="text-2xl font-black text-gray-900">{title}</h2>
      </div>
      <div className="text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Code({ children, className = "" }: { children: string; className?: string }) {
  return (
    <pre className={`bg-gray-950 text-green-400 rounded-xl px-5 py-4 text-sm overflow-x-auto font-mono leading-relaxed ${className}`}>
      <code>{children}</code>
    </pre>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-700 font-mono text-xs align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Addr({ children }: { children: string }) {
  return (
    <span className="font-mono text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{children}</span>
  );
}
