const Token = artifacts.require("./Token");
const Exchange = artifacts.require("./Exchange");

var ethers = require('ethers');


module.exports = async function(callBack){
    try{
        const ETHER_ADDR = "0x0000000000000000000000000000000000000000";
        const tokens = (n) =>
        {
            // convertfrom ether to wei
            return ethers.utils.parseUnits(n.toString(), 18)
        
        }

        const wait = (seconds) =>{
            const milliseconds = seconds * 1000
            return new Promise(resolve => setTimeout(resolve, milliseconds))
        }
        const provider = new ethers.providers.JsonRpcProvider(`HTTP://127.0.0.1:8545`)
        // fetch accounts from wallet
        const accounts = await provider.listAccounts();
        //fetch the contracts deployed
        const token = await Token.deployed()
        console.log('Token Fetched', token.address)
        const exchange = await Exchange.deployed()
        console.log('Exchange Fetched', exchange.address)

        // give tokens to account 1
        const sender = accounts[0]
        const receiver = accounts[1]

        let amount = ethers.utils.parseUnits('10000', 18)// 10 000 token 
        await token.Transfer(receiver, amount, {from: sender})
        console.log(`Transferred ${amount} from ${sender} to ${receiver}`)

        //set up exchange users
        const user1 = accounts[0]
        const user2 = accounts[1]
        // user1 deposit ether
        amount = 1
        await exchange.depositEther({from: user1, value : tokens(amount) })
        console.log('Deposit Ether from user1')
        // user2 deposit tokens
        amount = 10000
        await token.approve(user2, exchange.address, tokens(amount))
        console.log('exchange approved')
        await exchange.depositToken(token.address, tokens(amount), {from: user2})
        console.log('deposit 10.000 tokens ')

        ///////////////////////////////////////////////////////
        /////Seed a Cancel Order
        
        // user1 make order to get tokens
        let result
        let orderId
        
        result = await exchange.makeOrder(token.address, tokens(100),ETHER_ADDR, tokens(0.1), {from : user1})
        console.log('make order from user1')
       

      
        orderId = result.logs[0].args.id
        await exchange.cancelOrder(orderId, {from: user1})
        console.log('Cancelled from user1')

        ////////////////////////////////////////////////////////////
        ////// SEED filled orders ////////////////

        //user1 make the order
        result = await exchange.makeOrder(token.address, tokens(100), ETHER_ADDR, tokens(0.1),{from : user1} )
        //made order from user1

        //user2 fill order
        orderId = result.logs[0].args.id
        await exchange.fillOrder(orderId,{from : user2})
        console.log('Order filled from user1')
      

        await wait(1)

        //user1 make final order
        result = await exchange.makeOrder(token.address, tokens(200), ETHER_ADDR, tokens(0.15),{from : user1} )
        console.log('final order made from user1')

        //user2 fills final order
        orderId = result.logs[0].args.id
        await exchange.fillOrder(orderId,{from : user2})
        console.log('final filled order from user1')

        await wait(1)
        //////////////////////////////////////////////////////////////////////
        /////// SEED Open Oders

         // user1 make 10 orders
         for(let i =1; i<= 10; i++)
         {
             result = await exchange.makeOrder(token.address, tokens(10 * i), ETHER_ADDR, tokens(0.01),{from : user1})
             console.log('Made order from user1')
 
             await wait(1)
         }

        // user2 make 10 orders
        for(let i =1; i<= 10; i++)
        {
            result = await exchange.makeOrder(ETHER_ADDR, tokens(0.01), token.address, tokens(10 * i), {from : user2})
            console.log('Made order from user2')

            await wait(1)
        }
    }
    catch(error){
        console.log(error)
    }
    callBack()
}