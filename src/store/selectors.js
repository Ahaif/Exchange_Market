import { createSelector } from 'reselect'
import { get } from 'lodash'
import { 
    ETHER_ADDR,
    tokens,
    ether,
    RED, GREEN
} from '../helpers';
import moment from 'moment'

// const ETHER_ADDR = "0x0000000000000000000000000000000000000000";

const account = state => get(state, 'web3.account')
export  const accountSelector = createSelector(account, a => a)

const tokenLoaded = state =>get(state, 'token.loaded', false)
export  const tokenSelector = createSelector(tokenLoaded, tl => tl)
const exchangeLoaded = state =>get(state, 'exchange.loaded', false)
export  const exchangeSelector = createSelector(exchangeLoaded, el => el)


const exchange = state =>get(state, 'exchange.contract')
export  const exchangSelector = createSelector(exchange, e => e)

export const contractsLoadedSelector = createSelector(
    tokenLoaded,
    exchangeLoaded,
    (tl, el) => (tl && el)
  )

  const filledOrdersLoaded = state =>get(state, 'exchange.filledOrders.loaded', false)
  export  const filledOrdersLoadedSelector = createSelector(filledOrdersLoaded, fl => fl)
  

const filledOrders = state =>get(state, 'exchange.filledOrders.data',[])
export const filledOrdersSelector = createSelector(
    filledOrders,
    (orders)=>{
    // sort orders by date ascending for price comparison
    orders = orders.sort((a,b)=> a.timestamp - b.timestamp)
  
    orders = decorateFilledOrders(orders)
    // console.log(orders)

    // sort orders by date decending for display
    orders = orders.sort((a,b)=> b.timestamp - a.timestamp)
    

    return(orders)
})


const decorateFilledOrders = (orders)=>{
    let previousOrder = orders[0]
    console.log(orders)
    return(
        orders.map((order)=>{
             order = decorateOrder(order)
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
    formattedTimestamp: moment.unix(order.timestamp).format('h:mm:ss a M/D')
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


