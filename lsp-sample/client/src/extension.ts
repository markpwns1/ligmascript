/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from 'path';
import { 
	workspace, 
	ExtensionContext, 
	window, 
	DocumentSemanticTokensProvider, 
	languages, 
	SemanticTokensLegend, 
	SemanticTokensBuilder,
	Range,
	Position,
	SemanticTokens,
	TextDocument,
	ProviderResult,
} from 'vscode';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

const ligmascriptSelector = { scheme: 'file', language: 'ligmascript' };

const tokenTypes = ['class', 'interface', 'enum', 'function', 'variable'];
const tokenModifiers = ['declaration', 'documentation'];
const legend = new SemanticTokensLegend(tokenTypes, tokenModifiers);

let semanticTokens = [ ];

const provider: DocumentSemanticTokensProvider = {
  provideDocumentSemanticTokens(
    document: TextDocument
  ): ProviderResult<SemanticTokens> {
    // analyze the document and return semantic tokens

    const tokensBuilder = new SemanticTokensBuilder(legend);

	for (const t of semanticTokens) {
		// console.log(t.type);
		tokensBuilder.push(
			new Range(new Position(t.beginLn - 1, t.beginCol - 1), new Position(t.endLn - 1, t.endCol - 1)), t.type, [ ]);
	}

    // // on line 1, characters 1-5 are a class declaration
    // tokensBuilder.push(
    //   new Range(new Position(1, 1), new Position(1, 5)),
    //   'class',
    //   ['declaration']
    // );

	// console.log("CHANGE");

    return tokensBuilder.build();
  }
  
};

export function activate(context: ExtensionContext) {
	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);
	// The debug options for the server
	// --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
	const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: [ligmascriptSelector],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	window.onDidChangeActiveTextEditor(e => {
		client.sendNotification("ligmascript/windowchange", [e.document.uri.toString(), "ligmascript", e.document.version, e.document.getText() ]);
	});


	languages.registerDocumentSemanticTokensProvider(ligmascriptSelector, provider, legend);

	
	client.onReady().then(() => {
		client.onNotification("ligmascript/semantictokenupdate", tokens => {
			// // console.log(tokens);
			// console.log("AAA");
			// // provider.onDidChangeSemanticTokens();
			// provider.provideDocumentSemanticTokens();
			// Sema
			// console.log("AAAA");
			// console.log(tokens);
			semanticTokens = tokens;
		});
	});

	
	// Start the client. This will also launch the server
	client.start();

}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}



