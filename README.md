# Exchange Market

the Application is hosted using Heroku you can test it via this link : https://hai-token-exchange.herokuapp.com/
(the application is still in test mode please report for any bugs found)

you can see all the dependencies needed for the project in package.json 

you should connect to your Ethereum client (i use Ganache on port 8545)
- make sure that ganache is runinng and export private key of first account to your metamask wallet

Backend :
- Smart Contracts: Deployed to Local Network [Ganache]
- TOKEN : token (HAI) -> functionallity of ERC20 token
- EXCHANGE : manage the logique of exchange market(Trades, Orders Actions, Data Visualisiation )
- Truffle and ether.js for deployment and intercations with Blockchain

Front End:
- React application
- Redux for state managment
- Heroku for app deployment 


# Exchange behavior

- [X] Set the fee account  // Trades fee for exchange market
- [X] Deposit Ether
- [X] Withdraw Ether
- [X] Deposit tokens
- [X] Withdraw tokens
- [X] Check balances
- [X] Make order
- [X] Cancel order
- [X] Fill order
- [X] Charge fees
-------------------
- Smart Contract Test [truffle test]

  Contract: Exchange
  - deployment
      ✔ track the fee Account
      ✔ track the fee Percent
    fallback
      ✔ reverts when ETher is sent (213ms)
    deposit Ether
      ✔ Track Ether deposit (80ms)
      ✔ emit Deposit event
    withdraw Ether
      sucess
        ✔ withdraws Ether funds
        ✔ emit Withdraw event
      failure
        ✔ reject Withdraw for insufficient balance (44ms)
    deposit Tokens
      success
        ✔ track the token deposit (76ms)
        ✔ emit Deposit event
      failure
        ✔ Rejects Ether deposit
        ✔ fails when No tokens Approved (120ms)
    Withdraw Tokens
      success
        ✔ Withdraw Tokens Funds
        ✔ emit Withdraw event
      failure
        ✔ reject Ether Withdraw
        ✔ fails to insufficient balances
    Check balances
      ✔ returns user balance (38ms)
    Making Orders
      ✔ track the new order created  (47ms)
      ✔ emit an order event
    Order Actions
      Filling Orders
        success
          ✔ execute Trade & charge Fees (297ms)
          ✔ updates filled orders (39ms)
          ✔ emit an "Trade" event
        failure
          ✔ rejects invalid order Ids (48ms)
          ✔ rejects already filled order (301ms)
          ✔ rejects cancelled orders (156ms)
     Cancelling Orders
        success
          ✔ updates cancelled orders
          ✔ emit an order event
        failure
          ✔ rejects invalid orders ID (47ms)
          ✔ rejects unauthorized cancelations

  Contract: Token
  - deployment
      ✔ track the name
      ✔ track the symbol
      ✔ track the decimal
      ✔ track the total supply
      ✔ assign total supply to deployer (196ms)
    sending Tokens
      sucess
        ✔ transfer token balances (56ms)
        ✔ emit Transfer
      failure
        ✔ rejects insufissient balances
        ✔ rejects invalid receipient
    approving tokens
      success
        ✔ allocates an allowance for the delegate token spending (49ms)
        ✔ emit an Approval event
      failure
        ✔ rejects invalid spender (171ms)
    sending allowance Tokens
      sucess
        ✔ transfer token balances (196ms)
        ✔ decrease  allowance
        ✔ emit Transfer
      failure
        ✔ rejects insufissient balances (209ms)
        ✔ rejects invalid receipient

# testing project
- git clone App repo
- install project dependencies [npm install]
- Run ganache and set port to 8545
- import first account of ganache to your metamask wallet (funds sourcing)
- deploy smart contracts to Ganache network [truffle migrate --reset]
- seed exhchange with orders for data visualization [truffle exec scripts/seed_exchange.js]
- Run Project [npm start]

Once browser loaded connect metamask to your browser and everything should be fine 

if you use Heroku link make sure you run Ganache in Port 8545
and deploy the contracts to Ganache using [truffle migrate --reset]
