
var ethers = require('ethers');
const Token = artifacts.require("./Token");

const Exchange = artifacts.require("./Exchange");

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
contract('Exchange', ([deployer, feeAccount, user1]) =>{

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

   
})