import {
	HighlightStyle,
	syntaxHighlighting
} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {Notice, TextFileView, TFile, WorkspaceLeaf} from "obsidian";
import {EditorView, keymap} from "@codemirror/view";
import {topi} from "codemirror-lang-topi";
import {indentWithTab} from "@codemirror/commands";
import {vim} from "@replit/codemirror-vim";
import {basicSetup} from "codemirror";
import {Diagnostic, linter, lintGutter} from "@codemirror/lint";
import TopiPlugin from "../main";
import {autocompletion} from "@codemirror/autocomplete";

export const highlight = HighlightStyle.define([
	{
		tag: [tags.keyword, tags.definitionKeyword, tags.logicOperator, tags.arithmeticOperator, tags.compareOperator, tags.definitionOperator],
		color: "var(--h6-color)"
	},
	{tag: [tags.bool, tags.null], color: "var(--h6-color)"},
	{tag: tags.string, color: "var(--h3-color)"},
	{tag: [tags.number], color: "var(--text-accent)"},
	{tag: tags.controlKeyword, color: "var(--h2-color)", fontStyle: "bold"},
	{tag: [tags.lineComment, tags.comment], color: "var(--background-secondary-alt)", fontStyle: "italic"},
	{tag: tags.controlOperator, color: "var(--h6-color)"},
	{tag: tags.tagName, color: "var(--tag-color)", fontStyle: "italic"},
	{tag: tags.name, color: "var(--text-muted)"}
]);

export class TopiView extends TextFileView {
	cm: EditorView;
	file: TFile;
	plugin: TopiPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: TopiPlugin) {
		super(leaf);
		this.plugin = plugin;
		const extensions = [
			topi(),
			basicSetup,
			keymap.of([indentWithTab]),
			syntaxHighlighting(highlight),
			lintGutter(),
			autocompletion(),
			EditorView.lineWrapping,
			linter(async (view) => {
				if (!this.file) return [];
				const diagnostics: Diagnostic[] = [];
				await this.save();
				// @ts-ignore
				const path = this.app.vault.adapter.basePath + '/' + this.file.path;
				const compile = await this.plugin.runner.runCommand([path, '--dry'], diagnostics);
				return diagnostics;
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) this.requestSave();
			}),
			EditorView.theme({
				'&.cm-focused': {outline: 0},
				'.cm-gutters': {backgroundColor: 'inherit'},
				'.cm-activeLine': {backgroundColor: 'inherit'},
				'.cm-cursor': {borderLeftColor: 'var(--text-normal)' },
				'.cm-lint-marker': { marginTop: '25%' },
				".cm-content, .cm-gutters, .cm-gutter": {minHeight: "100vh"}
			}, {
				dark: document.body.hasClass('theme-dark'),
			})
		];
		//@ts-ignore
		if (this.app.vault.getConfig("vimMode")) extensions.push(vim());
		this.cm = new EditorView({
			extensions,
			parent: this.contentEl,
		})
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.file = file;
		const content = await this.app.vault.read(file);
		this.setViewData(content, false);
	}

	getViewData(): string {
		return this.cm.state.doc.toString();
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) this.clear();
		else this.cm.dispatch({changes: [{from: 0, to: this.getViewData().length, insert: data}]})
	}

	clear(): void {
		this.cm.dispatch({changes: [{from: 0, to: this.getViewData().length, insert: ''}]})
	}

	async save(clear: boolean = false) {
		try {
			if (this.file) await this.app.vault.modify(this.file, this.cm.state.doc.toString());
			if (clear) this.clear();
		} catch (err) {
			console.error('[topi]', 'Save failed:', err);
			new Notice('Save failed', 3000);
		}
	}

	canAcceptExtension(extension: string) {
		return extension == 'topi';
	}

	getViewType() {
		return "topi";
	}

	getIcon() {
		return "topi";
	}
}

