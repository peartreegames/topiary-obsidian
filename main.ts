import {addIcon, Plugin, WorkspaceLeaf} from 'obsidian';
import {TopiView} from "./src/view";
import {TopiRunner} from "./src/runner";
import icon from 'icon.svg';
import {DEFAULT_SETTINGS, TopiSettings, TopiSettingTab} from "./src/settings";
export default class TopiPlugin extends Plugin {
	settings: TopiSettings;
	runner: TopiRunner;

	async onload() {
		let svg_text = icon;
		// remove surrounding tags
		svg_text = svg_text.replace(/<\?xml.*?\?>\s*/g, '');
		svg_text = svg_text.replace(/<!--.*?-->\s*/g, '');
		svg_text = svg_text.replace(/<svg[\s\S]*?>\s*/g, '');
		svg_text = svg_text.replace(/<\/svg>\s*/, '');
		addIcon("topi", svg_text);

		await this.loadSettings();
		this.addRibbonIcon('topi', 'New topi', async () => {
			await this.app.vault.create("/untitled.topi", this.settings.template)
		});

		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('topi');

		this.registerExtensions(["topi"], "topi");
		this.runner = new TopiRunner(this);
		this.registerView("topi", this.topiViewCreator);
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file.path.contains(".")) return;
				menu.addItem((item) => {
					item
						.setTitle("New topi")
						.setIcon("topi")
						.onClick(async () => {
							await file.vault.create(file.path + "/untitled.topi", this.settings.template, {})
						});
				});
			})
		);
		this.addSettingTab(new TopiSettingTab(this.app, this));
	}

	topiViewCreator = (leaf: WorkspaceLeaf) => new TopiView(leaf, this)

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {

	}
}
