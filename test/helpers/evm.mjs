import solc from "solc";
import ganache from "ganache";
import { readFileSync } from "node:fs";
import { BrowserProvider, ContractFactory } from "ethers";
export function compileFixtures() {
  const sources = Object.fromEntries(
    [
      ["Token.sol", "src/contracts/Token.sol"],
      ["Exchange.sol", "src/contracts/Exchange.sol"],
      ["Adversarial.sol", "test/fixtures/Adversarial.sol"],
    ].map(([name, path]) => [name, { content: readFileSync(path, "utf8") }]),
  );
  const output = JSON.parse(
    solc.compile(
      JSON.stringify({
        language: "Solidity",
        sources,
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: "shanghai",
          outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
        },
      }),
      {
        import: (path) => {
          try {
            return { contents: readFileSync(`node_modules/${path}`, "utf8") };
          } catch {
            return { error: `Missing ${path}` };
          }
        },
      },
    ),
  );
  const errors = (output.errors || []).filter((e) => e.severity === "error");
  if (errors.length)
    throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  return Object.assign(
    {},
    ...Object.values(output.contracts).map((file) =>
      Object.fromEntries(
        Object.entries(file).map(([name, c]) => [
          name,
          { abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` },
        ]),
      ),
    ),
  );
}
export async function localEvm() {
  const chain = ganache.provider({
    logging: { quiet: true },
    wallet: { deterministic: true },
    chain: {
      chainId: 31337,
      hardfork: "shanghai",
      time: new Date("2026-01-01T00:00:00Z"),
    },
    miner: { timestampIncrement: 1 },
  });
  const provider = new BrowserProvider(chain, undefined, { cacheTimeout: 0 });
  provider.pollingInterval = 20;
  const signers = await Promise.all(
    [0, 1, 2, 3].map((i) => provider.getSigner(i)),
  );
  return {
    provider,
    signers,
    close: async () => {
      provider.destroy();
      await chain.disconnect();
    },
  };
}
export async function deploy(artifacts, name, signer, ...args) {
  const a = artifacts[name];
  const c = await new ContractFactory(a.abi, a.bytecode, signer).deploy(
    ...args,
  );
  await c.waitForDeployment();
  return c;
}
