import * as vscode from 'vscode';
import { WorkflowWebview } from './workflowWebview';

export class WebviewProvider {
    constructor(private readonly extensionUri: vscode.Uri) { }

    public showWorkflow() {
        WorkflowWebview.createOrShow(this.extensionUri);
    }

    public updatePlanView(content: string) {
        // Implement logic to send data to active webview
    }
}
