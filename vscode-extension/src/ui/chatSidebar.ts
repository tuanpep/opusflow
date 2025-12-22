import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';
import { AuthProviderType } from '../auth/types';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';

export class ChatSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'opusflowChat';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _authManager: AuthManager,
        private readonly _cli: OpusFlowWrapper
    ) {}

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

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    await this._handleUserMessage(message.text, message.context);
                    break;
                case 'addContext':
                    await this._handleAddContext();
                    break;
                case 'toggleAuth':
                    vscode.commands.executeCommand('opusflow.authenticateAgent');
                    break;
                case 'refreshAuth':
                    this._updateWebview();
                    break;
                case 'executeCommand':
                    if (message.actionCommand) {
                        try {
                            await vscode.commands.executeCommand(message.actionCommand, ...(message.args || []));
                        } catch (err: any) {
                            vscode.window.showErrorMessage(`Failed to execute command: ${err.message}`);
                        }
                    }
                    break;
            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._updateWebview();
            }
        });
    }

    private async _handleUserMessage(text: string, contextFiles: string[]) {
        if (!text.trim()) return;

        // 1. Show User Message
        this._view?.webview.postMessage({
            command: 'addMessage',
            role: 'user',
            text: text,
            context: contextFiles
        });

        // 2. Clear Input
        this._view?.webview.postMessage({ command: 'clearInput' });

        try {
            // 3. Show "Thinking" state
            this._view?.webview.postMessage({
                command: 'setLoading',
                value: true,
                text: 'Analyzing request and creating plan...'
            });

            // Extract a title (first 5 words)
            const title = text
                .split(' ')
                .slice(0, 5)
                .join('-')
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '');

            // Call CLI to create plan
            const planResult = await this._cli.plan(title);

            // 4. Show Success
            this._view?.webview.postMessage({
                command: 'addMessage',
                role: 'agent',
                text: `✅ **Plan Created:** \`${planResult.filename}\`\n\nI've analyzed your request and created an implementation plan.`,
                actions: [
                    { title: 'Open Plan', command: 'vscode.open', args: [planResult.fullPath] },
                    { title: 'Execute Workflow', command: 'opusflow.executeWorkflow', args: [planResult.filename] }
                ]
            });

            // Refresh the tree view
            vscode.commands.executeCommand('opusflow.refreshExplorer');
        } catch (error: any) {
            this._view?.webview.postMessage({
                command: 'addMessage',
                role: 'error',
                text: `Failed to create plan: ${error.message}`
            });
        } finally {
            this._view?.webview.postMessage({ command: 'setLoading', value: false });
        }
    }

    private async _handleAddContext() {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: 'Add to Context',
            title: 'Select files to reference'
        });

        if (files) {
            const paths = files.map((f) => vscode.workspace.asRelativePath(f));
            this._view?.webview.postMessage({
                command: 'appendContext',
                files: paths
            });
        }
    }

    private async _updateWebview() {
        if (!this._view) return;
        const authStatuses = await this._authManager.checkSessions();
        const cursorAuth = authStatuses.get(AuthProviderType.Cursor);

        const authState = {
            provider: 'Cursor Agent',
            isConnected: !!cursorAuth,
            user: 'User'
        };

        this._view.webview.html = this._getHtml(this._view.webview, authState);
    }

    private _getHtml(webview: vscode.Webview, auth: any): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        :root {
            --primary-color: var(--vscode-button-background);
            --primary-hover: var(--vscode-button-hoverBackground);
            --text-color: var(--vscode-foreground);
            --bg-color: var(--vscode-sideBar-background);
            --input-bg: var(--vscode-input-background);
            --border-color: var(--vscode-widget-border);
            --glass-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        body {
            font-family: var(--vscode-font-family);
            background: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        /* Header */
        .header {
            padding: 12px 16px;
            background: linear-gradient(to right, rgba(0,0,0,0.2), transparent);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            backdrop-filter: blur(10px);
        }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 11px;
            font-weight: 500;
            padding: 4px 10px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .status-badge:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ff5252;
            box-shadow: 0 0 8px #ff5252;
        }

        .status-dot.connected {
            background: #69f0ae;
            box-shadow: 0 0 8px #69f0ae;
        }

        .btn-icon {
            background: none;
            border: none;
            color: var(--text-color);
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            opacity: 0.7;
            transition: all 0.2s;
        }

        .btn-icon:hover {
            opacity: 1;
            background: var(--glass-bg);
        }

        /* Chat Area */
        .chat-container {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
            scroll-behavior: smooth;
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 95%;
            animation: slideUp 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .message.user {
            align-self: flex-end;
            align-items: flex-end;
        }

        .message.agent {
            align-self: flex-start;
            align-items: flex-start;
        }

        .message-content {
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.5;
            position: relative;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
        }

        .message.user .message-content {
            background: var(--primary-color);
            color: var(--vscode-button-foreground);
            border: none;
            border-bottom-right-radius: 2px;
        }

        .message.agent .message-content {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom-left-radius: 2px;
        }
        
        .message.error .message-content {
            border: 1px solid #ff5252;
            background: rgba(255, 82, 82, 0.1);
        }

        /* Markdown Styles within Message */
        .message-content p { margin: 0 0 8px 0; }
        .message-content p:last-child { margin: 0; }
        .message-content code {
            font-family: 'Consolas', monospace;
            background: rgba(0,0,0,0.2);
            padding: 2px 4px;
            border-radius: 4px;
        }
        .message-content pre {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 8px;
            overflow-x: auto;
        }

        /* Actions */
        .actions-group {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            flex-wrap: wrap;
        }

        .action-btn {
            background: var(--primary-color);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .action-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        .action-btn:active {
            transform: translateY(0);
        }

        /* Context Chips */
        .context-ref {
            font-size: 10px;
            opacity: 0.8;
            margin-top: 4px;
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }

        /* Loading Indicator */
        .loading {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            opacity: 0.7;
            margin-left: 8px;
        }
        .dots span {
            animation: pulse 1.4s infinite ease-in-out both;
            display: inline-block;
            width: 4px;
            height: 4px;
            background: currentColor;
            border-radius: 50%;
        }
        .dots span:nth-child(1) { animation-delay: -0.32s; }
        .dots span:nth-child(2) { animation-delay: -0.16s; }

        /* Input Area */
        .input-wrapper {
            padding: 16px;
            background: var(--bg-color);
            border-top: 1px solid var(--border-color);
        }

        .context-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 8px;
        }

        .file-chip {
            font-size: 11px;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--border-color);
            padding: 4px 8px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .input-box {
            display: flex;
            gap: 10px;
            align-items: flex-end;
            background: var(--input-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px;
            transition: border-color 0.2s;
        }

        .input-box:focus-within {
            border-color: var(--vscode-focusBorder);
        }

        textarea {
            flex: 1;
            background: transparent;
            border: none;
            color: inherit;
            font-family: inherit;
            resize: none;
            max-height: 120px;
            min-height: 24px;
            padding: 4px;
            outline: none;
            line-height: 1.4;
        }

        .send-btn {
            background: var(--primary-color);
            color: var(--vscode-button-foreground);
            border: none;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s;
        }

        .send-btn:hover { opacity: 0.9; }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="status-badge" onclick="toggleAuth()">
            <div class="status-dot ${auth.isConnected ? 'connected' : ''}"></div>
            <span>${auth.provider}</span>
        </div>
        <button class="btn-icon" onclick="refreshAuth()" title="Refresh Status">↺</button>
    </div>

    <div class="chat-container" id="chat-history">
        <div class="message agent">
            <div class="message-content">
                👋 <strong>Hi! I'm OpusFlow.</strong><br>
                Describe your feature or task to create a new plan. Use <code>@</code> to add context files.
            </div>
        </div>
    </div>

    <div class="input-wrapper">
        <div class="context-preview" id="context-preview"></div>
        <div class="input-box">
            <button class="btn-icon" onclick="addContext()" title="Add Context (@)" style="padding: 4px;">📎</button>
            <textarea id="msg-input" placeholder="Describe your feature or task... (Press Enter to submit, Shift+Enter for new line)" rows="1"></textarea>
            <button class="send-btn" onclick="sendMessage()">➤</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatHistory = document.getElementById('chat-history');
        const input = document.getElementById('msg-input');
        const contextPreview = document.getElementById('context-preview');
        let activeContextFiles = [];

        // Auto-resize textarea
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        input.addEventListener('keyup', (e) => {
            if (e.key === '@') {
                addContext();
            }
        });

        function sendMessage() {
            const text = input.value;
            if (!text.trim()) return;
            
            vscode.postMessage({
                command: 'sendMessage',
                text: text,
                context: activeContextFiles
            });
        }

        function addContext() {
            vscode.postMessage({ command: 'addContext' });
        }

        function toggleAuth() {
            vscode.postMessage({ command: 'toggleAuth' });
        }

        function refreshAuth() {
            vscode.postMessage({ command: 'refreshAuth' });
        }

        function executeAction(command, args) {
            vscode.postMessage({
                command: 'executeCommand',
                actionCommand: command,
                args: args
            });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.command) {
                case 'addMessage':
                    appendMessage(msg.role, msg.text, msg.context, msg.actions);
                    break;
                case 'clearInput':
                    input.value = '';
                    input.style.height = 'auto';
                    activeContextFiles = [];
                    renderContext();
                    break;
                case 'setLoading':
                    toggleLoading(msg.value, msg.text);
                    break;
                case 'appendContext':
                    if (msg.files) {
                        const newFiles = msg.files.filter(f => !activeContextFiles.includes(f));
                        activeContextFiles = [...activeContextFiles, ...newFiles];
                        renderContext();
                    }
                    break;
            }
        });

        function appendMessage(role, text, context, actions) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            
            // Build Context Refs
            let contextHtml = '';
            if (context && context.length > 0) {
                contextHtml = '<div class="context-ref">' + 
                    context.map(c => '<span>📄 ' + c.split('/').pop() + '</span>').join('') +
                    '</div>';
            }

            // Parse Markdown
            // Note: marked is loaded from CDN in this webview environment
            // If offline, we might need to bundle it.
            let htmlContent = marked.parse(text);

            div.innerHTML = \`
                <div class="message-content">
                    \${htmlContent}
                    \${contextHtml}
                </div>
            \`;

            if (actions && actions.length > 0) {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'actions-group';
                actions.forEach(action => {
                    const btn = document.createElement('button');
                    btn.className = 'action-btn';
                    btn.textContent = action.title;
                    // Properly escape arguments for the inline onclick handler
                    const argsJson = JSON.stringify(action.args || []).replace(/"/g, '&quot;');
                    btn.onclick = () => executeAction(action.command, action.args);
                    actionsDiv.appendChild(btn);
                });
                div.appendChild(actionsDiv);
            }

            chatHistory.appendChild(div);
            scrollToBottom();
        }

        let loadingDiv = null;
        function toggleLoading(show, text) {
            if (show) {
                if (loadingDiv) loadingDiv.remove();
                loadingDiv = document.createElement('div');
                loadingDiv.className = 'loading';
                loadingDiv.innerHTML = \`
                    <div class="dots"><span></span><span></span><span></span></div>
                    <span>\${text || 'Thinking...'}</span>
                \`;
                chatHistory.appendChild(loadingDiv);
                scrollToBottom();
            } else {
                if (loadingDiv) loadingDiv.remove();
                loadingDiv = null;
            }
        }

        function renderContext() {
            contextPreview.innerHTML = '';
            activeContextFiles.forEach(file => {
                const chip = document.createElement('div');
                chip.className = 'file-chip';
                chip.innerHTML = '📄 ' + file.split('/').pop();
                contextPreview.appendChild(chip);
            });
        }

        function scrollToBottom() {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    </script>
</body>
</html>`;
    }
}
