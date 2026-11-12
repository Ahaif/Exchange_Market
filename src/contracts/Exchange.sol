// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Testnet HAI/ETH exchange. Orders are unreserved and checked at fill time.
contract Exchange is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public constant ETHER = address(0);
    address public immutable token;
    address public immutable feeAccount;
    uint256 public immutable feeBps;
    mapping(address => mapping(address => uint256)) public balanceOf;
    struct OrderData {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }
    mapping(uint256 => OrderData) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;
    uint256 public orderCount;
    event Deposit(address indexed token, address indexed user, uint256 amount, uint256 balance);
    event Withdraw(address indexed token, address indexed user, uint256 amount, uint256 balance);
    event Order(uint256 indexed id, address indexed user);
    event Cancel(uint256 indexed id, address indexed user);
    event Trade(uint256 indexed id, address indexed maker, address indexed taker);

    constructor(address token_, address feeAccount_, uint256 feeBps_) {
        require(token_.code.length > 0 && feeAccount_ != address(0), "Invalid configuration");
        require(feeBps_ <= 1000, "Fee exceeds 10%");
        token = token_; feeAccount = feeAccount_; feeBps = feeBps_;
    }
    function depositEther() external payable nonReentrant {
        require(msg.value > 0, "Zero amount");
        balanceOf[ETHER][msg.sender] += msg.value;
        emit Deposit(ETHER, msg.sender, msg.value, balanceOf[ETHER][msg.sender]);
    }
    function withdrawEther(uint256 amount) external nonReentrant {
        require(amount > 0 && balanceOf[ETHER][msg.sender] >= amount, "Insufficient balance");
        balanceOf[ETHER][msg.sender] -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "ETH transfer failed");
        emit Withdraw(ETHER, msg.sender, amount, balanceOf[ETHER][msg.sender]);
    }
    function depositToken(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        require(IERC20(token).balanceOf(address(this)) - beforeBalance == amount, "Unsupported token behavior");
        balanceOf[token][msg.sender] += amount;
        emit Deposit(token, msg.sender, amount, balanceOf[token][msg.sender]);
    }
    function withdrawToken(uint256 amount) external nonReentrant {
        require(amount > 0 && balanceOf[token][msg.sender] >= amount, "Insufficient balance");
        balanceOf[token][msg.sender] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit Withdraw(token, msg.sender, amount, balanceOf[token][msg.sender]);
    }
    function makeOrder(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive) external {
        require((tokenGet == token && tokenGive == ETHER) || (tokenGet == ETHER && tokenGive == token), "Invalid pair");
        require(amountGet > 0 && amountGive > 0, "Zero amount");
        require(balanceOf[tokenGive][msg.sender] >= amountGive, "Insufficient balance");
        uint256 id = ++orderCount;
        orders[id] = OrderData(id, msg.sender, tokenGet, amountGet, tokenGive, amountGive, block.timestamp);
        emit Order(id, msg.sender);
    }
    function cancelOrder(uint256 id) external {
        require(id > 0 && id <= orderCount, "Invalid order");
        require(orders[id].user == msg.sender, "Not maker");
        require(!orderCancelled[id] && !orderFilled[id], "Order closed");
        orderCancelled[id] = true;
        emit Cancel(id, msg.sender);
    }
    function fillOrder(uint256 id) external nonReentrant {
        require(id > 0 && id <= orderCount, "Invalid order");
        require(!orderCancelled[id] && !orderFilled[id], "Order closed");
        OrderData memory o = orders[id];
        require(o.user != msg.sender, "Self trade");
        uint256 fee = o.amountGet * feeBps / 10_000;
        require(balanceOf[o.tokenGet][msg.sender] >= o.amountGet + fee, "Insufficient taker balance");
        require(balanceOf[o.tokenGive][o.user] >= o.amountGive, "Insufficient maker balance");
        orderFilled[id] = true;
        balanceOf[o.tokenGet][msg.sender] -= o.amountGet + fee;
        balanceOf[o.tokenGet][o.user] += o.amountGet;
        balanceOf[o.tokenGet][feeAccount] += fee;
        balanceOf[o.tokenGive][o.user] -= o.amountGive;
        balanceOf[o.tokenGive][msg.sender] += o.amountGive;
        emit Trade(id, o.user, msg.sender);
    }
}
