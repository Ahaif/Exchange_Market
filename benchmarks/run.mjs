import { spawnSync } from "node:child_process";
const smoke = process.argv.includes("--smoke");
for (const name of [
  "contracts",
  "data",
  "frontend",
  ...(smoke ? [] : ["build"]),
]) {
  const r = spawnSync(
    process.execPath,
    [`benchmarks/${name}.mjs`, ...(smoke ? ["--smoke"] : [])],
    { stdio: "inherit" },
  );
  if (r.status !== 0) process.exit(r.status || 1);
}
