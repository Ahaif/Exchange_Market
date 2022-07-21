// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Token.sol";

contract Exchange{

    address public feeAccount;
    uint256 public feePercent;
    address constant ETHER = address(0);//store ether in tokensMap with blank address
    mapping(address => mapping(address => uint256)) public tokensMap;
    // first key is the token 
    // second key is  the user address

    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);

    constructor(address _feeAccount, uint256 _feePercent)
    {
        feeAccount = _feeAccount;
        feePercent = _feePercent;

    }

    receive() external payable
    {
        revert();
    }

    function depositEther()public payable{
        tokensMap[ETHER][msg.sender] = tokensMap[ETHER][msg.sender] + msg.value;
         emit Deposit(ETHER, msg.sender, msg.value,tokensMap[ETHER][msg.sender]);

    }

    function withdrawEther(uint256 _amount) public {

        require(tokensMap[ETHER][msg.sender] >= _amount);
        unchecked {
            tokensMap[ETHER][msg.sender] = tokensMap[ETHER][msg.sender] - _amount;
        }
        
        payable(msg.sender).transfer(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokensMap[ETHER][msg.sender]);
    }

    function depositToken(address _token, uint256 _amount) public {
        require(_token != ETHER);
        unchecked {
            tokensMap[_token][msg.sender] = tokensMap[_token][msg.sender] + _amount;
        }
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));// move token to itself
        emit Deposit(_token, msg.sender, _amount,tokensMap[_token][msg.sender]);
    }

    function withdraToken(address _token, uint256 _amount) public {
        require(_token != ETHER);
        uint256 tokenBalance = tokensMap[_token][msg.sender];
        require(tokenBalance >= _amount);
        unchecked {
            tokensMap[_token][msg.sender] = tokensMap[_token][msg.sender] - _amount;
            require(Token(_token).Transfer(msg.sender ,_amount));  
            emit Withdraw(_token, msg.sender, _amount, tokensMap[_token][msg.sender]); 
        }
        
           
        

    }


}