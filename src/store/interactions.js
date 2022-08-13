
import Token from '../abis/Token.json'
import Exchange from '../abis/Exchange.json'
import {
    web3Loaded,
    web3AccLoaded,
    tokenLoaded,
    exchangeLoaded,
    cancelOrdersLoaded,
    filledOrdersLoaded,
    allOrdersLoaded,
    orderCancelling,
    exchangeSignerLoaded,
    orderCancelled,
    orderFilling,
    orderFilled,
    etherBalanceLoaded,
    tokenBalanceLoaded,
    exchangeEtherBalanceLoaded,
    exchangeTokenBalanceLoaded,
    balancesLoaded,
    balancesLoading,
    tokenSignerLoaded,
    buyOrderMaking,
    sellOrderMaking,
    orderMade
} from "./actions"

import { ethers } from "ethers"
import { parseEvent, ETHER_ADDR, tokens} from './helpersStore'
import { exchangeTokenBalanceSelector } from './selectors'



export  const loadWeb3 = (dispatch) =>{
    const connectionProvider = new ethers.providers.Web3Provider(window.ethereum)
    dispatch(web3Loaded(connectionProvider))
    return connectionProvider
}   

export  const loadAccount = async (connectionProvider, dispatch) =>{
    const accounts = await connectionProvider.listAccounts()
    const account = accounts[0]
    dispatch(web3AccLoaded(account))
    return account
}   

export  const load_Token = async (connectionProvider,networkID, dispatch) =>{
    try{
        const token = await new ethers.Contract( Token.networks[networkID].address, Token.abi, connectionProvider)
        dispatch(tokenLoaded(token))
        return token
    }catch(error){
        console.log('Contract is not Deployed to the current network')
        return null
    }
}   

export  const load_Exchange = async (connectionProvider,networkID, dispatch) =>{
    try{
        const exchange = await new ethers.Contract( Exchange.networks[networkID].address, Exchange.abi, connectionProvider)
        dispatch(exchangeLoaded(exchange))
        return exchange
    }catch(error){
        console.log('Contract is not Deployed to the current network')
        return null
    }
}   

export  const load_ExchangeSigner = async (connectionProvider,networkID, dispatch) =>{
    try{
        const signer = await connectionProvider.getSigner()
        const contractSigner = await new ethers.Contract( Exchange.networks[networkID].address, Exchange.abi, signer)
        dispatch(exchangeSignerLoaded(contractSigner))
        return contractSigner
    }catch(error){
        console.log('Contract Signer is not fetched')
        return null
    }
}   

export  const load_TokenSigner = async (connectionProvider,networkID, dispatch) =>{
    try{
        const signer = await connectionProvider.getSigner()
        const contractSigner = await new ethers.Contract( Token.networks[networkID].address, Token.abi, signer)
        dispatch(tokenSignerLoaded(contractSigner))
        console.log(contractSigner)
        return contractSigner
    }catch(error){
        console.log('Contract Signer is not fetched')
        return null
    }
}   

export const loadAllOrders = async(exchange, dispatch)=>{
    // fetch canceled oders with  Cancel event stream
    const cancelStream = await exchange.queryFilter('Cancel', 0, 'latest')
   // format cancelled orders 
   const cancelledOrders = cancelStream.map((event) => event.args)
    dispatch(cancelOrdersLoaded(cancelledOrders))
    // fetch filled oders with Trade event stream
    const tradeStream = await exchange.queryFilter('Trade', 0, 'latest')
    const filledOrders = tradeStream.map((event) => event.args)
    dispatch(filledOrdersLoaded(filledOrders))
    // console.log(filledOrders)
    //Orders
    const orderStream = await exchange.queryFilter('Order', 0, 'latest')
    const allOrders = orderStream.map((event) => event.args)
    dispatch(allOrdersLoaded(allOrders))
    
}

export const cancelOrder = async (dispatch, exchangeSigner, order, account, exchange) => {
    exchangeSigner.cancelOrder(order.id ,{ from : account})
    .then((hash) =>{
        dispatch(orderCancelling())
    })
    // listen for tx hash and dispatch cancelling 

}

export const fillOrder = async (dispatch, exchangeSigner, order, account, exchange) => {
    exchangeSigner.fillOrder(order.id ,{ from : account})
    .then((hash) =>{
        dispatch(orderFilling())
    })
    // listen for tx hash and dispatch filling 

}

