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
    switch (action.type) {
      case 'EXCHANGE_LOADED':
        return { ...state, loaded : true, contract: action.contract }
      case 'CANCEL_ORDERS_lOADED' :
        return { ...state, cancelledOrders : {loaded : true, data : action.cancelledOrders} }
      case 'FILLED_ORDERS_lOADED' :
        return { ...state, filledOrders : {loaded : true, data : action.filledOrders} }
      case 'ALL_ORDERS_lOADED' :
        return { ...state, allOrders : {loaded : true, data : action.allOrders} }
      
      
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