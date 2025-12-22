import * as vscode from 'vscode';
import { WorkflowWebview } from './workflowWebview';
import { FileWatcher } from '../utils/fileWatcher';

export class WebviewProvider {
    constructor(private readonly extensionUri: vscode.Uri, private readonly watcher: FileWatcher) { }

    public showWorkflow() {
        WorkflowWebview.createOrShow(this.extensionUri, this.watcher);
    }

    public updatePlanView(_content: string) {
        // Implement logic to send data to active webview
    }
}
