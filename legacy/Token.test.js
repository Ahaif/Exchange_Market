var ethers = require('ethers');
const Token = artifacts.require("./Token");


require('chai')
.use(require('chai-as-promised'))
.should()


const tokens = (n) =>
{
    // convertfrom ether to wei
    return ethers.utils.parseUnits(n.toString(), 18)
   
}
contract('Token', ([deployer, receiver, exchange]) =>{

    const Name = 'Abdel Token'
    const Symbol = 'HAI'
    const Decimals = '18'
    const TotalSupply = tokens(1000000).toString()

    let token
    //Mocha allow us to fetch token before any test run 
   
    beforeEach(async()=>{
        token = await Token.new() // everytime will deploy a Token to BC
    })

    describe('deployment', ()=>{
        // read token name and check it 
        //fetch account from BC read it and check it
        it('track the name', async () =>{ 
            const result = await token._name()
            result.should.equal(Name)
        })
        it ('track the symbol', async()=>{
            const result = await token.symbol()
            result.should.equal(Symbol)
        })

        it ('track the decimal', async()=>{
            const result = await token.decimals()
            result.toString().should.equal(Decimals)
        })

        it ('track the total supply', async()=>{
            const result = await token.total_supply()
            // console.log("TOTAL SUPPLY OF THE CONTRACT",result.toString());
            // console.log("TOTAL SUPPLY OF TESTING",TotalSupply);
            result.toString().should.equal(TotalSupply.toString())
        })

        it ('assign total supply to deployer', async()=>{
            const result = await token._balances(deployer)
            result.toString().should.equal(TotalSupply.toString())
        })
    })

    describe('sending Tokens',() =>{
        describe('sucess', async() =>{
        let amount
        let result
        beforeEach(async() =>{
                amount = tokens(1)
                result = await token.Transfer(receiver, amount, {from : deployer})
            });
            it ('transfer token balances', async()=>{
                let balanceOf
                balanceOf  = await token._balances(receiver)
                // console.log("receiver balance after transfer", balanceOf.toString())
                balanceOf = await token._balances(deployer)
                // console.log("deployer balance after transfer ", balanceOf.toString())
            })
            it ('emit Transfer', async()=>{
                const log = result.logs[0]
                log.event.should.equal('transfer')
                const event = log.args
                event.from.toString().should.equal(deployer, 'from is correct')
                event.to.toString().should.equal(receiver, 'to is correct')
                event.amount.toString().should.equal(amount.toString(), 'value is correct')
                // console.log(event)
            })
        })
        describe('failure', async() =>{
            it ('rejects insufissient balances', async() =>{
                let invalidAmount
                invalidAmount = tokens(10000000000000) // greater than the total supply
                await token.Transfer(receiver, invalidAmount, {from : deployer}).should.be.rejectedWith('ERC20: transfer amount exceeds balance');
            })
            it ('rejects invalid receipient', async() =>{
                let invalidAmount
                invalidAmount = tokens(10000000000000) // greater than the total supply
                const address0 = '0x0000000000000000000000000000000000000000'
                await token.Transfer(address0, invalidAmount, {from : deployer}).should.be.rejected;
   
            })
        })
       
        
    })
    describe('approving tokens',() =>{
        let result 
        let amount

        beforeEach(async () => {
            amount = tokens(100)
            result = await token.approve(deployer, exchange, amount)
        })

        describe('success',  () =>{
            it('allocates an allowance for the delegate token spending', async() =>{
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal(amount.toString())
            })
            it ('emit an Approval event', async()=>{
                const log = result.logs[0]
                log.event.should.equal('Approval')
                const event = log.args
                event.owner.toString().should.equal(deployer, 'from is correct')
                event.spender.toString().should.equal(exchange, 'to is correct')
                event.value.toString().should.equal(amount.toString(), 'value is correct')
                // console.log(event)
            })


        })
        describe('failure', () =>{
            it ('rejects invalid spender', async() =>{
                let invalidAmount
                invalidAmount = tokens(10000000000000) // greater than the total supply
                const address0 = '0x0000000000000000000000000000000000000000'
                await token.approve(address0, invalidAmount, {from : deployer}).should.be.rejected;
   
            })


        })
        
    })

    describe('sending allowance Tokens',() =>{
        let amount
        let result
        beforeEach(async() =>{
            amount = tokens(1)
            await token.approve(deployer, exchange, amount)
        });
        describe('sucess', async() =>{
       
        beforeEach(async() =>{
                result = await token.transferFrom(deployer, receiver, amount, {from : exchange})
            });
            it ('transfer token balances', async()=>{
                let balanceOf
                balanceOf  = await token._balances(receiver)
                // console.log("receiver balance after transfer", balanceOf.toString())
                balanceOf = await token._balances(deployer)
                // console.log("deployer balance after transfer ", balanceOf.toString())
            })
            it('decrease  allowance', async() =>{
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal('0')
            })
            it ('emit Transfer', async()=>{
                const log = result.logs[0]
                log.event.should.equal('Approval')
                const event = log.args
                event.owner.toString().should.equal(deployer, 'from is correct')
                event.spender.toString().should.equal(exchange, 'to is correct')
                // // event.value.toString().should.equal(amount.toString(), 'value is correct')
                // console.log(event.value.toString())
                // // console.log(event)
            })
        })
        describe('failure', async() =>{
            it ('rejects insufissient balances', async() =>{
                let invalidAmount
                invalidAmount = tokens(10000000000000) // greater than the total supply
                await token.transferFrom(deployer, receiver, invalidAmount, {from : exchange}).should.be.rejectedWith('revert ERC20: insufficient allowance');
            })
            it ('rejects invalid receipient', async() =>{
                let invalidAmount
                invalidAmount = tokens(10000000000000) // greater than the total supply
                const address0 = '0x0000000000000000000000000000000000000000'
                await token.transferFrom(deployer,address0, invalidAmount, {from : exchange}).should.be.rejected;
   
            })
        })
       
        
    })

})