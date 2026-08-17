/**
 * Context cards deliberately edit only the rendered document body. Keep graph
 * metadata and the document H1 intact so a local edit cannot disconnect a
 * topic from its graph by accident.
 */
export function replaceDocumentBody(source: string, body: string): string {
	const newline = source.includes("\r\n") ? "\r\n" : "\n";
	const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n)?/);
	const frontmatterText = frontmatter?.[0] ?? "";
	const withoutFrontmatter = source.slice(frontmatterText.length);
	const title = withoutFrontmatter.match(/^#\s+.*(?:\r?\n|$)/)?.[0] ?? "";
	const prefix = `${frontmatterText}${title}`;
	const normalizedBody = body.trim();
	const separator = prefix && normalizedBody
		? (prefix.endsWith(`${newline}${newline}`) ? "" : newline)
		: "";
	return `${prefix}${separator}${normalizedBody}${normalizedBody ? newline : ""}`;
}
