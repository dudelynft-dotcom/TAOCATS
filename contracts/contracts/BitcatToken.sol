// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BitcatToken ($BITCAT)
 * @notice Community token for TAO CAT NFT ecosystem.
 *
 * Tokenomics (69,000,000,000 total):
 *   Public Sale       10%  →  6,900,000,000
 *   Liquidity Pool    15%  → 10,350,000,000
 *   Staking Season 1   2.5%→  1,725,000,000
 *   NFT Holder Airdrop 6%  →  4,140,000,000
 *   Staking Season 2  10%  →  6,900,000,000
 *   Marketing          5%  →  3,450,000,000
 *   Burn Reserve      51.5%→ 35,535,000,000
 *   Team               0%  →              0
 *
 * Chain: Bittensor EVM | Chain ID: 964
 */
contract BitcatToken is ERC20, Ownable {

    uint256 public constant TOTAL_SUPPLY = 69_000_000_000 * 10 ** 18;

    // Allocation constants
    uint256 public constant STAKING_S1_ALLOC  = 1_725_000_000 * 10 ** 18;
    uint256 public constant STAKING_S2_ALLOC  = 6_900_000_000 * 10 ** 18;
    uint256 public constant AIRDROP_ALLOC     = 4_140_000_000 * 10 ** 18;
    uint256 public constant LIQUIDITY_ALLOC   = 10_350_000_000 * 10 ** 18;
    uint256 public constant PUBLIC_SALE_ALLOC = 6_900_000_000 * 10 ** 18;
    uint256 public constant MARKETING_ALLOC   = 3_450_000_000 * 10 ** 18;
    uint256 public constant BURN_RESERVE      = 35_535_000_000 * 10 ** 18;

    event StakingContractSet(address indexed stakingContract);
    event BurnReserveTransferred(address indexed burnContract, uint256 amount);

    constructor() ERC20("BitCat Token", "BITCAT") Ownable(msg.sender) {
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /**
     * @notice Fund the staking contract with S1 allocation.
     *         Call once after deploying BitcatStaking.
     */
    function fundStaking(address stakingContract) external onlyOwner {
        require(stakingContract != address(0), "Zero address");
        _transfer(msg.sender, stakingContract, STAKING_S1_ALLOC);
        emit StakingContractSet(stakingContract);
    }
}
