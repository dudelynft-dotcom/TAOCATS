// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRarity {
    function scoreOf(uint256 tokenId) external view returns (uint16);
}

/**
 * @title BitcatStaking
 * @notice Stake TAO CAT NFTs to earn $BITCAT rewards.
 *
 * Reward model:
 *   Base rate:  4,079 BITCAT per cat per day
 *   Rarity multiplier: Common 1x | Uncommon 1.2x | Rare 1.5x | Epic 2x | Legendary 3x
 *   Collection bonus:  3 cats +10% | 5 cats +20% | 10 cats +50%
 *   Lock bonus:        7-day lock +25% | 30-day lock +80%
 *   Trading boost:     tier 1 +5% | tier 2 +10% | tier 3 +15%
 *
 * Season 1 pool: 1,725,000,000 BITCAT over 90 days
 * Chain: Bittensor EVM | Chain ID: 964
 */
contract BitcatStaking is IERC721Receiver, Ownable, ReentrancyGuard {

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @dev 4,079 BITCAT per cat per day (base, before multipliers)
    uint256 public constant BASE_RATE_PER_DAY = 4_079 * 1e18;

    uint256 public constant SEASON_DURATION = 90 days;

    // Rarity score thresholds — mirror BittensorCatRarity
    uint16 public constant LEGENDARY_MIN = 900;
    uint16 public constant EPIC_MIN      = 750;
    uint16 public constant RARE_MIN      = 550;
    uint16 public constant UNCOMMON_MIN  = 350;

    // Lock options
    uint8 public constant LOCK_NONE    = 0;
    uint8 public constant LOCK_7_DAYS  = 1;
    uint8 public constant LOCK_30_DAYS = 2;

    // ─── Immutables ───────────────────────────────────────────────────────────

    IERC721  public immutable nft;
    IERC20   public immutable bitcat;
    IRarity  public immutable rarity;

    uint256  public immutable startTime;
    uint256  public immutable endTime;

    // ─── State ────────────────────────────────────────────────────────────────

    struct StakeInfo {
        address owner;
        uint64  stakedAt;
        uint64  lockUntil;   // 0 = no lock
        uint64  lastClaim;
    }

    /// tokenId → stake info
    mapping(uint256 => StakeInfo) public stakes;

    /// owner → list of staked token IDs
    mapping(address => uint256[]) private _stakedByOwner;

    /// trading boost tier: 0=none, 1=+5%, 2=+10%, 3=+15%
    mapping(address => uint8) public tradingBoostTier;

    uint256 public totalStaked;

    /// address that can update trading boosts (backend / owner)
    address public boostUpdater;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Staked(address indexed owner, uint256 indexed tokenId, uint64 lockUntil);
    event Unstaked(address indexed owner, uint256 indexed tokenId);
    event Claimed(address indexed owner, uint256 amount);
    event TradingBoostUpdated(address indexed user, uint8 tier);
    event BoostUpdaterChanged(address indexed updater);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _nft,
        address _bitcat,
        address _rarity
    ) Ownable(msg.sender) {
        require(_nft    != address(0), "zero nft");
        require(_bitcat != address(0), "zero bitcat");
        require(_rarity != address(0), "zero rarity");
        nft          = IERC721(_nft);
        bitcat       = IERC20(_bitcat);
        rarity       = IRarity(_rarity);
        startTime    = block.timestamp;
        endTime      = block.timestamp + SEASON_DURATION;
        boostUpdater = msg.sender;
    }

    // ─── Staking ──────────────────────────────────────────────────────────────

    /**
     * @notice Stake one or more NFTs.
     * @param tokenIds   Array of token IDs to stake.
     * @param lockOption 0 = no lock | 1 = 7-day lock | 2 = 30-day lock
     */
    function stake(uint256[] calldata tokenIds, uint8 lockOption) external nonReentrant {
        require(block.timestamp < endTime, "Season ended");
        require(tokenIds.length > 0, "Empty array");
        require(lockOption <= LOCK_30_DAYS, "Invalid lock");

        uint64 lockUntil = 0;
        if (lockOption == LOCK_7_DAYS)  lockUntil = uint64(block.timestamp + 7 days);
        if (lockOption == LOCK_30_DAYS) lockUntil = uint64(block.timestamp + 30 days);

        for (uint256 i = 0; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            require(nft.ownerOf(id) == msg.sender, "Not owner");
            require(stakes[id].owner == address(0), "Already staked");

            nft.transferFrom(msg.sender, address(this), id);

            stakes[id] = StakeInfo({
                owner:     msg.sender,
                stakedAt:  uint64(block.timestamp),
                lockUntil: lockUntil,
                lastClaim: uint64(block.timestamp)
            });
            _stakedByOwner[msg.sender].push(id);
            ++totalStaked;

            emit Staked(msg.sender, id, lockUntil);
        }
    }

    /**
     * @notice Unstake NFTs and collect all pending rewards.
     */
    function unstake(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0, "Empty array");

        // Snapshot count before any removals for consistent collection bonus
        uint256 countSnapshot = _stakedByOwner[msg.sender].length;

        uint256 totalRewards = 0;
        for (uint256 i = 0; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            StakeInfo memory s = stakes[id];
            require(s.owner == msg.sender, "Not staker");
            require(block.timestamp >= s.lockUntil, "Still locked");
            totalRewards += _calcPending(id, s, countSnapshot, msg.sender);
        }

        for (uint256 i = 0; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            delete stakes[id];
            _removeFromList(msg.sender, id);
            --totalStaked;
            nft.transferFrom(address(this), msg.sender, id);
            emit Unstaked(msg.sender, id);
        }

        if (totalRewards > 0) _pay(msg.sender, totalRewards);
    }

    /**
     * @notice Claim all pending rewards without unstaking.
     */
    function claim() external nonReentrant {
        uint256[] storage ids = _stakedByOwner[msg.sender];
        require(ids.length > 0, "Nothing staked");

        uint256 count = ids.length;
        uint256 totalRewards = 0;

        for (uint256 i = 0; i < count; ++i) {
            uint256 id = ids[i];
            StakeInfo memory s = stakes[id];
            totalRewards += _calcPending(id, s, count, msg.sender);
            stakes[id].lastClaim = uint64(block.timestamp < endTime ? block.timestamp : endTime);
        }

        require(totalRewards > 0, "No rewards");
        _pay(msg.sender, totalRewards);
        emit Claimed(msg.sender, totalRewards);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function pendingRewardsOf(address user) external view returns (uint256 total) {
        uint256[] memory ids = _stakedByOwner[user];
        uint256 count = ids.length;
        for (uint256 i = 0; i < count; ++i) {
            total += _calcPending(ids[i], stakes[ids[i]], count, user);
        }
    }

    function stakedTokensOf(address user) external view returns (uint256[] memory) {
        return _stakedByOwner[user];
    }

    function dailyRateOf(uint256 tokenId) external view returns (uint256) {
        StakeInfo memory s = stakes[tokenId];
        if (s.owner == address(0)) return 0;
        uint256 count = _stakedByOwner[s.owner].length;
        return _dailyRate(tokenId, s, count, s.owner);
    }

    function seasonEndsIn() external view returns (uint256) {
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Update trading boost tiers for a batch of users.
     *         Called weekly by backend based on marketplace volume.
     * @param users Array of user addresses
     * @param tiers Array of tiers: 0=none 1=+5% 2=+10% 3=+15%
     */
    function setTradingBoosts(address[] calldata users, uint8[] calldata tiers) external {
        require(msg.sender == boostUpdater || msg.sender == owner(), "Not authorized");
        require(users.length == tiers.length, "Length mismatch");
        for (uint256 i = 0; i < users.length; ++i) {
            require(tiers[i] <= 3, "Invalid tier");
            tradingBoostTier[users[i]] = tiers[i];
            emit TradingBoostUpdated(users[i], tiers[i]);
        }
    }

    function setBoostUpdater(address _updater) external onlyOwner {
        require(_updater != address(0), "Zero address");
        boostUpdater = _updater;
        emit BoostUpdaterChanged(_updater);
    }

    /**
     * @notice Recover unspent BITCAT after season + 30-day grace period.
     */
    function recoverBitcat() external onlyOwner {
        require(block.timestamp > endTime + 30 days, "Too early");
        uint256 bal = bitcat.balanceOf(address(this));
        if (bal > 0) bitcat.transfer(owner(), bal);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _calcPending(
        uint256 tokenId,
        StakeInfo memory s,
        uint256 stakedCount,
        address user
    ) internal view returns (uint256) {
        if (s.owner != user) return 0;
        uint256 calcTo = block.timestamp < endTime ? block.timestamp : endTime;
        if (calcTo <= uint256(s.lastClaim)) return 0;
        uint256 elapsed = calcTo - uint256(s.lastClaim);
        uint256 rate = _dailyRate(tokenId, s, stakedCount, user);
        return (rate * elapsed) / 1 days;
    }

    function _dailyRate(
        uint256 tokenId,
        StakeInfo memory s,
        uint256 stakedCount,
        address user
    ) internal view returns (uint256) {
        uint256 rate = BASE_RATE_PER_DAY;

        // 1. Rarity multiplier
        uint16 score = rarity.scoreOf(tokenId);
        if      (score >= LEGENDARY_MIN) rate = (rate * 300) / 100;  // 3x
        else if (score >= EPIC_MIN)      rate = (rate * 200) / 100;  // 2x
        else if (score >= RARE_MIN)      rate = (rate * 150) / 100;  // 1.5x
        else if (score >= UNCOMMON_MIN)  rate = (rate * 120) / 100;  // 1.2x
        // else Common: 1x (no change)

        // 2. Collection bonus
        if      (stakedCount >= 10) rate = (rate * 150) / 100;  // +50%
        else if (stakedCount >= 5)  rate = (rate * 120) / 100;  // +20%
        else if (stakedCount >= 3)  rate = (rate * 110) / 100;  // +10%

        // 3. Lock bonus
        if (s.lockUntil > s.stakedAt) {
            uint256 lockDuration = uint256(s.lockUntil) - uint256(s.stakedAt);
            if      (lockDuration >= 30 days) rate = (rate * 180) / 100;  // +80%
            else if (lockDuration >= 7 days)  rate = (rate * 125) / 100;  // +25%
        }

        // 4. Trading boost
        uint8 tier = tradingBoostTier[user];
        if      (tier == 3) rate = (rate * 115) / 100;  // +15%
        else if (tier == 2) rate = (rate * 110) / 100;  // +10%
        else if (tier == 1) rate = (rate * 105) / 100;  // +5%

        return rate;
    }

    function _pay(address to, uint256 amount) internal {
        uint256 available = bitcat.balanceOf(address(this));
        if (amount > available) amount = available;
        if (amount > 0) bitcat.transfer(to, amount);
    }

    function _removeFromList(address user, uint256 tokenId) internal {
        uint256[] storage list = _stakedByOwner[user];
        uint256 len = list.length;
        for (uint256 i = 0; i < len; ++i) {
            if (list[i] == tokenId) {
                list[i] = list[len - 1];
                list.pop();
                return;
            }
        }
    }

    function onERC721Received(
        address, address, uint256, bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
