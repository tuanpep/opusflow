import * as cp from 'child_process';

export interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

export interface ProcessOptions {
    cwd?: string;
    onStdout?: (data: string) => void;
    onStderr?: (data: string) => void;
}

export class ProcessManager {
    public async run(command: string, args: string[], options?: ProcessOptions): Promise<ProcessResult> {
        return new Promise((resolve, reject) => {
            const process = cp.spawn(command, args, { cwd: options?.cwd });
            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data: Buffer) => {
                const text = data.toString();
                stdout += text;
                options?.onStdout?.(text);
            });

            process.stderr.on('data', (data: Buffer) => {
                const text = data.toString();
                stderr += text;
                options?.onStderr?.(text);
            });

            process.on('close', (code: number | null) => {
                resolve({ stdout, stderr, exitCode: code });
            });

            process.on('error', (err: Error) => {
                reject(err);
            });
        });
    }
}
