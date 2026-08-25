import assert from "node:assert/strict";
import test from "node:test";
import { countLinks, graphMatches, parseDocumentLinks } from "../src/model";

const known = new Map([
	["개념", "Wiki/개념.md"],
	["책/LLM", "Wiki/책/LLM.md"],
	["책/딥러닝", "Wiki/책/딥러닝.md"],
	["프로젝트", "Wiki/프로젝트.md"],
]);
const resolve = (link: string): string | null => known.get(link) ?? null;

test("keeps authored link order and two-level bullet grouping", () => {
	const graph = parseDocumentLinks(`---\ntype: index\n---\n- [[개념]]\n- AI·머신러닝\n  - [[책/LLM|밑바닥부터 만드는 LLM]]\n  - [[책/딥러닝]]\n- [[프로젝트]]`, "Wiki.md", "Wiki", resolve);

	assert.equal(graph.linkCount, 4);
	assert.deepEqual(graph.entries.map((entry) => entry.label), ["개념", "AI·머신러닝", "프로젝트"]);
	const books = graph.entries[1];
	assert.equal(books?.kind, "group");
	if (books?.kind !== "group") return;
	assert.deepEqual(books.children.map((entry) => entry.label), ["밑바닥부터 만드는 LLM", "딥러닝"]);
});

test("ignores embeds, code, comments, unresolved targets, and duplicate routes", () => {
	const graph = parseDocumentLinks(`![[개념]]\n\`\`\`md\n[[프로젝트]]\n\`\`\`\n<!-- [[프로젝트]] -->\n- [[없는 문서]]\n- [[개념]]\n- [[개념|중복 별칭]]`, "Wiki.md", "Wiki", resolve);
	assert.deepEqual(graph.entries.map((entry) => entry.label), ["개념"]);
});

test("preserves subpaths as distinct navigation destinations", () => {
	const graph = parseDocumentLinks("- [[개념#AI]]\n- [[개념#학습]]", "Wiki.md", "Wiki", resolve);
	assert.equal(graph.linkCount, 2);
	assert.deepEqual(graph.entries.map((entry) => entry.key), ["Wiki/개념.md#AI", "Wiki/개념.md#학습"]);
});

test("prunes empty labels and searches through descendants", () => {
	const graph = parseDocumentLinks("- 빈 그룹\n- 책\n  - [[책/LLM]]\n  - [[책/딥러닝]]", "Wiki.md", "Wiki", resolve);
	assert.equal(countLinks(graph.entries), 2);
	assert.deepEqual(graph.entries.map((entry) => entry.label), ["책"]);
	assert.equal(graphMatches(graph.entries[0]!, "딥러닝"), true);
	assert.equal(graphMatches(graph.entries[0]!, "프로젝트"), false);
});
