// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Token
{
    string public _name = "Abdel Token";
    string public symbol = "HAI";
    uint256 public decimals = 18;
    uint256 public total_supply;

    mapping(address => uint256) public _balances;

    constructor() 
    {
        // and we should multiplie by decimals to use fractional part
        total_supply = 1000000 * (10** decimals);
        _balances[msg.sender] = total_supply;

    }

    // // function balanceOf(address account) public view virtual returns (uint256) {
    // //     return _balances[account];
    // }

    //better to use safe math and reantrancy guard compiler sol include safemath 0.8.0
    function transfer(address to,uint256 amount) public returns (bool success)
    {
        // require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");


        uint256 fromBalance = _balances[msg.sender];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[msg.sender] = fromBalance - amount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            _balances[to] += amount;
        }
        return true;
        // emit transfer(to, amount);
    }
}