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
		"> [!note] 중요한 전제",
		"> callout 본문",
		"",
		"- 첫 번째 항목",
		"- [ ] 확인할 작업",
		"- [[연결 노트#제목|별칭]]",
		"",
		"![[첨부 이미지.png]]",
		"",
		"인라인 수식 $a^2 + b^2 = c^2$와 ==강조==, ~~취소선~~.",
		"",
		"```ts",
		"const answer = true;",
		"```",
		"",
		"| 열 A | 열 B |",
		"| --- | --- |",
		"| 값 A | 값 B |",
		"",
		"각주[^1]와 <mark>HTML</mark>.",
		"",
		"[^1]: 각주 본문",
	].join("\n");
	const display = topicDisplayContent(
		`---\ncontext_tree: true\n---\n# 제목\n\n${body}`,
		{ title: "기존 제목", summary: "" },
	);

	assert.equal(display.body, body);
});

test("does not extract or remove a summary-like callout inside fenced code", () => {
	const source = [
		"# Parser example",
		"",
		"```md",
		"> [!summary] not card metadata",
		"> keep this literal",
		"```",
		"",
		"Body",
	].join("\n");

	const display = topicDisplayContent(source, { title: "fallback", summary: "" });
	assert.equal(display.summary, "Body");
	assert.match(display.body, /> \[!summary\] not card metadata/);
});

test("does not close a four-backtick fence with a shorter marker", () => {
	const source = [
		"# Fence example",
		"",
		"````md",
		"```",
		"````ts",
		"> [!summary] still code",
		"> keep this literal",
		"````",
		"",
		"Visible body",
	].join("\n");

	const display = topicDisplayContent(source, { title: "fallback", summary: "" });
	assert.equal(display.summary, "Visible body");
	assert.match(display.body, /> \[!summary\] still code/);
});

test("keeps generated Wiki structure out of compact card summaries", () => {
	const source = [
		"# 책",
		"",
		"<!-- 탐색은 직접 하위 키워드 링크를 사용한다. -->",
		"",
		"## 하위 키워드",
		"",
		"- [[AI·머신러닝]]",
	].join("\n");

	const display = topicDisplayContent(source, { title: "fallback", summary: "" });
	assert.equal(display.summary, "");
	assert.match(display.body, /하위 키워드/);
	assert.match(display.body, /AI·머신러닝/);
});
