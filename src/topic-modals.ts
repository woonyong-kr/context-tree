import { App, Modal } from "obsidian";
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
