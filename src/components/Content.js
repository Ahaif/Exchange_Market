import React, { Component } from 'react'
import { connect } from 'react-redux'
import { 
    loadAllOrders, subscribeToEvent, loadBalances
    
} from '../store/interactions'
import { exchangSelector,
        exchangeSignerSelector,
        web3ProviderSelector,
        accountSelector,
        tokenSelector

 } from '../store/selectors'

import Trades from './Trades'
import MyTransactions from './MyTransactions'
import OrderBook from './OrderBook'
import PriceChart from './PriceChart'
import Balance from './Balance'


class Content extends Component {

    componentDidMount(){
        this.loadBlockchainData(this.props)
    
      }
      async loadBlockchainData(props){
        const {dispatch, exchange,provider,token, account} = props
    
        await loadAllOrders(exchange, dispatch)
        // await loadBalances(dispatch, provider, exchange, token, account)
        // console.log(exchangeSigner)
        await subscribeToEvent(exchange, dispatch)
     
      }
    render() {
  return (
  <div className="content">
    <div className="vertical-split">
      <Balance />
      <div className="card bg-dark text-white">
        <div className="card-header">
          Card Title
        </div>
        <div className="card-body">
          <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
          <a href="/#" className="card-link">Card link</a>
        </div>
      </div>
    </div>
    <OrderBook />
        <div className="vertical-split">
          <PriceChart />
          <MyTransactions />
        </div>
    <Trades />
  </div>
  )
  }
}



function mapStateToProps(state) {
    return {
      exchange : exchangSelector(state),
      exchangeSigner : exchangeSignerSelector(state),
      provider: web3ProviderSelector(state),
      token: accountSelector(state),
      account: tokenSelector(state)
      
    }
  }
  
  export default connect(mapStateToProps)(Content)