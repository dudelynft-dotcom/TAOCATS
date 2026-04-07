// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BtcatToken ($BTCAT)
 * @dev Community token for BITTENSOR CAT NFT holders.
 *
 * Tokenomics:
 *  - Total supply: 4,699,000,000 $BTCAT  (1,000,000 per NFT)
 *  - Team allocation: 0%
 *  - 100% distributed to NFT holders via the distributor contract
 *  - Liquidity seeded from NFT mint fees (4699 × 6.99 TAO = ~32,860 TAO)
 *
 * Chain: Subtensor EVM | Chain ID: 964
 */
contract BtcatToken is ERC20, Ownable {

    // 1,000,000 $BTCAT per NFT × 4699 NFTs
    uint256 public constant TOTAL_SUPPLY = 4_699_000_000 * 10 ** 18;

    address public distributor;
    bool    public distributorLocked = false;

    event DistributorSet(address indexed distributor);

    constructor() ERC20("BTCAT", "BTCAT") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /**
     * @notice Set the distributor once — permanently locked after first call.
     *         Transfers full supply to the distributor (airdrop / staking contract).
     */
    function setDistributor(address _distributor) external onlyOwner {
        require(!distributorLocked, "Distributor already locked");
        require(_distributor != address(0), "Zero address");

        distributor       = _distributor;
        distributorLocked = true;

        _transfer(msg.sender, _distributor, balanceOf(msg.sender));
        emit DistributorSet(_distributor);
    }
}
