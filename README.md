# ERC20 token 
test for token method 
# approve

allow exchange market to trade on your behalf
# Exchange behavior

Deposit and Withdraw funds
Manage Orders = Make or Cancel
Do Trades - charge fess

// TODO:
// [X] Set the fee account // when we deploy account we define where fee goes
// [X] Deposit Ether
// [X] Withdraw Ether
// [X] Deposit tokens // use token created and any ERC20 not allow ether deposit
// [X] Withdraw tokens
// [X] Check balances
// [ ] Make order
// [ ] Cancel order
// [ ] Fill order
// [ ] Charge fees


-------

test project
be sure you have truffle and ganache insalled 


npm install 
run ganache and import the first account in Ganache to your metamask  
truffle migrate --reset 
truffle exec sricpts/seed_exchange.js
(seed exchange markets with some orders in order to make things simple in first test before we create 'createOrder Action')

npm start 
once browser loaded connect metamask account