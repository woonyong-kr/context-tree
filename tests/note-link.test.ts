import assert from "node:assert/strict";
import test from "node:test";
import { noteLinkTarget } from "../src/domain/note-link";

test("normalizes Obsidian link aliases and headings before vault resolution", () => {
	assert.equal(noteLinkTarget("[[topics/Threads|Thread scheduling]]"), "topics/Threads");
	assert.equal(noteLinkTarget("[[PintOS#Alarm clock]]"), "PintOS");
	assert.equal(noteLinkTarget("plain/path"), "plain/path");
});
