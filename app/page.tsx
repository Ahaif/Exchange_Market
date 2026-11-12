"use client";
import OrderTable from "./components/OrderTable.mjs";
import { readLatestOrders } from "../lib/read-model.mjs";
import {
  createTransactionGate,
  assertTransactionSession,
} from "../lib/transaction-session.mjs";
import MarketChart from "./components/MarketChart";
import { loadConfirmedTrades } from "../lib/trades";
import type { TradePoint } from "../lib/candles.mjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserProvider,
  JsonRpcProvider,
  Contract,
  Eip1193Provider,
  ZeroAddress,
  formatEther,
  parseEther,
} from "ethers";
import {
  chainId,
  chainName,
  tokenAddress,
  exchangeAddress,
  configured,
  tokenAbi,
  exchangeAbi,
  publicRpcUrl,
} from "../lib/contracts";

type Injected = Eip1193Provider & {
  on: (event: string, cb: () => void) => void;
  removeListener: (event: string, cb: () => void) => void;
};
declare global {
  interface Window {
    ethereum?: Injected;
  }
}
type Order = {
  id: bigint;
  user: string;
  tokenGet: string;
  amountGet: bigint;
  tokenGive: string;
  amountGive: bigint;
  timestamp: bigint;
  filled: boolean;
  cancelled: boolean;
};
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const display = (n: bigint, digits = 6) =>
  Number(formatEther(n)).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
const message = (e: unknown) => {
  const error = e as { code?: string; shortMessage?: string; message?: string };
  return error.code === "ACTION_REJECTED"
    ? "Transaction declined in your wallet."
    : error.shortMessage ||
        error.message ||
        "Something went wrong. Please try again.";
};

