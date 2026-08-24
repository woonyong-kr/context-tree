import { App, FuzzySuggestModal, Modal, TFile } from "obsidian";
import { GraphWorkspace } from "./domain/graph-workspace";
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

export class SavedGraphsModal extends Modal {
	constructor(
		app: App,
		private readonly graphs: readonly GraphWorkspace[],
		private readonly activeGraphId: string,
		private readonly onOpenGraph: (graphId: string) => void,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(COPY.modal.graphsTitle);
		this.contentEl.createEl("p", { text: COPY.modal.graphsDescription });
		if (!this.graphs.length) {
			this.contentEl.createEl("p", { cls: "context-tree-empty-status", text: COPY.modal.noSavedGraphs });
			return;
		}
		const list = this.contentEl.createDiv({ cls: "context-tree-graph-list" });
		for (const graph of this.graphs) {
			const button = list.createEl("button", { text: graph.name, cls: "context-tree-graph-list-item" });
			button.toggleClass("is-active", graph.id === this.activeGraphId);
			button.addEventListener("click", () => {
				this.onOpenGraph(graph.id);
				this.close();
			});
		}
	}

	onClose(): void { this.contentEl.empty(); }
}

export class LinkedCanvasPickerModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private readonly canvases: readonly TFile[],
		private readonly onChoose: (canvas: TFile) => void,
	) {
		super(app);
		this.setPlaceholder(COPY.modal.canvasPickerPlaceholder);
	}

	getItems(): TFile[] {
		return [...this.canvases];
	}

	getItemText(canvas: TFile): string {
		return canvas.basename;
	}

	onChooseItem(canvas: TFile): void {
		this.onChoose(canvas);
	}
}

export type LinkedCanvasLaunchChoice =
	| { kind: "blank" }
	| { kind: "current"; file: TFile }
	| { kind: "canvas"; file: TFile };

export class LinkedCanvasLauncherModal extends FuzzySuggestModal<LinkedCanvasLaunchChoice> {
	constructor(
		app: App,
		private readonly canvases: readonly TFile[],
		private readonly currentNote: TFile | undefined,
		private readonly onChoose: (choice: LinkedCanvasLaunchChoice) => void,
	) {
		super(app);
		this.setPlaceholder(COPY.modal.canvasLauncherPlaceholder);
	}

	getItems(): LinkedCanvasLaunchChoice[] {
		return [
			{ kind: "blank" },
			...(this.currentNote ? [{ kind: "current" as const, file: this.currentNote }] : []),
			...this.canvases.map((file) => ({ kind: "canvas" as const, file })),
		];
	}

	getItemText(choice: LinkedCanvasLaunchChoice): string {
		if (choice.kind === "blank") return COPY.modal.canvasLauncherBlank;
		if (choice.kind === "current") return COPY.modal.canvasLauncherCurrent(choice.file.basename);
		return COPY.modal.canvasLauncherExisting(choice.file.basename);
	}

	onChooseItem(choice: LinkedCanvasLaunchChoice): void {
		this.onChoose(choice);
	}
}
