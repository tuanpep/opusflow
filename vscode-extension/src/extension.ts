import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AuthManager } from './auth/authManager';
import { AuthWebview } from './ui/authWebview';
import { AuthProviderType } from './auth/types';
import { FileWatcher } from './utils/fileWatcher';
import { OpusFlowExplorerProvider } from './ui/opusflowExplorer';
import { OpusFlowWrapper } from './cli/opusflowWrapper';
import { WebviewProvider } from './ui/webviewProvider';
import { WorkflowWebview } from './ui/workflowWebview';
import { PlanCommands } from './commands/planCommands';
import { VerifyCommands } from './commands/verifyCommands';
import { AgentCommands } from './commands/agentCommands';

interface OpusFlowExtensionContext {
    statusBarItem: vscode.StatusBarItem;
    outputChannel: vscode.OutputChannel;
    currentAgent: string | undefined;
    authManager: AuthManager;
    fileWatcher: FileWatcher;
    cli: OpusFlowWrapper;
    webviewProvider: WebviewProvider;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('OpusFlow extension is now active');

    // Create output channel for logging
    const outputChannel = vscode.window.createOutputChannel('OpusFlow');
    outputChannel.appendLine('OpusFlow extension activated');

    // Create status bar item
    const statusBarItem = createStatusBarItem();
    context.subscriptions.push(statusBarItem);

    // Initialize Auth Manager
    const authManager = new AuthManager(context);

    // Initialize File Watcher
    const fileWatcher = new FileWatcher();
    context.subscriptions.push(fileWatcher);

    // Initialize CLI Wrapper
    const cli = new OpusFlowWrapper();

    // Initialize Webview Provider
    const webviewProvider = new WebviewProvider(context.extensionUri);

    // Store extension context
    const extensionContext: OpusFlowExtensionContext = {
        statusBarItem,
        outputChannel,
        currentAgent: vscode.workspace.getConfiguration('opusflow').get('defaultAgent'),
        authManager,
        fileWatcher,
        cli,
        webviewProvider
    };

    // Initialize Tree View
    const explorerProvider = new OpusFlowExplorerProvider(fileWatcher);
    vscode.window.registerTreeDataProvider('opusflowExplorer', explorerProvider);

    // Register commands
    registerCommands(context, extensionContext);

    // Show status bar
    statusBarItem.show();

    // Log activation
    vscode.window.showInformationMessage('OpusFlow extension activated!');
}

export function deactivate() {
    console.log('OpusFlow extension is now deactivated');
}

function createStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );

    statusBarItem.text = '$(rocket) OpusFlow';
    statusBarItem.tooltip = 'OpusFlow: Plan-First Development';
    statusBarItem.command = 'opusflow.openWorkflow';

    return statusBarItem;
}

function registerCommands(
    context: vscode.ExtensionContext,
    extensionContext: OpusFlowExtensionContext
) {
    const planHandlers = new PlanCommands(extensionContext.cli);
    const verifyHandlers = new VerifyCommands(extensionContext.cli);
    const agentHandlers = new AgentCommands(extensionContext.cli, extensionContext.authManager);

    // Create Plan command
    const createPlanCmd = vscode.commands.registerCommand(
        'opusflow.createPlan',
        () => planHandlers.createPlan(context)
    );

    // Verify Plan command
    const verifyPlanCmd = vscode.commands.registerCommand(
        'opusflow.verifyPlan',
        (item?: any) => verifyHandlers.verifyPlan(item)
    );

    // Execute Workflow command
    const executeWorkflowCmd = vscode.commands.registerCommand(
        'opusflow.executeWorkflow',
        async (item?: any) => {
            let planFile = item?.label;
            if (!planFile) {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor?.document.fileName.includes('opusflow-planning/plans')) {
                    planFile = path.basename(activeEditor.document.fileName);
                }
            }
            if (planFile) {
                await agentHandlers.executeWorkflow(planFile);
            } else {
                vscode.window.showErrorMessage('Please select a plan file to execute.');
            }
        }
    );

    // Open Workflow Panel command
    const openWorkflowCmd = vscode.commands.registerCommand(
        'opusflow.openWorkflow',
        () => {
            extensionContext.webviewProvider.showWorkflow();
        }
    );

    // Select Agent command
    const selectAgentCmd = vscode.commands.registerCommand(
        'opusflow.selectAgent',
        async () => {
            const authStatuses = await extensionContext.authManager.checkSessions();

            const agents = [
                { label: 'cursor-agent', description: authStatuses.get(AuthProviderType.Cursor) ? '$(check) Authenticated' : '$(x) Not Authenticated' },
                { label: 'gemini-cli', description: authStatuses.get(AuthProviderType.Gemini) ? '$(check) Authenticated' : '$(x) Not Authenticated' },
                { label: 'claude-cli', description: authStatuses.get(AuthProviderType.Claude) ? '$(check) Authenticated' : '$(x) Not Authenticated' }
            ];

            const selected = await vscode.window.showQuickPick(agents, {
                placeHolder: 'Select AI agent'
            });

            if (selected) {
                const agent = selected.label;
                extensionContext.currentAgent = agent;
                extensionContext.statusBarItem.text = `$(rocket) OpusFlow [${agent}]`;
                extensionContext.outputChannel.appendLine(`Selected agent: ${agent}`);
                vscode.window.showInformationMessage(`Selected agent: ${agent}`);
            }
        }
    );

    // Authenticate Agent command
    const authenticateAgentCmd = vscode.commands.registerCommand(
        'opusflow.authenticateAgent',
        () => {
            AuthWebview.show(context, extensionContext.authManager);
        }
    );

    // Add all commands to subscriptions for cleanup
    context.subscriptions.push(
        createPlanCmd,
        verifyPlanCmd,
        executeWorkflowCmd,
        openWorkflowCmd,
        selectAgentCmd,
        authenticateAgentCmd
    );
}