export const loadBalances = async (dispatch, provider, exchange, token, account) =>{
    if(typeof account !== 'undefined') {
        // Ether balance in wallet
        const etherBalance = await provider.getBalance(account)
        dispatch(etherBalanceLoaded(etherBalance.toString()))
        // Token balance in wallet
        const tokenBalance = await token._balances(account)
        dispatch(tokenBalanceLoaded(tokenBalance))
        // Ether balance in exchange
        const exchangeEtherBalance = await exchange.balanceOf(ETHER_ADDR, account)
        dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance.toString()))
        // Token balance in exchange
        const exchangeTokenBalance = await exchange.balanceOf(token.address, account)
        dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance.toString()))
        // Trigger all balances loaded
        dispatch(balancesLoaded())
      } else {
        window.alert('Please login with MetaMask')
      }
}

export const depositEther = async (dispatch, exchangeSigner, provider, value, account)=>{
    const val = ethers.utils.parseEther(value.toString())
    await exchangeSigner.depositEther({from : account, value : val})
    .then
    // listen for event and call dipatch 
   
    
}


export const depositToken = async (dispatch, exchangeSigner, value, account, token)=>{
    const val = ethers.utils.parseEther(value.toString())
    console.log(account)
    console.log(exchangeSigner.address)
    token.approve(account, exchangeSigner.address, val)
    .then(async (log)=>{
      await exchangeSigner.depositToken(token.address, val)
    })

}

export const withdrawEther = async (dispatch, exchangeSigner, provider, value, account)=>{
    const vali = ethers.utils.parseUnits(value, 18).toString()
    // console.log(vali)
    await exchangeSigner.withdrawEther(vali, {from : account})
     // listen for event and call dispatch balances loading 
}

export const withdrawToken = async (dispatch, exchangeSigner, value, token)=>{
    console.log(value)
    const vali = ethers.utils.parseUnits(value, 18)
    
    // const vali = tokens(value)
    console.log(vali)
    console.log(token.address)
    await exchangeSigner.withdraToken(token.address, vali)
    // .then(async (hash) =>{
    //    const ret = await dispatch(balancesLoading())
    //    await ret.wait
    // })
    //to add listen for  tx hash signing 
}

export const subscribeToEvent = async(exchange, dispatch)=>{
    exchange.on('Cancel', async (...event) => {
        const order = parseEvent(event)
        dispatch(orderCancelled(order))
      });
      exchange.on('Trade', async (...event) => {
        const order = parseEvent(event)
        // console.log(order)
        dispatch(orderFilled(order))
      })
      exchange.on('Deposit', async (...event) => {
        await dispatch(balancesLoading())
        dispatch(balancesLoaded())
      
      })
      exchange.on('Withdraw', async (...event) => {
        await dispatch(balancesLoading())
        dispatch(balancesLoaded())
      })

      exchange.on('Order', async (...event) => {
        const order = parseEvent(event)
        // console.log(order)
        // await dispatch(buyOrderMaking())
        // await dispatch(sellOrderMaking())
        dispatch(orderMade(order))
      })
}


export const makeBuyOrder = async (dispatch, exchangeSigner, tokenSigner, provider, order, account) => {
    const tokenGet = tokenSigner.address
    const amountGet = ethers.utils.parseUnits(order.amount, 18)
    const tokenGive = ETHER_ADDR
    const amountGive = ethers.utils.parseUnits((order.amount * order.price).toString(), 18)
    console.log(exchangeSigner)
     exchangeSigner.makeOrder(tokenGet, amountGet, tokenGive, amountGive)
    .then(async (hash) => {
      await dispatch(buyOrderMaking())
    })
    exchangeSigner.on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  }


  export const makeSellOrder = async (dispatch, exchangeSigner, tokenSigner, provider, order, account) => {
    const tokenGet = ETHER_ADDR 
    const amountGet = ethers.utils.parseUnits((order.amount * order.price).toString(), 18)
    const tokenGive = tokenSigner.address
    const amountGive =  ethers.utils.parseUnits(order.amount, 18)
   
    exchangeSigner.makeOrder(tokenGet, amountGet, tokenGive, amountGive)
    .then(async (hash) => {
      dispatch(sellOrderMaking())
    })
    exchangeSigner.on('error',(error) => {
      console.error(error)
      window.alert(`There was an error!`)
    })
  }
  