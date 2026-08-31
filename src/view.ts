import { ItemView, setIcon, TFile, WorkspaceLeaf } from "obsidian";
import type LinkedGraphPlugin from "./main";
import { countLinks, graphMatches, type DocumentLinkGraph, type GraphEntry, type LinkedNote } from "./model";
import { OneHopForceGraph, type OneHopGraphNode } from "./one-hop-graph";
import { COPY } from "./ui/copy";

export const VIEW_TYPE_LINKED_GRAPH = "linked-graph-view";

type ViewMode = "graph" | "outline";

export class LinkedGraphView extends ItemView {
	private sourceFile: TFile | null = null;
	private graph: DocumentLinkGraph | null = null;
	private generation = 0;
	private query = "";
	private mode: ViewMode = "graph";
	private readonly collapsedGroups = new Set<string>();
	private graphSurface: OneHopForceGraph | null = null;
	private body: HTMLElement | null = null;
	private title: HTMLElement | null = null;
	private contextLabel: HTMLElement | null = null;
	private modeButton: HTMLButtonElement | null = null;

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

	async onClose(): Promise<void> {
		this.graphSurface?.destroy();
		this.graphSurface = null;
	}

	async refresh(file: TFile | null): Promise<void> {
		const generation = this.generation += 1;
		if (file?.path !== this.sourceFile?.path) this.collapsedGroups.clear();
		this.sourceFile = file;
		if (!file) {
			this.graph = null;
			this.updateHeading();
			this.render();
			return;
		}
		this.renderLoading();
		try {
			const graph = await this.plugin.graphFor(file);
			if (generation !== this.generation) return;
			this.graph = graph;
			this.updateHeading();
			this.render();
		} catch (error) {
			console.error("Linked Graph Navigator: failed to read the current Markdown note", error);
			if (generation !== this.generation || !this.body) return;
			this.body.empty();
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.readFailed });
		}
	}

	private renderShell(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("linked-graph-view");
		const header = container.createEl("header", { cls: "linked-graph-header" });
		const heading = header.createDiv({ cls: "linked-graph-heading" });
		this.title = heading.createEl("h2", { text: COPY.view.title });
		this.contextLabel = heading.createDiv({ cls: "linked-graph-context" });
		const actions = header.createDiv({ cls: "linked-graph-header-actions" });
		const search = actions.createEl("button", { cls: "clickable-icon", attr: { "aria-label": COPY.actions.search, type: "button" } });
		setIcon(search, "search");
		this.modeButton = actions.createEl("button", { cls: "linked-graph-mode", attr: { type: "button" } });
		const searchRow = container.createDiv({ cls: "linked-graph-search" });
		setIcon(searchRow.createSpan({ cls: "linked-graph-search-icon" }), "search");
		const input = searchRow.createEl("input", { type: "search", placeholder: COPY.labels.searchPlaceholder, attr: { "aria-label": COPY.actions.search } });
		this.body = container.createDiv({ cls: "linked-graph-body" });

		search.addEventListener("click", () => {
			const searching = !container.hasClass("is-searching");
			container.toggleClass("is-searching", searching);
			if (searching) input.focus();
		});
		this.modeButton.addEventListener("click", () => {
			this.mode = this.mode === "outline" ? "graph" : "outline";
			this.render();
		});
		input.addEventListener("input", () => {
			this.query = input.value;
			this.render();
		});
		this.updateHeading();
	}

	private updateHeading(): void {
		this.title?.setText(this.graph?.title ?? COPY.view.title);
		if (!this.contextLabel) return;
		if (!this.sourceFile || !this.graph) {
			this.contextLabel.setText(COPY.labels.noCurrentDocument);
			return;
		}
		this.contextLabel.setText(COPY.labels.routeCount(this.graph.linkCount));
	}

	private updateModeButton(): void {
		if (!this.modeButton) return;
		this.modeButton.empty();
		const graphMode = this.mode === "graph";
		setIcon(this.modeButton.createSpan({ cls: "linked-graph-mode-icon" }), graphMode ? "list-tree" : "git-branch");
		this.modeButton.createSpan({ text: graphMode ? COPY.actions.showOutline : COPY.actions.showGraph });
		this.modeButton.ariaLabel = graphMode ? COPY.actions.showOutline : COPY.actions.showGraph;
		this.modeButton.ariaPressed = String(graphMode);
	}

	private renderLoading(): void {
		if (!this.body) return;
		this.body.empty();
		this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.loading });
	}

	private render(): void {
		this.updateModeButton();
		if (!this.body) return;
		this.body.toggleClass("is-graph", this.mode === "graph");
		this.graphSurface?.destroy();
		this.graphSurface = null;
		this.body.empty();
		if (!this.sourceFile || !this.graph) {
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.openMarkdown });
			return;
		}
		if (this.graph.entries.length === 0) {
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.noLinks });
			return;
		}
		const entries = this.graph.entries.filter((entry) => graphMatches(entry, this.query));
		if (entries.length === 0) {
			this.body.createDiv({ cls: "linked-graph-state", text: COPY.labels.noSearchResults });
			return;
		}
		if (this.mode === "graph") this.renderGraph(entries);
		else this.renderOutline(entries);
	}

	private renderOutline(entries: readonly GraphEntry[]): void {
		if (!this.body) return;
		const outline = this.body.createDiv({ cls: "linked-graph-outline", attr: { role: "tree", "aria-label": COPY.labels.treeAria } });
		this.renderOutlineEntries(outline, entries, 1);
	}

	private renderOutlineEntries(container: HTMLElement, entries: readonly GraphEntry[], level: number): void {
		for (const entry of entries) {
			if (entry.kind === "link") {
				this.renderOutlineLink(container, entry, level);
				continue;
			}
			const collapsed = this.collapsedGroups.has(entry.key) && !this.query.trim();
			const section = container.createDiv({ cls: "linked-graph-section", attr: { role: "treeitem", "aria-level": String(level), "aria-expanded": String(!collapsed) } });
			const heading = section.createEl("button", { cls: "linked-graph-group", attr: { type: "button", "aria-label": collapsed ? COPY.actions.expand(entry.label) : COPY.actions.collapse(entry.label) } });
			setIcon(heading.createSpan({ cls: "linked-graph-disclosure" }), collapsed ? "chevron-right" : "chevron-down");
			heading.createSpan({ cls: "linked-graph-group-label", text: entry.label });
			heading.createSpan({ cls: "linked-graph-count", text: String(countLinks(entry.children)) });
			heading.addEventListener("click", () => {
				if (collapsed) this.collapsedGroups.delete(entry.key);
				else this.collapsedGroups.add(entry.key);
				this.render();
			});
			if (!collapsed) {
				const children = section.createDiv({ cls: "linked-graph-children", attr: { role: "group" } });
				this.renderOutlineEntries(children, entry.children, level + 1);
			}
		}
	}

	private renderOutlineLink(container: HTMLElement, link: LinkedNote, level: number): void {
		const row = container.createDiv({ cls: "linked-graph-link-row", attr: { role: "treeitem", "aria-level": String(level) } });
		setIcon(row.createSpan({ cls: "linked-graph-entry-icon", attr: { "aria-hidden": "true" } }), "file-text");
		const open = row.createEl("button", { cls: "linked-graph-link", text: link.label, attr: { title: link.path, type: "button" } });
		open.addEventListener("click", () => void this.plugin.openLinkedNote(link.linkText, this.sourceFile?.path ?? ""));
		setIcon(row.createSpan({ cls: "linked-graph-open-icon", attr: { "aria-hidden": "true" } }), "arrow-up-right");
	}

	private renderGraph(entries: readonly GraphEntry[]): void {
		if (!this.body || !this.graph || !this.sourceFile) return;
		const sourceFile = this.sourceFile;
		const sourcePath = sourceFile.path;
		const nodes = flattenGraphEntries(entries, (path) => this.plugin.nodeKindForPath(path));
		this.graphSurface = new OneHopForceGraph(this.body, {
			title: this.graph.title,
			rootKind: this.plugin.nodeKindForPath(sourcePath),
			parent: this.plugin.parentFor(sourceFile),
			ariaLabel: COPY.labels.graphAria,
			controls: {
				zoomOut: COPY.actions.zoomOut,
				zoomIn: COPY.actions.zoomIn,
				fitGraph: COPY.actions.fitGraph,
				openParent: COPY.actions.openParent,
			},
			items: nodes,
			onOpen: (node) => {
				void this.plugin.openLinkedNote(node.linkText, sourcePath);
			},
			onOpenParent: (parent) => {
				void this.plugin.openLinkedNote(parent.linkText, sourcePath);
			},
			onPreview: async (node) => {
				const file = this.plugin.fileForPath(node.path);
				if (!file) return [];
				const preview = await this.plugin.graphFor(file);
				return flattenGraphEntries(preview.entries, (path) => this.plugin.nodeKindForPath(path))
					.filter((candidate) => candidate.path !== sourcePath && candidate.path !== node.path);
			},
		});
	}
}

function flattenGraphEntries(
	entries: readonly GraphEntry[],
	kindForPath: (path: string) => OneHopGraphNode["kind"],
	result: OneHopGraphNode[] = [],
): OneHopGraphNode[] {
	for (const entry of entries) {
		if (entry.kind === "group") {
			flattenGraphEntries(entry.children, kindForPath, result);
			continue;
		}
		result.push({
			key: entry.key,
			label: entry.label,
			linkText: entry.linkText,
			path: entry.path,
			kind: kindForPath(entry.path),
		});
	}
	return result;
}
