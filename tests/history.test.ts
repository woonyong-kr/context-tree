import assert from "node:assert/strict";
import test from "node:test";
import { SessionNavigationHistory } from "../src/history";

test("keeps back and forward navigation inside the current session", () => {
	const history = new SessionNavigationHistory();
	history.record("Start.md");
	history.record("Learn.md");
	history.record("Practice.md");
	assert.deepEqual(history.state(), { canBack: true, canForward: false });
	assert.equal(history.commit(-1), "Learn.md");
	assert.equal(history.commit(-1), "Start.md");
	assert.deepEqual(history.state(), { canBack: false, canForward: true });
	assert.equal(history.commit(1), "Learn.md");
});

test("deduplicates the current note and discards the abandoned forward branch", () => {
	const history = new SessionNavigationHistory();
	history.record("Start.md");
	history.record("Learn.md");
	history.record("Learn.md");
	history.commit(-1);
	history.record("Project.md");
	assert.deepEqual(history.state(), { canBack: true, canForward: false });
	assert.equal(history.target(-1), "Start.md");
	assert.equal(history.target(1), null);
});
