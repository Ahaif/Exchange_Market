import "../../scripts/compile.mjs";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ganache from "ganache";
import {
  BrowserProvider,
  ContractFactory,
  ZeroAddress,
  parseEther as units,
} from "ethers";
let chain,
  p,
  owner,
  maker,
  taker,
  fees,
  token,
  exchange,
  tokenAddr,
  exchangeAddr;
before(async () => {
  chain = ganache.provider({
    logging: { quiet: true },
    wallet: { deterministic: true },
    chain: { hardfork: "shanghai", time: new Date("2026-01-01T00:00:00Z") },
    miner: { timestampIncrement: 1 },
  });
  p = new BrowserProvider(chain);
  [owner, maker, taker, fees] = await Promise.all(
    [0, 1, 2, 3].map((i) => p.getSigner(i)),
  );
});
after(async () => {
  await chain.disconnect();
});
async function fixture() {
  const t = JSON.parse(readFileSync("artifacts/Token.json")),
    e = JSON.parse(readFileSync("artifacts/Exchange.json"));
  token = await new ContractFactory(t.abi, t.bytecode, owner).deploy();
  await token.waitForDeployment();
  tokenAddr = await token.getAddress();
  exchange = await new ContractFactory(e.abi, e.bytecode, owner).deploy(
    tokenAddr,
    await fees.getAddress(),
    25,
  );
  await exchange.waitForDeployment();
  exchangeAddr = await exchange.getAddress();
  for (const user of [maker, taker]) {
    await (await token.transfer(await user.getAddress(), units("1000"))).wait();
    await (
      await token.connect(user).approve(exchangeAddr, units("1000"))
    ).wait();
    await (await exchange.connect(user).depositToken(units("1000"))).wait();
    await (
      await exchange.connect(user).depositEther({ value: units("10") })
    ).wait();
  }
}
const bal = (asset, user) => exchange.balanceOf(asset, user.getAddress());
test("ERC20 allowance belongs to caller; another account cannot spend maker funds", async () => {
  await fixture();
  assert.equal(await token.name(), "Abdel Token");
  assert.equal(await token.totalSupply(), units("1000000"));
  await (
    await token.connect(taker).approve(await owner.getAddress(), units("1"))
  ).wait();
  assert.equal(
    await token.allowance(await maker.getAddress(), await owner.getAddress()),
    0n,
  );
  await assert.rejects(
    token
      .connect(owner)
      .transferFrom(await maker.getAddress(), await owner.getAddress(), 1n),
  );
});
test("buy settlement preserves both assets and charges HAI fee based on amountGet", async () => {
  await fixture();
  await (
    await exchange
      .connect(maker)
      .makeOrder(tokenAddr, units("100"), ZeroAddress, units("1"))
  ).wait();
  await (await exchange.connect(taker).fillOrder(1)).wait();
  assert.equal(await bal(tokenAddr, maker), units("1100"));
  assert.equal(await bal(tokenAddr, taker), units("899.75"));
  assert.equal(await bal(tokenAddr, fees), units("0.25"));
  assert.equal(await bal(ZeroAddress, maker), units("9"));
  assert.equal(await bal(ZeroAddress, taker), units("11"));
  assert.equal(await exchange.orderFilled(1), true);
  await assert.rejects(async () => {
    await (await exchange.connect(taker).fillOrder(1)).wait();
  });
});
test("sell settlement credits ETH and adds HAI to existing taker HAI", async () => {
  await fixture();
  await (
    await exchange
      .connect(maker)
      .makeOrder(ZeroAddress, units("2"), tokenAddr, units("100"))
  ).wait();
  await (await exchange.connect(taker).fillOrder(1)).wait();
  assert.equal(await bal(ZeroAddress, maker), units("12"));
  assert.equal(await bal(ZeroAddress, taker), units("7.995"));
  assert.equal(await bal(ZeroAddress, fees), units("0.005"));
  assert.equal(await bal(tokenAddr, maker), units("900"));
  assert.equal(await bal(tokenAddr, taker), units("1100"));
});
test("insufficient taker funds revert without changing balances or order status", async () => {
  await fixture();
  await (
    await exchange
      .connect(maker)
      .makeOrder(tokenAddr, units("1000"), ZeroAddress, units("1"))
  ).wait();
  await assert.rejects(async () => {
    await (await exchange.connect(taker).fillOrder(1)).wait();
  });
  assert.equal(await bal(tokenAddr, taker), units("1000"));
  assert.equal(await bal(ZeroAddress, maker), units("10"));
  assert.equal(await exchange.orderFilled(1), false);
});
test("withdrawn maker funds cannot be filled; cancellation restricted to maker", async () => {
  await fixture();
  await (
    await exchange
      .connect(maker)
      .makeOrder(tokenAddr, units("100"), ZeroAddress, units("10"))
  ).wait();
  await (await exchange.connect(maker).withdrawEther(units("1"))).wait();
  await assert.rejects(async () => {
    await (await exchange.connect(taker).fillOrder(1)).wait();
  });
  await assert.rejects(exchange.connect(taker).cancelOrder(1));
  await (await exchange.connect(maker).cancelOrder(1)).wait();
  await assert.rejects(async () => {
    await (await exchange.connect(taker).fillOrder(1)).wait();
  });
  assert.equal(await exchange.orderCancelled(1), true);
});
test("validates pairs, amounts, order IDs and rejects self trades", async () => {
  await fixture();
  await assert.rejects(
    exchange.connect(maker).makeOrder(tokenAddr, 0, ZeroAddress, 1),
  );
  await assert.rejects(
    exchange.connect(maker).makeOrder(tokenAddr, 1, tokenAddr, 1),
  );
  await assert.rejects(exchange.connect(taker).fillOrder(0));
  await (
    await exchange
      .connect(maker)
      .makeOrder(tokenAddr, units("1"), ZeroAddress, units("1"))
  ).wait();
  await assert.rejects(exchange.connect(maker).fillOrder(1));
});
test("withdrawals reduce custody and ledger; excess withdrawals revert", async () => {
  await fixture();
  await (await exchange.connect(maker).withdrawToken(units("100"))).wait();
  assert.equal(await token.balanceOf(await maker.getAddress()), units("100"));
  assert.equal(await token.balanceOf(exchangeAddr), units("1900"));
  assert.equal(await bal(tokenAddr, maker), units("900"));
  await (await exchange.connect(maker).withdrawEther(units("10"))).wait();
  assert.equal(await bal(ZeroAddress, maker), 0n);
  await assert.rejects(exchange.connect(maker).withdrawEther(1));
  await assert.rejects(exchange.connect(maker).depositToken(0));
  await assert.rejects(maker.sendTransaction({ to: exchangeAddr, value: 1 }));
});
