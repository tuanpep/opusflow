export interface PlanResult {
    fullPath: string;
    filename: string;
}

export interface VerifyResult {
    fullPath: string;
}

export class OutputParser {
    public parsePlanOutput(stdout: string): PlanResult {
        const match = stdout.match(/Created plan: (.*)/);
        if (!match) {
            throw new Error(`Failed to parse plan output: ${stdout}`);
        }
        const fullPath = match[1].trim();
        const filename = fullPath.split('/').pop() || '';
        return { fullPath, filename };
    }

    public parseVerifyOutput(stdout: string): VerifyResult {
        const match = stdout.match(/Verification report created: (.*)/);
        if (!match) {
            throw new Error(`Failed to parse verify output: ${stdout}`);
        }
        return { fullPath: match[1].trim() };
    }

    public parsePromptOutput(stdout: string): string {
        return stdout.trim();
    }
}
