import assert from "node:assert/strict";
import test from "node:test";
import { replaceDocumentBody } from "../src/document-body";

test("preserves frontmatter and H1 while replacing the editable body", () => {
	const source = "---\ntitle: PintOS\ncontext_tree: true\n---\n# PintOS\n\nOld body\n";
	assert.equal(
		replaceDocumentBody(source, "## Expected questions\n\nNew body"),
		"---\ntitle: PintOS\ncontext_tree: true\n---\n# PintOS\n\n## Expected questions\n\nNew body\n",
	);
});

test("keeps a document without frontmatter editable", () => {
	assert.equal(replaceDocumentBody("# Topic\n\nOld\n", "New"), "# Topic\n\nNew\n");
});
