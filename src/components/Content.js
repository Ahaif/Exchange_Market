import React, { Component } from 'react'
import { connect } from 'react-redux'
import { 
    loadAllOrders, subscribeToEvent
    
} from '../store/interactions'
import { exchangSelector, exchangeSignerSelector } from '../store/selectors'

import Trades from './Trades'
import MyTransactions from './MyTransactions'
import OrderBook from './OrderBook'
import PriceChart from './PriceChart'


class Content extends Component {

    componentWillMount(){
        this.loadBlockchainData(this.props)
    
      }
      async loadBlockchainData(props){
        const {dispatch, exchange, exchangeSigner} = props
    
        await loadAllOrders(exchange, dispatch)
        // console.log(exchangeSigner)
        await subscribeToEvent(exchange, dispatch)
     
      }
    render() {
  return (
    <div className="content">
    <div className="vertical-split">
      <div className="card bg-dark text-white">
        <div className="card-header">
          Card Title
        </div>
        <div className="card-body">
          <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
          <a href="/#" className="card-link">Card link</a>
        </div>
      </div>
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
      exchangeSigner : exchangeSignerSelector(state)
    }
  }
  
  export default connect(mapStateToProps)(Content)