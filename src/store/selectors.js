import { createSelector } from 'reselect'
import { get, reject, groupBy, maxBy, minBy } from 'lodash'
import { 
    ETHER_ADDR,
    tokens,
    ether,
    RED, GREEN,
    formatBalance
} from '../helpers';
import moment from 'moment'

// const ETHER_ADDR = "0x0000000000000000000000000000000000000000";

const account = state => get(state, 'web3.account')
export  const accountSelector = createSelector(account, a => a)

const web3Provider = state => get(state, 'web3.connection')
export  const web3ProviderSelector = createSelector(web3Provider, Provider => Provider)

const tokenLoaded = state =>get(state, 'token.loaded', false)
export  const tokenSelector = createSelector(tokenLoaded, tl => tl)

const token = state =>get(state, 'token.contract')
export  const tokenContractSelector = createSelector(token, e => e)

const tokenSigner = state =>get(state, 'token.contractSigner')
export  const tokenSignerSelector = createSelector(tokenSigner, e => e)

const exchangeLoaded = state =>get(state, 'exchange.loaded', false)
export  const exchangeSelector = createSelector(exchangeLoaded, el => el)


const exchange = state =>get(state, 'exchange.contract')
export  const exchangSelector = createSelector(exchange, e => e)

const exchangeSigner = state =>get(state, 'exchange.contractSigner')
export  const exchangeSignerSelector = createSelector(exchangeSigner, e => e)

export const contractsLoadedSelector = createSelector(
    tokenLoaded,
    exchangeLoaded,
    (tl, el) => (tl && el)
  )
 // All Orders
const allOrdersLoaded = state => get(state, 'exchange.allOrders.loaded', false)
const allOrders = state => get(state, 'exchange.allOrders.data', [])

// Cancelled orders
const cancelledOrdersLoaded = state => get(state, 'exchange.cancelledOrders.loaded', false)
export const cancelledOrdersLoadedSelector = createSelector(cancelledOrdersLoaded, loaded => loaded)

const cancelledOrders = state => get(state, 'exchange.cancelledOrders.data', [])
export const cancelledOrdersSelector = createSelector(cancelledOrders, o => o)

//filled orders
const filledOrdersLoaded = state =>get(state, 'exchange.filledOrders.loaded', false)
export  const filledOrdersLoadedSelector = createSelector(filledOrdersLoaded, fl => fl)

const filledOrders = state =>get(state, 'exchange.filledOrders.data',[])
export const filledOrdersSelector = createSelector(
    filledOrders,
    (orders)=>{
    // sort orders by date ascending for price comparison
    orders = orders.sort((a,b)=> a.timestap - b.timestap)
    // console.log(orders)
    orders = decorateFilledOrders(orders)
    // sort orders by date decending for display
    orders = orders.sort((a,b)=> b.timestap - a.timestap)
    
    // console.log(orders)
    return(orders)
})

const decorateFilledOrders = (orders)=>{
    let previousOrder = orders[0]
    // console.log(previousOrder)
    return(
        orders.map((order)=>{
             order = decorateOrder(order)
             // decoration only for filled order
             order = decorateFilledOrder(order, previousOrder)
             previousOrder = order // update previous order once decorated
             return order
        }

        )
    )
}

const decorateOrder = (order) =>{
    let etherAmount
    let tokenAmount
    if(order.tokenGive === ETHER_ADDR) {
        etherAmount = order.amountGive
        tokenAmount = order.amountGet
  } else {
        etherAmount = order.amountGet
        tokenAmount = order.amountGive
  }
    // Calculate token price to 5 decimal places
    const precision = 100000
    let tokenPrice = (etherAmount / tokenAmount)
    tokenPrice = Math.round(tokenPrice * precision) / precision
  return({
    ...order,
    etherAmount: ether(etherAmount),
    tokenAmount: tokens(tokenAmount),
    tokenPrice,
    formattedTimestamp: moment.unix(order.timestap).format('h:mm:ss a M/D')
  })
}
  const decorateFilledOrder = (order, previousOrder) => {
    return({
      ...order,
      tokenPriceClass: tokenPriceClass(order.tokenPrice, order.id, previousOrder)
    })
  }
  const tokenPriceClass = (tokenPrice, orderId, previousOrder) => {
    // Show green price if only one order exists
    if(previousOrder.id === orderId) {
      return GREEN
    }
    // Show green price if order price higher than previous order
    // Show red price if order price lower than previous order
    if(previousOrder.tokenPrice <= tokenPrice) {
      return GREEN // success
    } else {
      return RED // danger
    }
  }


  const openOrders = state => {
    const all = allOrders(state)
    const filled = filledOrders(state)
    const cancelled = cancelledOrders(state)
  
    const openOrders = reject(all, (order) => {
      const orderFilled = filled.some((o) => o.id.toString() === order.id.toString())
      const orderCancelled = cancelled.some((o) => o.id.toString() === order.id.toString())
      // console.log(orderCancelled)
      return(orderFilled || orderCancelled)
    })
  
    return openOrders
  }
  
  
  
