import { Contract, EventLog, formatEther, type AbstractProvider } from "ethers";
import {
  exchangeAddress,
  exchangeAbi,
  deploymentBlock,
  tokenAddress,
} from "./contracts";
import type { TradePoint } from "./candles.mjs";
type FilledOrder = {
  id: bigint;
  tokenGet: string;
  amountGet: bigint;
  amountGive: bigint;
};
/** Bounded demo history. A durable event indexer will replace this scan. */
export async function loadConfirmedTrades(
  provider: AbstractProvider,
  orders: FilledOrder[],
): Promise<TradePoint[]> {
  if (!orders.length) return [];
  const exchange = new Contract(exchangeAddress, exchangeAbi, provider);
  const latest = await provider.getBlockNumber();
  const start = Math.max(deploymentBlock, latest - 49_999);
  const filter = exchange.filters.Trade(orders.map((o) => o.id));
  const events: EventLog[] = [];
  for (let from = start; from <= latest; from += 5000) {
    const logs = await exchange.queryFilter(
      filter,
      from,
      Math.min(from + 4999, latest),
    );
    events.push(
      ...logs.filter((event): event is EventLog => event instanceof EventLog),
    );
  }
  const blocks = new Map(
    await Promise.all(
      [...new Set(events.map((e) => e.blockNumber))].map(
        async (number) => [number, await provider.getBlock(number)] as const,
      ),
    ),
  );
  const byId = new Map(orders.map((o) => [String(o.id), o]));
  return events
    .flatMap((event) => {
      const order = byId.get(String(event.args.id)),
        block = blocks.get(event.blockNumber);
      if (!order || !block) return [];
      const buy = order.tokenGet.toLowerCase() === tokenAddress.toLowerCase();
      const quantity = buy ? order.amountGet : order.amountGive,
        total = buy ? order.amountGive : order.amountGet;
      return [
        {
          id: String(order.id),
          timestamp: block.timestamp,
          price: Number(formatEther((total * 10n ** 18n) / quantity)),
          amount: Number(formatEther(quantity)),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp || (BigInt(a.id) < BigInt(b.id) ? -1 : 1),
    );
}
