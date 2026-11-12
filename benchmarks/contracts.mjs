import { performance } from "node:perf_hooks";
import { parseEther as u, ZeroAddress } from "ethers";
import { compileFixtures, localEvm, deploy } from "../test/helpers/evm.mjs";
import { save, stats, samples, warmups } from "./common.mjs";
const artifacts = compileFixtures(),
  f = await localEvm();
try {
  const [owner, maker, taker, fees] = f.signers;
  const t = await deploy(artifacts, "Token", owner);
  const e = await deploy(
    artifacts,
    "Exchange",
    owner,
    await t.getAddress(),
    await fees.getAddress(),
    25,
  );
  const token = await t.getAddress(),
    exchange = await e.getAddress();
  const mined = async (tx) => (await tx).wait();
  for (const user of [maker, taker]) {
    await mined(t.transfer(await user.getAddress(), u("1000")));
    await mined(t.connect(user).approve(exchange, u("1000")));
    await mined(e.connect(user).depositToken(u("500")));
    await mined(e.connect(user).depositEther({ value: u("5") }));
  }
  const gas = {},
    latency = {};
  async function record(name, fn, keep) {
    const start = performance.now(),
      r = await mined(fn());
    if (keep) {
      (gas[name] ??= []).push(Number(r.gasUsed));
      (latency[name] ??= []).push(performance.now() - start);
    }
    if (r.status !== 1) throw new Error("Benchmark transaction failed");
  }
  for (let i = 0; i < samples + warmups; i++) {
    const keep = i >= warmups;
    await record(
      "depositEther",
      () => e.connect(maker).depositEther({ value: u(".001") }),
      keep,
    );
    await record(
      "withdrawEther",
      () => e.connect(maker).withdrawEther(u(".0005")),
      keep,
    );
    await record(
      "depositToken",
      () => e.connect(maker).depositToken(u("1")),
      keep,
    );
    await record(
      "withdrawToken",
      () => e.connect(maker).withdrawToken(u("1")),
      keep,
    );
    await record(
      "makeOrder",
      () => e.connect(maker).makeOrder(token, u("1"), ZeroAddress, u(".001")),
      keep,
    );
    const fillId = await e.orderCount();
    await record("fillOrder", () => e.connect(taker).fillOrder(fillId), keep);
    await mined(
      e.connect(maker).makeOrder(token, u("1"), ZeroAddress, u(".001")),
    );
    const cancelId = await e.orderCount();
    await record(
      "cancelOrder",
      () => e.connect(maker).cancelOrder(cancelId),
      keep,
    );
  }
  save("contracts", {
    execution: "isolated in-process Ganache; no network RPC or real keys",
    chain: {
      id: 31337,
      hardfork: "shanghai",
      time: "2026-01-01T00:00:00Z",
      timestampIncrement: 1,
      deterministicWallets: true,
    },
    compiler: { version: "0.8.30", optimizerRuns: 200, evmVersion: "shanghai" },
    warmups,
    fixture:
      "Two funded synthetic Ganache users; existing nonzero balances and warmed fee slots; sequential receipt-confirmed operations",
    gasUsed: Object.fromEntries(
      Object.entries(gas).map(([k, v]) => [k, stats(v)]),
    ),
    localReceiptLatencyMs: Object.fromEntries(
      Object.entries(latency).map(([k, v]) => [k, stats(v)]),
    ),
  });
} finally {
  await f.close();
}
