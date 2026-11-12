process.env.NODE_ENV = "production";
const { renderToStaticMarkup } = await import("react-dom/server");
const { createElement } = await import("react");
const { default: OrderTable } =
  await import("../app/components/OrderTable.mjs");
import { fixtures } from "./fixtures.mjs";
import { save, measure, smoke } from "./common.mjs";
const results = (smoke ? [100] : [100, 1000, 10000]).map((count) => {
  const rows = fixtures(count).rows;
  let bytes = 0;
  const latency = measure(() => {
    bytes = Buffer.byteLength(
      renderToStaticMarkup(createElement(OrderTable, { rows })),
    );
  });
  return { rows: count, htmlBytes: bytes, serverRenderMs: latency };
});
save("frontend", {
  reactMode: "production",
  results,
  limits:
    "Actual production OrderTable component, server-rendered in Node. 1k/10k rows are stress fixtures above the live 100-order cap. This does not measure browser paint, hydration, canvas charts, layout, interaction latency or wallet flows.",
  browserMetrics: {
    status: "blocked",
    reason:
      "Browser automation host unavailable in this environment; no browser performance results claimed.",
    FCP: null,
    LCP: null,
    CLS: null,
    INP: null,
  },
});
