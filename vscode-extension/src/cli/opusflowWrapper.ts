import { ProcessManager, ProcessResult } from './processManager';
import { OutputParser, PlanResult, VerifyResult } from './outputParser';

export class CLIError extends Error {
    constructor(message: string, public readonly stderr?: string, public readonly exitCode?: number | null) {
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
                throw new CLIError(`Command "${this.cliCommand} ${args.join(' ')}" failed with exit code ${result.exitCode}`, result.stderr, result.exitCode);
            }
            return result;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                throw new CLIError('OpusFlow CLI not found. Please ensure it is installed and in your PATH.');
            }
            throw error;
        }
    }

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
        } catch (error) {
            return false;
        }
    }
}
