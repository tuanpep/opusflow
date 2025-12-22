import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';
import { WorkflowWebview } from '../ui/workflowWebview';

export class PlanCommands {
    constructor(private cli: OpusFlowWrapper) { }

    public async createPlan(context: vscode.ExtensionContext) {
        const title = await vscode.window.showInputBox({
            prompt: 'Enter plan title',
            placeHolder: 'e.g., Add user authentication'
        });

        if (!title) return;

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        try {
            const result = await this.cli.plan(title, workspaceRoot);
            vscode.window.showInformationMessage(`Created plan: ${result.filename}`);

            // Open file
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.fullPath));
            await vscode.window.showTextDocument(doc);

            // Update Webview
            const content = fs.readFileSync(result.fullPath, 'utf8');
            // @ts-ignore
            WorkflowWebview._currentPanel?.updatePlan(content);
            // @ts-ignore
            WorkflowWebview._currentPanel?.switchTab('planning');

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create plan: ${error.message}`);
        }
    }
}
