import { ContextTreeNode, ParsedTopic } from "./types";

/** Build a stable keyword hierarchy without making the parser depend on the UI. */
export function buildContextTree(topics: ParsedTopic[]): ContextTreeNode[] {
	const byPath = new Map(
		topics.map((topic) => [topic.path, { ...topic, children: [] as ContextTreeNode[] }]),
	);
	const roots: ContextTreeNode[] = [];

	for (const topic of byPath.values()) {
		const parent = topic.parentPath ? byPath.get(topic.parentPath) : undefined;
		if (parent) parent.children.push(topic);
		else roots.push(topic);
	}

	const sortTree = (nodes: ContextTreeNode[]): void => {
		nodes.sort((left, right) => left.title.localeCompare(right.title));
		nodes.forEach((node) => sortTree(node.children));
	};
	sortTree(roots);
	return roots;
}
