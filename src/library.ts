import { ChildProcess, exec, spawn } from "child_process";
import TopiPlugin from "../main";
import { Diagnostic } from "@codemirror/lint";
import { Notice } from "obsidian";
import { existsSync } from "fs";
import { promisify } from "util";

const execPromise = promisify(exec);

export class TopiLibrary {
	plugin: TopiPlugin;
	latestId: string;
	child: ChildProcess;

	constructor(plugin: TopiPlugin) {
		this.plugin = plugin;
	}

	public async runCompile(args: string[], diagnostics: Diagnostic[]): Promise<void> {
		const path = this.plugin.settings.path;
		if (!existsSync(path)) return;
		try {
			const id = Math.random().toString();
			this.latestId = id;
			const { stderr } = await execPromise(`${path} ${args.join(' ')}`)
			if (!stderr || this.latestId !== id) return;
			const result = this.parseCompilerError(stderr);
			if (result !== null) diagnostics.push(result);
		} catch (err) {
			console.error('[topi]', err.toString());
			new Notice('[topi] Error running topi');
		}
	}

	public async runTopi(args: string[]): Promise<void> {
		const path = this.plugin.settings.path;
		if (!existsSync(path)) return;
		const id = Math.random().toString();
		this.latestId = id;

		// use spawn so we can provide input
		if (this.child) this.child.kill("SIGTERM");
		const child = spawn(path, args);
		child.stdout.on('data', (data) => {
			if (this.latestId !== id) return;
			if (data.startsWith(":")) this.plugin.player.appendDialogue(data, this.continue);
			if (data.startsWith("[")) this.plugin.player.appendChoice(data, this.choose);
		});

		child.stderr.on('data', (data) => {
			if (this.latestId !== id) return;
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
		this.child.stdin?.write(" ");
		this.child.stdin?.end();
	}

	public async choose(i: number) {
		if (!this.child) return;
		this.child.stdin?.write(i.toString());
		this.child.stdin?.end();
		
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
