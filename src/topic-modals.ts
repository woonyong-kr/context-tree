import { App, FuzzySuggestModal, Modal, TFile } from "obsidian";
import { GraphScope, GraphScopeInput, GraphWorkspace } from "./domain/graph-workspace";
import { ContextTreeNode } from "./types";
import { COPY } from "./ui/copy";

export class DeleteTopicModal extends Modal {
	constructor(app: App, private readonly node: ContextTreeNode, private readonly onConfirm: () => void) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(COPY.modal.trashTitle);
		this.contentEl.createEl("p", { text: COPY.modal.trashDescription(this.node.title) });
		const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
		actions.createEl("button", { text: COPY.actions.cancel }).addEventListener("click", () => this.close());
		actions.createEl("button", { text: COPY.actions.moveToTrash, cls: "mod-warning" }).addEventListener("click", () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose(): void { this.contentEl.empty(); }
}

/** Explicit confirmation before replacing an unsaved in-card draft. */
export class ReloadInlineSourceModal extends Modal {
	constructor(app: App, private readonly onConfirm: () => void) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(COPY.modal.reloadSourceTitle);
		this.contentEl.createEl("p", { text: COPY.modal.reloadSourceDescription });
		const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
		actions.createEl("button", { text: COPY.actions.cancel }).addEventListener("click", () => this.close());
		actions.createEl("button", { text: COPY.actions.reloadSource, cls: "mod-warning" }).addEventListener("click", () => {
			this.onConfirm();
			this.close();
		});
	}

	onClose(): void { this.contentEl.empty(); }
}

export class GraphWorkspaceModal extends Modal {
	private name = "";
	private scopeKind: GraphScope["kind"] = "folders";
	private folder = "";

	constructor(
		app: App,
		private readonly graphs: readonly GraphWorkspace[],
		private readonly activeGraphId: string,
		private readonly callbacks: {
			onOpenGraph: (graphId: string) => void;
			onCreateGraph: (name: string, scope: GraphScopeInput) => void;
			onAddExistingNote?: () => void;
		},
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(COPY.modal.graphsTitle);
		this.contentEl.createEl("p", { text: COPY.modal.graphsDescription });
		const list = this.contentEl.createDiv({ cls: "context-tree-graph-list" });
		for (const graph of this.graphs) {
			const button = list.createEl("button", { text: graph.name, cls: "context-tree-graph-list-item" });
			button.toggleClass("is-active", graph.id === this.activeGraphId);
			button.addEventListener("click", () => {
				this.callbacks.onOpenGraph(graph.id);
				this.close();
			});
		}
		if (this.callbacks.onAddExistingNote) {
			this.contentEl.createEl("button", { text: COPY.actions.addExistingNote }).addEventListener("click", () => {
				this.close();
				// A modal cannot reliably hand focus to another modal while it is still
				// attached. Close first, then open the vault picker on the next turn.
				window.setTimeout(() => this.callbacks.onAddExistingNote?.(), 0);
			});
		}

		this.contentEl.createEl("h3", { text: COPY.modal.newGraphHeading });
		const nameInput = this.contentEl.createEl("input", {
			type: "text",
			attr: { placeholder: COPY.labels.graphName },
		});
		nameInput.addEventListener("input", () => { this.name = nameInput.value; });

		const scopeSelect = this.contentEl.createEl("select", { attr: { "aria-label": COPY.labels.graphScope } });
		scopeSelect.createEl("option", { value: "folders", text: COPY.labels.folderNotes });
		scopeSelect.createEl("option", { value: "all", text: COPY.labels.allNotes });
		scopeSelect.createEl("option", { value: "curated", text: COPY.labels.curatedNotes });
		scopeSelect.addEventListener("change", () => {
			this.scopeKind = scopeSelect.value as GraphScope["kind"];
			folderInput.toggleClass("is-hidden", this.scopeKind !== "folders");
		});

		const folderInput = this.contentEl.createEl("input", {
			type: "text",
			attr: { placeholder: COPY.settings.graphFolderPlaceholder, "aria-label": COPY.labels.graphFolder },
		});
		folderInput.addEventListener("input", () => { this.folder = folderInput.value; });

		const actions = this.contentEl.createDiv({ cls: "modal-button-container" });
		actions.createEl("button", { text: COPY.actions.cancel }).addEventListener("click", () => this.close());
		actions.createEl("button", { text: COPY.actions.createGraph, cls: "mod-cta" }).addEventListener("click", () => {
			const name = this.name.trim();
			if (!name) {
				nameInput.focus();
				return;
			}
			const folder = this.folder.trim().replace(/^\/+|\/+$/g, "");
			const scope: GraphScopeInput = this.scopeKind === "folders"
				? { kind: "folders", folders: folder ? [folder] : [] }
				: { kind: this.scopeKind };
			this.callbacks.onCreateGraph(name, scope);
			this.close();
		});
		window.setTimeout(() => nameInput.focus(), 0);
	}

	onClose(): void { this.contentEl.empty(); }
}

/** Picks an opted-in Markdown note without creating a second document model. */
export class AddGraphNoteModal extends FuzzySuggestModal<TFile> {
	private readonly items: TFile[];

	constructor(app: App, private readonly onChoose: (file: TFile) => void) {
		super(app);
		this.items = app.vault.getMarkdownFiles().filter((file) => app.metadataCache.getFileCache(file)?.frontmatter?.context_tree === true);
		this.setPlaceholder(COPY.labels.selectGraphNote);
	}

	getItems(): TFile[] { return this.items; }
	getItemText(file: TFile): string { return file.path; }
	onChooseItem(file: TFile): void { this.onChoose(file); }
}
