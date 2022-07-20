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
contract('Token', ([deployer, receiver]) =>{

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
            console.log("TOTAL SUPPLY OF THE CONTRACT",result.toString());
            console.log("TOTAL SUPPLY OF TESTING",TotalSupply);
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
                amount = tokens(100)
                result = await token.Transfer(receiver, tokens(100), {from : deployer})
            });
            it ('transfer token balances', async()=>{
                let balanceOf
                balanceOf  = await token._balances(receiver)
                console.log("receiver balance after transfer", balanceOf.toString())
                balanceOf = await token._balances(deployer)
                console.log("deployer balance after transfer ", balanceOf.toString())
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
})