export type CanvasWheelInput = {
	isOverEditor: boolean;
	isOverSearch: boolean;
	/** Focus never changes wheel ownership; the pointer location does. */
	isEditorFocused: boolean;
};

export type CanvasWheelAction = "scroll-editor" | "zoom-canvas" | "ignore";

/**
 * Keeps the canvas and its nested controls predictable: wheel ownership is
 * selected by the pointer target, rather than by whichever control has focus.
 */
export function canvasWheelAction(input: CanvasWheelInput): CanvasWheelAction {
	if (input.isOverSearch) return "ignore";
	if (input.isOverEditor) return "scroll-editor";
	return "zoom-canvas";
}
