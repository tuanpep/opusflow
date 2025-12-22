// VSCode API
const vscode = acquireVsCodeApi();

// State management
let state = {
    currentPhase: 'idle',
    specPath: null,
    planPath: null,
    taskQueue: null,
    tasksCompleted: 0,
    tasksTotal: 0,
    auth: {}
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('OpusFlow Sidebar initialized');

    // Restore previous state
    const previousState = vscode.getState();
    if (previousState) {
        state = { ...state, ...previousState };
        updateUI();
        if (state.auth) {
            updateAuthUI(state.auth);
        }
    }

    // Notify extension we're ready
    vscode.postMessage({ type: 'webviewLoaded' });
});

// Execute VSCode command
function executeCommand(command, ...args) {
    vscode.postMessage({
        type: 'executeAction',
        command: command,
        args: args
    });
}

// Get input value
function getFeatureInput() {
    const textarea = document.getElementById('feature-input');
    return textarea?.value || '';
}

// Update phase stepper UI
function updatePhaseUI(phase) {
    const phases = ['spec', 'plan', 'decompose', 'execute', 'verify'];
    const phaseIndex = phases.indexOf(phase);

    document.querySelectorAll('.phase-step').forEach((step, index) => {
        step.classList.remove('completed', 'active', 'pending');

        if (index < phaseIndex) {
            step.classList.add('completed');
        } else if (index === phaseIndex) {
            step.classList.add('active');
        } else {
            step.classList.add('pending');
        }
    });
}

// Update artifact list
function updateArtifacts(artifacts) {
    const list = document.getElementById('artifact-list');
    if (!list) return;

    // Update spec badge
    const specItem = list.querySelector('[data-type="spec"]');
    if (specItem && artifacts.specPath) {
        const badge = specItem.querySelector('vscode-badge');
        if (badge) badge.textContent = '✓';
    }

    // Update plan badge
    const planItem = list.querySelector('[data-type="plan"]');
    if (planItem && artifacts.planPath) {
        const badge = planItem.querySelector('vscode-badge');
        if (badge) badge.textContent = '✓';
    }

    // Update tasks badge
    const tasksItem = list.querySelector('[data-type="tasks"]');
    if (tasksItem) {
        const badge = tasksItem.querySelector('vscode-badge');
        if (badge) {
            badge.textContent = `${artifacts.tasksCompleted || 0}/${artifacts.tasksTotal || 0}`;
        }
    }
}

// Update entire UI based on state
function updateUI() {
    if (state.currentPhase) {
        // Map workflow phases to stepper phases
        const phaseMap = {
            'idle': 'spec',
            'specification': 'spec',
            'planning': 'plan',
            'decomposition': 'decompose',
            'execution': 'execute',
            'verification': 'verify',
            'complete': 'verify'
        };
        updatePhaseUI(phaseMap[state.currentPhase] || 'spec');
    }

    updateArtifacts(state);
}

function updateAuthUI(authState) {
    if (!authState) return;

    const badge = document.getElementById('agent-status-badge');
    const icon = document.getElementById('current-agent-icon');
    const statusDot = document.getElementById('current-agent-status');

    if (badge && icon && statusDot) {
        const currentAgent = authState.currentAgent || 'gemini';

        // Update Icon
        icon.className = 'agent-icon ' + currentAgent;
        icon.textContent = currentAgent.charAt(0).toUpperCase();

        // Update Status Dot
        let isConnected = false;
        if (currentAgent === 'gemini') isConnected = authState['gemini-cli'];
        else if (currentAgent === 'cursor') isConnected = authState['cursor-agent'];

        statusDot.className = 'status-dot ' + (isConnected ? 'connected' : 'disconnected');

        // Update title
        badge.title = `Current Agent: ${currentAgent.charAt(0).toUpperCase() + currentAgent.slice(1)} (${isConnected ? 'Connected' : 'Disconnected'})`;
    }
}

// Message handling from Extension
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
        case 'updateWorkflowState':
            state = { ...state, ...message.state };
            vscode.setState(state);
            updateUI();
            break;

        case 'updatePhase':
            state.currentPhase = message.phase;
            vscode.setState(state);
            updateUI();
            break;

        case 'updateArtifacts':
            state = { ...state, ...message.artifacts };
            vscode.setState(state);
            updateArtifacts(message.artifacts);
            break;

        case 'updateState':
            state = { ...state, auth: message.value.auth };
            vscode.setState(state);
            updateAuthUI(message.value.auth);
            break;

        case 'showMessage':
            console.log(message.text);
            break;
    }
});

// Phase step click handler
document.querySelectorAll('.phase-step').forEach(step => {
    step.addEventListener('click', () => {
        const phase = step.dataset.phase;
        if (phase) {
            vscode.postMessage({
                type: 'phaseClicked',
                phase: phase
            });
        }
    });
});

// Export for inline handlers
window.executeCommand = executeCommand;
window.getFeatureInput = getFeatureInput;
