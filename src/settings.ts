import { App, PluginSettingTab, Setting } from "obsidian";
import { GRAPH_PHYSICS_LIMITS, GraphPhysics } from "./graph/simulation";
import { GraphViewState, GraphWorkspace } from "./domain/graph-workspace";
import ContextTreePlugin from "./main";
import { COPY, graphPhysicsSettingName } from "./ui/copy";
import type { InlineEditorDraft } from "./domain/inline-editor-draft";

export interface ContextTreeSettings {
	graphs: GraphWorkspace[];
	defaultGraphId: string;
	viewStates: Record<string, GraphViewState>;
	inlineDrafts: Record<string, InlineEditorDraft>;
	definitionsMigrated: boolean;
}

export const DEFAULT_SETTINGS: ContextTreeSettings = {
	graphs: [],
	defaultGraphId: "",
	viewStates: {},
	inlineDrafts: {},
	definitionsMigrated: false,
};

export class ContextTreeSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ContextTreePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		if (!this.plugin.settings.graphs.length) return;
		containerEl.createEl("p", {
			cls: "setting-item-description",
			text: COPY.settings.graphSettingsDescription,
		});
		for (const graph of this.plugin.settings.graphs) this.renderGraphPhysics(containerEl, graph);
	}

	/**
	 * Obsidian 1.13+ calls this instead of display(), which makes all controls
	 * searchable. The repository still compiles against the public 1.8 SDK, so
	 * the framework-only definition shape stays intentionally structural here.
	 * Each render callback reuses the exact same controls as the legacy path.
	 */
	getSettingDefinitions(): unknown[] {
		return this.plugin.settings.graphs.flatMap((graph) => [
			this.physicsDefinition(graph, COPY.settings.linkStrengthName, COPY.settings.linkStrengthDescription, "linkStrength", true),
			this.physicsDefinition(graph, COPY.settings.repulsionName, COPY.settings.repulsionDescription, "repulsion", true),
			this.physicsDefinition(graph, COPY.settings.linkGapName, COPY.settings.linkGapDescription, "linkGap", true),
		]);
	}

	private renderGraphPhysics(container: HTMLElement, graph: GraphWorkspace): void {
		new Setting(container).setName(graph.name).setHeading();
		container.createEl("p", { cls: "setting-item-description", text: COPY.settings.physicsDescription });
		this.addPhysicsSlider(new Setting(container), graph, COPY.settings.linkStrengthName, COPY.settings.linkStrengthDescription, "linkStrength");
		this.addPhysicsSlider(new Setting(container), graph, COPY.settings.repulsionName, COPY.settings.repulsionDescription, "repulsion");
		this.addPhysicsSlider(new Setting(container), graph, COPY.settings.linkGapName, COPY.settings.linkGapDescription, "linkGap");
	}

	private physicsDefinition(
		graph: GraphWorkspace,
		name: string,
		desc: string,
		key: keyof GraphPhysics,
		includeGraphName = false,
	): unknown {
		return {
			name: includeGraphName ? graphPhysicsSettingName(graph.name, name) : name,
			desc,
			render: (setting: Setting) => this.addPhysicsSlider(setting, graph, name, desc, key),
		};
	}

	private addPhysicsSlider(
		setting: Setting,
		graph: GraphWorkspace,
		name: string,
		description: string,
		key: keyof GraphPhysics,
	): void {
		const limits = GRAPH_PHYSICS_LIMITS[key];
		setting
			.setName(name)
			.setDesc(description)
			.addSlider((slider) => slider
				.setLimits(limits.min, limits.max, limits.step)
				.setValue(graph.physics[key])
				.setDynamicTooltip()
				.onChange((value) => {
					graph.physics[key] = value;
					this.plugin.scheduleGraphPhysicsSave(graph.id);
				}),
			);
	}
}
