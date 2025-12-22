import * as vscode from 'vscode';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';
import { AuthManager } from '../auth/authManager';
import { AuthProviderType } from '../auth/types';
import { WorkflowWebview } from '../ui/workflowWebview';
import { WorkflowOrchestrator } from './workflowOrchestrator';

export class AgentCommands {
    private orchestrator: WorkflowOrchestrator;

    constructor(
        private cli: OpusFlowWrapper,
        private authManager: AuthManager
    ) {
        this.orchestrator = new WorkflowOrchestrator(cli, authManager);
    }

    public async executeWorkflow(planFile: string) {
        const currentAgent = vscode.workspace.getConfiguration('opusflow').get<string>('defaultAgent') as AuthProviderType;

        // 1. Check Authentication
        const isAuthenticated = await this.authManager.isAuthenticated(currentAgent);
        if (!isAuthenticated) {
            const action = await vscode.window.showErrorMessage(
                `Agent "${currentAgent}" is not authenticated.`,
                'Authenticate Now'
            );
            if (action === 'Authenticate Now') {
                vscode.commands.executeCommand('opusflow.authenticateAgent');
            }
            return;
        }

        // 2. Open Workflow Panel
        vscode.commands.executeCommand('opusflow.openWorkflow');

        // Wait a bit for webview to be ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get the webview instance
        // @ts-ignore - accessing private static member
        const webview = WorkflowWebview._currentPanel;

        if (!webview) {
            vscode.window.showErrorMessage('Failed to open workflow panel');
            return;
        }

        // Set the webview in orchestrator
        this.orchestrator.setWebview(webview);

        try {
            // 3. Execute the complete workflow
            await this.orchestrator.executeWorkflow(planFile, currentAgent);

        } catch (error: any) {
            vscode.window.showErrorMessage(`Workflow execution failed: ${error.message}`);
        }
    }
}
