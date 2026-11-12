> This is the historical demo delivery plan. The current six-gate engineering roadmap is in [ENGINEERING_STATUS.md](ENGINEERING_STATUS.md#engineering-roadmap--separate-from-historical-demo-milestones).

# Delivery roadmap: Sepolia demo → full-stack Ethereum L2 app

Statuses live in [roadmap.json](roadmap.json) and are displayed with evidence in [PROGRESS.md](PROGRESS.md). This plan uses completion gates rather than invented dates. Do not treat a demonstration milestone as production readiness.

| Milestone              | Deliverables and acceptance gate                                                                                                                                                                                                      | Dependencies                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| M1 · Foundation        | Next.js/TypeScript UI, standard ERC-20, checked settlement, allowance and custody regression tests; reproducible install/build                                                                                                        | Complete                                |
| M2 · Sepolia           | Persistent deployed contracts, public addresses/receipts, resumable deployment and matching UI configuration                                                                                                                          | M1; complete                            |
| M3 · Shareable demo    | 6 seeded open orders, 3 filled orders, 1 cancellation; read market without a wallet; publish configured website; rerunning seed sends no duplicate transactions                                                                       | M2                                      |
| M4 · Onboarding / QA   | Test token claim or documented distribution, network onboarding, fee/approval preview, friendly errors, wallet browser tests at desktop/mobile sizes; demonstrate deposit → order → fill → withdraw using two wallets                 | M3                                      |
| M5 · Off-chain backend | PostgreSQL schema/migrations, reorg-aware event worker, historical backfill, durable cursor, idempotent logs, paginated TypeScript API, chart candles, live updates and monitoring                                                    | M3; can overlap M4                      |
| M6 · L2 test release   | Base Sepolia chain configuration, fresh contracts and verified source, gas estimate checks, seeded demo, indexed L2 events and CI smoke checks; two-wallet end-to-end test on L2                                                      | M4 + M5                                 |
| M7 · Production gate   | Independent contract review, invariants/fuzzing/reentrancy adversarial tests, RPC failover, rate limits, database backup/restore drill, alerts, release rollback and incident playbook; then deliberate Base mainnet release decision | M6; no real-funds release before review |

## Next work after the demo

1. Publish explorer-verified contract source and save compiler settings and constructor arguments with release evidence.
2. Make test assets easy to obtain. A testnet-only claim faucet needs distribution limits; a browser must not receive an operator key.
3. Add Playwright-style wallet flows in CI and test account/network changes, rejected signatures, failed receipts and stale orders. Replace Ganache with a maintained local EVM runner as part of tooling work; the current bundled dependency advisories are recorded in [SECURITY.md](SECURITY.md).
4. Design the event read model before building charts. Start from the exchange deployment block, persist chain/address/log identity, replay safely, roll back orphaned logs, and compare derived balances/order state to contracts.
5. Expose bounded API endpoints: markets, open orders, trades, candles and account history. Add request limits, validation, health checks and error monitoring. Wallet address is public identity; require signed login only for private off-chain preferences or user data.

## L2 migration checklist

- [ ] Confirm Base versus another Ethereum L2 based on users, tooling, availability and operating needs; Base is currently a proposal.
- [ ] Add a single chain registry for IDs, deployment addresses, public RPC and explorer; remove Sepolia-only assumptions in UI, deployment and seeding.
- [ ] Add Base Sepolia 84532 to the deployment allowlist only when implementing M6. Keep scripts testnet-only by default.
- [ ] Estimate both execution and L1 data costs; test gas estimation and RPC behavior on the chosen L2.
- [ ] Deploy a separate test HAI and exchange; record compiler/input hashes, transactions, fee policy and deployment blocks.
- [ ] Verify source on the L2 explorer and seed with testnet assets. No implicit migration of current Sepolia balances.
- [ ] Run API/indexer backfill and reorg tests; distinguish pending, included and settled transactions in product language.
- [ ] Test sequencer/RPC downtime, user withdrawals and recovery procedures. Document bridge delays only if bridging is introduced.
- [ ] Run the complete two-wallet flow against the public L2 release. Record transaction links and release version.

## How progress stays connected to development

- `docs/roadmap.json` is the milestone source of truth. Each completed milestone must name evidence files; reviewers still validate their meaning.
- `npm run docs:update` regenerates a source fingerprint, actual locked stack versions, test-definition count, deployment addresses, recorded seed result and site release metadata.
- `npm run docs:check` fails if the generated page differs. GitHub Actions runs it on pushes and pull requests, along with tests and build.
- `AGENTS.md` instructs future coding sessions to update the overview/roadmap when behavior or architecture changes, then regenerate the snapshot.
- Generation does not automatically mark future features complete or fetch live chain state. Refresh seed verification with `npm run contracts:seed`; review milestone evidence and CI results before marking completion. These controls catch stale source metadata, not every possible prose error.

## External references

- [Base network configuration](https://docs.base.org/base-chain/quickstart/connecting-to-base) — proposed L2 test/mainnet connectivity.
- [Ethereum optimistic rollups](https://ethereum.org/developers/docs/scaling/optimistic-rollups/) — L1 settlement, data availability and finality model.
