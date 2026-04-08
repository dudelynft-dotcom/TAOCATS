// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TaoCatsMarketV2
 * @dev TAO Cats marketplace — full-featured single-collection market.
 *
 *  Fees:
 *   - 1.0 % marketplace fee  → treasury
 *   - 5.5 % royalty          → treasury
 *   Total: 6.5 % on every sale, remainder to seller.
 *
 *  Features:
 *   - list / delist / buy (single)
 *   - listBatch   — list multiple NFTs in one tx
 *   - sweepFloor  — buy multiple NFTs in one tx
 *   - Sellers CAN buy their own listing (for testing / edge cases)
 */
contract TaoCatsMarketV2 is ReentrancyGuard, Ownable {

    IERC721 public immutable nft;
    address public           treasury;

    uint256 public constant MARKET_FEE_BPS  = 100;   // 1.0 %
    uint256 public constant ROYALTY_BPS     = 550;   // 5.5 %
    uint256 public constant TOTAL_FEE_BPS   = 650;   // 6.5 %
    uint256 public constant BPS_DENOMINATOR = 10_000;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    uint256[] private _listedIds;
    mapping(uint256 => uint256) private _listedIdx; // tokenId → index in _listedIds

    // ── Events ────────────────────────────────────────────────────────────────
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Delisted(uint256 indexed tokenId, address indexed seller);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event TreasuryUpdated(address newTreasury);

    constructor(address _nft, address _treasury) Ownable(msg.sender) {
        nft      = IERC721(_nft);
        treasury = _treasury;
    }

    // ── LIST ─────────────────────────────────────────────────────────────────

    function list(uint256 tokenId, uint256 price) external {
        _list(tokenId, price);
    }

    /// @notice List multiple NFTs in one transaction.
    function listBatch(uint256[] calldata tokenIds, uint256[] calldata prices) external {
        require(tokenIds.length == prices.length, "Length mismatch");
        require(tokenIds.length > 0 && tokenIds.length <= 50, "1-50 tokens");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _list(tokenIds[i], prices[i]);
        }
    }

    function _list(uint256 tokenId, uint256 price) internal {
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "Not approved"
        );
        require(price > 0, "Price zero");
        require(listings[tokenId].seller == address(0), "Already listed");

        listings[tokenId] = Listing(msg.sender, price);
        _listedIdx[tokenId] = _listedIds.length;
        _listedIds.push(tokenId);

        emit Listed(tokenId, msg.sender, price);
    }

    // ── DELIST ────────────────────────────────────────────────────────────────

    function delist(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not your listing");
        _removeListing(tokenId);
        emit Delisted(tokenId, msg.sender);
    }

    // ── BUY (single) ──────────────────────────────────────────────────────────

    function buy(uint256 tokenId) external payable nonReentrant {
        _executeBuy(tokenId, msg.sender);
    }

    // ── SWEEP FLOOR (buy multiple) ────────────────────────────────────────────

    /// @notice Buy multiple NFTs in one tx. Pass exact total value = sum of prices.
    function sweepFloor(uint256[] calldata tokenIds) external payable nonReentrant {
        require(tokenIds.length > 0 && tokenIds.length <= 50, "1-50 tokens");

        // Check total cost upfront
        uint256 total = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            Listing memory l = listings[tokenIds[i]];
            require(l.seller != address(0), "Token not listed");
            total += l.price;
        }
        require(msg.value >= total, "Insufficient TAO");

        // Execute each buy
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _executeBuy(tokenIds[i], msg.sender);
        }

        // Refund overpayment
        if (msg.value > total) {
            (bool ok,) = msg.sender.call{value: msg.value - total}("");
            require(ok, "Refund failed");
        }
    }

    function _executeBuy(uint256 tokenId, address buyer) internal {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "Not listed");
        require(msg.value >= l.price || _isSweeping, "Insufficient TAO");

        _removeListing(tokenId);
        nft.transferFrom(l.seller, buyer, tokenId);

        uint256 totalFee  = (l.price * TOTAL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 payout    = l.price - totalFee;

        (bool ok1,) = l.seller.call{value: payout}("");
        require(ok1, "Pay seller failed");

        if (totalFee > 0) {
            (bool ok2,) = treasury.call{value: totalFee}("");
            require(ok2, "Pay treasury failed");
        }

        emit Sold(tokenId, l.seller, buyer, l.price);
    }

    // sweep re-entry guard flag (unused — each buy checks price inside sweep)
    bool private _isSweeping = false;

    // ── ADMIN ─────────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // ── VIEWS ─────────────────────────────────────────────────────────────────

    function getListing(uint256 tokenId)
        external view returns (address seller, uint256 price)
    {
        Listing memory l = listings[tokenId];
        return (l.seller, l.price);
    }

    function isListed(uint256 tokenId) external view returns (bool) {
        return listings[tokenId].seller != address(0);
    }

    function totalListings() external view returns (uint256) {
        return _listedIds.length;
    }

    function getPage(uint256 offset, uint256 limit)
        external view
        returns (uint256[] memory tokenIds, address[] memory sellers, uint256[] memory prices)
    {
        uint256 len = _listedIds.length;
        if (offset >= len) {
            return (new uint256[](0), new address[](0), new uint256[](0));
        }
        uint256 end = offset + limit;
        if (end > len) end = len;
        uint256 n   = end - offset;

        tokenIds = new uint256[](n);
        sellers  = new address[](n);
        prices   = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            uint256 tid = _listedIds[offset + i];
            tokenIds[i] = tid;
            sellers[i]  = listings[tid].seller;
            prices[i]   = listings[tid].price;
        }
    }

    /// @dev Total cost to buy all `tokenIds` (for sweepFloor UI)
    function sweepCost(uint256[] calldata tokenIds)
        external view returns (uint256 total)
    {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            total += listings[tokenIds[i]].price;
        }
    }

    // ── INTERNAL ──────────────────────────────────────────────────────────────

    function _removeListing(uint256 tokenId) internal {
        uint256 idx  = _listedIdx[tokenId];
        uint256 last = _listedIds[_listedIds.length - 1];
        _listedIds[idx]  = last;
        _listedIdx[last] = idx;
        _listedIds.pop();
        delete listings[tokenId];
        delete _listedIdx[tokenId];
    }
}
