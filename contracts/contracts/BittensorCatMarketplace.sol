// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BittensorCatMarketplace
 * @dev P2P marketplace for BITTENSOR CAT NFTs on Bittensor EVM.
 *      All trading fees (2.5%) go to $BTCAT liquidity pool.
 *
 * Chain: Subtensor EVM | Chain ID: 964 | RPC: https://lite.chain.opentensor.ai
 */
contract BittensorCatMarketplace is ReentrancyGuard, Ownable {

    struct Listing {
        address seller;
        uint256 price;
        bool    active;
    }

    struct Offer {
        address buyer;
        uint256 price;
        uint256 expiry;
        bool    active;
    }

    IERC721 public immutable nftContract;
    address public liquidityReceiver;
    uint256 public feePercent = 250; // 2.5% in basis points

    mapping(uint256 => Listing)   public listings;
    mapping(uint256 => Offer[])   public offers;

    uint256[]               public activeListingIds;
    mapping(uint256 => uint256) private _listingIndex;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Delisted(uint256 indexed tokenId);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee);
    event OfferMade(uint256 indexed tokenId, address indexed buyer, uint256 price, uint256 expiry);
    event OfferAccepted(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);
    event OfferCancelled(uint256 indexed tokenId, uint256 offerIndex);

    constructor(address _nftContract, address _liquidityReceiver) Ownable(msg.sender) {
        nftContract       = IERC721(_nftContract);
        liquidityReceiver = _liquidityReceiver;
    }

    // ─── LIST ────────────────────────────────────────────────────────────────

    function list(uint256 tokenId, uint256 price) external {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nftContract.isApprovedForAll(msg.sender, address(this)) ||
            nftContract.getApproved(tokenId) == address(this),
            "Marketplace not approved"
        );
        require(price > 0,               "Price must be > 0");
        require(!listings[tokenId].active, "Already listed");

        listings[tokenId] = Listing({seller: msg.sender, price: price, active: true});
        _listingIndex[tokenId] = activeListingIds.length;
        activeListingIds.push(tokenId);

        emit Listed(tokenId, msg.sender, price);
    }

    function delist(uint256 tokenId) external {
        Listing storage l = listings[tokenId];
        require(l.active, "Not listed");
        require(l.seller == msg.sender || owner() == msg.sender, "Not authorized");
        _removeListing(tokenId);
        emit Delisted(tokenId);
    }

    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        Listing storage l = listings[tokenId];
        require(l.active && l.seller == msg.sender, "Not your listing");
        require(newPrice > 0, "Price must be > 0");
        l.price = newPrice;
        emit Listed(tokenId, msg.sender, newPrice);
    }

    // ─── BUY ─────────────────────────────────────────────────────────────────

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing storage l = listings[tokenId];
        require(l.active,             "Not listed");
        require(msg.value >= l.price, "Insufficient TAO");

        address seller = l.seller;
        uint256 price  = l.price;

        _removeListing(tokenId);
        nftContract.safeTransferFrom(seller, msg.sender, tokenId);

        uint256 fee          = (price * feePercent) / 10000;
        uint256 sellerAmount = price - fee;

        (bool sellerPaid,) = payable(seller).call{value: sellerAmount}("");
        require(sellerPaid, "Seller payment failed");

        if (fee > 0) {
            (bool feePaid,) = payable(liquidityReceiver).call{value: fee}("");
            require(feePaid, "Fee transfer failed");
        }

        // Refund overpayment
        if (msg.value > price) {
            (bool refunded,) = payable(msg.sender).call{value: msg.value - price}("");
            require(refunded, "Refund failed");
        }

        emit Sold(tokenId, seller, msg.sender, price, fee);
    }

    // ─── OFFERS ──────────────────────────────────────────────────────────────

    function makeOffer(uint256 tokenId, uint256 durationSeconds) external payable {
        require(msg.value > 0, "Offer must be > 0 TAO");
        require(
            durationSeconds >= 1 hours && durationSeconds <= 30 days,
            "Duration: 1h-30d"
        );

        offers[tokenId].push(Offer({
            buyer:  msg.sender,
            price:  msg.value,
            expiry: block.timestamp + durationSeconds,
            active: true
        }));

        emit OfferMade(tokenId, msg.sender, msg.value, block.timestamp + durationSeconds);
    }

    function acceptOffer(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        require(nftContract.ownerOf(tokenId) == msg.sender, "Not owner");

        Offer storage o = offers[tokenId][offerIndex];
        require(o.active && block.timestamp < o.expiry, "Offer invalid or expired");

        address buyer  = o.buyer;
        uint256 price  = o.price;
        o.active = false;

        if (listings[tokenId].active) _removeListing(tokenId);

        nftContract.safeTransferFrom(msg.sender, buyer, tokenId);

        uint256 fee          = (price * feePercent) / 10000;
        uint256 sellerAmount = price - fee;

        (bool sellerPaid,) = payable(msg.sender).call{value: sellerAmount}("");
        require(sellerPaid, "Seller payment failed");

        if (fee > 0) {
            (bool feePaid,) = payable(liquidityReceiver).call{value: fee}("");
            require(feePaid, "Fee transfer failed");
        }

        emit OfferAccepted(tokenId, msg.sender, buyer, price);
    }

    function cancelOffer(uint256 tokenId, uint256 offerIndex) external nonReentrant {
        Offer storage o = offers[tokenId][offerIndex];
        require(o.active && o.buyer == msg.sender, "Cannot cancel");
        o.active = false;

        (bool refunded,) = payable(msg.sender).call{value: o.price}("");
        require(refunded, "Refund failed");

        emit OfferCancelled(tokenId, offerIndex);
    }

    // ─── VIEW ─────────────────────────────────────────────────────────────────

    function getActiveListings() external view returns (uint256[] memory) {
        return activeListingIds;
    }

    function getActiveListingsPage(uint256 offset, uint256 limit)
        external view
        returns (uint256[] memory tokenIds, Listing[] memory listingData)
    {
        uint256 total = activeListingIds.length;
        if (offset >= total) return (new uint256[](0), new Listing[](0));
        uint256 end   = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;

        tokenIds    = new uint256[](count);
        listingData = new Listing[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 id    = activeListingIds[offset + i];
            tokenIds[i]   = id;
            listingData[i] = listings[id];
        }
    }

    function getOffers(uint256 tokenId) external view returns (Offer[] memory) {
        return offers[tokenId];
    }

    function totalListings() external view returns (uint256) {
        return activeListingIds.length;
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function setFeePercent(uint256 _fee) external onlyOwner {
        require(_fee <= 500, "Max 5%");
        feePercent = _fee;
    }

    function setLiquidityReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Zero address");
        liquidityReceiver = _receiver;
    }

    // ─── INTERNAL ────────────────────────────────────────────────────────────

    function _removeListing(uint256 tokenId) internal {
        listings[tokenId].active = false;
        uint256 idx  = _listingIndex[tokenId];
        uint256 last = activeListingIds[activeListingIds.length - 1];
        activeListingIds[idx] = last;
        _listingIndex[last]   = idx;
        activeListingIds.pop();
        delete _listingIndex[tokenId];
    }
}
