import { createElement as h } from "react";
/** @typedef {{id:string,side:string,price:string,quantity:string,total:string,action:import('react').ReactNode}} OrderRow */
/** Actual production table, also rendered by the isolated server-render benchmark. @param {{rows:OrderRow[]}} props */
export default function OrderTable({ rows }) {
  return h(
    "table",
    null,
    h(
      "thead",
      null,
      h(
        "tr",
        null,
        ...[
          "Order",
          "Side",
          "Price (ETH)",
          "Amount (HAI)",
          "Value (ETH)",
          "Status / action",
        ].map((name) => h("th", { key: name }, name)),
      ),
    ),
    h(
      "tbody",
      null,
      ...rows.map((o) =>
        h(
          "tr",
          { key: o.id },
          h("td", null, `#${o.id}`),
          h(
            "td",
            { className: o.side === "Buy" ? "text-buy" : "text-sell" },
            o.side,
          ),
          h("td", null, o.price),
          h("td", null, o.quantity),
          h("td", null, o.total),
          h("td", null, o.action),
        ),
      ),
    ),
  );
}
