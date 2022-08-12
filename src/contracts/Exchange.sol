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
    mapping(uint256 => _Order) public orders;
    uint256 public orderCount;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestap
    );
    event Cancel(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestap
    );
   event Trade(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address userFill,
        uint256 timestap
   );

    struct  _Order{
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestap;
    }

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
        unchecked {
            tokensMap[ETHER][msg.sender] = tokensMap[ETHER][msg.sender] + msg.value;
        }
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
        }
        require(Token(_token).Transfer(msg.sender ,_amount));  
        emit Withdraw(_token, msg.sender, _amount, tokensMap[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns(uint256){
        return tokensMap[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive ) public {

        orderCount = orderCount + 1;
        orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
    }

    function cancelOrder(uint256 _id) public{

        _Order storage _order = orders[_id];
        require(address(_order.user) == msg.sender);
        require(_order.id == _id);
        orderCancelled[_id] = true;
        emit Cancel(_order.id, msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);
    }

    function fillOrder(uint256 _id)public{
        require(_id > 0 && _id <= orderCount);
        require(!orderFilled[_id]);
        require(!orderCancelled[_id]);
        _Order storage _order = orders[_id];  //fetch order
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
        orderFilled[_order.id] = true;
    }
    function _trade(uint256 _orderId, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal{
        // do trade
        // charge fess 
        //mark the order as filled 
        //emit trade event 
        // require(tokensMap[_tokenGet][msg.sender] >= _amountGet);
        // require(tokensMap[_tokenGive][msg.sender] >= _amountGive);
        unchecked {
            uint256 feeAmount = (_amountGive * feePercent) / 100;
            // user is the person creating order, msg.sender is the one who fill order
            tokensMap[_tokenGet][msg.sender] = tokensMap[_tokenGet][msg.sender] - (_amountGet + feeAmount);
            tokensMap[_tokenGet][_user] = tokensMap[_tokenGet][_user] + _amountGet;
            tokensMap[_tokenGet][feeAccount] = tokensMap[_tokenGet][feeAccount] + feeAmount;
            tokensMap[_tokenGive][_user] = tokensMap[_tokenGive][_user] - _amountGive;
            tokensMap[_tokenGive][msg.sender] = tokensMap[_tokenGet][msg.sender] + _amountGive;
        }
        emit Trade(_orderId, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, block.timestamp);
    }
}