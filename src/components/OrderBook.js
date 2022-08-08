import React, { Component } from 'react'
import { connect } from 'react-redux'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import Spinner from './Spinner'
import {
  orderBookSelector,
  orderBookLoadedSelector,
  exchangSelector,
  accountSelector,
 exchangeSignerSelector,
 orderFillingSelector,
} from '../store/selectors'

import { fillOrder } from '../store/interactions'


const renderOrder = (order, props) => {
  const {dispatch, exchangeSigner, account, exchange} = props
  return(

    <OverlayTrigger
    key={order.id}
    placement='auto'
    overlay={
      <Tooltip key={order.id}>
        {`Click here to ${order.orderFillAction}`}
      </Tooltip>
    }
    >
    <tr
     key={order.id}
     className="order-book-order"
     onClick={(e) =>fillOrder(dispatch, exchangeSigner, order, account, exchange)}
    >
      <td>{order.tokenAmount}</td>
      <td className={`text-${order.orderTypeClass}`}>{order.tokenPrice}</td>
      <td>{order.etherAmount}</td>
    </tr>
    </OverlayTrigger>
  )
}

const showOrderBook = (props) => {
  const { orderBook } = props

  return(
    <tbody>
      {orderBook.sellOrders.map((order) => renderOrder(order, props))}
      <tr>
        <th>HAI</th>
        <th>HAI/ETH</th>
        <th>ETH</th>
      </tr>
      {orderBook.buyOrders.map((order) => renderOrder(order, props))}
    </tbody>
  )
}

class OrderBook extends Component {
  render() {
    return (
      <div className="vertical">
        <div className="card bg-dark text-white">
          <div className="card-header">
            Order Book
          </div>
          <div className="card-body order-book">
            <table className="table table-dark table-sm small">
              { this.props.showOrderBook ? showOrderBook(this.props) : <Spinner type='table' /> }
            </table>
          </div>
        </div>
      </div>
    )
  }
}

function mapStateToProps(state) {

  const orderBookLoaded = orderBookLoadedSelector(state)
  const orderFilling = orderFillingSelector(state)


  return {
    orderBook: orderBookSelector(state),
    showOrderBook: orderBookLoaded && !orderFilling,
    exchange : exchangSelector(state),
    account : accountSelector(state),
    exchangeSigner : exchangeSignerSelector(state)
  }
}

export default connect(mapStateToProps)(OrderBook);