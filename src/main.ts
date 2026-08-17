import { Plugin, WorkspaceLeaf } from "obsidian";
import { ContextTreeSettingTab, ContextTreeSettings, DEFAULT_SETTINGS } from "./settings";
import { ContextTreeView, VIEW_TYPE_CONTEXT_TREE } from "./view";

export default class ContextTreePlugin extends Plugin {
	settings!: ContextTreeSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(
			VIEW_TYPE_CONTEXT_TREE,
			(leaf) => new ContextTreeView(leaf, this),
		);

		this.addRibbonIcon("git-fork", "Open context tree", () => {
			void this.activateView();
		});

		this.addCommand({
			id: "open-tree",
			name: "Open knowledge tree",
			callback: () => void this.activateView(),
		});

		this.addCommand({
			id: "refresh-tree",
			name: "Refresh knowledge tree",
			callback: () => this.refreshOpenViews(),
		});

		this.addSettingTab(new ContextTreeSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ContextTreeSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.refreshOpenViews();
	}

	async activateView(): Promise<void> {
		const existingLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE);
		let leaf: WorkspaceLeaf | undefined = existingLeaves[0];
		if (!leaf) {
			leaf = this.app.workspace.getLeaf("tab");
			await leaf.setViewState({ type: VIEW_TYPE_CONTEXT_TREE, active: true });
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	refreshOpenViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_TREE)) {
			const view = leaf.view;
			if (view instanceof ContextTreeView) {
				void view.refresh();
			}
		}
	}
}
