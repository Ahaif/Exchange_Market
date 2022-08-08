import { combineReducers } from "redux"

function web3(state = { value: 0 }, action) {
    switch (action.type) {
        case'WEB3LOADED':
            return{...state, connection: action.connection}
        case'WEB3_ACCOUNT_LOADED':
            return{...state, account: action.account}
        default:
            return state
    }
}

function token(state = {}, action) {
    switch (action.type) {
      case 'TOKEN_LOADED':
        return { ...state, loaded : true, contract: action.contract }
      default:
        return state
    }
}

function exchange(state = {}, action) {
  let index, data
    switch (action.type) {
      case 'EXCHANGE_SIGNER':
        return { ...state, loaded : true, contractSigner: action.contractSigner}
      case 'EXCHANGE_LOADED':
        return { ...state, loaded : true, contract: action.contract }
      case 'CANCEL_ORDERS_lOADED' :
        return { ...state, cancelledOrders : {loaded : true, data : action.cancelledOrders} }
      case 'FILLED_ORDERS_lOADED' :
        return { ...state, filledOrders : {loaded : true, data : action.filledOrders} }
      case 'ALL_ORDERS_lOADED' :
        return { ...state, allOrders : {loaded : true, data : action.allOrders} }
      case 'ORDER_CANCELLING' :
          return { ...state, orderCancelling : true, }
      case 'ORDER_CANCELLED':
          return {
              ...state,
              orderCancelling: false,
              cancelledOrders: {
                ...state.cancelledOrders,
                data: [
                  ...state.cancelledOrders.data,
                  action.order
                ]
              }
            }
      case 'ORDER_FILLED':
        // Prevent duplicate orders
        index = state.filledOrders.data.findIndex(order => order.id.toString() === action.order.id.toString());
        if(index === -1) {
          data = [...state.filledOrders.data, action.order]
        } else {
          data = state.filledOrders.data
        }
        return {
          ...state,
          orderFilling: false,
          filledOrders: {
            ...state.filledOrders,
            data
          }
        }
      case 'ORDER_FILLING' :
          return { ...state, orderFilling : true, }
      default:
        return state
    }
}

const rootReducers = combineReducers({
    web3 : web3,
    token: token,
    exchange
})

export default rootReducers