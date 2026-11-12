/** @typedef {{id:string,timestamp:number,price:number,amount:number}} TradePoint */
/** Aggregate real fills into UTC OHLCV buckets. Empty intervals stay empty. */
/** @param {TradePoint[]} trades @param {number} seconds */
export function buildCandles(trades, seconds) {
  if (!Number.isInteger(seconds) || seconds <= 0)
    throw new Error("Invalid candle interval");
  const sorted = [...trades]
    .filter(
      (t) =>
        Number.isFinite(t.timestamp) &&
        t.timestamp > 0 &&
        Number.isFinite(t.price) &&
        t.price > 0 &&
        Number.isFinite(t.amount) &&
        t.amount > 0,
    )
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp ||
        (BigInt(a.id) < BigInt(b.id)
          ? -1
          : BigInt(a.id) > BigInt(b.id)
            ? 1
            : 0),
    );
  /** @type {Map<number,{time:number,open:number,high:number,low:number,close:number,volume:number}>} */
  const buckets = new Map();
  for (const trade of sorted) {
    const time = Math.floor(trade.timestamp / seconds) * seconds;
    const candle = buckets.get(time);
    if (candle) {
      candle.high = Math.max(candle.high, trade.price);
      candle.low = Math.min(candle.low, trade.price);
      candle.close = trade.price;
      candle.volume += trade.amount;
    } else
      buckets.set(time, {
        time,
        open: trade.price,
        high: trade.price,
        low: trade.price,
        close: trade.price,
        volume: trade.amount,
      });
  }
  return [...buckets.values()];
}
