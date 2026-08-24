import type { ContextTreeNode, GraphNodeRole, SecondaryGraphNodeRole } from "../types";

const SECONDARY_ROLES = new Set<SecondaryGraphNodeRole>(["topic", "entity", "question"]);

export function parseGraphNodeRole(value: unknown): SecondaryGraphNodeRole | undefined {
	return typeof value === "string" && SECONDARY_ROLES.has(value as SecondaryGraphNodeRole)
		? value as SecondaryGraphNodeRole
		: undefined;
}

/**
 * The current-note root is structural, while secondary roles are read-only
 * presentation hints. A question mark is the only inference; entity meaning
 * is never guessed from link count or folder location.
 */
export function graphNodeRole(
	node: Pick<ContextTreeNode, "path" | "title" | "visualRole">,
	rootPath?: string,
): GraphNodeRole {
	if (rootPath && node.path === rootPath) return "root";
	if (node.visualRole) return node.visualRole;
	return /[?？]\s*$/.test(node.title) ? "question" : "topic";
}
