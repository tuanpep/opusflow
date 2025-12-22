// OpusFlow Sidebar JavaScript
// Handles workflow selection and navigation

const vscode = acquireVsCodeApi();

// --- State ---
const state = {
    currentView: 'home',
    currentWorkflow: null,
    context: {
        phases: [],
        plan: [],
        review: []
    },
    messages: {
        phases: [],
        plan: [],
        review: []
    }
};

// --- DOM Elements ---
const views = document.querySelectorAll('.view');
const workflowCards = document.querySelectorAll('.workflow-card');
const backButtons = document.querySelectorAll('[data-back]');
const quickActions = document.querySelectorAll('.quick-action');
const addContextButtons = document.querySelectorAll('[data-add-context]');
const sendButtons = document.querySelectorAll('[data-send]');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    vscode.postMessage({ type: 'webviewLoaded' });
    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Workflow card clicks
    workflowCards.forEach(card => {
        card.addEventListener('click', () => {
            const workflow = card.dataset.workflow;
            navigateToWorkflow(workflow);
        });
    });

    // Back buttons
    backButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navigateToHome();
        });
    });

    // Quick actions
    quickActions.forEach(action => {
        action.addEventListener('click', () => {
            const text = action.dataset.insert;
            const workflow = state.currentWorkflow;
            if (workflow) {
                const input = document.getElementById(`${workflow}-input`);
                if (input) {
                    input.value = text + ' ';
                    input.focus();
                }
            }
        });
    });

    // Add context buttons
    addContextButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            vscode.postMessage({ type: 'addContext', workflow: state.currentWorkflow });
        });
    });

    // Send buttons
    sendButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const workflow = btn.dataset.send;
            handleSend(workflow);
        });
    });

    // Textarea enter key handling
    ['phases', 'plan', 'review'].forEach(workflow => {
        const input = document.getElementById(`${workflow}-input`);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend(workflow);
                }
            });
        }
    });
}

// --- Navigation ---
function navigateToWorkflow(workflow) {
    state.currentView = workflow;
    state.currentWorkflow = workflow;

    // Hide all views
    views.forEach(view => view.classList.remove('active'));

    // Show target view
    const targetView = document.getElementById(`view-${workflow}`);
    if (targetView) {
        targetView.classList.add('active');
    }
}

function navigateToHome() {
    state.currentView = 'home';
    state.currentWorkflow = null;

    // Hide all views
    views.forEach(view => view.classList.remove('active'));

    // Show home view
    document.getElementById('view-home').classList.add('active');
}

// --- Message Handling ---
function handleSend(workflow) {
    const input = document.getElementById(`${workflow}-input`);
    const text = input?.value?.trim();

    if (!text) {
        vscode.postMessage({ type: 'onError', value: 'Please enter a description' });
        return;
    }

    // Add user message to chat
    addMessage(workflow, 'user', text);

    // Clear input
    input.value = '';

    // Send to extension
    vscode.postMessage({
        type: 'startWorkflow',
        workflow: workflow,
        query: text,
        context: state.context[workflow] || []
    });

    // Show loading state
    addMessage(workflow, 'system', getLoadingMessage(workflow));
}

function addMessage(workflow, role, content) {
    const chatArea = document.getElementById(`${workflow}-chat`);
    if (!chatArea) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    if (role === 'system') {
        messageDiv.innerHTML = `<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span> ${content}`;
    } else {
        messageDiv.textContent = content;
    }

    chatArea.appendChild(messageDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // Store message
    if (role !== 'system') {
        state.messages[workflow]?.push({ role, content });
    }

    return messageDiv;
}

function removeLoadingMessage(workflow) {
    const chatArea = document.getElementById(`${workflow}-chat`);
    if (!chatArea) return;

    const systemMessages = chatArea.querySelectorAll('.message.system');
    systemMessages.forEach(msg => msg.remove());
}

function getLoadingMessage(workflow) {
    switch (workflow) {
        case 'phases':
            return 'Analyzing your goal and creating phases...';
        case 'plan':
            return 'Creating detailed implementation plan...';
        case 'review':
            return 'Performing comprehensive code review...';
        default:
            return 'Processing...';
    }
}

// --- Context Management ---
function addContextFiles(workflow, files) {
    if (!state.context[workflow]) {
        state.context[workflow] = [];
    }

    files.forEach(file => {
        if (!state.context[workflow].includes(file)) {
            state.context[workflow].push(file);
        }
    });

    renderContext(workflow);
}

function removeContextFile(workflow, file) {
    state.context[workflow] = state.context[workflow].filter(f => f !== file);
    renderContext(workflow);
}

function renderContext(workflow) {
    const contextArea = document.getElementById(`${workflow}-context`);
    if (!contextArea) return;

    contextArea.innerHTML = '';

    state.context[workflow]?.forEach(file => {
        const chip = document.createElement('div');
        chip.className = 'context-chip';
        chip.innerHTML = `
            📄 ${file.split('/').pop()}
            <span class="remove" data-file="${file}">×</span>
        `;

        chip.querySelector('.remove').addEventListener('click', () => {
            removeContextFile(workflow, file);
        });

        contextArea.appendChild(chip);
    });
}

// --- Extension Message Handler ---
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.type) {
        case 'updateState':
            // Handle auth state updates
            break;

        case 'appendContext':
            if (message.files && state.currentWorkflow) {
                addContextFiles(state.currentWorkflow, message.files);
            }
            break;

        case 'workflowResponse':
            if (message.workflow) {
                removeLoadingMessage(message.workflow);
                addMessage(message.workflow, 'agent', message.content);

                // If there are actions, render them
                if (message.actions) {
                    renderActions(message.workflow, message.actions);
                }
            }
            break;

        case 'workflowError':
            if (message.workflow) {
                removeLoadingMessage(message.workflow);
                addMessage(message.workflow, 'agent', `❌ ${message.error}`);
            }
            break;

        case 'searchFilesResponse':
            // Handle file search suggestions if needed
            break;
    }
});

function renderActions(workflow, actions) {
    const chatArea = document.getElementById(`${workflow}-chat`);
    if (!chatArea || !actions.length) return;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'quick-actions';
    actionsDiv.style.marginTop = '10px';

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'quick-action';
        btn.innerHTML = `${action.icon || '▶'} ${action.title}`;
        btn.addEventListener('click', () => {
            vscode.postMessage({
                type: 'executeAction',
                command: action.command,
                args: action.args
            });
        });
        actionsDiv.appendChild(btn);
    });

    chatArea.appendChild(actionsDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// --- Expose functions to window for inline handlers ---
window.toggleStep = function (id) {
    document.getElementById(id)?.classList.toggle('active');
};

window.updateStepTitle = function (id, val) {
    const el = document.getElementById(id);
    if (el) {
        const nameEl = el.querySelector('.step-name');
        if (nameEl) nameEl.textContent = val || 'Untitled Step';
    }
};

window.removeStep = function (e, id) {
    e.stopPropagation();
    const el = document.getElementById(id);
    if (el && confirm('Remove this step?')) el.remove();
};
