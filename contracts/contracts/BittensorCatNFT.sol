// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TaoCatNFT
 * @dev 4,699 generative pixel cats on Bittensor EVM
 *
 * - Mint price: 0.015 TAO per cat (owner can update)
 * - 100% of mint fees forwarded to liquidity receiver
 * - No team allocation. No whitelist. Open to all.
 *
 * Chain: Bittensor EVM | Chain ID: 964 | Testnet: 945
 */
contract BittensorCatNFT is ERC721Enumerable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY     = 4699;
    uint256 public constant MAX_PER_WALLET = 20;

    uint256 public mintPrice = 0.015 ether; // 0.015 TAO — owner can update

    string private _baseTokenURI;
    string public  unrevealedURI;
    bool   public  revealed   = false;
    bool   public  mintActive = false;

    address public liquidityReceiver;

    mapping(address => uint256) public mintedPerWallet;

    event CatMinted(address indexed minter, uint256 indexed tokenId);
    event FundsForwardedToLiquidity(uint256 amount);
    event MintStatusChanged(bool active);
    event MintPriceChanged(uint256 newPrice);
    event Revealed(string baseURI);

    constructor(
        string memory _unrevealedURI,
        address       _liquidityReceiver
    ) ERC721("TAO CAT", "TCAT") Ownable(msg.sender) {
        unrevealedURI     = _unrevealedURI;
        liquidityReceiver = _liquidityReceiver;
    }

    // ─── MINT ────────────────────────────────────────────────────────────────

    function mint(uint256 quantity) external payable nonReentrant {
        require(mintActive,                                      "Mint not active");
        require(quantity >= 1 && quantity <= MAX_PER_WALLET,    "Invalid quantity: 1-20");
        require(totalSupply() + quantity <= MAX_SUPPLY,          "Exceeds max supply");
        require(
            mintedPerWallet[msg.sender] + quantity <= MAX_PER_WALLET,
            "Exceeds wallet limit"
        );
        require(msg.value >= mintPrice * quantity, "Insufficient TAO");

        mintedPerWallet[msg.sender] += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);
            emit CatMinted(msg.sender, tokenId);
        }

        // Forward 100% to liquidity — zero kept by contract
        _forwardToLiquidity();

        // Refund overpayment
        uint256 paid   = mintPrice * quantity;
        uint256 excess = msg.value - paid;
        if (excess > 0) {
            (bool refunded,) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Refund failed");
        }
    }

    function _forwardToLiquidity() internal {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool sent,) = payable(liquidityReceiver).call{value: balance}("");
            require(sent, "Liquidity transfer failed");
            emit FundsForwardedToLiquidity(balance);
        }
    }

    // ─── METADATA ────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        if (!revealed) return unrevealedURI;
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    function reveal(string memory baseURI) external onlyOwner {
        revealed      = true;
        _baseTokenURI = baseURI;
        emit Revealed(baseURI);
    }

    // ─── ADMIN ───────────────────────────────────────────────────────────────

    function setMintActive(bool _active) external onlyOwner {
        mintActive = _active;
        emit MintStatusChanged(_active);
    }

    function setMintPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be > 0");
        mintPrice = _price;
        emit MintPriceChanged(_price);
    }

    function setLiquidityReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "Zero address");
        liquidityReceiver = _receiver;
    }

    function setUnrevealedURI(string memory _uri) external onlyOwner {
        unrevealedURI = _uri;
    }

    function sweepToLiquidity() external onlyOwner {
        _forwardToLiquidity();
    }

    // ─── VIEW ─────────────────────────────────────────────────────────────────

    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 bal = balanceOf(owner);
        uint256[] memory tokens = new uint256[](bal);
        for (uint256 i = 0; i < bal; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    function mintCostFor(uint256 quantity) external view returns (uint256) {
        return mintPrice * quantity;
    }

    // Legacy read — returns current mintPrice (was constant in v1)
    function MINT_PRICE() external view returns (uint256) {
        return mintPrice;
    }
}
