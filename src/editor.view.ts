import {
	HighlightStyle,
	syntaxHighlighting,
} from "@codemirror/language";
import {tags} from "@lezer/highlight";
import {Notice, TextFileView, TFile, WorkspaceLeaf} from "obsidian";
import {EditorView, keymap, tooltips} from "@codemirror/view";
import {gutter, GutterMarker} from '@codemirror/gutter';
import {topi, topiLanguage} from "codemirror-lang-topi";
import {indentWithTab} from "@codemirror/commands";
import {vim} from "@replit/codemirror-vim";
import {basicSetup} from "codemirror";
import {Diagnostic, linter, lintGutter} from "@codemirror/lint";
import TopiPlugin from "../main";
import {Compartment, EditorState, Text} from "@codemirror/state";
import {syntaxTree} from "@codemirror/language";
import {Completion, getCompletions} from "./completion";
import {playButton} from "./icons";
import {SyntaxNode} from "@lezer/common";
import {CompletionContext, CompletionResult} from "@codemirror/autocomplete";

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


function getClickedHierarchy(node: SyntaxNode, doc: Text, clickedPos: number): string | null {
	if (node.from <= clickedPos && clickedPos <= node.to) {
		if (node.name === "BoughStatement") {
			const nameNode = node.firstChild?.nextSibling;
			if (!nameNode) return null;
			const name = nameNode ? doc.sliceString(nameNode.from, nameNode.to) : 'anonymous';
			for (let i = node.firstChild; i != null; i = i.nextSibling) {
				const childResult = getClickedHierarchy(i as SyntaxNode, doc, clickedPos);
				if (childResult !== null) {
					return `${name}.${childResult}`;
				}
			}
			return name;
		}
		for (let i = node.firstChild; i != null; i = i.nextSibling) {
			const result = getClickedHierarchy(i as SyntaxNode, doc, clickedPos);
			if (result) return result;
		}
	}
	return null;
}

const tabSize = new Compartment()
const playMarker = new class extends GutterMarker {
	toDOM() {
		const svgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svgWrapper.innerHTML = playButton;
		svgWrapper.addClass('topi-play');
		return svgWrapper;
	}
}

export class TopiEditorView extends TextFileView {
	cm: EditorView;
	file: TFile | null;
	plugin: TopiPlugin;
	completion: Completion;
	completionSource: (ctx: CompletionContext) => (CompletionResult | null);

	constructor(leaf: WorkspaceLeaf, plugin: TopiPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.completion = new Completion(this.plugin.app);
		this.completionSource = getCompletions(this.completion);
		this.cm = new EditorView({
			extensions: this.createExtensions(),
			parent: this.contentEl,
		})
	}

	createExtensions() {
		// @ts-ignore
		const file = this.app.vault.adapter.basePath + '/' + this.file?.path;
		const runner = this.plugin.library;
		const completions = topiLanguage.data.of({autocomplete: this.completionSource});
		const extensions = [
			topi(),
			basicSetup,
			keymap.of([indentWithTab]),
			syntaxHighlighting(highlight),
			tabSize.of(EditorState.tabSize.of(4)),
			lintGutter(),
			gutter({
				lineMarker(view, line) {
					const lineContent = view.state.doc.sliceString(line.from, line.to);
					if (lineContent.match(/^\s*===/)) {
						return playMarker;
					}
					return null;
				},
				domEventHandlers: {
					mousedown(view, line) {
						// @ts-ignore
						const tree = syntaxTree(view.state);
						const path = getClickedHierarchy(tree.topNode, view.state.doc, line.to);
						if (path) runner.runTopi(['run', file, path]);
						return true
					}
				},
				initialSpacer: () => playMarker,
			}),
			tooltips({
				position: 'fixed',
				parent: document.body,
			}),
			completions,
			EditorView.lineWrapping,
			linter(async () => {
				if (!this.file) return [];
				const diagnostics: Diagnostic[] = [];
				await this.save();
				// @ts-ignore
				const path = this.app.vault.adapter.basePath + '/' + this.file.path;
				await this.plugin.library.runCompile(['compile', path, '--dry'], diagnostics);
				return diagnostics;
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					this.requestSave();
				}
			}),
			EditorView.theme({
				'&.cm-focused': {outline: 0},
				'.cm-gutters': {backgroundColor: 'inherit'},
				'.cm-activeLine': {backgroundColor: 'inherit'},
				'.cm-cursor': {borderLeftColor: 'var(--text-normal)'},
				'.cm-lint-marker': {marginTop: '25%'},
				".cm-content, .cm-gutters, .cm-gutter": {minHeight: "100vh"}
			}, {
				dark: document.body.hasClass('theme-dark'),
			})
		];
		//@ts-ignore
		if (this.app.vault.getConfig("vimMode")) extensions.push(vim());
		return extensions;
	}

	async onLoadFile(file: TFile): Promise<void> {
		const content = await this.app.vault.read(file);
		this.file = file;
		this.cm.setState(EditorState.create({extensions: this.createExtensions(), doc: content}));
	}

	async onUnloadFile(file: TFile): Promise<void> {
		await this.save(true);
		this.file = null;
	}

	getViewData(): string {
		return this.cm.state.doc.toString();
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) this.clear();
		else this.cm.dispatch({changes: [{from: 0, to: this.getViewData().length, insert: data}], sequential: true})
	}

	clear(): void {
		this.cm.dispatch({changes: [{from: 0, to: this.getViewData().length, insert: ''}], sequential: true})
	}

	async save(clear = false) {
		try {
			this.data = this.getViewData();
			if (this.file) await this.app.vault.modify(this.file, this.getViewData());
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

