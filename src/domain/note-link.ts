/** Return the destination portion of an Obsidian wikilink, without alias or heading. */
export function noteLinkTarget(value: string): string {
	const match = value.match(/^\[\[([^|#\]]+)/);
	return match?.[1]?.trim() || value.trim();
}
