// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Token
{
    //variables
    string public _name = "Abdel Token";
    string public symbol = "HAI";
    uint256 public decimals = 18;
    uint256 public total_supply;
    mapping(address => uint256) public _balances;
    mapping(address => mapping(address => uint256)) public allowance;

    //event
    event transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() 
    {
        // and we should multiplie by decimals to use fractional part
        total_supply = 1000000 * (10 ** decimals);
        _balances[msg.sender] = total_supply;

    }
    //better to use safe math and reantrancy guard compiler sol include safemath 0.8.0
    function Transfer(address to,uint256 amount) public returns (bool success)
    {
        _Transfer(msg.sender,to, amount);
        return true;
    }
    function _spendAllowance(address owner, address spender, uint256 amount) internal virtual {
        uint256 currentAllowance = allowance[owner][spender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "ERC20: insufficient allowance");
            unchecked {
                approve(owner, spender, currentAllowance - amount);
            }
        }
    }

    function approve(address owner, address spender, uint256 amount) public {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        allowance[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _Transfer(address from, address to,uint256 amount) internal virtual{
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        unchecked {
            _balances[from] = fromBalance - amount;
            // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
            // decrementing then incrementing.
            _balances[to] += amount;
        }
        emit transfer(from, to, amount);

    }

    function transferFrom(address from, address to, uint256 amount) public  returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _Transfer(from, to, amount);
        emit transfer(from, to, amount);
        return true;
    }

}