const orderBookLoaded = state => cancelledOrdersLoaded(state) && filledOrdersLoaded(state) && allOrdersLoaded(state)
export const orderBookLoadedSelector = createSelector(orderBookLoaded, loaded => loaded)


export const orderBookSelector = createSelector(
  openOrders,
  (orders) => {
    // Decorate orders
    orders = decorateOrderBookOrders(orders)
    // Group orders by "orderType"
    orders = groupBy(orders, 'orderType')
    // Fetch buy orders
    const buyOrders = get(orders, 'buy', [])
    // Sort buy orders by token price
    orders = {
      ...orders,
      buyOrders: buyOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
    }
    // Fetch sell orders
    const sellOrders = get(orders, 'sell', [])
    // Sort sell orders by token price
    orders = {
      ...orders,
      sellOrders: sellOrders.sort((a,b) => b.tokenPrice - a.tokenPrice)
    }
    return orders
  }
)

const decorateOrderBookOrders = (orders) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order)
      order = decorateOrderBookOrder(order)
      return(order)
    })
  )
}

const decorateOrderBookOrder = (order) => {
  const orderType = order.tokenGive === ETHER_ADDR ? 'buy' : 'sell'
  return({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderFillAction: orderType === 'buy' ? 'sell' : 'buy'
  })
}

export const myFilledOrdersLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)

export const myFilledOrdersSelector = createSelector(
  account,
  filledOrders,
  (account, orders) => {
    
    // Find our orders
    orders = orders.filter((o) => {return (o.user === account).toString() || (o.userFill === account).toString()})
    // Sort by date ascending
    
    
    orders = orders.sort((a,b) => a.timestamp - b.timestamp)
    // Decorate orders - add display attributes
    orders = decorateMyFilledOrders(orders, account)
    // console.log(orders)
    return orders
  }
)

const decorateMyFilledOrders = (orders, account) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order)
      order = decorateMyFilledOrder(order, account)
      return(order)
    })
  )
}

const decorateMyFilledOrder = (order, account) => {
  const myOrder = order.user === account

  let orderType
  if(myOrder) {
    orderType = order.tokenGive === ETHER_ADDR ? 'buy' : 'sell'
  } else {
    orderType = order.tokenGive === ETHER_ADDR ? 'sell' : 'buy'
  }

  return({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED),
    orderSign: (orderType === 'buy' ? '+' : '-')
  })
}



export const myOpenOrdersLoadedSelector = createSelector(orderBookLoaded, loaded => loaded)

export const myOpenOrdersSelector = createSelector(
  account,
  openOrders,
  (account, orders) => {
    
    // Filter orders created by current account
    orders = orders.filter((o) => (o.user === account).toString())
    // Decorate orders - add display attributes
    orders = decorateMyOpenOrders(orders)
    // Sort orders by date descending
    orders = orders.sort((a,b) => b.timestamp - a.timestamp)
    // console.log(orders)
    return orders
  }
)

const decorateMyOpenOrders = (orders, account) => {
  return(
    orders.map((order) => {
      order = decorateOrder(order)
      order = decorateMyOpenOrder(order, account)
      return(order)
    })
  )
}

const decorateMyOpenOrder = (order, account) => {
  let orderType = order.tokenGive === ETHER_ADDR ? 'buy' : 'sell'

  return({
    ...order,
    orderType,
    orderTypeClass: (orderType === 'buy' ? GREEN : RED)
  })
}



