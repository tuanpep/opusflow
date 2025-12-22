import { ProcessManager, ProcessResult } from './processManager';
import {
    OutputParser,
    PlanResult,
    VerifyResult,
    SpecResult,
    MapResult,
    DecomposeResult,
    TaskResult,
    WorkflowStatus,
    WorkflowGuidance,
    AgentStatus
} from './outputParser';

export class CLIError extends Error {
    constructor(
        message: string,
        public readonly stderr?: string,
        public readonly exitCode?: number | null
    ) {
        super(message);
        this.name = 'CLIError';
    }
}

export class OpusFlowWrapper {
    private processManager: ProcessManager;
    private outputParser: OutputParser;
    private _cliCommand: string;

    constructor(cliCommand: string = 'opusflow') {
        this.processManager = new ProcessManager();
        this.outputParser = new OutputParser();
        this._cliCommand = cliCommand;
    }

    private get cliCommand(): string {
        return this._cliCommand;
    }

    private async runCommand(args: string[], cwd?: string, onOutput?: (data: string) => void): Promise<ProcessResult> {
        try {
            const result = await this.processManager.run(this.cliCommand, args, {
                cwd,
                onStdout: onOutput,
                onStderr: onOutput
            });
            if (result.exitCode !== 0) {
                throw new CLIError(
                    `Command "${this.cliCommand} ${args.join(' ')}" failed with exit code ${result.exitCode}`,
                    result.stderr,
                    result.exitCode
                );
            }
            return result;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new CLIError('OpusFlow CLI not found. Please ensure it is installed and in your PATH.');
            }
            throw error;
        }
    }

    // ============ Existing Methods ============

    public async plan(title: string, cwd?: string, onOutput?: (data: string) => void): Promise<PlanResult> {
        const result = await this.runCommand(['plan', title], cwd, onOutput);
        return this.outputParser.parsePlanOutput(result.stdout);
    }

    public async verify(planFile: string, cwd?: string, onOutput?: (data: string) => void): Promise<VerifyResult> {
        const result = await this.runCommand(['verify', planFile], cwd, onOutput);
        return this.outputParser.parseVerifyOutput(result.stdout);
    }

    public async prompt(action: 'plan' | 'verify', file: string, cwd?: string): Promise<string> {
        const result = await this.runCommand(['prompt', action, file], cwd);
        return this.outputParser.parsePromptOutput(result.stdout);
    }

    public async isInstalled(): Promise<boolean> {
        try {
            await this.processManager.run(this.cliCommand, ['--help'], {});
            return true;
        } catch (_error) {
            return false;
        }
    }

    // ============ New SDD Methods ============

    /**
     * Generate a compressed codebase map
     */
    public async map(format: 'markdown' | 'json' | 'summary' = 'summary', cwd?: string): Promise<MapResult> {
        const result = await this.runCommand(['map', '--format', format], cwd);
        return this.outputParser.parseMapOutput(result.stdout);
    }

    /**
     * Create a feature specification (SPEC.md)
     */
    public async spec(
        description: string,
        title?: string,
        cwd?: string,
        onOutput?: (data: string) => void
    ): Promise<SpecResult> {
        const args = ['spec', description];
        if (title) {
            args.push('--title', title);
        }
        const result = await this.runCommand(args, cwd, onOutput);
        return this.outputParser.parseSpecOutput(result.stdout);
    }

    /**
     * Decompose a plan into atomic tasks
     */
    public async decompose(
        planFile: string,
        cwd?: string,
        onOutput?: (data: string) => void
    ): Promise<DecomposeResult> {
        const result = await this.runCommand(['decompose', planFile], cwd, onOutput);
        return this.outputParser.parseDecomposeOutput(result.stdout);
    }

    /**
     * Get the next pending task from a plan
     */
    public async tasksNext(planRef: string, cwd?: string): Promise<TaskResult> {
        const result = await this.runCommand(['tasks', 'next', planRef, '--prompt'], cwd);
        return this.outputParser.parseTaskOutput(result.stdout);
    }

    /**
     * List all tasks for a plan
     */
    public async tasksList(planRef: string, cwd?: string): Promise<DecomposeResult> {
        const result = await this.runCommand(['tasks', 'list', planRef], cwd);
        return this.outputParser.parseDecomposeOutput(result.stdout);
    }

    /**
     * Mark a task as complete
     */
    public async tasksComplete(planRef: string, taskId: string, cwd?: string): Promise<void> {
        await this.runCommand(['tasks', 'complete', planRef, taskId], cwd);
    }

    /**
     * Start a task (mark as in progress)
     */
    public async tasksStart(planRef: string, taskId: string, cwd?: string): Promise<void> {
        await this.runCommand(['tasks', 'start', planRef, taskId], cwd);
    }

    /**
     * Execute a task with an external agent
     */
    public async exec(
        taskSpec: string,
        planRef: string,
        agent: string = 'prompt',
        cwd?: string,
        onOutput?: (data: string) => void
    ): Promise<string> {
        const result = await this.runCommand(['exec', taskSpec, planRef, '--agent', agent], cwd, onOutput);
        return result.stdout;
    }

    /**
     * Get current workflow status
     */
    public async workflowStatus(cwd?: string): Promise<WorkflowStatus> {
        const result = await this.runCommand(['workflow', 'status'], cwd);
        return this.outputParser.parseWorkflowStatus(result.stdout);
    }

    /**
     * Start a new workflow
     */
    public async workflowStart(name: string, cwd?: string): Promise<void> {
        await this.runCommand(['workflow', 'start', name], cwd);
    }

    /**
     * Get guidance for the next step
     */
    public async workflowNext(cwd?: string): Promise<WorkflowGuidance> {
        const result = await this.runCommand(['workflow', 'next'], cwd);

        // Parse simple format
        const currentMatch = result.stdout.match(/Current phase: (\w+)/);
        const nextMatch = result.stdout.match(/Suggested next: (\w+)/);

        return {
            currentPhase: currentMatch ? currentMatch[1] : 'idle',
            nextPhase: nextMatch ? nextMatch[1] : '',
            guidance: result.stdout
        };
    }

    /**
     * Transition to a specific phase
     */
    public async workflowTransition(phase: string, reason?: string, cwd?: string): Promise<void> {
        const args = ['workflow', 'transition', phase];
        if (reason) {
            args.push('--reason', reason);
        }
        await this.runCommand(args, cwd);
    }

    /**
     * Check available agents
     */
    public async agents(cwd?: string): Promise<AgentStatus> {
        const result = await this.runCommand(['agents'], cwd);
        return this.outputParser.parseAgentsOutput(result.stdout);
    }

    /**
     * Generate verification prompt for LLM review
     */
    public async verifyPrompt(planFile: string, specFile?: string, cwd?: string): Promise<string> {
        const args = ['verify', planFile, '--prompt'];
        if (specFile) {
            args.push('--spec', specFile);
        }
        const result = await this.runCommand(args, cwd);
        return result.stdout;
    }
}
