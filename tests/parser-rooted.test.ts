import assert from "node:assert/strict";
import test from "node:test";
import type { App } from "obsidian";
import { createCurrentNoteGraph, createGraphWorkspace } from "../src/domain/graph-workspace";
import { loadContextTree } from "../src/parser";

type FakeNote = { path: string; content: string; frontmatter?: Record<string, unknown> };

function fakeApp(
	notes: FakeNote[],
	resolvedLinks: Record<string, Record<string, number>>,
	onEnumerateMarkdown?: () => void,
): App {
	const files = notes.map((note) => ({ path: note.path, basename: note.path.split("/").pop()!.replace(/\.md$/, ""), extension: "md" }));
	return {
		vault: {
			getMarkdownFiles: () => {
				onEnumerateMarkdown?.();
				return files;
			},
			getAbstractFileByPath: (path: string) => files.find((file) => file.path === path) ?? null,
			cachedRead: (file: { path: string }) => Promise.resolve(notes.find((note) => note.path === file.path)!.content),
		},
		metadataCache: {
			resolvedLinks,
			getFileCache: (file: { path: string }) => ({ frontmatter: notes.find((note) => note.path === file.path)?.frontmatter }),
			getFirstLinkpathDest: (link: string) => files.find((file) => file.path === link || file.basename === link),
		},
	} as unknown as App;
}

test("does not enumerate the Vault for an ordinary current-note graph", async () => {
	let enumerations = 0;
	const app = fakeApp([
		{ path: "Root.md", content: "# Root\n\n[[Outgoing]]" },
		{ path: "Outgoing.md", content: "# Outgoing" },
	], { "Root.md": { "Outgoing.md": 1 } }, () => {
		enumerations += 1;
	});

	await loadContextTree(app, createCurrentNoteGraph("Root.md", "Root"));
	assert.equal(enumerations, 0);
});

test("loads an ordinary current note with outgoing and incoming one-hop Markdown links", async () => {
	const app = fakeApp([
		{ path: "Root.md", content: "# Root\n\n[[Outgoing]]" },
		{ path: "Outgoing.md", content: "# Outgoing" },
		{ path: "Incoming.md", content: "# Incoming\n\n[[Root]]" },
		{ path: "Unrelated.md", content: "# Unrelated" },
	], {
		"Root.md": { "Outgoing.md": 1 },
		"Incoming.md": { "Root.md": 1 },
	});

	const roots = await loadContextTree(app, createCurrentNoteGraph("Root.md", "Root"));
	assert.deepEqual(roots.map((node) => node.path), ["Root.md", "Incoming.md", "Outgoing.md"]);
	assert.deepEqual(roots[0]?.referencePaths, ["Outgoing.md"]);
});

test("keeps the current note first even when legacy parent metadata nests it", async () => {
	const app = fakeApp([
		{ path: "Root.md", content: "# Root", frontmatter: { context_tree_parent: "[[Parent]]" } },
		{ path: "Parent.md", content: "# Parent" },
	], { "Root.md": { "Parent.md": 1 } });

	const roots = await loadContextTree(app, createCurrentNoteGraph("Root.md", "Root"));
	assert.deepEqual(roots.map((node) => node.path), ["Root.md", "Parent.md"]);
	assert.equal(roots[0]?.parentPath, "Parent.md");
});

test("does not silently coerce an unknown typed relation to related", async () => {
	const app = fakeApp([
		{ path: "A.md", content: "# A", frontmatter: { context_tree: true, context_tree_links: [{ target: "[[B]]", type: "unknown" }] } },
		{ path: "B.md", content: "# B", frontmatter: { context_tree: true } },
	], {});
	const graph = createGraphWorkspace("Legacy", [], { kind: "all" });

	const roots = await loadContextTree(app, graph);
	assert.deepEqual(roots.find((node) => node.path === "A.md")?.links, []);
});

test("uses a unique authored graph id across note renames but disambiguates duplicates", async () => {
	const app = fakeApp([
		{ path: "A.md", content: "# A", frontmatter: { context_tree: true, context_tree_id: "stable-a" } },
		{ path: "B.md", content: "# B", frontmatter: { context_tree: true, context_tree_id: "duplicate" } },
		{ path: "C.md", content: "# C", frontmatter: { context_tree: true, context_tree_id: "duplicate" } },
	], {});

	const roots = await loadContextTree(app, createGraphWorkspace("Legacy", [], { kind: "all" }));
	assert.equal(roots.find((node) => node.path === "A.md")?.id, "context:stable-a");
	assert.equal(roots.find((node) => node.path === "B.md")?.id, "B.md::duplicate");
	assert.equal(roots.find((node) => node.path === "C.md")?.id, "C.md::duplicate");
});

test("checks authored id uniqueness across the vault before a neighbour is expanded", async () => {
	let enumerations = 0;
	const app = fakeApp([
		{ path: "Root.md", content: "# Root", frontmatter: { context_tree_id: "duplicate" } },
		{ path: "Outside.md", content: "# Outside", frontmatter: { context_tree_id: "duplicate" } },
	], {}, () => {
		enumerations += 1;
	});

	const roots = await loadContextTree(app, createCurrentNoteGraph("Root.md", "Root"));
	assert.equal(roots[0]?.id, "Root.md::duplicate");
	assert.equal(enumerations, 1);
});
