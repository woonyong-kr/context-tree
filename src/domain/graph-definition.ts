import { graphWorkspaceId, GraphWorkspace, migrateGraphWorkspaces } from "./graph-workspace";

/**
 * Legacy Linked Map workspaces remain first-class Vault files. The custom extension
 * lets Obsidian open them in the graph view without competing with `.canvas`.
 */
export const GRAPH_DEFINITION_EXTENSION = "context-graph";
export const GRAPH_DEFINITION_FOLDER = "maps/context-graph";
const SCHEMA_VERSION = 1;

interface GraphDefinitionDocument {
	schemaVersion: number;
	graph: GraphWorkspace;
}

/** A stable, readable file name; the graph id remains the actual identifier. */
export function graphDefinitionFileName(graph: Pick<GraphWorkspace, "id" | "name">): string {
	const stem = graph.name
		.trim()
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, " ")
		.replace(/^\.+|\.+$/g, "")
		.trim();
	return `${stem || graphWorkspaceId(graph.id) || "context-graph"}.${GRAPH_DEFINITION_EXTENSION}`;
}

export function graphDefinitionPath(graph: Pick<GraphWorkspace, "id" | "name">): string {
	return `${GRAPH_DEFINITION_FOLDER}/${graphDefinitionFileName(graph)}`;
}

/**
 * Gives independently created graphs separate Vault files even when their
 * display names match. Vaults on macOS are commonly case-insensitive, so the
 * comparison deliberately is too.
 */
export function availableGraphDefinitionPath(
	graph: Pick<GraphWorkspace, "id" | "name">,
	occupiedPaths: readonly string[],
): string {
	const preferred = graphDefinitionPath(graph);
	const occupied = new Set(occupiedPaths.map((path) => path.toLocaleLowerCase()));
	if (!occupied.has(preferred.toLocaleLowerCase())) return preferred;

	const extension = `.${GRAPH_DEFINITION_EXTENSION}`;
	const stem = graphDefinitionFileName(graph).slice(0, -extension.length);
	let suffix = 2;
	while (occupied.has(`${GRAPH_DEFINITION_FOLDER}/${stem} ${suffix}${extension}`.toLocaleLowerCase())) suffix += 1;
	return `${GRAPH_DEFINITION_FOLDER}/${stem} ${suffix}${extension}`;
}

export function serializeGraphDefinition(graph: GraphWorkspace): string {
	const document: GraphDefinitionDocument = { schemaVersion: SCHEMA_VERSION, graph };
	return `${JSON.stringify(document, null, "\t")}\n`;
}

/**
 * Treat malformed graph files as unavailable rather than silently widening a
 * graph's scope. The migration normaliser also keeps older definitions usable.
 */
export function parseGraphDefinition(source: string): GraphWorkspace | undefined {
	try {
		const value: unknown = JSON.parse(source);
		if (!value || typeof value !== "object") return undefined;
		const document = value as Partial<GraphDefinitionDocument>;
		const graph = document.graph as Partial<GraphWorkspace> | undefined;
		if (
			document.schemaVersion !== SCHEMA_VERSION || !graph
			|| typeof graph.id !== "string" || !graph.id.trim()
			|| typeof graph.name !== "string" || !graph.name.trim()
			|| !graph.scope || typeof graph.scope !== "object"
			|| !graph.physics || typeof graph.physics !== "object"
		) return undefined;
		if (graph.scope.kind === "rooted" && (typeof graph.scope.rootPath !== "string" || !graph.scope.rootPath.trim())) {
			return undefined;
		}
		return migrateGraphWorkspaces([document.graph], undefined, undefined)[0];
	} catch {
		return undefined;
	}
}
