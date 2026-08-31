export const GRAPH_MOTION = {
	initialAlpha: 0.8,
	alphaDecay: 0.05,
	velocityDecay: 0.5,
	resizeAlpha: 0.04,
	dragAlphaTarget: 0.05,
	dropAlpha: 0.08,
	cancelAlpha: 0.04,
} as const;

export function minimumSimulationAlpha(current: number, minimum: number): number {
	return Math.max(current, minimum);
}
