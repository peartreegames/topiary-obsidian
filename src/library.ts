import { ChildProcess, exec, spawn } from "child_process";
import TopiPlugin from "../main";
import { Diagnostic } from "@codemirror/lint";
import { Notice } from "obsidian";
import { existsSync } from "fs";
import { promisify } from "util";
import { EOL } from 'os';

const execPromise = promisify(exec);

export class TopiLibrary {
	plugin: TopiPlugin;
	latestCompileId: string;
	latestRunId: string;
	currentArgs: string[];
	history: number[];
	child: ChildProcess;

	constructor(plugin: TopiPlugin) {
		this.plugin = plugin;
		this.history = [];
		this.continue = this.continue.bind(this);
		this.choose = this.choose.bind(this);
	}

	public async runCompile(args: string[], diagnostics: Diagnostic[]): Promise<void> {
		const path = this.plugin.settings.path;
		if (!existsSync(path)) return;
		try {
			const id = Math.random().toString();
			this.latestCompileId = id;
			const { stderr } = await execPromise(`${path} ${args.join(' ')}`)
			if (!stderr || this.latestCompileId !== id) return;
			const result = this.parseCompilerError(stderr);
			if (result !== null) diagnostics.push(result);
		} catch (err) {
			console.error('[topi]', err.toString());
			new Notice('[topi] Error running topi');
		}
	}

	public async restart() { return this.runTopi(this.currentArgs); }

	public async rerun(history: number[]) {
		this.history = history;
		return this.runTopi(this.currentArgs);
	}

	public async runTopi(args: string[]): Promise<void> {
		const path = this.plugin.settings.path;
		if (!path || !this.plugin.player) return;
		if (!existsSync(path)) {
			console.warn(`Could not find topi at ${path}`)
			return;
		}
		this.currentArgs = args;
		const id = Math.random().toString();
		this.plugin.player.clear();
		this.latestRunId = id;

		// use spawn so we can provide input
		if (this.child) this.child.kill("SIGTERM");
		const child = spawn(path, this.currentArgs);
		child.stdout.on('data', (data) => {
			data = data.toString();
			if (this.latestRunId !== id) return;
			if (data.startsWith(":")) this.plugin.player.appendDialogue(data, this.continue, this.history.length === 0);
			if (data.startsWith("[")) this.plugin.player.appendChoice(data, this.choose, this.history?.pop());
		});

		child.stderr.on('data', (data) => {
			data = data.toString();
			if (this.latestRunId !== id) return;
			this.plugin.player.appendError(data);
		});

		child.on('error', (err) => {
			console.error('[topi]', err.toString());
			new Notice('[topi] Error running topi');
		});
		this.child = child;
	}

	public async continue() {
		if (!this.child) return;
		this.child.stdin?.write(` ${EOL}`);
	}

	public async choose(i: number) {
		if (!this.child) return;
		this.child.stdin?.write(`${i.toString()}${EOL}`);
	}

	private parseCompilerError(msg: string | object): Diagnostic | null {
		if (typeof msg !== 'string') return null;
		// eslint-disable-next-line no-control-regex
		const colorRemoved = msg.replace(/\x1b\[\d+(;\d+m|m)/g, "");
		const regex = /error: ([^\n]+)\ntype: (.*?), line: (\d+), column_start: (\d+), column_end: (\d+), source_start: (\d+), source_end: (\d+)/;
		const match = colorRemoved?.match(regex);
		if (!match) {
			console.error(`[topi] Could not parse the error message.\n${colorRemoved}`);
			new Notice('[topi] Could not parse the error message, check logs');
			return null;
		}
		const from = Number(match[6]);
		const to = Number(match[7]);
		return {
			from,
			to,
			severity: "error",
			message: match[1]
		}
	}
}
