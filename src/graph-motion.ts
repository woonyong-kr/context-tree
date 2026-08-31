export const GRAPH_MOTION = {
	initialAlpha: 0.8,
	alphaDecay: 0.05,
	velocityDecay: 0.5,
	resizeAlpha: 0.04,
	dragAlphaTarget: 0.05,
	dropAlpha: 0.08,
	cancelAlpha: 0.04,
	hoverRangePx: 36,
	hoverMaximumPx: 8,
	hoverStrength: 0.22,
} as const;

export interface PointerPosition {
	clientX: number;
	clientY: number;
}

export interface GraphOffset {
	x: number;
	y: number;
}

/** Keep hover motion local without moving the native-button hit target. */
export function boundedHoverOffset(
	origin: PointerPosition,
	clientX: number,
	clientY: number,
): GraphOffset {
	const deltaX = clientX - origin.clientX;
	const deltaY = clientY - origin.clientY;
	const distance = Math.hypot(deltaX, deltaY);
	if (distance === 0 || distance > GRAPH_MOTION.hoverRangePx) return { x: 0, y: 0 };
	const proposedX = deltaX * GRAPH_MOTION.hoverStrength;
	const proposedY = deltaY * GRAPH_MOTION.hoverStrength;
	const proposedDistance = Math.hypot(proposedX, proposedY);
	if (proposedDistance <= GRAPH_MOTION.hoverMaximumPx) return { x: proposedX, y: proposedY };
	const scale = GRAPH_MOTION.hoverMaximumPx / proposedDistance;
	return { x: proposedX * scale, y: proposedY * scale };
}

export function minimumSimulationAlpha(current: number, minimum: number): number {
	return Math.max(current, minimum);
}
