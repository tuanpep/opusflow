const vscode = acquireVsCodeApi();

// Store state
let state = {
    currentTab: 'planning',
    planContent: '',
    phases: [],
    logs: [],
    verificationContent: ''
};

// Tab switching logic
function openTab(tabId) {
    state.currentTab = tabId;
    vscode.setState(state);

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const tabButton = document.querySelector(`.tab[onclick*="${tabId}"]`);
    const tabContent = document.getElementById(tabId);

    if (tabButton) tabButton.classList.add('active');
    if (tabContent) tabContent.classList.add('active');
}

// Markdown Rendering
function renderMarkdown(id, content) {
    const container = document.getElementById(id);
    if (container && window.marked) {
        container.innerHTML = marked.parse(content);
    } else if (container) {
        // Fallback if marked is not loaded
        container.innerHTML = `<pre>${escapeHtml(content)}</pre>`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Log Streaming with auto-scroll
function appendLog(message, type = 'info') {
    const logContainer = document.getElementById('execution-log');
    if (logContainer) {
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${message}`;

        logContainer.appendChild(entry);

        // Auto-scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;

        // Store in state
        state.logs.push({ message, type, timestamp });
        vscode.setState(state);
    }
}

// Clear logs
function clearLogs() {
    const logContainer = document.getElementById('execution-log');
    if (logContainer) {
        logContainer.innerHTML = '<div class="log-entry info">Ready for execution...</div>';
        state.logs = [];
        vscode.setState(state);
    }
}

// Render phases
function renderPhases(phases) {
    const container = document.getElementById('phases-content');
    if (!container) return;

    if (!phases || phases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No Phases Available</h3>
                <p>Generate a plan to see its phases here.</p>
            </div>
        `;
        return;
    }

    const html = `
        <ul class="phase-list">
            ${phases.map((phase, index) => `
                <li class="phase-item" onclick="selectPhase(${index})">
                    <h3>
                        Phase ${index + 1}: ${escapeHtml(phase.title || 'Untitled')}
                        <span class="status-badge ${phase.status || 'pending'}">${phase.status || 'pending'}</span>
                    </h3>
                    <p>${escapeHtml(phase.description || 'No description')}</p>
                </li>
            `).join('')}
        </ul>
    `;
    container.innerHTML = html;

    state.phases = phases;
    vscode.setState(state);
}

// Select phase (for future implementation)
function selectPhase(index) {
    vscode.postMessage({
        command: 'selectPhase',
        phase: index
    });
}

// Show progress
function updateProgress(percentage) {
    let progressBar = document.querySelector('.progress-bar');
    if (!progressBar) {
        const container = document.querySelector('.progress-container');
        if (!container) {
            const executionTab = document.getElementById('execution');
            const card = executionTab?.querySelector('.card');
            if (card) {
                const progressHtml = `
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                `;
                card.insertAdjacentHTML('beforeend', progressHtml);
                progressBar = document.querySelector('.progress-bar');
            }
        }
    }

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

// Message handling from Extension
window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'updatePlan':
            renderMarkdown('plan-content', message.content);
            state.planContent = message.content;
            vscode.setState(state);
            break;

        case 'updateVerification':
            renderMarkdown('verification-content', message.content);
            state.verificationContent = message.content;
            vscode.setState(state);
            break;

        case 'updatePhases':
            renderPhases(message.phases);
            break;

        case 'log':
            appendLog(message.text, message.logType || 'info');
            break;

        case 'clearLogs':
            clearLogs();
            break;

        case 'switchTab':
            openTab(message.tabId);
            break;

        case 'updateProgress':
            updateProgress(message.percentage || 0);
            break;

        case 'alert':
            vscode.window.showErrorMessage(message.text);
            break;
    }
});

// Restore state on load
window.onload = () => {
    console.log('OpusFlow Webview Loaded');

    // Try to restore previous state
    const previousState = vscode.getState();
    if (previousState) {
        state = previousState;

        // Restore content
        if (state.planContent) {
            renderMarkdown('plan-content', state.planContent);
        }
        if (state.verificationContent) {
            renderMarkdown('verification-content', state.verificationContent);
        }
        if (state.phases && state.phases.length > 0) {
            renderPhases(state.phases);
        }

        // Restore logs
        if (state.logs && state.logs.length > 0) {
            const logContainer = document.getElementById('execution-log');
            if (logContainer) {
                logContainer.innerHTML = '';
                state.logs.forEach(log => {
                    const entry = document.createElement('div');
                    entry.className = `log-entry ${log.type}`;
                    entry.textContent = `[${log.timestamp}] ${log.message}`;
                    logContainer.appendChild(entry);
                });
            }
        }

        // Restore active tab
        if (state.currentTab) {
            openTab(state.currentTab);
        }
    }

    // Notify extension that webview is ready
    vscode.postMessage({ command: 'ready' });
};

// Send message to extension
function sendMessage(command, data = {}) {
    vscode.postMessage({ command, ...data });
}
