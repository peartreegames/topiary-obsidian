import { addIcon, Plugin, WorkspaceLeaf } from 'obsidian';
import { TopiEditorView } from "./src/editor.view";
import { TopiLibrary } from "./src/library";
import icon from 'icon.svg';
import { DEFAULT_SETTINGS, TopiSettings, TopiSettingTab } from "./src/settings";
import { TopiPlayerView } from 'src/player.view';

export default class TopiPlugin extends Plugin {
	settings: TopiSettings;
	runner: TopiLibrary;
	player: TopiPlayerView;

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

		this.runner = new TopiLibrary(this);

		this.registerView("topi-player", this.topiPlayerViewCreator);
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('topi');

		this.registerExtensions(["topi"], "topi");
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
		this.addCommand({
			id: 'open-topi-player',
			name: 'Open topi player',
			callback: async () => {
				const existing = this.app.workspace.getLeavesOfType('topi-player');
				let leaf: WorkspaceLeaf;
				if (existing.length === 0) {
					leaf = this.app.workspace.getRightLeaf(false)!;
					await leaf.setViewState({
						type: 'topi-player',
					});
				} else leaf = existing.first()!;
				this.app.workspace.revealLeaf(leaf);
			}
		})
	}

	topiViewCreator = (leaf: WorkspaceLeaf) => new TopiEditorView(leaf, this);
	topiPlayerViewCreator = (leaf: WorkspaceLeaf) => {
		this.player = new TopiPlayerView(leaf, this);
		return this.player;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		if (this.runner.child) this.runner.child.kill("SIGTERM");
	}
}
