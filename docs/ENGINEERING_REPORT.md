# Engineering review: final implementation report

## 1. Executive summary

Added source-traceable architecture, a 17-threat STRIDE model, a capability matrix, adversarial tests, deterministic local benchmarks and stronger CI gates. The original Solidity sources, public APIs and deployment records are preserved. No public-chain transaction, deployment, token-supply change or real-key signing was performed. The existing live demo was not republished; these are repository engineering changes.

## 2. Files changed

- Evidence/docs: README, ENGINEERING_AUDIT, ARCHITECTURE, SECURITY_THREAT_MODEL, PERFORMANCE, ENGINEERING_STATUS, VERIFICATION and this report; updated overview, guide, security notes, roadmap entry and generated progress.
- Small production extractions: `lib/read-model.mjs`, `lib/transaction-session.mjs`, `app/components/OrderTable.mjs`; existing page/trade adapter uses them.
- Test infrastructure: `test/helpers/evm.mjs`, test-only `Adversarial.sol`, new adversarial/read-model tests; existing local EVMs now have deterministic configuration.
- Benchmarks: category runners, deterministic fixture generator, statistical/environment helpers and four measured JSON outputs in `benchmarks/results/`.
- Tooling: atomic artifact writes during parallel compilation, pattern-only default credential checks, Markdown/Mermaid structural validator, npm scripts and CI permissions/concurrency/typecheck/benchmark smoke.
- Dependency evidence: `docs/evidence/dependency-audit-summary.json`. No package dependency was added.

## 3. Architecture improvements

Canonical current-system, component, trust-boundary and five transaction-sequence diagrams now live in one document. Duplicate overview/guide diagrams link to that source. Small injected-read and pure aggregation/session boundaries are independently testable; the page still owns orchestration and is not misrepresented as a separate service architecture. Future indexer/PostgreSQL/API/L2 boxes are explicitly NOT IMPLEMENTED.

## 4. Security findings

Fixed a UI submission exclusion gap and rechecked the wallet session before continuing token deposit after asynchronous allowance/approval work. Added receiver reentrancy/rollback tests and demonstrated token compatibility limits without changing deployed code. A fresh npm audit exits 1 with 27 Ganache-subtree advisories; historical GitHub alerts remain untriaged. Credentials previously committed cannot be certified rotated here. Static Slither analysis was unavailable (exit 127).

## 5. Performance results

Local warmed receipt gas: ETH deposit 31,233; ETH withdrawal 38,685; token deposit 55,092; token withdrawal 47,665; create order 166,876; fill 95,071; cancel 51,970. Each has 100 measured samples and fixed fixture conditions. At 100k observations: OHLCV median 2.330 ms; 166,667 experimental replay events median 21.576 ms. Actual production table server-render median: 0.084 ms for 100 rows and 8.828 ms for 10k rows. Three isolated builds median 4.403 seconds. Hardware/software, p95/p99, sample caveats and transport evidence are in [PERFORMANCE.md](PERFORMANCE.md). These are not live-chain or browser benchmarks and establish no improvement against a prior baseline.

## 6. Tests added

Ten new test cases bring the suite to 20: six adversarial cases (including a 40-step conservation trace) and four bounded-read/replay/session cases. Added scenarios include exact reentrancy-error rejection, failed ETH transfer rollback, incoming tax/false return rejection, optional-return compatibility, outgoing-tax limitation, mined replay/cancel rejection and invalid configuration. Helpers test UI policy, not the complete wallet browser flow.

## 7. Commands and results

See [VERIFICATION.md](VERIFICATION.md) for actual commands and exit codes. Clean install, 20 tests, TypeScript, direct build, full benchmarks, production-render rerun, smoke, documentation and credential checks pass. Dependency audit intentionally reports findings with exit 1. Slither is unavailable with exit 127. Browser inventory returned an unavailable-host error. Structural Mermaid checking is not full renderer validation.

## 8. Remaining risks

Non-block-pinned/reorg-unsafe views, sparse history, unreserved quotes, unsigned display provenance, wallet phishing, uncertain-broadcast recovery gaps, token semantic assumptions, unresolved dependency alerts and historical key exposure remain. No independent audit, exhaustive invariant suite, malicious-token callback coverage or Web Vitals/wallet-browser validation is claimed.

## 9. Mainnet-readiness blockers

Dependency and historical-credential triage; stateful adversarial properties and wallet payload tests; static analysis; canonical read/index design; operational monitoring and recovery; measured target-network behavior; independent contract review and explicit release decision. CI passing is insufficient. No production financial/Outfbox integration or token rights are established.

## 10. Recommended next milestone

Finish engineering milestone 2: dependency remediation and expanded invariants/static analysis/browser payload coverage. Then optimize measured read costs under a controlled same-host baseline before adding a durable indexer or validating a separate L2 test release.
