import {ChildProcess, exec, spawn} from "child_process";
import TopiPlugin from "../main";
import {Diagnostic} from "@codemirror/lint";
import {normalizePath, Notice} from "obsidian";
import {existsSync} from "fs";
import {promisify} from "util";
import {EOL} from 'os';

const execPromise = promisify(exec);

export class TopiLibrary {
	plugin: TopiPlugin;
	latestCompileId: string;
	latestRunId: string;
	currentArgs: string[];
	history: number[];
	child: ChildProcess;
	// eslint-disable-next-line no-control-regex
	colorRegex = /\x1b\[\d+(;\d+m|m)/g;

	constructor(plugin: TopiPlugin) {
		this.plugin = plugin;
		this.history = [];
		this.continue = this.continue.bind(this);
		this.choose = this.choose.bind(this);
	}

	public async runCompile(args: string[], diagnostics: Diagnostic[]): Promise<void> {
		const path = this.plugin.settings.path;
		if (!existsSync(path)) return;
		this.currentArgs = args;
		try {
			const id = Math.random().toString();
			this.latestCompileId = id;
			const {stderr} = await execPromise(`${path} ${args.join(' ')}`)
			if (!stderr || this.latestCompileId !== id) return;
			const result = this.onCompilerError(stderr);
			if (result !== null && normalizePath(result.file) == normalizePath(this.currentArgs[1])) diagnostics.push(result);
		} catch (err) {
			console.error('[topi]', err.toString());
			new Notice('[topi] Error running topi');
		}
	}

	public async restart() {
		return this.runTopi(this.currentArgs);
	}

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
			if (this.latestRunId !== id) return;
			data = data.toString();
			data = data.replace(this.colorRegex, "");
			if (data.startsWith('error:')) {
				const parsed =  this.parseCompilerError(data);
				if (parsed) data = parsed.message + '\n' + parsed.file + '\nLine ' + parsed.line;
			}
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
		this.child.stdin?.write(EOL);
	}

	public async choose(i: number) {
		if (!this.child) return;
		this.child.stdin?.write(`${i.toString()}${EOL}`);
	}

	private onCompilerError(msg: string | object): Diagnostic & { file: string, line: number }| null {
		if (typeof msg !== 'string') return null;
		const colorRemoved = msg.replace(this.colorRegex, "");
		return this.parseCompilerError(colorRemoved);
	}

	private parseCompilerError(msg: string): Diagnostic & { file: string, line: number } | null {
		const regex = /error: ([^\n]+)\nfile: ([^\n]+)\ntype: (.*?), line: (\d+), column_start: (\d+), column_end: (\d+), source_start: (\d+), source_end: (\d+)/;
		const match = msg?.match(regex);
		if (!match) {
			new Notice('[topi] Could not parse the error message');
			return null;
		}
		const filePath = match[2];
		const from = Number(match[7]);
		const to = Number(match[8]);
		return {
			line: Number(match[4]),
			file: filePath,
			from,
			to,
			severity: "error",
			message: match[1]
		}

	}

}
