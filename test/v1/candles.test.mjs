import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCandles } from "../../lib/candles.mjs";
test("candles sort fills, use execution time, aggregate OHLCV and leave empty intervals empty", () => {
  const trades = [
    { id: "3", timestamp: 1794481270, price: 1.05, amount: 100 },
    { id: "1", timestamp: 1794481200, price: 1, amount: 80 },
    { id: "2", timestamp: 1794481220, price: 1.1, amount: 60 },
    { id: "4", timestamp: 1794481500, price: 0.9, amount: 20 },
  ];
  const result = buildCandles(trades, 60);
  assert.equal(result.length, 3);
  assert.deepEqual(result[0], {
    time: 1794481200,
    open: 1,
    high: 1.1,
    low: 1,
    close: 1.1,
    volume: 140,
  });
  assert.equal(result[1].close, 1.05);
  assert.equal(result[2].time, 1794481500);
  assert.equal(buildCandles(trades, 300).length, 2);
});
test("candles order equal-time fills by ID, ignore invalid observations and validate interval", () => {
  assert.equal(
    buildCandles(
      [
        { id: "2", timestamp: 60, price: 2, amount: 1 },
        { id: "1", timestamp: 60, price: 1, amount: 1 },
        { id: "3", timestamp: 60, price: NaN, amount: 1 },
      ],
      60,
    )[0].open,
    1,
  );
  assert.deepEqual(buildCandles([], 60), []);
  assert.throws(() => buildCandles([], 0));
});
