export function fixtures(count) {
  let seed = 42;
  const events = [],
    trades = [],
    rows = [];
  for (let i = 1; i <= count; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const price = (900 + (seed % 201)) / 1e9,
      amount = 1 + (seed % 100);
    const id = String(i);
    const base = { id, transactionIndex: 0, logIndex: 0 };
    events.push({
      ...base,
      type: "Order",
      blockNumber: i * 2,
      transactionHash: `fixture-order-${i}`,
      order: { price, amount },
    });
    if (i % 3 !== 0)
      events.push({
        ...base,
        type: i % 3 === 1 ? "Trade" : "Cancel",
        blockNumber: i * 2 + 1,
        transactionHash: `fixture-close-${i}`,
      });
    trades.push({ id, timestamp: 1767225600 + i * 7, price, amount });
    rows.push({
      id,
      side: i % 2 ? "Buy" : "Sell",
      price: price.toFixed(9),
      quantity: String(amount),
      total: (price * amount).toFixed(9),
      action: "Open",
    });
  }
  return { events: events.reverse(), trades: trades.reverse(), rows };
}
