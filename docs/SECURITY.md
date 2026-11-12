# Security status and boundaries

This is an unaudited testnet learning project. Contract tests and dependency scans are useful evidence, not a production security review.

## Current release checks

- A local `npm audit --omit=dev` run on 2026-11-12 reported 27 advisory entries, all under `node_modules/ganache/`. Ganache is used by the local tests and optional local chain; it is not imported by the browser application. npm can still report bundled transitive dependencies under this dev tool with `--omit=dev`.
- These findings remain unresolved. Replacing Ganache with a maintained local EVM runner is tracked in the roadmap. Do not expose the local Ganache RPC as a public production service.
- This audit result is a point-in-time observation, not an ongoing guarantee. Rerun the audit when changing dependencies.
- `npm run security:check` checks Git-tracked paths for private environment files, recognized private-key assignments, private-key PEM headers, and matches to locally available private values. It intentionally prints paths, never credential values. CI has no access to your local private values; its pattern checks are limited. This does not replace a dedicated secret scanner or historical audit.

## GitHub repository alert report

During the documentation push on 2026-11-12, GitHub reported **66 dependency vulnerabilities: 6 critical, 30 high, 17 moderate and 13 low** on the default branch. These repository alerts have not yet been individually triaged and may use a different dependency scope or advisory dataset from the local npm audit above. Do not assume that all GitHub alerts belong to Ganache based on the local audit result. Review the [repository Dependabot alerts](https://github.com/Ahaif/Exchange_Market/security/dependabot), identify affected runtime versus development packages, and track remediation before any production release. Counts are a recorded snapshot and may change.

## Credentials and repository history

Only `.env.example` may be tracked. `.env.local`, `.env.demo.local`, original `.env` files and local caches remain ignored. Public contract addresses and transaction hashes are not secrets. Browser `NEXT_PUBLIC_*` values are public.

The old repository already committed environment content and key-like strings. Current-tree removal does not sanitize historical commits. Rotate any genuine exposed credential. This release uses an ordinary forward commit and push; it does not rewrite or force-push shared history.

## Contract and product limits

The contract uses OpenZeppelin standards, checked balances and a reentrancy guard. Further work includes adversarial contract tests, invariants, fuzzing and independent review. Order liquidity is not reserved, chart history is bounded, public RPC reads can fail, and all assets are testnet-only. An L2 production release requires the roadmap's security gates.
