
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