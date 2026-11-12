import { test } from "node:test";
import assert from "node:assert/strict";
import { ZeroAddress, parseEther as u } from "ethers";
import { compileFixtures, localEvm, deploy } from "../helpers/evm.mjs";
const artifacts = compileFixtures();
async function fixture(name = "Token") {
  const env = await localEvm();
  const [owner, maker, taker, fees] = env.signers;
  const token = await deploy(artifacts, name, owner);
  const exchange = await deploy(
    artifacts,
    "Exchange",
    owner,
    await token.getAddress(),
    await fees.getAddress(),
    25,
  );
  return { ...env, owner, maker, taker, fees, token, exchange };
}
async function mined(tx) {
  await (await tx).wait();
}
test("ETH withdrawal callback hits the reentrancy guard without double withdrawal", async () => {
  const f = await fixture();
  try {
    const receiver = await deploy(
      artifacts,
      "WithdrawalReceiver",
      f.owner,
      await f.exchange.getAddress(),
    );
    await mined(receiver.deposit({ value: u("1") }));
    await mined(receiver.withdraw(u("1"), false));
    assert.equal(await receiver.blocked(), true);
    assert.equal(
      await f.exchange.balanceOf(ZeroAddress, await receiver.getAddress()),
      0n,
    );
    assert.equal(
      await f.provider.getBalance(await f.exchange.getAddress()),
      0n,
    );
  } finally {
    await f.close();
  }
});
test("rejecting ETH receiver reverts withdrawal and restores ledger/custody", async () => {
  const f = await fixture();
  try {
    const receiver = await deploy(
      artifacts,
      "WithdrawalReceiver",
      f.owner,
      await f.exchange.getAddress(),
    );
    await mined(receiver.deposit({ value: u("1") }));
    await assert.rejects(async () =>
      mined(receiver.withdraw(u("1"), true, { gasLimit: 200000 })),
    );
    assert.equal(
      await f.exchange.balanceOf(ZeroAddress, await receiver.getAddress()),
      u("1"),
    );
    assert.equal(
      await f.provider.getBalance(await f.exchange.getAddress()),
      u("1"),
    );
  } finally {
    await f.close();
  }
});
test("fee-on-transfer and false-return token deposits fail atomically", async () => {
  for (const mode of [1, 2]) {
    const f = await fixture("TestToken");
    try {
      const address = await f.exchange.getAddress();
      const before = await f.token.balanceOf(await f.owner.getAddress());
      await mined(f.token.approve(address, 100));
      await mined(f.token.setMode(mode));
      await assert.rejects(async () =>
        mined(f.exchange.depositToken(100, { gasLimit: 300000 })),
      );
      assert.equal(
        await f.exchange.balanceOf(
          await f.token.getAddress(),
          await f.owner.getAddress(),
        ),
        0n,
      );
      assert.equal(await f.token.balanceOf(address), 0n);
      assert.equal(await f.token.balanceOf(await f.owner.getAddress()), before);
    } finally {
      await f.close();
    }
  }
});
test("SafeERC20 supports a no-return token; outgoing transfer-tax behavior is a documented limitation", async () => {
  const f = await fixture("NoReturnToken");
  try {
    await mined(f.token.approve(await f.exchange.getAddress(), 100));
    await mined(f.exchange.depositToken(100));
    await mined(f.exchange.withdrawToken(100));
    assert.equal(
      await f.exchange.balanceOf(
        await f.token.getAddress(),
        await f.owner.getAddress(),
      ),
      0n,
    );
  } finally {
    await f.close();
  }
  const g = await fixture("TestToken");
  try {
    await mined(g.token.approve(await g.exchange.getAddress(), 100));
    await mined(g.exchange.depositToken(100));
    const before = await g.token.balanceOf(await g.owner.getAddress());
    await mined(g.token.setMode(1));
    await mined(g.exchange.withdrawToken(100));
    assert.equal(
      (await g.token.balanceOf(await g.owner.getAddress())) - before,
      99n,
    );
  } finally {
    await g.close();
  }
});
test("mined duplicate fill and cancellation after fill revert; invalid deployment config rejects", async () => {
  const f = await fixture();
  try {
    const t = await f.token.getAddress(),
      e = await f.exchange.getAddress();
    await assert.rejects(
      deploy(artifacts, "Exchange", f.owner, t, ZeroAddress, 25),
    );
    await assert.rejects(
      deploy(
        artifacts,
        "Exchange",
        f.owner,
        t,
        await f.fees.getAddress(),
        1001,
      ),
    );
    await mined(f.exchange.connect(f.maker).depositEther({ value: u("1") }));
    await mined(f.token.transfer(await f.taker.getAddress(), u("10")));
    await mined(f.token.connect(f.taker).approve(e, u("10")));
    await mined(f.exchange.connect(f.taker).depositToken(u("10")));
    await mined(
      f.exchange.connect(f.maker).makeOrder(t, u("1"), ZeroAddress, u("0.1")),
    );
    await mined(f.exchange.connect(f.taker).fillOrder(1));
    await assert.rejects(async () =>
      mined(f.exchange.connect(f.taker).fillOrder(1, { gasLimit: 200000 })),
    );
    await assert.rejects(async () =>
      mined(f.exchange.connect(f.maker).cancelOrder(1, { gasLimit: 200000 })),
    );
    assert.equal(await f.exchange.orderFilled(1), true);
    assert.equal(await f.exchange.orderCancelled(1), false);
  } finally {
    await f.close();
  }
});
test("deterministic mixed-operation trace conserves ETH and HAI custody including rounded fees", async () => {
  const f = await fixture();
  try {
    const t = await f.token.getAddress(),
      e = await f.exchange.getAddress();
    const users = [f.owner, f.maker, f.taker, f.fees];
    for (const user of [f.maker, f.taker]) {
      await mined(f.token.transfer(await user.getAddress(), u("100")));
      await mined(f.token.connect(user).approve(e, u("100")));
      await mined(f.exchange.connect(user).depositToken(u("100")));
      await mined(f.exchange.connect(user).depositEther({ value: u("1") }));
    }
    let random = 12345;
    for (let i = 0; i < 40; i++) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const maker = i % 2 ? f.taker : f.maker,
        taker = i % 2 ? f.maker : f.taker;
      const get = i % 2 ? ZeroAddress : t,
        give = i % 2 ? t : ZeroAddress;
      const amountGet = i % 2 ? 1000n : 1n,
        amountGive = i % 2 ? 1n : 1000n;
      await mined(
        f.exchange.connect(maker).makeOrder(get, amountGet, give, amountGive),
      );
      const id = await f.exchange.orderCount();
      if (random % 3 === 0)
        await mined(f.exchange.connect(maker).cancelOrder(id));
      else await mined(f.exchange.connect(taker).fillOrder(id));
      for (const asset of [t, ZeroAddress]) {
        let sum = 0n;
        for (const user of users)
          sum += await f.exchange.balanceOf(asset, await user.getAddress());
        const custody =
          asset === t
            ? await f.token.balanceOf(e)
            : await f.provider.getBalance(e);
        assert.equal(sum, custody, `custody invariant at step ${i}`);
      }
      assert(
        !(await f.exchange.orderFilled(id)) ||
          !(await f.exchange.orderCancelled(id)),
      );
    }
  } finally {
    await f.close();
  }
});
