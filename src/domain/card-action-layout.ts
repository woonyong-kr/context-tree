export interface CardActionLayout {
	controlScale: number;
	detailScale: number;
}

export interface CollapsedCardMetrics {
	baseWidth: number;
	maximumWidth: number;
	minimumWidth: number;
	paneGap: number;
	paddingInline: number;
	compactActionReserve: number;
	compactExpandedActionReserve: number;
}

export function collapsedCardWidth(
	titleWidth: number,
	viewportWidth: number,
	hasExpandAction: boolean,
	metrics: CollapsedCardMetrics,
): { width: number; wraps: boolean } {
	const reserve = hasExpandAction
		? metrics.compactExpandedActionReserve
		: metrics.compactActionReserve;
	const desired = Math.max(metrics.baseWidth, titleWidth + metrics.paddingInline * 2 + reserve);
	const available = Math.max(metrics.minimumWidth, viewportWidth - metrics.paneGap);
	const maximum = Math.min(metrics.maximumWidth, available);
	return { width: Math.min(maximum, desired), wraps: desired > maximum };
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
