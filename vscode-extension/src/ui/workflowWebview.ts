import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileWatcher } from '../utils/fileWatcher';

export class WorkflowWebview {
    private static _currentPanel: WorkflowWebview | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _watcher: FileWatcher;

    public static createOrShow(extensionUri: vscode.Uri, watcher: FileWatcher) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (WorkflowWebview._currentPanel) {
            WorkflowWebview._currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'opusflowWorkflow',
            'Project Status',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'resources', 'webview'),
                    vscode.Uri.joinPath(extensionUri, 'node_modules', 'marked')
                ]
            }
        );

        WorkflowWebview._currentPanel = new WorkflowWebview(panel, extensionUri, watcher);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, watcher: FileWatcher) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._watcher = watcher;

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

        // Listen for file changes to update the dashboard
        this._watcher.onDidChange(() => {
            this.refresh();
        });

        // Initial refresh
        this.refresh();
    }

    public async refresh() {
        const state = await this._getDashboardState();
        this._panel.webview.postMessage({ command: 'updateDashboard', state });
    }

    private async _getDashboardState() {
        if (!vscode.workspace.workspaceFolders) {
            return null;
        }

        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const planningDir = path.join(rootPath, 'opusflow-planning');
        const opusflowDir = path.join(rootPath, '.opusflow');

        // 1. Get Phases
        const phases = [];
        const phasesFile = path.join(planningDir, 'phases.md');
        if (fs.existsSync(phasesFile)) {
            // Simple parsing or just return content? content is better for flexibility.
            // But maybe for the header we want status.
            // For now return raw markdown of phases.
        }

        // 2. Get Active Plan (most recent modified or created)
        let activePlan = null;
        const plansDir = path.join(planningDir, 'plans');
        if (fs.existsSync(plansDir)) {
            const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.md'));
            if (files.length > 0) {
                // simple sort by name desc (plan-01, plan-02)
                files.sort().reverse();
                const latestPlan = files[0];
                const content = fs.readFileSync(path.join(plansDir, latestPlan), 'utf-8');
                activePlan = { name: latestPlan, content };
            }
        }

        // 3. Get Recent Verification
        let activeVerification = null;
        const verifyDir = path.join(planningDir, 'verifications');
        if (fs.existsSync(verifyDir)) {
            const files = fs.readdirSync(verifyDir).filter(f => f.endsWith('.md'));
            if (files.length > 0) {
                // Sort by stats/time if possible, or name
                // fs.statSync...
                const sortedFiles = files.map(f => ({
                    name: f,
                    time: fs.statSync(path.join(verifyDir, f)).mtime.getTime()
                })).sort((a, b) => b.time - a.time);

                const latest = sortedFiles[0];
                const content = fs.readFileSync(path.join(verifyDir, latest.name), 'utf-8');
                activeVerification = { name: latest.name, content };
            }
        }

        // 4. Tasks (Count)
        const taskStats = { total: 0, done: 0, pending: 0, in_progress: 0 };
        if (fs.existsSync(opusflowDir)) {
            const taskFiles = fs.readdirSync(opusflowDir).filter(f => f.startsWith('tasks-') && f.endsWith('.json'));
            // Maybe just the latest one?
            if (taskFiles.length > 0) {
                // Find method to pick relevant queue? Use latest.
                const sorted = taskFiles.sort().reverse();
                const latestQueue = sorted[0];
                try {
                    const q = JSON.parse(fs.readFileSync(path.join(opusflowDir, latestQueue), 'utf-8'));
                    if (q.tasks && Array.isArray(q.tasks)) {
                        taskStats.total = q.tasks.length;
                        taskStats.done = q.tasks.filter((t: any) => t.status === 'done').length;
                        taskStats.in_progress = q.tasks.filter((t: any) => t.status === 'in_progress').length;
                        taskStats.pending = taskStats.total - taskStats.done - taskStats.in_progress;
                    }
                } catch (_e) {
                    // Ignore JSON parse errors
                }
            }
        }
        return {
            activePlan,
            activeVerification,
            taskStats
        };
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
        // Use a simple inline script for now to minimize file changes, 
        // OR rely on the existing main.js if I can overwrite it easily?
        // Let's stick to inline basics for the dashboard logic to ensure it works without complex JS files.
        // Actually, I'll update the HTML to include the necessary JS to handle 'updateDashboard'.

        const markedUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'node_modules', 'marked', 'marked.min.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'css', 'style.css')
        );

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="${styleUri}" rel="stylesheet">
                <script src="${markedUri}"></script>
                <title>Project Status</title>
                <style>
                    body { padding: 20px; max-width: 800px; margin: 0 auto; }
                    .card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); padding: 15px; margin-bottom: 20px; border-radius: 4px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
                    .stat-box { background: var(--vscode-editor-inactiveSelectionBackground); padding: 10px; text-align: center; border-radius: 4px; }
                    .stat-value { font-size: 24px; font-weight: bold; display: block; }
                    .stat-label { font-size: 12px; opacity: 0.8; }
                    h2 { margin-top: 0; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 5px; }
                    .section-header { display: flex; justify-content: space-between; align-items: center; }
                    .badge { padding: 2px 6px; border-radius: 3px; font-size: 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                    .markdown-preview { overflow-x: auto; }
                </style>
            </head>
            <body>
                <h1>Project Dashboard</h1>

                <div class="card" id="task-stats-card">
                    <h2>Current Tasks</h2>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-value" id="stat-total">-</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="stat-done">-</span>
                            <span class="stat-label">Done</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="stat-pending">-</span>
                            <span class="stat-label">Remaining</span>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="section-header">
                        <h2>Active Plan</h2>
                        <span id="plan-name" class="badge">None</span>
                    </div>
                    <div id="plan-content" class="markdown-preview">Loading...</div>
                </div>

                <div class="card">
                    <div class="section-header">
                        <h2>Latest Verification</h2>
                        <span id="verify-name" class="badge">None</span>
                    </div>
                    <div id="verify-content" class="markdown-preview">Loading...</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateDashboard') {
                            renderDashboard(message.state);
                        }
                    });

                    function renderDashboard(state) {
                        if (!state) return;

                        // Tasks
                        if (state.taskStats) {
                            document.getElementById('stat-total').textContent = state.taskStats.total;
                            document.getElementById('stat-done').textContent = state.taskStats.done;
                            document.getElementById('stat-pending').textContent = state.taskStats.pending + state.taskStats.in_progress;
                        }

                        // Plan
                        const planName = document.getElementById('plan-name');
                        const planContent = document.getElementById('plan-content');
                        if (state.activePlan) {
                            planName.textContent = state.activePlan.name;
                            planName.style.display = 'block';
                            planContent.innerHTML = marked.parse(state.activePlan.content);
                        } else {
                            planName.style.display = 'none';
                            planContent.textContent = 'No active plan found.';
                        }

                        // Verification
                        const verifyName = document.getElementById('verify-name');
                        const verifyContent = document.getElementById('verify-content');
                        if (state.activeVerification) {
                            verifyName.textContent = state.activeVerification.name;
                            verifyName.style.display = 'block';
                            verifyContent.innerHTML = marked.parse(state.activeVerification.content);
                        } else {
                            verifyName.style.display = 'none';
                            verifyContent.textContent = 'No verification reports found.';
                        }
                    }
                </script>
            </body>
            </html>`;
    }
}
