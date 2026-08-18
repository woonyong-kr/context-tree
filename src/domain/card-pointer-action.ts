/**
 * Keeps the two direct-manipulation gestures distinct.
 *
 * A compact keyword card is an object in the graph, so dragging it repositions
 * that object. Once a card is expanded it becomes a reading surface; dragging
 * ordinary reading space pans the graph without forcing the reader to click
 * the background (which intentionally closes the card).
 */
export type CardPointerAction = "move-node" | "pan-graph" | "none";

export function cardPointerAction(input: {
	isOpen: boolean;
	isEditing: boolean;
	isInteractiveTarget: boolean;
}): CardPointerAction {
	if (input.isInteractiveTarget || input.isEditing) return "none";
	return input.isOpen ? "pan-graph" : "move-node";
}
