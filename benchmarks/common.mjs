import { cpus, totalmem, platform, release, arch } from "node:os";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
export const smoke = process.argv.includes("--smoke");
export const samples = smoke ? 5 : 100;
export const warmups = smoke ? 1 : 5;
export function stats(values) {
  const a = [...values].sort((a, b) => a - b);
  const q = (p) => a[Math.max(0, Math.ceil(p * a.length) - 1)];
  return {
    samples: a.length,
    min: a[0],
    p50: q(0.5),
    p95: a.length >= 20 ? q(0.95) : null,
    p99: a.length >= 100 ? q(0.99) : null,
    max: a.at(-1),
  };
}
export function environment() {
  const lock = JSON.parse(readFileSync("package-lock.json"));
  return {
    node: process.version,
    os: `${platform()} ${release()}`,
    arch: arch(),
    cpu: cpus()[0]?.model,
    logicalCpus: cpus().length,
    memoryGiB: Math.round(totalmem() / 2 ** 30),
    packages: Object.fromEntries(
      ["ganache", "solc", "next", "react", "ethers"].map((n) => [
        n,
        lock.packages[`node_modules/${n}`].version,
      ]),
    ),
    contractsSha256: createHash("sha256")
      .update(readFileSync("src/contracts/Token.sol"))
      .update(readFileSync("src/contracts/Exchange.sol"))
      .digest("hex"),
  };
}
export function save(name, data) {
  mkdirSync("benchmarks/results", { recursive: true });
  const path = `benchmarks/results/${smoke ? "smoke-" : ""}${name}.json`;
  const output = {
    schemaVersion: 1,
    kind: name,
    mode: smoke ? "smoke" : "full",
    measuredAt: new Date().toISOString(),
    environment: environment(),
    ...data,
  };
  writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
  console.log(path);
  return output;
}
export function measure(fn, n = samples) {
  const values = [];
  for (let i = 0; i < warmups; i++) fn();
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    fn();
    values.push(performance.now() - t);
  }
  return stats(values);
}
export async function measureAsync(fn, n = samples) {
  const values = [];
  for (let i = 0; i < warmups; i++) await fn();
  for (let i = 0; i < n; i++) {
    const t = performance.now();
    await fn();
    values.push(performance.now() - t);
  }
  return stats(values);
}
