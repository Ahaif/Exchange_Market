import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const known = [];
for (const path of [".env", ".env.local", ".env.demo.local"])
  if (existsSync(path)) {
    for (const [key, value] of Object.entries(
      parseEnv(readFileSync(path, "utf8")),
    )) {
      if (/PRIVATE|SECRET|MNEMONIC|API_KEY/.test(key) && value.length >= 20) {
        known.push(value);
        known.push(...(value.match(/[a-fA-F0-9]{64}/g) || []));
      }
    }
  }
let failed = false;
for (const file of files) {
  if (!existsSync(file)) continue;
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example")) {
    console.error(`Tracked private environment file: ${file}`);
    failed = true;
    continue;
  }
  const content = readFileSync(file, "utf8");
  const assignedKey =
    /(?:private[_-]?keys?|mnemonic)\s*[=:]\s*["'`]?(?:0x)?[a-fA-F0-9]{64}(?![a-fA-F0-9])/i;
  if (
    known.some((key) => content.includes(key)) ||
    assignedKey.test(content) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)
  ) {
    console.error(`Possible credential in tracked file: ${file}`);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    "Tracked-file boundary check passed. No private environment files or recognized wallet credentials. This is not a complete secret audit.",
  );
