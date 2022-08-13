
// web3 
export function web3Loaded(connection){
    return{
        type : 'WEB3LOADED',
        connection : connection
    }
}

export function web3AccLoaded(account){
    return{
        type : 'WEB3_ACCOUNT_LOADED',
        account : account
    }
}
// exhcnage 
export function exchangeLoaded(contract) {
    return {
      type: 'EXCHANGE_LOADED',
      contract
    }
}
//EXCHANGE SIGNER
export function exchangeSignerLoaded(contractSigner) {
  return {
    type: 'EXCHANGE_SIGNER',
    contractSigner
  }
}
//TOKEN
export function tokenLoaded(contract) {
    return {
      type: 'TOKEN_LOADED',
      contract
    }
}

export function tokenSignerLoaded(contract) {
  return {
    type: 'TOKEN_SIGNER',
    contract
  }
}

//cancel orders loaded 
export function cancelOrdersLoaded(cancelledOrders) {
    return {
      type: 'CANCEL_ORDERS_lOADED',
      cancelledOrders
    }
}

export function filledOrdersLoaded(filledOrders) {
    return {
      type: 'FILLED_ORDERS_lOADED',
      filledOrders
    }
}

export function allOrdersLoaded(allOrders) {
    return {
      type: 'ALL_ORDERS_lOADED',
      allOrders : allOrders
    }
}

export function orderCancelling() {
  return {
    type: 'ORDER_CANCELLING',
  
  }
}

export function orderCancelled(order) {
  return {
    type: 'ORDER_CANCELLED',
    order: order
  
  }
}


export function orderFilling() {
  return {
    type: 'ORDER_FILLING',
  
  }
}


export function orderFilled(order) {
  return {
    type: 'ORDER_FILLED',
    order: order
  
  }
}

//BALANCES
export function etherBalanceLoaded(balance) {
  return {
    type: 'ETHER_BALANCE_LOADED',
    balance
  }
}

export function tokenBalanceLoaded(balance) {
  return {
    type: 'TOKEN_BALANCE_LOADED',
    balance
  }
}

export function exchangeEtherBalanceLoaded(balance) {
  return {
    type: 'EXCHANGE_ETHER_BALANCE_LOADED',
    balance
  }
}

export function exchangeTokenBalanceLoaded(balance) {
  return {
    type: 'EXCHANGE_TOKEN_BALANCE_LOADED',
    balance
  }
}

export function balancesLoaded() {
  return {
    type: 'BALANCES_LOADED'
  }
}

export function balancesLoading() {
  return {
    type: 'BALANCES_LOADING'
  }
}



export function etherDepositAmountChanged(amount) {
  return {
    type: 'ETHER_DEPOSIT_AMOUNT_CHANGED',
    amount
  }
}


export function etherWithdrawAmountChanged(amount) {
  return {
    type: 'ETHER_WITHDRAW_AMOUNT_CHANGED',
    amount
  }
}


export function tokenDepositAmountChanged(amount) {
  return {
    type: 'TOKEN_DEPOSIT_AMOUNT_CHANGED',
    amount
  }
}


export function tokenWithdrawAmountChanged(amount) {
  return {
    type: 'TOKEN_WITHDRAW_AMOUNT_CHANGED',
    amount
  }
}


// Buy Order
export function buyOrderAmountChanged(amount) {
  return {
    type: 'BUY_ORDER_AMOUNT_CHANGED',
    amount
  }
}

export function buyOrderPriceChanged(price) {
  return {
    type: 'BUY_ORDER_PRICE_CHANGED',
    price
  }
}

export function buyOrderMaking(price) {
  return {
    type: 'BUY_ORDER_MAKING'
  }
}

// Generic Order
export function orderMade(order) {
  return {
    type: 'ORDER_MADE',
    order
  }
}


// Sell Order
export function sellOrderAmountChanged(amount) {
  return {
    type: 'SELL_ORDER_AMOUNT_CHANGED',
    amount
  }
}

export function sellOrderPriceChanged(price) {
  return {
    type: 'SELL_ORDER_PRICE_CHANGED',
    price
  }
}

export function sellOrderMaking(price) {
  return {
    type: 'SELL_ORDER_MAKING'
  }
}
