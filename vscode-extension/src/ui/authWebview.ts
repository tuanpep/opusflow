import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';
import { AuthProviderType } from '../auth/types';

export class AuthWebview {
    public static readonly viewType = 'opusflow.authWebview';
    private static currentPanel: vscode.WebviewPanel | undefined;

    public static show(context: vscode.ExtensionContext, authManager: AuthManager) {
        // Reuse existing panel if available
        if (this.currentPanel) {
            this.currentPanel.reveal();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            this.viewType,
            'OpusFlow - Login',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.currentPanel = panel;

        // Clean up on dispose
        panel.onDidDispose(() => {
            this.currentPanel = undefined;
        });

        // Initialize with loading state, then check auth status
        this.updateWebview(panel, authManager);

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    try {
                        const provider = message.provider as AuthProviderType;
                        panel.webview.postMessage({ command: 'status', provider, status: 'logging-in' });
                        await authManager.login(provider);
                        vscode.window.showInformationMessage(`✅ Successfully authenticated with ${provider}`);
                        this.updateWebview(panel, authManager); // Refresh status
                    } catch (error: any) {
                        panel.webview.postMessage({ command: 'status', provider: message.provider, status: 'error', error: error.message });
                        if (!error.message.includes('cancelled')) {
                            vscode.window.showErrorMessage(`Login failed: ${error.message}`);
                        }
                    }
                    return;
                case 'logout':
                    try {
                        const provider = message.provider as AuthProviderType;
                        await authManager.logout(provider);
                        vscode.window.showInformationMessage(`👋 Logged out from ${provider}`);
                        this.updateWebview(panel, authManager);
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Logout failed: ${error.message}`);
                    }
                    return;
                case 'refresh':
                    this.updateWebview(panel, authManager);
                    return;
            }
        });
    }

    private static async updateWebview(panel: vscode.WebviewPanel, authManager: AuthManager) {
        const statuses = await authManager.checkSessions();
        panel.webview.html = this.getHtmlForWebview(panel.webview, statuses);
    }

    private static getHtmlForWebview(webview: vscode.Webview, authStatuses: Map<AuthProviderType, boolean>): string {
        const cursorAuth = authStatuses.get(AuthProviderType.Cursor);
        const geminiAuth = authStatuses.get(AuthProviderType.Gemini);
        const claudeAuth = authStatuses.get(AuthProviderType.Claude);

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OpusFlow Authentication</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        padding: 40px 20px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        background: linear-gradient(135deg, var(--vscode-editor-background) 0%, #1a1a2e 100%);
                        min-height: 100vh;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    
                    .header h1 {
                        font-size: 2.5em;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        margin-bottom: 10px;
                    }
                    
                    .header p {
                        color: var(--vscode-descriptionForeground);
                        font-size: 1.1em;
                    }
                    
                    .highlight {
                        color: #4ade80;
                        font-weight: 600;
                    }
                    
                    .container {
                        max-width: 500px;
                        width: 100%;
                    }
                    
                    .agent-list {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    
                    .agent-card {
                        padding: 24px;
                        border-radius: 16px;
                        background: rgba(255,255,255,0.05);
                        border: 1px solid rgba(255,255,255,0.1);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }
                    
                    .agent-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                        border-color: rgba(255,255,255,0.2);
                    }
                    
                    .agent-header {
                        display: flex;
                        align-items: center;
                        gap: 16px;
                        margin-bottom: 16px;
                    }
                    
                    .agent-icon {
                        width: 56px;
                        height: 56px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        font-weight: bold;
                    }
                    
                    .agent-icon.cursor { background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: #fff; }
                    .agent-icon.gemini { background: linear-gradient(135deg, #4285f4 0%, #34a853 100%); color: #fff; }
                    .agent-icon.claude { background: linear-gradient(135deg, #d97757 0%, #e95e2e 100%); color: #fff; }
                    
                    .agent-info h3 {
                        font-size: 1.3em;
                        margin-bottom: 4px;
                    }
                    
                    .agent-info p {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.9em;
                    }
                    
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 0.85em;
                        font-weight: 500;
                    }
                    
                    .status-badge.connected {
                        background: rgba(34, 197, 94, 0.2);
                        color: #4ade80;
                        border: 1px solid rgba(34, 197, 94, 0.3);
                    }
                    
                    .status-badge.disconnected {
                        background: rgba(239, 68, 68, 0.2);
                        color: #f87171;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                    }
                    
                    .agent-actions {
                        display: flex;
                        gap: 12px;
                        margin-top: 16px;
                    }
                    
                    .btn {
                        flex: 1;
                        padding: 12px 20px;
                        border: none;
                        border-radius: 10px;
                        font-size: 1em;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    
                    .btn:hover {
                        transform: scale(1.02);
                    }
                    
                    .btn-primary {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    
                    .btn-primary:hover {
                        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                    }
                    
                    .btn-secondary {
                        background: rgba(255,255,255,0.1);
                        color: var(--vscode-foreground);
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    
                    .btn-secondary:hover {
                        background: rgba(255,255,255,0.15);
                    }
                    
                    .btn-danger {
                        background: rgba(239, 68, 68, 0.2);
                        color: #f87171;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                    }
                    
                    .easy-badge {
                        background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                        color: #000;
                        padding: 4px 10px;
                        border-radius: 20px;
                        font-size: 0.75em;
                        font-weight: 700;
                        margin-left: 8px;
                        text-transform: uppercase;
                    }
                    
                    .tip {
                        background: rgba(59, 130, 246, 0.1);
                        border: 1px solid rgba(59, 130, 246, 0.3);
                        border-radius: 12px;
                        padding: 16px;
                        margin-top: 30px;
                        text-align: center;
                    }
                    
                    .tip h4 {
                        color: #60a5fa;
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    
                    .tip p {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.9em;
                        line-height: 1.5;
                    }
                    
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    
                    .loading {
                        animation: pulse 1.5s infinite;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚀 OpusFlow</h1>
                    <p>Connect your AI agents with <span class="highlight">one-click login</span></p>
                </div>
                
                <div class="container">
                    <div class="agent-list">
                        <!-- Cursor Agent -->
                        <div class="agent-card">
                            <div class="agent-header">
                                <div class="agent-icon cursor">C</div>
                                <div class="agent-info">
                                    <h3>Cursor Agent <span class="easy-badge">Easy Login</span></h3>
                                    <p>Browser-based authentication • No API key needed</p>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="status-badge ${cursorAuth ? 'connected' : 'disconnected'}">
                                    ${cursorAuth ? '✓ Connected' : '○ Not connected'}
                                </span>
                            </div>
                            <div class="agent-actions">
                                ${cursorAuth ? `
                                    <button class="btn btn-secondary" onclick="refresh()">↻ Refresh</button>
                                    <button class="btn btn-danger" onclick="logout('cursor-agent')">Logout</button>
                                ` : `
                                    <button class="btn btn-primary" onclick="login('cursor-agent')">
                                        🔓 Login with Browser
                                    </button>
                                `}
                            </div>
                        </div>
                        
                        <!-- Gemini -->
                        <div class="agent-card">
                            <div class="agent-header">
                                <div class="agent-icon gemini">G</div>
                                <div class="agent-info">
                                    <h3>Gemini CLI</h3>
                                    <p>Google AI integration</p>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="status-badge ${geminiAuth ? 'connected' : 'disconnected'}">
                                    ${geminiAuth ? '✓ Connected' : '○ Not connected'}
                                </span>
                            </div>
                            <div class="agent-actions">
                                ${geminiAuth ? `
                                    <button class="btn btn-secondary" onclick="refresh()">↻ Refresh</button>
                                    <button class="btn btn-danger" onclick="logout('gemini-cli')">Logout</button>
                                ` : `
                                    <button class="btn btn-primary" onclick="login('gemini-cli')">
                                        🔑 Connect Gemini
                                    </button>
                                `}
                            </div>
                        </div>
                        
                        <!-- Claude -->
                        <div class="agent-card">
                            <div class="agent-header">
                                <div class="agent-icon claude">A</div>
                                <div class="agent-info">
                                    <h3>Claude CLI</h3>
                                    <p>Anthropic AI integration</p>
                                </div>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span class="status-badge ${claudeAuth ? 'connected' : 'disconnected'}">
                                    ${claudeAuth ? '✓ Connected' : '○ Not connected'}
                                </span>
                            </div>
                            <div class="agent-actions">
                                ${claudeAuth ? `
                                    <button class="btn btn-secondary" onclick="refresh()">↻ Refresh</button>
                                    <button class="btn btn-danger" onclick="logout('claude-cli')">Logout</button>
                                ` : `
                                    <button class="btn btn-primary" onclick="login('claude-cli')">
                                        🔑 Connect Claude
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                    
                    <div class="tip">
                        <h4>💡 Tip: Easiest Way to Get Started</h4>
                        <p>
                            Click <strong>"Login with Browser"</strong> for Cursor Agent.<br>
                            It will open your browser - just sign in and you're done!
                        </p>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function login(provider) {
                        vscode.postMessage({ command: 'login', provider });
                    }
                    
                    function logout(provider) {
                        vscode.postMessage({ command: 'logout', provider });
                    }
                    
                    function refresh() {
                        vscode.postMessage({ command: 'refresh' });
                    }
                    
                    // Handle status updates from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'status') {
                            // Could update UI based on logging-in/error states
                            console.log('Status update:', message);
                        }
                    });
                </script>
            </body>
            </html>
        `;
    }
}
