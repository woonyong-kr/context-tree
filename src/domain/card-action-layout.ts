export interface CardActionLayout {
	controlScale: number;
	detailScale: number;
}

/**
 * Returns only the bounded visual scales for overview zoom. CSS owns the
 * corresponding action-rail dimensions and multiplies compact-card clearance
 * by controlScale, avoiding a second set of layout constants in TypeScript.
 */
export function cardActionLayout(zoom: number): CardActionLayout {
	const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
	const controlScale = Math.min(2.4, Math.max(1, 0.72 / safeZoom));
	const detailScale = Math.max(1, 0.72 / safeZoom);
	return {
		controlScale,
		detailScale,
	};
}
