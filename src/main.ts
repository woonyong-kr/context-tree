import { MarkdownView, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";
import { parseDocumentLinks, type DocumentLinkGraph } from "./model";
import { nodeVisualKind, parseParentLink, type GraphNavigationTarget, type NodeVisualKind } from "./navigation";
import { COPY } from "./ui/copy";
import { LinkedGraphView, VIEW_TYPE_LINKED_GRAPH } from "./view";

export default class LinkedGraphPlugin extends Plugin {
	private currentFile: TFile | null = null;
	private sourceLeaf: WorkspaceLeaf | null = null;
	private refreshTimer: number | undefined;

	async onload(): Promise<void> {
		this.registerView(VIEW_TYPE_LINKED_GRAPH, (leaf) => new LinkedGraphView(leaf, this));

		this.addRibbonIcon("git-branch", COPY.view.openRibbon, () => void this.openLinkedGraph());
		this.addCommand({ id: "open-current-note", name: COPY.view.openCommand, callback: () => void this.openLinkedGraph() });
		this.addCommand({ id: "refresh-current-note", name: COPY.view.refreshCommand, callback: () => this.refreshViews() });

		this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
			if (!(leaf?.view instanceof MarkdownView) || !leaf.view.file) return;
			this.setCurrentSource(leaf.view.file, leaf);
		}));
		this.registerEvent(this.app.workspace.on("file-open", (file) => {
			if (!(file instanceof TFile) || file.extension !== "md") return;
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			this.setCurrentSource(file, view?.leaf ?? this.sourceLeaf);
		}));

		const scheduleRefresh = (file: TAbstractFile): void => {
			if (!(file instanceof TFile) || file.extension !== "md") return;
			if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
			this.refreshTimer = window.setTimeout(() => this.refreshViews(), 120);
		};
		this.registerEvent(this.app.vault.on("create", scheduleRefresh));
		this.registerEvent(this.app.vault.on("modify", scheduleRefresh));
		this.registerEvent(this.app.vault.on("delete", scheduleRefresh));
		this.registerEvent(this.app.vault.on("rename", scheduleRefresh));

		this.app.workspace.onLayoutReady(() => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.file) this.setCurrentSource(view.file, view.leaf);
		});
	}

	onunload(): void {
		if (this.refreshTimer !== undefined) window.clearTimeout(this.refreshTimer);
	}

	activeSource(): TFile | null {
		return this.currentFile;
	}

	async graphFor(file: TFile): Promise<DocumentLinkGraph> {
		const markdown = await this.app.vault.cachedRead(file);
		return parseDocumentLinks(markdown, file.path, file.basename, (linkPath, sourcePath) => {
			const destination = this.app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
			return destination?.extension === "md" ? destination.path : null;
		});
	}

	fileForPath(path: string): TFile | null {
		const file = this.app.vault.getAbstractFileByPath(path);
		return file instanceof TFile && file.extension === "md" ? file : null;
	}

	nodeKindForPath(path: string): NodeVisualKind {
		const file = this.fileForPath(path);
		return file ? nodeVisualKind(this.app.metadataCache.getFileCache(file)?.frontmatter) : "unknown";
	}

	parentFor(file: TFile): GraphNavigationTarget | null {
		const parsed = parseParentLink(this.app.metadataCache.getFileCache(file)?.frontmatter?.parent);
		if (!parsed) return null;
		const destination = this.app.metadataCache.getFirstLinkpathDest(parsed.linkPath, file.path);
		if (!(destination instanceof TFile) || destination.extension !== "md") return null;
		return {
			...parsed,
			path: destination.path,
			kind: this.nodeKindForPath(destination.path),
		};
	}

	async openLinkedGraph(): Promise<void> {
		if (!this.currentFile) {
			const active = this.app.workspace.getActiveFile();
			if (active instanceof TFile && active.extension === "md") this.currentFile = active;
		}
		if (!this.currentFile) {
			new Notice(COPY.notice.openMarkdownFirst);
			return;
		}
		const leaf = await this.app.workspace.ensureSideLeaf(VIEW_TYPE_LINKED_GRAPH, "right", { active: true, reveal: true, split: false });
		await this.app.workspace.revealLeaf(leaf);
		this.refreshViews();
	}

	async openLinkedNote(linkText: string, sourcePath: string): Promise<void> {
		if (this.sourceLeaf) this.app.workspace.setActiveLeaf(this.sourceLeaf, { focus: true });
		await this.app.workspace.openLinkText(linkText, sourcePath, false);
	}

	private setCurrentSource(file: TFile, leaf: WorkspaceLeaf | null): void {
		if (file.extension !== "md") return;
		this.currentFile = file;
		if (leaf && leaf.view instanceof MarkdownView) this.sourceLeaf = leaf;
		this.refreshViews();
	}

	private refreshViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_LINKED_GRAPH)) {
			if (leaf.view instanceof LinkedGraphView) void leaf.view.refresh(this.currentFile);
		}
	}
}
