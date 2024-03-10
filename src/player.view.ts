import TopiPlugin from "main";
import { View, WorkspaceLeaf } from "obsidian";
import { playButton, restartButton } from "./icons";

export class TopiPlayerView extends View {

	view: HTMLElement;
	plugin: TopiPlugin;
	history: Uint8Array[];
	
	constructor(leaf: WorkspaceLeaf, plugin: TopiPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.view = this.containerEl;
		this.view.addClass("topi-player");
	}

	getIcon(): string {
		return "topi";
	}

	getViewType(): string {
		return "topi-player";
	}

	getDisplayText(): string {
		return "topi player";
	}

	async appendDialogue(msg: string, callback: () => void) {
		if (!this.view) return;
		const text = msg.replace(/<.*?>/g, "").split('#');
		const p = this.view.createEl('p', {
			cls: ['fade-in', 'topi-text']
		});

		const regex = /:(.*?):\s*(.+)/;
		const match = text[0].match(regex);
		if (match) {
			const speaker = p.createEl('span', {
				cls: ['topi-speaker']
			});
			speaker.innerText = match[1].toUpperCase() + ": ";
			speaker.addClass('topi-speaker');
			const content = p.createSpan();
			content.innerText = match[2];
					}
		if (text.length > 1) {
			const t = this.view.createEl('span', {
				cls: ['fade-in', 'topi-tags']
			});
			t.innerText = `# ${text.slice(1).join(', ')}`;
		}
		await new Promise(res => setTimeout(res, 100));
		callback();
	}

	appendError(msg: string) {
		if (!this.view) return;
		const p = this.view.createEl('p', {
			cls: ['fade-in', 'topi-error']
		});
		p.innerText = msg;
	}

	appendChoice(msg: string, choose: (i: number) => void) {
		if (!this.view) return;
		this.view.createEl('hr');
		const regex = /\[(\d+)\]\s+(.+)/;
		const lines = msg.split('\n');
		for (const line of lines) {
			const match = line.match(regex);
			if (match) {
				const index = parseInt(match[1]);
				const text = match[2];
				const p = this.view.createEl('p', {
					cls: ['topi-text', 'fade-in', 'topi-choice']
				});
				const c = p.createEl('a');
				c.innerText = text;
				c.addEventListener("mouseup", () => {
					const choices = this.view.findAll('.topi-choice');
					for (const choice of choices) this.view.removeChild(choice);
					choose(index);
				});
				this.view.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}

	onError(msg: string) {
		const p = this.view.createEl('p', { cls: 'error-text' });
		p.innerText = msg;
	};

	createControlButtons(): Node {
		const container = this.view.createDiv({
			cls: 'topi-controls'
		});
		const play = container.createDiv({
			cls: ['topi-controls-button', 'fixed'],
			attr: {
				["aria-label-position"]: "bottom",
				["aria-label"]: "Play from start",
			}
		});
		play.addEventListener('mouseup', this.restart);
		play.innerHTML = playButton;
		const back = container.createDiv({
			cls: ['topi-controls-button', 'fixed'],
			attr: {
				["aria-label-position"]: "bottom",
				["aria-label"]: "Go back",
			}
		});
		back.style.right = '75px';
		back.addEventListener('mouseup', this.back);
		back.innerHTML = restartButton;
		return container;
	};

	restart(): void {
		this.clear();
	};

	back(): void {
		let last = this.view.lastChild;
		while (last?.nodeName != 'HR' && last != null) {
			this.view.removeChild(last);
			last = this.view.lastChild;
		}
		if (last != null) this.view.removeChild(last);
		// this.story.state.LoadJson(this.history.pop());
	};

	clear(): void {
		// this.runner.ResetState();
		this.history = [];
		this.view.replaceChildren(this.createControlButtons());
	};


	choose(i: number): void {
		this.view.createEl('hr');
	};
}
