import {execSync, spawn} from "child_process";
import TopiPlugin from "../main";
import {Diagnostic} from "@codemirror/lint";
import {Notice} from "obsidian";
import * as path from "path";

const binPath: Record<string, string> = Object.freeze({
	darwin: "./topi/topi",
	win32: "./topi/topi.exe",
})

export class TopiRunner {
	plugin: TopiPlugin;
	get path(): string {
		// @ts-ignore
		return path.join(this.plugin.app.vault.adapter.basePath, this.plugin.app.vault.configDir, 'plugins', 'topiary-obsidian', binPath[process.platform]);
	}

	constructor(plugin: TopiPlugin) {
		this.plugin = plugin;
	}

	public async runCommand(args: string[], diagnostics: Diagnostic[]): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const platform = process.platform;
			const bin = binPath[platform];
			if (!bin) {
				reject(`Unsupported platform: ${platform}`);
				return;
			}

			const child = spawn(this.path, args);

			child.stdout.on("data", (msg: ArrayBuffer) => {
				console.log('[topi]', msg.toString());
			});
			child.stderr.on("data", (msg: ArrayBuffer) => {
				const result = this.parseError(msg.toString());
				if (!result) return;
				diagnostics.push(result);
			});

			child.on("error", (err) => {
				console.error('[topi]', err.toString());
				reject(err);
			});

			child.on("close", (code) => {
				if (code === 0) resolve("Complete");
				else reject("Error");
			});
		});

	}

	private parseError(msg: string | object): Diagnostic | null {
		if (typeof msg !== 'string') return null;
		const colorRemoved = msg.replace(/\x1b\[\d+(;\d+m|m)/g, "");
		const regex = /error: ([^\n]+)\ntype: (.*?), line: (\d+), column_start: (\d+), column_end: (\d+), source_start: (\d+), source_end: (\d+)/;
		const match = colorRemoved?.match(regex);
		if (!match) {
			execSync(`echo "${colorRemoved}" | pbcopy`)
			new Notice(`Could not parse the error message.\n${colorRemoved}`);
			return null;
		}
		const from = Number(match[6]);
		let to = Number(match[7]);
		return {
			from,
			to,
			severity: "error",
			message: match[1]
		}
	}
}
