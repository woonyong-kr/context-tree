/**
 * Opening the card beneath the pointer is intentionally distinct from graph
 * navigation. Keeping this decision pure prevents a future caller from
 * accidentally coupling a reader expansion to a camera or physics reset.
 */
export type CardOpenIntent = "open-in-place" | "navigate-to-card";

export interface CardOpenEffects {
	movesCamera: boolean;
}

export function cardOpenEffects(intent: CardOpenIntent): CardOpenEffects {
	return intent === "navigate-to-card"
		? { movesCamera: true }
		: { movesCamera: false };
}
