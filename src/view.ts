import { ItemView, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import type LinkedGraphPlugin from "./main";
import { countLinks, graphMatches, type DocumentLinkGraph, type GraphEntry, type LinkedNote } from "./model";
import { COPY } from "./ui/copy";

export const VIEW_TYPE_LINKED_GRAPH = "linked-graph-view";

export class LinkedGraphView extends ItemView {
	private sourceFile: TFile | null = null;
	private graph: DocumentLinkGraph | null = null;
	private generation = 0;
	private query = "";
	private readonly collapsedGroups = new Set<string>();
	private readonly expandedLinks = new Set<string>();
	private readonly branchGraphs = new Map<string, DocumentLinkGraph>();
	private body: HTMLElement | null = null;
	private contextLabel: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, private readonly plugin: LinkedGraphPlugin) {
		super(leaf);
	}

	getViewType(): string { return VIEW_TYPE_LINKED_GRAPH; }
	getDisplayText(): string { return COPY.view.title; }
	getIcon(): string { return "git-branch"; }

	async onOpen(): Promise<void> {
		this.renderShell();
		await this.refresh(this.plugin.activeSource());
	}

	async refresh(file: TFile | null): Promise<void> {
		const generation = this.generation += 1;
		if (file?.path !== this.sourceFile?.path) {
			this.collapsedGroups.clear();
			this.expandedLinks.clear();
			this.branchGraphs.clear();
		}
		this.sourceFile = file;
		this.contextLabel?.setText(file ? `${COPY.labels.currentDocument} · ${file.basename}` : COPY.labels.noCurrentDocument);
		if (!file) {
			this.graph = null;
			this.render();
			return;
		}
		this.renderLoading();
		try {
			const graph = await this.plugin.graphFor(file);
			if (generation !== this.generation) return;
			this.graph = graph;
			this.branchGraphs.clear();
			this.render();
		} catch (error) {
			console.error("Linked Graph: failed to read the current Markdown note", error);
			if (generation !== this.generation || !this.body) return;
			this.body.empty();
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.readFailed });
		}
	}

	private renderShell(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("linked-graph-view");
		const header = container.createDiv({ cls: "linked-graph-header" });
		header.createEl("h4", { text: COPY.view.title });
		const actions = header.createDiv({ cls: "linked-graph-header-actions" });
		const search = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": COPY.actions.search } });
		setIcon(search, "search");
		const collapse = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": COPY.actions.collapseAll } });
		setIcon(collapse, "list-collapse");
		this.contextLabel = container.createDiv({ cls: "linked-graph-context" });
		const searchRow = container.createDiv({ cls: "linked-graph-search" });
		setIcon(searchRow.createSpan({ cls: "linked-graph-search-icon" }), "search");
		const input = searchRow.createEl("input", { type: "search", placeholder: COPY.labels.searchPlaceholder, attr: { "aria-label": COPY.actions.search } });
		this.body = container.createDiv({ cls: "linked-graph-body" });

		search.addEventListener("click", () => {
			const searching = !container.hasClass("is-searching");
			container.toggleClass("is-searching", searching);
			if (searching) input.focus();
		});
		collapse.addEventListener("click", () => {
			if (this.graph) this.collectGroupKeys(this.graph.entries, this.collapsedGroups);
			this.expandedLinks.clear();
			this.render();
		});
		input.addEventListener("input", () => {
			this.query = input.value;
			this.render();
		});
	}

	private renderLoading(): void {
		if (!this.body) return;
		this.body.empty();
		this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.loading });
	}

	private render(): void {
		if (!this.body) return;
		this.body.empty();
		if (!this.sourceFile || !this.graph) {
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.openMarkdown });
			return;
		}
		if (this.graph.entries.length === 0) {
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.noLinks });
			return;
		}
		const tree = this.body.createDiv({ cls: "linked-graph-tree", attr: { role: "tree", "aria-label": COPY.labels.treeAria } });
		const root = tree.createDiv({ cls: "linked-graph-root", attr: { role: "treeitem", "aria-level": "1" } });
		setIcon(root.createSpan({ cls: "linked-graph-root-icon" }), "file-text");
		root.createSpan({ cls: "linked-graph-root-label", text: this.graph.title });
		root.createSpan({ cls: "linked-graph-count", text: String(this.graph.linkCount) });
		const entries = this.graph.entries.filter((entry) => graphMatches(entry, this.query));
		if (entries.length === 0) {
			tree.createDiv({ cls: "linked-graph-state", text: COPY.labels.noSearchResults });
			return;
		}
		const list = tree.createDiv({ cls: "linked-graph-list", attr: { role: "group" } });
		this.renderEntries(list, entries, 2, new Set([this.sourceFile.path]));
	}

	private renderEntries(container: HTMLElement, entries: readonly GraphEntry[], level: number, ancestors: Set<string>): void {
		for (const entry of entries) {
			if (!graphMatches(entry, this.query)) continue;
			if (entry.kind === "group") this.renderGroup(container, entry, level, ancestors);
			else this.renderLink(container, entry, level, ancestors);
		}
	}

	private renderGroup(container: HTMLElement, group: Extract<GraphEntry, { kind: "group" }>, level: number, ancestors: Set<string>): void {
		const collapsed = this.collapsedGroups.has(group.key) && !this.query.trim();
		const row = container.createDiv({ cls: "linked-graph-row is-group", attr: { role: "treeitem", "aria-level": String(level), "aria-expanded": String(!collapsed) } });
		const toggle = row.createEl("button", { cls: "linked-graph-toggle", attr: { "aria-label": collapsed ? COPY.actions.expand(group.label) : COPY.actions.collapse(group.label) } });
		setIcon(toggle, collapsed ? "chevron-right" : "chevron-down");
		toggle.addEventListener("click", () => {
			if (collapsed) this.collapsedGroups.delete(group.key);
			else this.collapsedGroups.add(group.key);
			this.render();
		});
		row.createSpan({ cls: "linked-graph-group-label", text: group.label });
		row.createSpan({ cls: "linked-graph-count", text: String(countLinks(group.children)) });
		if (collapsed) return;
		const children = container.createDiv({ cls: "linked-graph-list", attr: { role: "group" } });
		this.renderEntries(children, group.children, level + 1, ancestors);
	}

	private renderLink(container: HTMLElement, link: LinkedNote, level: number, ancestors: Set<string>): void {
		const row = container.createDiv({ cls: "linked-graph-row is-link", attr: { role: "treeitem", "aria-level": String(level) } });
		const cycle = ancestors.has(link.path);
		const expanded = this.expandedLinks.has(link.key) && !cycle;
		const toggle = row.createEl("button", { cls: "linked-graph-toggle", attr: {
			"aria-label": cycle ? COPY.labels.cycle : (expanded ? COPY.actions.collapse(link.label) : COPY.actions.preview(link.label)),
			"aria-expanded": String(expanded),
		} });
		setIcon(toggle, cycle ? "corner-down-left" : (expanded ? "chevron-down" : "chevron-right"));
		toggle.disabled = cycle;
		toggle.addEventListener("click", () => void this.toggleLinkedBranch(link));
		const open = row.createEl("button", { cls: "linked-graph-link", text: link.label, attr: { title: link.path } });
		open.addEventListener("click", () => void this.plugin.openLinkedNote(link.linkText, this.sourceFile?.path ?? ""));
		if (!expanded) return;
		const branch = this.branchGraphs.get(link.key);
		const children = container.createDiv({ cls: "linked-graph-list", attr: { role: "group" } });
		if (!branch) {
			children.createDiv({ cls: "linked-graph-state is-inline", text: COPY.labels.loading });
			return;
		}
		if (branch.entries.length === 0) {
			children.createDiv({ cls: "linked-graph-state is-inline", text: COPY.labels.branchEmpty });
			return;
		}
		const nextAncestors = new Set(ancestors);
		nextAncestors.add(link.path);
		this.renderEntries(children, branch.entries, level + 1, nextAncestors);
	}

	private async toggleLinkedBranch(link: LinkedNote): Promise<void> {
		if (this.expandedLinks.has(link.key)) {
			this.expandedLinks.delete(link.key);
			this.render();
			return;
		}
		this.expandedLinks.add(link.key);
		this.render();
		if (!this.branchGraphs.has(link.key)) {
			const file = this.plugin.fileForPath(link.path);
			if (file) {
				const graph = await this.plugin.graphFor(file);
				this.branchGraphs.set(link.key, graph);
				this.collectGroupKeys(graph.entries, this.collapsedGroups);
			}
		}
		this.render();
	}

	private collectGroupKeys(entries: readonly GraphEntry[], target: Set<string>): void {
		for (const entry of entries) {
			if (entry.kind !== "group") continue;
			target.add(entry.key);
			this.collectGroupKeys(entry.children, target);
		}
	}
}
