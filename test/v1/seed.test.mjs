import "../../scripts/compile.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ganache from "ganache";
import { BrowserProvider, ContractFactory } from "ethers";
import { seedExchange } from "../../scripts/seed-exchange.mjs";
test("seed creates funded open orders, fills and cancellation; rerun sends no transactions", async () => {
  const chain = ganache.provider({
    logging: { quiet: true },
    chain: { hardfork: "shanghai" },
  });
  const p = new BrowserProvider(chain, undefined, { cacheTimeout: 0 });
  p.pollingInterval = 20;
  try {
    const maker = await p.getSigner(0),
      taker = await p.getSigner(1);
    const t = JSON.parse(readFileSync("artifacts/Token.json")),
      e = JSON.parse(readFileSync("artifacts/Exchange.json"));
    const token = await new ContractFactory(t.abi, t.bytecode, maker).deploy();
    await token.waitForDeployment();
    const exchange = await new ContractFactory(e.abi, e.bytecode, maker).deploy(
      await token.getAddress(),
      await maker.getAddress(),
      25,
    );
    await exchange.waitForDeployment();
    const deployment = {
      chainId: 31337,
      token: await token.getAddress(),
      exchange: await exchange.getAddress(),
    };
    const estimate = p.estimateGas.bind(p);
    let staleEstimate = true;
    p.estimateGas = async (tx) => {
      if (
        staleEstimate &&
        tx.data?.startsWith(
          exchange.interface.getFunction("cancelOrder").selector,
        )
      ) {
        staleEstimate = false;
        const error = new Error("Simulated stale RPC estimate");
        error.code = "CALL_EXCEPTION";
        error.action = "estimateGas";
        throw error;
      }
      return estimate(tx);
    };
    const state = {};
    let saves = 0;
    let interrupt = true;
    const options = {
      provider: p,
      makerWallet: maker,
      takerWallet: taker,
      deployment,
      state,
      save: () => {
        saves++;
      },
      log: (line) => {
        if (interrupt && line.startsWith("trade-buy-2:")) {
          interrupt = false;
          throw new Error("Simulated interruption");
        }
      },
    };
    await assert.rejects(seedExchange(options), /Simulated interruption/);
    await seedExchange(options);
    assert.equal(staleEstimate, false);
    assert.deepEqual(state.summary, {
      seededOrders: 10,
      open: 6,
      filled: 3,
      cancelled: 1,
    });
    const nonce = await p.getTransactionCount(await maker.getAddress());
    await seedExchange(options);
    assert.equal(await exchange.orderCount(), 10n);
    assert.equal(await p.getTransactionCount(await maker.getAddress()), nonce);
    assert(saves > 20);
    assert(!JSON.stringify(state).includes("privateKey"));
  } finally {
    p.destroy();
    await chain.disconnect();
  }
});
