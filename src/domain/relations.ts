import { ContextRelationType } from "../types";

/**
 * Relationship types stored in `linked_canvas_links` frontmatter. The legacy
 * `context_tree_links` key remains readable so existing Vaults migrate without
 * rewriting source notes.
 *
 * This is the single source of truth for parsing, writing, and presenting
 * explicit graph links.  Parent provenance is intentionally separate: it is
 * only used to import older topic hierarchies as undirected graph edges.
 */
export const RELATION_TYPES = [
	"related",
	"prerequisite",
	"supports",
	"contrasts",
	"follow-up",
] as const satisfies readonly ContextRelationType[];

export const DIRECT_RELATION: ContextRelationType = "related";
export const LINKED_CANVAS_RELATION_PROPERTY = "linked_canvas_links";
const LEGACY_RELATION_PROPERTY = "context_tree_links";
export const RELATION_PROPERTIES = [LINKED_CANVAS_RELATION_PROPERTY, LEGACY_RELATION_PROPERTY] as const;

export function isContextRelationType(value: unknown): value is ContextRelationType {
	return typeof value === "string" && (RELATION_TYPES as readonly string[]).includes(value);
}

/**
 * These relations describe a peer connection, so their Markdown storage
 * endpoint is not a conceptual source or destination.
 */
export function isSymmetricRelation(type: ContextRelationType): boolean {
	return type === "related" || type === "contrasts";
}

/** Frontmatter may contain one relation or a YAML list of relations. */
export function relationItems(value: unknown): unknown[] {
	if (value === undefined || value === null) return [];
	return Array.isArray(value) ? value : [value];
}

export function storedRelationItems(frontmatter: Record<string, unknown> | undefined): unknown[] {
	return RELATION_PROPERTIES.flatMap((property) => relationItems(frontmatter?.[property]));
}
