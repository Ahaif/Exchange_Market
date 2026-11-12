# Security threat model — STRIDE and asset assessment

Scope: current fixed-token exchange, browser, RPC integration, operator scripts, dependencies and CI. This is a reasoned threat model, **not an audit, certification, formal proof or mainnet approval**. Source evidence is in [ENGINEERING_AUDIT.md](ENGINEERING_AUDIT.md); command results are in [VERIFICATION.md](VERIFICATION.md).

## Assets, actors and assumptions

Protected assets: deposited ETH/HAI and ledger integrity; wallet allowances; user signing intent; operator keys; source/build integrity; order/event provenance; availability; correct display of execution prices and fees.

Entry points: injected wallet API, browser inputs and shipped scripts, RPC responses/logs/receipts, all public contract functions, ETH receiver callbacks, ERC-20 calls, deployment environment/checkpoint files, package installation and CI workflows.

Actors: malicious trader or contract receiver; compromised frontend/dependency; dishonest or lagging RPC; MEV searcher/sequencer; phisher; operator error; attacker reading leaked history. A compromised wallet or fully malicious delivered frontend cannot be made safe by UI validation alone.

Trust boundaries: untrusted browser → user wallet → third-party RPC → chain; exchange → immutable token; operator-only credentials → signing scripts. Diagram: [ARCHITECTURE.md](ARCHITECTURE.md#d-trust-boundaries).

Assumptions: target chain executes EVM rules; deployed HAI code is the expected fixed-supply OpenZeppelin token; users control their own wallets; operator credentials stay outside source; contracts have no upgrade/admin path. RPC reads are useful but not cryptographic proofs of canonical state. Historical credential rotation and dependency remediation are not verified.

## Rating method

Severity is impact **under stated preconditions**, not a prediction of exploitation. Critical = broad irreversible asset loss or signing compromise; High = material user loss/accounting failure; Medium = misleading state, bounded denial of service or operational failure; Low = minor precision/availability impact without direct custody loss. Likelihood is qualitative (Low/Medium/High), based on current controls and exposure; it is not a measured probability. Unmitigated impact and residual risk are stated separately so controls do not conceal what could go wrong.

| STRIDE category | Relevant threats / controls |
| --- | --- |
| Spoofing | T10/T11 chain/account checks; user-controlled wallet remains a boundary |
| Tampering | T1–T6 custody/allowance checks; T9/T14 untrusted read data |
| Repudiation | T3/T8/T14 receipts and events establish transaction identity; browser messages are not durable audit records |
| Information disclosure | T12 local key boundaries and historical exposure |
| Denial of service | T13 bounded reads, callback rejection, RPC/provider limits |
| Elevation of privilege | T5/T11/T16 approval/signature authority and immutable configuration |

## T1 — Reentrancy [Tampering / elevation]

- **Scenario / impact:** a receiver reenters withdrawal during the ETH callback to debit funds twice. A malicious token could also callback during transfer.
- **Assessment:** likelihood Low for deployed HAI with guard; severity Critical if custody can be drained, hence high test priority.
- **Existing control:** `Exchange.withdrawEther`, `withdrawToken`, deposits and `fillOrder` use `nonReentrant`; withdrawals debit before external transfer. [Exchange.sol](../src/contracts/Exchange.sol).
- **Verification:** `adversarial.test.mjs`: receiver observes the exact guard error; failed receiver payment rolls back ledger/custody. Malicious token callbacks are not exhaustively tested.
- **Recommendation / residual:** add token-hook cross-function and stateful fuzz tests plus independent review. Guard coverage is not a proof against all future modifications.

## T2 — Incorrect accounting [Tampering]

- **Scenario / impact:** wrong asset mapping, fee base or aliasing credits assets without sufficient custody.
- **Assessment:** likelihood Low after regression controls, severity Critical because shared custody is at stake.
- **Existing control:** checked arithmetic, both-party balance validation and atomic mapping updates in `fillOrder`.
- **Verification:** buy/sell tests use unequal units; a 40-step deterministic trace checks aggregate ETH/HAI ledger equals custody after every trade/cancel. [adversarial tests](../test/v1/adversarial.test.mjs).
- **Recommendation / residual:** expand stateful properties to aliasing maker/fee/taker addresses, varied deposits/withdrawals, fees and extreme inputs. Current finite trace is not exhaustive.

## T3 — Double fills and replay [Tampering / repudiation]

- **Scenario / impact:** replay a previously filled/cancelled order to settle twice.
- **Assessment:** likelihood Low with flags, severity High for duplicate asset movement.
- **Existing control:** `fillOrder` validates ID and closed flags; marks filled before balance settlement; no external settlement transfer.
- **Verification:** receipt-confirmed duplicate fill and cancellation after fill revert in `adversarial.test.mjs`; cancelled fill in `contracts.test.mjs`.
- **Recommendation / residual:** retain these tests for all future order types. Public orders can still be filled once by any eligible taker.

## T4 — Precision, rounding and overflow [Tampering]

- **Scenario / impact:** UI floating-point values change an intended amount, rounding understates fees, or extreme multiplication overflows.
- **Assessment:** likelihood Medium for tiny/extreme inputs; severity Medium for current fixed-point/trade-validation path.
- **Existing control:** `createOrder` uses `parseEther` and bigint; zero-value totals reject; Solidity checks overflow. Fees truncate in smallest units.
- **Verification:** zero amount/pair tests and tiny-amount conservation trace; chart invalid-observation tests. No exhaustive uint256 boundary suite yet.
- **Recommendation / residual:** add property tests for fee floors and multiplication boundaries; explicitly preview exact totals/fees. Display estimates and charts use floating point, and very small fees can round to zero by design.

## T5 — Allowance abuse [Elevation / tampering]

- **Scenario / impact:** approve the wrong spender, malicious frontend requests excess allowance, or stale allowance is abused.
- **Assessment:** likelihood Medium through phishing, severity High for approved wallet funds.
- **Existing control:** OpenZeppelin holder-owned allowance; UI approves the required amount, checks allowance and waits before deposit; session rechecked after approval. [Token.sol](../src/contracts/Token.sol), `funds`.
- **Verification:** allowance ownership regression; session mismatch unit test. No wallet transaction-payload integration test yet.
- **Recommendation / residual:** add wallet payload assertions and explicit spender/amount preview. Revocation remains a user responsibility; a compromised frontend can ask for a different signature.

## T6 — Nonstandard/malicious tokens [Tampering / DoS]

- **Scenario / impact:** fee-on-transfer, false return, rebasing or arbitrary balance reporting breaks the ledger's assumptions.
- **Assessment:** Low likelihood for immutable deployed standard HAI; High likelihood if arbitrary tokens were admitted without redesign. Severity High for incompatible custody semantics.
- **Existing control:** one immutable token, SafeERC20, exact incoming balance delta.
- **Verification:** incoming fee/false-return rejection rolls back; no-return token succeeds; an outgoing taxed transfer demonstrably delivers less than debited. Test-only configurable token never changes production HAI.
- **Recommendation / residual:** do not advertise arbitrary-token support. Incoming delta checks cannot make a lying/rebasing token safe; outgoing tax is not rejected. Token admission requires explicit compatibility policy and new review.

## T7 — Front-running and MEV [Tampering]

- **Scenario / impact:** another taker sees a pending fill, fills first, and leaves the original taker paying gas for a revert; a maker races cancellation/withdrawal.
- **Assessment:** likelihood Medium on a public mempool; severity Medium for failed transaction costs/order intent. Limit amounts cannot silently change.
- **Existing control:** immutable order amounts and first-valid-fill state checks; no market-order/slippage path.
- **Verification:** replay/closed-state tests show only one fill succeeds; no mempool adversary simulation.
- **Recommendation / residual:** disclose ordering uncertainty; investigate simulation/private submission without guarantees. No MEV protection is implemented.

## T8 — Transaction races [Tampering / repudiation]

- **Scenario / impact:** double-click submits twice; wallet changes between approval and deposit; fill beats cancel.
- **Assessment:** likelihood Medium; severity High for unintended wallet actions, Medium for expected closed-order races.
- **Existing control:** synchronous `createTransactionGate`; revision/account/chain validation; contract state checks.
- **Verification:** gate/session helper tests plus mined closed-order reverts. [transaction-session.mjs](../lib/transaction-session.mjs).
- **Recommendation / residual:** add browser/wallet integration tests and persistent pending-transaction tracking. UI gate does not serialize other tabs, wallets or external callers.

## T9 — RPC manipulation / stale reads [Spoofing / tampering]

- **Scenario / impact:** lagging or dishonest RPC displays incorrect balances, fees, receipts or history.
- **Assessment:** likelihood Medium; severity High for misleading signing context, though canonical contract checks still govern settlement.
- **Existing control:** expected chain/token checks, post-receipt refresh, bounded reads, stale request/session suppression. Seed retries only pre-submission estimates.
- **Verification:** seed stale-estimate simulation and read-bound tests; no malicious full RPC adapter test.
- **Recommendation / residual:** pin reads to one block, verify configured bytecode and use independent provider cross-checks. Current parallel reads can mix blocks; cache is not canonicality-aware.

## T10 — Wrong chain [Spoofing]

- **Scenario / impact:** an address on a different network is mistaken for the configured contract.
- **Assessment:** likelihood Medium user error; severity High if a user signs against unintended code.
- **Existing control:** configured allowlist; network checks in `refresh`/`transact`, wallet switch flow, operator script chain restrictions.
- **Verification:** session helper rejects chain mismatch; no full browser switch/error flow test.
- **Recommendation / residual:** test unknown/unadded chains and switching mid-signature; validate exact contract code as well as token setting. Malicious wallet/RPC can lie.

## T11 — Wallet phishing / simulation [Spoofing / elevation]

- **Scenario / impact:** compromised page requests a harmful approval/transaction and a user trusts familiar UI or simulation output.
- **Assessment:** likelihood Medium in an internet deployment; severity Critical if broad signing authority is granted.
- **Existing control:** wallet retains keys, exact-amount requests in expected code, testnet labeling and explorer links.
- **Verification:** source review only; no claim of simulation protection or browser-level payload verification.
- **Recommendation / residual:** provenance/content security controls, dependency review, clear signing details and integration tests. Simulation is not a guarantee; wallet confirmation can authorize malicious intent.

## T12 — Private-key leakage [Information disclosure]

- **Scenario / impact:** operator key leaks via Git history, logs, public variables or CI.
- **Assessment:** High likelihood that old committed material remains accessible; validity/rotation unverified. Severity Critical if a live key is reused.
- **Existing control:** private env files ignored, public-only deployment records, pattern boundary check; no key reads by default checks/benchmarks. [check-boundaries.mjs](../scripts/check-boundaries.mjs).
- **Verification:** security command and current diff; not a historical secret audit or rotation proof.
- **Recommendation / residual:** rotate any genuine historical credential, use dedicated secret scanning and least-privilege storage. Current-tree deletion cannot remove historical copies.

## T13 — Gas exhaustion / denial of service [DoS]

- **Scenario / impact:** spam orders grows history, receiver rejects ETH, RPC throttles scans, extreme arithmetic reverts.
- **Assessment:** likelihood Medium; severity Medium for availability, bounded under present constant-work settlement.
- **Existing control:** latest-100 reads, 10 concurrent readers, 50k-block window, 5k log chunks; failed receiver rolls back only its withdrawal.
- **Verification:** bounded-read test and large synthetic datasets; rejecting-receiver test; [PERFORMANCE.md](PERFORMANCE.md).
- **Recommendation / residual:** provider rate limits/backoff, pagination, monitoring and explicit response-size controls. Limits do not guarantee RPC uptime or prevent contract order spam.

## T14 — Event/index consistency [Tampering / repudiation]

- **Scenario / impact:** duplicates, missing logs or reorgs corrupt chart provenance or an off-chain read model.
- **Assessment:** likelihood Medium; severity Medium for misleading display; chain custody remains authoritative.
- **Existing control:** fills keyed by order ID, block timestamps, bounded ranges. Experimental reducer orders/deduplicates log identity and rejects missing order history.
- **Verification:** replay ordering/dedup test and candle tests; live adapter/reorg handling not tested.
- **Recommendation / residual:** canonical block hashes, rollback/replay and chain+address-qualified log identity in a durable indexer. Current reducer assumes one chain/contract stream; not production indexing.

## T15 — Maker withdrawal after creation [Tampering / availability]

- **Scenario / impact:** maker withdraws assets while a quote remains visible; taker submits a now-unfillable order.
- **Assessment:** likelihood High by design; severity Medium for wasted gas and misleading liquidity.
- **Existing control:** `fillOrder` rechecks maker balance and reverts atomically.
- **Verification:** withdrawn-maker regression proves failed fill leaves no settlement.
- **Recommendation / residual:** show executable-liquidity estimates or add reservations only with reviewed contract redesign. Current depth bars are quotes, not locked assets.

## T16 — Unauthorized privileged operations [Elevation]

- **Scenario / impact:** an unauthorized party changes fees/supply, cancels another maker's order, or controls deployment configuration.
- **Assessment:** Low likelihood for nonexistent admin methods; severity High if future privileged paths are added.
- **Existing control:** fixed supply, immutable token/fee settings, maker-only cancellation; constructor rejects zero fee recipient and excessive fee.
- **Verification:** allowance, unauthorized cancellation and invalid configuration tests; review confirms no mint/update/admin API.
- **Recommendation / residual:** keep privileges minimal; review multisig/timelock requirements if upgrades appear. Immutability also means bugs cannot be patched in place.

## T17 — Dependencies and build supply chain [All STRIDE categories]

- **Scenario / impact:** vulnerable or compromised package/action changes signing logic or executes during installation.
- **Assessment:** likelihood Medium; severity Critical for signing/build compromise.
- **Existing control:** committed lockfile, `npm ci`, explicit CI permissions and concurrency, known-alert documentation. Lockfiles improve reproducibility, not trust in package contents.
- **Verification:** required clean install and CI commands; prior audit snapshots are in [SECURITY.md](SECURITY.md), not a current clean-bill claim.
- **Recommendation / residual:** triage all repository alerts, replace vulnerable test tooling, pin verified action revisions and add maintained dependency review. No automatic `audit fix --force` applied.

## Static analysis status

`slither --version` was attempted and exited **127: command not found: slither**. No native `solc` executable was found either; compilation uses solc-js. No Slither analysis ran and no detector-clean result is claimed. Installing a compatible isolated Slither/native-solc toolchain and recording findings is a next verification task, not silently substituted by tests.

## Release policy

No production-ready claim follows from CI. Historical credential rotation, dependency triage, stateful adversarial coverage, browser payload tests, canonical event handling, operational recovery and independent review are outstanding. No mainnet deployment, token-supply change, pool creation or real-key use is part of this work.
