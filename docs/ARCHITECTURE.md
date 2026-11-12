# Architecture: current implementation and trust boundaries

Canonical diagrams for the current application. Source inventory: [ENGINEERING_AUDIT.md](ENGINEERING_AUDIT.md). The active backend is the deployed exchange contract. There is no off-chain application server/database today.

## A. System context — implemented

```mermaid
flowchart TB
  Visitor[Visitor] --> Browser[Browser running Next.js static client]
  Hosting[Static website hosting] --> Browser
  Browser --> Wallet[User browser wallet]
  Browser --> RPC[Third-party Ethereum read RPC]
  Wallet --> WalletRPC[Wallet-selected RPC]
  RPC --> Sepolia[Ethereum Sepolia]
  WalletRPC --> Sepolia
  Sepolia --> HAI[HAI ERC-20 contract]
  Sepolia --> Exchange[Exchange contract]
  Exchange --> HAI
  Operator[Operator-only deployment scripts] --> Sepolia
  CI[CI and local tests] --> LocalEVM[Isolated deterministic Ganache]
  CI --> Build[Next.js static build]
  Build --> Hosting
```

The Build→Hosting edge is a separate publication operation, not an automatic CI deploy. Test contracts and synthetic Ganache accounts are unrelated to deployed addresses. No public-chain write is required to test or benchmark.

## B. Component architecture — implemented

```mermaid
flowchart LR
  Page[ExchangePage UI and orchestration] --> Wallet[BrowserProvider wallet integration]
  Page --> Gate[Transaction gate and session validation]
  Page --> Reader[readLatestOrders application read policy]
  Reader --> Adapter[ethers contract-read callbacks]
  Page --> History[loadConfirmedTrades blockchain adapter]
  History --> Ranges[historyRanges policy]
  Adapter --> ABI[Contract interfaces and chain configuration]
  History --> ABI
  Wallet --> ABI
  Page --> Chart[MarketChart component]
  Chart --> OHLCV[buildCandles pure aggregation]
  Chart --> Library[Lightweight Charts external library]
  Page --> Table[OrderTable presentation component]
  ABI --> RPC[External RPC and contracts]
```

`app/page.tsx` still contains application services (`connect`, `transact`, `funds`, `createOrder`) as functions; there is no separate service process or dependency-injection framework. `lib/read-model.mjs` separates bounded scheduling from ethers callbacks; `lib/trades.ts` remains the chain adapter. Experimental event replay is not a live-source component.

## C. Transaction sequences

### Deposit

```mermaid
sequenceDiagram
  actor User
  participant UI
  participant Wallet
  participant Token
  participant Exchange
  User->>UI: Deposit amount
  UI->>Wallet: Validate session and request signature
  alt HAI allowance insufficient
    Wallet->>Token: approve(exchange, amount)
    Token-->>UI: Confirmation receipt
    UI->>Wallet: Revalidate account, chain and session
  end
  Wallet->>Exchange: depositToken(amount) or depositEther(value)
  Exchange->>Token: HAI only: SafeERC20 transferFrom
  Exchange->>Exchange: Credit internal ledger
  Exchange-->>UI: Receipt and Deposit event
  UI->>Exchange: Refresh bounded state
```

Token custody must increase by the exact credited amount. ETH uses native transaction value. UI success is based on the receipt; the contract performs authorization/accounting.

### Place limit order

```mermaid
sequenceDiagram
  actor Maker
  participant UI
  participant Wallet
  participant Exchange
  Maker->>UI: Enter HAI amount and ETH unit price
  UI->>UI: Parse fixed-point bigint and calculate total
  UI->>Wallet: Validate session and sign makeOrder
  Wallet->>Exchange: makeOrder(pair, amounts)
  Exchange->>Exchange: Validate pair, amounts and maker balance
  Exchange->>Exchange: Store order and increment ID
  Exchange-->>UI: Receipt and Order event
  UI->>Exchange: Refresh state
```

Creation checks available funds but does not reserve them. No automatic matching occurs.

### Fill order

```mermaid
sequenceDiagram
  actor Taker
  participant UI
  participant Wallet
  participant Exchange
  Taker->>UI: Select Fill
  UI->>Wallet: Sign fillOrder(id)
  Wallet->>Exchange: Submit transaction
  Exchange->>Exchange: Validate ID, open state and distinct maker
  Exchange->>Exchange: Check both balances including fee
  Exchange->>Exchange: Mark filled and atomically update ledgers
  Exchange-->>UI: Receipt and Trade event
  UI->>Exchange: Refresh order and balances
```

No ERC-20 external transfer occurs during settlement; it moves deposited internal balances. Two competing fills are ordered by the chain; only the first valid fill can succeed.

### Cancel order

