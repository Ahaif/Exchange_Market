import {
  mkdtempSync,
  cpSync,
  symlinkSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { createServer } from "node:http";
import { save, stats, smoke, measureAsync } from "./common.mjs";
const root = process.cwd(),
  work = mkdtempSync(join(tmpdir(), "hai-build-benchmark-"));
const durations = [];
let output;
// Explicit allowlist; never copy local credential files or inherited key variables.
const env = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "LANG", "LC_ALL", "SYSTEMROOT"]
    .filter((k) => process.env[k])
    .map((k) => [k, process.env[k]]),
);
env.NEXT_TELEMETRY_DISABLED = "1";
env.NODE_ENV = "production";
try {
  for (let i = 0; i < (smoke ? 1 : 3); i++) {
    const dir = join(work, String(i));
    for (const name of [
      "app",
      "lib",
      "deployments",
      "package.json",
      "package-lock.json",
      "next.config.mjs",
      "tsconfig.json",
      "next-env.d.ts",
    ])
      cpSync(join(root, name), join(dir, name), { recursive: true });
    symlinkSync(join(root, "node_modules"), join(dir, "node_modules"), "dir");
    const start = performance.now();
    const r = spawnSync("npm", ["run", "build"], {
      cwd: dir,
      env,
      encoding: "utf8",
      timeout: 180000,
    });
    durations.push(performance.now() - start);
    if (r.status !== 0) {
      console.error(r.stdout, r.stderr);
      throw new Error(`Isolated build failed: ${r.status}`);
    }
    output = join(dir, "out");
  }
  const server = createServer((req, res) => {
    const path = resolve(
      output,
      "." + decodeURIComponent(req.url === "/" ? "/index.html" : req.url),
    );
    if (!path.startsWith(output + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      res.end(readFileSync(path));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let headers = [],
    bodies = [];
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (let i = 0; i < (smoke ? 5 : 100) + 5; i++) {
      const start = performance.now();
      const r = await fetch(url);
      const header = performance.now() - start;
      await r.arrayBuffer();
      if (r.status !== 200) throw new Error("Static request failed");
      if (i >= 5) {
        headers.push(header);
        bodies.push(performance.now() - start);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  const html = readFileSync(join(output, "index.html"), "utf8");
  save("build", {
    freshBuildWallMs: stats(durations),
    buildSamples: durations.length,
    fixture:
      "Separate fresh allowlisted checkout and .next directory per build; shared installed dependencies and OS filesystem cache; credentials excluded",
    initialHtml: {
      bytes: Buffer.byteLength(html),
      scriptTags: [...html.matchAll(/<script[^>]+src=/g)].length,
      localHttpHeadersMs: stats(headers),
      localHttpCompleteMs: stats(bodies),
    },
    limits:
      "Local loopback static HTTP transport, not browser page-load or internet hosting performance. Three builds are insufficient for p95/p99; those fields are null. No Lighthouse, FCP/LCP/CLS/INP measured.",
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}
