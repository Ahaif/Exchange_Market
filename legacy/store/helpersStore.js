export const parseEvent  = (event)=>{

    const parseEvent = []
        for(let i = 1; i < event.length; i++)
        {
            const j = 0
            parseEvent[j] =  event[i]
        }
        let extractedValue = parseEvent.map(item => item.args)
        let order
        [order] = extractedValue
        // console.log(order)
        return order
}
export const ETHER_ADDR = "0x0000000000000000000000000000000000000000";

export const DECIMALS = (10**18)

// Shortcut to avoid passing around web3 connection
export const ether = (wei) => {
  if(wei) {
    return(wei / DECIMALS) // 18 decimal places
  }
}

// Tokens and ether havesame decimal resolution
export const tokens = ether