import "./compile.mjs";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import {
  JsonRpcProvider,
  Wallet,
  ContractFactory,
  isAddress,
  NonceManager,
  ZeroAddress,
} from "ethers";
if (!process.env.RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY)
  throw new Error("Set RPC_URL and DEPLOYER_PRIVATE_KEY in .env.local");
const provider = new JsonRpcProvider(process.env.RPC_URL, undefined, {
  cacheTimeout: 0,
});
try {
  const chainId = Number((await provider.getNetwork()).chainId);
  if (![31337, 11155111].includes(chainId))
    throw new Error("Only local chain 31337 and Sepolia are supported");
  const wallet = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
  const signer = new NonceManager(wallet);
  const feeAccount = process.env.FEE_ACCOUNT || wallet.address;
  if (!isAddress(feeAccount) || feeAccount === ZeroAddress)
    throw new Error("Invalid FEE_ACCOUNT");
  const artifact = (name) => JSON.parse(readFileSync(`artifacts/${name}.json`));
  const t = artifact("Token"),
    e = artifact("Exchange");
  mkdirSync("deployments", { recursive: true });
  const path = `deployments/${chainId}.json`;
  const deployment = existsSync(path)
    ? JSON.parse(readFileSync(path))
    : { chainId, deployer: wallet.address, feeAccount, feeBps: 25 };
  if (
    deployment.deployer !== wallet.address ||
    deployment.feeAccount !== feeAccount
  )
    throw new Error(
      "Saved deployment belongs to a different deployer or fee account",
    );
  const save = () => writeFileSync(path, JSON.stringify(deployment, null, 2));
  if (!deployment.token) {
    const token = await new ContractFactory(t.abi, t.bytecode, signer).deploy();
    deployment.token = await token.getAddress();
    deployment.tokenTransaction = token.deploymentTransaction().hash;
    save();
    console.log("Token deployment transaction:", deployment.tokenTransaction);
  }
  const tokenReceipt = await provider.waitForTransaction(
    deployment.tokenTransaction,
    1,
    180000,
  );
  if (
    tokenReceipt?.status !== 1 ||
    (await provider.getCode(deployment.token)) === "0x"
  )
    throw new Error("Token is not confirmed yet; rerun to resume");
  console.log("Token address:", deployment.token);
  if (!deployment.exchange) {
    const exchange = await new ContractFactory(
      e.abi,
      e.bytecode,
      signer,
    ).deploy(deployment.token, feeAccount, deployment.feeBps);
    deployment.exchange = await exchange.getAddress();
    deployment.exchangeTransaction = exchange.deploymentTransaction().hash;
    save();
    console.log(
      "Exchange deployment transaction:",
      deployment.exchangeTransaction,
    );
  }
  const receipt = await provider.waitForTransaction(
    deployment.exchangeTransaction,
    1,
    180000,
  );
  if (
    receipt?.status !== 1 ||
    (await provider.getCode(deployment.exchange)) === "0x"
  )
    throw new Error("Exchange is not confirmed yet; rerun to resume");
  deployment.block = receipt.blockNumber;
  save();
  console.log(JSON.stringify(deployment, null, 2));
  console.log(
    "Set the NEXT_PUBLIC_* contract settings from these values, then restart or rebuild.",
  );
} catch (e) {
  console.error(
    "Deployment stopped:",
    e.reason ||
      e.shortMessage ||
      e.code ||
      "Check local configuration and RPC availability.",
  );
  console.error(
    "Any saved deployment progress is retained in deployments/. Rerun to resume.",
  );
  process.exitCode = 1;
} finally {
  provider.destroy();
}
