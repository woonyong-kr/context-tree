export type ContextRelationType = "related" | "prerequisite" | "supports" | "contrasts" | "follow-up";

export interface ContextTreeLink {
	targetPath: string;
	type: ContextRelationType;
}

export interface ContextTreeNode {
	id: string;
	path: string;
	title: string;
	summary: string;
	body: string;
	parentPath?: string;
	links: ContextTreeLink[];
	children: ContextTreeNode[];
}

export interface ParsedTopic {
	id: string;
	path: string;
	parentPath?: string;
	title: string;
	summary: string;
	body: string;
	links: ContextTreeLink[];
}
