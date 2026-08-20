/**
 * Identifies the nested surface that owns a wheel gesture. The browser may
 * retain a focused textarea as `event.target` after the pointer has moved, so
 * callers must pass the element resolved at the wheel coordinates.
 */
export type CanvasWheelSurface = {
	isOverEditor: boolean;
	isOverSearch: boolean;
	editorScroller?: HTMLElement;
};

export function canvasWheelSurface(target: Element | null): CanvasWheelSurface {
	const editorScroller = target?.closest<HTMLElement>(".context-tree-markdown-editor-scroll") ?? undefined;
	return {
		isOverEditor: !!editorScroller,
		isOverSearch: !!target?.closest(".context-tree-search-panel"),
		editorScroller,
	};
}
