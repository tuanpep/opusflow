import * as vscode from 'vscode';
import * as path from 'path';
import { AuthManager } from './auth/authManager';
import { AgentAuth } from './auth/agentAuth';
import { SidebarProvider } from './SidebarProvider';
import { AuthSidebarProvider } from './ui/authSidebar';
import { FileWatcher } from './utils/fileWatcher';
import { OpusFlowExplorerProvider } from './ui/opusflowExplorer';
import { OpusFlowWrapper } from './cli/opusflowWrapper';
import { WebviewProvider } from './ui/webviewProvider';
import { PlanCommands } from './commands/planCommands';
import { VerifyCommands } from './commands/verifyCommands';
import { AgentCommands } from './commands/agentCommands';
import { SpecCommands } from './commands/specCommands';
import { TaskCommands } from './commands/taskCommands';
import { WorkflowCommands } from './commands/workflowCommands';

interface OpusFlowExtensionContext {
    statusBarItem: vscode.StatusBarItem;
    outputChannel: vscode.OutputChannel;
    currentAgent: string | undefined;
    authManager: AuthManager;
    fileWatcher: FileWatcher;

    cli: OpusFlowWrapper;
    webviewProvider: WebviewProvider;
    authSidebarProvider: AuthSidebarProvider;
    sidebarProvider: SidebarProvider;
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
    const config = vscode.workspace.getConfiguration('opusflow');
    const cliPath = config.get<string>('cliPath') || 'opusflow';
    const cli = new OpusFlowWrapper(cliPath);

    // Initialize Webview Provider
    const webviewProvider = new WebviewProvider(context.extensionUri);

