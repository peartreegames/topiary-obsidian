import {App, PluginSettingTab, Setting} from "obsidian";
import TopiPlugin from "../main";

export interface TopiSettings {
	path: string;
	template: string;
}

export const DEFAULT_SETTINGS: TopiSettings = {
	path: "",
	template: ""
}

export class TopiSettingTab extends PluginSettingTab {
	plugin: TopiPlugin;

	constructor(app: App, plugin: TopiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Topi Cli Path')
			.setDesc('Path to the topi binary file')
			.addText(text => text
				.setPlaceholder('/path/to/topi')
				.setValue(this.plugin.settings.path)
				.onChange(async (value) => {
					this.plugin.settings.path = value;
					await this.plugin.saveSettings();
				}));
		new Setting(containerEl)
			.setName('New File Template')
			.addTextArea(text => text
				.setValue(this.plugin.settings.template)
				.onChange(async (value) => {
					this.plugin.settings.template = value;
					await this.plugin.saveSettings();
				}))
	}
}

