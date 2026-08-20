/**
 * Keeps the two direct-manipulation gestures distinct.
 *
 * A keyword card remains an object in the graph in compact, Reading, and
 * Source states, so dragging its non-interactive frame repositions that object.
 * Editor and Markdown surfaces keep their native input, selection, and scroll.
 */
export type CardPointerAction = "move-node" | "none";

const CARD_DRAG_THRESHOLD = 5;

export function hasCardDragExceededClickThreshold(
	origin: { x: number; y: number },
	current: { x: number; y: number },
): boolean {
	return Math.hypot(current.x - origin.x, current.y - origin.y) >= CARD_DRAG_THRESHOLD;
}

export function cardPointerAction(input: {
	isCardToggleTarget: boolean;
	isInteractiveTarget: boolean;
	isTextSelectionTarget: boolean;
}): CardPointerAction {
	// The title/summary is both the card's click target and its practical drag
	// handle. The view's movement threshold separates those two gestures.
	if (input.isCardToggleTarget) return "move-node";
	if (input.isInteractiveTarget || input.isTextSelectionTarget) return "none";
	return "move-node";
}
