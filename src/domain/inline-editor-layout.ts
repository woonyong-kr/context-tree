/**
 * Source mode must not inherit a compact card's height. A compact card has no
 * rendered detail yet, so using its measured height would collapse the editor
 * to the controls-only area. Existing expanded cards retain their footprint;
 * a direct edit from compact mode receives a readable, bounded workspace.
 */
const MIN_INLINE_EDITOR_HEIGHT = 320;
const MAX_INLINE_EDITOR_HEIGHT = 680;
const INLINE_EDITOR_LINE_HEIGHT = 22;
const INLINE_EDITOR_CHROME_HEIGHT = 112;

export function inlineEditorCardHeight(measuredHeight: number, source: string): number {
	// Source mode is entered from an open card. Keeping that measured footprint
	// prevents the force layout from treating an editor toggle as a graph edit.
	if (measuredHeight > 0) return Math.ceil(measuredHeight);
	const sourceLineCount = Math.max(1, source.split(/\r?\n/).length);
	const sourceEstimate = INLINE_EDITOR_CHROME_HEIGHT + sourceLineCount * INLINE_EDITOR_LINE_HEIGHT;
	return Math.min(
		MAX_INLINE_EDITOR_HEIGHT,
		Math.max(MIN_INLINE_EDITOR_HEIGHT, Math.ceil(measuredHeight), sourceEstimate),
	);
}

/**
 * Source and Reading are two projections of one open card. Once Source has
 * captured the Reading footprint, keep that exact outer box until the card is
 * closed; changed Markdown may scroll inside it but must not move the graph.
 */
export function retainsInlineEditorFootprint(isOpen: boolean, hasEnteredSource: boolean): boolean {
	return isOpen && hasEnteredSource;
}
