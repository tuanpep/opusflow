export interface WorkflowPhase {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    error?: string;
}

export interface WorkflowState {
    planFile: string;
    agent: string;
    phases: WorkflowPhase[];
    currentPhaseIndex: number;
    status: 'idle' | 'running' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
}

export interface AgentExecutionResult {
    success: boolean;
    output?: string;
    error?: string;
}
