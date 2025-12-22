import * as vscode from 'vscode';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';

export class WorkflowCommands {
    constructor(private cli: OpusFlowWrapper) {}

    /**
     * Show current workflow status
     */
    async showStatus(): Promise<void> {
        try {
            const cwd = this.getWorkspaceFolder();
            const status = await this.cli.workflowStatus(cwd);

            // Show in a formatted document
            const content = this.formatStatusMarkdown(status);
            const doc = await vscode.workspace.openTextDocument({
                content,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get workflow status: ${error.message}`);
        }
    }

    /**
     * Start a new workflow
     */
    async startWorkflow(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: 'Enter workflow name',
            placeHolder: 'e.g., User Authentication Feature'
        });

        if (!name) {
            return;
        }

        try {
            const cwd = this.getWorkspaceFolder();
            await this.cli.workflowStart(name, cwd);

            vscode.window.showInformationMessage(`✅ Started new workflow: ${name}`);

            // Show next step guidance
            await this.showNextGuidance();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to start workflow: ${error.message}`);
        }
    }

    /**
     * Show guidance for next step
     */
    async showNextGuidance(): Promise<void> {
        try {
            const cwd = this.getWorkspaceFolder();
            const guidance = await this.cli.workflowNext(cwd);

            const phaseActions: Record<string, { action: string; command: string }> = {
                specification: { action: 'Create a Specification', command: 'opusflow.createSpec' },
                planning: { action: 'Create a Plan', command: 'opusflow.createPlan' },
                decomposition: { action: 'Decompose the Plan', command: 'opusflow.decomposePlan' },
                execution: { action: 'Execute Next Task', command: 'opusflow.execTask' },
                verification: { action: 'Verify Implementation', command: 'opusflow.verifyPlan' },
                complete: { action: 'Workflow Complete!', command: '' }
            };

            const nextAction = phaseActions[guidance.nextPhase] || {
                action: 'Start New Workflow',
                command: 'opusflow.workflowStart'
            };

            const selected = await vscode.window.showInformationMessage(
                `Phase: ${guidance.currentPhase} → Next: ${guidance.nextPhase}`,
                { modal: false },
                nextAction.action
            );

            if (selected && nextAction.command) {
                vscode.commands.executeCommand(nextAction.command);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get guidance: ${error.message}`);
        }
    }

    /**
     * Transition to a specific phase
     */
    async transitionPhase(): Promise<void> {
        const phases = [
            { label: 'idle', description: 'Reset workflow' },
            { label: 'specification', description: 'Define requirements' },
            { label: 'planning', description: 'Create implementation plan' },
            { label: 'decomposition', description: 'Break into tasks' },
            { label: 'execution', description: 'Execute tasks' },
            { label: 'verification', description: 'Verify implementation' },
            { label: 'complete', description: 'Workflow complete' }
        ];

        const selected = await vscode.window.showQuickPick(phases, {
            placeHolder: 'Select phase to transition to'
        });

        if (!selected) {
            return;
        }

        const reason = await vscode.window.showInputBox({
            prompt: 'Reason for transition (optional)',
            placeHolder: 'Manual override'
        });

        try {
            const cwd = this.getWorkspaceFolder();
            await this.cli.workflowTransition(selected.label, reason || undefined, cwd);

            vscode.window.showInformationMessage(`✅ Transitioned to: ${selected.label}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to transition: ${error.message}`);
        }
    }

    private formatStatusMarkdown(status: any): string {
        const phaseEmoji: Record<string, string> = {
            idle: '⏸️',
            specification: '📝',
            planning: '📋',
            decomposition: '🔨',
            execution: '⚡',
            verification: '🔍',
            complete: '✅',
            failed: '❌'
        };

        const emoji = phaseEmoji[status.currentPhase] || '❓';

        return `# Workflow Status

${emoji} **Current Phase**: ${status.currentPhase}

**Name**: ${status.name}

## Artifacts

| Type | Path |
|------|------|
| Specification | ${status.specPath || '(none)'} |
| Plan | ${status.planPath || '(none)'} |
| Tasks | ${status.taskQueuePath || '(none)'} |
| Verification | ${status.verifyPath || '(none)'} |

## Next Step

**Suggested**: ${status.nextPhase}

## History

${status.historyCount} transitions recorded
`;
    }

    private getWorkspaceFolder(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }
}
