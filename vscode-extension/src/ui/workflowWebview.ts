import * as vscode from 'vscode';

export class WorkflowWebview {
    private static _currentPanel: WorkflowWebview | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (WorkflowWebview._currentPanel) {
            WorkflowWebview._currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'opusflowWorkflow',
            'OpusFlow Workflow',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'resources', 'webview'),
                    vscode.Uri.joinPath(extensionUri, 'node_modules', 'marked')
                ]
            }
        );

        WorkflowWebview._currentPanel = new WorkflowWebview(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        this._panel.webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public updatePlan(content: string) {
        this._panel.webview.postMessage({ command: 'updatePlan', content });
    }

    public updatePhases(phases: any[]) {
        this._panel.webview.postMessage({ command: 'updatePhases', phases });
    }

    public updateVerification(content: string) {
        this._panel.webview.postMessage({ command: 'updateVerification', content });
    }

    public updateProgress(percentage: number) {
        this._panel.webview.postMessage({ command: 'updateProgress', percentage });
    }

    public clearLogs() {
        this._panel.webview.postMessage({ command: 'clearLogs' });
    }

    public log(text: string, logType: 'info' | 'error' | 'success' | 'warning' = 'info') {
        this._panel.webview.postMessage({ command: 'log', text, logType });
    }

    public switchTab(tabId: string) {
        this._panel.webview.postMessage({ command: 'switchTab', tabId });
    }

    public dispose() {
        WorkflowWebview._currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'js', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'style.css')
        );
        const markedUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'marked', 'marked.min.js')
        );

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <script src="${markedUri}"></script>
                <title>OpusFlow Workflow</title>
            </head>
            <body>
                <div class="tabs-nav">
                    <div class="tab active" onclick="openTab('planning')">Planning</div>
                    <div class="tab" onclick="openTab('phases')">Phases</div>
                    <div class="tab" onclick="openTab('execution')">Execution</div>
                    <div class="tab" onclick="openTab('verification')">Verification</div>
                </div>

                <div id="planning" class="tab-content active">
                    <div class="card">
                        <h2>Current Plan</h2>
                        <div id="plan-content" class="markdown-preview">No plan loaded. Create a plan to see details here.</div>
                    </div>
                </div>

                <div id="phases" class="tab-content">
                    <div class="card">
                        <h2>Plan Phases</h2>
                        <div id="phases-content">Select a plan to view its phases.</div>
                    </div>
                </div>

                <div id="execution" class="tab-content">
                    <div class="card">
                        <h2>Agent Execution Log</h2>
                        <div id="execution-log" class="log-container">
                            <div class="log-entry info">Ready for execution...</div>
                        </div>
                    </div>
                </div>

                <div id="verification" class="tab-content">
                    <div class="card">
                        <h2>Verification Report</h2>
                        <div id="verification-content" class="markdown-preview">No verification report generated yet.</div>
                    </div>
                </div>

                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}
