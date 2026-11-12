import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
const files = [
  "README.md",
  ...readdirSync("docs")
    .filter((n) => n.endsWith(".md"))
    .map((n) => `docs/${n}`),
];
let diagrams = 0;
for (const path of files) {
  const text = readFileSync(path, "utf8");
  const fences = text.match(/^```/gm) || [];
  if (fences.length % 2) throw new Error(`Unclosed fence: ${path}`);
  for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const file = target.split("#")[0];
    if (file && !existsSync(resolve(dirname(path), file)))
      throw new Error(`Broken local link in ${path}: ${target}`);
  }
  for (const [, body] of text.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    diagrams++;
    if (!/^(flowchart (LR|TB)|sequenceDiagram)\n/.test(body))
      throw new Error(`Unexpected Mermaid header: ${path}`);
    if ((body.match(/\[/g) || []).length !== (body.match(/\]/g) || []).length)
      throw new Error(`Unbalanced diagram nodes: ${path}`);
  }
}
console.log(
  `Checked ${files.length} Markdown files and ${diagrams} Mermaid blocks. Structural checks only; not a full Mermaid parser/renderer.`,
);
