import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';
import { WorkflowWebview } from '../ui/workflowWebview';

export class VerifyCommands {
    constructor(private cli: OpusFlowWrapper) { }

    public async verifyPlan(item?: any) {
        let planFile: string | undefined;

        if (item && item.command && item.command.arguments) {
            planFile = path.basename(item.command.arguments[0].fsPath);
        } else {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.fileName.includes('opusflow-planning/plans')) {
                planFile = path.basename(activeEditor.document.fileName);
            }
        }

        if (!planFile) {
            vscode.window.showErrorMessage('No plan file selected for verification');
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) return;

        try {
            const result = await this.cli.verify(planFile, workspaceRoot);
            vscode.window.showInformationMessage(`Verification complete: ${path.basename(result.fullPath)}`);

            // Open report
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.fullPath));
            await vscode.window.showTextDocument(doc);

            // Update Webview
            const content = fs.readFileSync(result.fullPath, 'utf8');
            // @ts-ignore
            WorkflowWebview._currentPanel?.postMessage({ command: 'updateVerification', content });
            // @ts-ignore
            WorkflowWebview._currentPanel?.switchTab('verification');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to verify plan: ${error.message}`);
        }
    }
}
