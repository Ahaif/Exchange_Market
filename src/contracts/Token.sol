// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Fixed-supply demo token. No privileged minting or transfer controls.
contract Token is ERC20 {
    constructor() ERC20("Abdel Token", "HAI") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
}
