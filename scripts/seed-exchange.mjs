import {
  Contract,
  NonceManager,
  ZeroAddress,
  parseEther,
  formatEther,
  Wallet,
  JsonRpcProvider,
} from "ethers";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  openSync,
  closeSync,
  unlinkSync,
  mkdirSync,
} from "node:fs";
import { parseEnv } from "node:util";
import { pathToFileURL } from "node:url";

// Only public addresses, transaction hashes and step names belong in this state.
export async function seedExchange({
  provider,
  makerWallet,
  takerWallet,
  deployment,
  state,
  save,
  log = console.log,
}) {
  const maker = new NonceManager(makerWallet),
    taker = new NonceManager(takerWallet);
  const tokenAbi = [
    "function transfer(address,uint256) returns(bool)",
    "function approve(address,uint256) returns(bool)",
    "function balanceOf(address) view returns(uint256)",
  ];
  const abi = [
    "function token() view returns(address)",
    "function depositEther() payable",
    "function depositToken(uint256)",
    "function balanceOf(address,address) view returns(uint256)",
    "function makeOrder(address,uint256,address,uint256)",
    "function fillOrder(uint256)",
    "function cancelOrder(uint256)",
    "function orderCount() view returns(uint256)",
    "function orderFilled(uint256) view returns(bool)",
    "function orderCancelled(uint256) view returns(bool)",
    "event Order(uint256 indexed id,address indexed user)",
  ];
  const token = new Contract(deployment.token, tokenAbi, maker);
  const exchange = new Contract(deployment.exchange, abi, maker);
  const makerAddress = await maker.getAddress(),
    takerAddress = await taker.getAddress();
  if (makerAddress.toLowerCase() === takerAddress.toLowerCase())
    throw new Error("Demo traders must be different wallets");
  if ((await exchange.token()).toLowerCase() !== deployment.token.toLowerCase())
    throw new Error("Deployment token mismatch");
  if (
    state.exchange &&
    (state.exchange !== deployment.exchange ||
      state.maker !== makerAddress ||
      state.taker !== takerAddress)
  )
    throw new Error(
      "Seed checkpoint belongs to different contracts or wallets",
    );
  Object.assign(state, {
    chainId: deployment.chainId,
    exchange: deployment.exchange,
    token: deployment.token,
    maker: makerAddress,
    taker: takerAddress,
    steps: state.steps || {},
  });
  save();
  async function step(key, send) {
    let item = state.steps[key];
    if (!item) {
      let tx;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          tx = await send();
          break;
        } catch (error) {
          // A load-balanced public RPC may estimate against a node behind the receipt.
          // Retry only rejected estimates; never retry an uncertain broadcast.
          if (
            error.code !== "CALL_EXCEPTION" ||
            error.action !== "estimateGas" ||
            attempt === 4
          )
            throw error;
          maker.reset();
          taker.reset();
          log(`${key}: RPC estimate not ready; retrying before submission`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      item = state.steps[key] = { hash: tx.hash };
      save();
      log(`${key}: ${tx.hash}`);
    }
    if (!item.confirmed) {
      const receipt = await provider.waitForTransaction(item.hash, 1, 180000);
      if (receipt?.status !== 1)
        throw new Error(
          `${key} not confirmed; inspect transaction before continuing`,
        );
      item.confirmed = true;
      item.block = receipt.blockNumber;
      for (const entry of receipt.logs) {
        try {
          const event = exchange.interface.parseLog(entry);
          if (event?.name === "Order") item.orderId = String(event.args.id);
        } catch {}
      }
      save();
    }
    return item;
  }
  // 0.004 ETH total sent/deposited by maker, plus network gas. All assets are testnet only.
  await step("fund-taker", () =>
    maker.sendTransaction({ to: takerAddress, value: parseEther("0.002") }),
  );
  await step("transfer-hai", () =>
    token.transfer(takerAddress, parseEther("1000")),
  );
  await step("maker-approve", () =>
    token.approve(deployment.exchange, parseEther("2000")),
  );
  await step("maker-deposit-hai", () =>
    exchange.depositToken(parseEther("2000")),
  );
  await step("maker-deposit-eth", () =>
    exchange.depositEther({ value: parseEther("0.002") }),
  );
  await step("taker-approve", () =>
    token.connect(taker).approve(deployment.exchange, parseEther("800")),
  );
  await step("taker-deposit-hai", () =>
    exchange.connect(taker).depositToken(parseEther("800")),
  );
  await step("taker-deposit-eth", () =>
    exchange.connect(taker).depositEther({ value: parseEther("0.001") }),
  );
  const specs = [
    ["trade-buy-1", "buy", "80", "0.00000100", "fill"],
    ["trade-sell-1", "sell", "60", "0.00000110", "fill"],
    ["trade-buy-2", "buy", "100", "0.00000105", "fill"],
    ["cancelled-sell", "sell", "40", "0.00000130", "cancel"],
    ["open-buy-1", "buy", "50", "0.00000090", "open"],
    ["open-buy-2", "buy", "100", "0.00000095", "open"],
    ["open-buy-3", "buy", "150", "0.00000100", "open"],
    ["open-sell-1", "sell", "50", "0.00000110", "open"],
    ["open-sell-2", "sell", "100", "0.00000115", "open"],
    ["open-sell-3", "sell", "150", "0.00000120", "open"],
  ];
  for (const [key, side, amount, price, action] of specs) {
    const quantity = parseEther(amount),
      total = (quantity * parseEther(price)) / 10n ** 18n;
    const order = await step(key, () =>
      exchange.makeOrder(
        side === "buy" ? deployment.token : ZeroAddress,
        side === "buy" ? quantity : total,
        side === "buy" ? ZeroAddress : deployment.token,
        side === "buy" ? total : quantity,
      ),
    );
    if (!order.orderId) throw new Error(`Order event missing for ${key}`);
    if (action === "fill")
      await step(`${key}-fill`, () =>
        exchange.connect(taker).fillOrder(order.orderId),
      );
    if (action === "cancel")
      await step(`${key}-cancel`, () => exchange.cancelOrder(order.orderId));
  }
  let filled = 0,
    cancelled = 0,
    open = 0;
  for (const [key] of specs) {
    const id = state.steps[key].orderId;
    if (await exchange.orderFilled(id)) filled++;
    else if (await exchange.orderCancelled(id)) cancelled++;
    else open++;
  }
  state.summary = { seededOrders: specs.length, open, filled, cancelled };
  save();
  log(`Seed complete: ${open} open, ${filled} filled, ${cancelled} cancelled.`);
  return state;
}

async function main() {
  if (!process.env.RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY)
    throw new Error("Configure .env.local first");
  const provider = new JsonRpcProvider(process.env.RPC_URL, undefined, {
    cacheTimeout: 0,
  });
  let lock;
  try {
    const chainId = Number((await provider.getNetwork()).chainId);
    if (![11155111, 31337].includes(chainId))
      throw new Error(
        "Seeding is allowed only on Sepolia or local development",
      );
    const deployment = JSON.parse(readFileSync(`deployments/${chainId}.json`));
    const statePath = `deployments/${chainId}.seed.json`,
      lockPath = `deployments/${chainId}.seed.lock`;
    mkdirSync("deployments", { recursive: true });
    lock = openSync(lockPath, "wx");
    try {
      const secretPath = ".env.demo.local";
      if (!existsSync(secretPath))
        writeFileSync(
          secretPath,
          `# Local demo trader; never commit or publish.\nDEMO_TAKER_PRIVATE_KEY=${Wallet.createRandom().privateKey}\n`,
          { mode: 0o600, flag: "wx" },
        );
      const takerWallet = new Wallet(
        parseEnv(readFileSync(secretPath, "utf8")).DEMO_TAKER_PRIVATE_KEY,
        provider,
      );
      const makerWallet = new Wallet(
        process.env.DEPLOYER_PRIVATE_KEY,
        provider,
      );
      const state = existsSync(statePath)
        ? JSON.parse(readFileSync(statePath))
        : {};
      if (
        !state.steps?.["fund-taker"] &&
        (await provider.getBalance(makerWallet.address)) < parseEther("0.005")
      )
        throw new Error(
          "Keep at least 0.005 Sepolia ETH for seed funds and gas",
        );
      await seedExchange({
        provider,
        makerWallet,
        takerWallet,
        deployment,
        state,
        save: () => writeFileSync(statePath, JSON.stringify(state, null, 2)),
      });
      console.log(
        "Demo maker:",
        makerWallet.address,
        "Demo taker:",
        takerWallet.address,
      );
      console.log(
        "Remaining maker ETH:",
        formatEther(await provider.getBalance(makerWallet.address)),
      );
    } finally {
      closeSync(lock);
      unlinkSync(lockPath);
    }
  } finally {
    provider.destroy();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((e) => {
    console.error(
      "Seed stopped:",
      e.reason || e.shortMessage || e.code || e.message,
    );
    process.exitCode = 1;
  });