export const priceChartLoadedSelector = createSelector(filledOrdersLoaded, loaded => loaded)

export const priceChartSelector = createSelector(
  filledOrders,
  (orders) => {
    // Sort orders by date ascending to compare history
    orders = orders.sort((a,b) => a.timestamp - b.timestamp)
    // Decorate orders - add display attributes
    orders = orders.map((o) => decorateOrder(o))
    // Get last 2 order for final price & price change
    let secondLastOrder, lastOrder
    [secondLastOrder, lastOrder] = orders.slice(orders.length - 2, orders.length)
    // get last order price
    const lastPrice = get(lastOrder, 'tokenPrice', 0)
    // get second last order price
    const secondLastPrice = get(secondLastOrder, 'tokenPrice', 0)

    return({
      lastPrice,
      lastPriceChange: (lastPrice >= secondLastPrice ? '+' : '-'),
      series: [{
        data: buildGraphData(orders)
      }]
    })
  }
)

const buildGraphData = (orders) => {
  // Group the orders by hour for the graph
  orders = groupBy(orders, (o) => moment.unix(o.timestap).startOf('hour').format())
  // Get each hour where data exists
  const hours = Object.keys(orders)
  // Build the graph series
  const graphData = hours.map((hour) => {
    // Fetch all the orders from current hour
    const group = orders[hour]
    // Calculate price values - open, high, low, close
    const open = group[0] // first order
    const high = maxBy(group, 'tokenPrice') // high price
    const low = minBy(group, 'tokenPrice') // low price
    const close = group[group.length - 1] // last order

    return({
      x: new Date(hour),
      y: [open.tokenPrice, high.tokenPrice, low.tokenPrice, close.tokenPrice]
    })
  })

  return graphData
}

const orderCancelling = state => get(state, 'exchange.orderCancelling', false)
export const orderCancellingSelector = createSelector(orderCancelling, status => status)

const orderFilling = state => get(state, 'exchange.orderFilling', false)
export const orderFillingSelector = createSelector(orderFilling, status => status)

// BALANCES
const balancesLoading = state => get(state, 'exchange.balancesLoading', true)
export const balancesLoadingSelector = createSelector(balancesLoading, status => status)

const etherBalance = state => get(state, 'web3.balance', 0)
export const etherBalanceSelector = createSelector(
  etherBalance,
  (balance) => {
    return formatBalance(balance)
  }
)

const tokenBalance = state => get(state, 'token.balance', 0)
export const tokenBalanceSelector = createSelector(
  tokenBalance,
  (balance) => {
    return formatBalance(balance)
  }
)

const exchangeEtherBalance = state => get(state, 'exchange.etherBalance', 0)
export const exchangeEtherBalanceSelector = createSelector(
  exchangeEtherBalance,
  (balance) => {
    return formatBalance(balance)
  }
)

const exchangeTokenBalance = state => get(state, 'exchange.tokenBalance', 0)
export const exchangeTokenBalanceSelector = createSelector(
  exchangeTokenBalance,
  (balance) => {
    return formatBalance(balance)
  }
)
// ether deposit.withdraw selectors
const etherDepositAmount = state => get(state, 'exchange.etherDepositAmount', null)
export const etherDepositAmountSelector = createSelector(etherDepositAmount, amount => amount)

const etherWithdrawAmount = state => get(state, 'exchange.etherWithdrawAmount', null)
export const etherWithdrawAmountSelector = createSelector(etherWithdrawAmount, amount => amount)

//token deposit.withdraw  selectors 
const tokenDepositAmount = state => get(state, 'exchange.tokenDepositAmount', null)
export const tokenDepositAmountSelector = createSelector(tokenDepositAmount, amount => amount)

const tokenWithdrawAmount = state => get(state, 'exchange.tokenWithdrawAmount', null)
export const tokenWithdrawAmountSelector = createSelector(tokenWithdrawAmount, amount => amount)


const buyOrder = state => get(state, 'exchange.buyOrder', {})
export const buyOrderSelector = createSelector(buyOrder, order => order)

const sellOrder = state => get(state, 'exchange.sellOrder', {})
export const sellOrderSelector = createSelector(sellOrder, order => order)
