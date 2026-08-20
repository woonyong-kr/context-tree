/** Background clicks close an unpinned editor; background drags still pan. */
export type CanvasPointerAction = "pan-canvas" | "pan-or-dismiss-editor-on-click";

export function canvasPointerAction(input: { hasUnpinnedEditor: boolean }): CanvasPointerAction {
	return input.hasUnpinnedEditor ? "pan-or-dismiss-editor-on-click" : "pan-canvas";
}
