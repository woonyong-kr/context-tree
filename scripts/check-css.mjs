import { readFile } from "node:fs/promises";
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

const tokenNames = [...source.matchAll(/^\s*(--ct-[\w-]+)\s*:/gm)].map((match) => match[1]);
for (const tokenName of new Set(tokenNames)) {
	if (!source.includes("var(" + tokenName)) {
		throw new Error("Unused Linked Canvas design token: " + tokenName);
	}
}
