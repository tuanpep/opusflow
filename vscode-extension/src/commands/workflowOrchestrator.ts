import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { AuthManager } from '../auth/authManager';
import { AuthProviderType } from '../auth/types';
import { OpusFlowWrapper } from '../cli/opusflowWrapper';
import { WorkflowPhase, WorkflowState } from '../models/workflow';
import { WorkflowWebview } from '../ui/workflowWebview';

export class WorkflowOrchestrator {
    private currentWorkflow: WorkflowState | null = null;

    constructor(
        private cli: OpusFlowWrapper,
        private authManager: AuthManager,
        private webview?: WorkflowWebview
    ) {}

    public setWebview(webview: WorkflowWebview) {
        this.webview = webview;
    }

    /**
     * Execute a complete workflow from plan to verification
     */
    public async executeWorkflow(planFile: string, agent: AuthProviderType): Promise<void> {
        // Validate authentication
        const isAuthenticated = await this.authManager.isAuthenticated(agent);
        if (!isAuthenticated) {
            throw new Error(`Agent "${agent}" is not authenticated. Please authenticate first.`);
        }

        // Initialize workflow state
        this.currentWorkflow = {
            planFile,
            agent,
            phases: this.createPhases(),
            currentPhaseIndex: 0,
            status: 'running',
            startTime: new Date()
        };

        this.webview?.clearLogs();
        this.webview?.switchTab('execution');
        this.webview?.log(`🚀 Starting workflow execution with ${agent}`, 'info');
        this.webview?.updatePhases(this.currentWorkflow.phases);

        try {
            // Execute each phase
            for (let i = 0; i < this.currentWorkflow.phases.length; i++) {
                this.currentWorkflow.currentPhaseIndex = i;
                const phase = this.currentWorkflow.phases[i];

                await this.executePhase(phase, planFile);

                // Update progress
                const progress = ((i + 1) / this.currentWorkflow.phases.length) * 100;
                this.webview?.updateProgress(progress);
            }

            this.currentWorkflow.status = 'completed';
            this.currentWorkflow.endTime = new Date();

            const duration = this.calculateDuration(this.currentWorkflow.startTime!, this.currentWorkflow.endTime);

            this.webview?.log(`✅ Workflow completed successfully in ${duration}`, 'success');
            vscode.window.showInformationMessage(`Workflow completed successfully!`);
        } catch (error: any) {
            this.currentWorkflow.status = 'failed';
            this.currentWorkflow.endTime = new Date();

            const currentPhase = this.currentWorkflow.phases[this.currentWorkflow.currentPhaseIndex];
            if (currentPhase) {
                currentPhase.status = 'failed';
                currentPhase.error = error.message;
                currentPhase.endTime = new Date();
            }

            this.webview?.log(`❌ Workflow failed: ${error.message}`, 'error');
            this.webview?.updatePhases(this.currentWorkflow.phases);

            throw error;
        }
    }

    private async executePhase(phase: WorkflowPhase, planFile: string): Promise<void> {
        phase.status = 'running';
        phase.startTime = new Date();

        this.webview?.log(`\n▶️  ${phase.title}`, 'info');
        this.webview?.updatePhases(this.currentWorkflow!.phases);

        try {
            switch (phase.id) {
                case 'load-plan':
                    await this.loadPlanPhase(planFile);
                    break;
                case 'generate-prompt':
                    await this.generatePromptPhase(planFile);
                    break;
                case 'execute-research':
                    await this.executeResearchPhase();
                    break;
                case 'execute-implementation':
                    await this.executeImplementationPhase();
                    break;
                case 'verify-implementation':
                    await this.verifyImplementationPhase(planFile);
                    break;
                default:
                    throw new Error(`Unknown phase: ${phase.id}`);
            }

            phase.status = 'completed';
            phase.endTime = new Date();

            const duration = this.calculateDuration(phase.startTime, phase.endTime);
            this.webview?.log(`✓ ${phase.title} completed in ${duration}`, 'success');
            this.webview?.updatePhases(this.currentWorkflow!.phases);
        } catch (error: any) {
            phase.status = 'failed';
            phase.error = error.message;
            phase.endTime = new Date();

            this.webview?.log(`✗ ${phase.title} failed: ${error.message}`, 'error');
            this.webview?.updatePhases(this.currentWorkflow!.phases);

            throw error;
        }
    }