    // Initialize Auth Sidebar
    const authSidebarProvider = new AuthSidebarProvider(context.extensionUri, authManager);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AuthSidebarProvider.viewType, authSidebarProvider)
    );

    // Initialize Sidebar
    const sidebarProvider = new SidebarProvider(context.extensionUri, authManager);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider));

    // Store extension context
    const extensionContext: OpusFlowExtensionContext = {
        statusBarItem,
        outputChannel,
        currentAgent: vscode.workspace.getConfiguration('opusflow').get('defaultAgent'),
        authManager,
        fileWatcher,
        cli,
        webviewProvider,
        authSidebarProvider,
        sidebarProvider
    };

    // Initialize Tree View
    const explorerProvider = new OpusFlowExplorerProvider(fileWatcher);
    vscode.window.registerTreeDataProvider('opusflowExplorer', explorerProvider);

    // Set initial agent
    if (extensionContext.currentAgent) {
        authSidebarProvider.setAgent(extensionContext.currentAgent);
    }

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
    // Initialize command handlers
    const planHandlers = new PlanCommands(extensionContext.cli);
    const verifyHandlers = new VerifyCommands(extensionContext.cli);
    const agentHandlers = new AgentCommands(extensionContext.cli, extensionContext.authManager);
    const specHandlers = new SpecCommands(extensionContext.cli);
    const taskHandlers = new TaskCommands(extensionContext.cli);
    const workflowHandlers = new WorkflowCommands(extensionContext.cli);

    // ============ Original Commands ============

    // Create Plan command
    const createPlanCmd = vscode.commands.registerCommand('opusflow.createPlan', () =>
        planHandlers.createPlan(context)
    );

    // Verify Plan command
    const verifyPlanCmd = vscode.commands.registerCommand('opusflow.verifyPlan', (item?: any) =>
        verifyHandlers.verifyPlan(item)
    );

    // Execute Workflow command
    const executeWorkflowCmd = vscode.commands.registerCommand('opusflow.executeWorkflow', async (item?: any) => {
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
    });

    // Open Workflow Panel command
    const openWorkflowCmd = vscode.commands.registerCommand('opusflow.openWorkflow', () => {
        extensionContext.webviewProvider.showWorkflow();
    });

    // Refresh Explorer command
    const refreshExplorerCmd = vscode.commands.registerCommand('opusflow.refreshExplorer', () =>
        explorerProvider.refresh()
    );

    // Select Agent command
    const selectAgentCmd = vscode.commands.registerCommand('opusflow.selectAgent', async (agentId?: string) => {
        // If agent passed directly (e.g. from Sidebar), use it
        if (agentId) {
            // Validate agentId
            const validAgents = ['prompt', 'gemini', 'cursor'];
            if (validAgents.includes(agentId)) {
                // Allow loose matching or strict?
                // Update state
                extensionContext.currentAgent = agentId;
                extensionContext.statusBarItem.text = `$(rocket) OpusFlow [${agentId}]`;
                extensionContext.outputChannel.appendLine(`Selected agent: ${agentId}`);
                // Update sidebar UI
                extensionContext.authSidebarProvider.setAgent(agentId);

                // Update Main Sidebar UI
                extensionContext.sidebarProvider.updateAgentStatus(agentId, false); // Default to false until we check connection, or check it here

                vscode.window.showInformationMessage(`Selected agent: ${agentId}`);
                return;
            }
        }

        const authStatuses = await extensionContext.authManager.checkSessions();

        const agents = [
            { label: 'gemini', description: 'Gemini CLI' },
            { label: 'cursor', description: 'Cursor Agent' },
            { label: 'prompt', description: 'Generate prompt only' }
        ];

        const selected = await vscode.window.showQuickPick(agents, {
            placeHolder: 'Select AI agent'
        });

        if (selected) {
            const agent = selected.label;
            extensionContext.currentAgent = agent;
            extensionContext.statusBarItem.text = `$(rocket) OpusFlow [${agent}]`;
            extensionContext.outputChannel.appendLine(`Selected agent: ${agent}`);

            // Update sidebar UI
            extensionContext.authSidebarProvider.setAgent(agent);

            vscode.window.showInformationMessage(`Selected agent: ${agent}`);
        }
    });

    // Authenticate Agent command
    const authenticateAgentCmd = vscode.commands.registerCommand('opusflow.authenticateAgent', () => {
        vscode.commands.executeCommand('opusflowChat.focus');
    });

    // Copy Verification Prompt command
    const copyVerificationPromptCmd = vscode.commands.registerCommand(
        'opusflow.copyVerificationPrompt',
        async (item: any) => {
            if (!item || !item.label) return;
            try {
                const prompt = await extensionContext.cli.prompt('verify', item.label);
                await vscode.env.clipboard.writeText(prompt);
                vscode.window.showInformationMessage('📋 Verification prompt copied to clipboard!');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate prompt: ${error.message}`);
            }
        }
    );

    // ============ New SDD Commands ============

    // Generate Codebase Map
    const generateMapCmd = vscode.commands.registerCommand('opusflow.generateMap', () => specHandlers.generateMap());

    // Create Specification
    const createSpecCmd = vscode.commands.registerCommand('opusflow.createSpec', () =>
        specHandlers.createSpec(context)
    );

    // Decompose Plan
    const decomposePlanCmd = vscode.commands.registerCommand('opusflow.decomposePlan', (item?: any) =>
        taskHandlers.decomposePlan(item)
    );

    // Get Next Task
    const nextTaskCmd = vscode.commands.registerCommand('opusflow.nextTask', (item?: any) =>
        taskHandlers.nextTask(item)
    );

    // Complete Task
    const completeTaskCmd = vscode.commands.registerCommand('opusflow.completeTask', (item?: any) =>
        taskHandlers.completeTask(item)
    );

    // Execute Task
    const execTaskCmd = vscode.commands.registerCommand('opusflow.execTask', (item?: any) =>
        taskHandlers.execTask(item)
    );

    // Workflow Status
    const workflowStatusCmd = vscode.commands.registerCommand('opusflow.workflowStatus', () =>
        workflowHandlers.showStatus()
    );

    // Workflow Start
    const workflowStartCmd = vscode.commands.registerCommand('opusflow.workflowStart', () =>
        workflowHandlers.startWorkflow()
    );

    // Workflow Next
    const workflowNextCmd = vscode.commands.registerCommand('opusflow.workflowNext', () =>
        workflowHandlers.showNextGuidance()
    );

    // Setup API Keys command
    const agentAuth = new AgentAuth(context);
    const setupApiKeysCmd = vscode.commands.registerCommand('opusflow.setupApiKeys', () => agentAuth.setupApiKeys());

    // Add all commands to subscriptions for cleanup
    context.subscriptions.push(
        // Original commands
        createPlanCmd,
        verifyPlanCmd,
        executeWorkflowCmd,
        openWorkflowCmd,
        refreshExplorerCmd,
        selectAgentCmd,
        authenticateAgentCmd,
        copyVerificationPromptCmd,
        // New SDD commands
        generateMapCmd,
        createSpecCmd,
        decomposePlanCmd,
        nextTaskCmd,
        completeTaskCmd,
        execTaskCmd,
        workflowStatusCmd,
        workflowStartCmd,
        workflowNextCmd,
        setupApiKeysCmd
    );
}
