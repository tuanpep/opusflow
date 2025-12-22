import * as vscode from 'vscode';
import * as path from 'path';
import { OpusFlowExplorerProvider } from './ui/opusflowExplorer';
import { OpusFlowWrapper } from './cli/opusflowWrapper';
import { WebviewProvider } from './ui/webviewProvider';
import { FileWatcher } from './utils/fileWatcher';

interface OpusFlowExtensionContext {
    statusBarItem: vscode.StatusBarItem;
    outputChannel: vscode.OutputChannel;
    fileWatcher: FileWatcher;
    cli: OpusFlowWrapper;
    webviewProvider: WebviewProvider;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('OpusFlow extension is now active (Read-Only Mode)');

    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('OpusFlow');
    outputChannel.appendLine('OpusFlow extension activated');

    // Create status bar item
    const statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    // Initialize File Watcher
    const fileWatcher = new FileWatcher();
    context.subscriptions.push(fileWatcher);

    // Initialize CLI Wrapper
    const config = vscode.workspace.getConfiguration('opusflow');
    const cliPath = config.get<string>('cliPath') || 'opusflow';
    const cli = new OpusFlowWrapper(cliPath);

    // Initialize Webview Provider (Dashboard)
    const webviewProvider = new WebviewProvider(context.extensionUri, fileWatcher);

    // Store extension context
    const extensionContext: OpusFlowExtensionContext = {
        statusBarItem,
        outputChannel,
        fileWatcher,
        cli,
        webviewProvider
    };

    // Initialize Tree View
    const explorerProvider = new OpusFlowExplorerProvider(fileWatcher);
    vscode.window.registerTreeDataProvider('opusflowExplorer', explorerProvider);

    // Register commands
    registerCommands(context, extensionContext, explorerProvider);

    // Show status bar
    statusBarItem.show();

    // Log activation
    vscode.window.showInformationMessage('OpusFlow extension activated!');
}

export function deactivate() {
    console.log('OpusFlow extension is now deactivated');
}

function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);

    statusBarItem.text = '$(rocket) OpusFlow';
    statusBarItem.tooltip = 'OpusFlow: Spec-Driven Development';
    statusBarItem.command = 'opusflow.workflowStatus';

    return statusBarItem;
}

function registerCommands(
    context: vscode.ExtensionContext,
    extensionContext: OpusFlowExtensionContext,
    explorerProvider: OpusFlowExplorerProvider
) {
    // Open Workflow Panel command
    const openWorkflowCmd = vscode.commands.registerCommand('opusflow.openWorkflow', () => {
        extensionContext.webviewProvider.showWorkflow();
    });

    // Refresh Explorer command
    const refreshExplorerCmd = vscode.commands.registerCommand('opusflow.refreshExplorer', () =>
        explorerProvider.refresh()
    );

    // Workflow Status (Status Bar click)
    const workflowStatusCmd = vscode.commands.registerCommand('opusflow.workflowStatus', () =>
        extensionContext.webviewProvider.showWorkflow()
    );

    // Add all commands to subscriptions for cleanup
    context.subscriptions.push(
        openWorkflowCmd,
        refreshExplorerCmd,
        workflowStatusCmd
    );
}
