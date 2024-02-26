import {exec} from "child_process";
import TopiPlugin from "../main";
import {Diagnostic} from "@codemirror/lint";
import {Notice} from "obsidian";
import {existsSync} from "fs";
import {promisify} from "util";

const execPromise = promisify(exec);

export class TopiRunner {
	plugin: TopiPlugin;
	latestId: string;

	constructor(plugin: TopiPlugin) {
		this.plugin = plugin;
	}

	public async runCommand(args: string[], diagnostics: Diagnostic[]): Promise<void> {
		const path = this.plugin.settings.path;
		if (!existsSync(path)) return;
		try {
			const id = Math.random().toString();
			this.latestId = id;
			const {stderr} = await execPromise(`${path} ${args.join(' ')}`)
			if (!stderr || this.latestId !== id) return;
			const result = this.parseError(stderr);
			if (result !== null) diagnostics.push(result);
		} catch (err) {
			console.error('[topi]', err.toString());
			new Notice('[topi] Error running topi');
		}
	}

	private parseError(msg: string | object): Diagnostic | null {
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
