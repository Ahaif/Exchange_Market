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