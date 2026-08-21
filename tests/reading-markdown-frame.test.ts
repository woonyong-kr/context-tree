import assert from "node:assert/strict";
import test from "node:test";
import { createReadingMarkdownFrame } from "../src/ui/reading-markdown-frame";

type FakeElement = {
	classes: string;
	children: FakeElement[];
	createDiv: (options: { cls: string }) => FakeElement;
};

function element(classes = ""): FakeElement {
	const current: FakeElement = {
		classes,
		children: [],
		createDiv: ({ cls }) => {
			const child = element(cls);
			current.children.push(child);
			return child;
		},
	};
	return current;
}

test("builds the native Obsidian Reading frame around card Markdown", () => {
	const host = element("context-tree-detail");
	const target = createReadingMarkdownFrame(host as unknown as HTMLElement) as unknown as FakeElement;

	assert.equal(host.children[0]?.classes, "markdown-reading-view");
	assert.equal(host.children[0]?.children[0]?.classes, "markdown-preview-view markdown-rendered");
	assert.equal(target.classes, "markdown-preview-sizer markdown-preview-section context-tree-markdown-render-target");
	assert.equal(host.children[0]?.children[0]?.children[0], target);
});
