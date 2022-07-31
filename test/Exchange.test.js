
var ethers = require('ethers');
const Token = artifacts.require("./Token");
const Exchange = artifacts.require("./Exchange");

// import{wall} from "./helpers"
// console.log(wall)

const ETHER_ADDR = "0x0000000000000000000000000000000000000000";
const EVM_REVERT = 'VM Exception while processing transaction: revert'

require('chai')
.use(require('chai-as-promised'))
.should()

const tokens = (n) =>
{
    // convertfrom ether to wei
    return ethers.utils.parseUnits(n.toString(), 18)
   
}
const etherConv = (n) => tokens(n)


contract('Exchange', ([deployer, feeAccount, user1, user2]) =>{

    const Name = 'Abdel Token'
    const Symbol = 'HAI'
    const Decimals = '18'
    const TotalSupply = tokens(1000000).toString()

    let exchange
    let token
    const feePercent = 10
    //Mocha allow us to fetch token before any test run 
   
    beforeEach(async()=>{
        //deploy token
        token = await Token.new()
        //transfer token to user1
        token.Transfer(user1, tokens(10), {from : deployer})
        exchange = await Exchange.new(feeAccount, feePercent) // everytime will deploy a Token to BC
    })

    describe('deployment', ()=>{
        
        it('track the fee Account', async () =>{ 
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })
        it('track the fee Percent', async () =>{ 
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
    })

    describe('fallback', ()=>{

        it('reverts when ETher is sent', async() =>{
            await exchange.sendTransaction({value:1, from : user1}).should.be.rejectedWith(EVM_REVERT)

        })
    })

    describe('deposit Ether', async() =>{
        let result 
        let amount
        beforeEach(async() =>{
            amount = etherConv(1)
            result = await exchange.depositEther({from: user1, value : amount})
        })

        it('Track Ether deposit', async() =>{

            const balance = await exchange.tokensMap(ETHER_ADDR, user1)
            balance.toString().should.equal(amount.toString())
        })
        it ('emit Deposit event', async()=>{
            const log = result.logs[0]
            log.event.should.equal('Deposit')
            const event = log.args
            event.token.toString().should.equal(ETHER_ADDR, 'token address is correct')
            event.user.toString().should.equal(user1, 'user address is correct')
            event.amount.toString().should.equal(amount.toString(), 'amount is correct')
            event.balance.toString().should.equal(amount.toString(), 'balance is correct')
            // console.log(event)
        })

    })

    describe('withdraw Ether', async()=>{
        let result
        let amount
        beforeEach(async() =>{
            amount = etherConv(1)
            await exchange.depositEther({from : user1, value: amount})
        })
        describe('sucess', async()=>{
            beforeEach(async() =>{
                result = await exchange.withdrawEther(amount, {from: user1})
            })
            
            it('withdraws Ether funds', async() =>{
                const balance = await exchange.tokensMap(ETHER_ADDR, user1)
                balance.toString().should.equal('0')
            })
            it ('emit Withdraw event', async()=>{
                const log = result.logs[0]
                log.event.should.equal('Withdraw')
                const event = log.args
                event.token.toString().should.equal(ETHER_ADDR, 'token address is correct')
                event.user.toString().should.equal(user1, 'user address is correct')
                event.amount.toString().should.equal(amount.toString(), 'amount is correct')
                event.balance.toString().should.equal('0', 'balance is correct')
                // console.log(event)
            })
        })
        describe('failure', async()=>{

            it('reject Withdraw for insufficient balance', async()=>{
                await exchange.withdrawEther(etherConv(400), {from:user1}).should.be.rejectedWith(EVM_REVERT)
            })
        })

    })

    describe('deposit Tokens', ()=>{
        let result
        let amount

        describe('success', () =>{

            beforeEach(async() =>{
                amount = tokens(10)
                await token.approve(user1, exchange.address, amount)
                result = await exchange.depositToken(token.address, amount,{from : user1})

            })

            it('track the token deposit', async () =>{ 
                //check exchange balance 
                let balance
                balance = await token._balances(exchange.address)
                // console.log(balance.toString())
                balance.toString().should.equal(amount.toString())
                //check tokens'balance on exchange
                balance = await exchange.tokensMap(token.address, user1)
                balance.toString().should.equal(amount.toString())
            })
            it ('emit Deposit event', async()=>{
                const log = result.logs[0]
                log.event.should.equal('Deposit')
                const event = log.args
                event.token.toString().should.equal(token.address, 'token address is correct')
                event.user.toString().should.equal(user1, 'user address is correct')
                event.amount.toString().should.equal(tokens(10).toString(), 'amount is correct')
                event.balance.toString().should.equal(tokens(10).toString(), 'balance is correct')
                // console.log(event)
            })

        })
        describe('failure', () =>{
            it ('Rejects Ether deposit', async()=>{
                await exchange.depositToken(ETHER_ADDR, tokens(10),{from : user1}).should.be.rejectedWith(EVM_REVERT)
            })
            it ('fails when No tokens Approved', async()=>{
                await exchange.depositToken(token.address, amount,{from : user1}).should.be.rejectedWith('revert ERC20: insufficient allowance')
            })
            
        })
        
      
    })

    describe('Withdraw Tokens', ()=>{
        let result
        let amount

        describe('success', () =>{

            beforeEach(async() =>{
                amount = tokens(10)
                await token.approve(user1, exchange.address, amount)
                await exchange.depositToken(token.address, amount,{from : user1})

                result = await exchange.withdraToken(token.address, amount, {from : user1})

            })
            it('Withdraw Tokens Funds', async () =>{ 
                let balance
                balance = await exchange.tokensMap(token.address, user1)
                // console.log(balance.toString())
                balance.toString().should.equal('0')
               
            })
            it ('emit Withdraw event', async()=>{
                const log = result.logs[0]
                log.event.should.equal('Withdraw')
                const event = log.args
                event.token.toString().should.equal(token.address, 'token address is correct')
                event.user.toString().should.equal(user1, 'user address is correct')
                event.amount.toString().should.equal(tokens(10).toString(), 'amount is correct')
                event.balance.toString().should.equal("0", 'balance is correct')
                // console.log(event)
            })

        })
    
        describe('failure', async()=>{
            it('reject Ether Withdraw', async()=>{
                await exchange.withdraToken(ETHER_ADDR, etherConv(1), {from : user1}).should.be.rejectedWith(EVM_REVERT)
            })
            it('fails to insufficient balances', async()=>{
                await exchange.withdraToken(token.address, etherConv(1), {from : user1}).should.be.rejectedWith(EVM_REVERT)
            })
        })
        
      
    })

    describe('Check balances', async()=>{
            let amount
        beforeEach(async()=>{
             amount = etherConv(1)
            await exchange.depositEther({from : user1, value : amount})
        })
        it('returns user balance', async()=>{

            const balance = await exchange.balanceOf(ETHER_ADDR, user1)
            balance.toString().should.equal(amount.toString())
        })
    })

    describe('Making Orders', async() =>{
        let result

        beforeEach(async()=>{
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDR, etherConv(1),{from :user1})
        })

        it('track the new order created ', async()=>{
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1','id is correct')
            order.user.toString().should.equal(user1,'user is correct')
            order.tokenGet.toString().should.equal(token.address,'token addr is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(),'token amount i correct')
            order.tokenGive.toString().should.equal(ETHER_ADDR,'tokenGive is correct')
            order.amountGive.toString().should.equal(etherConv(1).toString(),'token to give amount i correct')
            order.timestap.toString().length.should.be.at.least(1, 'timestap is correct')
        })

        it('emit an order event', async()=>{
            const log = result.logs[0]
            log.event.should.equal('Order')
            const event = log.args
            event.id.toString().should.equal('1','id is correct')
            event.user.toString().should.equal(user1,'user is correct')
            event.tokenGet.toString().should.equal(token.address,'token addr is correct')
            event.amountGet.toString().should.equal(tokens(1).toString(),'token amount i correct')
            event.tokenGive.toString().should.equal(ETHER_ADDR,'tokenGive is correct')
            event.amountGive.toString().should.equal(etherConv(1).toString(),'token to give amount i correct')
            event.timestap.toString().length.should.be.at.least(1, 'timestap is correct')

        })
    })
    describe('Order Actions', async() =>{
        
        beforeEach(async()=>{
            //user 1 deposit ether only
            await exchange.depositEther({from : user1, value : etherConv(1)})
            //give token to user2 to participate in trade
            await token.Transfer(user2, tokens(100), {from : deployer})
            // user2 deposit token only 
            await token.approve(user2, exchange.address, tokens(2))
            await exchange.depositToken(token.address, tokens(2), {from : user2})
            // user1 make an order to buy tokens with ether
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDR, etherConv(1), {from : user1})
        })
        describe('Filling Orders', async()=>{
            let result

            describe('success', async ()=>{
                beforeEach(async()=>{
                    //user2 fill order
                    result = await exchange.fillOrder('1', {from : user2})
                })
                it('execute Trade & charge Fees', async()=>{
                    let balance
                    balance = await exchange.balanceOf(token.address, user1)
                    balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens')
                    balance = await exchange.balanceOf(ETHER_ADDR, user2)
                    console.log(balance.toString())
                    // balance.toString().should.equal(etherConv(1).toString(), 'user2 received Ether')
                    balance = await exchange.balanceOf(ETHER_ADDR, user1)
                    balance.toString().should.equal('0', 'user2 Ether deducted')
                    balance = await exchange.balanceOf(token.address, user2)
                    balance.toString().should.equal(tokens(0.9).toString(), 'user2 token deducted with fee applies')
                    const feeAccount = await exchange.feeAccount()
                    balance = await exchange.balanceOf(token.address, feeAccount)
                    balance.toString().should.equal(tokens(0.1).toString(), 'fee Account Received Fee')
                })
                it ('updates filled orders', async ()=>{
                    const orderFilled = await exchange.orderFilled(1)
                    orderFilled.should.equal(true)
                })
                it('emit an "Trade" event', async()=>{
                    const log = result.logs[0]
                    log.event.should.equal('Trade')
                    const event = log.args
                    event.id.toString().should.equal('1','id is correct')
                    event.user.toString().should.equal(user1,'user is correct')
                    event.tokenGet.toString().should.equal(token.address,'token addr is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(),'token amount i correct')
                    event.tokenGive.toString().should.equal(ETHER_ADDR,'tokenGive is correct')
                    event.amountGive.toString().should.equal(etherConv(1).toString(),'token to give amount i correct')
                    event.timestap.toString().length.should.be.at.least(1, 'timestap is correct')
                    event.userFill.should.equal(user2, "userFill is correct")
                })
            })
            describe('failure', async() =>{
                it('rejects invalid order Ids', async()=>{
                    const invalidOrder = 99999
                    await exchange.fillOrder(invalidOrder, {from :user2}).should.rejectedWith(EVM_REVERT)
                })

                it('rejects already filled order', async()=>{
                    //fill order
                    await exchange.fillOrder('1',{from : user2}).should.be.fulfilled
                    // fil order again
                    await exchange.fillOrder('1',{from : user2}).should.be.rejectedWith(EVM_REVERT)
                })

                it('rejects cancelled orders', async()=>{
                    //cancel the order
                    await exchange.cancelOrder('1', {from : user1}).should.be.fulfilled
                    // try to fill the order
                    await exchange.fillOrder('1',{from : user2}).should.be.rejectedWith(EVM_REVERT)
                })
            })
        })

        describe('Cancelling Orders', async()=>{
            let result
            describe('success', async()=>{
                beforeEach(async()=>{
                    result = await exchange.cancelOrder('1', {from: user1})
                })
                it('updates cancelled orders', async()=>{
                    const cancelledOrder = await exchange.orderCancelled(1)
                    cancelledOrder.should.equal(true)
                })
                it('emit an order event', async()=>{
                    const log = result.logs[0]
                    log.event.should.equal('Cancel')
                    const event = log.args
                    event.id.toString().should.equal('1','id is correct')
                    event.user.toString().should.equal(user1,'user is correct')
                    event.tokenGet.toString().should.equal(token.address,'token addr is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(),'token amount i correct')
                    event.tokenGive.toString().should.equal(ETHER_ADDR,'tokenGive is correct')
                    event.amountGive.toString().should.equal(etherConv(1).toString(),'token to give amount i correct')
                    event.timestap.toString().length.should.be.at.least(1, 'timestap is correct')
        
                })
            })
            describe('failure', async()=>{

                it('rejects invalid orders ID', async()=>{
                    const invalidID = 9999
                    await exchange.cancelOrder(invalidID,{from : user1}).should.be.rejectedWith(EVM_REVERT)
                })
                it('rejects unauthorized cancelations', async()=>{
                    await exchange.cancelOrder('1',{from : user2}).should.be.rejectedWith(EVM_REVERT)
                })
            })

        })
    })


   
})