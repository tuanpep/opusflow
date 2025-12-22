// Result interfaces for CLI output parsing

export interface PlanResult {
    fullPath: string;
    filename: string;
}

export interface VerifyResult {
    fullPath: string;
    status?: 'passed' | 'failed' | 'partial';
    checksTotal?: number;
    checksPassed?: number;
}

export interface SpecResult {
    fullPath: string;
    filename: string;
    title: string;
}

export interface MapResult {
    content: string;
    filesCount: number;
    symbolsCount: number;
    languages: string[];
}

export interface DecomposeResult {
    planRef: string;
    tasksCount: number;
    tasks: TaskInfo[];
}

export interface TaskInfo {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'done' | 'failed';
    files: string[];
}

export interface TaskResult {
    task: TaskInfo | null;
    prompt: string;
    allCompleted: boolean;
}

export interface ExecResult {
    taskId: string;
    success: boolean;
    output: string;
    diffOutput?: string;
}

export interface WorkflowStatus {
    id: string;
    name: string;
    currentPhase: string;
    specPath?: string;
    planPath?: string;
    taskQueuePath?: string;
    verifyPath?: string;
    nextPhase: string;
    historyCount: number;
}

export interface WorkflowGuidance {
    currentPhase: string;
    nextPhase: string;
    guidance: string;
}

export interface AgentStatus {
    agents: {
        name: string;
        available: boolean;
        installCommand?: string;
    }[];
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
        // Try new format first
        const pathMatch = stdout.match(/Report saved: (.*)/);
        if (pathMatch) {
            const statusMatch = stdout.match(/\*\*Status\*\*: (✅|❌|⚠️) (\w+)/);
            const checksMatch = stdout.match(/\*\*Checks\*\*: (\d+)\/(\d+)/);

            return {
                fullPath: pathMatch[1].trim(),
                status: statusMatch ? (statusMatch[2].toLowerCase() as 'passed' | 'failed' | 'partial') : undefined,
                checksPassed: checksMatch ? parseInt(checksMatch[1]) : undefined,
                checksTotal: checksMatch ? parseInt(checksMatch[2]) : undefined
            };
        }

        // Fall back to old format
        const oldMatch = stdout.match(/Verification report created: (.*)/);
        if (!oldMatch) {
            throw new Error(`Failed to parse verify output: ${stdout}`);
        }
        return { fullPath: oldMatch[1].trim() };
    }

    public parsePromptOutput(stdout: string): string {
        return stdout.trim();
    }

    public parseSpecOutput(stdout: string): SpecResult {
        const pathMatch = stdout.match(/📄 File: (.*)/);
        const titleMatch = stdout.match(/📝 Title: (.*)/);

        if (!pathMatch) {
            throw new Error(`Failed to parse spec output: ${stdout}`);
        }

        const fullPath = pathMatch[1].trim();
        return {
            fullPath,
            filename: fullPath.split('/').pop() || '',
            title: titleMatch ? titleMatch[1].trim() : ''
        };
    }

    public parseMapOutput(stdout: string): MapResult {
        // Parse summary format
        const filesMatch = stdout.match(/Files: (\d+)/);
        const symbolsMatch = stdout.match(/Symbols: (\d+)/);
        const languagesMatch = stdout.match(/Languages: ([^\n]+)/);

        return {
            content: stdout,
            filesCount: filesMatch ? parseInt(filesMatch[1]) : 0,
            symbolsCount: symbolsMatch ? parseInt(symbolsMatch[1]) : 0,
            languages: languagesMatch ? languagesMatch[1].split(', ').map((l) => l.trim()) : []
        };
    }

    public parseDecomposeOutput(stdout: string): DecomposeResult {
        const planRefMatch = stdout.match(/# Task Queue: (.*)/);
        const tasks: TaskInfo[] = [];

        // Parse task lines: ## ⬜ task-1: Title
        const taskRegex = /## (⬜|🔄|✅|❌) (task-\d+): (.+)/g;
        let match;
        while ((match = taskRegex.exec(stdout)) !== null) {
            const statusMap: Record<string, TaskInfo['status']> = {
                '⬜': 'pending',
                '🔄': 'in_progress',
                '✅': 'done',
                '❌': 'failed'
            };
            tasks.push({
                id: match[2],
                title: match[3].trim(),
                status: statusMap[match[1]] || 'pending',
                files: []
            });
        }

        return {
            planRef: planRefMatch ? planRefMatch[1].trim() : '',
            tasksCount: tasks.length,
            tasks
        };
    }

    public parseTaskOutput(stdout: string): TaskResult {
        if (stdout.includes('All tasks completed') || stdout.includes('🎉')) {
            return {
                task: null,
                prompt: '',
                allCompleted: true
            };
        }

        const idMatch = stdout.match(/\*\*Task ID\*\*: (task-\d+)/);
        const titleMatch = stdout.match(/# (?:Next Task|Execute Task): (.+)/);

        return {
            task: idMatch
                ? {
                      id: idMatch[1],
                      title: titleMatch ? titleMatch[1].trim() : '',
                      status: 'pending',
                      files: []
                  }
                : null,
            prompt: stdout,
            allCompleted: false
        };
    }

    public parseWorkflowStatus(stdout: string): WorkflowStatus {
        const idMatch = stdout.match(/# Workflow Status: (wf-\d+)/);
        const nameMatch = stdout.match(/\*\*Name\*\*: (.+)/);
        const phaseMatch = stdout.match(/\*\*Current Phase\*\*: (\w+)/);
        const nextMatch = stdout.match(/Suggested next phase: \*\*(\w+)\*\*/);
        const historyMatch = stdout.match(/(\d+) transitions recorded/);

        const specMatch = stdout.match(/Spec: ([^\n]+)/);
        const planMatch = stdout.match(/Plan: ([^\n]+)/);
        const tasksMatch = stdout.match(/Tasks: ([^\n]+)/);
        const verifyMatch = stdout.match(/Verification: ([^\n]+)/);

        return {
            id: idMatch ? idMatch[1] : '',
            name: nameMatch ? nameMatch[1].trim() : 'default',
            currentPhase: phaseMatch ? phaseMatch[1] : 'idle',
            nextPhase: nextMatch ? nextMatch[1] : '',
            specPath: specMatch && !specMatch[1].includes('(none)') ? specMatch[1].trim() : undefined,
            planPath: planMatch && !planMatch[1].includes('(none)') ? planMatch[1].trim() : undefined,
            taskQueuePath: tasksMatch && !tasksMatch[1].includes('(none)') ? tasksMatch[1].trim() : undefined,
            verifyPath: verifyMatch && !verifyMatch[1].includes('(none)') ? verifyMatch[1].trim() : undefined,
            historyCount: historyMatch ? parseInt(historyMatch[1]) : 0
        };
    }

    public parseAgentsOutput(stdout: string): AgentStatus {
        const agents: AgentStatus['agents'] = [];

        // Parse lines like: - **Aider**: ✅ Available or ❌ Not installed
        const agentRegex = /- \*\*(.+?)\*\*: (✅|❌) (.+)/g;
        let match;
        while ((match = agentRegex.exec(stdout)) !== null) {
            const available = match[2] === '✅';
            const installMatch = stdout.match(new RegExp(`Install: \`([^\`]+)\``, 'g'));

            agents.push({
                name: match[1],
                available,
                installCommand:
                    !available && installMatch ? installMatch[0].replace('Install: `', '').replace('`', '') : undefined
            });
        }

        return { agents };
    }
}
