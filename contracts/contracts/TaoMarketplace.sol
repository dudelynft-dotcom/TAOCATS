// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TaoMarketplace
 * @dev Universal multi-collection NFT marketplace on Bittensor EVM.
 *
 * Features:
 *  - List / delist / buy any ERC-721 NFT
 *  - NFT-level offers (specific tokenId)
 *  - Collection-level offers (any token from collection)
 *  - Per-collection volume & floor tracking (for indexer)
 *  - Admin: verify/unverify collections, set fee, pause
 *
 * Chain: Bittensor EVM | Chain ID: 964
 */
contract TaoMarketplace is ReentrancyGuard, Ownable {

    // ─── CONSTANTS ────────────────────────────────────────────────────────────
    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public constant MAX_FEE         = 500;   // 5 %

    // ─── STATE ────────────────────────────────────────────────────────────────
    uint256 public feePercent    = 250;   // 2.5 % in bps
    address public feeReceiver;
    bool    public paused        = false;

    // ── listings ──────────────────────────────────────────────────────────────
    struct Listing {
        address seller;
        uint256 price;
        bool    active;
    }
    // collection => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    // per-collection active listing arrays (for pagination)
    mapping(address => uint256[]) private _activeIds;
    mapping(address => mapping(uint256 => uint256)) private _activeIdx;

    // ── NFT-level offers ──────────────────────────────────────────────────────
    struct Offer {
        address buyer;
        uint256 price;
        uint64  expiry;
        bool    active;
    }
    // collection => tokenId => offers
    mapping(address => mapping(uint256 => Offer[])) public nftOffers;

    // ── Collection-level offers ───────────────────────────────────────────────
    struct CollectionOffer {
        address buyer;
        uint256 price;
        uint64  expiry;
        bool    active;
    }
    // collection => collection offers
    mapping(address => CollectionOffer[]) public collectionOffers;

    // ── Collection stats (for indexer / frontend) ──────────────────────────────
    struct CollectionInfo {
        bool    verified;
        bool    spam;
        uint256 volume;       // total TAO volume
        uint256 salesCount;
        uint256 floorPrice;   // lowest active listing
    }
    mapping(address => CollectionInfo) public collections;
    address[] public allCollections;
    mapping(address => bool) private _knownCollection;

    // ─── EVENTS ───────────────────────────────────────────────────────────────
    event Listed(address indexed collection, uint256 indexed tokenId, address indexed seller, uint256 price);
    event Delisted(address indexed collection, uint256 indexed tokenId, address indexed seller);
    event PriceUpdated(address indexed collection, uint256 indexed tokenId, uint256 newPrice);
    event Sold(address indexed collection, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price, uint256 fee);

    event OfferMade(address indexed collection, uint256 indexed tokenId, address indexed buyer, uint256 price, uint64 expiry);
    event OfferCancelled(address indexed collection, uint256 indexed tokenId, uint256 offerIndex);
    event OfferAccepted(address indexed collection, uint256 indexed tokenId, address seller, address indexed buyer, uint256 price);

    event CollectionOfferMade(address indexed collection, address indexed buyer, uint256 price, uint64 expiry);
    event CollectionOfferCancelled(address indexed collection, uint256 offerIndex);
    event CollectionOfferAccepted(address indexed collection, uint256 tokenId, address seller, address indexed buyer, uint256 price);

    event CollectionVerified(address indexed collection, bool verified);
    event CollectionFlagged(address indexed collection, bool spam);
    event FeeUpdated(uint256 newFee);

    // ─── MODIFIERS ────────────────────────────────────────────────────────────
    modifier notPaused() { require(!paused, "Marketplace paused"); _; }

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────
    constructor(address _feeReceiver) Ownable(msg.sender) {
        feeReceiver = _feeReceiver;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LISTING
    // ═══════════════════════════════════════════════════════════════════════════

    function list(address collection, uint256 tokenId, uint256 price) external notPaused {
        IERC721 nft = IERC721(collection);
        require(nft.ownerOf(tokenId) == msg.sender,                         "Not owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),                      "Not approved"
        );
        require(price > 0,                                                  "Price must be > 0");
        require(!listings[collection][tokenId].active,                      "Already listed");
        require(!collections[collection].spam,                              "Collection flagged");

        listings[collection][tokenId] = Listing({ seller: msg.sender, price: price, active: true });

        _activeIdx[collection][tokenId] = _activeIds[collection].length;
        _activeIds[collection].push(tokenId);

        _registerCollection(collection);
        _updateFloor(collection);

        emit Listed(collection, tokenId, msg.sender, price);
    }

    function delist(address collection, uint256 tokenId) external nonReentrant {
        Listing storage l = listings[collection][tokenId];
        require(l.active,                                       "Not listed");
        require(l.seller == msg.sender || msg.sender == owner(), "Not authorized");

        address seller = l.seller;
        _removeListing(collection, tokenId);
        _updateFloor(collection);

        emit Delisted(collection, tokenId, seller);
    }

    function updatePrice(address collection, uint256 tokenId, uint256 newPrice) external {
        Listing storage l = listings[collection][tokenId];
        require(l.active && l.seller == msg.sender, "Not your listing");
        require(newPrice > 0, "Price must be > 0");
        l.price = newPrice;
        _updateFloor(collection);
        emit PriceUpdated(collection, tokenId, newPrice);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUY
    // ═══════════════════════════════════════════════════════════════════════════

    function buy(address collection, uint256 tokenId) external payable nonReentrant notPaused {
        Listing storage l = listings[collection][tokenId];
        require(l.active,             "Not listed");
        require(msg.value >= l.price, "Insufficient TAO");
        require(l.seller != msg.sender, "Cannot buy own listing");

        address seller = l.seller;
        uint256 price  = l.price;

        _removeListing(collection, tokenId);

        // Transfer NFT
        IERC721(collection).safeTransferFrom(seller, msg.sender, tokenId);

        // Distribute payment
        uint256 fee          = (price * feePercent) / FEE_DENOMINATOR;
        uint256 sellerAmount = price - fee;

        (bool ok1,) = payable(seller).call{value: sellerAmount}("");
        require(ok1, "Seller payment failed");

        if (fee > 0) {
            (bool ok2,) = payable(feeReceiver).call{value: fee}("");
            require(ok2, "Fee payment failed");
        }

        // Refund excess
        if (msg.value > price) {
            (bool ok3,) = payable(msg.sender).call{value: msg.value - price}("");
            require(ok3, "Refund failed");
        }

        // Stats
        CollectionInfo storage info = collections[collection];
        info.volume     += price;
        info.salesCount += 1;
        _updateFloor(collection);

        emit Sold(collection, tokenId, seller, msg.sender, price, fee);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // NFT OFFERS
    // ═══════════════════════════════════════════════════════════════════════════

    function makeOffer(address collection, uint256 tokenId, uint64 expiry) external payable notPaused {
        require(msg.value > 0,              "Offer price = 0");
        require(expiry > block.timestamp,   "Expiry in past");
        require(expiry <= block.timestamp + 30 days, "Max 30 days");

        nftOffers[collection][tokenId].push(Offer({
            buyer:  msg.sender,
            price:  msg.value,
            expiry: expiry,
            active: true
        }));

        _registerCollection(collection);
        emit OfferMade(collection, tokenId, msg.sender, msg.value, expiry);
    }

    function acceptOffer(address collection, uint256 tokenId, uint256 offerIndex) external nonReentrant notPaused {
        require(IERC721(collection).ownerOf(tokenId) == msg.sender, "Not owner");

        Offer storage o = nftOffers[collection][tokenId][offerIndex];
        require(o.active,                       "Offer not active");
        require(block.timestamp < o.expiry,     "Offer expired");

        address buyer = o.buyer;
        uint256 price = o.price;
        o.active = false;

        // Cancel any active listing
        if (listings[collection][tokenId].active) {
            _removeListing(collection, tokenId);
        }

        IERC721(collection).safeTransferFrom(msg.sender, buyer, tokenId);

        uint256 fee          = (price * feePercent) / FEE_DENOMINATOR;
        uint256 sellerAmount = price - fee;

        (bool ok1,) = payable(msg.sender).call{value: sellerAmount}("");
        require(ok1, "Seller payment failed");

        if (fee > 0) {
            (bool ok2,) = payable(feeReceiver).call{value: fee}("");
            require(ok2, "Fee payment failed");
        }

        CollectionInfo storage info = collections[collection];
        info.volume     += price;
        info.salesCount += 1;
        _updateFloor(collection);

        emit OfferAccepted(collection, tokenId, msg.sender, buyer, price);
    }

    function cancelOffer(address collection, uint256 tokenId, uint256 offerIndex) external nonReentrant {
        Offer storage o = nftOffers[collection][tokenId][offerIndex];
        require(o.buyer == msg.sender && o.active, "Cannot cancel");
        o.active = false;

        (bool ok,) = payable(msg.sender).call{value: o.price}("");
        require(ok, "Refund failed");

        emit OfferCancelled(collection, tokenId, offerIndex);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COLLECTION OFFERS
    // ═══════════════════════════════════════════════════════════════════════════

    function makeCollectionOffer(address collection, uint64 expiry) external payable notPaused {
        require(msg.value > 0,            "Offer price = 0");
        require(expiry > block.timestamp, "Expiry in past");
        require(expiry <= block.timestamp + 30 days, "Max 30 days");

        collectionOffers[collection].push(CollectionOffer({
            buyer:  msg.sender,
            price:  msg.value,
            expiry: expiry,
            active: true
        }));

        _registerCollection(collection);
        emit CollectionOfferMade(collection, msg.sender, msg.value, expiry);
    }

    function acceptCollectionOffer(address collection, uint256 tokenId, uint256 offerIndex) external nonReentrant notPaused {
        require(IERC721(collection).ownerOf(tokenId) == msg.sender, "Not owner");

        CollectionOffer storage o = collectionOffers[collection][offerIndex];
        require(o.active,                   "Offer not active");
        require(block.timestamp < o.expiry, "Offer expired");

        address buyer = o.buyer;
        uint256 price = o.price;
        o.active = false;

        if (listings[collection][tokenId].active) {
            _removeListing(collection, tokenId);
        }

        IERC721(collection).safeTransferFrom(msg.sender, buyer, tokenId);

        uint256 fee          = (price * feePercent) / FEE_DENOMINATOR;
        uint256 sellerAmount = price - fee;

        (bool ok1,) = payable(msg.sender).call{value: sellerAmount}("");
        require(ok1, "Seller payment failed");

        if (fee > 0) {
            (bool ok2,) = payable(feeReceiver).call{value: fee}("");
            require(ok2, "Fee payment failed");
        }

        CollectionInfo storage info = collections[collection];
        info.volume     += price;
        info.salesCount += 1;
        _updateFloor(collection);

        emit CollectionOfferAccepted(collection, tokenId, msg.sender, buyer, price);
    }

    function cancelCollectionOffer(address collection, uint256 offerIndex) external nonReentrant {
        CollectionOffer storage o = collectionOffers[collection][offerIndex];
        require(o.buyer == msg.sender && o.active, "Cannot cancel");
        o.active = false;

        (bool ok,) = payable(msg.sender).call{value: o.price}("");
        require(ok, "Refund failed");

        emit CollectionOfferCancelled(collection, offerIndex);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════

    function getListingsPage(address collection, uint256 offset, uint256 limit)
        external view
        returns (uint256[] memory tokenIds, Listing[] memory data)
    {
        uint256 total = _activeIds[collection].length;
        if (offset >= total) return (new uint256[](0), new Listing[](0));
        uint256 end   = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        tokenIds = new uint256[](count);
        data     = new Listing[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 id   = _activeIds[collection][offset + i];
            tokenIds[i]  = id;
            data[i]      = listings[collection][id];
        }
    }

    function getNftOffers(address collection, uint256 tokenId) external view returns (Offer[] memory) {
        return nftOffers[collection][tokenId];
    }

    function getCollectionOffers(address collection) external view returns (CollectionOffer[] memory) {
        return collectionOffers[collection];
    }

    function getCollectionCount() external view returns (uint256) {
        return allCollections.length;
    }

    function getCollectionsPage(uint256 offset, uint256 limit)
        external view
        returns (address[] memory addrs, CollectionInfo[] memory infos)
    {
        uint256 total = allCollections.length;
        if (offset >= total) return (new address[](0), new CollectionInfo[](0));
        uint256 end   = offset + limit > total ? total : offset + limit;
        uint256 count = end - offset;
        addrs = new address[](count);
        infos = new CollectionInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            addrs[i] = allCollections[offset + i];
            infos[i] = collections[allCollections[offset + i]];
        }
    }

    function activeListingCount(address collection) external view returns (uint256) {
        return _activeIds[collection].length;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════

    function setVerified(address collection, bool verified) external onlyOwner {
        collections[collection].verified = verified;
        _registerCollection(collection);
        emit CollectionVerified(collection, verified);
    }

    function setSpam(address collection, bool spam) external onlyOwner {
        collections[collection].spam = spam;
        emit CollectionFlagged(collection, spam);
    }

    function setFeePercent(uint256 _fee) external onlyOwner {
        require(_fee <= MAX_FEE, "Exceeds max fee");
        feePercent = _fee;
        emit FeeUpdated(_fee);
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Zero address");
        feeReceiver = _receiver;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function rescueETH() external onlyOwner {
        (bool ok,) = payable(owner()).call{value: address(this).balance}("");
        require(ok, "Transfer failed");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL
    // ═══════════════════════════════════════════════════════════════════════════

    function _removeListing(address collection, uint256 tokenId) internal {
        listings[collection][tokenId].active = false;
        uint256[] storage ids = _activeIds[collection];
        uint256 idx  = _activeIdx[collection][tokenId];
        uint256 last = ids[ids.length - 1];
        ids[idx]                       = last;
        _activeIdx[collection][last]   = idx;
        ids.pop();
        delete _activeIdx[collection][tokenId];
    }

    function _registerCollection(address collection) internal {
        if (!_knownCollection[collection]) {
            _knownCollection[collection] = true;
            allCollections.push(collection);
        }
    }

    function _updateFloor(address collection) internal {
        uint256[] storage ids = _activeIds[collection];
        uint256 floor = 0;
        uint256 count = ids.length < 50 ? ids.length : 50; // scan first 50
        for (uint256 i = 0; i < count; i++) {
            uint256 p = listings[collection][ids[i]].price;
            if (floor == 0 || p < floor) floor = p;
        }
        collections[collection].floorPrice = floor;
    }
}
