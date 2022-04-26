
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

interface Definition {
	name: string;
	type: string;
}

let currentFileDefinitions: Definition[] = [ ];
let intrinsics: Definition[] = [
	{ name: "unpack", type: "function" },
	{ name: "concat", type: "function" },
	{ name: "len", type: "function" },
	{ name: "nop", type: "function" },
	{ name: "range", type: "function" },
	{ name: "is_subclass", type: "function" },
	{ name: "proto", type: "function" },
	{ name: "extend", type: "function" },
	{ name: "last", type: "function" },
	{ name: "body", type: "function" },
	{ name: "pairs", type: "function" },
	{ name: "panic", type: "function" },
	{ name: "identity", type: "function" },
	{ name: "count", type: "function" },
	{ name: "overwrite", type: "function" },
	{ name: "symbol", type: "function" },
]
let importedFiles: { [filename: string]: Definition[] } = [ ];
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
	if(method == "jammy/windowchange") {
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
			importedFiles[filename] = [ ];
		}
		catch {
			return;
		}
	}

    const ast = parser.program();
	// console.log(ast.definitions);

	if(hadParser) {
		for (const def of ast.definitions) {
			if(def.type == "simple_def")
				currentFileDefinitions.push({ name: def.name, type: def.value.type || "variable" });
		}
	}
	else {
		// console.log(ast.exports);
		for (const exp of ast.export) {
			const def = ast.definitions.find(x => x.name == exp);
			const d = { name: def.name, type: def.value.type || "variable" };
			importedFiles[filename].push(d);
		}
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

		const fullPath = path.join(properPath, "../" + file.value + ".jam");
		getDefsInFile(fullPath, null);
	}

	return ast;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();
	// const pattern = /\b[A-Z]{2,}\b/g;
	// let m: RegExpExecArray | null;

	// let problems = 0;
	const diagnostics: Diagnostic[] = [];

	// for (const iterator of object) {
		
	// }

	const scanner = new Scanner().scan(text);
    const parser = new Parser(scanner.tokens);

	
	currentFileDefinitions = [ ];
	imports = new Set<string>();

	const ast = getDefsInFile(textDocument.uri, parser);

	const keys = Object.keys(importedFiles);
	for (const imp of keys) {
		if(!imports.has(imp)) importedFiles[imp] = [ ];
	}

	if(ast.errors.length > 0) {
		for (const error of ast.errors) {
			const length = error.length || error.pos.length || 1;

			const diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: {
					start: textDocument.positionAt(error.pos.offset),
					end: textDocument.positionAt(error.pos.offset + length)
				},
				message: error.rawMessage,
				source: "ex"
			};

			// if(error.pos) {
			// 	const length = error.length || error.pos.length || 1;
			// 	diagnostic.range = 
			// }

			diagnostics.push(diagnostic);
		}
	}
	
	// while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
	// 	problems++;
	// 	const diagnostic: Diagnostic = {
	// 		severity: DiagnosticSeverity.Warning,
	// 		range: {
	// 			start: textDocument.positionAt(m.index),
	// 			end: textDocument.positionAt(m.index + m[0].length)
	// 		},
	// 		message: `${m[0]} is all uppercase.`,
	// 		source: 'ex'
	// 	};
	// 	if (hasDiagnosticRelatedInformationCapability) {
	// 		diagnostic.relatedInformation = [
	// 			{
	// 				location: {
	// 					uri: textDocument.uri,
	// 					range: Object.assign({}, diagnostic.range)
	// 				},
	// 				message: 'Spelling matters'
	// 			},
	// 			{
	// 				location: {
	// 					uri: textDocument.uri,
	// 					range: Object.assign({}, diagnostic.range)
	// 				},
	// 				message: 'Particularly for names'
	// 			}
	// 		];
	// 	}
	// 	diagnostics.push(diagnostic);
	// }

	// Send the computed diagnostics to VSCode.
	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
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
 
		const defs = [ ...currentFileDefinitions, ...intrinsics ];
		const importedFilenames = Object.keys(importedFiles);
		for (const file of importedFilenames) {
			defs.push(...importedFiles[file]);
		}

		for (let i = 0; i < defs.length; i++) {
			const x = defs[i];
			completions.push({
				label: x.name,
				kind: x.type == "function"? CompletionItemKind.Function : CompletionItemKind.Variable,
				data: i
			});
		}
		return completions;
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
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

// Listen on the connection
connection.listen();
