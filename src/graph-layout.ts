export interface GraphLayoutMetrics {
	directDistance: number;
	leafRadius: number;
	previewDistance: number;
	previewRingGap: number;
	chargeDistance: number;
}

export interface NodeAnchorOffset {
	x: number;
	y: number;
}

export function graphLayoutMetrics(width: number, height: number, itemCount: number): GraphLayoutMetrics {
	const safeWidth = width > 0 ? width : 640;
	const safeHeight = height > 0 ? height : 640;
	const shortSide = Math.min(safeWidth, safeHeight);
	const viewportDistance = shortSide * 0.4;
	const densityUnit = 55 + 27 * clamp((itemCount - 8) / 10, 0, 1);
	const densityDistance = Math.sqrt(Math.max(itemCount, 1)) * densityUnit;
	const directDistance = Math.round(Math.max(158, viewportDistance, densityDistance));
	const previewDistance = Math.round(clamp(shortSide * 0.2, 116, 190));
	const previewRingGap = Math.round(clamp(shortSide * 0.11, 72, 104));

	return {
		directDistance,
		leafRadius: directDistance,
		previewDistance,
		previewRingGap,
		chargeDistance: Math.round(Math.max(480, directDistance * 2.4)),
	};
}

export function nodeAnchorOffset(
	nodeWidth: number,
	nodeHeight: number,
	dotLeft: number,
	dotTop: number,
	dotWidth: number,
	dotHeight: number,
): NodeAnchorOffset {
	return {
		x: -nodeWidth / 2 + dotLeft + dotWidth / 2,
		y: -nodeHeight / 2 + dotTop + dotHeight / 2,
	};
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}
