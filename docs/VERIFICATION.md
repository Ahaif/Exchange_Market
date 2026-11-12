# Verification command ledger

Scope: this local engineering working tree; no public-chain transactions, real-key signing, deployment, seeding or token-supply changes. A local success does not assert that remote GitHub Actions ran. JSON benchmarks are point-in-time local evidence.

| Command / check | Actual exit | Evidence / qualification |
| --- | --- | --- |
| `npm ci --cache /private/tmp/hai-npm-cache --no-audit --no-fund` | 0 | Lockfile install; 387 packages; no dependency additions for this task |
| `npm test` | 0 | 20 tests, including six adversarial tests and four read/session/replay tests in addition to the original ten |
| `npm run typecheck` | 0 | Typed app and JS adapter boundaries |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | 0 | Direct production build plus isolated benchmark builds; no deployment |
| `npm run docs:check` | 0 | Regenerated and checked after final evidence edits |
| `npm run security:check` | 0 | Default pattern-only mode; does not read operator credentials |
| `npm run docs:validate` | 0 | Relative file links and Mermaid fence/header/node-balance checks, not full grammar/render validation |
| `npm run benchmark` | 0 | Separate local contract/data/frontend/build processes; raw JSON in benchmarks/results |
| `npm run benchmark:frontend` | 0 | Explicit production React renderer rerun; supersedes initial default-mode frontend JSON |
| `npm run benchmark:smoke` | 0 | CI executability check, no performance threshold |
| `npm audit --omit=dev --json --cache /private/tmp/hai-npm-cache` | 1 | 27 advisory entries: 4 critical, 17 high, 5 moderate, 1 low; all reported paths under Ganache; unresolved, not an audit-clean claim |
| `git diff --exit-code -- src/contracts deployments` | 0 | Existing Solidity sources and deployed address/transaction records unchanged |
| `git diff --check` | 0 | Patch whitespace check |
| `slither --version` | 127 | `command not found: slither`; native solc also absent. No static analysis success claimed |
| CUA browser inventory | Tool returned inventory error | `The browser access host is unavailable`; no FCP/LCP/CLS/INP/visual result |

Timing distributions are not repeatable bit-for-bit. Fixture seed, chain configuration, compiler settings, actual receipt gas and hardware/runtime versions are recorded in [PERFORMANCE.md](PERFORMANCE.md). The task intentionally does not claim historical credential rotation, full vulnerability remediation, canonical index consistency or mainnet readiness.