```mermaid
sequenceDiagram
  actor Maker
  participant UI
  participant Wallet
  participant Exchange
  Maker->>UI: Cancel own order
  UI->>Wallet: Sign cancelOrder(id)
  Wallet->>Exchange: Submit transaction
  Exchange->>Exchange: Check maker and open state
  Exchange->>Exchange: Set cancelled flag
  Exchange-->>UI: Receipt and Cancel event
```

Cancellation is not guaranteed to beat a pending fill. The mined order of transactions determines the outcome.

### Withdraw funds

```mermaid
sequenceDiagram
  actor User
  participant UI
  participant Wallet
  participant Exchange
  participant Receiver
  User->>UI: Withdraw deposited amount
  UI->>Wallet: Sign withdrawal
  Wallet->>Exchange: withdrawEther or withdrawToken
  Exchange->>Exchange: Guard entry, validate and debit ledger
  Exchange->>Receiver: ETH call or SafeERC20 transfer
  alt Transfer fails
    Exchange->>Exchange: Revert entire transaction including debit
  else Transfer succeeds
    Exchange-->>UI: Receipt and Withdraw event
  end
```

## D. Trust boundaries

```mermaid
flowchart TB
  subgraph UntrustedClient[Untrusted browser and delivered JavaScript]
    UI[UI and display read models]
  end
  subgraph UserBoundary[User-controlled signing boundary]
    Wallet[Wallet and user approval]
  end
  subgraph Transport[Third-party transport boundary]
    RPC[RPC responses and transaction relay]
  end
  subgraph ChainBoundary[On-chain execution boundary]
    Token[Immutable configured HAI]
    Exchange[Contract validations and deposited custody]
  end
  subgraph OperatorBoundary[Operator-only environment]
    Keys[Private configuration outside Git]
    Scripts[Deployment and seed scripts]
  end
  UI --> Wallet
  UI --> RPC
  Wallet --> RPC
  RPC --> Exchange
  Exchange --> Token
  Keys --> Scripts
  Scripts --> RPC
```

Browser/RPC data is not an authorization boundary. A malicious frontend can request harmful signatures; a wallet signature is not proof of informed consent. The immutable token's behavior is a contract assumption; this is not an arbitrary-token exchange. Operator keys do not belong in the browser, tests, benchmark fixtures or CI.

## State ownership and failure recovery

| State | Owner | Recovery / failure behavior |
| --- | --- | --- |
| Deposits/orders/fees | Contract storage | Reverts atomically on validation failure; actual chain state wins over UI |
| Wallet account/chain | User wallet | Account/chain events invalidate session; reconnect; recheck after approval |
| Order list and fill cache | Browser memory | Rebuilt by polling; session/request guards suppress old results; not reorg-safe |
| Transaction gate | Browser synchronous helper | Released in `finally`; prevents concurrent UI submissions, not external transactions |
| Receipt/hash messages | Browser UI | Rejection/errors shown; no persistent transaction journal or automatic broadcast retry |
| Deployment/seed steps | Local public checkpoint files | Submitted hashes recorded, receipts awaited; rerun reuses completed steps |
| Historical chart | Derived browser state | Range errors set chart error without discarding the book; missing/old trades remain absent |

Lifecycle: validate → request signature → submit → await receipt → refresh. Inclusion is not a guarantee against later reorg. A wallet rejection differs from a revert, RPC outage, replacement or timeout. Errors currently surface through a shared formatter; a persistent pending/replaced-transaction recovery service is **not implemented**. A confirmed transaction followed by failed refresh can produce ambiguous UI feedback and remains a known issue.

The seed script retries only rejected gas estimates (up to five attempts, 2-second delay) before submission; nonce managers reset between retries. It does not blindly retry uncertain broadcasts. Checkpoint writes occur after submission, so a process crash between broadcast and saving can still require manual transaction-history reconciliation. Failed saved transactions/leftover locks also require operator inspection. No automatic UI transaction retries are introduced.

## Future architecture — all components below NOT IMPLEMENTED

```mermaid
flowchart LR
  UI[Client] --> API[NOT IMPLEMENTED TypeScript API]
  API --> DB[NOT IMPLEMENTED PostgreSQL read model]
  Indexer[NOT IMPLEMENTED event indexer] --> DB
  L2[NOT IMPLEMENTED L2 contract deployment] --> Indexer
  UI --> L2
  L2 --> L1[Ethereum settlement layer]
```

A proposed indexer would backfill from a saved block, persist canonical block hashes and log identities, roll back orphaned data, and replay idempotently. PostgreSQL would be a rebuildable read model, not the asset custodian. A TypeScript API would provide bounded pagination, account history and candles. Wallet-signed contract writes would remain authoritative. Base Sepolia is a possible validation target, not an enabled chain or existing deployment. Mainnet remains gated on independent review and operational/security acceptance criteria.
