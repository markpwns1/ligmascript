
// @ts-nocheck

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	DidOpenTextDocumentNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

const Parser = require("../../../parser-new").Parser;
const Scanner = require("../../../scanner").Scanner;
const semanticAnalyser = require("../../../analysis");
const fs = require("fs");
const url = require('url');

import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import path = require('path');

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

interface SemanticToken {
	type: string;
	beginLn: number;
	beginCol: number;
	endLn: number;
	endCol: number;
}

interface Definition {
	name: string;
	type: string;
}

interface SemanticInfo {
	semanticTokens: SemanticToken[];
	definitions: Definition[];
}

let currentFileDefinitions: SemanticInfo = {
	semanticTokens: [ ],
	definitions: [ ]
};

let intrinsics: Definition[] = semanticAnalyser.INTRINSICS.map((name: any) => ({ name: name, type: "function" }));

let importedFiles: { [filename: string]: SemanticInfo[] } = { };
let currentFile: string;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	// connection.client.register(DidOpenTextDocumentNotification.type, undefined);
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

connection.onNotification((method, params) => {
	// console.log(method);
	if(method == "ligmascript/windowchange") {
		// let text = params[3];
		// const doc = {
		// 	uri: params[0],
		// 	getText: () => params[3]
		// };
		const doc = TextDocument.create(...params[0]);
		// console.log(doc.getText());
		// console.log(params);
		// console.log(text);
		importedFiles = { };
		validateTextDocument(doc);
	}
})


// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

let imports = new Set<string>();

function getDefsInFile(filename, parser) {
	const hadParser = parser != null;
	if(!parser) {
		try {
			// console.log(filename);
			imports.add(filename);
			if(importedFiles[filename]) return;

			// let properFileName;
			// try {
			// 	properFileName = url.pathToFileURL(filename).toString();
			// 	console.log(properFileName);
			// 	console.log(documents.all().map(x => x.uri.toString()));
			// }
			// catch {
			// 	properFileName = filename;
			// }

			const openedFile = documents.all().find(x => url.fileURLToPath(x.uri).toString() == filename);
			let source;
			if(openedFile) {
				source = openedFile.getText();
			}
			else {
				source = fs.readFileSync(filename, "utf-8");
			}

			const scanner = new Scanner().scan(source);
			parser = new Parser(scanner.tokens);

			// console.log("GOT HERE");
			importedFiles[filename] = {
				semanticTokens: [ ],
				definitions: [ ]
			};
		}
		catch {
			return;
		}
	}

    const ast = parser.program();
	const semanticInfo = semanticAnalyser.analyse(filename, ast, true);
	// console.log(ast.definitions);

	if(hadParser) {
		for (const def of ast.definitions) {
			if(def.type == "simple_def") 
				currentFileDefinitions.definitions.push({ name: def.name.value, type: def.value.type || "variable" });
		}

		// console.log("WERDEN");
		// console.log(semanticInfo.semanticTokens);

		currentFileDefinitions.semanticTokens.push(...semanticInfo.semanticTokens.map(x => ({
			type: x.type,
			beginLn: x.token.pos.ln,
			beginCol: x.token.pos.col,
			endLn: x.token.pos.ln,
			endCol: x.token.pos.col + x.token.pos.length
		})));
	}
	else {
		// console.log(ast.exports);
		for (const exp of ast.export) {
			const def = ast.definitions.find(x => x.name.value == exp);
			if(!def) continue;
			const d = { name: def.name.value, type: def.value.type || "variable" };
			importedFiles[filename].definitions.push(d);
		}

		importedFiles[filename].semanticTokens.push(...semanticInfo.semanticTokens.map(x => ({
			type: x.type,
			beginLn: x.token.pos.ln,
			beginCol: x.token.pos.col,
			endLn: x.token.pos.ln,
			endCol: x.token.pos.col + x.token.pos.length
		})));
	}
	// for (const def of ast.definitions) {
	// 	// if(ast.type == "simple_def")
	// 	const d = { name: def.name, type: def.value.type || "variable" };
	// 	if(hadParser) {
	// 		currentFileDefinitions.push(d);
	// 	}
	// 	else {
	// 		// console.log(importedFiles[filename]);
	// 		importedFiles[filename].push(d);
	// 	}
	// }

	for (const file of ast.imports) {
		let properPath;
		try {
			properPath = url.fileURLToPath(filename);
		}
		catch {
			properPath = filename;
		}

		const fullPath = path.join(properPath, "../" + file.value + ".li");
		getDefsInFile(fullPath, null);
	}

	ast.errors = [ ...ast.errors, ...semanticInfo.errors, ...semanticInfo.warnings ];

	return ast;
}

let backgroundData = {
	// errors: [ ],
	// warnings: [ ],
	variables: [ ],
}

let semanticTokens;

let analysisInfo;

