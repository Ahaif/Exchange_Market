
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
    balancesLoading
} from "./actions"

import { ethers } from "ethers"
import { parseEvent, ETHER_ADDR, tokens} from './helpersStore'


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


export const loadAllOrders = async(exchange, dispatch)=>{
    // fetch canceled oders with  Cancel event stream
    const cancelStream = await exchange.queryFilter('Cancel', 0, 'latest')
   // format cancelled orders 
   const cancelledOrders = cancelStream.map((event) => event.args)
    dispatch(cancelOrdersLoaded(cancelledOrders))
    console.log(cancelledOrders)
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
    await exchangeSigner.cancelOrder(order.id ,{ from : account})
    // listen for tx hash and dispatch cancelling 

}


export const subscribeToEvent = async(exchange, dispatch)=>{
    exchange.on('Cancel', async (...event) => {
        dispatch(orderCancelling())
        const order = parseEvent(event)
        // console.log(order)
        dispatch(orderCancelled(order))
      });

      exchange.on('Trade', async (...event) => {
        dispatch(orderFilling())
        const order = parseEvent(event)
        // console.log(order)
        dispatch(orderFilled(order))
      })

    exchange.on('Deposit', async (...event) => {
        await dispatch(balancesLoading())
        // const order = parseEvent(event)
        console.log("even emitted")
        dispatch(balancesLoaded())
      })

}

export const fillOrder = async (dispatch, exchangeSigner, order, account, exchange) => {
    await exchangeSigner.fillOrder(order.id ,{ from : account})
    // listen for tx hash and dispatch filling 

}

export const loadBalances = async (dispatch, provider, exchange, token, account) =>{
    if(typeof account !== 'undefined') {
        // Ether balance in wallet
        const etherBalance = await provider.getBalance(account)
        dispatch(etherBalanceLoaded(etherBalance))
  
        // Token balance in wallet
        const tokenBalance = await token.balanceOf(account)
        dispatch(tokenBalanceLoaded(tokenBalance))
  
        // Ether balance in exchange
        const exchangeEtherBalance = await exchange.balanceOf(ETHER_ADDR, account)
        dispatch(exchangeEtherBalanceLoaded(exchangeEtherBalance))
  
        // Token balance in exchange
        
        const exchangeTokenBalance = await exchange.balanceOf(token.address, account)
        console.log(exchangeTokenBalance.toString())
        dispatch(exchangeTokenBalanceLoaded(exchangeTokenBalance.toString()))
  
        // Trigger all balances loaded
        dispatch(balancesLoaded())
      } else {
        window.alert('Please login with MetaMask')
      }
}

export const depositEther = async (dispatch, exchangeSigner, provider, value, account)=>{
    const val = ethers.utils.parseEther(value.toString())
    console.log(val)
    await exchangeSigner.depositEther({from : account, value : val})

}

  
  