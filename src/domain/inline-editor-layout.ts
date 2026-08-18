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
	const sourceLineCount = Math.max(1, source.split(/\r?\n/).length);
	const sourceEstimate = INLINE_EDITOR_CHROME_HEIGHT + sourceLineCount * INLINE_EDITOR_LINE_HEIGHT;
	return Math.min(
		MAX_INLINE_EDITOR_HEIGHT,
		Math.max(MIN_INLINE_EDITOR_HEIGHT, Math.ceil(measuredHeight), sourceEstimate),
	);
}