let currentDoc;

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// const settings = await getDocumentSettings(textDocument.uri);
	currentDoc = textDocument;

	const decodedURI = decodeURIComponent(textDocument.uri);
	const filepath = path.normalize(decodedURI.startsWith("file:")? decodedURI.substring(8) : decodedURI);
	const text = textDocument.getText();
	const scanner = new Scanner().scan(text);
    const parser = new Parser(filepath, scanner.tokens);

	let toReport;
	if(currentFile == textDocument.uri) {
		console.log("Updating file: " + textDocument.uri);
		analysisInfo = semanticAnalyser.analyse(filepath, parser.program(), true, backgroundData.variables);

		toReport = [
			// ...backgroundData.errors,
			...analysisInfo.errors,
			// ...backgroundData.warnings,
			...analysisInfo.warnings
		];
	}
	else {
		console.log("Loading project at root: " + textDocument.uri);
		currentFile = textDocument.uri;

		analysisInfo = semanticAnalyser.analyse(decodeURIComponent(filepath), parser.program(), false);
		
		// backgroundData.errors = analysisInfo.backgroundErrors;
		// backgroundData.warnings = analysisInfo.backgroundWarnings;
		backgroundData.variables = analysisInfo.backgroundVariables;
		
		toReport = [ 
			...analysisInfo.backgroundErrors, 
			...analysisInfo.errors, 
			...analysisInfo.backgroundWarnings, 
			...analysisInfo.warnings 
		];
	}

	// semanticTokens = info.semanticTokens.map(x => ({

	const diagnosticsPerFile = { };
		
	for(const error of toReport) {

		const range = error.pos? {
			start: textDocument.positionAt(error.pos.offset),
			end: textDocument.positionAt(error.pos.offset + (error.length || error.pos.length))
		} : {
			start: textDocument.positionAt(0),
			end: textDocument.positionAt(1)
		};

		const diagnostic: Diagnostic = {
			severity: error.isWarning? DiagnosticSeverity.Warning : DiagnosticSeverity.Error,
			range: range,
			message: error.rawMessage,
			source: "ligmascript",
		};

		if(!diagnosticsPerFile[error.filename]) diagnosticsPerFile[error.filename] = [ ];
		diagnosticsPerFile[error.filename].push(diagnostic);
	};

	let localDiagnosticsUpdated = false;
	for (const file of Object.keys(diagnosticsPerFile)) {
		const fp = path.normalize(file);
		const t = "file:///" + path.normalize(file);
		if(fp == filepath) localDiagnosticsUpdated = true;
		connection.sendDiagnostics({ uri: t, diagnostics: diagnosticsPerFile[file] });
	}

	if(!localDiagnosticsUpdated) {
		connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [ ] });
	}
	
	// Send the computed diagnostics to VSCode.
	// connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: diagnostics });
	// console.log(analysisInfo.semanticTokens.length);
	analysisInfo.semanticTokens = analysisInfo.semanticTokens.filter(x => x && x.token && x.token.pos && x.token.pos.ln != undefined && x.token.pos.col != undefined);
	connection.sendNotification("ligmascript/semantictokenupdate", analysisInfo.semanticTokens.map(x => ({
		type: x.type,
		beginLn: x.token.pos.ln,
		beginCol: x.token.pos.col,
		endLn: x.token.pos.ln,
		endCol: x.token.pos.col + x.token.pos.length
	})));
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

function leq(a: { ln: number, col: number }, b: { ln: number, col: number }) {
	return a.ln < b.ln || (a.ln == b.ln && a.col <= b.col);
}

function within(a: { ln: number, col: number }, b: { ln: number, col: number }, c: { ln: number, col: number }) {
	return leq(a, b) && leq(b, c);
}

const varTypeToKind = {
	"function": CompletionItemKind.Function,
	"variable": CompletionItemKind.Variable,
	"class": CompletionItemKind.Class
}

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		let pos = {
			ln: _textDocumentPosition.position.line + 1,
			col: _textDocumentPosition.position.character + 1
		};
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		// return [
		// 	{
		// 		label: 'TypeScript',
		// 		kind: CompletionItemKind.Text,
		// 		data: 1
		// 	},
		// 	{
		// 		label: 'JavaScript',
		// 		kind: CompletionItemKind.Text,
		// 		data: 2
		// 	}
		// ];
		const completions: CompletionItem[] = [ ];
 
		const defs = [ ...backgroundData.variables, ...analysisInfo.variables ];

		for (let i = 0; i < defs.length; i++) {
			const x = defs[i];
			// if(x.name == "b")
			// console.log(x);

			if(x.name == "_"/* || !x.global*/) continue;
			if(!x.global && x.scope && !x.scope.fake && !within(x.scope.firstToken.pos, pos, x.scope.lastToken.pos)) 
				continue;

			completions.push({
				label: x.name,
				kind: varTypeToKind[x.type] || CompletionItemKind.Variable,
				data: i
			});
		}
		return completions;
	}
);



// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
		// if (item.data === 1) {
		// 	item.detail = 'TypeScript details';
		// 	item.documentation = 'TypeScript documentation';
		// } else if (item.data === 2) {
		// 	item.detail = 'JavaScript details';
		// 	item.documentation = 'JavaScript documentation';
		// }
		return item;
	}
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// function getSemanticTokens() {
// 	// const toks = [ ...currentFileDefinitions.semanticTokens ];
// 	// const importedFilenames = Object.keys(importedFiles);
// 	// for (const file of importedFilenames) {
// 	// 	toks.push(...importedFiles[file].semanticTokens);
// 	// }
// 	// // console.log("TOKENS");
// 	// // console.log(toks);
// 	// return toks;

// 	return analysisInfo.semanticTokens;
// }

// Listen on the connection
connection.listen();
