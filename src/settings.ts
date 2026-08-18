import { App, PluginSettingTab, Setting } from "obsidian";
import { GraphPhysics } from "./graph/simulation";
import { GraphViewState, GraphWorkspace } from "./domain/graph-workspace";
import ContextTreePlugin from "./main";
import { COPY } from "./ui/copy";

export interface ContextTreeSettings {
	graphs: GraphWorkspace[];
	defaultGraphId: string;
	viewStates: Record<string, GraphViewState>;
}

export const DEFAULT_SETTINGS: ContextTreeSettings = { graphs: [], defaultGraphId: "", viewStates: {} };

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
			this.physicsDefinition(graph, COPY.settings.linkStrengthName, COPY.settings.linkStrengthDescription, "linkStrength", 0.1, 1, 0.02),
			this.physicsDefinition(graph, COPY.settings.repulsionName, COPY.settings.repulsionDescription, "repulsion", 200, 1800, 20),
			this.physicsDefinition(graph, COPY.settings.linkGapName, COPY.settings.linkGapDescription, "linkGap", 20, 260, 10),
		]);
	}

	private renderGraphPhysics(container: HTMLElement, graph: GraphWorkspace): void {
		new Setting(container).setName(graph.name).setHeading();
		container.createEl("p", { cls: "setting-item-description", text: COPY.settings.physicsDescription });
		this.addPhysicsSlider(new Setting(container), graph, COPY.settings.linkStrengthName, COPY.settings.linkStrengthDescription, "linkStrength", 0.1, 1, 0.02);
		this.addPhysicsSlider(new Setting(container), graph, COPY.settings.repulsionName, COPY.settings.repulsionDescription, "repulsion", 200, 1800, 20);
		this.addPhysicsSlider(new Setting(container), graph, COPY.settings.linkGapName, COPY.settings.linkGapDescription, "linkGap", 20, 260, 10);
	}

	private physicsDefinition(
		graph: GraphWorkspace,
		name: string,
		desc: string,
		key: keyof GraphPhysics,
		min: number,
		max: number,
		step: number,
	): unknown {
		return {
			name,
			desc,
			render: (setting: Setting) => this.addPhysicsSlider(setting, graph, name, desc, key, min, max, step),
		};
	}

	private addPhysicsSlider(
		setting: Setting,
		graph: GraphWorkspace,
		name: string,
		description: string,
		key: keyof GraphPhysics,
		min: number,
		max: number,
		step: number,
	): void {
		setting
			.setName(name)
			.setDesc(description)
			.addSlider((slider) => slider
				.setLimits(min, max, step)
				.setValue(graph.physics[key])
				.setDynamicTooltip()
				.onChange((value) => {
					graph.physics[key] = value;
					this.plugin.scheduleGraphPhysicsSave(graph.id);
				}),
			);
	}
}
