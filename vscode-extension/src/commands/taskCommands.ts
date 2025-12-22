import * as vscode from 'vscode';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';

export class TaskCommands {
    constructor(private cli: OpusFlowWrapper) {}

    /**
     * Decompose a plan into atomic tasks
     */
    async decomposePlan(item?: any): Promise<void> {
        let planFile = item?.label;

        if (!planFile) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor?.document.fileName.includes('opusflow-planning/plans')) {
                planFile = activeEditor.document.fileName;
            } else {
                planFile = await this.promptForPlanFile();
            }
        }

        if (!planFile) {
            return;
        }

        try {
            const cwd = this.getWorkspaceFolder();
            const result = await this.cli.decompose(planFile, cwd);

            vscode.window.showInformationMessage(`✅ Decomposed into ${result.tasksCount} tasks`);

            // Show task list in output channel
            const channel = vscode.window.createOutputChannel('OpusFlow Tasks');
            channel.clear();
            channel.appendLine(`# Tasks for: ${result.planRef}`);
            channel.appendLine('');
            for (const task of result.tasks) {
                const status = this.getStatusEmoji(task.status);
                channel.appendLine(`${status} ${task.id}: ${task.title}`);
            }
            channel.show();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to decompose plan: ${error.message}`);
        }
    }

    /**
     * Get and display the next pending task
     */
    async nextTask(item?: any): Promise<void> {
        let planRef = item?.planRef || (await this.promptForPlanRef());

        if (!planRef) {
            return;
        }

        try {
            const cwd = this.getWorkspaceFolder();
            const result = await this.cli.tasksNext(planRef, cwd);

            if (result.allCompleted) {
                vscode.window.showInformationMessage('🎉 All tasks completed!');
                return;
            }

            if (result.task) {
                // Show task prompt in a new document
                const doc = await vscode.workspace.openTextDocument({
                    content: result.prompt,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(`Next task: ${result.task.id} - ${result.task.title}`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to get next task: ${error.message}`);
        }
    }

    /**
     * Mark a task as complete
     */
    async completeTask(item?: any): Promise<void> {
        let planRef = item?.planRef;
        let taskId = item?.taskId;

        if (!planRef || !taskId) {
            planRef = await this.promptForPlanRef();
            if (!planRef) return;

            taskId = await vscode.window.showInputBox({
                prompt: 'Enter task ID (e.g., task-1)',
                placeHolder: 'task-1'
            });
            if (!taskId) return;
        }

        try {
            const cwd = this.getWorkspaceFolder();
            await this.cli.tasksComplete(planRef, taskId, cwd);

            vscode.window.showInformationMessage(`✅ Completed: ${taskId}`);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to complete task: ${error.message}`);
        }
    }

    /**
     * Execute a task with an external agent
     */
    async execTask(item?: any): Promise<void> {
        let planRef = item?.planRef || (await this.promptForPlanRef());
        if (!planRef) return;

        const taskSpec = await vscode.window.showQuickPick(['next', 'task-1', 'task-2', 'task-3'], {
            placeHolder: 'Select task to execute'
        });
        if (!taskSpec) return;

        const agents = await this.cli.agents();
        const agentItems = agents.agents.map((a) => ({
            label: a.name,
            description: a.available ? '✅ Available' : '❌ Not installed'
        }));
        agentItems.unshift({ label: 'prompt', description: 'Just show prompt, no execution' });

        const selectedAgent = await vscode.window.showQuickPick(agentItems, {
            placeHolder: 'Select agent for execution'
        });
        if (!selectedAgent) return;

        try {
            const cwd = this.getWorkspaceFolder();

            // Create output channel for execution
            const channel = vscode.window.createOutputChannel('OpusFlow Execution');
            channel.show();
            channel.appendLine(`Executing ${taskSpec} with ${selectedAgent.label}...`);

            await this.cli.exec(taskSpec, planRef, selectedAgent.label, cwd, (data) => {
                channel.append(data);
            });

            channel.appendLine('\n--- Execution Complete ---');
            vscode.window.showInformationMessage('Task execution complete');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Execution failed: ${error.message}`);
        }
    }

    private async promptForPlanFile(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: 'Enter plan filename',
            placeHolder: 'plan-01-auth.md'
        });
    }

    private async promptForPlanRef(): Promise<string | undefined> {
        return vscode.window.showInputBox({
            prompt: 'Enter plan reference',
            placeHolder: 'plan-01-auth.md'
        });
    }

    private getStatusEmoji(status: string): string {
        switch (status) {
            case 'pending':
                return '⬜';
            case 'in_progress':
                return '🔄';
            case 'done':
                return '✅';
            case 'failed':
                return '❌';
            default:
                return '❓';
        }
    }

    private getWorkspaceFolder(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }
}
