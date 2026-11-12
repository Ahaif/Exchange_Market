import { buildCandles } from "../lib/candles.mjs";
import {
  aggregateOrderEvents,
  readLatestOrders,
  historyRanges,
} from "../lib/read-model.mjs";
import { fixtures } from "./fixtures.mjs";
import { save, measure, measureAsync, smoke } from "./common.mjs";
import assert from "node:assert/strict";
const results = [];
for (const size of smoke ? [100, 1000] : [1000, 10000, 100000]) {
  const f = fixtures(size);
  let requests = 0,
    maxConcurrent = 0,
    active = 0;
  const replay = measure(() =>
    assert.equal(aggregateOrderEvents(f.events).length, size),
  );
  const ohlcv = measure(() => assert(buildCandles(f.trades, 60).length > 0));
  const bounded = await measureAsync(async () => {
    requests = 0;
    maxConcurrent = 0;
    active = 0;
    const rows = await readLatestOrders(async (id) => {
      requests += 3;
      active++;
      maxConcurrent = Math.max(maxConcurrent, active);
      await Promise.resolve();
      active--;
      return { id };
    }, size);
    assert.equal(rows.length, Math.min(size, 100));
  });
  const ranges = historyRanges(100000, 1);
  assert.equal(ranges.length, 10);
  results.push({
    orders: size,
    events: f.events.length,
    observations: f.trades.length,
    eventReplayMs: replay,
    ohlcvMs: ohlcv,
    boundedMockReadMs: bounded,
    rpcMethodCalls: requests,
    maxConcurrentOrderReaders: maxConcurrent,
    historicalRangeCalls: ranges.length,
  });
}
save("data", {
  fixture:
    "Seed-42 LCG; sequential order IDs; 7-second fill spacing; deterministic buy/sell prices and quantities; reversed observations; replay has Order plus Trade/Cancel logs. Synthetic data, not live-chain measurements.",
  results,
  limits:
    "Bounded read latency is zero-network injected-reader orchestration; 3 RPC methods per order, excludes fixed market/account calls. Event replay is experimental and not used as the live source.",
});
