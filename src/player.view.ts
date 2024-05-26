import TopiPlugin from "main";
import {View, WorkspaceLeaf} from "obsidian";
import { playButton, restartButton } from "./icons";

export class TopiPlayerView extends View {
	view: HTMLElement;
	plugin: TopiPlugin;
	history: number[];
	
	constructor(leaf: WorkspaceLeaf, plugin: TopiPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.history = [];
		this.view = this.containerEl.createDiv();
		this.view.addClass("topi-player");
		this.restart = this.restart.bind(this);
		this.clear = this.clear.bind(this);
		this.back = this.back.bind(this);
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

	async appendDialogue(msg: string, callback: () => void, wait: boolean = true) {
		if (!this.view) return;
		const text = msg.replace(/<.*?>/g, "").split('#');
		const p = this.view.createEl('p', {
			cls: [wait ? 'fade-in' : '', 'topi-text']
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
				cls: [wait ? 'fade-in' : '', 'topi-tags']
			});
			t.innerText = `# ${text.slice(1).join(', ')}`;
		}
		if (wait) {
			this.view.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
			await new Promise(res => setTimeout(res, 100));
		} else {
			this.view.lastElementChild?.scrollIntoView({ behavior: 'auto' });
		}
		callback();
	}

	appendError(msg: string) {
		if (!this.view) return;
		const p = this.view.createEl('p', {
			cls: ['fade-in', 'topi-error']
		});
		p.innerText = msg;
	}

	appendChoice(msg: string, choose: (i: number) => void, autoChoiceIndex: number | null = null) {
		if (!this.view) return;
		this.view.createEl('hr');
		const regex = /\[(\d+)\]\s+(.+)/;
		const lines = msg.split('\n');
		for (let i = 0; i < lines.length; i++){
			if (autoChoiceIndex !== null) {
				if (i === autoChoiceIndex) {
					this.history.push(i);
					return choose(i);
				}
				continue;
			}
			const line = lines[i];
			const match = line.match(regex);
			if (match) {
				const text = match[2];
				const p = this.view.createEl('p', {
					cls: ['topi-text', 'fade-in', 'topi-choice']
				});
				const c = p.createEl('a');
				c.innerText = text;
				c.addEventListener("mouseup", () => {
					const choices = this.view.findAll('.topi-choice');
					for (const choice of choices) this.view.removeChild(choice);
					this.history.push(i);
					choose(i);
				});
				this.view.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}

	createControlButtons(): Node {
		const container = this.containerEl.createDiv({
			cls: 'topi-controls'
		});
		this.containerEl.prepend(container);
		const play = container.createDiv({
			cls: ['topi-controls-button'],
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
		container.createEl('hr');
		return container;
	};

	restart(): void {
		this.clear();
		this.history = [];
		this.plugin.library.restart();
	};

	back(): void {
		this.clear();
		const his = this.history.length === 0 ? [] : this.history.slice(0, this.history.length - 1).reverse();
		this.history = [];
		this.plugin.library.rerun(his);
	};

	clear(): void {
		this.view.replaceChildren();
		this.createControlButtons();
	};
}
