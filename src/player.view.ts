import { View, WorkspaceLeaf } from "obsidian";
import { playButton, restartButton } from "./icons";

export class TopiPlayerView extends View {

	view: HTMLElement;
	history: Uint8Array[];
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.view = this.containerEl;
	}

	getViewType(): string {
		return "topi-player";
	}

	getDisplayText(): string {
		return "topi player";
	}

	appendDialogue(msg: string, callback: () => void) {
		const text = msg.split('#');
		const p = this.view.createEl('p', {
			cls: 'fade-in'
		});
		p.innerText = text[0];
		if (text.length > 1) {
			const t = this.view.createEl('p', {
				cls: ['fade-in', 'ink-tags']
			});
			t.innerText = `# ${text.slice(1).join(', ')}`;
		}
		callback();
	}

	appendError(msg: string) {
		const p = this.view.createEl('p', {
			cls: 'error'
		});
		p.innerText = msg;
	}

	appendChoice(msg: string, choose: (i: number) => void) {

		const regex = /\[(\d+)\]\s+(.+)/;
		const match = msg.match(regex);

		if (match) {
			const index = parseInt(match[1]);
			const text = match[2];
			const p = this.view.createEl('p', {
				cls: ['ink-text', 'fade-in', 'ink-choice']
			});
			const c = p.createEl('a');
			c.innerText = text;
			c.addEventListener("mouseup", () => choose(index));
			this.view.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
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
		const choices = this.view.findAll('.ink-choice');
		for (const choice of choices) this.view.removeChild(choice);
		this.view.createEl('hr');
	};
}
