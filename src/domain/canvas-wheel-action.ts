export type CanvasWheelInput = {
	isOverCardScroller: boolean;
	isOverSearch: boolean;
};

export type CanvasWheelAction = "scroll-card" | "zoom-canvas" | "ignore";

export type CanvasWheelViewport = {
	left: number;
	top: number;
	width: number;
	height: number;
};

export type CanvasWheelPoint = {
	x: number;
	y: number;
};

/**
 * Keeps the canvas and its nested controls predictable: wheel ownership is
 * selected by the pointer target, rather than by whichever control has focus.
 */
export function canvasWheelAction(input: CanvasWheelInput): CanvasWheelAction {
	if (input.isOverSearch) return "ignore";
	if (input.isOverCardScroller) return "scroll-card";
	return "zoom-canvas";
}

/**
 * Wheel zoom changes scale without turning the pointer into an implicit pan
 * gesture. Node positions therefore stay visually stable around the viewport
 * centre; moving the canvas remains an explicit background-drag action.
 */
export function canvasWheelZoomPoint(
	viewport: CanvasWheelViewport,
	_pointer: CanvasWheelPoint,
): CanvasWheelPoint {
	return {
		x: viewport.left + viewport.width / 2,
		y: viewport.top + viewport.height / 2,
	};
}