    private async loadPlanPhase(planFile: string): Promise<void> {
        this.webview?.log('Loading plan file...', 'info');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        // Construct full path
        const fullPath = path.isAbsolute(planFile)
            ? planFile
            : path.join(workspaceRoot, 'opusflow-planning', 'plans', planFile);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Plan file not found: ${fullPath}`);
        }

        const content = fs.readFileSync(fullPath, 'utf8');
        this.webview?.updatePlan(content);
        this.webview?.log(`Loaded plan: ${path.basename(fullPath)}`, 'info');

        await this.delay(500);
    }

    private async generatePromptPhase(planFile: string): Promise<void> {
        this.webview?.log('Generating execution prompt...', 'info');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        const prompt = await this.cli.prompt('plan', planFile, workspaceRoot);

        // Copy to clipboard for user to paste into their agent
        await vscode.env.clipboard.writeText(prompt);

        this.webview?.log('Prompt generated and copied to clipboard', 'success');
        this.webview?.log('You can now paste this into your AI agent', 'info');

        await this.delay(1000);
    }

    private async executeResearchPhase(): Promise<void> {
        this.webview?.log('Executing research phase...', 'info');
        this.webview?.log(
            'This is a simulated phase - in production, this would trigger the actual AI agent',
            'warning'
        );

        // Simulate research work
        const steps = ['Analyzing requirements', 'Researching solutions', 'Planning implementation'];
        for (const step of steps) {
            this.webview?.log(`  • ${step}...`, 'info');
            await this.delay(1000);
        }

        this.webview?.log('Research phase completed', 'success');
    }

    private async executeImplementationPhase(): Promise<void> {
        this.webview?.log('Executing implementation phase...', 'info');
        this.webview?.log('This is a simulated phase - in production, this would monitor the AI agent', 'warning');

        // Simulate implementation work
        const steps = ['Creating files', 'Writing code', 'Running tests', 'Fixing issues'];

        for (const step of steps) {
            this.webview?.log(`  • ${step}...`, 'info');
            await this.delay(1500);
        }

        this.webview?.log('Implementation phase completed', 'success');
    }

    private async verifyImplementationPhase(planFile: string): Promise<void> {
        this.webview?.log('Running verification...', 'info');

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder open');
        }

        this.webview?.log('Executing opusflow verify command...', 'info');

        // Execute verification
        const result = await this.cli.verify(planFile, workspaceRoot, (output) => {
            this.webview?.log(output.trim(), 'info');
        });

        // Load and display verification report
        if (fs.existsSync(result.fullPath)) {
            const verificationContent = fs.readFileSync(result.fullPath, 'utf8');
            this.webview?.updateVerification(verificationContent);
            this.webview?.log(`Verification report created: ${path.basename(result.fullPath)}`, 'success');

            // Also open the verification file
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.fullPath));
            await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Beside });
        }
    }

    private createPhases(): WorkflowPhase[] {
        return [
            {
                id: 'load-plan',
                title: 'Load Plan',
                description: 'Load and parse the plan file',
                status: 'pending'
            },
            {
                id: 'generate-prompt',
                title: 'Generate Prompt',
                description: 'Generate execution prompt for AI agent',
                status: 'pending'
            },
            {
                id: 'execute-research',
                title: 'Research Phase',
                description: 'AI agent researches and plans implementation',
                status: 'pending'
            },
            {
                id: 'execute-implementation',
                title: 'Implementation Phase',
                description: 'AI agent implements the planned changes',
                status: 'pending'
            },
            {
                id: 'verify-implementation',
                title: 'Verification',
                description: 'Verify implementation against plan',
                status: 'pending'
            }
        ];
    }

    private calculateDuration(start: Date, end: Date): string {
        const durationMs = end.getTime() - start.getTime();
        const seconds = Math.floor(durationMs / 1000);
        const minutes = Math.floor(seconds / 60);

        if (minutes > 0) {
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }

        return `${seconds}s`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public getCurrentWorkflow(): WorkflowState | null {
        return this.currentWorkflow;
    }
}
