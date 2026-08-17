export interface ContextTreeNode {
	id: string;
	path: string;
	title: string;
	summary: string;
	body: string;
	children: ContextTreeNode[];
}

export interface ParsedTopic {
	id: string;
	path: string;
	parentPath?: string;
	title: string;
	summary: string;
	body: string;
}
