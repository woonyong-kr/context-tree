/**
 * Keeps the two direct-manipulation gestures distinct.
 *
 * A keyword card remains an object in the graph in compact, Reading, and
 * Source states, so dragging its non-interactive frame repositions that object.
 * Editor and Markdown surfaces keep their native input, selection, and scroll.
 */
export type CardPointerAction = "move-node" | "none";

export function cardPointerAction(input: {
	isInteractiveTarget: boolean;
	isTextSelectionTarget: boolean;
}): CardPointerAction {
	if (input.isInteractiveTarget || input.isTextSelectionTarget) return "none";
	return "move-node";
}
