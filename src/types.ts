export type ContextRelationType = "related" | "prerequisite" | "supports" | "contrasts" | "follow-up";
export type SecondaryGraphNodeRole = "topic" | "entity" | "question";
export type GraphNodeRole = "root" | SecondaryGraphNodeRole;

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
	/** Optional read-only visual hint from `linked_canvas_role` frontmatter. */
	visualRole?: SecondaryGraphNodeRole;
	parentPath?: string;
	links: ContextTreeLink[];
	/** Ordinary Markdown links projected as read-only graph context. */
	referencePaths?: string[];
	children: ContextTreeNode[];
}

export interface ParsedTopic {
	id: string;
	path: string;
	parentPath?: string;
	title: string;
	summary: string;
	body: string;
	visualRole?: SecondaryGraphNodeRole;
	links: ContextTreeLink[];
	referencePaths?: string[];
}
