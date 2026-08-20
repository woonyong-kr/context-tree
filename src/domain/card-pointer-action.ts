/**
 * Keeps the two direct-manipulation gestures distinct.
 *
 * A keyword card remains an object in the graph in both compact and expanded
 * Reading states, so dragging its non-interactive surface repositions that
 * object. The reader is stationary only until the user deliberately drags it;
 * canvas navigation remains available from the canvas background.
 */
export type CardPointerAction = "move-node" | "none";

export function cardPointerAction(input: {
	isEditing: boolean;
	isInteractiveTarget: boolean;
	isTextSelectionTarget: boolean;
}): CardPointerAction {
	if (input.isInteractiveTarget || input.isTextSelectionTarget || input.isEditing) return "none";
	return "move-node";
}
