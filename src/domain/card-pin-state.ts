/**
 * Card pins are a local graph-view affordance, not Markdown metadata. They
 * protect deliberate reading or Source editing from incidental canvas
 * dismissal while allowing one additional, transient card to be explored.
 */
export function normalizePinnedCardIds(
	pinnedIds: readonly string[] | undefined,
	availableIds: Iterable<string>,
): Set<string> {
	const available = new Set(availableIds);
	return new Set((pinnedIds ?? []).filter((id) => available.has(id)));
}

/** Opens one transient card while retaining every deliberately pinned card. */
export function openCardAlongsidePins(pinnedIds: ReadonlySet<string>, nodeId: string): Set<string> {
	return new Set([...pinnedIds, nodeId]);
}

/** Canvas dismissal only removes transient detail cards, never an explicit pin. */
export function retainPinnedCards(openIds: ReadonlySet<string>, pinnedIds: ReadonlySet<string>): Set<string> {
	return new Set([...openIds].filter((id) => pinnedIds.has(id)));
}
