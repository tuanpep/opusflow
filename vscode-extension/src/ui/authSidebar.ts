import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';
import { AuthProviderType } from '../auth/types';

/**
 * AuthSidebarProvider - Provides a webview-based sidebar for easy authentication
 * 
 * Features:
 * - One-click browser login for Cursor Agent
 * - Visual status for all AI agents
 * - Refresh and logout capabilities
 */
export class AuthSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'opusflowAuth';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _authManager: AuthManager
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this._updateWebview();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    await this._handleLogin(message.provider);
                    break;
                case 'logout':
                    await this._handleLogout(message.provider);
                    break;
                case 'refresh':
                    await this._updateWebview();
                    break;
            }
        });

        // Refresh when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._updateWebview();
            }
        });
    }

    private async _handleLogin(provider: AuthProviderType): Promise<void> {
        try {
            this._view?.webview.postMessage({
                command: 'status',
                provider,
                status: 'logging-in'
            });

            await this._authManager.login(provider);
            vscode.window.showInformationMessage(`✅ Connected to ${this._getAgentName(provider)}!`);
            await this._updateWebview();
        } catch (error: any) {
            this._view?.webview.postMessage({
                command: 'status',
                provider,
                status: 'error',
                error: error.message
            });

            if (!error.message?.includes('cancelled')) {
                vscode.window.showErrorMessage(`Login failed: ${error.message}`);
            }
            await this._updateWebview();
        }
    }

    private async _handleLogout(provider: AuthProviderType): Promise<void> {
        try {
            await this._authManager.logout(provider);
            vscode.window.showInformationMessage(`👋 Disconnected from ${this._getAgentName(provider)}`);
            await this._updateWebview();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Logout failed: ${error.message}`);
        }
    }

    private _getAgentName(provider: AuthProviderType): string {
        switch (provider) {
            case AuthProviderType.Cursor: return 'Cursor';
            case AuthProviderType.Gemini: return 'Gemini';
            case AuthProviderType.Claude: return 'Claude';
            default: return provider;
        }
    }

    private async _updateWebview(): Promise<void> {
        if (!this._view) return;

        const statuses = await this._authManager.checkSessions();
        this._view.webview.html = this._getHtmlForWebview(
            this._view.webview,
            statuses
        );
    }

    public refresh(): void {
        this._updateWebview();
    }

    private _getHtmlForWebview(
        webview: vscode.Webview,
        authStatuses: Map<AuthProviderType, boolean>
    ): string {
        const cursorAuth = authStatuses.get(AuthProviderType.Cursor);
        const geminiAuth = authStatuses.get(AuthProviderType.Gemini);
        const claudeAuth = authStatuses.get(AuthProviderType.Claude);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Agents</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            padding: 12px;
            background: transparent;
        }
        
        .header {
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        
        .header h2 {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .subtitle {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        
        .agent-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .agent-card {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 12px;
            transition: border-color 0.15s;
        }
        
        .agent-card:hover {
            border-color: var(--vscode-focusBorder);
        }
        
        .agent-card.connected {
            border-left: 3px solid var(--vscode-testing-iconPassed);
        }
        
        .agent-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .agent-icon {
            width: 28px;
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            color: white;
        }
        
        .agent-icon.cursor { background: #333; }
        .agent-icon.gemini { background: linear-gradient(135deg, #4285f4, #34a853); }
        .agent-icon.claude { background: #d97757; }
        
        .agent-info {
            flex: 1;
            min-width: 0;
        }
        
        .agent-name {
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .easy-badge {
            background: var(--vscode-testing-iconPassed);
            color: var(--vscode-editor-background);
            font-size: 9px;
            padding: 1px 5px;
            border-radius: 10px;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        .agent-desc {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }
        
        .status {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            margin-bottom: 10px;
        }
        
        .status.connected {
            color: var(--vscode-testing-iconPassed);
        }
        
        .status.disconnected {
            color: var(--vscode-testing-iconFailed);
        }
        
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
        }
        
        .btn {
            width: 100%;
            padding: 7px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.15s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .btn:hover {
            opacity: 0.9;
        }
        
        .btn:active {
            opacity: 0.8;
        }
        
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .btn-group {
            display: flex;
            gap: 6px;
        }
        
        .btn-group .btn {
            flex: 1;
        }
        
        .tip {
            margin-top: 16px;
            padding: 10px;
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            border-radius: 4px;
        }
        
        .tip-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
            margin-bottom: 4px;
        }
        
        .tip-text {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
        }
        
        .refresh-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            opacity: 0.6;
            font-size: 14px;
            padding: 4px;
        }
        
        .refresh-btn:hover {
            opacity: 1;
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        .loading .agent-icon {
            animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <button class="refresh-btn" onclick="refresh()" title="Refresh status">↻</button>
    
    <div class="header">
        <h2>🤖 AI Agents</h2>
        <p class="subtitle">Connect to start using AI workflows</p>
    </div>
    
    <div class="agent-list">
        <!-- Cursor Agent - Primary/Easy -->
        <div class="agent-card ${cursorAuth ? 'connected' : ''}" id="cursor-card">
            <div class="agent-header">
                <div class="agent-icon cursor">C</div>
                <div class="agent-info">
                    <div class="agent-name">
                        Cursor
                        <span class="easy-badge">Easy</span>
                    </div>
                    <div class="agent-desc">Browser login • No key needed</div>
                </div>
            </div>
            <div class="status ${cursorAuth ? 'connected' : 'disconnected'}">
                <span class="status-dot"></span>
                ${cursorAuth ? 'Connected' : 'Not connected'}
            </div>
            ${cursorAuth ? `
                <div class="btn-group">
                    <button class="btn btn-secondary" onclick="refresh()">Refresh</button>
                    <button class="btn btn-secondary" onclick="logout('cursor-agent')">Logout</button>
                </div>
            ` : `
                <button class="btn btn-primary" onclick="login('cursor-agent')">
                    🔓 Login with Browser
                </button>
            `}
        </div>
        
        <!-- Gemini -->
        <div class="agent-card ${geminiAuth ? 'connected' : ''}" id="gemini-card">
            <div class="agent-header">
                <div class="agent-icon gemini">G</div>
                <div class="agent-info">
                    <div class="agent-name">Gemini</div>
                    <div class="agent-desc">Google AI</div>
                </div>
            </div>
            <div class="status ${geminiAuth ? 'connected' : 'disconnected'}">
                <span class="status-dot"></span>
                ${geminiAuth ? 'Connected' : 'Not connected'}
            </div>
            ${geminiAuth ? `
                <div class="btn-group">
                    <button class="btn btn-secondary" onclick="refresh()">Refresh</button>
                    <button class="btn btn-secondary" onclick="logout('gemini-cli')">Logout</button>
                </div>
            ` : `
                <button class="btn btn-primary" onclick="login('gemini-cli')">Connect</button>
            `}
        </div>
        
        <!-- Claude -->
        <div class="agent-card ${claudeAuth ? 'connected' : ''}" id="claude-card">
            <div class="agent-header">
                <div class="agent-icon claude">A</div>
                <div class="agent-info">
                    <div class="agent-name">Claude</div>
                    <div class="agent-desc">Anthropic AI</div>
                </div>
            </div>
            <div class="status ${claudeAuth ? 'connected' : 'disconnected'}">
                <span class="status-dot"></span>
                ${claudeAuth ? 'Connected' : 'Not connected'}
            </div>
            ${claudeAuth ? `
                <div class="btn-group">
                    <button class="btn btn-secondary" onclick="refresh()">Refresh</button>
                    <button class="btn btn-secondary" onclick="logout('claude-cli')">Logout</button>
                </div>
            ` : `
                <button class="btn btn-primary" onclick="login('claude-cli')">Connect</button>
            `}
        </div>
    </div>
    
    <div class="tip">
        <div class="tip-title">💡 Quick Start</div>
        <div class="tip-text">
            Click "Login with Browser" for Cursor - it opens your browser and you're done in seconds!
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function login(provider) {
            const card = document.getElementById(provider.split('-')[0] + '-card');
            if (card) card.classList.add('loading');
            vscode.postMessage({ command: 'login', provider });
        }
        
        function logout(provider) {
            vscode.postMessage({ command: 'logout', provider });
        }
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'status') {
                const card = document.getElementById(message.provider.split('-')[0] + '-card');
                if (card) {
                    card.classList.remove('loading');
                }
            }
        });
    </script>
</body>
</html>`;
    }
}
