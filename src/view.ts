import { ItemView, MarkdownRenderer, WorkspaceLeaf } from "obsidian";
import ContextTreePlugin from "./main";
import { loadContextTree } from "./parser";
import { ContextTreeNode } from "./types";

export const VIEW_TYPE_CONTEXT_TREE = "context-tree-view";

export class ContextTreeView extends ItemView {
	private readonly expandedBranches = new Set<string>();
	private readonly collapsedBranches = new Set<string>();
	private readonly openDetails = new Set<string>();

	constructor(leaf: WorkspaceLeaf, private readonly plugin: ContextTreePlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_CONTEXT_TREE;
	}

	getDisplayText(): string {
		return "Context tree";
	}

	getIcon(): string {
		return "git-fork";
	}

	async onOpen(): Promise<void> {
		await this.refresh();
	}

	async refresh(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("context-tree-view");

		const header = contentEl.createDiv({ cls: "context-tree-toolbar" });
		header.createEl("h2", { text: "Context tree" });
		const actions = header.createDiv({ cls: "context-tree-actions" });
		this.createAction(actions, "Expand all", () => {
			this.expandedBranches.clear();
			this.collapsedBranches.clear();
			for (const node of this.allNodes) this.expandedBranches.add(node.id);
			void this.refresh();
		});
		this.createAction(actions, "Collapse all", () => {
			this.expandedBranches.clear();
			this.collapsedBranches.clear();
			for (const node of this.allNodes) this.collapsedBranches.add(node.id);
			this.openDetails.clear();
			void this.refresh();
		});
		this.createAction(actions, "Refresh", () => void this.refresh());

		const roots = await loadContextTree(this.app, this.plugin.settings);
		this.allNodes = this.flatten(roots);
		if (!roots.length) {
			const empty = contentEl.createDiv({ cls: "context-tree-empty" });
			empty.createEl("h3", { text: "No context tree notes found" });
			empty.createEl("p", { text: "Add context_tree: true to a Markdown note, then connect children with context_tree_parent." });
			return;
		}

		const tree = contentEl.createDiv({ cls: "context-tree-graph" });
		for (const root of roots) this.renderNode(tree, root, 0);
	}

	private allNodes: ContextTreeNode[] = [];

	private createAction(parent: HTMLElement, label: string, callback: () => void): void {
		const button = parent.createEl("button", { text: label, cls: "context-tree-action" });
		button.addEventListener("click", callback);
	}

	private renderNode(parentEl: HTMLElement, node: ContextTreeNode, depth: number): void {
		const row = parentEl.createDiv({ cls: "context-tree-row" });
		const card = row.createDiv({ cls: "context-tree-card" });
		const isDetailOpen = this.openDetails.has(node.id);
		card.toggleClass("is-detail-open", isDetailOpen);

		const title = card.createEl("button", { cls: "context-tree-title", text: node.title });
		title.setAttribute("aria-expanded", String(isDetailOpen));
		title.addEventListener("click", () => {
			if (this.openDetails.has(node.id)) this.openDetails.delete(node.id);
			else this.openDetails.add(node.id);
			void this.refresh();
		});

		if (node.summary) card.createDiv({ cls: "context-tree-summary", text: node.summary });
		if (isDetailOpen) {
			const detail = card.createDiv({ cls: "context-tree-detail markdown-rendered" });
			void MarkdownRenderer.render(this.app, node.body, detail, node.path, this);
			detail.addEventListener("click", (event) => this.openInternalLink(event, node.path));
			const source = detail.createEl("button", { cls: "context-tree-source", text: "Open source note" });
			source.addEventListener("click", () => void this.app.workspace.openLinkText(node.path, "", true));
		}

		if (!node.children.length) return;
		const isBranchOpen = !this.collapsedBranches.has(node.id)
			&& (this.expandedBranches.has(node.id) || depth < this.plugin.settings.initialExpandedDepth);
		const branch = card.createEl("button", {
			cls: "context-tree-branch-toggle",
			text: isBranchOpen ? `− ${node.children.length}` : `+ ${node.children.length}`,
		});
		branch.setAttribute("aria-label", `${isBranchOpen ? "Collapse" : "Expand"} ${node.title}`);
		branch.addEventListener("click", () => {
			if (isBranchOpen) {
				this.expandedBranches.delete(node.id);
				this.collapsedBranches.add(node.id);
			} else {
				this.collapsedBranches.delete(node.id);
				this.expandedBranches.add(node.id);
			}
			void this.refresh();
		});

		if (isBranchOpen) {
			const children = row.createDiv({ cls: "context-tree-children" });
			for (const child of node.children) this.renderNode(children, child, depth + 1);
		}
	}

	private flatten(nodes: ContextTreeNode[]): ContextTreeNode[] {
		return nodes.flatMap((node) => [node, ...this.flatten(node.children)]);
	}

	private openInternalLink(event: MouseEvent, sourcePath: string): void {
		const target = event.target;
		if (!(target instanceof Element)) return;
		const link = target.closest<HTMLAnchorElement>("a.internal-link");
		if (!link) return;

		const href = link.dataset.href || link.getAttribute("href") || "";
		const linkText = href.startsWith("app://obsidian.md/")
			? decodeURIComponent(href.slice("app://obsidian.md/".length))
			: href;
		if (!linkText) return;

		event.preventDefault();
		event.stopPropagation();
		void this.app.workspace.openLinkText(linkText, sourcePath, true);
	}
}
