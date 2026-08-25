import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

const source = await readFile(new URL("../styles.css", import.meta.url), "utf8");
await transform(source, { loader: "css", sourcefile: "styles.css" });
if (source.includes("!important")) throw new Error("styles.css must not use !important.");
if (!source.startsWith("/* linked-graph-design-tokens:start */")) throw new Error("Linked Graph tokens must start the stylesheet.");
if (!source.includes("/* linked-graph-design-tokens:end */")) throw new Error("Linked Graph token block is not closed.");
if (/\.context-tree|\.linked-canvas|--cg-|--ct-/.test(source)) throw new Error("Legacy Canvas or Context Graph selectors remain.");

const required = ["--lg-surface", "--lg-text", "--lg-muted", "--lg-border", "--lg-accent", "--lg-focus", "--lg-row-height"];
for (const token of required) {
	if (!source.includes(`${token}:`)) throw new Error(`Missing Linked Graph token: ${token}`);
}

const tokenBlock = source.slice(0, source.indexOf("/* linked-graph-design-tokens:end */"));
if (/(?:#[\da-f]{3,8}|rgba?\(|hsla?\()/i.test(tokenBlock)) throw new Error("Design tokens must derive colour from the Obsidian theme.");
if (!source.includes(":focus-visible")) throw new Error("Keyboard focus styling is required.");
