# Keeping development and documentation connected

- Preserve the deployed Sepolia demo unless a change explicitly calls for redeployment.
- For every implementation change, review `docs/roadmap.json`; update statuses and evidence only for work actually completed. Update `docs/OVERVIEW.md`, `docs/ROADMAP.md`, and README when behavior, architecture, stack, configuration, or instructions change.
- Run `npm run docs:update` after source changes and include the generated `docs/PROGRESS.md`. Run `npm run docs:check` before finishing. CI enforces source/progress synchronization; generation does not prove tests pass or automatically complete milestones.
- Record public deployment addresses, seed transaction checkpoints and website version metadata in `deployments/`. Never put private keys or credential-bearing RPC URLs there.
- `.env.local` and `.env.demo.local` contain private credentials. Do not print, commit, or publish them. Hosted source must exclude legacy code, old Git history, node_modules, and all environment files except `.env.example`.
- Report validation limits honestly. Never mark planned API, indexer, database, faucet, audit or L2 work as implemented.

- For engineering changes, maintain `docs/ENGINEERING_AUDIT.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_THREAT_MODEL.md`, `docs/ENGINEERING_STATUS.md` and `docs/VERIFICATION.md`. Keep current and future components distinct. Benchmark JSON is local evidence, not live-chain or browser performance. Never execute public-chain transactions as part of tests/benchmarks.
