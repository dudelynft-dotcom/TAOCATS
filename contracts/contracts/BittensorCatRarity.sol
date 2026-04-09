// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BittensorCatRarity
 * @notice Immutable on-chain rarity registry for BITTENSOR CAT NFTs.
 *         Owner sets scores/ranks once after reveal — cannot be changed afterward.
 */
contract BittensorCatRarity {
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_SUPPLY = 4699;

    // Tier thresholds (score out of 1000)
    uint16 public constant LEGENDARY_MIN  = 900;
    uint16 public constant EPIC_MIN       = 750;
    uint16 public constant RARE_MIN       = 550;
    uint16 public constant UNCOMMON_MIN   = 350;
    // < 350 → Common

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice True once scores have been committed — no further changes allowed.
    bool public locked;

    address public owner;

    /// tokenId → rarity score (0–1000)
    mapping(uint256 => uint16) private _scores;

    /// tokenId → rank (1 = rarest, 4699 = most common)
    mapping(uint256 => uint16) private _ranks;

    // ─── Events ───────────────────────────────────────────────────────────────

    event RaritySet(uint256 indexed tokenId, uint16 score, uint16 rank);
    event RarityLocked();

    // ─── Errors ───────────────────────────────────────────────────────────────

    error AlreadyLocked();
    error NotOwner();
    error InvalidTokenId();
    error ArrayLengthMismatch();
    error ScoreOutOfRange();
    error RankOutOfRange();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notLocked() {
        if (locked) revert AlreadyLocked();
        _;
    }

    // ─── Owner actions ────────────────────────────────────────────────────────

    /**
     * @notice Bulk-set rarity scores and ranks for a batch of token IDs.
     *         Can be called multiple times before locking (e.g., in chunks).
     * @param tokenIds  Array of token IDs (1-indexed, 1–4699)
     * @param scores    Rarity score for each token (0–1000; higher = rarer)
     * @param ranks     Rank for each token (1–4699; 1 = rarest)
     */
    function setRarity(
        uint256[] calldata tokenIds,
        uint16[]  calldata scores,
        uint16[]  calldata ranks
    ) external onlyOwner notLocked {
        uint256 len = tokenIds.length;
        if (len != scores.length || len != ranks.length) revert ArrayLengthMismatch();

        for (uint256 i; i < len; ++i) {
            uint256 id = tokenIds[i];
            if (id == 0 || id > MAX_SUPPLY) revert InvalidTokenId();
            if (scores[i] > 1000)           revert ScoreOutOfRange();
            if (ranks[i] == 0 || ranks[i] > MAX_SUPPLY) revert RankOutOfRange();

            _scores[id] = scores[i];
            _ranks[id]  = ranks[i];

            emit RaritySet(id, scores[i], ranks[i]);
        }
    }

    /**
     * @notice Permanently lock the registry. No more changes possible.
     *         Call this once all 4699 entries are set.
     */
    function lockRarity() external onlyOwner notLocked {
        locked = true;
        emit RarityLocked();
    }

    /**
     * @notice Transfer ownership (e.g., to multisig).
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    // ─── Public queries ───────────────────────────────────────────────────────

    /**
     * @notice Rarity score for a token (0–1000). Returns 0 if not yet set.
     */
    function scoreOf(uint256 tokenId) external view returns (uint16) {
        if (tokenId == 0 || tokenId > MAX_SUPPLY) revert InvalidTokenId();
        return _scores[tokenId];
    }

    /**
     * @notice Global rank of a token (1–4699). Returns 0 if not yet set.
     */
    function rankOf(uint256 tokenId) external view returns (uint16) {
        if (tokenId == 0 || tokenId > MAX_SUPPLY) revert InvalidTokenId();
        return _ranks[tokenId];
    }

    /**
     * @notice Human-readable rarity tier for a token.
     * @return tier  One of: "Legendary", "Epic", "Rare", "Uncommon", "Common", "Unset"
     */
    function tierOf(uint256 tokenId) external view returns (string memory tier) {
        if (tokenId == 0 || tokenId > MAX_SUPPLY) revert InvalidTokenId();
        uint16 s = _scores[tokenId];
        if (s == 0 && _ranks[tokenId] == 0) return "Unset";
        if (s >= LEGENDARY_MIN)  return "Legendary";
        if (s >= EPIC_MIN)       return "Epic";
        if (s >= RARE_MIN)       return "Rare";
        if (s >= UNCOMMON_MIN)   return "Uncommon";
        return "Common";
    }

    /**
     * @notice Returns all rarity data for a token in one call.
     * @return score   0–1000 rarity score
     * @return rank    1–4699 global rank (1 = rarest)
     * @return tier    Tier string
     */
    function rarityOf(uint256 tokenId)
        external
        view
        returns (
            uint256 score,
            uint256 rank,
            string memory tier
        )
    {
        if (tokenId == 0 || tokenId > MAX_SUPPLY) revert InvalidTokenId();
        uint16 s = _scores[tokenId];
        uint16 r = _ranks[tokenId];
        score = s;
        rank  = r;

        if (r == 0)                  tier = "Unset";
        else if (s >= LEGENDARY_MIN) tier = "Legendary";
        else if (s >= EPIC_MIN)      tier = "Epic";
        else if (s >= RARE_MIN)      tier = "Rare";
        else if (s >= UNCOMMON_MIN)  tier = "Uncommon";
        else                         tier = "Common";
    }

    /**
     * @notice Batch query — returns scores, ranks, and tier strings for an array of token IDs.
     */
    function rarityBatch(uint256[] calldata tokenIds)
        external
        view
        returns (uint256[] memory scores, uint256[] memory ranks, string[] memory tiers)
    {
        uint256 len = tokenIds.length;
        scores = new uint256[](len);
        ranks  = new uint256[](len);
        tiers  = new string[](len);
        for (uint256 i; i < len; ++i) {
            uint256 id = tokenIds[i];
            if (id == 0 || id > MAX_SUPPLY) revert InvalidTokenId();
            uint16 s = _scores[id];
            uint16 r = _ranks[id];
            scores[i] = s;
            ranks[i]  = r;
            if (r == 0)                  tiers[i] = "Unset";
            else if (s >= LEGENDARY_MIN) tiers[i] = "Legendary";
            else if (s >= EPIC_MIN)      tiers[i] = "Epic";
            else if (s >= RARE_MIN)      tiers[i] = "Rare";
            else if (s >= UNCOMMON_MIN)  tiers[i] = "Uncommon";
            else                         tiers[i] = "Common";
        }
    }
}
