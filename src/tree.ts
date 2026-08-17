import { ContextTreeNode, ParsedTopic } from "./types";

/** Build a stable keyword hierarchy without making the parser depend on the UI. */
export function buildContextTree(topics: ParsedTopic[]): ContextTreeNode[] {
	const byPath = new Map(
		[...topics]
			.sort((left, right) => left.path.localeCompare(right.path))
			.map((topic) => [topic.path, { ...topic, children: [] as ContextTreeNode[] }]),
	);
	const roots: ContextTreeNode[] = [];
	const acceptedParents = new Map<string, string>();

	for (const topic of byPath.values()) {
		const parent = topic.parentPath ? byPath.get(topic.parentPath) : undefined;
		if (parent && !wouldCreateCycle(topic, parent, acceptedParents, byPath)) {
			parent.children.push(topic);
			acceptedParents.set(topic.path, parent.path);
		} else {
			roots.push(topic);
		}
	}

	const sortTree = (nodes: ContextTreeNode[]): void => {
		nodes.sort((left, right) => left.title.localeCompare(right.title));
		nodes.forEach((node) => sortTree(node.children));
	};
	sortTree(roots);
	return roots;
}

/**
 * A malformed parent link must not make a topic disappear from the view.  Keep
 * the offending edge as a root instead of producing an unrenderable cycle.
 */
function wouldCreateCycle(
	topic: ContextTreeNode,
	parent: ContextTreeNode,
	acceptedParents: Map<string, string>,
	byPath: Map<string, ContextTreeNode>,
): boolean {
	const seen = new Set<string>([topic.path]);
	let cursor: ContextTreeNode | undefined = parent;

	while (cursor) {
		if (seen.has(cursor.path)) return true;
		seen.add(cursor.path);
		cursor = byPath.get(acceptedParents.get(cursor.path) ?? "");
	}

	return false;
}
