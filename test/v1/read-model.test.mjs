import { test } from "node:test";
import assert from "node:assert/strict";
import {
  historyRanges,
  readLatestOrders,
  aggregateOrderEvents,
} from "../../lib/read-model.mjs";
import {
  createTransactionGate,
  assertTransactionSession,
} from "../../lib/transaction-session.mjs";
test("bounded reads cap RPC work and concurrency independently of historical order count", async () => {
  let calls = 0,
    active = 0,
    max = 0;
  const rows = await readLatestOrders(async (id) => {
    calls++;
    active++;
    max = Math.max(max, active);
    await Promise.resolve();
    active--;
    return id;
  }, 100_000);
  assert.equal(calls, 100);
  assert.equal(max, 10);
  assert.equal(rows[0], 100_000);
  assert.equal(rows.at(-1), 99_901);
  await assert.rejects(readLatestOrders(async (id) => id, 1, 101));
  assert.deepEqual(await readLatestOrders(async (id) => id, 0), []);
});
test("history ranges have no overlap, cap window and stop at deployment", () => {
  const ranges = historyRanges(100_000, 1);
  assert.equal(ranges.length, 10);
  assert.deepEqual(ranges[0], [50_001, 55_000]);
  assert.deepEqual(ranges.at(-1), [95_001, 100_000]);
  assert.deepEqual(historyRanges(10, 11), []);
  assert.deepEqual(historyRanges(10, 8), [[8, 10]]);
  assert.throws(() => historyRanges(1, 0, 0));
});
test("experimental event replay is ordered and idempotent; incomplete history fails closed", () => {
  const a = {
    type: "Order",
    id: "1",
    order: { amount: "3" },
    blockNumber: 1,
    transactionIndex: 0,
    logIndex: 0,
    transactionHash: "0x1",
  };
  const b = {
    type: "Trade",
    id: "1",
    blockNumber: 2,
    transactionIndex: 0,
    logIndex: 0,
    transactionHash: "0x2",
  };
  assert.deepEqual(aggregateOrderEvents([b, a, b]), [
    { amount: "3", id: "1", filled: true, cancelled: false },
  ]);
  assert.throws(() => aggregateOrderEvents([b]));
});
test("transaction gate prevents concurrent submission and approval continuation rejects wallet changes", () => {
  const g = createTransactionGate();
  assert.equal(g.enter(), true);
  assert.equal(g.enter(), false);
  g.release();
  assert.equal(g.enter(), true);
  const expected = { revision: 0, chainId: 11155111, account: "0xabc" };
  assert.doesNotThrow(() =>
    assertTransactionSession(expected, { ...expected, account: "0xABC" }),
  );
  for (const patch of [{ revision: 1 }, { chainId: 1 }, { account: "0xdef" }])
    assert.throws(() =>
      assertTransactionSession(expected, { ...expected, ...patch }),
    );
});
