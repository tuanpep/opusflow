import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';
import { AuthProviderType } from '../auth/types';

export class AuthWebview {
    public static readonly viewType = 'opusflow.authWebview';

    public static show(context: vscode.ExtensionContext, authManager: AuthManager) {
        const panel = vscode.window.createWebviewPanel(
            this.viewType,
            'OpusFlow Authenticate',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getHtmlForWebview(panel.webview);

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    try {
                        const provider = message.provider as AuthProviderType;
                        await authManager.login(provider);
                        vscode.window.showInformationMessage(`Successfully authenticated with ${provider}`);
                        panel.dispose();
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Login failed: ${error.message}`);
                    }
                    return;
            }
        });
    }

    private static getHtmlForWebview(webview: vscode.Webview): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OpusFlow Authentication</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        background: var(--vscode-editor-background);
                    }
                    h2 { color: var(--vscode-textLink-foreground); }
                    .container {
                        max-width: 400px;
                        width: 100%;
                        background: var(--vscode-sideBar-background);
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        border: 1px solid var(--vscode-panel-border);
                    }
                    .agent-list {
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                        margin-top: 20px;
                    }
                    .agent-card {
                        padding: 15px;
                        border: 1px solid var(--vscode-button-secondaryBackground);
                        border-radius: 6px;
                        cursor: pointer;
                        transition: all 0.2s;
                        text-align: center;
                        font-weight: 600;
                    }
                    .agent-card:hover {
                        background: var(--vscode-button-hoverBackground);
                        border-color: var(--vscode-button-background);
                    }
                    .agent-card.cursor { background: #3d3d3d; color: white; }
                    .agent-card.gemini { background: #1a73e8; color: white; }
                    .agent-card.claude { background: #d97757; color: white; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>Select Agent to Authenticate</h2>
                    <div class="agent-list">
                        <div class="agent-card cursor" onclick="login('cursor-agent')">Cursor Agent</div>
                        <div class="agent-card gemini" onclick="login('gemini-cli')">Gemini CLI</div>
                        <div class="agent-card claude" onclick="login('claude-cli')">Claude CLI</div>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    function login(provider) {
                        vscode.postMessage({ command: 'login', provider });
                    }
                </script>
            </body>
            </html>
        `;
    }
}
