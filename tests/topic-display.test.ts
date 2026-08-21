import assert from "node:assert/strict";
import test from "node:test";
import { topicDisplayContent } from "../src/parser";

test("updates a card's rendered Markdown without changing its graph identity", () => {
	const display = topicDisplayContent(
		"---\ncontext_tree: true\n---\n# 바뀐 제목\n\n> [!summary] 카드 요약\n> 바뀐 요약\n\n본문",
		{ title: "기존 제목", summary: "기존 요약" },
	);

	assert.deepEqual(display, { title: "바뀐 제목", summary: "바뀐 요약", body: "본문" });
});

test("preserves authored Markdown structures for the Reading projection", () => {
	const body = [
		"## 질문",
		"",
		"> 중요한 전제",
		"",
		"- 첫 번째 항목",
		"- [[연결 노트]]",
		"",
		"```ts",
		"const answer = true;",
		"```",
	].join("\n");
	const display = topicDisplayContent(
		`---\ncontext_tree: true\n---\n# 제목\n\n${body}`,
		{ title: "기존 제목", summary: "" },
	);

	assert.equal(display.body, body);
});
