var ethers = require('ethers');
const Token = artifacts.require("./Token");

require('chai')
.use(require('chai-as-promised'))
.should()

const tokens = (n) =>
{
    console.log(ethers.utils.formatEther(n))
    return ethers.utils.formatEther(n)
}

contract('Token', ([deployer, receiver]) =>{

    const Name = 'Abdel Token'
    const Symbol = 'HAI'
    const Decimals = '18'
    const TotalSupply = tokens(1000000).toString()

   

    //Mocha allow us to fetch token before any test run 
    // BeforeEach(async()=>{
    //     const token = await Token.new() // everytime will deploy a Token to BC
    // })

    describe('deployment', ()=>{
        // read token name and check it 
        //fetch account from BC read it and check it
        it('track the name', async () =>{ 
            const token = await Token.new()
           
            const result = await token._name()
            result.should.equal(Name)
        })

        it ('track the symbol', async()=>{
            const token = await Token.new()
            
            const result = await token.symbol()
            result.should.equal(Symbol)
        })

        it ('track the decimal', async()=>{
            const token = await Token.new()
            
            const result = await token.decimals()
            result.toString().should.equal(Decimals)
        })

        it ('track the total supply', async()=>{
            const token = await Token.new()
        
            const result = await token.total_supply()
            result.toString().should.equal(TotalSupply)
        })

        it ('assign total supply to deployer', async()=>{
            const token = await Token.new()
        
            const result = await token._balances(deployer)
            result.toString().should.equal(TotalSupply.toString())
        })



    })
    describe('sending Tokens',() =>{

        it ('transfer token balances', async()=>{
            const token = await Token.new()
            let balanceOf
            balanceOf  = await token._balances(receiver)
            console.log("receiver balance before transfer", balanceOf.toString())
            balanceOf = await token._balances(deployer)
            console.log("deployer balance before transfer ", balanceOf.toString())
            // const result = await token.symbol()
            // result.should.equal(Symbol)
            //TRANSFER

            await token.transfer(receiver, tokens(100), {from : deployer})

            balanceOf  = await token._balances(receiver)
            console.log("receiver balance after transfer", balanceOf.toString())
            balanceOf = await token._balances(deployer)
            console.log("deployer balance after transfer ", balanceOf.toString())

        })
        
    })
})