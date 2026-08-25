import { readdir, readFile } from "node:fs/promises";
import { transform } from "esbuild";

const source = await readFile(new URL("../styles.css", import.meta.url), "utf8");
await transform(source, { loader: "css", sourcefile: "styles.css" });
if (source.includes("!important")) {
	throw new Error("styles.css must isolate components with scoped selectors instead of !important overrides.");
}

const tokenStart = "/* linked-canvas-design-tokens:start */";
const tokenEnd = "/* linked-canvas-design-tokens:end */";
const tokenStartIndex = source.indexOf(tokenStart);
const tokenEndIndex = source.indexOf(tokenEnd);
if (tokenStartIndex !== 0 || tokenEndIndex <= tokenStartIndex) {
	throw new Error("styles.css must keep one design-token layer at the start of the file.");
}

const tokenSource = source.slice(tokenStartIndex, tokenEndIndex + tokenEnd.length);
if (tokenSource.includes("--ct-") || source.includes("var(--ct-")) {
	throw new Error("Legacy --ct-* tokens are not allowed; use the static --cg-* contract.");
}

const semanticContract = [
	"--cg-surface-canvas",
	"--cg-surface-card",
	"--cg-surface-document",
	"--cg-surface-control",
	"--cg-text-primary",
	"--cg-text-secondary",
	"--cg-separator",
	"--cg-accent",
	"--cg-focus-ring",
	"--cg-font-interface",
	"--cg-font-text",
	"--cg-font-monospace",
	"--cg-space-1",
	"--cg-radius-card",
	"--cg-shadow-card",
	"--cg-motion-standard",
];
for (const token of semanticContract) {
	if (!tokenSource.includes(`${token}:`)) throw new Error(`Missing shared semantic token: ${token}`);
}

const sharedBlock = tokenSource.match(/:where\(\.context-tree-view, \.linked-canvas-help-modal\)\s*\{([\s\S]*?)\n\}/)?.[1];
if (!sharedBlock) throw new Error("Missing shared Linked Canvas semantic token block.");
for (const graphOnlyPrefix of ["--cg-role-", "--cg-edge", "--cg-grid", "--cg-card-width", "--cg-layer-"]) {
	if (sharedBlock.includes(graphOnlyPrefix)) {
		throw new Error(`Graph-only token leaked into the shared semantic contract: ${graphOnlyPrefix}`);
	}
}

for (const line of sharedBlock.split("\n")) {
	const declaration = line.match(/^\s*(--cg-[\w-]+):\s*(.+);\s*$/);
	if (declaration && !declaration[2].startsWith("var(")) {
		throw new Error(`Shared semantic alias must resolve from an Obsidian host variable: ${declaration[1]}`);
	}
}

const rawTokenColours = /(?:#[\da-f]{3,8}|rgba?\(|hsla?\()/i;
for (const [index, line] of tokenSource.split("\n").entries()) {
	if (rawTokenColours.test(line)) {
		throw new Error(`styles.css token raw colour at line ${index + 1}: ${line.trim()}`);
	}
}

const componentSource = source.slice(tokenEndIndex + tokenEnd.length);
const componentLines = componentSource.split("\n");
const forbiddenComponentValues = [
	[/(?:#[\da-f]{3,8}|rgba?\(|hsla?\()/i, "raw colour"],
	[/color-mix\(/, "component colour mix"],
	[/\b-?\d+(?:\.\d+)?(?:px|rem|em|vh|vw|ms|s)\b/, "raw length or duration"],
	[/\b(?:font-weight|line-height|letter-spacing):\s*-?\d/, "raw typography value"],
];

for (const [index, line] of componentLines.entries()) {
	// CSS custom properties cannot parameterise a media-query condition. This
	// single compile-time breakpoint is documented in docs/design-system.md.
	if (line.trimStart().startsWith("@media")) continue;
	for (const [pattern, label] of forbiddenComponentValues) {
		if (pattern.test(line)) {
			throw new Error("styles.css component " + label + " at line " + (index + 1) + ": " + line.trim());
		}
	}
}

const tokenNames = [...source.matchAll(/^\s*(--cg-[\w-]+)\s*:/gm)].map((match) => match[1]);
for (const tokenName of new Set(tokenNames)) {
	if (!source.includes("var(" + tokenName)) {
		throw new Error("Unused Linked Canvas design token: " + tokenName);
	}
}

const sourceFiles = await readdir(new URL("../src/", import.meta.url), { recursive: true });
for (const relativePath of sourceFiles.filter((path) => path.endsWith(".ts"))) {
	const sourceFile = await readFile(new URL(`../src/${relativePath}`, import.meta.url), "utf8");
	for (const match of sourceFile.matchAll(/\.style\.setProperty\(\s*["'](--cg-[\w-]+)["']/g)) {
		if (!source.includes(`var(${match[1]}`)) {
			throw new Error(`Runtime CSS property is not consumed by styles.css: ${match[1]} (${relativePath})`);
		}
	}
}
