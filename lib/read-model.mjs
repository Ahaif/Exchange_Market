/** Shared bounded-read policy. No network or signing capability lives here. */
export function historyRanges(
  latest,
  deploymentBlock,
  window = 50_000,
  chunk = 5000,
) {
  for (const n of [latest, deploymentBlock, window, chunk])
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error("Invalid block range");
  if (!window || !chunk) throw new Error("Range size must be positive");
  const ranges = [];
  for (
    let from = Math.max(deploymentBlock, latest - window + 1);
    from <= latest;
    from += chunk
  )
    ranges.push([from, Math.min(from + chunk - 1, latest)]);
  return ranges;
}
/** @template T @param {(id:number)=>Promise<T>} read @param {number} count @param {number} limit @param {number} batch */
export async function readLatestOrders(read, count, limit = 100, batch = 10) {
  if (
    ![count, limit, batch].every(Number.isSafeInteger) ||
    count < 0 ||
    limit < 0 ||
    limit > 100 ||
    batch < 1 ||
    batch > 10
  )
    throw new Error("Invalid order read bounds");
  const rows = [];
  for (let end = count; end > Math.max(0, count - limit); end -= batch) {
    const ids = Array.from(
      { length: Math.min(batch, end - Math.max(0, count - limit)) },
      (_, i) => end - i,
    );
    rows.push(...(await Promise.all(ids.map(read))));
  }
  return rows;
}
/** Experimental replay read-model, NOT the live order-book source. No reorg handling. */
export function aggregateOrderEvents(events) {
  const rows = new Map(),
    seen = new Set();
  const sorted = [...events].sort(
    (a, b) =>
      a.blockNumber - b.blockNumber ||
      a.transactionIndex - b.transactionIndex ||
      a.logIndex - b.logIndex,
  );
  for (const e of sorted) {
    const key = `${e.transactionHash}:${e.logIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (e.type === "Order")
      rows.set(e.id, { ...e.order, id: e.id, filled: false, cancelled: false });
    else {
      const order = rows.get(e.id);
      if (!order) throw new Error("Incomplete event history");
      if (e.type === "Trade") order.filled = true;
      else if (e.type === "Cancel") order.cancelled = true;
      else throw new Error("Unknown event type");
    }
  }
  return [...rows.values()];
}
