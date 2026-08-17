import { App, PluginSettingTab, Setting } from "obsidian";
import ContextTreePlugin from "./main";

export interface ContextTreeSettings {
	sourceFolder: string;
	initialExpandedDepth: number;
}

export const DEFAULT_SETTINGS: ContextTreeSettings = {
	sourceFolder: "",
	initialExpandedDepth: 2,
};

export class ContextTreeSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: ContextTreePlugin) {
		super(app, plugin);
	}

	/**
	 * Obsidian 1.13+ uses this declarative form for settings search and rendering.
	 * Older supported versions continue through display() below.
	 */
	getSettingDefinitions() {
		return [
			{
				name: "Source folder",
				desc: "Only scan this folder. Leave empty to scan the whole vault for context_tree: true notes.",
				control: {
					type: "text",
					key: "sourceFolder",
					placeholder: "Maps/learning",
				},
			},
			{
				name: "Initially visible depth",
				desc: "How many keyword levels to show before branches start collapsed.",
				control: {
					type: "slider",
					key: "initialExpandedDepth",
					min: 1,
					max: 6,
					step: 1,
				},
			},
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Source folder")
			.setDesc("Only scan this folder. Leave empty to scan the whole vault for context_tree: true notes.")
			.addText((text) =>
				text
				.setPlaceholder("Maps/learning")
					.setValue(this.plugin.settings.sourceFolder)
					.onChange(async (value) => {
						this.plugin.settings.sourceFolder = value.trim().replace(/^\/+|\/+$/g, "");
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Initially visible depth")
			.setDesc("How many keyword levels to show before branches start collapsed.")
			.addSlider((slider) =>
				slider
					.setLimits(1, 6, 1)
					.setValue(this.plugin.settings.initialExpandedDepth)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.initialExpandedDepth = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
