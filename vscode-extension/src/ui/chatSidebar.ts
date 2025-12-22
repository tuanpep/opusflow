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

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'sendMessage':
                    await this._handleUserMessage(message.text, message.context);
                    break;
                case 'addContext':
                    await this._handleAddContext();
                    break;
                case 'toggleAuth':
                    // Open the specific auth command or quickpick
                    vscode.commands.executeCommand('opusflow.authenticateAgent');
                    break;
                case 'refreshAuth':
                    this._updateWebview();
                    break;
            }
        });

        // Listen for auth changes to update header
        // In a real app we'd have an event emitter, for now we rely on focus/refresh
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
            // 3. Create Plan Prompt (Simulated Logic)
            this._view?.webview.postMessage({
                command: 'addMessage',
                role: 'system',
                text: 'Creating plan based on your request...'
            });

            // Construct the prompt with context
            let contextStr = '';
            if (contextFiles && contextFiles.length > 0) {
                contextStr = '\n\nContext Files:\n' + contextFiles.map(f => `- ${f}`).join('\n');
            }

            // Extract a title (first 5 words)
            const title = text.split(' ').slice(0, 5).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');

            // Call CLI to create plan
            // Note: In real flow, CLI creates file. We just simulate success and show it.
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

            // Refund the tree view
            vscode.commands.executeCommand('opusflow.refreshExplorer');

        } catch (error: any) {
            this._view?.webview.postMessage({
                command: 'addMessage',
                role: 'error',
                text: `Failed to create plan: ${error.message}`
            });
        }
    }

    private async _handleAddContext() {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: 'Add to Context',
            title: 'Select files to reference'
        });

        if (files) {
            const paths = files.map(f => vscode.workspace.asRelativePath(f));
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

        // Minimal Auth State
        const authState = {
            provider: 'Cursor Agent',
            isConnected: !!cursorAuth,
            user: 'User' // We could extract email if needed
        };

        this._view.webview.html = this._getHtml(this._view.webview, authState);
    }

    private _getHtml(webview: vscode.Webview, auth: any): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        :root {
            --container-paddding: 20px;
            --input-padding-vertical: 6px;
            --input-padding-horizontal: 4px;
            --input-margin-vertical: 4px;
            --input-margin-horizontal: 0;
        }
        body {
            font-family: var(--vscode-font-family);
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: var(--vscode-sideBar-background);
            color: var(--vscode-foreground);
        }
        
        /* Minimal Auth Header */
        .auth-header {
            padding: 8px 16px;
            background: var(--vscode-titleBar-activeBackground);
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
        }
        .auth-status {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--vscode-testing-iconFailed);
        }
        .status-dot.connected {
            background-color: var(--vscode-testing-iconPassed);
        }
        
        /* Chat Area */
        .chat-history {
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        
        .message {
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        
        .message-content {
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.4;
            max-width: 90%;
        }
        
        .message.user { align-items: flex-end; }
        .message.user .message-content {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .message.agent { align-items: flex-start; }
        .message.agent .message-content {
            background: var(--vscode-editor-inactiveSelectionBackground);
            color: var(--vscode-editor-foreground);
        }
        
        .message.error .message-content {
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        
        .context-chip {
            font-size: 10px;
            background: rgba(0,0,0,0.2);
            padding: 2px 6px;
            border-radius: 4px;
            margin-top: 2px;
            display: inline-block;
        }
        
        /* Input Area */
        .input-container {
            padding: 16px;
            border-top: 1px solid var(--vscode-widget-border);
            background: var(--vscode-sideBar-background);
        }
        
        .context-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 8px;
        }
        
        .file-chip {
            font-size: 11px;
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-widget-border);
            padding: 2px 6px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .input-box {
            position: relative;
            display: flex;
            gap: 8px;
        }
        
        textarea {
            flex: 1;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            padding: 8px;
            font-family: inherit;
            resize: none;
            height: 40px;
            min-height: 40px;
        }
        textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .icon-btn {
            background: none;
            border: none;
            color: var(--vscode-icon-foreground);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .icon-btn:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        /* Markdown Styles */
        code {
            font-family: 'Consolas', monospace;
            background: rgba(127,127,127,0.2);
            padding: 0 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="auth-header">
        <div class="auth-status" onclick="toggleAuth()">
            <div class="status-dot ${auth.isConnected ? 'connected' : ''}"></div>
            <span>${auth.provider}</span>
        </div>
        <div class="icon-btn" onclick="refreshAuth()" title="Refresh">↻</div>
    </div>

    <div class="chat-history" id="chat-history">
        <!-- Messages go here -->
        <div class="message agent">
            <div class="message-content">
                👋 Hi! I'm OpusFlow. Type a query to start a new plan.
                <br>Use <strong>@</strong> or click 📎 to add context.
            </div>
        </div>
    </div>

    <div class="input-container">
        <div class="context-preview" id="context-preview"></div>
        <div class="input-box">
            <button class="icon-btn" onclick="addContext()" title="Add Context (@)">📎</button>
            <textarea id="msg-input" placeholder="Describe your task... (Enter to submit)"></textarea>
            <button class="icon-btn" onclick="sendMessage()" title="Send">➤</button>
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

        // Submit on Enter
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Handle @ mention simulation
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

        // Handle incoming messages
        window.addEventListener('message', event => {
            const msg = event.data;
            switch (msg.command) {
                case 'addMessage':
                    appendMessage(msg.role, msg.text, msg.context);
                    if (msg.actions) {
                        appendActions(msg.actions);
                    }
                    scrollToBottom();
                    break;
                case 'clearInput':
                    input.value = '';
                    input.style.height = '40px';
                    activeContextFiles = [];
                    renderContext();
                    break;
                case 'appendContext':
                    if (msg.files) {
                        // De-dupe
                        const newFiles = msg.files.filter(f => !activeContextFiles.includes(f));
                        activeContextFiles = [...activeContextFiles, ...newFiles];
                        renderContext();
                    }
                    break;
            }
        });

        function appendMessage(role, text, context) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            
            let html = text.replace(/\\n/g, '<br>')
                           .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                           .replace(/\`(.*?)\`/g, '<code>$1</code>');
            
            if (context && context.length > 0) {
                html += '<div style="margin-top:4px; opacity:0.7; font-size:11px;">Ref: ';
                html += context.map(c => c.split('/').pop()).join(', ');
                html += '</div>';
            }

            div.innerHTML = '<div class="message-content">' + html + '</div>';
            chatHistory.appendChild(div);
        }
        
        function appendActions(actions) {
            const div = document.createElement('div');
            div.className = 'message agent';
            div.style.alignItems = 'flex-start';
            
            const content = document.createElement('div');
            content.style.marginTop = '4px';
            content.style.display = 'flex';
            content.style.gap = '8px';
            
            actions.forEach(action => {
                const btn = document.createElement('button');
                btn.textContent = action.title;
                btn.style.padding = '4px 8px';
                btn.style.fontSize = '11px';
                btn.style.cursor = 'pointer';
                btn.onclick = () => {
                   // We need a way to execute generic commands
                   // Ideally we post back to extension
                };
                content.appendChild(btn);
            });
            
            div.appendChild(content);
            chatHistory.appendChild(div);
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
