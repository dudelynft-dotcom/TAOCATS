// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TaoCatsMarket
 * @dev Simple single-collection marketplace for TAO Cats NFTs.
 *      list / cancel / buy — nothing else.
 */
contract TaoCatsMarket is ReentrancyGuard {

    IERC721  public immutable nft;
    address  public immutable feeReceiver;
    uint256  public constant  FEE_BPS = 250; // 2.5 %

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    uint256[] private _listedIds;
    mapping(uint256 => uint256) private _listedIdx;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event Cancelled(uint256 indexed tokenId, address indexed seller);

    constructor(address nftAddress, address _feeReceiver) {
        nft = IERC721(nftAddress);
        feeReceiver = _feeReceiver;
    }

    // ── STEP 1: caller must setApprovalForAll(this, true) on NFT contract first
    function list(uint256 tokenId, uint256 price) external {
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

    function cancel(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not your listing");
        _removeListing(tokenId);
        emit Cancelled(tokenId, msg.sender);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "Not listed");
        require(msg.value >= l.price,   "Insufficient TAO");
        require(l.seller != msg.sender, "Cannot buy own");

        _removeListing(tokenId);
        nft.transferFrom(l.seller, msg.sender, tokenId);

        uint256 fee    = (l.price * FEE_BPS) / 10_000;
        uint256 payout = l.price - fee;

        (bool ok1,) = l.seller.call{value: payout}("");
        require(ok1, "Pay seller failed");

        if (fee > 0) {
            (bool ok2,) = feeReceiver.call{value: fee}("");
            require(ok2, "Pay fee failed");
        }

        if (msg.value > l.price) {
            (bool ok3,) = msg.sender.call{value: msg.value - l.price}("");
            require(ok3, "Refund failed");
        }

        emit Sold(tokenId, l.seller, msg.sender, l.price);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getListing(uint256 tokenId) external view
        returns (address seller, uint256 price)
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

    /// @dev Returns up to `limit` active listings starting at `offset`.
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
        uint256 n = end - offset;

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

    // ── Internal ──────────────────────────────────────────────────────────────

    function _removeListing(uint256 tokenId) internal {
        uint256 idx  = _listedIdx[tokenId];
        uint256 last = _listedIds[_listedIds.length - 1];
        _listedIds[idx] = last;
        _listedIdx[last] = idx;
        _listedIds.pop();
        delete listings[tokenId];
        delete _listedIdx[tokenId];
    }
}