export default function ExchangePage() {
  const [trades, setTrades] = useState<TradePoint[]>([]);
  const [chartError, setChartError] = useState("");
  const tradeCache = useRef(new Map<string, TradePoint>());
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState<BrowserProvider>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [balances, setBalances] = useState([0n, 0n, 0n, 0n]);
  const [fee, setFee] = useState(25);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");
  const [side, setSide] = useState("buy");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [asset, setAsset] = useState("ETH");
  const [fundAmount, setFundAmount] = useState("");
  const [tab, setTab] = useState("open");
  const [updated, setUpdated] = useState("");
  const [marketLoaded, setMarketLoaded] = useState(false);
  const revision = useRef(0);
  const transactionGate = useRef(createTransactionGate());
  const refreshRequest = useRef(0);
  const refresh = useCallback(
    async (p: BrowserProvider | JsonRpcProvider, a = "") => {
      const version = revision.current;
      const request = ++refreshRequest.current;
      const network = await p.getNetwork();
      if (Number(network.chainId) !== chainId)
        throw new Error(`Switch your wallet to ${chainName}.`);
      const exchange = new Contract(exchangeAddress, exchangeAbi, p);
      const token = new Contract(tokenAddress, tokenAbi, p);
      if ((await exchange.token()).toLowerCase() !== tokenAddress.toLowerCase())
        throw new Error(
          "Contract configuration does not match the deployed market.",
        );
      const [eth, hai, depositedEth, depositedHai, count, bps] =
        await Promise.all([
          a ? p.getBalance(a) : 0n,
          a ? token.balanceOf(a) : 0n,
          a ? exchange.balanceOf(ZeroAddress, a) : 0n,
          a ? exchange.balanceOf(tokenAddress, a) : 0n,
          exchange.orderCount(),
          exchange.feeBps(),
        ]);
      // Bounded reads keep a public RPC responsive. The demo shows the latest 100 orders.
      const rows: Order[] = await readLatestOrders(async (id) => {
        const [o, filled, cancelled] = await Promise.all([
          exchange.orders(id),
          exchange.orderFilled(id),
          exchange.orderCancelled(id),
        ]);
        return {
          id: o.id,
          user: o.user,
          tokenGet: o.tokenGet,
          amountGet: o.amountGet,
          tokenGive: o.tokenGive,
          amountGive: o.amountGive,
          timestamp: o.timestamp,
          filled,
          cancelled,
        };
      }, Number(count));
      if (version !== revision.current || request !== refreshRequest.current)
        return;
      setBalances([eth, hai, depositedEth, depositedHai]);
      setFee(Number(bps));
      setOrders(rows);
      setMarketLoaded(true);
      setUpdated(new Date().toLocaleTimeString());
      const filled = rows.filter((o) => o.filled);
      try {
        const missing = filled.filter(
          (o) => !tradeCache.current.has(String(o.id)),
        );
        const loaded = await loadConfirmedTrades(p, missing);
        if (version !== revision.current || request !== refreshRequest.current)
          return;
        loaded.forEach((t) => tradeCache.current.set(t.id, t));
        setTrades(
          filled
            .flatMap((o) =>
              tradeCache.current.get(String(o.id))
                ? [tradeCache.current.get(String(o.id))!]
                : [],
            )
            .sort(
              (a, b) =>
                a.timestamp - b.timestamp ||
                (BigInt(a.id) < BigInt(b.id) ? -1 : 1),
            ),
        );
        setChartError("");
      } catch {
        if (version === revision.current && request === refreshRequest.current)
          setChartError(
            "Trade history is temporarily unavailable. The order book remains live.",
          );
      }
    },
    [],
  );
  useEffect(() => {
    const reset = () => {
      revision.current++;
      setAccount("");
      setProvider(undefined);
      setOrders([]);
      setBalances([0n, 0n, 0n, 0n]);
      setNotice("Wallet changed. Connect again to refresh this market.");
    };
    const wallet = window.ethereum;
    wallet?.on("accountsChanged", reset);
    wallet?.on("chainChanged", reset);
    return () => {
      wallet?.removeListener("accountsChanged", reset);
      wallet?.removeListener("chainChanged", reset);
    };
  }, []);
  useEffect(() => {
    if (!configured) return;
    const readProvider =
      provider ||
      new JsonRpcProvider(publicRpcUrl, undefined, { cacheTimeout: 0 });
    let stopped = false,
      inFlight = false;
    const update = async () => {
      if (inFlight || stopped) return;
      inFlight = true;
      try {
        await refresh(readProvider, account);
      } catch (e) {
        if (!stopped) setError(message(e));
      } finally {
        inFlight = false;
      }
    };
    update();
    const timer = setInterval(update, 15000);
    return () => {
      stopped = true;
      refreshRequest.current++;
      clearInterval(timer);
      if (!provider) readProvider.destroy();
    };
  }, [provider, account, refresh]);
  async function connect() {
    setError("");
    setBusy("Connecting wallet");
    try {
      if (!window.ethereum)
        throw new Error(
          "Install an Ethereum wallet such as MetaMask to connect.",
        );
      if (!configured)
        throw new Error(
          "This preview is awaiting its testnet contract deployment.",
        );
      const p = new BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      if (Number((await p.getNetwork()).chainId) !== chainId) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      }
      const active = new BrowserProvider(window.ethereum);
      const a = await (await active.getSigner()).getAddress();
      await refresh(active, a);
      setAccount(a);
      setProvider(active);
      setNotice("Wallet connected. Use testnet assets only.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  async function transact(
    label: string,
    action: (exchange: Contract, token: Contract) => Promise<void>,
  ) {
    if (!provider || !account || !transactionGate.current.enter()) return;
    const version = revision.current;
    setBusy(label);
    setError("");
    setNotice("");
    setHash("");
    try {
      if (Number((await provider.getNetwork()).chainId) !== chainId)
        throw new Error(`Switch to ${chainName}.`);
      const signer = await provider.getSigner();
      if ((await signer.getAddress()).toLowerCase() !== account.toLowerCase())
        throw new Error("Wallet changed. Reconnect first.");
      await action(
        new Contract(exchangeAddress, exchangeAbi, signer),
        new Contract(tokenAddress, tokenAbi, signer),
      );
      if (version !== revision.current) return;
      setNotice(`${label} confirmed.`);
      await refresh(provider, account);
    } catch (e) {
      setError(message(e));
    } finally {
      transactionGate.current.release();
      setBusy("");
    }
  }
  async function confirm(tx: { hash: string; wait: () => Promise<unknown> }) {
    setHash(tx.hash);
    setBusy("Waiting for confirmation");
    await tx.wait();
  }
  function positive(input: string) {
    const n = parseEther(input);
    if (n <= 0n) throw new Error("Enter an amount greater than zero.");
    return n;
  }
  function funds(withdraw: boolean) {
    const session = { revision: revision.current, chainId, account };
    return transact(withdraw ? "Withdrawal" : "Deposit", async (e, t) => {
      const n = positive(fundAmount);
      if (asset === "ETH")
        await confirm(
          withdraw
            ? await e.withdrawEther(n)
            : await e.depositEther({ value: n }),
        );
      else {
        if (!withdraw && (await t.allowance(account, exchangeAddress)) < n) {
          setBusy("Approve HAI in your wallet");
          await confirm(await t.approve(exchangeAddress, n));
          setBusy("Confirm HAI deposit in your wallet");
        }
        if (!provider) throw new Error("Wallet disconnected");
        const liveSigner = await provider.getSigner();
        assertTransactionSession(session, {
          revision: revision.current,
          chainId: Number((await provider.getNetwork()).chainId),
          account: await liveSigner.getAddress(),
        });
        await confirm(
          withdraw ? await e.withdrawToken(n) : await e.depositToken(n),
        );
      }
      setFundAmount("");
    });
  }
  function createOrder() {
    return transact("Order", async (e) => {
      const quantity = positive(amount),
        unitPrice = positive(price);
      const total = (quantity * unitPrice) / 10n ** 18n;
      if (total === 0n) throw new Error("Order value is below one wei.");
      await confirm(
        await e.makeOrder(
          side === "buy" ? tokenAddress : ZeroAddress,
          side === "buy" ? quantity : total,
          side === "buy" ? ZeroAddress : tokenAddress,
          side === "buy" ? total : quantity,
        ),
      );
      setAmount("");
      setPrice("");
    });
  }
  const open = orders.filter((o) => !o.filled && !o.cancelled);
  const isBuy = (o: Order) =>
    o.tokenGet.toLowerCase() === tokenAddress.toLowerCase();
  const quantity = (o: Order) => (isBuy(o) ? o.amountGet : o.amountGive);
  const total = (o: Order) => (isBuy(o) ? o.amountGive : o.amountGet);
  const rate = (o: Order) => (total(o) * 10n ** 18n) / quantity(o);
  const bids = open
    .filter(isBuy)
    .sort((a, b) => (rate(a) > rate(b) ? -1 : rate(a) < rate(b) ? 1 : 0));
  const asks = open
    .filter((o) => !isBuy(o))
    .sort((a, b) => (rate(a) < rate(b) ? -1 : rate(a) > rate(b) ? 1 : 0));
  const last = trades.at(-1),
    first = trades[0];
  const change =
    last && first ? ((last.price - first.price) / first.price) * 100 : 0;
  const sampleVolume = trades.reduce((n, t) => n + t.amount, 0);
  const spread =
    bids[0] && asks[0]
      ? Number(formatEther(rate(asks[0]) - rate(bids[0])))
      : null;
  const rows =
    tab === "mine"
      ? orders.filter((o) => o.user.toLowerCase() === account.toLowerCase())
      : tab === "trades"
        ? orders.filter((o) => o.filled)
        : open;
  const active = Boolean(account) && !busy;
  const orderAction = (o: Order) => {
    const mine = o.user.toLowerCase() === account.toLowerCase();
    return o.filled ? (
      <span className="state-badge">Filled</span>
    ) : o.cancelled ? (
      <span className="state-badge cancelled">Cancelled</span>
    ) : (
      <button
        className="text-button"
        disabled={!active}
        onClick={() =>
          transact(mine ? "Cancellation" : "Trade", async (e) => {
            await confirm(
              mine ? await e.cancelOrder(o.id) : await e.fillOrder(o.id),
            );
          })
        }
      >
        {mine ? "Cancel" : "Fill"} ↗
      </button>
    );
  };
  const bookRows = (list: Order[], side: "bid" | "ask") => {
    let cumulative = 0;
    const sum = list.reduce((n, o) => n + Number(formatEther(quantity(o))), 0);
    const result = list.slice(0, 10).map((o) => {
      cumulative += Number(formatEther(quantity(o)));
      return (
        <div className={`depth-row ${side}`} key={String(o.id)}>
          <span
            className="depth-fill"
            style={{ width: `${sum ? (cumulative / sum) * 100 : 0}%` }}
          />
          <button
            className="quote-price"
            title="Use this limit price"
            onClick={() => {
              setPrice(formatEther(rate(o)));
              setSide(side === "ask" ? "buy" : "sell");
            }}
          >
            {display(rate(o), 9)}
          </button>
          <span>{display(quantity(o))}</span>
          <span>
            {cumulative.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      );
    });
    return side === "ask" ? result.reverse() : result;
  };
  return (
    <main>
      <header>
        <a className="brand" href="/">
          <span className="brand-icon">H</span> HAI
          <span className="brand-light">EXCHANGE</span>
        </a>
        <nav>
          <a className="nav-active" href="#workspace">
            Spot
          </a>
          <a href="#activity">Activity</a>
          <a href="#about">About</a>
        </nav>
        <div className="header-actions">
          <span className="network">
            <i />
            {chainName} <b>TESTNET</b>
          </span>
          <button className="connect" disabled={!!busy} onClick={connect}>
            {busy === "Connecting wallet"
              ? "Connecting…"
              : account
                ? short(account)
                : "Connect wallet"}{" "}
            <span>↗</span>
          </button>
        </div>
      </header>
      <div className="terminal-label">
        <span>
          <i /> ON-CHAIN TRADING TERMINAL
        </span>
        <span>Test assets. Real settlement.</span>
      </div>
      <section className="market-bar" id="market">
        <div className="pair">
          <span className="coin">H</span>
          <div>
            <h1>
              HAI <span>/ ETH</span>
            </h1>
            <small>
              Abdel Token <span className="tag">SPOT</span>
            </small>
          </div>
        </div>
        <div className="last-price">
          <small>Last trade · ETH</small>
          <strong>{last ? last.price.toFixed(9) : "—"}</strong>
        </div>
        <div>
          <small>Loaded sample change</small>
          <strong className={change >= 0 ? "text-buy" : "text-sell"}>
            {trades.length > 1
              ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`
              : "—"}
          </strong>
        </div>
        <div>
          <small>Loaded volume · HAI</small>
          <strong>{marketLoaded ? sampleVolume.toLocaleString() : "—"}</strong>
        </div>
        <div>
          <small>Open orders</small>
          <strong>{marketLoaded ? open.length : "—"}</strong>
        </div>
        <div>
          <small>Taker fee</small>
          <strong>{fee / 100}%</strong>
        </div>
        <div className="market-status">
          <i />
          {updated ? `Updated ${updated}` : "Connecting to chain…"}
        </div>
      </section>
      <div className="demo-strip">
        <span className="tag">DEMO</span>
        <span>
          Ethereum Sepolia · Includes seeded trades · Market data is a bounded
          sample, not a global price feed.
        </span>
        <a
          href={`https://sepolia.etherscan.io/address/${exchangeAddress}`}
          target="_blank"
          rel="noreferrer"
        >
          View contract ↗
        </a>
      </div>
      {!configured && (
        <div className="banner">
          Configure valid contracts to enable this market.
        </div>
      )}
      <div aria-live="polite" className="feedback">
        {busy && <p className="info">◌ {busy}…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="info">{notice}</p>}
        {chartError && <p className="error">{chartError}</p>}
        {hash && (
          <p>
            Transaction:{" "}
            {chainId === 11155111 ? (
              <a
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
              >
                {short(hash)} ↗
              </a>
            ) : (
              <code>{short(hash)}</code>
            )}
          </p>
        )}
      </div>
      <section className="workspace" id="workspace">
        <MarketChart trades={trades} loading={!marketLoaded} />
        <section className="panel depth-panel">
          <div className="panel-heading">
            <h2>Order book</h2>
            <span className="subtle">ETH</span>
          </div>
          <div className="book-labels">
            <span>Price (ETH)</span>
            <span>Amount (HAI)</span>
            <span>Total (HAI)</span>
          </div>
          <div className="asks">{bookRows(asks, "ask")}</div>
          <div className="spread">
            <strong className="text-buy">
              {last ? last.price.toFixed(9) : "—"} <span>ETH</span>
            </strong>
            <small>Spread {spread === null ? "—" : spread.toFixed(9)}</small>
          </div>
          <div className="bids">{bookRows(bids, "bid")}</div>
          {marketLoaded && !open.length && (
            <div className="empty">
              <p>No open orders yet.</p>
            </div>
          )}
          <div className="book-footer">
            <i /> Click a price to populate your order
          </div>
        </section>
        <section className="panel order-panel">
          <div className="panel-heading">
            <h2>Place order</h2>
            <span className="tag">LIMIT</span>
          </div>
          <div className="segmented">
            <button
              aria-pressed={side === "buy"}
              className={side === "buy" ? "selected buy" : ""}
              onClick={() => setSide("buy")}
            >
              Buy HAI
            </button>
            <button
              aria-pressed={side === "sell"}
              className={side === "sell" ? "selected sell" : ""}
              onClick={() => setSide("sell")}
            >
              Sell HAI
            </button>
          </div>
          <div className="available">
            <span>Available</span>
            <strong>
              {account
                ? `${display(balances[side === "buy" ? 2 : 3])} ${side === "buy" ? "ETH" : "HAI"}`
                : "Connect wallet"}
            </strong>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createOrder();
            }}
          >
            <label htmlFor="price">Limit price</label>
            <div className="input-wrap">
              <input
                id="price"
                inputMode="decimal"
                placeholder="0.000000000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
              <span>ETH</span>
            </div>
            <label htmlFor="amount">Amount</label>
            <div className="input-wrap">
              <input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <span>HAI</span>
            </div>
            <div className="order-estimate">
              <span>Estimated order value</span>
              <b>
                {Number(amount) > 0 &&
                Number(price) > 0 &&
                Number.isFinite(Number(amount) * Number(price))
                  ? (Number(amount) * Number(price)).toFixed(9)
                  : "0.000000000"}{" "}
                ETH
              </b>
            </div>
            <p className="form-note">
              Full fills only. Orders do not reserve funds. Takers pay{" "}
              {fee / 100}% in the asset they send.
            </p>
            {account ? (
              <button
                className={`primary ${side === "sell" ? "sell-primary" : ""}`}
                disabled={!active}
              >
                {side === "buy" ? "Buy" : "Sell"} HAI <span>↗</span>
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={!!busy}
                onClick={connect}
              >
                Connect wallet <span>↗</span>
              </button>
            )}
          </form>
          <div className="trade-security">
            <span>◇ Wallet-signed transactions</span>
            <span>◉ Settled by smart contracts</span>
          </div>
        </section>
        <section className="panel activity-panel" id="activity">
          <div className="tabs">
            {[
              ["open", "Open orders"],
              ["trades", "Filled orders"],
              ["mine", "My orders"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={tab === key}
                className={tab === key ? "tab-active" : ""}
                onClick={() => setTab(key)}
              >
                {label}{" "}
                <span>
                  {key === "open"
                    ? open.length
                    : key === "trades"
                      ? orders.filter((o) => o.filled).length
                      : orders.filter(
                          (o) => o.user.toLowerCase() === account.toLowerCase(),
                        ).length}
                </span>
              </button>
            ))}
          </div>
          <div className="table-scroll">
            <OrderTable
              rows={rows.map((o) => ({
                id: String(o.id),
                side: isBuy(o) ? "Buy" : "Sell",
                price: display(rate(o), 9),
                quantity: display(quantity(o)),
                total: display(total(o), 9),
                action: orderAction(o),
              }))}
            />
          </div>
          {!rows.length && (
            <div className="empty">
              <span>≋</span>
              <h3>
                {tab === "mine" && !account
                  ? "Connect to view your orders"
                  : marketLoaded
                    ? "No orders in this view"
                    : "Loading on-chain orders…"}
              </h3>
              <p>Confirmed activity from the HAI / ETH exchange.</p>
            </div>
          )}
          <div className="book-footer">
            <i /> Latest 100 orders · Chart: fills from the last 50,000 blocks
          </div>
        </section>
        <section className="panel balance-panel">
          <div className="panel-heading">
            <h2>Assets</h2>
            <span className="subtle">Wallet / Exchange</span>
          </div>
          <div className="balance-labels">
            <span>Asset</span>
            <span>Wallet</span>
            <span>Exchange</span>
          </div>
          {["ETH", "HAI"].map((a, i) => (
            <div className="balance-row" key={a}>
              <strong>
                <span className={`mini-coin ${a === "ETH" ? "eth" : ""}`}>
                  {a === "ETH" ? "◆" : "H"}
                </span>
                {a}
              </strong>
              <span>{account ? display(balances[i]) : "—"}</span>
              <span>{account ? display(balances[i + 2]) : "—"}</span>
            </div>
          ))}
          <div className="funds">
            <div className="fund-fields">
              <div>
                <label htmlFor="asset">Asset</label>
                <select
                  id="asset"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                >
                  <option>ETH</option>
                  <option>HAI</option>
                </select>
              </div>
              <div>
                <label htmlFor="fund-amount">Amount</label>
                <input
                  id="fund-amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="fund-buttons">
              <button
                disabled={!active || !fundAmount}
                onClick={() => funds(false)}
              >
                Deposit ↓
              </button>
              <button
                disabled={!active || !fundAmount}
                onClick={() => funds(true)}
              >
                Withdraw ↑
              </button>
            </div>
            <p className="form-note">
              Keep some wallet ETH for network fees. HAI deposits require
              approval first.
            </p>
          </div>
        </section>
      </section>
      <section className="about" id="about">
        <div>
          <span className="eyebrow">TRANSPARENCY BY DESIGN</span>
          <h2>Your keys. On-chain settlement.</h2>
          <p>
            HAI Exchange is a learning project on Ethereum Sepolia. Orders and
            trades include seeded demo activity. Test assets have no monetary
            value. Contracts hold deposited assets; your wallet signs every
            transaction. This demo has not been independently audited.
          </p>
        </div>
        <div className="contract-links">
          <a
            href={`https://sepolia.etherscan.io/address/${tokenAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            Token contract ↗
          </a>
          <a
            href={`https://sepolia.etherscan.io/address/${exchangeAddress}`}
            target="_blank"
            rel="noreferrer"
          >
            Exchange contract ↗
          </a>
          <a
            href="https://github.com/Ahaif/Exchange_Market"
            target="_blank"
            rel="noreferrer"
          >
            Source code ↗
          </a>
        </div>
      </section>
      <footer>
        <span>
          <i /> {marketLoaded ? "Market connected" : "Loading market"} ·{" "}
          {chainName}
        </span>
        <span>HAI EXCHANGE / V1.0</span>
        <span>Built to learn. Built in the open.</span>
      </footer>
    </main>
  );
}
