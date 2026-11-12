import solc from "solc";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
const sources = Object.fromEntries(
  ["Token", "Exchange"].map((name) => [
    `${name}.sol`,
    { content: readFileSync(`src/contracts/${name}.sol`, "utf8") },
  ]),
);
const result = JSON.parse(
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
          return { error: `Missing import ${path}` };
        }
      },
    },
  ),
);
for (const e of result.errors ?? []) {
  if (e.severity === "error") throw new Error(e.formattedMessage);
  console.warn(e.formattedMessage);
}
mkdirSync("artifacts", { recursive: true });
for (const name of ["Token", "Exchange"]) {
  const c = result.contracts[`${name}.sol`][name];
  writeFileSync(
    `artifacts/${name}.${process.pid}.tmp`,
    JSON.stringify(
      { abi: c.abi, bytecode: `0x${c.evm.bytecode.object}` },
      null,
      2,
    ),
  );
  renameSync(`artifacts/${name}.${process.pid}.tmp`, `artifacts/${name}.json`);
}
console.log("Compiled Token and Exchange with solc", solc.version());
