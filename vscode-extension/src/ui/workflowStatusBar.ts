import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Enhanced status bar that shows current workflow phase
 */
export class WorkflowStatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private watcher?: vscode.FileSystemWatcher;
    private refreshInterval?: NodeJS.Timeout;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'opusflow.workflowStatus';
        this.initialize();
    }

    private initialize(): void {
        this.updateStatus();
        this.setupWatcher();

        // Refresh periodically
        this.refreshInterval = setInterval(() => {
            this.updateStatus();
        }, 5000);
    }

    private setupWatcher(): void {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const pattern = new vscode.RelativePattern(workspaceFolder, '.opusflow/workflow-state.json');

        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
        this.watcher.onDidChange(() => this.updateStatus());
        this.watcher.onDidCreate(() => this.updateStatus());
        this.watcher.onDidDelete(() => this.updateStatus());
    }

    public updateStatus(): void {
        const state = this.readWorkflowState();

        if (state) {
            const phaseInfo = this.getPhaseInfo(state.currentPhase);
            this.statusBarItem.text = `${phaseInfo.icon} ${phaseInfo.label}`;
            this.statusBarItem.tooltip = this.buildTooltip(state);
            this.statusBarItem.backgroundColor = undefined;
        } else {
            this.statusBarItem.text = '$(rocket) OpusFlow';
            this.statusBarItem.tooltip = 'Click to start a new SDD workflow';
        }

        this.statusBarItem.show();
    }

    private readWorkflowState(): WorkflowState | null {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return null;
        }

        const statePath = path.join(workspaceFolder.uri.fsPath, '.opusflow', 'workflow-state.json');

        try {
            if (fs.existsSync(statePath)) {
                const content = fs.readFileSync(statePath, 'utf-8');
                return JSON.parse(content);
            }
        } catch (_e) {
            // Ignore parse errors
        }

        return null;
    }

    private getPhaseInfo(phase: string): { icon: string; label: string } {
        const phases: Record<string, { icon: string; label: string }> = {
            idle: { icon: '$(rocket)', label: 'OpusFlow' },
            specification: { icon: '$(file-text)', label: 'Spec' },
            planning: { icon: '$(repo)', label: 'Planning' },
            decomposition: { icon: '$(list-tree)', label: 'Tasks' },
            execution: { icon: '$(play)', label: 'Executing' },
            verification: { icon: '$(beaker)', label: 'Verifying' },
            complete: { icon: '$(check-all)', label: 'Complete' },
            failed: { icon: '$(error)', label: 'Failed' }
        };

        return phases[phase] || phases['idle'];
    }

    private buildTooltip(state: WorkflowState): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;

        const phaseInfo = this.getPhaseInfo(state.currentPhase);

        tooltip.appendMarkdown(`## ${phaseInfo.icon} OpusFlow: ${state.name || 'Workflow'}\n\n`);
        tooltip.appendMarkdown(`**Phase**: ${state.currentPhase}\n\n`);

        // Progress indicator
        const phases = ['specification', 'planning', 'decomposition', 'execution', 'verification', 'complete'];
        const currentIndex = phases.indexOf(state.currentPhase);
        const progress = currentIndex >= 0 ? `${currentIndex + 1}/6` : '0/6';
        tooltip.appendMarkdown(`**Progress**: ${progress}\n\n`);

        // Artifacts
        if (state.specPath || state.planPath) {
            tooltip.appendMarkdown('---\n');
            if (state.specPath) {
                tooltip.appendMarkdown(`📝 Spec: ${path.basename(state.specPath)}\n\n`);
            }
            if (state.planPath) {
                tooltip.appendMarkdown(`📋 Plan: ${path.basename(state.planPath)}\n\n`);
            }
        }

        tooltip.appendMarkdown('---\n');
        tooltip.appendMarkdown('*Click to view workflow status*');

        return tooltip;
    }

    public show(): void {
        this.statusBarItem.show();
    }

    public hide(): void {
        this.statusBarItem.hide();
    }

    public dispose(): void {
        this.statusBarItem.dispose();
        this.watcher?.dispose();
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }
}

interface WorkflowState {
    id: string;
    name: string;
    currentPhase: string;
    specPath?: string;
    planPath?: string;
    taskQueuePath?: string;
    verifyPath?: string;
}
