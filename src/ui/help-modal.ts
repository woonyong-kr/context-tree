import { App, Modal, Setting } from "obsidian";
import { COPY } from "./copy";

export interface LinkedCanvasHelpActions {
	openMap(): Promise<void>;
	openCanvas(): Promise<void>;
}

/** A short, task-first guide. It explains which surface to choose without
 * introducing another onboarding state or storing dismissal flags. */
export class LinkedCanvasHelpModal extends Modal {
	constructor(app: App, private readonly actions: LinkedCanvasHelpActions) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("linked-canvas-help-modal");
		this.contentEl.empty();
		this.contentEl.createEl("h2", { text: COPY.help.title });
		this.contentEl.createEl("p", { cls: "linked-canvas-help-lead", text: COPY.help.intro });

		const choices = this.contentEl.createDiv({ cls: "linked-canvas-help-choices" });
		this.renderChoice(choices, COPY.help.canvasEyebrow, COPY.help.canvasTitle, COPY.help.canvasDescription);
		this.renderChoice(choices, COPY.help.mapEyebrow, COPY.help.mapTitle, COPY.help.mapDescription);
		this.renderChoice(choices, COPY.help.existingEyebrow, COPY.help.existingTitle, COPY.help.existingDescription);

		const ownership = this.contentEl.createDiv({ cls: "linked-canvas-help-ownership" });
		ownership.createEl("h3", { text: COPY.help.ownershipTitle });
		const list = ownership.createEl("ul");
		for (const item of COPY.help.ownershipItems) list.createEl("li", { text: item });

		new Setting(this.contentEl)
			.setClass("linked-canvas-help-actions")
			.addButton((button) => button
				.setCta()
				.setButtonText(COPY.help.openMap)
				.onClick(() => {
					this.close();
					void this.actions.openMap();
				}))
			.addButton((button) => button
				.setButtonText(COPY.help.openCanvas)
				.onClick(() => {
					this.close();
					void this.actions.openCanvas();
				}));
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderChoice(container: HTMLElement, eyebrow: string, title: string, description: string): void {
		const choice = container.createDiv({ cls: "linked-canvas-help-choice" });
		choice.createSpan({ cls: "linked-canvas-help-eyebrow", text: eyebrow });
		choice.createEl("h3", { text: title });
		choice.createEl("p", { text: description });
	}
}
